import type { PriceQuoteCandidate, StoreType } from '../../../shared/priceTypes.ts';
import { buildProductKey, parsePackServer, type AdapterSearchContext, type RetailAdapter } from './types.ts';

interface VtexProductResponse {
  productId?: string;
  productName?: string;
  brand?: string;
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

const regionCache = new Map<string, { regionId: string | null; expiresAt: number }>();

async function resolveVtexRegion(host: string, cep: string): Promise<string | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  const key = `${host}:${cleanCep.slice(0, 5)}`;
  const cached = regionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.regionId;
  }

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
    regionCache.set(key, { regionId, expiresAt: Date.now() + 6 * 3600_000 });
    return regionId;
  } catch {
    return null;
  }
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
    const firstItem = raw.items?.[0];
    const offer = firstItem?.sellers?.[0]?.commertialOffer;
    const price = offer?.Price;
    const available = offer?.AvailableQuantity ?? 0;

    if (!title || typeof price !== 'number' || price <= 0 || available <= 0) {
      continue;
    }

    const priceCents = Math.round(price * 100);
    if (priceCents < 10 || priceCents > 5000000) continue;

    const pack = parsePackServer(title);
    results.push({
      storeId: null,
      chainSlug,
      normalizedTerm,
      productKey: buildProductKey(firstItem?.ean, title),
      productTitle: title.slice(0, 240),
      brand: raw.brand?.trim() || null,
      ean: firstItem?.ean?.trim() || null,
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

      const url = `${config.host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(ctx.term)}&_from=0&_to=7`;
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
