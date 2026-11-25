import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { NearbyStore, PinnedStoreSelection, PreferredProduct } from '../../shared/priceTypes';
import { getPreferredProductsMap, getPriceComparisonCache } from '../db/localDb';
import { computePriceComparison } from '../lib/priceEngine';
import type { ShoppingItem } from '../types';

const PINNED_STORE_PREFIX = 'pegala_pinned_store_';

/**
 * Remove a preferência de loja fixada no `localStorage` quando a lista é excluída ou abandonada.
 */
export function clearPinnedStoreStorage(listId: string | undefined): void {
  if (!listId) return;
  try {
    localStorage.removeItem(`${PINNED_STORE_PREFIX}${listId}`);
  } catch {
    // Ignora erro de armazenamento
  }
}

function loadPinnedStore(listId: string | undefined): PinnedStoreSelection | null {
  if (!listId) return null;
  try {
    const raw = localStorage.getItem(`${PINNED_STORE_PREFIX}${listId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PinnedStoreSelection>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number'
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      chainSlug: parsed.chainSlug ?? null,
      lat: parsed.lat,
      lng: parsed.lng,
      distanceKm: typeof parsed.distanceKm === 'number' ? parsed.distanceKm : 0,
      neighborhood: parsed.neighborhood ?? null,
      city: parsed.city ?? null,
      fallbackTotalCents: typeof parsed.fallbackTotalCents === 'number' ? parsed.fallbackTotalCents : 0,
      fallbackMatchedCount:
        typeof parsed.fallbackMatchedCount === 'number' ? parsed.fallbackMatchedCount : 0,
      fallbackTotalItems: typeof parsed.fallbackTotalItems === 'number' ? parsed.fallbackTotalItems : 0,
      pinnedAt: typeof parsed.pinnedAt === 'string' ? parsed.pinnedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistPinnedStore(listId: string | undefined, store: PinnedStoreSelection | null): void {
  if (!listId) return;
  try {
    if (!store) {
      localStorage.removeItem(`${PINNED_STORE_PREFIX}${listId}`);
    } else {
      localStorage.setItem(`${PINNED_STORE_PREFIX}${listId}`, JSON.stringify(store));
    }
  } catch {
    // Ignora erro de armazenamento
  }
}

/**
 * Resumo dinâmico do estabelecimento fixado na lista ativa.
 */
export interface PinnedStoreSummary {
  estimatedTotalCents: number;
  inCartTotalCents: number;
  matchedCount: number;
  totalItems: number;
  hasEstimatedMissing: boolean;
}

/**
 * Gerencia o estabelecimento fixado por lista no `localStorage` e recalcula em tempo real
 * o total estimado e o subtotal "No carrinho" a partir do cache local de cotações.
 *
 * @param params - Lista ativa e seus itens pendentes e marcados.
 * @returns Loja fixada, resumo dinâmico e ações para fixar/desafixar.
 */
export function usePinnedStore(params: {
  listId: string | undefined;
  pendingItems: ShoppingItem[];
  checkedItems: ShoppingItem[];
}): {
  pinnedStore: PinnedStoreSelection | null;
  summary: PinnedStoreSummary | null;
  pinStore: (store: PinnedStoreSelection) => void;
  unpinStore: () => void;
} {
  const { listId, pendingItems, checkedItems } = params;
  const [state, setState] = useState<{
    listId: string | undefined;
    store: PinnedStoreSelection | null;
  }>(() => ({
    listId,
    store: loadPinnedStore(listId),
  }));

  const pinnedStore = useMemo(
    () => (state.listId === listId ? state.store : loadPinnedStore(listId)),
    [state, listId]
  );

  const liveData = useLiveQuery(async () => {
    if (!listId || !pinnedStore) return null;
    const [cache, prefs] = await Promise.all([
      getPriceComparisonCache(listId),
      getPreferredProductsMap(),
    ]);
    return { cache: cache ?? null, prefs };
  }, [listId, pinnedStore?.id]);

  const pinStore = useCallback(
    (store: PinnedStoreSelection) => {
      persistPinnedStore(listId, store);
      setState({ listId, store });
    },
    [listId]
  );

  const unpinStore = useCallback(() => {
    persistPinnedStore(listId, null);
    setState({ listId, store: null });
  }, [listId]);

  const summary = useMemo<PinnedStoreSummary | null>(() => {
    if (!pinnedStore) return null;
    const allItems = [...pendingItems, ...checkedItems];
    if (allItems.length === 0) {
      return {
        estimatedTotalCents: 0,
        inCartTotalCents: 0,
        matchedCount: 0,
        totalItems: 0,
        hasEstimatedMissing: false,
      };
    }

    const cache = liveData?.cache;
    const prefs: Map<string, PreferredProduct> | undefined = liveData?.prefs;

    if (!cache || cache.candidates.length === 0) {
      return {
        estimatedTotalCents: pinnedStore.fallbackTotalCents,
        inCartTotalCents: 0,
        matchedCount: pinnedStore.fallbackMatchedCount,
        totalItems: allItems.length,
        hasEstimatedMissing: pinnedStore.fallbackMatchedCount < allItems.length,
      };
    }

    const storeObj: NearbyStore = cache.stores.find((s) => s.id === pinnedStore.id) ?? {
      id: pinnedStore.id,
      name: pinnedStore.name,
      chainSlug: pinnedStore.chainSlug,
      storeType: 'mercado',
      lat: pinnedStore.lat,
      lng: pinnedStore.lng,
      distanceKm: pinnedStore.distanceKm,
      neighborhood: pinnedStore.neighborhood,
      city: pinnedStore.city,
    };

    const comparison = computePriceComparison({
      stores: [storeObj],
      items: allItems,
      candidates: cache.candidates,
      preferredByTerm: prefs,
    });

    const entry = comparison.rankedStores[0];
    if (!entry) {
      return {
        estimatedTotalCents: pinnedStore.fallbackTotalCents,
        inCartTotalCents: 0,
        matchedCount: pinnedStore.fallbackMatchedCount,
        totalItems: allItems.length,
        hasEstimatedMissing: pinnedStore.fallbackMatchedCount < allItems.length,
      };
    }

    const checkedIds = new Set(checkedItems.map((i) => i.id));
    const inCartTotalCents = entry.matchedItems
      .filter((m) => checkedIds.has(m.item.id))
      .reduce((sum, m) => sum + m.effectiveTotalCents, 0);

    return {
      estimatedTotalCents: entry.estimatedFullTotalCents,
      inCartTotalCents,
      matchedCount: entry.matchedCount,
      totalItems: entry.totalItems,
      hasEstimatedMissing: entry.hasEstimatedMissing,
    };
  }, [pinnedStore, pendingItems, checkedItems, liveData]);

  return { pinnedStore, summary, pinStore, unpinStore };
}
