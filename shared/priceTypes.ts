/**
 * Tipo operacional do estabelecimento comercial suportado pelo comparador.
 */
export type StoreType = 'mercado' | 'farmacia';

/**
 * Origem de um preço registrado no comparador.
 */
export type PriceSource = 'online' | 'community' | 'nfce';

/**
 * Estabelecimento físico retornado por `/api/prices/nearby-stores`.
 */
export interface NearbyStore {
  id: string;
  osmId?: string | null;
  name: string;
  chainSlug: string | null;
  storeType: StoreType;
  lat: number;
  lng: number;
  distanceKm: number;
  cep?: string | null;
  city?: string | null;
  neighborhood?: string | null;
}

/**
 * Produto candidato com preço retornado por rede ou comunidade.
 */
export interface PriceQuoteCandidate {
  id?: string;
  storeId: string | null;
  chainSlug: string | null;
  normalizedTerm: string;
  productKey: string;
  productTitle: string;
  brand?: string | null;
  ean?: string | null;
  packQuantity: number;
  packUnit: string;
  priceCents: number;
  source: PriceSource;
  observedAt: string;
  expiresAt: string;
  weight?: number;
}

/**
 * Item da lista enviado para consulta de cotações.
 */
export interface QuoteTermInput {
  normalizedTerm: string;
  quantity: number;
  unit: string;
}

/**
 * Evento NDJSON emitido por `POST /api/prices/quotes`.
 */
export type QuotesStreamEvent =
  | {
      type: 'cache';
      candidates: PriceQuoteCandidate[];
    }
  | {
      type: 'chain';
      chainSlug: string;
      normalizedTerm: string;
      candidates: PriceQuoteCandidate[];
    }
  | {
      type: 'done';
      failedChains: string[];
    };

/**
 * Preferência de produto/marca salva localmente pelo usuário para um termo.
 */
export interface PreferredProduct {
  productKey: string;
  title: string;
  brand?: string;
  ean?: string;
  packQuantity: number;
  packUnit: string;
}

/**
 * Localização salva no `localStorage` para o comparador de preços.
 */
export interface SavedPriceLocation {
  cep: string;
  label: string;
  radiusKm: 1 | 3 | 5 | 10;
  lat?: number;
  lng?: number;
}

/**
 * Verifica se o ID da loja é um UUID persistido no Supabase (descarta IDs temporários `temp-...`).
 */
export function isPersistedStoreId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Estabelecimento fixado na página da lista após a comparação de preços.
 */
export interface PinnedStoreSelection {
  id: string;
  name: string;
  chainSlug: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  neighborhood?: string | null;
  city?: string | null;
  fallbackTotalCents: number;
  fallbackMatchedCount: number;
  fallbackTotalItems: number;
  pinnedAt: string;
}

/**
 * Snapshot bruto da última comparação salva no IndexedDB para uso offline.
 */
export interface CachedPriceComparison {
  listId: string;
  locationKey: string;
  locationLabel: string;
  cepPrefix: string;
  radiusKm: number;
  stores: NearbyStore[];
  candidates: PriceQuoteCandidate[];
  failedChains: string[];
  computedAt: string;
}
