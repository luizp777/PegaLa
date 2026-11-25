import { describe, expect, it } from 'vitest';
import type { NearbyStore, PriceQuoteCandidate } from '../../../shared/priceTypes';
import type { ShoppingItem } from '../../types';
import {
  checkRetailCategoryCompatibility,
  computePacksNeeded,
  computePriceComparison,
  parsePackFromTitle,
  scoreCandidateMatch,
} from '../priceEngine';

const NOW = Date.parse('2026-11-24T21:00:00.000Z');
const FUTURE = '2026-11-26T21:00:00.000Z';
const PAST = '2026-11-23T21:00:00.000Z';

function makeItem(partial: Partial<ShoppingItem> & { id: string; name: string; normalizedName: string }): ShoppingItem {
  return {
    listId: 'list-1',
    quantity: 1,
    unit: 'un',
    categoryId: 'mercearia',
    isChecked: false,
    checkedAt: null,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
    ...partial,
  };
}

function makeStore(partial: Partial<NearbyStore> & { id: string; name: string }): NearbyStore {
  return {
    chainSlug: null,
    storeType: 'mercado',
    lat: -23.55,
    lng: -46.63,
    distanceKm: 1.0,
    ...partial,
  };
}

function makeCandidate(
  partial: Partial<PriceQuoteCandidate> & {
    normalizedTerm: string;
    productTitle: string;
    priceCents: number;
  }
): PriceQuoteCandidate {
  return {
    storeId: null,
    chainSlug: 'mambo',
    productKey: partial.productTitle.toLowerCase().replace(/\s+/g, '-'),
    packQuantity: 1,
    packUnit: 'un',
    source: 'online',
    observedAt: '2026-11-24T20:00:00.000Z',
    expiresAt: FUTURE,
    ...partial,
  };
}

describe('parsePackFromTitle & computePacksNeeded', () => {
  it('extrai kg, g, L e ml corretamente do título', () => {
    expect(parsePackFromTitle('Arroz Tio João 5kg')).toEqual({ quantity: 5, unit: 'kg' });
    expect(parsePackFromTitle('Leite Integral Jussara 1 Litro')).toEqual({ quantity: 1, unit: 'L' });
    expect(parsePackFromTitle('Creme Dental 90gr')).toEqual({ quantity: 90, unit: 'g' });
  });

  it('calcula embalagens necessárias convertendo L/ml e kg/g', () => {
    expect(computePacksNeeded(2, 'L', 1000, 'ml')).toEqual({
      packsNeeded: 2,
      isApproximateUnit: false,
    });
    expect(computePacksNeeded(1.5, 'kg', 500, 'g')).toEqual({
      packsNeeded: 3,
      isApproximateUnit: false,
    });
    expect(computePacksNeeded(6, 'un', 1, 'kg')).toEqual({
      packsNeeded: 1,
      isApproximateUnit: true,
    });
    expect(computePacksNeeded(2, 'un', 200, 'g')).toEqual({
      packsNeeded: 2,
      isApproximateUnit: true,
    });
  });
});

describe('scoreCandidateMatch', () => {
  it('rejeita falsos positivos por termos negativos e categoria (ex.: refresco/suco para fruta)', () => {
    expect(scoreCandidateMatch('leite integral', 'Leite Condensado Moça 395g')).toBe(0);
    expect(scoreCandidateMatch('leite', 'Sabonete Nivea Leite 85g')).toBe(0);
    expect(scoreCandidateMatch('leite integral', 'Leite Integral Embalagem 1L')).toBeGreaterThan(0.7);
    expect(scoreCandidateMatch('laranja', 'Refresco em Pó Frisco Sabor Laranja com Acerola 18g', 'hortifruti')).toBe(0);
    expect(scoreCandidateMatch('laranja', 'Suco de Laranja Integral 1L', 'hortifruti')).toBe(0);
    expect(scoreCandidateMatch('laranja', 'Laranja Pera 1kg', 'hortifruti')).toBeGreaterThan(0.7);
    expect(scoreCandidateMatch('laranja', 'Laranja Pera Embalada 1kg', 'hortifruti')).toBeGreaterThan(0.7);
    expect(scoreCandidateMatch('leite integral', 'Leite Longa Vida Integral Jussara 1L')).toBeGreaterThan(0.7);
  });

  it('rejeita salgadinho/tempero para cebola de hortifruti mas permite quando o usuário pede salgadinho', () => {
    expect(scoreCandidateMatch('cebola', 'Salgadinho de Cebola Torcida 60g', 'hortifruti')).toBe(0);
    expect(scoreCandidateMatch('cebola', 'Salgadinho Elma Chips Cebolitos 55g', 'hortifruti')).toBe(0);
    expect(scoreCandidateMatch('cebola', 'Tempero Cebola e Salsa 30g', 'hortifruti')).toBe(0);
    expect(scoreCandidateMatch('cebola', 'Cebola Nacional Kg', 'hortifruti', '/Hortifruti/Legumes/')).toBeGreaterThan(0.7);
    expect(
      scoreCandidateMatch('cebola', 'Produto X Cebola', 'hortifruti', '/Mercearia/Salgadinhos/')
    ).toBe(0);
    expect(
      scoreCandidateMatch('salgadinho de cebola', 'Salgadinho de Cebola Torcida 60g', 'mercearia', '/Mercearia/Salgadinhos/')
    ).toBeGreaterThan(0.7);
  });

  it('verifica compatibilidade de retailCategory com CategoryId', () => {
    expect(checkRetailCategoryCompatibility('/Hortifruti/Legumes/', 'hortifruti')).toBe('match');
    expect(checkRetailCategoryCompatibility('/Mercearia/Iogurte/', 'laticinios')).toBe('match');
    expect(checkRetailCategoryCompatibility('/Mercearia/Salgadinhos/', 'hortifruti')).toBe('conflict');
    expect(checkRetailCategoryCompatibility(null, 'hortifruti')).toBe('neutral');
  });
});

describe('computePriceComparison', () => {
  it('ranqueia lojas por cobertura e menor total estimado, ignorando expirados', () => {
    const stores = [
      makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo', distanceKm: 1.2 }),
      makeStore({ id: 's2', name: 'Oba', chainSlug: 'obahortifruti', distanceKm: 0.8 }),
      makeStore({ id: 's3', name: 'Mercadinho Local', chainSlug: null, distanceKm: 0.3 }),
    ];

    const items = [
      makeItem({ id: 'i1', name: 'Leite integral', normalizedName: 'leite integral', quantity: 2, unit: 'L' }),
      makeItem({ id: 'i2', name: 'Arroz', normalizedName: 'arroz', quantity: 5, unit: 'kg' }),
    ];

    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productTitle: 'Leite Integral Jussara 1L',
        packQuantity: 1,
        packUnit: 'L',
        priceCents: 498,
      }),
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'arroz',
        productTitle: 'Arroz Tipo 1 Camil 5kg',
        packQuantity: 5,
        packUnit: 'kg',
        priceCents: 2690,
      }),
      makeCandidate({
        chainSlug: 'obahortifruti',
        normalizedTerm: 'leite integral',
        productTitle: 'Leite Integral Paulista 1L',
        packQuantity: 1,
        packUnit: 'L',
        priceCents: 549,
      }),
      makeCandidate({
        chainSlug: 'obahortifruti',
        normalizedTerm: 'arroz',
        productTitle: 'Arroz Tio João 5kg',
        packQuantity: 5,
        packUnit: 'kg',
        priceCents: 2990,
      }),
      // Expirado deve ser ignorado
      makeCandidate({
        chainSlug: 'obahortifruti',
        normalizedTerm: 'arroz',
        productTitle: 'Arroz Barato Expirado 5kg',
        packQuantity: 5,
        packUnit: 'kg',
        priceCents: 1000,
        expiresAt: PAST,
      }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.rankedStores).toHaveLength(2);
    expect(res.emptyStores.map((s) => s.id)).toEqual(['s3']);
    expect(res.rankedStores[0].store.id).toBe('s1');
    expect(res.rankedStores[0].estimatedFullTotalCents).toBe(498 * 2 + 2690);
    expect(res.rankedStores[0].savingsVsSecondCents).toBe(549 * 2 + 2990 - (498 * 2 + 2690));
  });

  it('prioriza preço colaborativo da loja física e respeita preferência do usuário', () => {
    const stores = [makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo' })];
    const items = [makeItem({ id: 'i1', name: 'Leite integral', normalizedName: 'leite integral' })];
    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productTitle: 'Leite Integral Online 1L',
        priceCents: 600,
        source: 'online',
      }),
      makeCandidate({
        storeId: 's1',
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-a',
        productTitle: 'Leite Integral Marca A 1L',
        priceCents: 450,
        source: 'community',
      }),
      makeCandidate({
        storeId: 's1',
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-b',
        productTitle: 'Leite Integral Marca B 1L',
        priceCents: 520,
        source: 'community',
      }),
    ];

    const pref = new Map([
      [
        'leite integral',
        {
          productKey: 'leite-b',
          title: 'Leite Integral Marca B 1L',
          packQuantity: 1,
          packUnit: 'L',
        },
      ],
    ]);

    const res = computePriceComparison({ stores, items, candidates, preferredByTerm: pref, nowMs: NOW });
    expect(res.rankedStores[0].matchedItems[0].candidate.productKey).toBe('leite-b');
    expect(res.rankedStores[0].matchedItems[0].source).toBe('community');
    expect(res.rankedStores[0].matchedItems[0].isPreferred).toBe(true);
  });

  it('sugere divisão em 2 lojas quando economia >= R$ 10 e >= 8%', () => {
    const stores = [
      makeStore({ id: 's1', name: 'Loja A', chainSlug: 'mambo' }),
      makeStore({ id: 's2', name: 'Loja B', chainSlug: 'obahortifruti' }),
    ];
    const items = [
      makeItem({ id: 'i1', name: 'Cafe', normalizedName: 'cafe' }),
      makeItem({ id: 'i2', name: 'Azeite', normalizedName: 'azeite' }),
    ];
    const candidates = [
      makeCandidate({ chainSlug: 'mambo', normalizedTerm: 'cafe', productTitle: 'Cafe 500g', priceCents: 1500 }),
      makeCandidate({ chainSlug: 'mambo', normalizedTerm: 'azeite', productTitle: 'Azeite 500ml', priceCents: 4500 }),
      makeCandidate({ chainSlug: 'obahortifruti', normalizedTerm: 'cafe', productTitle: 'Cafe 500g', priceCents: 3000 }),
      makeCandidate({ chainSlug: 'obahortifruti', normalizedTerm: 'azeite', productTitle: 'Azeite 500ml', priceCents: 2800 }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.bestSplit).not.toBeNull();
    expect(res.bestSplit?.totalCents).toBe(1500 + 2800);
    expect(res.bestSplit?.savingsCents).toBe(5800 - 4300);
  });

  it('valida duas confirmações de contas anônimas novas (0.5 + 0.5 >= 1.0) sobre preço online', () => {
    const stores = [makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo' })];
    const items = [makeItem({ id: 'i1', name: 'Leite integral', normalizedName: 'leite integral' })];
    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-online',
        productTitle: 'Leite Integral Online 1L',
        priceCents: 600,
        source: 'online',
      }),
      makeCandidate({
        storeId: 's1',
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-loja',
        productTitle: 'Leite Integral Loja 1L',
        priceCents: 440,
        source: 'community',
        weight: 0.5,
      }),
      makeCandidate({
        storeId: 's1',
        chainSlug: 'mambo',
        normalizedTerm: 'leite integral',
        productKey: 'leite-loja',
        productTitle: 'Leite Integral Loja 1L',
        priceCents: 480,
        source: 'community',
        weight: 0.5,
      }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.rankedStores[0].matchedItems[0].source).toBe('community');
    expect(res.rankedStores[0].matchedItems[0].effectiveTotalCents).toBe(460);
  });

  it('prioriza aderência de categoria e título sobre preço mais baixo em cebola de hortifruti', () => {
    const stores = [makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo' })];
    const items = [
      makeItem({
        id: 'i1',
        name: 'Cebola',
        normalizedName: 'cebola',
        quantity: 1,
        unit: 'kg',
        categoryId: 'hortifruti',
      }),
    ];
    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'cebola',
        productKey: 'torcida-cebola',
        productTitle: 'Salgadinho Torcida Cebola 60g',
        retailCategory: '/Mercearia/Salgadinhos/',
        packQuantity: 60,
        packUnit: 'g',
        priceCents: 249,
      }),
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'cebola',
        productKey: 'cebola-roxa-sem-cat',
        productTitle: 'Bandeja Cebola Roxa 500g',
        retailCategory: null,
        packQuantity: 500,
        packUnit: 'g',
        priceCents: 499,
      }),
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'cebola',
        productKey: 'cebola-nacional',
        productTitle: 'Cebola Nacional Kg',
        retailCategory: '/Hortifruti/Legumes/',
        packQuantity: 1,
        packUnit: 'kg',
        priceCents: 699,
      }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.rankedStores).toHaveLength(1);
    expect(res.rankedStores[0].matchedItems[0].candidate.productKey).toBe('cebola-nacional');
    expect(res.rankedStores[0].matchedItems[0].alternatives.map((a) => a.productKey)).not.toContain(
      'torcida-cebola'
    );
  });

  it('deixa o item sem preço quando só existem falsos positivos (ex.: salgadinho de cebola)', () => {
    const stores = [makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo' })];
    const items = [
      makeItem({
        id: 'i1',
        name: 'Cebola',
        normalizedName: 'cebola',
        quantity: 1,
        unit: 'kg',
        categoryId: 'hortifruti',
      }),
    ];
    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'cebola',
        productKey: 'cebolitos',
        productTitle: 'Salgadinho Cebolitos 55g',
        retailCategory: '/Mercearia/Salgadinhos/',
        packQuantity: 55,
        packUnit: 'g',
        priceCents: 399,
      }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.rankedStores).toHaveLength(0);
    expect(res.emptyStores).toHaveLength(1);
  });

  it('não penaliza embalagem pequena quando o usuário pediu explicitamente quantidade pequena em gramas', () => {
    const stores = [makeStore({ id: 's1', name: 'Mambo', chainSlug: 'mambo' })];
    const items = [
      makeItem({
        id: 'i1',
        name: 'Alho',
        normalizedName: 'alho',
        quantity: 100,
        unit: 'g',
        categoryId: 'hortifruti',
      }),
    ];
    const candidates = [
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'alho',
        productKey: 'alho-100g',
        productTitle: 'Alho Roxo 100g',
        retailCategory: '/Hortifruti/Legumes/',
        packQuantity: 100,
        packUnit: 'g',
        priceCents: 399,
      }),
      makeCandidate({
        chainSlug: 'mambo',
        normalizedTerm: 'alho',
        productKey: 'alho-500g',
        productTitle: 'Alho Roxo 500g',
        retailCategory: '/Hortifruti/Legumes/',
        packQuantity: 500,
        packUnit: 'g',
        priceCents: 1690,
      }),
    ];

    const res = computePriceComparison({ stores, items, candidates, nowMs: NOW });
    expect(res.rankedStores[0].matchedItems[0].candidate.productKey).toBe('alho-100g');
  });
});
