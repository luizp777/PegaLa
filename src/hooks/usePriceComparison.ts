import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NearbyStore,
  PreferredProduct,
  PriceQuoteCandidate,
  QuotesStreamEvent,
  SavedPriceLocation,
  StoreType,
} from '../../shared/priceTypes';
import {
  getPreferredProductsMap,
  getPriceComparisonCache,
  savePreferredProduct,
  savePriceComparisonCache,
} from '../db/localDb';
import { computePriceComparison, type PriceComparisonResult } from '../lib/priceEngine';
import { ensureSupabaseSession, supabase } from '../lib/supabase';
import type { ListType, ShoppingItem } from '../types';

const LOCATION_STORAGE_KEY = 'pegala_price_location';

function loadSavedLocation(): SavedPriceLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPriceLocation>;
    if (!parsed.label || ![1, 3, 5, 10].includes(Number(parsed.radiusKm))) return null;
    return {
      cep: parsed.cep ?? '',
      label: parsed.label,
      radiusKm: Number(parsed.radiusKm) as 1 | 3 | 5 | 10,
      lat: typeof parsed.lat === 'number' ? parsed.lat : undefined,
      lng: typeof parsed.lng === 'number' ? parsed.lng : undefined,
    };
  } catch {
    return null;
  }
}

function persistLocation(loc: SavedPriceLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // Ignora erro de armazenamento
  }
}

function resolveStoreTypes(listType: ListType): StoreType[] {
  if (listType === 'farmacia') return ['farmacia'];
  if (listType === 'geral') return ['mercado', 'farmacia'];
  return ['mercado'];
}

/**
 * Estado e ações do comparador de preços em mercados e farmácias próximos.
 */
export interface UsePriceComparisonReturn {
  location: SavedPriceLocation | null;
  stores: NearbyStore[];
  result: PriceComparisonResult;
  isLoadingStores: boolean;
  isStreamingQuotes: boolean;
  streamProgress: { done: number; total: number };
  failedChains: string[];
  error: string | null;
  isOfflineCache: boolean;
  cachedAt: string | null;
  includeChecked: boolean;
  setIncludeChecked: (value: boolean) => void;
  requestGpsAndCompare: (radiusKm?: 1 | 3 | 5 | 10) => Promise<void>;
  searchByCepAndCompare: (cep: string, radiusKm?: 1 | 3 | 5 | 10) => Promise<void>;
  changeRadius: (radiusKm: 1 | 3 | 5 | 10) => Promise<void>;
  refreshComparison: () => Promise<void>;
  selectPreferredProduct: (item: ShoppingItem, candidate: PriceQuoteCandidate) => Promise<void>;
  reportManualPrice: (params: {
    storeId: string;
    item: ShoppingItem;
    priceCents: number;
    productTitle?: string;
    packQuantity?: number;
    packUnit?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Hook que orquestra localização (GPS/CEP), cache offline no IndexedDB,
 * streaming NDJSON de cotações e contribuição manual via RPC no Supabase.
 *
 * @param params - Lista ativa, itens pendentes e itens marcados.
 * @returns Estado reativo do comparativo e ações do usuário.
 */
export function usePriceComparison(params: {
  listId: string;
  listType: ListType;
  pendingItems: ShoppingItem[];
  checkedItems: ShoppingItem[];
}): UsePriceComparisonReturn {
  const { listId, listType, pendingItems, checkedItems } = params;

  const [location, setLocation] = useState<SavedPriceLocation | null>(() => loadSavedLocation());
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [candidates, setCandidates] = useState<PriceQuoteCandidate[]>([]);
  const [preferredByTerm, setPreferredByTerm] = useState<Map<string, PreferredProduct>>(new Map());
  const [includeChecked, setIncludeChecked] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isStreamingQuotes, setIsStreamingQuotes] = useState(false);
  const [streamProgress, setStreamProgress] = useState({ done: 0, total: 0 });
  const [failedChains, setFailedChains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const activeItems = useMemo(
    () => (includeChecked ? [...pendingItems, ...checkedItems] : pendingItems),
    [includeChecked, pendingItems, checkedItems]
  );

  // Carrega preferências locais e cache offline na abertura
  useEffect(() => {
    let active = true;
    void (async () => {
      const [prefs, cached] = await Promise.all([
        getPreferredProductsMap(),
        getPriceComparisonCache(listId),
      ]);
      if (!active) return;
      setPreferredByTerm(prefs);
      if (cached) {
        setStores(cached.stores);
        setCandidates(cached.candidates);
        setFailedChains(cached.failedChains);
        setCachedAt(cached.computedAt);
        setIsOfflineCache(!navigator.onLine);
      }
    })();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [listId]);

  const result = useMemo(
    () =>
      computePriceComparison({
        stores,
        items: activeItems,
        candidates,
        preferredByTerm,
      }),
    [stores, activeItems, candidates, preferredByTerm]
  );

  const runComparison = useCallback(
    async (locInput: { cep?: string; lat?: number; lng?: number; radiusKm: 1 | 3 | 5 | 10 }) => {
      if (!navigator.onLine) {
        setIsOfflineCache(true);
        setError('Sem conexão. Exibindo última comparação salva offline.');
        return;
      }

      if (activeItems.length === 0) {
        setError('Adicione ao menos 1 item na lista para comparar preços.');
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setIsOfflineCache(false);
      setIsLoadingStores(true);
      setFailedChains([]);

      try {
        await ensureSupabaseSession();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : undefined;
        if (!token) {
          throw new Error('Conecte-se à internet para autenticar e comparar preços.');
        }

        const nearbyRes = await fetch('/api/prices/nearby-stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cep: locInput.cep,
            lat: locInput.lat,
            lng: locInput.lng,
            radiusKm: locInput.radiusKm,
            types: resolveStoreTypes(listType),
          }),
          signal: controller.signal,
        });

        if (!nearbyRes.ok) {
          const errBody = (await nearbyRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error || 'Falha ao buscar estabelecimentos próximos.');
        }

        const nearbyData = (await nearbyRes.json()) as {
          location: {
            cep: string;
            cepPrefix: string;
            city?: string;
            label: string;
            lat: number;
            lng: number;
            radiusKm: 1 | 3 | 5 | 10;
          };
          stores: NearbyStore[];
        };

        const nextLocation: SavedPriceLocation = {
          cep: nearbyData.location.cep,
          label: nearbyData.location.label,
          radiusKm: nearbyData.location.radiusKm,
          lat: nearbyData.location.lat,
          lng: nearbyData.location.lng,
        };
        setLocation(nextLocation);
        persistLocation(nextLocation);
        setStores(nearbyData.stores);
        setIsLoadingStores(false);

        if (nearbyData.stores.length === 0) {
          setCandidates([]);
          return;
        }

        const chains = [
          ...new Set(
            nearbyData.stores.map((s) => s.chainSlug).filter((c): c is string => Boolean(c))
          ),
        ];
        const storeIds = nearbyData.stores.map((s) => s.id);

        setIsStreamingQuotes(true);
        setStreamProgress({ done: 0, total: Math.max(1, chains.length) });

        const quotesRes = await fetch('/api/prices/quotes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cep: nearbyData.location.cep,
            city: nearbyData.location.city,
            chains,
            storeIds,
            terms: activeItems.slice(0, 60).map((i) => ({
              normalizedTerm: i.normalizedName,
              quantity: i.quantity,
              unit: i.unit,
            })),
          }),
          signal: controller.signal,
        });

        if (!quotesRes.ok || !quotesRes.body) {
          throw new Error('Falha ao consultar cotações de preços.');
        }

        const reader = quotesRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated: PriceQuoteCandidate[] = [];
        let latestFailed: string[] = [];
        const chainsSeen = new Set<string>();

        const processLine = (rawLine: string) => {
          const trimmed = rawLine.trim();
          if (!trimmed) return;
          try {
            const event = JSON.parse(trimmed) as QuotesStreamEvent;
            if (event.type === 'cache') {
              accumulated = [...event.candidates];
              setCandidates(accumulated);
            } else if (event.type === 'chain') {
              chainsSeen.add(event.chainSlug);
              setStreamProgress({ done: chainsSeen.size, total: Math.max(1, chains.length) });
              if (event.candidates.length > 0) {
                accumulated = [...accumulated, ...event.candidates];
                setCandidates(accumulated);
              }
            } else if (event.type === 'done') {
              latestFailed = event.failedChains;
              setFailedChains(latestFailed);
            }
          } catch {
            // Ignora linha NDJSON malformada sem interromper o stream
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            processLine(line);
          }
        }
        if (buffer.trim()) {
          processLine(buffer);
        }

        const nowIso = new Date().toISOString();
        setCachedAt(nowIso);
        await savePriceComparisonCache({
          listId,
          locationKey: `${nextLocation.cep || 'gps'}:${nextLocation.radiusKm}`,
          locationLabel: nextLocation.label,
          cepPrefix: nextLocation.cep.slice(0, 5),
          radiusKm: nextLocation.radiusKm,
          stores: nearbyData.stores,
          candidates: accumulated,
          failedChains: latestFailed,
          computedAt: nowIso,
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Erro ao comparar preços.');
      } finally {
        setIsLoadingStores(false);
        setIsStreamingQuotes(false);
      }
    },
    [activeItems, listId, listType]
  );

  // Dispara comparação inicial automaticamente se já houver localização salva e cache vazio/antigo
  const initialTriggeredRef = useRef(false);
  useEffect(() => {
    if (initialTriggeredRef.current) return;
    if (location && navigator.onLine && activeItems.length > 0) {
      initialTriggeredRef.current = true;
      queueMicrotask(() => {
        void runComparison({
          cep: location.cep || undefined,
          lat: location.lat,
          lng: location.lng,
          radiusKm: location.radiusKm,
        });
      });
    }
  }, [location, activeItems.length, runComparison]);

  const requestGpsAndCompare = useCallback(
    async (radiusKm?: 1 | 3 | 5 | 10) => {
      const targetRadius = radiusKm ?? location?.radiusKm ?? 3;
      if (!navigator.geolocation) {
        setError('Geolocalização não suportada neste aparelho. Informe seu CEP.');
        return;
      }

      setError(null);
      setIsLoadingStores(true);

      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            void runComparison({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              radiusKm: targetRadius,
            }).finally(resolve);
          },
          () => {
            setIsLoadingStores(false);
            setError('Permissão de localização negada. Digite seu CEP para continuar.');
            resolve();
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
        );
      });
    },
    [location?.radiusKm, runComparison]
  );

  const searchByCepAndCompare = useCallback(
    async (cep: string, radiusKm?: 1 | 3 | 5 | 10) => {
      const clean = cep.replace(/\D/g, '');
      if (clean.length !== 8) {
        setError('Digite um CEP válido com 8 números.');
        return;
      }
      await runComparison({
        cep: clean,
        radiusKm: radiusKm ?? location?.radiusKm ?? 3,
      });
    },
    [location?.radiusKm, runComparison]
  );

  const changeRadius = useCallback(
    async (radiusKm: 1 | 3 | 5 | 10) => {
      if (!location) return;
      await runComparison({
        cep: location.cep || undefined,
        lat: location.lat,
        lng: location.lng,
        radiusKm,
      });
    },
    [location, runComparison]
  );

  const refreshComparison = useCallback(async () => {
    if (!location) return;
    await runComparison({
      cep: location.cep || undefined,
      lat: location.lat,
      lng: location.lng,
      radiusKm: location.radiusKm,
    });
  }, [location, runComparison]);

  const selectPreferredProduct = useCallback(
    async (item: ShoppingItem, candidate: PriceQuoteCandidate) => {
      const pref: PreferredProduct = {
        productKey: candidate.productKey,
        title: candidate.productTitle,
        brand: candidate.brand ?? undefined,
        ean: candidate.ean ?? undefined,
        packQuantity: candidate.packQuantity,
        packUnit: candidate.packUnit,
      };
      await savePreferredProduct(item.name, item.categoryId, pref);
      setPreferredByTerm((prev) => {
        const next = new Map(prev);
        next.set(item.normalizedName, pref);
        return next;
      });
    },
    []
  );

  const reportManualPrice = useCallback(
    async (input: {
      storeId: string;
      item: ShoppingItem;
      priceCents: number;
      productTitle?: string;
      packQuantity?: number;
      packUnit?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) {
        return { ok: false, error: 'Supabase não configurado.' };
      }

      await ensureSupabaseSession();
      const title = input.productTitle?.trim() || input.item.name;
      const packQty = input.packQuantity && input.packQuantity > 0 ? input.packQuantity : 1;
      const packUnit = input.packUnit?.trim() || input.item.unit || 'un';
      const { data, error: rpcError } = await supabase.rpc('report_community_price', {
        p_store_id: input.storeId,
        p_normalized_term: input.item.normalizedName,
        p_product_title: title,
        p_pack_quantity: packQty,
        p_pack_unit: packUnit,
        p_price_cents: input.priceCents,
      });

      if (rpcError) {
        return { ok: false, error: rpcError.message };
      }

      if (data) {
        const row = data as {
          id: string;
          store_id: string | null;
          chain_slug: string | null;
          normalized_term: string;
          product_key: string;
          product_title: string;
          brand: string | null;
          ean: string | null;
          pack_quantity: number;
          pack_unit: string;
          price_cents: number;
          source: 'community';
          weight: number;
          observed_at: string;
          expires_at: string;
        };
        const newCandidate: PriceQuoteCandidate = {
          id: row.id,
          storeId: row.store_id,
          chainSlug: row.chain_slug,
          normalizedTerm: row.normalized_term,
          productKey: row.product_key,
          productTitle: row.product_title,
          brand: row.brand,
          ean: row.ean,
          packQuantity: Number(row.pack_quantity) || 1,
          packUnit: row.pack_unit || 'un',
          priceCents: row.price_cents,
          source: 'community',
          observedAt: row.observed_at,
          expiresAt: row.expires_at,
          weight: Number(row.weight) || 1,
        };
        setCandidates((prev) => {
          const next = [newCandidate, ...prev];
          if (location && stores.length > 0) {
            void savePriceComparisonCache({
              listId,
              locationKey: `${location.cep || 'gps'}:${location.radiusKm}`,
              locationLabel: location.label,
              cepPrefix: location.cep.slice(0, 5),
              radiusKm: location.radiusKm,
              stores,
              candidates: next,
              failedChains,
              computedAt: new Date().toISOString(),
            });
          }
          return next;
        });
      }

      return { ok: true };
    },
    [failedChains, listId, location, stores]
  );

  return {
    location,
    stores,
    result,
    isLoadingStores,
    isStreamingQuotes,
    streamProgress,
    failedChains,
    error,
    isOfflineCache,
    cachedAt,
    includeChecked,
    setIncludeChecked,
    requestGpsAndCompare,
    searchByCepAndCompare,
    changeRadius,
    refreshComparison,
    selectPreferredProduct,
    reportManualPrice,
  };
}
