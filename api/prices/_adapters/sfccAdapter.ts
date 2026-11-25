import type { PriceQuoteCandidate } from '../../../shared/priceTypes.js';
import { buildProductKey, parsePackServer, type AdapterSearchContext, type RetailAdapter } from './types.js';

const NAMED_ENTITIES: Record<string, string> = {
  aacute: 'á',
  agrave: 'à',
  acirc: 'â',
  atilde: 'ã',
  eacute: 'é',
  ecirc: 'ê',
  iacute: 'í',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  uacute: 'ú',
  uuml: 'ü',
  ccedil: 'ç',
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const lower = name.toLowerCase();
      const decoded = NAMED_ENTITIES[lower];
      if (!decoded) return match;
      return name[0] === name[0].toUpperCase() ? decoded.toUpperCase() : decoded;
    })
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

export function parseJauServeHtml(
  html: string,
  normalizedTerm: string,
  nowIso: string,
  expiresIso: string
): PriceQuoteCandidate[] {
  const results: PriceQuoteCandidate[] = [];
  const seen = new Set<string>();

  // Segmenta por blocos de produto SFCC (`data-pid="..."`) para evitar janelas rígidas de caracteres
  const blocks = html.split(/data-pid="/i).slice(1);

  for (const block of blocks) {
    if (results.length >= 8) break;
    const pidMatch = block.match(/^([^"]+)"/);
    const pid = pidMatch?.[1]?.trim();
    const segment = block.slice(0, 4000);
    const titleMatch = segment.match(/(?:data-product-name="([^"]+)"|alt="([^"]+)")/i);
    const priceMatch = segment.match(/R\$\s*([\d.]+,\d{2})/);
    if (!titleMatch || !priceMatch) continue;

    const rawTitle = decodeHtmlEntities((titleMatch[1] || titleMatch[2] || '').trim());
    const rawPrice = priceMatch[1].replace(/\./g, '').replace(',', '.');
    const price = Number(rawPrice);

    if (!rawTitle || !Number.isFinite(price) || price <= 0) continue;
    const priceCents = Math.round(price * 100);
    if (priceCents < 10 || priceCents > 5000000) continue;

    const productKey = buildProductKey(pid, rawTitle);
    if (seen.has(productKey)) continue;
    seen.add(productKey);

    const pack = parsePackServer(rawTitle);
    results.push({
      storeId: null,
      chainSlug: 'jauserve',
      normalizedTerm,
      productKey,
      productTitle: rawTitle.slice(0, 240),
      brand: null,
      ean: null,
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

export const jauServeAdapter: RetailAdapter = {
  slug: 'jauserve',
  displayName: 'Jaú Serve Supermercados',
  storeType: 'mercado',
  async search(ctx: AdapterSearchContext): Promise<PriceQuoteCandidate[]> {
    const url = `https://www.jauserve.com.br/on/demandware.store/Sites-JauServe-Site/pt_BR/Search-ShowAjax?q=${encodeURIComponent(ctx.term)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PegaLa/1.0)',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      throw new Error(`Jaú Serve HTTP ${res.status}`);
    }

    const html = await res.text();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 3600_000);
    return parseJauServeHtml(html, ctx.term, now.toISOString(), expires.toISOString());
  },
};
