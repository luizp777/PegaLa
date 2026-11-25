// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, savePriceComparisonCache } from '../../db/localDb';
import { clearPinnedStoreStorage, usePinnedStore } from '../usePinnedStore';
import type { ShoppingItem } from '../../types';

function makeItem(id: string, name: string, isChecked = false): ShoppingItem {
  const now = new Date().toISOString();
  return {
    id,
    listId: 'list-1',
    name,
    normalizedName: name.toLowerCase(),
    quantity: 1,
    unit: 'un',
    categoryId: 'mercearia',
    isChecked,
    checkedAt: isChecked ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('usePinnedStore', () => {
  beforeEach(async () => {
    await db.priceComparisons.clear();
    await db.dictionary.clear();
    clearPinnedStoreStorage('list-1');
  });

  afterEach(() => {
    clearPinnedStoreStorage('list-1');
  });

  it('includes regional median from other cached stores for missing items', async () => {
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 86400_000).toISOString();

    await savePriceComparisonCache({
      listId: 'list-1',
      locationKey: '01310100:3',
      locationLabel: 'Centro',
      cepPrefix: '01310',
      radiusKm: 3,
      stores: [
        {
          id: 'store-a',
          name: 'Mercado A',
          chainSlug: 'chain-a',
          storeType: 'mercado',
          lat: -23.55,
          lng: -46.63,
          distanceKm: 1.0,
        },
        {
          id: 'store-b',
          name: 'Mercado B',
          chainSlug: 'chain-b',
          storeType: 'mercado',
          lat: -23.56,
          lng: -46.64,
          distanceKm: 1.5,
        },
      ],
      candidates: [
        {
          storeId: null,
          chainSlug: 'chain-a',
          normalizedTerm: 'arroz',
          productKey: 'arroz-1',
          productTitle: 'Arroz Branco 1un',
          packQuantity: 1,
          packUnit: 'un',
          priceCents: 1000,
          source: 'online',
          observedAt: now,
          expiresAt: expires,
        },
        {
          storeId: null,
          chainSlug: 'chain-b',
          normalizedTerm: 'feijao',
          productKey: 'feijao-1',
          productTitle: 'Feijao Carioca 1un',
          packQuantity: 1,
          packUnit: 'un',
          priceCents: 800,
          source: 'online',
          observedAt: now,
          expiresAt: expires,
        },
      ],
      failedChains: [],
      computedAt: now,
    });

    const items = [makeItem('i1', 'Arroz', true), makeItem('i2', 'Feijao', false)];

    const { result } = renderHook(() =>
      usePinnedStore({
        listId: 'list-1',
        pendingItems: [items[1]],
        checkedItems: [items[0]],
      })
    );

    act(() => {
      result.current.pinStore({
        id: 'store-a',
        name: 'Mercado A',
        chainSlug: 'chain-a',
        lat: -23.55,
        lng: -46.63,
        distanceKm: 1.0,
        neighborhood: null,
        city: null,
        fallbackTotalCents: 1000,
        fallbackMatchedCount: 1,
        fallbackTotalItems: 2,
        pinnedAt: now,
      });
    });

    await waitFor(() => {
      expect(result.current.summary?.inCartTotalCents).toBe(1000);
    });

    expect(result.current.summary?.hasEstimatedMissing).toBe(true);
    expect(result.current.summary?.matchedCount).toBe(1);
    // 1000 (Arroz in Store A) + 800 (regional median for Feijao from Store B)
    expect(result.current.summary?.estimatedTotalCents).toBe(1800);

    act(() => {
      result.current.unpinStore();
    });
    expect(result.current.pinnedStore).toBeNull();
    expect(result.current.summary).toBeNull();
  });

  it('returns zeroed summary when pinned store list has no items and uses fallback when cache is empty', () => {
    const now = new Date().toISOString();
    const { result, rerender } = renderHook(
      ({ pending }: { pending: ShoppingItem[] }) =>
        usePinnedStore({
          listId: 'list-1',
          pendingItems: pending,
          checkedItems: [],
        }),
      { initialProps: { pending: [] as ShoppingItem[] } }
    );

    act(() => {
      result.current.pinStore({
        id: 'store-a',
        name: 'Mercado A',
        chainSlug: null,
        lat: -23.55,
        lng: -46.63,
        distanceKm: 1.0,
        neighborhood: null,
        city: null,
        fallbackTotalCents: 2500,
        fallbackMatchedCount: 1,
        fallbackTotalItems: 2,
        pinnedAt: now,
      });
    });

    expect(result.current.summary).toEqual({
      estimatedTotalCents: 0,
      inCartTotalCents: 0,
      matchedCount: 0,
      totalItems: 0,
      hasEstimatedMissing: false,
    });

    rerender({ pending: [makeItem('i1', 'Arroz'), makeItem('i2', 'Feijao')] });
    expect(result.current.summary).toMatchObject({
      estimatedTotalCents: 2500,
      matchedCount: 1,
      totalItems: 2,
      hasEstimatedMissing: true,
    });
  });

  it('hydrates persisted pinned store from localStorage and ignores malformed payloads', () => {
    localStorage.setItem('pegala_pinned_store_list-1', '{invalid-json');
    const bad = renderHook(() =>
      usePinnedStore({ listId: 'list-1', pendingItems: [], checkedItems: [] })
    );
    expect(bad.result.current.pinnedStore).toBeNull();
    bad.unmount();

    localStorage.setItem('pegala_pinned_store_list-1', JSON.stringify({ id: 'only-id' }));
    const incomplete = renderHook(() =>
      usePinnedStore({ listId: 'list-1', pendingItems: [], checkedItems: [] })
    );
    expect(incomplete.result.current.pinnedStore).toBeNull();
    incomplete.unmount();

    localStorage.setItem(
      'pegala_pinned_store_list-1',
      JSON.stringify({ id: 'store-x', name: 'Mercado X', lat: -23.5, lng: -46.6 })
    );
    const valid = renderHook(() =>
      usePinnedStore({ listId: 'list-1', pendingItems: [], checkedItems: [] })
    );
    expect(valid.result.current.pinnedStore).toMatchObject({
      id: 'store-x',
      name: 'Mercado X',
      distanceKm: 0,
      fallbackTotalCents: 0,
    });
    valid.unmount();
  });
});
