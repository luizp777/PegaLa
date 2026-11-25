import type { PriceQuoteCandidate, StoreType } from '../../../shared/priceTypes.js';
import { buildProductKey, parsePackServer, type AdapterSearchContext, type RetailAdapter } from './types.js';

interface VtexProductResponse {
  productId?: string;
  productName?: string;
  brand?: string;
  categories?: string[];
  items?: Array<{
    ean?: string;
    sellers?: Array<{
      commertialOffer?: {
        Price?: number;
        AvailableQuantity?: number;
      };
    }>;
  }>;
}

const MAX_REGION_CACHE_ENTRIES = 200;
const regionCache = new Map<string, { regionId: string | null; expiresAt: number }>();
const regionInFlight = new Map<string, Promise<string | null>>();

function setRegionCache(key: string, regionId: string | null): void {
  const now = Date.now();
  if (regionCache.size >= MAX_REGION_CACHE_ENTRIES) {
    for (const [k, v] of regionCache.entries()) {
      if (v.expiresAt <= now) regionCache.delete(k);
    }
    if (regionCache.size >= MAX_REGION_CACHE_ENTRIES) {
      const oldestKey = regionCache.keys().next().value;
      if (oldestKey) regionCache.delete(oldestKey);
    }
  }
  regionCache.set(key, { regionId, expiresAt: now + 6 * 3600_000 });
}

async function resolveVtexRegion(host: string, cep: string): Promise<string | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  const key = `${host}:${cleanCep.slice(0, 5)}`;
  const cached = regionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.regionId;
  }

  const pending = regionInFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(
        `${host}/api/checkout/pub/regions?country=BRA&postalCode=${cleanCep}`,
        {
          headers: { 'User-Agent': 'PegaLa/1.0' },
          signal: AbortSignal.timeout(2500),
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ id?: string }>;
      const regionId = Array.isArray(data) && data[0]?.id ? data[0].id : null;
      setRegionCache(key, regionId);
      return regionId;
    } catch {
      return null;
    } finally {
      regionInFlight.delete(key);
    }
  })();

  regionInFlight.set(key, promise);
  return promise;
}

export function parseVtexProducts(
  data: unknown,
  chainSlug: string,
  normalizedTerm: string,
  nowIso: string,
  expiresIso: string
): PriceQuoteCandidate[] {
  if (!Array.isArray(data)) return [];
  const results: PriceQuoteCandidate[] = [];

  for (const raw of data as VtexProductResponse[]) {
    const title = raw.productName?.trim();
    if (!title || !Array.isArray(raw.items)) continue;

    let selectedEan: string | undefined;
    let selectedPrice: number | undefined;
    for (const sku of raw.items) {
      if (!Array.isArray(sku.sellers)) continue;
      for (const seller of sku.sellers) {
        const offer = seller.commertialOffer;
        if (
          typeof offer?.Price === 'number' &&
          offer.Price > 0 &&
          (offer.AvailableQuantity ?? 0) > 0
        ) {
          selectedPrice = offer.Price;
          selectedEan = sku.ean;
          break;
        }
      }
      if (selectedPrice !== undefined) break;
    }

    if (selectedPrice === undefined) continue;

    const priceCents = Math.round(selectedPrice * 100);
    if (priceCents < 10 || priceCents > 5000000) continue;

    const pack = parsePackServer(title);
    const retailCategory =
      Array.isArray(raw.categories)
        ? raw.categories.find((c): c is string => typeof c === 'string' && c.trim().length > 0)?.trim().slice(0, 240) || null
        : null;
    results.push({
      storeId: null,
      chainSlug,
      normalizedTerm,
      productKey: buildProductKey(selectedEan, title),
      productTitle: title.slice(0, 240),
      brand: raw.brand?.trim() || null,
      ean: selectedEan?.trim() || null,
      retailCategory,
      packQuantity: pack.quantity,
      packUnit: pack.unit,
      priceCents,
      source: 'online',
      observedAt: nowIso,
      expiresAt: expiresIso,
    });
  }

  return results;
}

export function createVtexAdapter(config: {
  slug: string;
  displayName: string;
  storeType: StoreType;
  host: string;
}): RetailAdapter {
  return {
    slug: config.slug,
    displayName: config.displayName,
    storeType: config.storeType,
    async search(ctx: AdapterSearchContext): Promise<PriceQuoteCandidate[]> {
      const regionId = await resolveVtexRegion(config.host, ctx.cep);
      const cookie = regionId
        ? `vtex_segment=${Buffer.from(JSON.stringify({ regionId })).toString('base64')}`
        : '';

      const searchTerm = ctx.query?.trim() || ctx.term;
      const url = `${config.host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(searchTerm)}&_from=0&_to=19`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PegaLa/1.0',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok && res.status !== 206) {
        throw new Error(`VTEX ${config.slug} HTTP ${res.status}`);
      }

      const json = (await res.json()) as unknown;
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 3600_000);
      return parseVtexProducts(json, config.slug, ctx.term, now.toISOString(), expires.toISOString());
    },
  };
}
