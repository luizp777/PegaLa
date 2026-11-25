import { createHash } from 'node:crypto';
import { parsePackFromTitle } from '../../../shared/packParser.js';
import type { PriceQuoteCandidate, StoreType } from '../../../shared/priceTypes.js';

export interface AdapterSearchContext {
  term: string;
  query?: string;
  cep: string;
  city?: string;
}

export interface RetailAdapter {
  slug: string;
  displayName: string;
  storeType: StoreType;
  search(ctx: AdapterSearchContext): Promise<PriceQuoteCandidate[]>;
}

export { parsePackFromTitle as parsePackServer };

export function buildProductKey(ean: string | null | undefined, title: string): string {
  if (ean && ean.trim().length > 0) return ean.trim().slice(0, 64);
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  if (slug.length > 0) return slug;
  return `p-${createHash('sha256').update(title || 'unknown').digest('hex').slice(0, 16)}`;
}
