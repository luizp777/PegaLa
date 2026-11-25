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
  retailCategory?: string | null;
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
  /** Identificador da loja (`UUID` do Supabase ou `temp-...`). */
  id: string;
  /** Nome legível do estabelecimento. */
  name: string;
  /** Slug da rede varejista quando identificada, ou `null`. */
  chainSlug: string | null;
  /** Latitude do estabelecimento. */
  lat: number;
  /** Longitude do estabelecimento. */
  lng: number;
  /** Distância estimada em quilômetros a partir da busca. */
  distanceKm: number;
  /** Bairro opcional. */
  neighborhood?: string | null;
  /** Cidade opcional. */
  city?: string | null;
  /** Total estimado em centavos salvo no momento da escolha (fallback offline). */
  fallbackTotalCents: number;
  /** Quantidade de itens casados no momento da escolha. */
  fallbackMatchedCount: number;
  /** Total de itens da lista no momento da escolha. */
  fallbackTotalItems: number;
  /** Timestamp ISO da fixação. */
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
