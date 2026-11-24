import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { db } from './localDb';
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
 * @returns Lista local marcada como sincronizada.
 */
function fromRemoteList(row: RemoteListRow): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    shareCode: row.share_code,
    ownerId: row.owner_id,
    isSynced: true,
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
  if (action === 'delete_list') return 2;
  return 1;
}

let activeChannel: RealtimeChannel | null = null;
let flushing = false;
let pendingFlushRequested = false;

/**
 * Descarrega a fila local `pendingSync` para o Supabase em ordem segura e resiliente a falhas por lista.
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

  flushing = true;
  pendingFlushRequested = false;
  let allSucceeded = true;
  try {
    const user = await ensureSupabaseSession();
    if (!user) return false;

    // Seed any local-only lists (created before Supabase was configured) into the cloud first
    const unsyncedLists = await db.lists.filter((l) => !l.isSynced).toArray();
    for (const localList of unsyncedLists) {
      const { error: listErr } = await supabase
        .from('lists')
        .upsert(toRemoteList(localList, user.id), { onConflict: 'id' });
      if (!listErr) {
        const localItems = await db.items.where('listId').equals(localList.id).toArray();
        let itemsErr: PostgrestError | null = null;
        if (localItems.length > 0) {
          const res = await supabase
            .from('list_items')
            .upsert(localItems.map(toRemoteItem), { onConflict: 'id' });
          itemsErr = res.error;
        }
        if (!itemsErr) {
          await db.lists.update(localList.id, {
            isSynced: true,
            ownerId: localList.ownerId ?? user.id,
          });
        } else {
          syncLogger.warn('Falha ao enviar itens iniciais da lista local', {
            listId: localList.id,
            error: serializeError(itemsErr),
          });
          allSucceeded = false;
        }
      } else {
        syncLogger.warn('Falha ao enviar lista local inicial', {
          listId: localList.id,
          error: serializeError(listErr),
        });
        allSucceeded = false;
      }
    }

    const pending = await db.pendingSync.orderBy('id').toArray();
    if (pending.length === 0) return allSucceeded;

    // Ensure list creation runs before item mutations for the same list
    pending.sort((a, b) => {
      const pDiff = mutationPriority(a.action) - mutationPriority(b.action);
      if (pDiff !== 0) return pDiff;
      return (a.id ?? 0) - (b.id ?? 0);
    });

    const failedListIds = new Set<string>();

    for (const mut of pending) {
      // Skip dependent item mutations if their parent list sync failed in this pass
      if (mut.action !== 'upsert_list' && failedListIds.has(mut.listId)) {
        continue;
      }

      let error: PostgrestError | null = null;

      if (mut.action === 'upsert_list') {
        const list = mut.payload as unknown as ShoppingList;
        const res = await supabase
          .from('lists')
          .upsert(toRemoteList(list, user?.id ?? null), { onConflict: 'id' });
        error = res.error;
        if (!error) {
          await db.lists.update(list.id, { isSynced: true });
        }
      } else if (mut.action === 'delete_list') {
        const res = await supabase.from('lists').delete().eq('id', mut.entityId);
        error = res.error;
      } else if (mut.action === 'upsert_item') {
        const item = mut.payload as unknown as ShoppingItem;
        const res = await supabase
          .from('list_items')
          .upsert(toRemoteItem(item), { onConflict: 'id' });
        error = res.error;
      } else if (mut.action === 'delete_item') {
        const res = await supabase.from('list_items').delete().eq('id', mut.entityId);
        error = res.error;
      } else if (mut.action === 'clear_checked') {
        const itemIds = (mut.payload.itemIds as string[]) ?? [];
        if (itemIds.length > 0) {
          const res = await supabase.from('list_items').delete().in('id', itemIds);
          error = res.error;
        }
      }

      if (!error) {
        if (mut.id !== undefined) {
          await db.pendingSync.delete(mut.id);
        }
      } else if (isPermanentError(error)) {
        // Discard permanently invalid mutation to prevent head-of-line blocking
        syncLogger.warn('Mutação permanente descartada da fila offline', {
          action: mut.action,
          entityId: mut.entityId,
          listId: mut.listId,
          error: serializeError(error),
        });
        if (mut.id !== undefined) {
          await db.pendingSync.delete(mut.id);
        }
        allSucceeded = false;
      } else {
        // Transient or auth-expired error (including 42501): keep queued and refresh session if needed
        if (error.code === '42501') {
          void supabase.auth.refreshSession().catch(() => {});
        }
        syncLogger.warn('Erro transitório ao sincronizar mutação (mantida na fila)', {
          action: mut.action,
          entityId: mut.entityId,
          listId: mut.listId,
          error: serializeError(error),
        });
        failedListIds.add(mut.listId);
        allSucceeded = false;
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
    await ensureSupabaseSession();

    // Prefer secure RPC (registers membership + fetches list without exposing table listing)
    let listRow: RemoteListRow | null = null;
    const { data: rpcRows, error: rpcError } = await supabase
      .rpc('join_list_by_share_code', { p_share_code: code })
      .returns<RemoteListRow[]>();

    if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
      listRow = rpcRows[0];
    } else if (rpcError) {
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

    const list = fromRemoteList(listRow);
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
    } else if (itemRows && itemRows.length > 0) {
      await db.items.bulkPut(itemRows.map(fromRemoteItem));
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
    const [localItems, pendingForList] = await Promise.all([
      db.items.where('listId').equals(listId).toArray(),
      db.pendingSync.where('listId').equals(listId).toArray(),
    ]);

    const pendingEntityIds = new Set(pendingForList.map((m) => m.entityId));
    const localMap = new Map(localItems.map((i) => [i.id, i]));

    // 1. Upsert remote items that are newer or missing locally (without clobbering pending local edits)
    for (const remoteItem of remoteMap.values()) {
      if (pendingEntityIds.has(remoteItem.id)) continue;
      const local = localMap.get(remoteItem.id);
      if (!local || new Date(remoteItem.updatedAt) >= new Date(local.updatedAt)) {
        await db.items.put(remoteItem);
      }
    }

    // 2. Reconcile remote deletions: remove local items absent from cloud if they have no pending mutation
    const idsToDelete: string[] = [];
    for (const local of localItems) {
      if (!remoteMap.has(local.id) && !pendingEntityIds.has(local.id)) {
        idsToDelete.push(local.id);
      }
    }
    if (idsToDelete.length > 0) {
      await db.items.bulkDelete(idsToDelete);
    }
  } catch (err) {
    syncLogger.debug('Falha em pullListFromCloud (possível perda momentânea de rede)', {
      listId,
      error: serializeError(err),
    });
  }
}

/**
 * Garante que uma lista local e todos os seus itens atuais estejam enviados ao Supabase
 * (útil ao abrir o modal de compartilhamento ou recuperar listas criadas antes da nuvem).
 *
 * @param listId - UUID da lista a ser sincronizada imediatamente.
 * @returns `true` se a lista e todos os seus itens foram enviados sem erro.
 */
export async function syncListNow(listId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) return false;

  try {
    const user = await ensureSupabaseSession();
    if (!user) return false;

    const localList = await db.lists.get(listId);
    if (!localList) return false;

    const canUpsertList = !localList.isSynced || !localList.ownerId || localList.ownerId === user.id;
    if (canUpsertList) {
      const { error: listErr } = await supabase
        .from('lists')
        .upsert(toRemoteList(localList, user.id), { onConflict: 'id' });
      if (listErr) {
        syncLogger.warn('Falha em syncListNow ao enviar lista', {
          listId,
          error: serializeError(listErr),
        });
        return false;
      }
    }

    const localItems = await db.items.where('listId').equals(listId).toArray();
    if (localItems.length > 0) {
      const { error: itemsErr } = await supabase
        .from('list_items')
        .upsert(localItems.map(toRemoteItem), { onConflict: 'id' });
      if (itemsErr) {
        syncLogger.warn('Falha em syncListNow ao enviar itens', {
          listId,
          count: localItems.length,
          error: serializeError(itemsErr),
        });
        return false;
      }
    }

    await db.lists.update(listId, {
      isSynced: true,
      ownerId: localList.ownerId ?? user.id,
    });
    return true;
  } catch (err) {
    syncLogger.error('Exceção inesperada em syncListNow', {
      listId,
      error: serializeError(err),
    });
    return false;
  }
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
    return () => {};
  }

  let cancelled = false;
  let realtimeConnected = false;

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
                  await db.items.delete(oldRow.id);
                }
              } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as RemoteItemRow;
                if (!row?.id) return;

                // Guard against overwriting an unsynced local mutation or newer local edit
                const hasPending = await db.pendingSync
                  .where('listId')
                  .equals(listId)
                  .filter((m) => m.entityId === row.id)
                  .count();
                if (hasPending > 0) return;

                const remoteItem = fromRemoteItem(row);
                const local = await db.items.get(row.id);
                if (!local || new Date(remoteItem.updatedAt) >= new Date(local.updatedAt)) {
                  await db.items.put(remoteItem);
                }
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
        .subscribe((status) => {
          realtimeConnected = status === 'SUBSCRIBED';
          if (status === 'SUBSCRIBED') {
            syncLogger.debug('Canal Realtime inscrito', { listId });
            void pullListFromCloud(listId);
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
    window.clearInterval(fallbackTimer);
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    window.removeEventListener('online', handleVisibilityOrOnline);
    if (activeChannel && supabase) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
