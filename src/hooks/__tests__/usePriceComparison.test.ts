// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, savePriceComparisonCache } from '../../db/localDb';
import type { ShoppingItem } from '../../types';
import { usePriceComparison } from '../usePriceComparison';

const mockRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  ensureSupabaseSession: vi.fn().mockResolvedValue({ id: 'user-1', is_anonymous: true }),
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-jwt' } },
      }),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const sampleItem: ShoppingItem = {
  id: 'item-1',
  listId: 'list-1',
  name: 'Leite integral',
  normalizedName: 'leite integral',
  quantity: 2,
  unit: 'L',
  categoryId: 'laticinios',
  isChecked: false,
  checkedAt: null,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
};

describe('usePriceComparison', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.priceComparisons.clear();
    await db.dictionary.clear();
    vi.restoreAllMocks();
    mockRpc.mockReset();
  });

  it('carrega cache offline do IndexedDB ao iniciar', async () => {
    await savePriceComparisonCache({
      listId: 'list-1',
      locationKey: '01310100:3',
      locationLabel: 'Bela Vista, São Paulo',
      cepPrefix: '01310',
      radiusKm: 3,
      stores: [
        {
          id: 's1',
          name: 'Mambo Bela Vista',
          chainSlug: 'mambo',
          storeType: 'mercado',
          lat: -23.56,
          lng: -46.65,
          distanceKm: 0.4,
        },
      ],
      candidates: [
        {
          storeId: null,
          chainSlug: 'mambo',
          normalizedTerm: 'leite integral',
          productKey: 'leite-1',
          productTitle: 'Leite Integral 1L',
          packQuantity: 1,
          packUnit: 'L',
          priceCents: 499,
          source: 'online',
          observedAt: '2026-11-24T20:00:00.000Z',
          expiresAt: '2027-11-24T20:00:00.000Z',
        },
      ],
      failedChains: [],
      computedAt: '2026-11-24T20:00:00.000Z',
    });

    const { result } = renderHook(() =>
      usePriceComparison({
        listId: 'list-1',
        listType: 'mercado',
        pendingItems: [sampleItem],
        checkedItems: [],
      })
    );

    await waitFor(() => {
      expect(result.current.stores).toHaveLength(1);
    });
    expect(result.current.result.rankedStores[0].estimatedFullTotalCents).toBe(998);
  });

  it('valida CEP inválido e busca lojas + stream NDJSON para CEP válido', async () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    const now = new Date().toISOString();
    const ndjson = [
      JSON.stringify({ type: 'cache', candidates: [] }),
      JSON.stringify({
        type: 'chain',
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        candidates: [
          {
            storeId: null,
            chainSlug: 'mambo',
            normalizedTerm: 'leite integral',
            productKey: 'leite-jussara',
            productTitle: 'Leite Integral Jussara 1L',
            packQuantity: 1,
            packUnit: 'L',
            priceCents: 498,
            source: 'online',
            observedAt: now,
            expiresAt: future,
          },
        ],
      }),
      JSON.stringify({ type: 'done', failedChains: [] }),
    ].join('\n');

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('nearby-stores')) {
        return new Response(
          JSON.stringify({
            location: {
              cep: '01310100',
              cepPrefix: '01310',
              city: 'São Paulo',
              label: 'Bela Vista, São Paulo',
              lat: -23.56,
              lng: -46.65,
              radiusKm: 3,
            },
            stores: [
              {
                id: 's1',
                name: 'Mambo',
                chainSlug: 'mambo',
                storeType: 'mercado',
                lat: -23.56,
                lng: -46.65,
                distanceKm: 0.5,
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(ndjson + '\n', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      usePriceComparison({
        listId: 'list-1',
        listType: 'mercado',
        pendingItems: [sampleItem],
        checkedItems: [],
      })
    );

    await act(async () => {
      await result.current.searchByCepAndCompare('123');
    });
    expect(result.current.error).toContain('CEP válido');

    await act(async () => {
      await result.current.searchByCepAndCompare('01310-100');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result.rankedStores).toHaveLength(1);
    expect(result.current.result.rankedStores[0].estimatedFullTotalCents).toBe(996);
  });

  it('salva preferência de produto e envia preço manual via RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'c1',
        store_id: 's1',
        chain_slug: 'mambo',
        normalized_term: 'leite integral',
        product_key: 'leite-manual',
        product_title: 'Leite integral',
        brand: null,
        ean: null,
        pack_quantity: 2,
        pack_unit: 'L',
        price_cents: 950,
        source: 'community',
        weight: 1,
        observed_at: '2026-11-24T21:00:00.000Z',
        expires_at: '2027-11-24T21:00:00.000Z',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      usePriceComparison({
        listId: 'list-1',
        listType: 'mercado',
        pendingItems: [sampleItem],
        checkedItems: [],
      })
    );

    await act(async () => {
      await result.current.selectPreferredProduct(sampleItem, {
        storeId: null,
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-pref',
        productTitle: 'Leite Preferido 1L',
        packQuantity: 1,
        packUnit: 'L',
        priceCents: 550,
        source: 'online',
        observedAt: '2026-11-24T20:00:00.000Z',
        expiresAt: '2027-11-24T20:00:00.000Z',
      });
    });

    const dictEntry = await db.dictionary.where('normalizedTerm').equals('leite integral').first();
    expect(dictEntry?.preferredProduct?.productKey).toBe('leite-pref');

    let reportRes: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      reportRes = await result.current.reportManualPrice({
        storeId: 's1',
        item: sampleItem,
        priceCents: 950,
      });
    });
    expect(reportRes?.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'report_community_price',
      expect.objectContaining({
        p_pack_quantity: 1,
        p_pack_unit: 'L',
      })
    );
  });

  it('cobre fluxo de GPS (sucesso e negado), troca de raio, refresh e includeChecked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('nearby-stores')) {
        return new Response(
          JSON.stringify({
            location: {
              cep: '01310100',
              cepPrefix: '01310',
              label: 'Pinheiros, São Paulo',
              lat: -23.56,
              lng: -46.69,
              radiusKm: 5,
            },
            stores: [],
          }),
          { status: 200 }
        );
      }
      return new Response(`${JSON.stringify({ type: 'done', failedChains: [] })}\n`, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _ok: PositionCallback,
          err: PositionErrorCallback
        ) => err({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });

    const { result } = renderHook(() =>
      usePriceComparison({
        listId: 'list-1',
        listType: 'farmacia',
        pendingItems: [sampleItem],
        checkedItems: [{ ...sampleItem, id: 'item-2', isChecked: true }],
      })
    );

    await act(async () => {
      await result.current.requestGpsAndCompare();
    });
    expect(result.current.error).toContain('negada');

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: -23.56, longitude: -46.69 } } as GeolocationPosition),
      },
    });

    await act(async () => {
      await result.current.requestGpsAndCompare(5);
    });
    expect(result.current.location?.radiusKm).toBe(5);

    await act(async () => {
      result.current.setIncludeChecked(true);
      await result.current.changeRadius(10);
      await result.current.refreshComparison();
    });
    expect(result.current.includeChecked).toBe(true);
  });
});
