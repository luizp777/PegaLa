import { parsePackFromTitle, type ParsedPack } from '../../shared/packParser';
import type {
  NearbyStore,
  PreferredProduct,
  PriceQuoteCandidate,
  PriceSource,
} from '../../shared/priceTypes';
import type { CategoryId, ShoppingItem } from '../types';
import { normalizeText } from './dictionaryPtBr';

export { parsePackFromTitle, type ParsedPack };

/**
 * Item individual casado em uma loja dentro do comparativo.
 */
export interface MatchedStoreItem {
  item: ShoppingItem;
  candidate: PriceQuoteCandidate;
  alternatives: PriceQuoteCandidate[];
  packsNeeded: number;
  effectiveTotalCents: number;
  isApproximateUnit: boolean;
  isPreferred: boolean;
  source: PriceSource;
  observedAt: string;
}

/**
 * Resultado consolidado para uma única loja no ranking.
 */
export interface StoreComparisonResult {
  store: NearbyStore;
  matchedItems: MatchedStoreItem[];
  missingItems: ShoppingItem[];
  matchedCount: number;
  totalItems: number;
  coverageRatio: number;
  matchedTotalCents: number;
  estimatedFullTotalCents: number;
  comparableTotalCents: number | null;
  hasEstimatedMissing: boolean;
  savingsVsSecondCents: number;
}

/**
 * Sugestão de divisão da compra em duas lojas quando gera economia relevante.
 */
export interface SplitTwoStoresResult {
  storeA: NearbyStore;
  storeB: NearbyStore;
  itemsA: MatchedStoreItem[];
  itemsB: MatchedStoreItem[];
  missingItems: ShoppingItem[];
  totalCents: number;
  savingsCents: number;
  savingsRatio: number;
}

/**
 * Resultado completo do motor de comparação de preços.
 */
export interface PriceComparisonResult {
  rankedStores: StoreComparisonResult[];
  emptyStores: NearbyStore[];
  bestSplit: SplitTwoStoresResult | null;
  totalItems: number;
}

const NEGATIVE_GUARD_RULES: Array<{ trigger: string; forbidden: string[] }> = [
  {
    trigger: 'leite',
    forbidden: [
      'condensado',
      'em po',
      'de coco',
      'creme de leite',
      'doce de leite',
      'chocolate',
      'biscoito',
      'sabonete',
      'bala',
      'sorvete',
      'gelato',
    ],
  },
  {
    trigger: 'arroz',
    forbidden: ['doce', 'farinha', 'biscoito', 'bolacha', 'flocos'],
  },
  {
    trigger: 'cafe',
    forbidden: ['biscoito', 'bala', 'chocolate', 'capuccino', 'cappuccino'],
  },
  {
    trigger: 'acucar',
    forbidden: ['biscoito', 'refrigerante', 'zero acucar'],
  },
  {
    trigger: 'ovo',
    forbidden: ['pascoa', 'chocolate', 'macarrao'],
  },
  {
    trigger: 'pao',
    forbidden: ['queijo', 'farinha de', 'ralado'],
  },
];

const CATEGORY_FORBIDDEN_TOKENS: Partial<Record<CategoryId, string[]>> = {
  hortifruti: [
    'suco',
    'refresco',
    'nectar',
    'em po',
    'sabor',
    'refrigerante',
    'bala',
    'chiclete',
    'biscoito',
    'bolacha',
    'bolo',
    'gelatina',
    'iogurte',
    'sobremesa',
    'pudim',
    'sorvete',
    'gelato',
    'sabonete',
    'shampoo',
    'condicionador',
    'detergente',
    'desinfetante',
    'amaciante',
    'essencia',
    'aromatizante',
    'extrato',
    'molho',
    'ketchup',
    'catchup',
    'polpa',
    'caldo',
    'tempero',
    'chips',
  ],
  acougue: [
    'caldo',
    'tempero',
    'miojo',
    'macarrao',
    'salgadinho',
    'sabor',
    'racao',
    'petisco',
  ],
};

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'para', 'e', 'em', 'c']);

function toBaseUnit(quantity: number, unit: string): { value: number; family: 'mass' | 'vol' | 'unit' } {
  const u = unit.trim().toLowerCase();
  if (u === 'kg') return { value: quantity * 1000, family: 'mass' };
  if (u === 'g' || u === 'gr') return { value: quantity, family: 'mass' };
  if (u === 'l' || u === 'lt') return { value: quantity * 1000, family: 'vol' };
  if (u === 'ml') return { value: quantity, family: 'vol' };
  return { value: quantity, family: 'unit' };
}

/**
 * Calcula quantas embalagens de um produto são necessárias para atender à quantidade da lista.
 *
 * @param itemQty - Quantidade solicitada na lista.
 * @param itemUnit - Unidade do item na lista.
 * @param packQty - Quantidade da embalagem do produto na loja.
 * @param packUnit - Unidade da embalagem do produto na loja.
 * @returns Número inteiro de embalagens (`>= 1`) e flag indicando se a unidade é aproximada.
 */
export function computePacksNeeded(
  itemQty: number,
  itemUnit: string,
  packQty: number,
  packUnit: string
): { packsNeeded: number; isApproximateUnit: boolean } {
  const safeItemQty = itemQty > 0 ? itemQty : 1;
  const safePackQty = packQty > 0 ? packQty : 1;

  const listBase = toBaseUnit(safeItemQty, itemUnit);
  const packBase = toBaseUnit(safePackQty, packUnit);

  if (listBase.family === packBase.family) {
    if (listBase.family === 'unit') {
      const sameUnit = itemUnit.trim().toLowerCase() === packUnit.trim().toLowerCase();
      return {
        packsNeeded: Math.max(1, Math.ceil(listBase.value / packBase.value)),
        isApproximateUnit: !sameUnit,
      };
    }
    return {
      packsNeeded: Math.max(1, Math.ceil(listBase.value / packBase.value)),
      isApproximateUnit: false,
    };
  }

  // Quando o item da lista está em "un" mas a oferta da loja é em peso/volume relevante (>= 500g/500ml),
  // assume 1 embalagem/kg como estimativa conservadora em vez de multiplicar pelo número de unidades.
  if (
    listBase.family === 'unit' &&
    itemUnit.trim().toLowerCase() === 'un' &&
    packBase.value >= 500
  ) {
    return {
      packsNeeded: 1,
      isApproximateUnit: true,
    };
  }

  return {
    packsNeeded: Math.max(1, Math.ceil(safeItemQty)),
    isApproximateUnit: true,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsForbiddenTerm(normalizedText: string, term: string): boolean {
  const escaped = escapeRegExp(term).replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(normalizedText);
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/**
 * Calcula o score de relevância textual entre um termo da lista e um título de produto (`0..1`).
 *
 * @param normalizedTerm - Termo normalizado da lista.
 * @param productTitle - Título do produto retornado pela loja.
 * @param categoryId - Categoria opcional do item para evitar falsos positivos (ex.: refresco em pó para fruta).
 * @returns Score de 0 a 1 (valores `< 0.45` devem ser descartados).
 */
export function scoreCandidateMatch(
  normalizedTerm: string,
  productTitle: string,
  categoryId?: CategoryId
): number {
  const normTerm = normalizeText(normalizedTerm);
  const normTitle = normalizeText(productTitle);
  if (!normTerm || !normTitle) return 0;

  if (categoryId) {
    const catForbidden = CATEGORY_FORBIDDEN_TOKENS[categoryId];
    if (catForbidden) {
      for (const bad of catForbidden) {
        if (!containsForbiddenTerm(normTerm, bad) && containsForbiddenTerm(normTitle, bad)) {
          return 0;
        }
      }
    }
  }

  for (const rule of NEGATIVE_GUARD_RULES) {
    if (containsForbiddenTerm(normTerm, rule.trigger)) {
      for (const bad of rule.forbidden) {
        if (!containsForbiddenTerm(normTerm, bad) && containsForbiddenTerm(normTitle, bad)) {
          return 0;
        }
      }
    }
  }

  const termTokens = tokenize(normTerm);
  const titleTokens = tokenize(normTitle);
  if (termTokens.length === 0 || titleTokens.length === 0) return 0;

  let hits = 0;
  for (const token of termTokens) {
    if (
      titleTokens.some(
        (tt) =>
          tt === token ||
          (token.length >= 3 && tt.length >= 3 && (tt.startsWith(token) || token.startsWith(tt)))
      )
    ) {
      hits += 1;
    }
  }

  const recall = hits / termTokens.length;
  if (recall < 1 && termTokens.length <= 2) {
    return recall * 0.4;
  }

  const firstTokenBoost = titleTokens[0] === termTokens[0] ? 0.15 : 0;
  return Math.min(1, recall * 0.85 + firstTokenBoost);
}

function isCandidateFresh(candidate: PriceQuoteCandidate, nowMs: number): boolean {
  const exp = Date.parse(candidate.expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp > nowMs;
}

function selectCandidatesForStore(
  store: NearbyStore,
  item: ShoppingItem,
  allCandidates: PriceQuoteCandidate[],
  preferred: PreferredProduct | undefined,
  nowMs: number
): MatchedStoreItem | null {
  const storeSpecific: PriceQuoteCandidate[] = [];
  const chainOnline: PriceQuoteCandidate[] = [];

  for (const c of allCandidates) {
    if (c.normalizedTerm !== item.normalizedName) continue;
    if (!isCandidateFresh(c, nowMs)) continue;

    if (c.storeId && c.storeId === store.id) {
      storeSpecific.push(c);
    } else if (!c.storeId && store.chainSlug && c.chainSlug === store.chainSlug) {
      chainOnline.push(c);
    }
  }

  // Prioridade: comunidade da loja física (soma de pesos >= 1.0 por produto) -> online da rede
  const byProductKey = new Map<string, PriceQuoteCandidate[]>();
  for (const c of storeSpecific) {
    const groupKey = c.productKey || c.normalizedTerm;
    const arr = byProductKey.get(groupKey) ?? [];
    arr.push(c);
    byProductKey.set(groupKey, arr);
  }

  const validCommunity: PriceQuoteCandidate[] = [];
  for (const group of byProductKey.values()) {
    const totalWeight = group.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    if (totalWeight >= 1.0) {
      const sorted = [...group].sort((a, b) => a.priceCents - b.priceCents);
      const mid = sorted[Math.floor(sorted.length / 2)];
      validCommunity.push({
        ...mid,
        priceCents: median(sorted.map((c) => c.priceCents)),
      });
    }
  }

  const pool =
    validCommunity.length > 0
      ? validCommunity
      : storeSpecific.length > 0 && chainOnline.length === 0
        ? storeSpecific
        : chainOnline;

  if (pool.length === 0) return null;

  const scored = pool
    .map((candidate) => {
      const isCommunity = candidate.source !== 'online';
      const score = isCommunity
        ? 1.0
        : scoreCandidateMatch(item.normalizedName, candidate.productTitle, item.categoryId);
      if (score < 0.45) return null;

      const parsedPack =
        candidate.packQuantity > 0 && candidate.packUnit
          ? { quantity: candidate.packQuantity, unit: candidate.packUnit }
          : parsePackFromTitle(candidate.productTitle);

      const { packsNeeded, isApproximateUnit } = computePacksNeeded(
        item.quantity,
        item.unit,
        parsedPack.quantity,
        parsedPack.unit
      );

      const effectiveTotalCents = candidate.priceCents * packsNeeded;
      const isPreferred = Boolean(
        preferred &&
          (candidate.productKey === preferred.productKey ||
            (preferred.ean && candidate.ean === preferred.ean))
      );

      return {
        candidate,
        packsNeeded,
        effectiveTotalCents,
        isApproximateUnit,
        isPreferred,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scored.length === 0) return null;

  scored.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return a.effectiveTotalCents - b.effectiveTotalCents;
  });

  const best = scored[0];
  return {
    item,
    candidate: best.candidate,
    alternatives: scored.slice(0, 5).map((s) => s.candidate),
    packsNeeded: best.packsNeeded,
    effectiveTotalCents: best.effectiveTotalCents,
    isApproximateUnit: best.isApproximateUnit,
    isPreferred: best.isPreferred,
    source: best.candidate.source,
    observedAt: best.candidate.observedAt,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Executa o motor de matching, normalização e ranking completo no cliente.
 *
 * @param params - Lojas próximas, itens da lista, cotações disponíveis e preferências locais.
 * @returns Ranking por loja única, lojas sem cobertura e melhor divisão em 2 lojas.
 */
export function computePriceComparison(params: {
  stores: NearbyStore[];
  items: ShoppingItem[];
  candidates: PriceQuoteCandidate[];
  preferredByTerm?: Map<string, PreferredProduct>;
  nowMs?: number;
}): PriceComparisonResult {
  const { stores, items, candidates, preferredByTerm, nowMs = Date.now() } = params;
  if (items.length === 0 || stores.length === 0) {
    return {
      rankedStores: [],
      emptyStores: stores,
      bestSplit: null,
      totalItems: items.length,
    };
  }

  const rawByStore = stores.map((store) => {
    const matchedItems: MatchedStoreItem[] = [];
    const missingItems: ShoppingItem[] = [];

    for (const item of items) {
      const pref = preferredByTerm?.get(item.normalizedName);
      const matched = selectCandidatesForStore(store, item, candidates, pref, nowMs);
      if (matched) {
        matchedItems.push(matched);
      } else {
        missingItems.push(item);
      }
    }

    return { store, matchedItems, missingItems };
  });

  const nonEmpty = rawByStore.filter((r) => r.matchedItems.length > 0);
  const emptyStores = rawByStore
    .filter((r) => r.matchedItems.length === 0)
    .map((r) => r.store);

  // Mediana regional por item para estimar itens faltantes de forma justa
  const pricesByItemId = new Map<string, number[]>();
  for (const r of nonEmpty) {
    for (const m of r.matchedItems) {
      const arr = pricesByItemId.get(m.item.id) ?? [];
      arr.push(m.effectiveTotalCents);
      pricesByItemId.set(m.item.id, arr);
    }
  }
  const medianByItemId = new Map<string, number>();
  for (const [itemId, values] of pricesByItemId) {
    medianByItemId.set(itemId, median(values));
  }

  const maxCoverage = nonEmpty.reduce(
    (max, r) => Math.max(max, r.matchedItems.length / items.length),
    0
  );
  const highCoverageThreshold = maxCoverage >= 0.7 ? 0.7 : maxCoverage;

  const rankedStores: StoreComparisonResult[] = nonEmpty.map((r) => {
    const matchedTotalCents = r.matchedItems.reduce((sum, m) => sum + m.effectiveTotalCents, 0);
    let missingMedianSum = 0;
    let hasEstimatedMissing = false;
    for (const missing of r.missingItems) {
      const med = medianByItemId.get(missing.id);
      if (med !== undefined && med > 0) {
        missingMedianSum += med;
        hasEstimatedMissing = true;
      }
    }

    return {
      store: r.store,
      matchedItems: r.matchedItems,
      missingItems: r.missingItems,
      matchedCount: r.matchedItems.length,
      totalItems: items.length,
      coverageRatio: r.matchedItems.length / items.length,
      matchedTotalCents,
      estimatedFullTotalCents: matchedTotalCents + missingMedianSum,
      comparableTotalCents: null,
      hasEstimatedMissing,
      savingsVsSecondCents: 0,
    };
  });

  rankedStores.sort((a, b) => {
    const aHigh = a.coverageRatio >= highCoverageThreshold;
    const bHigh = b.coverageRatio >= highCoverageThreshold;
    if (aHigh !== bHigh) return aHigh ? -1 : 1;
    if (a.estimatedFullTotalCents !== b.estimatedFullTotalCents) {
      return a.estimatedFullTotalCents - b.estimatedFullTotalCents;
    }
    if (a.matchedCount !== b.matchedCount) {
      return b.matchedCount - a.matchedCount;
    }
    return a.store.distanceKm - b.store.distanceKm;
  });

  // Calcula total comparável (itens presentes em todo o top 5)
  const top5 = rankedStores.slice(0, 5);
  if (top5.length > 1) {
    const commonItemIds = new Set(top5[0].matchedItems.map((m) => m.item.id));
    for (let i = 1; i < top5.length; i++) {
      const ids = new Set(top5[i].matchedItems.map((m) => m.item.id));
      for (const id of commonItemIds) {
        if (!ids.has(id)) commonItemIds.delete(id);
      }
    }
    if (commonItemIds.size > 0) {
      for (const entry of top5) {
        entry.comparableTotalCents = entry.matchedItems
          .filter((m) => commonItemIds.has(m.item.id))
          .reduce((sum, m) => sum + m.effectiveTotalCents, 0);
      }
    }
  }

  if (rankedStores.length >= 2) {
    rankedStores[0].savingsVsSecondCents = Math.max(
      0,
      rankedStores[1].estimatedFullTotalCents - rankedStores[0].estimatedFullTotalCents
    );
  }

  // Melhor combinação em 2 lojas (força bruta nas 8 melhores)
  let bestSplit: SplitTwoStoresResult | null = null;
  if (rankedStores.length >= 2) {
    const bestSingle = rankedStores[0];
    const pool = rankedStores.slice(0, 8);

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i];
        const b = pool[j];
        const mapA = new Map(a.matchedItems.map((m) => [m.item.id, m]));
        const mapB = new Map(b.matchedItems.map((m) => [m.item.id, m]));

        const itemsA: MatchedStoreItem[] = [];
        const itemsB: MatchedStoreItem[] = [];
        const missingItems: ShoppingItem[] = [];
        let splitMatchedCents = 0;
        let splitMissingMedian = 0;

        for (const item of items) {
          const mA = mapA.get(item.id);
          const mB = mapB.get(item.id);
          if (mA && mB) {
            if (mA.effectiveTotalCents <= mB.effectiveTotalCents) {
              itemsA.push(mA);
              splitMatchedCents += mA.effectiveTotalCents;
            } else {
              itemsB.push(mB);
              splitMatchedCents += mB.effectiveTotalCents;
            }
          } else if (mA) {
            itemsA.push(mA);
            splitMatchedCents += mA.effectiveTotalCents;
          } else if (mB) {
            itemsB.push(mB);
            splitMatchedCents += mB.effectiveTotalCents;
          } else {
            missingItems.push(item);
            splitMissingMedian += medianByItemId.get(item.id) ?? 0;
          }
        }

        const totalCovered = itemsA.length + itemsB.length;
        if (totalCovered < bestSingle.matchedCount || itemsA.length === 0 || itemsB.length === 0) {
          continue;
        }

        const fullSplitCents = splitMatchedCents + splitMissingMedian;
        const savingsCents = bestSingle.estimatedFullTotalCents - fullSplitCents;
        const savingsRatio =
          bestSingle.estimatedFullTotalCents > 0
            ? savingsCents / bestSingle.estimatedFullTotalCents
            : 0;

        if (savingsCents >= 1000 && savingsRatio >= 0.08) {
          if (!bestSplit || fullSplitCents < bestSplit.totalCents) {
            bestSplit = {
              storeA: a.store,
              storeB: b.store,
              itemsA,
              itemsB,
              missingItems,
              totalCents: fullSplitCents,
              savingsCents,
              savingsRatio,
            };
          }
        }
      }
    }
  }

  return {
    rankedStores,
    emptyStores,
    bestSplit,
    totalItems: items.length,
  };
}
