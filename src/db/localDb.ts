import Dexie, { type EntityTable } from 'dexie';
import type {
  CategoryId,
  ListType,
  PendingSyncMutation,
  ShoppingItem,
  ShoppingList,
  UserDictionaryEntry,
} from '../types';
import type { CachedPriceComparison, PreferredProduct } from '../../shared/priceTypes';
import { normalizeText } from '../lib/categories';
import { parseMultiLineInput } from '../lib/itemParser';
import { dbLogger, serializeError } from '../lib/logger';

/**
 * Banco de dados local IndexedDB (via Dexie.js) responsável pela persistência offline-first
 * de listas, itens, dicionário pessoal aprendido e fila de mutações pendentes.
 */
class PegaLaDB extends Dexie {
  /** Tabela de listas de compras locais e compartilhadas. */
  lists!: EntityTable<ShoppingList, 'id'>;
  /** Tabela de itens pertencentes às listas. */
  items!: EntityTable<ShoppingItem, 'id'>;
  /** Tabela de aprendizado de categorias e frequência de uso por termo. */
  dictionary!: EntityTable<UserDictionaryEntry, 'id'>;
  /** Fila FIFO de mutações locais aguardando envio ao Supabase. */
  pendingSync!: EntityTable<PendingSyncMutation, 'id'>;
  /** Cache offline da última comparação de preços por lista. */
  priceComparisons!: EntityTable<CachedPriceComparison, 'listId'>;

  /**
   * Inicializa o banco `PegaLaDB` e declara os índices das versões 1, 2 e 3
   * (incluindo migração da categoria legada `bebe_pet` para `bebe` e `pet`).
   */
  constructor() {
    super('PegaLaDB');
    this.version(1).stores({
      lists: 'id, shareCode, updatedAt',
      items: 'id, listId, [listId+isChecked], [listId+normalizedName], updatedAt',
      dictionary: '++id, &normalizedTerm, usageCount, lastUsedAt',
      pendingSync: '++id, listId, createdAt',
    });
    this.version(2).stores({
      lists: 'id, shareCode, createdAt, updatedAt',
      items: 'id, listId, [listId+isChecked], [listId+normalizedName], updatedAt',
      dictionary: '++id, &normalizedTerm, usageCount, lastUsedAt',
      pendingSync: '++id, listId, createdAt',
    });
    this.version(3)
      .stores({
        lists: 'id, shareCode, createdAt, updatedAt',
        items: 'id, listId, [listId+isChecked], [listId+normalizedName], updatedAt',
        dictionary: '++id, &normalizedTerm, usageCount, lastUsedAt',
        pendingSync: '++id, listId, createdAt',
      })
      .upgrade(async (tx) => {
        const petKeywords = ['racao', 'petisco', 'areia', 'tapete higienico', 'antipulgas', 'gato', 'cachorro', 'pet'];
        const isPetTerm = (norm: string) => petKeywords.some((kw) => norm.includes(kw));

        await tx
          .table('items')
          .toCollection()
          .modify((item: { categoryId: string; normalizedName?: string }) => {
            if (item.categoryId === 'bebe_pet') {
              item.categoryId = isPetTerm(item.normalizedName ?? '') ? 'pet' : 'bebe';
            }
          });

        await tx
          .table('dictionary')
          .toCollection()
          .modify((entry: { categoryId: string; normalizedTerm?: string }) => {
            if (entry.categoryId === 'bebe_pet') {
              entry.categoryId = isPetTerm(entry.normalizedTerm ?? '') ? 'pet' : 'bebe';
            }
          });
      });
    this.version(4).stores({
      lists: 'id, shareCode, createdAt, updatedAt',
      items: 'id, listId, [listId+isChecked], [listId+normalizedName], updatedAt',
      dictionary: '++id, &normalizedTerm, usageCount, lastUsedAt',
      pendingSync: '++id, listId, createdAt',
      priceComparisons: 'listId, computedAt',
    });
  }
}

/** Instância singleton do banco local {@link PegaLaDB}. */
export const db = new PegaLaDB();

const LAST_LIST_KEY = 'pegala_last_list_id';

/**
 * Recupera do `localStorage` o ID da última lista aberta pelo usuário.
 *
 * @returns UUID da última lista ativa ou `null` caso não exista.
 */
export function getLastActiveListId(): string | null {
  try {
    return localStorage.getItem(LAST_LIST_KEY);
  } catch (err) {
    dbLogger.debug('Falha ao ler última lista ativa do localStorage', serializeError(err));
    return null;
  }
}

/**
 * Salva no `localStorage` o ID da lista ativa para abertura imediata na próxima visita.
 *
 * @param listId - UUID da lista selecionada.
 */
export function setLastActiveListId(listId: string): void {
  try {
    localStorage.setItem(LAST_LIST_KEY, listId);
  } catch (err) {
    dbLogger.debug('Falha ao salvar última lista ativa no localStorage', serializeError(err));
  }
}

/**
 * Gera um código curto criptograficamente aleatório no formato `PEGA-XXXXXXXX` (8 caracteres).
 *
 * @returns Código de compartilhamento único para convites.
 */
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) {
    suffix += chars.charAt(bytes[i] % chars.length);
  }
  return `PEGA-${suffix}`;
}

let ensureDefaultListsPromise: Promise<string> | null = null;

/**
 * Garante que existam as listas padrão (`Mercado` e `Farmácia`) na primeira abertura do app,
 * serializando chamadas concorrentes (ex.: React StrictMode) para evitar duplicidade.
 *
 * @returns UUID da última lista usada ou da lista padrão criada.
 */
export function ensureDefaultLists(): Promise<string> {
  if (!ensureDefaultListsPromise) {
    ensureDefaultListsPromise = runEnsureDefaultLists().finally(() => {
      ensureDefaultListsPromise = null;
    });
  }
  return ensureDefaultListsPromise;
}

/**
 * Executa a verificação e criação atômica das listas iniciais no IndexedDB,
 * coordenando múltiplas abas via Web Locks API quando disponível.
 *
 * @returns UUID da lista ativa inicial.
 */
async function runEnsureDefaultLists(): Promise<string> {
  const execute = async (): Promise<string> => {
    const selectedId = await db.transaction('rw', db.lists, db.pendingSync, async () => {
      const existing = await db.lists.toArray();
      if (existing.length > 0) {
        const saved = getLastActiveListId();
        if (saved && existing.some((l) => l.id === saved)) {
          return saved;
        }
        return existing[0].id;
      }

      const now = new Date().toISOString();
      const mercado: ShoppingList = {
        id: crypto.randomUUID(),
        name: 'Mercado',
        type: 'mercado',
        shareCode: generateShareCode(),
        ownerId: null,
        isSynced: false,
        createdAt: now,
        updatedAt: now,
      };
      const farmacia: ShoppingList = {
        id: crypto.randomUUID(),
        name: 'Farmácia',
        type: 'farmacia',
        shareCode: generateShareCode(),
        ownerId: null,
        isSynced: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.lists.bulkPut([mercado, farmacia]);
      await enqueueSync('upsert_list', mercado.id, mercado.id, mercado as unknown as Record<string, unknown>);
      await enqueueSync('upsert_list', farmacia.id, farmacia.id, farmacia as unknown as Record<string, unknown>);
      return mercado.id;
    });

    setLastActiveListId(selectedId);
    return selectedId;
  };

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('pegala-ensure-defaults', () => execute());
  }
  return execute();
}

/**
 * Enfileira uma mutação local na tabela `pendingSync` para envio assíncrono ao Supabase.
 *
 * @param action - Tipo de operação remota.
 * @param entityId - UUID da entidade alterada.
 * @param listId - UUID da lista associada.
 * @param payload - Dados serializados da operação.
 */
export async function enqueueSync(
  action: PendingSyncMutation['action'],
  entityId: string,
  listId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (action === 'upsert_item' || action === 'upsert_list') {
    await db.pendingSync
      .where('listId')
      .equals(listId)
      .filter((m) => m.entityId === entityId && m.action === action)
      .delete();
  } else if (action === 'delete_item') {
    await db.pendingSync
      .where('listId')
      .equals(listId)
      .filter((m) => m.entityId === entityId && m.action === 'upsert_item')
      .delete();
  }

  await db.pendingSync.add({
    action,
    entityId,
    listId,
    payload,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Enfileira múltiplas mutações de uma mesma lista em uma única passagem sobre `pendingSync`
 * (eliminando queries N+1 / O(N²) em operações em lote como colar, limpar, duplicar e recomeçar).
 *
 * @param listId - UUID da lista associada às mutações.
 * @param entries - Lista de mutações a coalescer e inserir em lote.
 */
async function enqueueSyncBatch(
  listId: string,
  entries: Array<{
    action: PendingSyncMutation['action'];
    entityId: string;
    payload: Record<string, unknown>;
  }>
): Promise<void> {
  if (entries.length === 0) return;

  const upsertKeys = new Set<string>();
  const deleteEntityIds = new Set<string>();
  for (const e of entries) {
    if (e.action === 'upsert_item' || e.action === 'upsert_list') {
      upsertKeys.add(`${e.action}:${e.entityId}`);
    } else if (e.action === 'delete_item') {
      deleteEntityIds.add(e.entityId);
    }
  }

  if (upsertKeys.size > 0 || deleteEntityIds.size > 0) {
    const existing = await db.pendingSync.where('listId').equals(listId).toArray();
    const idsToDelete: number[] = [];
    for (const m of existing) {
      if (m.id === undefined) continue;
      if (upsertKeys.has(`${m.action}:${m.entityId}`)) {
        idsToDelete.push(m.id);
      } else if (m.action === 'upsert_item' && deleteEntityIds.has(m.entityId)) {
        idsToDelete.push(m.id);
      }
    }
    if (idsToDelete.length > 0) {
      await db.pendingSync.bulkDelete(idsToDelete);
    }
  }

  const now = new Date().toISOString();
  await db.pendingSync.bulkAdd(
    entries.map((e) => ({
      action: e.action,
      entityId: e.entityId,
      listId,
      payload: e.payload,
      createdAt: now,
    }))
  );
}

/**
 * Cria uma nova lista de compras local, define-a como ativa e enfileira sua sincronização.
 *
 * @param name - Nome visível da lista.
 * @param type - Tipo operacional da lista (`mercado`, `farmacia` ou `geral`).
 * @returns A lista recém-criada.
 */
export async function createList(name: string, type: ListType): Promise<ShoppingList> {
  const now = new Date().toISOString();
  const list: ShoppingList = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Nova Lista',
    type,
    shareCode: generateShareCode(),
    ownerId: null,
    isSynced: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.lists, db.pendingSync, async () => {
    await db.lists.put(list);
    await enqueueSync('upsert_list', list.id, list.id, list as unknown as Record<string, unknown>);
  });
  setLastActiveListId(list.id);
  return list;
}

/**
 * Renomeia uma lista de compras local e enfileira sua sincronização para os demais membros.
 *
 * @param listId - UUID da lista a ser renomeada.
 * @param newName - Novo nome visível da lista.
 */
export async function renameList(listId: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) return;

  await db.transaction('rw', db.lists, db.pendingSync, async () => {
    const existing = await db.lists.get(listId);
    if (!existing || existing.name === trimmed) return;

    const updated: ShoppingList = {
      ...existing,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    };
    await db.lists.put(updated);
    await enqueueSync('upsert_list', updated.id, updated.id, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Exclui uma lista (como proprietário), todos os seus itens locais e mutações obsoletas, enfileirando o `delete_list`.
 *
 * @param listId - UUID da lista a ser removida.
 */
export async function deleteList(listId: string): Promise<void> {
  await db.transaction('rw', db.lists, db.items, db.pendingSync, db.priceComparisons, async () => {
    await db.items.where('listId').equals(listId).delete();
    await db.lists.delete(listId);
    await db.pendingSync.where('listId').equals(listId).delete();
    await db.priceComparisons.delete(listId);
    await enqueueSync('delete_list', listId, listId, { id: listId });
  });
}

/**
 * Remove uma lista compartilhada do aparelho atual (como convidado) e enfileira `leave_list`
 * para encerrar o vínculo em `list_members` sem apagar a lista para os demais participantes.
 *
 * @param listId - UUID da lista compartilhada da qual o usuário está saindo.
 */
export async function leaveList(listId: string): Promise<void> {
  await db.transaction('rw', db.lists, db.items, db.pendingSync, db.priceComparisons, async () => {
    await db.items.where('listId').equals(listId).delete();
    await db.lists.delete(listId);
    await db.pendingSync.where('listId').equals(listId).delete();
    await db.priceComparisons.delete(listId);
    await enqueueSync('leave_list', listId, listId, { id: listId });
  });
}

/**
 * Carrega o mapa de categorias personalizadas aprendidas pelo usuário.
 *
 * @returns Mapa de termo normalizado para {@link CategoryId}.
 */
export async function getUserDictionaryMap(): Promise<Map<string, CategoryId>> {
  const entries = await db.dictionary.toArray();
  const map = new Map<string, CategoryId>();
  for (const e of entries) {
    map.set(e.normalizedTerm, e.categoryId);
  }
  return map;
}

/**
 * Registra o uso de um item no dicionário pessoal para frequência de sugestões e aprendizado de categoria.
 *
 * @param displayName - Nome formatado do item.
 * @param categoryId - Categoria associada ao item.
 * @param forceCategoryUpdate - Quando `true`, sobrescreve a categoria previamente aprendida.
 */
export async function recordDictionaryUsage(
  displayName: string,
  categoryId: CategoryId,
  forceCategoryUpdate = false
): Promise<void> {
  const normalizedTerm = normalizeText(displayName);
  if (!normalizedTerm) return;

  const now = new Date().toISOString();
  const existing = await db.dictionary.where('normalizedTerm').equals(normalizedTerm).first();

  if (existing && existing.id !== undefined) {
    await db.dictionary.update(existing.id, {
      displayName: existing.displayName || displayName,
      categoryId: forceCategoryUpdate ? categoryId : existing.categoryId,
      usageCount: existing.usageCount + 1,
      lastUsedAt: now,
    });
  } else {
    await db.dictionary.add({
      normalizedTerm,
      displayName,
      categoryId,
      usageCount: 1,
      lastUsedAt: now,
    });
  }
}

/**
 * Analisa um texto de uma ou múltiplas linhas e adiciona ou atualiza itens na lista informada.
 *
 * @param listId - UUID da lista de destino.
 * @param rawText - Texto digitado, ditado por voz ou colado do WhatsApp.
 * @returns Lista de itens criados ou atualizados.
 */
export async function addItemsFromText(listId: string, rawText: string): Promise<ShoppingItem[]> {
  const parsedItems = parseMultiLineInput(rawText);
  if (parsedItems.length === 0) return [];

  const [userDict, { guessCategory }] = await Promise.all([
    getUserDictionaryMap(),
    import('../lib/dictionaryPtBr'),
  ]);
  const now = new Date().toISOString();
  const addedOrUpdated: ShoppingItem[] = [];

  await db.transaction('rw', db.items, db.pendingSync, db.dictionary, async () => {
    const syncEntries: Array<{
      action: PendingSyncMutation['action'];
      entityId: string;
      payload: Record<string, unknown>;
    }> = [];

    for (const parsed of parsedItems) {
      const existing = await db.items
        .where('[listId+normalizedName]')
        .equals([listId, parsed.normalizedName])
        .first();

      if (existing) {
        // If item was already in "checked", uncheck it and set new quantity; if unchecked, sum quantities if same unit
        const updatedQty = existing.isChecked
          ? parsed.quantity
          : existing.unit === parsed.unit
            ? existing.quantity + parsed.quantity
            : parsed.quantity;

        const updated: ShoppingItem = {
          ...existing,
          quantity: updatedQty,
          unit: parsed.unit,
          isChecked: false,
          checkedAt: null,
          updatedAt: now,
        };
        await db.items.put(updated);
        syncEntries.push({
          action: 'upsert_item',
          entityId: updated.id,
          payload: updated as unknown as Record<string, unknown>,
        });
        await recordDictionaryUsage(updated.name, updated.categoryId);
        addedOrUpdated.push(updated);
      } else {
        const categoryId = guessCategory(parsed.name, userDict);
        const item: ShoppingItem = {
          id: crypto.randomUUID(),
          listId,
          name: parsed.name,
          normalizedName: parsed.normalizedName,
          quantity: parsed.quantity,
          unit: parsed.unit,
          categoryId,
          isChecked: false,
          checkedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        await db.items.put(item);
        syncEntries.push({
          action: 'upsert_item',
          entityId: item.id,
          payload: item as unknown as Record<string, unknown>,
        });
        await recordDictionaryUsage(item.name, categoryId);
        addedOrUpdated.push(item);
      }
    }

    await enqueueSyncBatch(listId, syncEntries);
  });

  return addedOrUpdated;
}

/**
 * Alterna o estado de um item entre pendente e "No carrinho" (`isChecked`).
 *
 * @param item - Item a ser marcado ou desmarcado.
 */
export async function toggleItemChecked(item: ShoppingItem): Promise<void> {
  const now = new Date().toISOString();
  const nextChecked = !item.isChecked;
  const updated: ShoppingItem = {
    ...item,
    isChecked: nextChecked,
    checkedAt: nextChecked ? now : null,
    updatedAt: now,
  };
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    await db.items.put(updated);
    await enqueueSync('upsert_item', updated.id, updated.listId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Calcula o passo simétrico de incremento/decremento adequado para a unidade de medida do item.
 *
 * @param unit - Unidade do item (`g`, `ml`, `kg`, `L`, `un`, etc.).
 * @param currentQty - Quantidade atual do item.
 * @param direction - Direção do ajuste (`'inc'` para aumentar ou `'dec'` para diminuir).
 * @returns Incremento numérico simétrico recomendado para o stepper touch.
 */
export function getQuantityStep(
  unit: string,
  currentQty: number,
  direction: 'inc' | 'dec' = 'inc'
): number {
  if (unit === 'g' || unit === 'ml') {
    if (direction === 'dec') {
      return currentQty <= 100 || (currentQty < 200 && currentQty % 100 !== 0) ? 50 : 100;
    }
    return currentQty < 100 ? 50 : 100;
  }
  if (unit === 'kg' || unit === 'L') {
    if (direction === 'dec') {
      return !Number.isInteger(currentQty) || currentQty <= 1 ? 0.5 : 1;
    }
    return !Number.isInteger(currentQty) || currentQty < 1 ? 0.5 : 1;
  }
  return 1;
}

/**
 * Retorna a quantidade mínima permitida para uma unidade de medida sem excluir o item da lista.
 *
 * @param unit - Unidade de medida do item (`g`, `ml`, `kg`, `L`, `un`, etc.).
 * @returns Quantidade mínima positiva para a unidade.
 */
export function getMinQuantityForUnit(unit: string): number {
  if (unit === 'g' || unit === 'ml') return 50;
  if (unit === 'kg' || unit === 'L') return 0.5;
  return 1;
}

/**
 * Verifica se o item já se encontra na quantidade mínima permitida para sua unidade.
 *
 * @param item - Item a ser avaliado.
 * @returns `true` quando a quantidade atual é menor ou igual ao mínimo da unidade.
 */
export function isAtMinQuantity(item: ShoppingItem): boolean {
  return item.quantity <= getMinQuantityForUnit(item.unit);
}

/**
 * Atualiza a quantidade de um item aplicando um delta numérico respeitando o mínimo da unidade.
 *
 * @param item - Item alvo da atualização.
 * @param delta - Variação positiva ou negativa a ser aplicada.
 */
export async function updateItemQuantity(item: ShoppingItem, delta: number): Promise<void> {
  const minQty = getMinQuantityForUnit(item.unit);
  const nextQty = Math.max(minQty, Number((item.quantity + delta).toFixed(2)));
  const updated: ShoppingItem = {
    ...item,
    quantity: nextQty,
    updatedAt: new Date().toISOString(),
  };
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    await db.items.put(updated);
    await enqueueSync('upsert_item', updated.id, updated.listId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Incrementa a quantidade do item usando o passo inteligente da sua unidade de medida.
 *
 * @param item - Item a ser incrementado.
 */
export async function incrementItemQuantity(item: ShoppingItem): Promise<void> {
  const step = getQuantityStep(item.unit, item.quantity, 'inc');
  await updateItemQuantity(item, step);
}

/**
 * Decrementa a quantidade do item parando no valor mínimo da unidade (`1x`, `50g`, `0,5kg`)
 * sem remover o item da lista, preservando-o para compras futuras.
 *
 * @param item - Item a ser decrementado.
 */
export async function decrementItemQuantity(item: ShoppingItem): Promise<void> {
  if (isAtMinQuantity(item)) return;
  const step = getQuantityStep(item.unit, item.quantity, 'dec');
  await updateItemQuantity(item, -step);
}

/**
 * Decrementa a quantidade do item ou move-o para "No carrinho / Já tenho" caso já esteja no mínimo,
 * garantindo que o item permaneça salvo na lista.
 *
 * @param item - Item acionado no catálogo rápido.
 * @returns `'checked'` se o item foi movido para "Já tenho", ou `'updated'` se teve a quantidade reduzida.
 */
export async function decrementOrMarkChecked(item: ShoppingItem): Promise<'updated' | 'checked'> {
  if (isAtMinQuantity(item)) {
    await toggleItemChecked(item);
    return 'checked';
  }
  const step = getQuantityStep(item.unit, item.quantity, 'dec');
  await updateItemQuantity(item, -step);
  return 'updated';
}

/**
 * Define exatamente a quantidade e a unidade de um item (usado pelas pílulas rápidas),
 * sanitizando valores inválidos (`quantity <= 0` ou `unit` vazio) antes de persistir.
 *
 * @param item - Item alvo da atualização.
 * @param quantity - Nova quantidade numérica positiva.
 * @param unit - Nova unidade de medida.
 */
export async function setItemExactQuantityAndUnit(
  item: ShoppingItem,
  quantity: number,
  unit: string
): Promise<void> {
  const safeQty =
    Number.isFinite(quantity) && quantity > 0 ? Number(quantity.toFixed(2)) : item.quantity;
  const safeUnit = unit.trim() || item.unit;
  const updated: ShoppingItem = {
    ...item,
    quantity: safeQty,
    unit: safeUnit,
    updatedAt: new Date().toISOString(),
  };
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    await db.items.put(updated);
    await enqueueSync('upsert_item', updated.id, updated.listId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Restaura um item recém-excluído (ação "Desfazer"), removendo antes qualquer `delete_item` pendente na fila.
 *
 * @param item - Cópia do item removido a ser restaurado.
 */
export async function restoreDeletedItem(item: ShoppingItem): Promise<void> {
  const restored: ShoppingItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    await db.pendingSync
      .where('listId')
      .equals(restored.listId)
      .filter((m) => m.entityId === restored.id)
      .delete();
    await db.items.put(restored);
    await enqueueSync('upsert_item', restored.id, restored.listId, restored as unknown as Record<string, unknown>);
  });
}

/**
 * Altera o corredor/categoria de um item e grava a preferência no dicionário pessoal do usuário.
 *
 * @param item - Item a ser reclassificado.
 * @param categoryId - Nova categoria escolhida pelo usuário.
 */
export async function updateItemCategory(item: ShoppingItem, categoryId: CategoryId): Promise<void> {
  const updated: ShoppingItem = {
    ...item,
    categoryId,
    updatedAt: new Date().toISOString(),
  };
  await db.transaction('rw', db.items, db.pendingSync, db.dictionary, async () => {
    await db.items.put(updated);
    await enqueueSync('upsert_item', updated.id, updated.listId, updated as unknown as Record<string, unknown>);
    await recordDictionaryUsage(item.name, categoryId, true);
  });
}

/**
 * Atualiza os detalhes completos de um item (nome, quantidade, unidade e corredor),
 * sincroniza com o Supabase, mescla duplicatas caso o novo nome já exista na lista
 * e ensina a categoria ao dicionário pessoal caso alterada.
 *
 * @param item - Item original a ser atualizado.
 * @param updates - Novos valores de nome, quantidade, unidade e categoria.
 */
export async function updateItemDetails(
  item: ShoppingItem,
  updates: { name: string; quantity: number; unit: string; categoryId: CategoryId }
): Promise<void> {
  const cleanedName = updates.name.trim().replace(/\s+/g, ' ') || item.name;
  const normalizedName = normalizeText(cleanedName) || item.normalizedName;
  const safeQty = Number.isFinite(updates.quantity) && updates.quantity > 0 ? updates.quantity : item.quantity;
  const safeUnit = updates.unit.trim() || item.unit;

  await db.transaction('rw', db.items, db.pendingSync, db.dictionary, async () => {
    const duplicate = await db.items
      .where('[listId+normalizedName]')
      .equals([item.listId, normalizedName])
      .first();

    const mergedQty =
      duplicate && duplicate.id !== item.id && !duplicate.isChecked && duplicate.unit === safeUnit
        ? Number((safeQty + duplicate.quantity).toFixed(2))
        : safeQty;

    if (duplicate && duplicate.id !== item.id) {
      await db.items.delete(duplicate.id);
      await enqueueSync('delete_item', duplicate.id, item.listId, {
        id: duplicate.id,
        listId: item.listId,
      });
    }

    const updated: ShoppingItem = {
      ...item,
      name: cleanedName,
      normalizedName,
      quantity: mergedQty,
      unit: safeUnit,
      categoryId: updates.categoryId,
      updatedAt: new Date().toISOString(),
    };

    await db.items.put(updated);
    await enqueueSync('upsert_item', updated.id, updated.listId, updated as unknown as Record<string, unknown>);
    if (updates.categoryId !== item.categoryId || cleanedName !== item.name) {
      await recordDictionaryUsage(cleanedName, updates.categoryId, true);
    }
  });
}

/**
 * Remove um item localmente, limpa `upsert_item` pendentes do mesmo ID e enfileira a exclusão remota.
 *
 * @param item - Item a ser excluído.
 */
export async function deleteItem(item: ShoppingItem): Promise<void> {
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    await db.items.delete(item.id);
    await enqueueSync('delete_item', item.id, item.listId, { id: item.id, listId: item.listId });
  });
}

/**
 * Remove em lote todos os itens marcados ("No carrinho / Já tenho") de uma lista,
 * retornando os itens removidos para permitir restauração via "Desfazer".
 *
 * @param listId - UUID da lista.
 * @returns Itens que foram excluídos.
 */
export async function deleteCheckedItems(listId: string): Promise<ShoppingItem[]> {
  return db.transaction('rw', db.items, db.pendingSync, async () => {
    const checked = await db.items
      .where('listId')
      .equals(listId)
      .filter((i) => i.isChecked)
      .toArray();

    if (checked.length === 0) return [];

    await db.items.bulkDelete(checked.map((i) => i.id));
    await enqueueSyncBatch(
      listId,
      checked.map((item) => ({
        action: 'delete_item',
        entityId: item.id,
        payload: { id: item.id, listId },
      }))
    );
    return checked;
  });
}

/**
 * Restaura em lote uma coleção de itens recém-excluídos (usado pelo "Desfazer" ao limpar marcados).
 *
 * @param items - Itens a serem restaurados no IndexedDB e reenfileirados para sincronização.
 */
export async function restoreDeletedItems(items: ShoppingItem[]): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    const toRestore: ShoppingItem[] = [];
    for (const item of items) {
      const existingByName = await db.items
        .where('[listId+normalizedName]')
        .equals([item.listId, item.normalizedName])
        .first();
      if (existingByName && existingByName.id !== item.id) {
        continue;
      }
      toRestore.push({ ...item, updatedAt: now });
    }
    if (toRestore.length === 0) return;
    await db.items.bulkPut(toRestore);
    const byList = new Map<string, ShoppingItem[]>();
    for (const item of toRestore) {
      const arr = byList.get(item.listId) ?? [];
      arr.push(item);
      byList.set(item.listId, arr);
    }
    for (const [listId, group] of byList.entries()) {
      await enqueueSyncBatch(
        listId,
        group.map((item) => ({
          action: 'upsert_item',
          entityId: item.id,
          payload: item as unknown as Record<string, unknown>,
        }))
      );
    }
  });
}

/**
 * Duplica uma lista existente como nova lista local privada, clonando todos os itens
 * já reiniciados como pendentes (prontos para uma nova compra).
 *
 * @param listId - UUID da lista de origem.
 * @returns Nova lista criada ou `null` caso a origem não exista.
 */
export async function duplicateList(listId: string): Promise<ShoppingList | null> {
  return db.transaction('rw', db.lists, db.items, db.pendingSync, async () => {
    const source = await db.lists.get(listId);
    if (!source) return null;

    const sourceItems = await db.items.where('listId').equals(listId).toArray();
    const now = new Date().toISOString();
    const baseName = source.name.replace(/\s*\(cópia\)$/i, '').trim() || source.name;
    const copyName = `${baseName} (cópia)`.slice(0, 80);

    const clonedList: ShoppingList = {
      id: crypto.randomUUID(),
      name: copyName,
      type: source.type,
      shareCode: generateShareCode(),
      ownerId: null,
      isSynced: false,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.lists.add(clonedList);
    await enqueueSync('upsert_list', clonedList.id, clonedList.id, clonedList as unknown as Record<string, unknown>);

    if (sourceItems.length > 0) {
      const clonedItems: ShoppingItem[] = sourceItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        listId: clonedList.id,
        isChecked: false,
        checkedAt: null,
        createdAt: now,
        updatedAt: now,
      }));
      await db.items.bulkAdd(clonedItems);
      await enqueueSyncBatch(
        clonedList.id,
        clonedItems.map((item) => ({
          action: 'upsert_item',
          entityId: item.id,
          payload: item as unknown as Record<string, unknown>,
        }))
      );
    }

    return clonedList;
  });
}

/**
 * Contadores de registros armazenados localmente no IndexedDB.
 */
export interface LocalDataStats {
  /** Quantidade de listas locais. */
  lists: number;
  /** Quantidade total de itens em todas as listas. */
  items: number;
  /** Quantidade de termos aprendidos no dicionário pessoal. */
  dictionary: number;
  /** Quantidade de snapshots de comparação de preços em cache. */
  priceCaches: number;
}

/**
 * Retorna os contadores atuais do banco local IndexedDB para exibição na tela de Dados e Backup.
 *
 * @returns Contadores das tabelas locais.
 */
export async function getLocalDataStats(): Promise<LocalDataStats> {
  const [lists, items, dictionary, priceCaches] = await Promise.all([
    db.lists.count(),
    db.items.count(),
    db.dictionary.count(),
    db.priceComparisons.count(),
  ]);
  return { lists, items, dictionary, priceCaches };
}

/**
 * Limpa todo o cache offline de comparações de preços no IndexedDB.
 *
 * @returns Quantidade de snapshots removidos.
 */
export async function clearPriceComparisonCaches(): Promise<number> {
  const count = await db.priceComparisons.count();
  await db.priceComparisons.clear();
  return count;
}

/**
 * Limpa o dicionário pessoal de sugestões frequentes e aprendizados de corredor.
 *
 * @returns Quantidade de entradas removidas.
 */
export async function clearUserDictionary(): Promise<number> {
  const count = await db.dictionary.count();
  await db.dictionary.clear();
  return count;
}

/**
 * Reativa todos os itens marcados ("No carrinho / Já tenho") de volta para a lista de compra ativa
 * sem excluir nenhum item salvo na lista.
 *
 * @param listId - UUID da lista a ser recomeçada.
 * @returns Quantidade de itens devolvidos para a lista ativa.
 */
export async function uncheckAllItems(listId: string): Promise<number> {
  return db.transaction('rw', db.items, db.pendingSync, async () => {
    const checked = await db.items
      .where('listId')
      .equals(listId)
      .filter((i) => i.isChecked)
      .toArray();

    if (checked.length === 0) return 0;

    const now = new Date().toISOString();
    const updatedItems: ShoppingItem[] = checked.map((item) => ({
      ...item,
      isChecked: false,
      checkedAt: null,
      updatedAt: now,
    }));
    await db.items.bulkPut(updatedItems);
    await enqueueSyncBatch(
      listId,
      updatedItems.map((updated) => ({
        action: 'upsert_item',
        entityId: updated.id,
        payload: updated as unknown as Record<string, unknown>,
      }))
    );
    return updatedItems.length;
  });
}

/**
 * Remarca no carrinho uma lista específica de itens (usado pelo botão "Desfazer" ao recomeçar a lista).
 *
 * @param listId - UUID da lista.
 * @param itemIds - IDs dos itens a serem restaurados como marcados.
 */
export async function recheckItems(listId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  await db.transaction('rw', db.items, db.pendingSync, async () => {
    const now = new Date().toISOString();
    const existing = await db.items.bulkGet(itemIds);
    const updatedItems: ShoppingItem[] = [];
    for (const item of existing) {
      if (!item || item.listId !== listId || item.isChecked) continue;
      updatedItems.push({
        ...item,
        isChecked: true,
        checkedAt: now,
        updatedAt: now,
      });
    }
    if (updatedItems.length === 0) return;
    await db.items.bulkPut(updatedItems);
    await enqueueSyncBatch(
      listId,
      updatedItems.map((updated) => ({
        action: 'upsert_item',
        entityId: updated.id,
        payload: updated as unknown as Record<string, unknown>,
      }))
    );
  });
}

/**
 * Salva no IndexedDB o snapshot bruto da última comparação de preços para uso offline.
 *
 * @param snapshot - Resultado bruto de lojas e cotações para a lista.
 */
export async function savePriceComparisonCache(snapshot: CachedPriceComparison): Promise<void> {
  await db.priceComparisons.put(snapshot);
}

/**
 * Recupera do IndexedDB o último snapshot de comparação de preços salvo para uma lista.
 *
 * @param listId - UUID da lista.
 * @returns Snapshot salvo ou `undefined`.
 */
export async function getPriceComparisonCache(listId: string): Promise<CachedPriceComparison | undefined> {
  return db.priceComparisons.get(listId);
}

/**
 * Retorna um mapa de termo normalizado para o produto/marca preferido escolhido pelo usuário.
 *
 * @returns Mapa de `normalizedTerm` para {@link PreferredProduct}.
 */
export async function getPreferredProductsMap(): Promise<Map<string, PreferredProduct>> {
  const entries = await db.dictionary.toArray();
  const map = new Map<string, PreferredProduct>();
  for (const entry of entries) {
    if (entry.preferredProduct) {
      map.set(entry.normalizedTerm, entry.preferredProduct);
    }
  }
  return map;
}

/**
 * Persiste no dicionário pessoal o produto/marca preferido para um termo da lista.
 *
 * @param displayName - Nome visível do item na lista.
 * @param categoryId - Categoria atual do item.
 * @param preferredProduct - Produto específico selecionado pelo usuário.
 */
export async function savePreferredProduct(
  displayName: string,
  categoryId: CategoryId,
  preferredProduct: PreferredProduct
): Promise<void> {
  const normalizedTerm = normalizeText(displayName);
  if (!normalizedTerm) return;

  const now = new Date().toISOString();
  await db.transaction('rw', db.dictionary, async () => {
    const existing = await db.dictionary.where('normalizedTerm').equals(normalizedTerm).first();
    if (existing && existing.id !== undefined) {
      await db.dictionary.update(existing.id, { preferredProduct, lastUsedAt: now });
    } else {
      await db.dictionary.add({
        normalizedTerm,
        displayName,
        categoryId,
        usageCount: 1,
        lastUsedAt: now,
        preferredProduct,
      });
    }
  });
}
