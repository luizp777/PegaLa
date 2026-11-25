import type { PriceQuoteCandidate } from '../../../shared/priceTypes.js';
import { buildProductKey, parsePackServer, type AdapterSearchContext, type RetailAdapter } from './types.js';

interface MagentoGraphqlResponse {
  data?: {
    products?: {
      items?: Array<{
        name?: string;
        sku?: string;
        categories?: Array<{ name?: string } | null>;
        price_range?: {
          minimum_price?: {
            final_price?: {
              value?: number;
            };
          };
        };
      }>;
    };
  };
}

const TAUSTE_STORE_BY_CITY: Record<string, string> = {
  marilia: 'marilia',
  bauru: 'bauru',
  sorocaba: 'sorocaba',
  jundiai: 'jundiai',
  campinas: 'campinas',
  'sao jose dos campos': 'saojosedoscampos',
  botucatu: 'botucatu',
  taubate: 'taubate',
};

function resolveTausteStorePath(city?: string): string {
  if (!city) return 'marilia';
  const norm = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return TAUSTE_STORE_BY_CITY[norm] ?? 'marilia';
}

export function parseTausteProducts(
  data: unknown,
  normalizedTerm: string,
  nowIso: string,
  expiresIso: string
): PriceQuoteCandidate[] {
  const res = data as MagentoGraphqlResponse;
  const items = res?.data?.products?.items;
  if (!Array.isArray(items)) return [];

  const results: PriceQuoteCandidate[] = [];
  for (const item of items) {
    const title = item.name?.trim();
    const price = item.price_range?.minimum_price?.final_price?.value;
    if (!title || typeof price !== 'number' || price <= 0) continue;

    const priceCents = Math.round(price * 100);
    if (priceCents < 10 || priceCents > 5000000) continue;

    const pack = parsePackServer(title);
    const retailCategory =
      Array.isArray(item.categories)
        ? item.categories
            .map((c) => c?.name?.trim())
            .filter((n): n is string => Boolean(n))
            .join(' / ')
            .slice(0, 240) || null
        : null;
    results.push({
      storeId: null,
      chainSlug: 'tauste',
      normalizedTerm,
      productKey: buildProductKey(item.sku, title),
      productTitle: title.slice(0, 240),
      brand: null,
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

export const tausteAdapter: RetailAdapter = {
  slug: 'tauste',
  displayName: 'Tauste Supermercados',
  storeType: 'mercado',
  async search(ctx: AdapterSearchContext): Promise<PriceQuoteCandidate[]> {
    const storePath = resolveTausteStorePath(ctx.city);
    const query = `query SearchProducts($term: String!) {
      products(search: $term, pageSize: 20) {
        items {
          name
          sku
          categories {
            name
          }
          price_range {
            minimum_price {
              final_price {
                value
              }
            }
          }
        }
      }
    }`;

    const res = await fetch(`https://tauste.com.br/${storePath}/graphql`, {
      method: 'POST',
      headers: {
        'User-Agent': 'PegaLa/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { term: ctx.term.trim() },
      }),
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      throw new Error(`Tauste HTTP ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 3600_000);
    return parseTausteProducts(json, ctx.term, now.toISOString(), expires.toISOString());
  },
};
