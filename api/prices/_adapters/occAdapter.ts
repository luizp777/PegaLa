import type { PriceQuoteCandidate } from '../../../shared/priceTypes.js';
import { buildProductKey, parsePackServer, type AdapterSearchContext, type RetailAdapter } from './types.js';

interface OccRecord {
  records?: OccRecord[];
  attributes?: Record<string, string[]>;
}

interface OccSearchResponse {
  resultsList?: {
    records?: OccRecord[];
  };
}

export function parseOccProducts(
  data: unknown,
  chainSlug: string,
  normalizedTerm: string,
  nowIso: string,
  expiresIso: string
): PriceQuoteCandidate[] {
  const res = data as OccSearchResponse;
  const topRecords = res?.resultsList?.records;
  if (!Array.isArray(topRecords)) return [];

  const results: PriceQuoteCandidate[] = [];
  for (const item of topRecords) {
    const attrs = item.records?.[0]?.attributes ?? item.attributes;
    if (!attrs) continue;

    const title = attrs['product.displayName']?.[0]?.trim();
    const rawPrice = attrs['sku.activePrice']?.[0] ?? attrs['sku.listPrice']?.[0];
    const price = rawPrice ? Number(rawPrice) : NaN;

    if (!title || !Number.isFinite(price) || price <= 0) continue;

    const priceCents = Math.round(price * 100);
    if (priceCents < 10 || priceCents > 5000000) continue;

    const brand = attrs['product.brand']?.[0]?.trim() || null;
    const repoId = attrs['product.repositoryId']?.[0]?.trim();
    const rawCat =
      attrs['product.category']?.[0] ??
      attrs['parentCategory.displayName']?.[0] ??
      attrs['product.parentCategory.displayName']?.[0] ??
      attrs['category.displayName']?.[0];
    const retailCategory = rawCat?.trim().slice(0, 240) || null;
    const pack = parsePackServer(title);

    results.push({
      storeId: null,
      chainSlug,
      normalizedTerm,
      productKey: buildProductKey(repoId, title),
      productTitle: title.slice(0, 240),
      brand,
      ean: null,
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

export const confiancaAdapter: RetailAdapter = {
  slug: 'confianca',
  displayName: 'Confiança Supermercados',
  storeType: 'mercado',
  async search(ctx: AdapterSearchContext): Promise<PriceQuoteCandidate[]> {
    const url = `https://www.confianca.com.br/ccstoreui/v1/search?Ntt=${encodeURIComponent(ctx.term)}&Nrpp=20`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PegaLa/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) {
      throw new Error(`Confiança HTTP ${res.status}`);
    }
    const json = (await res.json()) as unknown;
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 3600_000);
    return parseOccProducts(json, 'confianca', ctx.term, now.toISOString(), expires.toISOString());
  },
};
