import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaultLists, setLastActiveListId } from '../db/localDb';
import { flushPendingSync, joinSharedListByCode, subscribeToListRealtime } from '../db/syncEngine';
import { CATEGORIES } from '../lib/dictionaryPtBr';
import type { CategoryId, ShoppingItem } from '../types';

/**
 * Hook principal de estado reativo da lista ativa, itens agrupados por corredor,
 * status de conectividade e sincronização em tempo real com o Supabase.
 *
 * @returns Listas disponíveis, lista ativa, itens agrupados, itens no carrinho, sugestões frequentes e controles de seleção.
 */
export function useActiveList() {
  const [activeListId, setActiveListIdState] = useState<string | null>(null);
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
        const res = await joinSharedListByCode(joinCode);
        if (!mounted) return;

        window.history.replaceState({}, '', window.location.pathname);

        if (res.list) {
          await ensureDefaultLists();
          if (!mounted) return;
          setLastActiveListId(res.list.id);
          setActiveListIdState(res.list.id);
          setIsJoiningSharedList(false);
          setJoinToast(`Lista "${res.list.name}" conectada!`);
          return;
        }

        setIsJoiningSharedList(false);
        if (res.error) {
          setJoinToast(res.error);
        }
      }

      const defaultId = await ensureDefaultLists();
      if (mounted) {
        setActiveListIdState(defaultId);
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
      void flushPendingSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!activeListId) return;
    const unsubscribe = subscribeToListRealtime(activeListId);
    return unsubscribe;
  }, [activeListId]);

  const listsQuery = useLiveQuery(() => db.lists.orderBy('createdAt').toArray(), []);
  const lists = useMemo(() => listsQuery ?? [], [listsQuery]);

  const activeList = useMemo(() => {
    if (isJoiningSharedList) return null;
    return lists.find((l) => l.id === activeListId) ?? lists[0] ?? null;
  }, [lists, activeListId, isJoiningSharedList]);

  const itemsQuery = useLiveQuery(
    () => (activeList ? db.items.where('listId').equals(activeList.id).toArray() : []),
    [activeList?.id]
  );
  const items = useMemo(() => itemsQuery ?? [], [itemsQuery]);

  const pendingSyncCount = useLiveQuery(() => db.pendingSync.count(), []) ?? 0;

  useEffect(() => {
    if (pendingSyncCount > 0 && isOnline) {
      const t = setTimeout(() => {
        void flushPendingSync();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pendingSyncCount, isOnline]);

  const frequentSuggestions =
    useLiveQuery(async () => {
      const top = await db.dictionary.orderBy('usageCount').reverse().limit(18).toArray();
      return top;
    }, []) ?? [];

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
      items: (byCat.get(category.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }));

    return { groupedPending: groups, checkedItems: checked };
  }, [items]);

  const selectList = (listId: string) => {
    setLastActiveListId(listId);
    setActiveListIdState(listId);
  };

  return {
    lists,
    activeList,
    isJoiningSharedList,
    items,
    groupedPending,
    checkedItems,
    frequentSuggestions,
    isOnline,
    pendingSyncCount,
    selectList,
    joinToast,
    clearJoinToast: () => setJoinToast(null),
  };
}
