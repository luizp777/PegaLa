import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { db, generateShareCode } from './localDb';
import { ensureSupabaseSession, isSupabaseConfigured, supabase } from '../lib/supabase';
import { serializeError, syncLogger } from '../lib/logger';
import type { CategoryId, ListType, PendingSyncMutation, ShoppingItem, ShoppingList } from '../types';

/**
 * Representação em snake_case de uma linha da tabela `public.lists` no Supabase.
 */
interface RemoteListRow {
  /** UUID da lista. */
  id: string;
  /** Nome da lista. */
  name: string;
  /** Tipo operacional da lista. */
  type: ListType;
  /** Código curto de convite. */
  share_code: string;
  /** UUID do proprietário no Supabase Auth. */
  owner_id: string | null;
  /** Timestamp ISO de criação. */
  created_at: string;
  /** Timestamp ISO de atualização. */
  updated_at: string;
}

/**
 * Representação em snake_case de uma linha da tabela `public.list_items` no Supabase.
 */
interface RemoteItemRow {
  /** UUID do item. */
  id: string;
  /** UUID da lista pai. */
  list_id: string;
  /** Nome formatado do item. */
  name: string;
  /** Nome normalizado para deduplicação. */
  normalized_name: string;
  /** Quantidade numérica. */
  quantity: number;
  /** Unidade de medida. */
  unit: string;
  /** Identificador da categoria/corredor. */
  category_id: CategoryId;
  /** Indica se o item está no carrinho. */
  is_checked: boolean;
  /** Timestamp ISO em que foi marcado como pego. */
  checked_at: string | null;
  /** Timestamp ISO de criação. */
  created_at: string;
  /** Timestamp ISO de atualização. */
  updated_at: string;
}

/**
 * Converte uma {@link ShoppingList} local para o formato de registro do Supabase.
 *
 * @param list - Lista local.
 * @param userId - UUID do usuário autenticado para preenchimento de `owner_id` caso ausente.
 * @returns Registro pronto para upsert na tabela `lists`.
 */
function toRemoteList(list: ShoppingList, userId: string | null): RemoteListRow {
  return {
    id: list.id,
    name: list.name,
    type: list.type,
    share_code: list.shareCode,
    owner_id: list.ownerId ?? userId,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  };
}

/**
 * Converte um registro remoto da tabela `lists` para {@link ShoppingList}.
 *
 * @param row - Registro retornado pelo Supabase.
 * @param isShared - Indica se a lista foi importada como compartilhada.
 * @returns Lista local marcada como sincronizada.
 */
function fromRemoteList(row: RemoteListRow, isShared = false): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    shareCode: row.share_code,
    ownerId: row.owner_id,
    isSynced: true,
    isShared,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converte um {@link ShoppingItem} local para o formato de registro da tabela `list_items`.
 *
 * @param item - Item local.
 * @returns Registro pronto para upsert no Supabase.
 */
function toRemoteItem(item: ShoppingItem): RemoteItemRow {
  return {
    id: item.id,
    list_id: item.listId,
    name: item.name,
    normalized_name: item.normalizedName,
    quantity: item.quantity,
    unit: item.unit,
    category_id: item.categoryId,
    is_checked: item.isChecked,
    checked_at: item.checkedAt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

/**
 * Converte um registro remoto da tabela `list_items` para {@link ShoppingItem}.
 *
 * @param row - Registro retornado pelo Supabase ou evento Realtime.
 * @returns Item local tipado.
 */
function fromRemoteItem(row: RemoteItemRow): ShoppingItem {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    normalizedName: row.normalized_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    categoryId: row.category_id,
    isChecked: row.is_checked,
    checkedAt: row.checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PERMANENT_PG_ERROR_CODES = new Set([
  '22P02', // invalid_text_representation
  '23502', // not_null_violation
  '23503', // foreign_key_violation (e.g. parent list was already deleted remotely)
  '23514', // check_violation
]);

/**
 * Determina se um erro PostgREST representa falha permanente (restrição ou permissão)
 * que deve descartar a mutação para evitar bloqueio da fila offline.
 *
 * @param error - Erro retornado pelo cliente Supabase.
 * @returns `true` se o erro for permanente.
 */
function isPermanentError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return Boolean(error.code && PERMANENT_PG_ERROR_CODES.has(error.code));
}

/**
 * Define a prioridade de execução de uma mutação na fila offline (`upsert_list` primeiro, `delete_list` por último).
 *
 * @param action - Ação da mutação pendente.
 * @returns Prioridade numérica crescente (`0` = mais alta).
 */
function mutationPriority(action: PendingSyncMutation['action']): number {
  if (action === 'upsert_list') return 0;
  if (action === 'delete_list' || action === 'leave_list') return 2;
  return 1;
}

/**
 * Executa upsert de uma lista no Supabase tratando eventual colisão de `share_code` (`23505`)
 * com regeneração automática do código local (até 3 tentativas).
 *
 * @param list - Lista local a ser enviada.
 * @param userId - UUID do usuário autenticado.
 * @returns Erro PostgREST final ou `null` em caso de sucesso.
 */
async function upsertListWithCodeRetry(
  list: ShoppingList,
  userId: string
): Promise<PostgrestError | null> {
  if (!supabase) return null;
  let candidate = list;
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from('lists')
      .upsert(toRemoteList(candidate, userId), { onConflict: 'id' });

    if (!error) return null;

    lastError = error;

    if (error.code === '23505') {
      const nextCode = generateShareCode();
      syncLogger.warn('Colisão de share_code detectada (23505); regenerando código', {
        listId: candidate.id,
        attempt: attempt + 1,
      });
      candidate = { ...candidate, shareCode: nextCode, updatedAt: new Date().toISOString() };
      await db.lists.update(candidate.id, {
        shareCode: nextCode,
        updatedAt: candidate.updatedAt,
      });
      continue;
    }

    return error;
  }

  return lastError;
}

let activeChannel: RealtimeChannel | null = null;
let flushing = false;
let pendingFlushRequested = false;
const authRetryCounts = new Map<string, number>();
const MAX_AUTH_RETRIES = 3;
const SYNC_BATCH_SIZE = 100;

/**
 * Envia itens para `public.list_items` em lotes de até {@link SYNC_BATCH_SIZE}.
 *
 * @param items - Itens locais a enviar.
 * @returns Primeiro erro PostgREST encontrado ou `null` em caso de sucesso.
 */
async function upsertItemsInChunks(items: ShoppingItem[]): Promise<PostgrestError | null> {
  if (!supabase || items.length === 0) return null;
  for (let i = 0; i < items.length; i += SYNC_BATCH_SIZE) {
    const chunk = items.slice(i, i + SYNC_BATCH_SIZE);
    const { error } = await supabase
      .from('list_items')
      .upsert(chunk.map(toRemoteItem), { onConflict: 'list_id,normalized_name' });
    if (error) return error;
  }
  return null;
}

/**
 * Coordena a execução de sincronização entre múltiplas abas abertas usando Web Locks API
 * (com fallback transparente quando indisponível no ambiente).
 *
 * @param fn - Rotina assíncrona de sincronização a ser serializada.
 * @returns Resultado retornado por `fn`.
 */
async function withCrossTabSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('pegala-sync-flush', () => fn());
  }
  return fn();
}

/**
 * Descarrega a fila local `pendingSync` para o Supabase em ordem segura, com batching por lista
 * e coordenação multi-aba.
 *
 * @returns `true` se todas as mutações pendentes foram sincronizadas com sucesso.
 */
export async function flushPendingSync(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
    return false;
  }
  if (flushing) {
    pendingFlushRequested = true;
    return false;
  }

  return withCrossTabSyncLock(async () => runFlushPendingSync());
}

/**
 * Executa uma única passagem de descarga da fila `pendingSync`.
 *
 * @returns `true` se todas as mutações pendentes foram sincronizadas com sucesso.
 */
async function runFlushPendingSync(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
    return false;
  }
  if (flushing) {
    pendingFlushRequested = true;
    return false;
  }

  flushing = true;
  pendingFlushRequested = false;
  let allSucceeded = true;
  try {
    const user = await ensureSupabaseSession();
    if (!user) return false;

    // Auto-detect shared lists belonging to another owner (e.g. joined before `isShared` existed)
    const foreignLists = await db.lists
      .filter((l) => Boolean(l.ownerId && l.ownerId !== user.id && !l.isShared))
      .toArray();
    for (const foreignList of foreignLists) {
      await db.lists.update(foreignList.id, { isShared: true });
    }

    const failedListIds = new Set<string>();

    // Seed any local-only lists (created before Supabase was configured) into the cloud first
    const unsyncedLists = await db.lists.filter((l) => !l.isSynced).toArray();
    for (const localList of unsyncedLists) {
      const seedStartedAt = new Date().toISOString();
      const listErr = await upsertListWithCodeRetry(localList, user.id);
      if (!listErr) {
        const localItems = await db.items.where('listId').equals(localList.id).toArray();
        const itemsErr = await upsertItemsInChunks(localItems);
        if (!itemsErr) {
          const syncedItemIds = new Set(localItems.map((i) => i.id));
          await db.lists.update(localList.id, {
            isSynced: true,
            ownerId: localList.ownerId ?? user.id,
          });
          // Remove pending upsert mutations already satisfied by the seed pass
          await db.pendingSync
            .where('listId')
            .equals(localList.id)
            .filter(
              (m) =>
                m.createdAt <= seedStartedAt &&
                (m.action === 'upsert_list' ||
                  (m.action === 'upsert_item' && syncedItemIds.has(m.entityId)))
            )
            .delete();
        } else {
          syncLogger.warn('Falha ao enviar itens iniciais da lista local', {
            listId: localList.id,
            error: serializeError(itemsErr),
          });
          failedListIds.add(localList.id);
          allSucceeded = false;
        }
      } else {
        syncLogger.warn('Falha ao enviar lista local inicial', {
          listId: localList.id,
          error: serializeError(listErr),
        });
        failedListIds.add(localList.id);
        allSucceeded = false;
      }
    }

    const pending = await db.pendingSync.orderBy('id').toArray();
    if (pending.length === 0) return allSucceeded;

    // Ensure list creation runs before item mutations, and deletions/leaves last
    pending.sort((a, b) => {
      const pDiff = mutationPriority(a.action) - mutationPriority(b.action);
      if (pDiff !== 0) return pDiff;
      return (a.id ?? 0) - (b.id ?? 0);
    });

    const handleMutationError = async (
      mut: PendingSyncMutation,
      error: PostgrestError,
      supersededMuts: PendingSyncMutation[] = []
    ): Promise<void> => {
      const retryKey = `${mut.action}:${mut.entityId}`;
      const deleteMutAndSuperseded = async () => {
        const idsToDelete = new Set<number>();
        for (const m of [mut, ...supersededMuts]) {
          authRetryCounts.delete(`${m.action}:${m.entityId}`);
          if (m.id !== undefined) idsToDelete.add(m.id);
        }
        if (idsToDelete.size > 0) {
          await db.pendingSync.bulkDelete(Array.from(idsToDelete));
        }
      };

      if (isPermanentError(error)) {
        syncLogger.warn('Mutação permanente descartada da fila offline', {
          action: mut.action,
          entityId: mut.entityId,
          listId: mut.listId,
          error: serializeError(error),
        });
        await deleteMutAndSuperseded();
        allSucceeded = false;
      } else if (error.code === '42501') {
        const attempts = (authRetryCounts.get(retryKey) ?? 0) + 1;
        authRetryCounts.set(retryKey, attempts);

        if (attempts >= MAX_AUTH_RETRIES) {
          syncLogger.warn('Permissão negada persistentemente (42501); descartando mutação da fila', {
            action: mut.action,
            entityId: mut.entityId,
            listId: mut.listId,
            attempts,
            error: serializeError(error),
          });
          await deleteMutAndSuperseded();
        } else {
          void supabase?.auth.refreshSession().catch(() => { });
          syncLogger.warn('Erro transitório ao sincronizar mutação (mantida na fila)', {
            action: mut.action,
            entityId: mut.entityId,
            listId: mut.listId,
            error: serializeError(error),
          });
          failedListIds.add(mut.listId);
        }
        allSucceeded = false;
      } else {
        syncLogger.warn('Erro transitório ao sincronizar mutação (mantida na fila)', {
          action: mut.action,
          entityId: mut.entityId,
          listId: mut.listId,
          error: serializeError(error),
        });
        failedListIds.add(mut.listId);
        allSucceeded = false;
      }
    };

    const deleteCompletedMutations = async (muts: PendingSyncMutation[]): Promise<void> => {
      const idsToDelete: number[] = [];
      for (const m of muts) {
        authRetryCounts.delete(`${m.action}:${m.entityId}`);
        if (m.id !== undefined) idsToDelete.push(m.id);
      }
      if (idsToDelete.length > 0) {
        await db.pendingSync.bulkDelete(idsToDelete);
      }
    };

    // Phase 1: upsert_list
    for (const mut of pending) {
      if (mut.action !== 'upsert_list') continue;
      if (failedListIds.has(mut.listId)) continue;
      const list = mut.payload as unknown as ShoppingList;
      const error = await upsertListWithCodeRetry(list, user.id);
      if (!error) {
        await db.lists.update(list.id, { isSynced: true, ownerId: list.ownerId ?? user.id });
        await deleteCompletedMutations([mut]);
      } else {
        await handleMutationError(mut, error);
      }
    }

    // Phase 2: batch delete_item (first, to avoid normalized_name collisions) & upsert_item per list
    const upsertItemsByList = new Map<string, PendingSyncMutation[]>();
    const deleteItemsByList = new Map<string, PendingSyncMutation[]>();

    for (const mut of pending) {
      if (failedListIds.has(mut.listId)) continue;
      if (mut.action === 'upsert_item') {
        const arr = upsertItemsByList.get(mut.listId) ?? [];
        arr.push(mut);
        upsertItemsByList.set(mut.listId, arr);
      } else if (mut.action === 'delete_item') {
        const arr = deleteItemsByList.get(mut.listId) ?? [];
        arr.push(mut);
        deleteItemsByList.set(mut.listId, arr);
      }
    }

    for (const [listId, muts] of deleteItemsByList.entries()) {
      if (failedListIds.has(listId)) continue;
      for (let i = 0; i < muts.length; i += SYNC_BATCH_SIZE) {
        if (failedListIds.has(listId)) break;
        const chunk = muts.slice(i, i + SYNC_BATCH_SIZE);
        const ids = chunk.map((m) => m.entityId);
        const { error } = await supabase.from('list_items').delete().in('id', ids);

        if (!error) {
          await deleteCompletedMutations(chunk);
        } else if (isPermanentError(error) && chunk.length > 1) {
          for (const single of chunk) {
            const singleRes = await supabase.from('list_items').delete().eq('id', single.entityId);
            if (!singleRes.error) {
              await deleteCompletedMutations([single]);
            } else {
              await handleMutationError(single, singleRes.error);
            }
          }
        } else {
          for (const mut of chunk) {
            await handleMutationError(mut, error);
          }
        }
      }
    }

    for (const [listId, muts] of upsertItemsByList.entries()) {
      if (failedListIds.has(listId)) continue;
      // Deduplicate by normalizedName keeping the newest mutation to avoid Postgres 21000
      const latestByNorm = new Map<string, PendingSyncMutation>();
      const allMutsByNorm = new Map<string, PendingSyncMutation[]>();
      for (const mut of muts) {
        const item = mut.payload as unknown as ShoppingItem;
        const normKey = item.normalizedName || item.id;
        latestByNorm.set(normKey, mut);
        const listArr = allMutsByNorm.get(normKey) ?? [];
        listArr.push(mut);
        allMutsByNorm.set(normKey, listArr);
      }
      const dedupedMuts = Array.from(latestByNorm.values());

      for (let i = 0; i < dedupedMuts.length; i += SYNC_BATCH_SIZE) {
        if (failedListIds.has(listId)) break;
        const chunk = dedupedMuts.slice(i, i + SYNC_BATCH_SIZE);
        const rows = chunk.map((m) => toRemoteItem(m.payload as unknown as ShoppingItem));
        const { error } = await supabase
          .from('list_items')
          .upsert(rows, { onConflict: 'list_id,normalized_name' });

        if (!error) {
          const completed = chunk.flatMap((m) => {
            const item = m.payload as unknown as ShoppingItem;
            return allMutsByNorm.get(item.normalizedName || item.id) ?? [m];
          });
          await deleteCompletedMutations(completed);
        } else if (isPermanentError(error) && chunk.length > 1) {
          // Fallback to single-item upserts to isolate only the permanently invalid item
          for (const single of chunk) {
            const singleItem = single.payload as unknown as ShoppingItem;
            const singleRes = await supabase
              .from('list_items')
              .upsert(toRemoteItem(singleItem), { onConflict: 'list_id,normalized_name' });
            if (!singleRes.error) {
              const related = allMutsByNorm.get(singleItem.normalizedName || singleItem.id) ?? [single];
              await deleteCompletedMutations(related);
            } else {
              const related = allMutsByNorm.get(singleItem.normalizedName || singleItem.id) ?? [];
              await handleMutationError(single, singleRes.error, related);
            }
          }
        } else {
          for (const mut of chunk) {
            const mutItem = mut.payload as unknown as ShoppingItem;
            const related = allMutsByNorm.get(mutItem.normalizedName || mutItem.id) ?? [];
            await handleMutationError(mut, error, related);
          }
        }
      }
    }

    // Phase 3: delete_list & leave_list
    for (const mut of pending) {
      if (mut.action !== 'delete_list' && mut.action !== 'leave_list') continue;
      if (failedListIds.has(mut.listId)) continue;

      let error: PostgrestError | null = null;
      if (mut.action === 'delete_list') {
        const res = await supabase.from('lists').delete().eq('id', mut.entityId);
        error = res.error;
      } else {
        const res = await supabase
          .from('list_members')
          .delete()
          .eq('list_id', mut.listId)
          .eq('user_id', user.id);
        error = res.error;
      }

      if (!error) {
        await deleteCompletedMutations([mut]);
      } else {
        await handleMutationError(mut, error);
      }
    }

    return allSucceeded;
  } catch (err) {
    syncLogger.error('Exceção inesperada em flushPendingSync', serializeError(err));
    return false;
  } finally {
    flushing = false;
    if (pendingFlushRequested && navigator.onLine) {
      pendingFlushRequested = false;
      void flushPendingSync();
    }
  }
}

/**
 * Ingressa em uma lista compartilhada usando o código curto (`PEGA-XXXXXX`) via RPC segura do Supabase
 * e importa seus itens para o IndexedDB local.
 *
 * @param rawCode - Código de convite digitado ou recebido via parâmetro `?join=` na URL.
 * @returns Objeto contendo a lista encontrada (`list`) ou mensagem de erro (`error`).
 */
export async function joinSharedListByCode(rawCode: string): Promise<{
  list: ShoppingList | null;
  error: string | null;
}> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { list: null, error: 'Informe um código de lista.' };

  // Check locally first when Supabase is not configured
  const localMatch = await db.lists.where('shareCode').equals(code).first();
  if (localMatch && !isSupabaseConfigured) {
    return { list: localMatch, error: null };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      list: null,
      error: 'Sincronização na nuvem (Supabase) não configurada. Adicione as chaves no .env para entrar em listas remotas.',
    };
  }

  try {
    const user = await ensureSupabaseSession();
    if (!user) {
      return { list: null, error: 'Não foi possível autenticar sua sessão. Tente novamente.' };
    }

    // Prefer secure RPC (registers membership + fetches list without exposing table listing)
    let listRow: RemoteListRow | null = null;
    const { data: rpcRows, error: rpcError } = await supabase
      .rpc('join_list_by_share_code', { p_share_code: code })
      .returns<RemoteListRow[]>();

    if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
      listRow = rpcRows[0];
    } else if (rpcError) {
      if (rpcError.code === 'P0001') {
        return { list: null, error: rpcError.message };
      }
      if (rpcError.code === '42501') {
        return { list: null, error: 'Não foi possível autenticar sua sessão. Tente novamente.' };
      }
      syncLogger.warn('RPC join_list_by_share_code falhou; tentando consulta direta', {
        code,
        error: serializeError(rpcError),
      });
      // Fallback for legacy databases where the RPC was not yet deployed
      const { data: directRow } = await supabase
        .from('lists')
        .select('*')
        .eq('share_code', code)
        .maybeSingle<RemoteListRow>();
      listRow = directRow ?? null;
    }

    if (!listRow) {
      return { list: null, error: 'Lista não encontrada. Verifique o código e tente novamente.' };
    }

    const list = fromRemoteList(listRow, true);
    await db.lists.put(list);

    const { data: itemRows, error: itemsError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .returns<RemoteItemRow[]>();

    if (itemsError) {
      syncLogger.warn('Falha ao importar itens ao ingressar na lista compartilhada', {
        listId: list.id,
        error: serializeError(itemsError),
      });
    } else if (itemRows) {
      const remoteItems = itemRows.map(fromRemoteItem);
      const remoteIds = new Set(remoteItems.map((i) => i.id));
      await db.transaction('rw', db.items, async () => {
        const existingLocal = await db.items.where('listId').equals(list.id).toArray();
        const staleIds = existingLocal.filter((i) => !remoteIds.has(i.id)).map((i) => i.id);
        if (staleIds.length > 0) {
          await db.items.bulkDelete(staleIds);
        }
        if (remoteItems.length > 0) {
          await db.items.bulkPut(remoteItems);
        }
      });
    }

    return { list, error: null };
  } catch (err) {
    syncLogger.error('Exceção ao ingressar em lista compartilhada', {
      code,
      error: serializeError(err),
    });
    return { list: null, error: 'Erro de conexão ao buscar lista compartilhada.' };
  }
}

/**
 * Baixa o estado mais recente dos itens de uma lista no Supabase, aplicando atualizações mais novas
 * e reconciliando exclusões remotas sem sobrescrever mutações locais ainda pendentes.
 *
 * @param listId - UUID da lista a ser reconciliada.
 */
export async function pullListFromCloud(listId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;

  try {
    const user = await ensureSupabaseSession();
    if (!user) return;

    const localList = await db.lists.get(listId);
    if (!localList?.isSynced) return;

    const { data: remoteListRow, error: remoteListError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .maybeSingle<RemoteListRow>();

    if (!remoteListError) {
      const pendingListUpsert = await db.pendingSync
        .where('listId')
        .equals(listId)
        .filter((m) => m.action === 'upsert_list')
        .count();

      if (!remoteListRow) {
        if (pendingListUpsert === 0) {
          await db.transaction('rw', db.lists, db.items, db.pendingSync, async () => {
            await db.items.where('listId').equals(listId).delete();
            await db.lists.delete(listId);
            await db.pendingSync.where('listId').equals(listId).delete();
          });
          return;
        }
      } else if (
        pendingListUpsert === 0 &&
        new Date(remoteListRow.updated_at) >= new Date(localList.updatedAt)
      ) {
        await db.lists.update(listId, {
          name: remoteListRow.name,
          type: remoteListRow.type,
          shareCode: remoteListRow.share_code,
          updatedAt: remoteListRow.updated_at,
        });
      }
    }

    if (localList.ownerId && localList.ownerId !== user.id && !localList.isShared) {
      await db.lists.update(listId, { isShared: true });
    }

    const { data: itemRows, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .returns<RemoteItemRow[]>();

    if (error || !itemRows) {
      if (error) {
        syncLogger.warn('Falha ao buscar itens da nuvem em pullListFromCloud', {
          listId,
          error: serializeError(error),
        });
      }
      return;
    }

    const remoteMap = new Map(itemRows.map((r) => [r.id, fromRemoteItem(r)]));
    await db.transaction('rw', db.items, db.pendingSync, async () => {
      const [localItems, pendingForList] = await Promise.all([
        db.items.where('listId').equals(listId).toArray(),
        db.pendingSync.where('listId').equals(listId).toArray(),
      ]);

      const pendingEntityIds = new Set(pendingForList.map((m) => m.entityId));
      const localMap = new Map(localItems.map((i) => [i.id, i]));
      const localByNormalized = new Map(localItems.map((i) => [i.normalizedName, i]));

      const itemsToPut: ShoppingItem[] = [];
      const idsToDelete: string[] = [];

      // 1. Upsert remote items that are newer or missing locally (without clobbering pending local edits)
      // Also deduplicate offline-created items sharing the same normalizedName with a different local ID
      for (const remoteItem of remoteMap.values()) {
        if (pendingEntityIds.has(remoteItem.id)) continue;
        const localSameId = localMap.get(remoteItem.id);
        const localSameName = localByNormalized.get(remoteItem.normalizedName);
        if (localSameName && localSameName.id !== remoteItem.id && !pendingEntityIds.has(localSameName.id)) {
          idsToDelete.push(localSameName.id);
        }
        if (!localSameId || new Date(remoteItem.updatedAt) >= new Date(localSameId.updatedAt)) {
          itemsToPut.push(remoteItem);
        }
      }

      // 2. Reconcile remote deletions: remove local items absent from cloud if they have no pending mutation
      for (const local of localItems) {
        if (!remoteMap.has(local.id) && !pendingEntityIds.has(local.id)) {
          idsToDelete.push(local.id);
        }
      }

      if (idsToDelete.length > 0) {
        await db.items.bulkDelete(idsToDelete);
      }
      if (itemsToPut.length > 0) {
        await db.items.bulkPut(itemsToPut);
      }
    });
  } catch (err) {
    syncLogger.debug('Falha em pullListFromCloud (possível perda momentânea de rede)', {
      listId,
      error: serializeError(err),
    });
  }
}

/**
 * Garante que uma lista local e todos os seus itens atuais estejam enviados ao Supabase
 * (útil ao abrir o modal de compartilhamento ou recuperar listas criadas antes da nuvem),
 * drenando exclusões pendentes (`delete_item`) antes do upsert.
 *
 * @param listId - UUID da lista a ser sincronizada imediatamente.
 * @returns `true` se a lista e todos os seus itens foram enviados sem erro.
 */
export async function syncListNow(listId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) return false;
  if (flushing) {
    pendingFlushRequested = true;
    return false;
  }

  const client = supabase;
  return withCrossTabSyncLock(async () => {
    if (flushing) {
      pendingFlushRequested = true;
      return false;
    }
    try {
      const user = await ensureSupabaseSession();
      if (!user) return false;

      const localList = await db.lists.get(listId);
      if (!localList) return false;

      // For guests on an already-synced shared list, flush pending queue and pull latest cloud state
      if (localList.isSynced && localList.ownerId && localList.ownerId !== user.id) {
        if (!localList.isShared) {
          await db.lists.update(listId, { isShared: true });
        }
        await runFlushPendingSync();
        await pullListFromCloud(listId);
        return true;
      }

      const syncStartedAt = new Date().toISOString();
      const canUpsertList = !localList.isSynced || !localList.ownerId || localList.ownerId === user.id;
      if (canUpsertList) {
        const listErr = await upsertListWithCodeRetry(localList, user.id);
        if (listErr) {
          syncLogger.warn('Falha em syncListNow ao enviar lista', {
            listId,
            error: serializeError(listErr),
          });
          return false;
        }
      }

      // Flush pending item deletions for this list before upserting to prevent stale/duplicate items
      const pendingDeletes = await db.pendingSync
        .where('listId')
        .equals(listId)
        .filter((m) => m.action === 'delete_item')
        .toArray();
      for (let i = 0; i < pendingDeletes.length; i += SYNC_BATCH_SIZE) {
        const chunk = pendingDeletes.slice(i, i + SYNC_BATCH_SIZE);
        const ids = chunk.map((m) => m.entityId);
        const { error: deleteErr } = await client.from('list_items').delete().in('id', ids);
        if (deleteErr) {
          syncLogger.warn('Falha em syncListNow ao excluir itens pendentes', {
            listId,
            count: ids.length,
            error: serializeError(deleteErr),
          });
          return false;
        }
        const completedDeleteIds = chunk.map((m) => m.id).filter((id): id is number => id !== undefined);
        if (completedDeleteIds.length > 0) {
          await db.pendingSync.bulkDelete(completedDeleteIds);
        }
      }

      const localItems = await db.items.where('listId').equals(listId).toArray();
      const itemsErr = await upsertItemsInChunks(localItems);
      if (itemsErr) {
        syncLogger.warn('Falha em syncListNow ao enviar itens', {
          listId,
          count: localItems.length,
          error: serializeError(itemsErr),
        });
        return false;
      }

      const syncedItemIds = new Set(localItems.map((i) => i.id));
      await db.lists.update(listId, {
        isSynced: true,
        ownerId: localList.ownerId ?? user.id,
        ...(localList.ownerId && localList.ownerId !== user.id ? { isShared: true } : {}),
      });
      await db.pendingSync
        .where('listId')
        .equals(listId)
        .filter(
          (m) =>
            m.createdAt <= syncStartedAt &&
            (m.action === 'upsert_list' ||
              (m.action === 'upsert_item' && syncedItemIds.has(m.entityId)))
        )
        .delete();
      return true;
    } catch (err) {
      syncLogger.error('Exceção inesperada em syncListNow', {
        listId,
        error: serializeError(err),
      });
      return false;
    }
  });
}

/**
 * Inscreve o aplicativo no canal Supabase Realtime da lista ativa para receber alterações de outros dispositivos em tempo real.
 *
 * @param listId - UUID da lista monitorada.
 * @returns Função de limpeza que remove a inscrição do canal Realtime.
 */
export function subscribeToListRealtime(listId: string): () => void {
  if (activeChannel && supabase) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  if (!isSupabaseConfigured || !supabase) {
    return () => { };
  }

  let cancelled = false;
  let realtimeConnected = false;
  let pullDebounceTimer: number | null = null;

  const schedulePull = () => {
    if (cancelled) return;
    if (pullDebounceTimer !== null) {
      window.clearTimeout(pullDebounceTimer);
    }
    pullDebounceTimer = window.setTimeout(() => {
      pullDebounceTimer = null;
      if (!cancelled) {
        void pullListFromCloud(listId);
      }
    }, 350);
  };

  const reconcileNow = async () => {
    if (cancelled || !supabase || !navigator.onLine) return;
    try {
      const user = await ensureSupabaseSession();
      if (!user || cancelled || !supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      await flushPendingSync();
      await pullListFromCloud(listId);
    } catch (err) {
      syncLogger.warn('Falha na reconciliação da lista', {
        listId,
        error: serializeError(err),
      });
    }
  };

  const handleVisibilityOrOnline = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void reconcileNow();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrOnline);
  window.addEventListener('online', handleVisibilityOrOnline);

  const {
    data: { subscription: authSubscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (
      !cancelled &&
      supabase &&
      session?.access_token &&
      (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')
    ) {
      void supabase.realtime.setAuth(session.access_token);
    }
  });

  // Fallback polling only when Realtime WebSocket is not actively subscribed (e.g. Firefox/mobile drops)
  const fallbackTimer = window.setInterval(() => {
    if (!cancelled && !realtimeConnected && document.visibilityState === 'visible' && navigator.onLine) {
      void reconcileNow();
    }
  }, 5000);

  void (async () => {
    try {
      const user = await ensureSupabaseSession();
      if (!user || cancelled || !supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (cancelled) return;

      // Push pending mutations and pull latest state before opening the live channel
      await flushPendingSync();
      await pullListFromCloud(listId);

      if (cancelled || !supabase) return;

      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }

      activeChannel = supabase
        .channel(`list-sync-${listId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'list_items',
            filter: `list_id=eq.${listId}`,
          },
          async (payload) => {
            try {
              if (payload.eventType === 'DELETE') {
                const oldRow = payload.old as { id?: string };
                if (oldRow?.id) {
                  const hasPending = await db.pendingSync
                    .where('listId')
                    .equals(listId)
                    .filter((m) => m.entityId === oldRow.id)
                    .count();
                  if (hasPending === 0) {
                    await db.items.delete(oldRow.id);
                  }
                }
              } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as RemoteItemRow;
                if (!row?.id) return;

                const remoteItem = fromRemoteItem(row);
                await db.transaction('rw', db.items, db.pendingSync, async () => {
                  const pendingForList = await db.pendingSync
                    .where('listId')
                    .equals(listId)
                    .toArray();
                  const pendingEntityIds = new Set(pendingForList.map((m) => m.entityId));

                  // Guard against overwriting an unsynced local mutation
                  if (pendingEntityIds.has(row.id)) return;

                  // Deduplicate offline-created items sharing the same normalizedName with a different local ID
                  const localSameName = await db.items
                    .where('[listId+normalizedName]')
                    .equals([listId, remoteItem.normalizedName])
                    .first();
                  if (localSameName && localSameName.id !== remoteItem.id) {
                    if (pendingEntityIds.has(localSameName.id)) return;
                    await db.items.delete(localSameName.id);
                  }

                  const local = await db.items.get(row.id);
                  if (!local || new Date(remoteItem.updatedAt) >= new Date(local.updatedAt)) {
                    await db.items.put(remoteItem);
                  }
                });
              }
            } catch (err) {
              syncLogger.error('Erro ao aplicar evento Realtime no IndexedDB', {
                listId,
                eventType: payload.eventType,
                error: serializeError(err),
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lists',
            filter: `id=eq.${listId}`,
          },
          async (payload) => {
            try {
              if (payload.eventType === 'DELETE') {
                await db.transaction('rw', db.lists, db.items, db.pendingSync, async () => {
                  await db.items.where('listId').equals(listId).delete();
                  await db.lists.delete(listId);
                  await db.pendingSync.where('listId').equals(listId).delete();
                });
              } else if (payload.eventType === 'UPDATE') {
                const row = payload.new as RemoteListRow;
                if (!row?.id) return;
                const hasPending = await db.pendingSync
                  .where('listId')
                  .equals(listId)
                  .filter((m) => m.action === 'upsert_list')
                  .count();
                if (hasPending > 0) return;

                const local = await db.lists.get(row.id);
                if (!local || new Date(row.updated_at) >= new Date(local.updatedAt)) {
                  await db.lists.update(row.id, {
                    name: row.name,
                    type: row.type,
                    shareCode: row.share_code,
                    updatedAt: row.updated_at,
                  });
                }
              }
            } catch (err) {
              syncLogger.error('Erro ao aplicar evento Realtime da lista no IndexedDB', {
                listId,
                eventType: payload.eventType,
                error: serializeError(err),
              });
            }
          }
        )
        .subscribe((status) => {
          realtimeConnected = status === 'SUBSCRIBED';
          if (status === 'SUBSCRIBED') {
            syncLogger.debug('Canal Realtime inscrito', { listId });
            schedulePull();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            syncLogger.warn('Status anormal do canal Realtime (fallback ativo)', {
              listId,
              status,
            });
          }
        });
    } catch (err) {
      syncLogger.error('Falha ao inicializar assinatura Realtime', {
        listId,
        error: serializeError(err),
      });
    }
  })();

  return () => {
    cancelled = true;
    if (pullDebounceTimer !== null) {
      window.clearTimeout(pullDebounceTimer);
      pullDebounceTimer = null;
    }
    window.clearInterval(fallbackTimer);
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    window.removeEventListener('online', handleVisibilityOrOnline);
    authSubscription.unsubscribe();
    if (activeChannel && supabase) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
