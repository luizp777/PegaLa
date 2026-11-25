import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaultLists, getLastActiveListId, setLastActiveListId } from '../db/localDb';
import { CATEGORIES } from '../lib/categories';
import type { CategoryId, ShoppingItem } from '../types';

const ptBrCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const loadSyncEngine = () => import('../db/syncEngine');

/**
 * Hook principal de estado reativo da lista ativa, itens agrupados por corredor,
 * status de conectividade e sincronização em tempo real com o Supabase.
 *
 * @remarks
 * Também recria automaticamente as listas padrão caso todas as listas locais sejam removidas remotamente.
 *
 * @returns Listas disponíveis, lista ativa, itens agrupados, itens no carrinho, sugestões frequentes e controles de seleção.
 */
export function useActiveList() {
  const [activeListId, setActiveListIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('join') || params.get('list')) return null;
    return getLastActiveListId();
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isJoiningSharedList, setIsJoiningSharedList] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(new URLSearchParams(window.location.search).get('join'));
  });
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [joinToast, setJoinToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');

      if (joinCode) {
        if (mounted) setIsJoiningSharedList(true);
        const { joinSharedListByCode } = await loadSyncEngine();
        const res = await joinSharedListByCode(joinCode);
        if (!mounted) return;

        if (res.list) {
          window.history.replaceState({}, '', window.location.pathname);
          await ensureDefaultLists();
          if (!mounted) return;
          setLastActiveListId(res.list.id);
          setActiveListIdState(res.list.id);
          setIsJoiningSharedList(false);
          setHasInitialized(true);
          setJoinToast(`Lista "${res.list.name}" conectada!`);
          return;
        }

        // Preserve ?join= on transient connection errors so a reload online can retry
        if (res.error && !res.error.includes('conexão')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        setIsJoiningSharedList(false);
        if (res.error) {
          setJoinToast(res.error);
        }
      }

      const defaultId = await ensureDefaultLists();
      const listShortcut = params.get('list');
      if (
        mounted &&
        (listShortcut === 'mercado' || listShortcut === 'farmacia' || listShortcut === 'geral')
      ) {
        window.history.replaceState({}, '', window.location.pathname);
        const match = await db.lists
          .orderBy('createdAt')
          .filter((l) => l.type === listShortcut)
          .first();
        if (mounted && match) {
          setLastActiveListId(match.id);
          setActiveListIdState(match.id);
          setHasInitialized(true);
          return;
        }
      }

      if (mounted) {
        setActiveListIdState(defaultId);
        setHasInitialized(true);
      }
    }
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadSyncEngine().then(({ flushPendingSync }) => flushPendingSync());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const listsQuery = useLiveQuery(() => db.lists.orderBy('createdAt').toArray(), []);
  const lists = useMemo(() => listsQuery ?? [], [listsQuery]);

  // Recover automatically if the last remaining list is deleted remotely via Realtime/pull
  useEffect(() => {
    if (!hasInitialized || isJoiningSharedList || listsQuery === undefined || listsQuery.length > 0) {
      return;
    }
    let cancelled = false;
    void ensureDefaultLists().then((defaultId) => {
      if (!cancelled) {
        setActiveListIdState(defaultId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasInitialized, isJoiningSharedList, listsQuery]);

  const activeList = useMemo(() => {
    if (isJoiningSharedList) return null;
    return lists.find((l) => l.id === activeListId) ?? lists[0] ?? null;
  }, [lists, activeListId, isJoiningSharedList]);

  useEffect(() => {
    if (!activeList?.id) return;
    if (activeListId && activeList.id !== activeListId) {
      setLastActiveListId(activeList.id);
    }
  }, [activeList?.id, activeListId]);

  useEffect(() => {
    if (!activeList?.id) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const listId = activeList.id;

    void loadSyncEngine().then(({ subscribeToListRealtime }) => {
      if (cancelled) return;
      unsubscribe = subscribeToListRealtime(listId);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [activeList?.id]);

  const itemsQuery = useLiveQuery(
    () => (activeList ? db.items.where('listId').equals(activeList.id).toArray() : []),
    [activeList?.id]
  );
  const items = useMemo(() => itemsQuery ?? [], [itemsQuery]);
  const isLoadingList =
    isJoiningSharedList ||
    listsQuery === undefined ||
    (activeList !== null && itemsQuery === undefined);

  const pendingSyncCount = useLiveQuery(() => db.pendingSync.count(), []) ?? 0;

  useEffect(() => {
    if (pendingSyncCount > 0 && isOnline) {
      const t = setTimeout(() => {
        void loadSyncEngine().then(({ flushPendingSync }) => flushPendingSync());
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pendingSyncCount, isOnline]);

  const frequentSuggestionsQuery = useLiveQuery(async () => {
    const top = await db.dictionary.orderBy('usageCount').reverse().limit(18).toArray();
    return top;
  }, []);
  const frequentSuggestions = useMemo(
    () => frequentSuggestionsQuery ?? [],
    [frequentSuggestionsQuery]
  );

  const { groupedPending, checkedItems } = useMemo(() => {
    const pending: ShoppingItem[] = [];
    const checked: ShoppingItem[] = [];

    for (const item of items) {
      if (item.isChecked) checked.push(item);
      else pending.push(item);
    }

    checked.sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''));

    const byCat = new Map<CategoryId, ShoppingItem[]>();
    for (const item of pending) {
      const arr = byCat.get(item.categoryId) ?? [];
      arr.push(item);
      byCat.set(item.categoryId, arr);
    }

    const groups = CATEGORIES.filter((c) => byCat.has(c.id)).map((category) => ({
      category,
      items: (byCat.get(category.id) ?? []).sort((a, b) => ptBrCollator.compare(a.name, b.name)),
    }));

    return { groupedPending: groups, checkedItems: checked };
  }, [items]);

  const selectList = useCallback((listId: string) => {
    setLastActiveListId(listId);
    setActiveListIdState(listId);
  }, []);

  const clearJoinToast = useCallback(() => setJoinToast(null), []);

  return {
    lists,
    activeList,
    isJoiningSharedList,
    isLoadingList,
    items,
    groupedPending,
    checkedItems,
    frequentSuggestions,
    isOnline,
    pendingSyncCount,
    selectList,
    joinToast,
    clearJoinToast,
  };
}
