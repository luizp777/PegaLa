import { tausteAdapter } from './magentoAdapter.ts';
import { confiancaAdapter } from './occAdapter.ts';
import { jauServeAdapter } from './sfccAdapter.ts';
import type { RetailAdapter } from './types.ts';
import { createVtexAdapter } from './vtexAdapter.ts';

const ALL_ADAPTERS: RetailAdapter[] = [
  // Mercados / Atacado / Hortifruti / Carnes
  createVtexAdapter({
    slug: 'mambo',
    displayName: 'Mambo Supermercados',
    storeType: 'mercado',
    host: 'https://www.mambo.com.br',
  }),
  createVtexAdapter({
    slug: 'obahortifruti',
    displayName: 'Oba Hortifruti',
    storeType: 'mercado',
    host: 'https://www.obahortifruti.com.br',
  }),
  createVtexAdapter({
    slug: 'swift',
    displayName: 'Swift',
    storeType: 'mercado',
    host: 'https://www.swift.com.br',
  }),
  createVtexAdapter({
    slug: 'samsclub',
    displayName: "Sam's Club",
    storeType: 'mercado',
    host: 'https://www.samsclub.com.br',
  }),
  confiancaAdapter,
  tausteAdapter,
  jauServeAdapter,
  // Farmácias
  createVtexAdapter({
    slug: 'drogariasaopaulo',
    displayName: 'Drogaria São Paulo',
    storeType: 'farmacia',
    host: 'https://www.drogariasaopaulo.com.br',
  }),
  createVtexAdapter({
    slug: 'drogariaspacheco',
    displayName: 'Drogarias Pacheco',
    storeType: 'farmacia',
    host: 'https://www.drogariaspacheco.com.br',
  }),
  createVtexAdapter({
    slug: 'paguemenos',
    displayName: 'Farmácias Pague Menos',
    storeType: 'farmacia',
    host: 'https://www.paguemenos.com.br',
  }),
];

const ADAPTER_BY_SLUG = new Map(ALL_ADAPTERS.map((a) => [a.slug, a]));

/**
 * Retorna os adaptadores habilitados pela variável `PRICE_ADAPTERS_ENABLED` (`all`, `none`, ou lista separada por vírgula).
 */
export function getEnabledAdapters(requestedSlugs?: string[]): RetailAdapter[] {
  const flag = (process.env.PRICE_ADAPTERS_ENABLED ?? 'all').trim().toLowerCase();
  if (flag === 'none' || flag === 'false' || flag === '0') {
    return [];
  }

  const allowedSet =
    flag === 'all' || flag === ''
      ? null
      : new Set(
          flag
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );

  const base = requestedSlugs
    ? requestedSlugs.map((s) => ADAPTER_BY_SLUG.get(s)).filter((a): a is RetailAdapter => Boolean(a))
    : ALL_ADAPTERS;

  return allowedSet ? base.filter((a) => allowedSet.has(a.slug)) : base;
}
