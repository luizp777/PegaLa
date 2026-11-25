import type { PreferredProduct } from '../../shared/priceTypes';
import { db, generateShareCode } from '../db/localDb';
import { CATEGORY_MAP, normalizeText } from './categories';
import type { CategoryId, ListType, ShoppingItem, ShoppingList, UserDictionaryEntry } from '../types';

/**
 * Formato versionado do arquivo de backup JSON local do PegaLá.
 */
export interface LocalBackupPayload {
  /** Versão do esquema do backup. */
  version: 1;
  /** Identificador do aplicativo. */
  app: 'pegala';
  /** Timestamp ISO de geração do backup. */
  exportedAt: string;
  /** Listas de compras incluídas no backup. */
  lists: ShoppingList[];
  /** Itens pertencentes às listas do backup. */
  items: ShoppingItem[];
  /** Termos aprendidos e frequência de uso no dicionário pessoal. */
  dictionary: UserDictionaryEntry[];
}

/**
 * Resumo do resultado de uma importação de backup JSON.
 */
export interface ImportBackupSummary {
  /** Quantidade de listas importadas. */
  listsImported: number;
  /** Quantidade de itens importados. */
  itemsImported: number;
  /** Quantidade de termos mesclados/importados no dicionário. */
  dictionaryImported: number;
  /** ID da primeira lista importada (para seleção imediata opcional). */
  firstListId: string | null;
}

const VALID_LIST_TYPES = new Set<ListType>(['mercado', 'farmacia', 'geral']);
const MAX_BACKUP_LISTS = 200;
const MAX_BACKUP_ITEMS = 5000;
const MAX_BACKUP_DICTIONARY = 5000;

function sanitizePreferredProduct(raw: unknown): PreferredProduct | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  const productKey = typeof p.productKey === 'string' ? p.productKey.trim().slice(0, 120) : '';
  const title = typeof p.title === 'string' ? p.title.trim().slice(0, 160) : '';
  if (!productKey || !title) return undefined;
  const packQty = Number(p.packQuantity);
  const packQuantity = Number.isFinite(packQty) && packQty > 0 ? packQty : 1;
  const packUnit = typeof p.packUnit === 'string' && p.packUnit.trim() ? p.packUnit.trim().slice(0, 16) : 'un';
  return {
    productKey,
    title,
    brand: typeof p.brand === 'string' && p.brand.trim() ? p.brand.trim().slice(0, 80) : undefined,
    ean: typeof p.ean === 'string' && p.ean.trim() ? p.ean.trim().slice(0, 32) : undefined,
    packQuantity,
    packUnit,
  };
}

function clearListScopedLocalStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pegala_pinned_store_') || k.startsWith('pegala_collapsed_'))) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Ignora erro de armazenamento
  }
}

function isValidCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value in CATEGORY_MAP;
}

/**
 * Gera um snapshot completo (listas, itens e dicionário pessoal) do banco local IndexedDB.
 *
 * @returns Objeto serializável {@link LocalBackupPayload}.
 */
export async function exportLocalBackup(): Promise<LocalBackupPayload> {
  const [lists, items, dictionary] = await Promise.all([
    db.lists.orderBy('createdAt').toArray(),
    db.items.toArray(),
    db.dictionary.toArray(),
  ]);

  return {
    version: 1,
    app: 'pegala',
    exportedAt: new Date().toISOString(),
    lists,
    items,
    dictionary,
  };
}

/**
 * Valida e sanitiza um objeto JSON arbitrário contra o esquema de backup do PegaLá.
 *
 * @param raw - Conteúdo retornado por `JSON.parse`.
 * @returns Resultado tipado com o payload válido ou mensagem de erro amigável.
 */
export function validateBackupPayload(
  raw: unknown
): { ok: true; data: LocalBackupPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Arquivo inválido: esperado um JSON de backup do PegaLá.' };
  }

  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'pegala' || obj.version !== 1) {
    return { ok: false, error: 'Formato de backup não reconhecido ou versão incompatível.' };
  }
  if (!Array.isArray(obj.lists) || !Array.isArray(obj.items)) {
    return { ok: false, error: 'O arquivo de backup não contém listas e itens válidos.' };
  }
  if (obj.lists.length === 0) {
    return { ok: false, error: 'O arquivo de backup não possui nenhuma lista para importar.' };
  }
  if (obj.lists.length > MAX_BACKUP_LISTS || obj.items.length > MAX_BACKUP_ITEMS) {
    return { ok: false, error: 'O arquivo de backup excede os limites suportados.' };
  }

  const now = new Date().toISOString();
  const validListIds = new Set<string>();
  const sanitizedLists: ShoppingList[] = [];

  for (const entry of obj.lists) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : '';
    const name = typeof rec.name === 'string' ? rec.name.trim().slice(0, 80) : '';
    const type: ListType =
      typeof rec.type === 'string' && VALID_LIST_TYPES.has(rec.type as ListType)
        ? (rec.type as ListType)
        : 'geral';
    if (!id || !name || validListIds.has(id)) continue;

    validListIds.add(id);
    sanitizedLists.push({
      id,
      name,
      type,
      shareCode: typeof rec.shareCode === 'string' && rec.shareCode.trim() ? rec.shareCode.trim() : generateShareCode(),
      ownerId: null,
      isSynced: false,
      isShared: false,
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : now,
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : now,
    });
  }

  if (sanitizedLists.length === 0) {
    return { ok: false, error: 'Nenhuma lista válida foi encontrada no arquivo.' };
  }

  const sanitizedItems: ShoppingItem[] = [];
  for (const entry of obj.items) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const listId = typeof rec.listId === 'string' ? rec.listId.trim() : '';
    const name = typeof rec.name === 'string' ? rec.name.trim().slice(0, 120) : '';
    if (!listId || !validListIds.has(listId) || !name) continue;

    const normalizedName =
      typeof rec.normalizedName === 'string' && rec.normalizedName.trim()
        ? normalizeText(rec.normalizedName)
        : normalizeText(name);
    if (!normalizedName) continue;

    const qty = Number(rec.quantity);
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const unit = typeof rec.unit === 'string' && rec.unit.trim() ? rec.unit.trim().slice(0, 16) : 'un';
    const categoryId: CategoryId = isValidCategoryId(rec.categoryId) ? rec.categoryId : 'outros';
    const isChecked = Boolean(rec.isChecked);

    sanitizedItems.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : crypto.randomUUID(),
      listId,
      name,
      normalizedName,
      quantity,
      unit,
      categoryId,
      isChecked,
      checkedAt: isChecked ? (typeof rec.checkedAt === 'string' ? rec.checkedAt : now) : null,
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : now,
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : now,
    });
  }

  const rawDict = Array.isArray(obj.dictionary) ? obj.dictionary.slice(0, MAX_BACKUP_DICTIONARY) : [];
  const sanitizedDictionary: UserDictionaryEntry[] = [];
  for (const entry of rawDict) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const displayName = typeof rec.displayName === 'string' ? rec.displayName.trim().slice(0, 120) : '';
    const normalizedTerm =
      typeof rec.normalizedTerm === 'string' && rec.normalizedTerm.trim()
        ? normalizeText(rec.normalizedTerm)
        : normalizeText(displayName);
    if (!normalizedTerm || !displayName) continue;

    const usageCount = Number(rec.usageCount);
    const preferredProduct = sanitizePreferredProduct(rec.preferredProduct);
    sanitizedDictionary.push({
      normalizedTerm,
      displayName,
      categoryId: isValidCategoryId(rec.categoryId) ? rec.categoryId : 'outros',
      usageCount: Number.isFinite(usageCount) && usageCount > 0 ? Math.floor(usageCount) : 1,
      lastUsedAt: typeof rec.lastUsedAt === 'string' ? rec.lastUsedAt : now,
      ...(preferredProduct ? { preferredProduct } : {}),
    });
  }

  return {
    ok: true,
    data: {
      version: 1,
      app: 'pegala',
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : now,
      lists: sanitizedLists,
      items: sanitizedItems,
      dictionary: sanitizedDictionary,
    },
  };
}

/**
 * Importa um backup validado no IndexedDB em modo `'merge'` (preserva dados atuais e adiciona
 * listas restauradas como novas listas locais) ou `'replace'` (substitui todo o banco local).
 *
 * @param payload - Backup já validado por {@link validateBackupPayload}.
 * @param mode - Estratégia de importação (`'merge'` ou `'replace'`).
 * @returns Resumo com contadores importados e ID da primeira lista importada.
 */
export async function importLocalBackup(
  payload: LocalBackupPayload,
  mode: 'merge' | 'replace'
): Promise<ImportBackupSummary> {
  const now = new Date().toISOString();

  return db.transaction(
    'rw',
    [db.lists, db.items, db.dictionary, db.pendingSync, db.priceComparisons],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.lists.clear(),
          db.items.clear(),
          db.dictionary.clear(),
          db.pendingSync.clear(),
          db.priceComparisons.clear(),
        ]);
        clearListScopedLocalStorage();
      }

      const idMap = new Map<string, string>();
      const listsToAdd: ShoppingList[] = [];
      for (const srcList of payload.lists) {
        const newListId = crypto.randomUUID();
        idMap.set(srcList.id, newListId);
        listsToAdd.push({
          ...srcList,
          id: newListId,
          shareCode: generateShareCode(),
          ownerId: null,
          isSynced: false,
          isShared: false,
          updatedAt: now,
        });
      }

      if (listsToAdd.length > 0) {
        await db.lists.bulkAdd(listsToAdd);
        for (const list of listsToAdd) {
          await db.pendingSync.add({
            action: 'upsert_list',
            entityId: list.id,
            listId: list.id,
            payload: list as unknown as Record<string, unknown>,
            createdAt: now,
          });
        }
      }

      const seenPerList = new Set<string>();
      const itemsToAdd: ShoppingItem[] = [];
      for (const srcItem of payload.items) {
        const mappedListId = idMap.get(srcItem.listId);
        if (!mappedListId) continue;
        const dedupeKey = `${mappedListId}:${srcItem.normalizedName}`;
        if (seenPerList.has(dedupeKey)) continue;
        seenPerList.add(dedupeKey);

        itemsToAdd.push({
          ...srcItem,
          id: crypto.randomUUID(),
          listId: mappedListId,
          updatedAt: now,
        });
      }

      if (itemsToAdd.length > 0) {
        await db.items.bulkAdd(itemsToAdd);
        for (const item of itemsToAdd) {
          await db.pendingSync.add({
            action: 'upsert_item',
            entityId: item.id,
            listId: item.listId,
            payload: item as unknown as Record<string, unknown>,
            createdAt: now,
          });
        }
      }

      let dictionaryImported = 0;
      for (const entry of payload.dictionary) {
        const existing = await db.dictionary
          .where('normalizedTerm')
          .equals(entry.normalizedTerm)
          .first();
        if (existing && existing.id !== undefined) {
          await db.dictionary.update(existing.id, {
            usageCount: Math.max(existing.usageCount, entry.usageCount),
            lastUsedAt:
              entry.lastUsedAt > existing.lastUsedAt ? entry.lastUsedAt : existing.lastUsedAt,
            ...(entry.preferredProduct && !existing.preferredProduct
              ? { preferredProduct: entry.preferredProduct }
              : {}),
          });
        } else {
          await db.dictionary.add({
            normalizedTerm: entry.normalizedTerm,
            displayName: entry.displayName,
            categoryId: entry.categoryId,
            usageCount: entry.usageCount,
            lastUsedAt: entry.lastUsedAt,
            ...(entry.preferredProduct ? { preferredProduct: entry.preferredProduct } : {}),
          });
          dictionaryImported++;
        }
      }

      return {
        listsImported: listsToAdd.length,
        itemsImported: itemsToAdd.length,
        dictionaryImported,
        firstListId: listsToAdd[0]?.id ?? null,
      };
    }
  );
}
