import {
  isPersistedStoreId,
  type PriceQuoteCandidate,
  type QuotesStreamEvent,
  type QuoteTermInput,
} from '../../shared/priceTypes.js';
import { getEnabledAdapters } from './_adapters/index.js';
import {
  authenticateRequest,
  checkRateLimit,
  createSupabaseAdmin,
  hashClientIp,
  jsonResponse,
  validateSameOrigin,
} from './_shared/security.js';

interface QuotesRequestBody {
  cep?: string;
  city?: string;
  chains?: string[];
  storeIds?: string[];
  terms?: QuoteTermInput[];
}

interface StorePriceDbRow {
  id: string;
  store_id: string | null;
  chain_slug: string | null;
  normalized_term: string;
  product_key: string;
  product_title: string;
  brand: string | null;
  ean: string | null;
  pack_quantity: number;
  pack_unit: string;
  price_cents: number;
  source: 'online' | 'community' | 'nfce';
  weight: number;
  observed_at: string;
  expires_at: string;
}

function mapDbRowToCandidate(row: StorePriceDbRow): PriceQuoteCandidate {
  return {
    id: row.id,
    storeId: row.store_id,
    chainSlug: row.chain_slug,
    normalizedTerm: row.normalized_term,
    productKey: row.product_key,
    productTitle: row.product_title,
    brand: row.brand,
    ean: row.ean,
    packQuantity: Number(row.pack_quantity) || 1,
    packUnit: row.pack_unit || 'un',
    priceCents: row.price_cents,
    source: row.source,
    observedAt: row.observed_at,
    expiresAt: row.expires_at,
    weight: Number(row.weight) || 1,
  };
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      await tasks[current]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
}

/**
 * Serverless Function (`POST /api/prices/quotes`) que emite cotações em stream NDJSON:
 * envia imediatamente o cache válido do Supabase, consulta os adaptadores habilitados em paralelo
 * e persiste novos preços online via RPC server-only `upsert_online_prices`.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    try {
      if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    const originErr = validateSameOrigin(req);
    if (originErr) return originErr;

    const userId = await authenticateRequest(req);
    if (!userId) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const ipHash = hashClientIp(req);
    const [userOk, ipOk] = await Promise.all([
      checkRateLimit(`quotes:u:${userId}`, 20),
      checkRateLimit(`quotes:ip:${ipHash}`, 60),
    ]);
    if (!userOk || !ipOk) {
      return jsonResponse({ error: 'Limite de consultas atingido. Tente em alguns minutos.' }, 429);
    }

    let body: QuotesRequestBody;
    try {
      body = (await req.json()) as QuotesRequestBody;
    } catch {
      return jsonResponse({ error: 'Malformed JSON' }, 400);
    }

    const cleanCep = (body.cep ?? '').replace(/\D/g, '').slice(0, 8);
    const hasRealCep = cleanCep.length >= 5;
    const cepPrefix = hasRealCep ? cleanCep.slice(0, 5) : '00000';
    const city = typeof body.city === 'string' ? body.city.slice(0, 80) : undefined;
    const requestedChains = Array.isArray(body.chains)
      ? [...new Set(body.chains.filter((c): c is string => typeof c === 'string'))].slice(0, 12)
      : [];
    const storeIds = Array.isArray(body.storeIds)
      ? [
          ...new Set(
            body.storeIds.filter((s): s is string => typeof s === 'string' && isPersistedStoreId(s))
          ),
        ].slice(0, 12)
      : [];
    const terms = Array.isArray(body.terms)
      ? body.terms
          .filter((t): t is QuoteTermInput => Boolean(t && typeof t.normalizedTerm === 'string'))
          .slice(0, 60)
      : [];

    if (terms.length === 0) {
      return jsonResponse({ error: 'Nenhum item informado para comparação.' }, 400);
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return jsonResponse({ error: 'Supabase não configurado no servidor.' }, 503);
    }

    const adapters = getEnabledAdapters(requestedChains);
    const uniqueTerms = [...new Set(terms.map((t) => t.normalizedTerm.trim().toLowerCase()).filter(Boolean))];
    const nowIso = new Date().toISOString();

    const encoder = new TextEncoder();

    let streamClosed = false;
    const stream = new ReadableStream({
      cancel() {
        streamClosed = true;
      },
      async start(controller) {
        const emit = (event: QuotesStreamEvent) => {
          if (streamClosed || req.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            streamClosed = true;
          }
        };

        try {
          // 1. Cache-first no Supabase (preços online válidos + comunidade das lojas)
          const cachedCandidates: PriceQuoteCandidate[] = [];

          if (storeIds.length > 0) {
            const { data: storePrices, error: storeErr } = await admin
              .from('store_prices')
              .select(
                'id, store_id, chain_slug, normalized_term, product_key, product_title, brand, ean, pack_quantity, pack_unit, price_cents, source, weight, observed_at, expires_at'
              )
              .in('store_id', storeIds)
              .in('normalized_term', uniqueTerms)
              .gt('expires_at', nowIso)
              .order('observed_at', { ascending: false })
              .limit(1000);
            if (storeErr) {
              console.warn('[PegaLa:Quotes] Erro ao ler cache por loja', storeErr.message);
            } else if (storePrices) {
              cachedCandidates.push(...(storePrices as StorePriceDbRow[]).map(mapDbRowToCandidate));
            }
          }

          if (requestedChains.length > 0 && hasRealCep) {
            const { data: onlinePrices, error: onlineErr } = await admin
              .from('store_prices')
              .select(
                'id, store_id, chain_slug, normalized_term, product_key, product_title, brand, ean, pack_quantity, pack_unit, price_cents, source, weight, observed_at, expires_at'
              )
              .eq('source', 'online')
              .eq('cep_prefix', cepPrefix)
              .in('chain_slug', requestedChains)
              .in('normalized_term', uniqueTerms)
              .gt('expires_at', nowIso)
              .order('observed_at', { ascending: false })
              .limit(1500);
            if (onlineErr) {
              console.warn('[PegaLa:Quotes] Erro ao ler cache online', onlineErr.message);
            } else if (onlinePrices) {
              cachedCandidates.push(...(onlinePrices as StorePriceDbRow[]).map(mapDbRowToCandidate));
            }
          }

          emit({ type: 'cache', candidates: cachedCandidates });

          // 2. Identifica (chain, term) sem cache online válido
          const cachedPairs = new Set(
            cachedCandidates
              .filter((c) => c.source === 'online' && c.chainSlug)
              .map((c) => `${c.chainSlug}:${c.normalizedTerm}`)
          );

          const failedChainsSet = new Set<string>();
          const upsertBuffer = new Map<string, Record<string, unknown>>();
          const tasks: Array<() => Promise<void>> = [];
          const deadlineMs = Date.now() + 8500;

          const flushUpsertBuffer = async () => {
            if (!hasRealCep || upsertBuffer.size === 0) return;
            const batch = Array.from(upsertBuffer.values());
            upsertBuffer.clear();
            for (let i = 0; i < batch.length; i += 80) {
              const chunk = batch.slice(i, i + 80);
              const { error: upsertErr } = await admin.rpc('upsert_online_prices', {
                p_rows: chunk,
              });
              if (upsertErr) {
                console.warn('[PegaLa:Quotes] Falha ao gravar cache online em lote', upsertErr.message);
              }
            }
          };

          for (const adapter of adapters) {
            for (const term of uniqueTerms) {
              if (cachedPairs.has(`${adapter.slug}:${term}`)) continue;

              tasks.push(async () => {
                if (streamClosed || req.signal.aborted || Date.now() >= deadlineMs) return;
                try {
                  const candidates = await adapter.search({
                    term,
                    cep: cleanCep || '01310100',
                    city,
                  });
                  emit({
                    type: 'chain',
                    chainSlug: adapter.slug,
                    normalizedTerm: term,
                    candidates,
                  });

                  if (hasRealCep) {
                    for (const c of candidates) {
                      const dedupeKey = `${c.chainSlug ?? ''}:${cepPrefix}:${c.normalizedTerm}:${c.productKey}`;
                      upsertBuffer.set(dedupeKey, {
                        store_id: null,
                        chain_slug: c.chainSlug,
                        cep_prefix: cepPrefix,
                        normalized_term: c.normalizedTerm,
                        product_key: c.productKey,
                        product_title: c.productTitle,
                        brand: c.brand ?? null,
                        ean: c.ean ?? null,
                        pack_quantity: c.packQuantity,
                        pack_unit: c.packUnit,
                        price_cents: c.priceCents,
                        source: 'online',
                        observed_at: c.observedAt,
                        expires_at: c.expiresAt,
                      });
                    }
                    if (upsertBuffer.size >= 60) {
                      await flushUpsertBuffer();
                    }
                  }
                } catch {
                  failedChainsSet.add(adapter.slug);
                }
              });
            }
          }

          await runWithConcurrency(tasks, 6);
          await flushUpsertBuffer();

          emit({ type: 'done', failedChains: Array.from(failedChainsSet) });
        } catch {
          emit({ type: 'done', failedChains: adapters.map((a) => a.slug) });
        } finally {
          if (!streamClosed) {
            streamClosed = true;
            try {
              controller.close();
            } catch {
              // Já fechado
            }
          }
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
    } catch (err) {
      console.error('[PegaLa:Quotes] Erro inesperado', err);
      return jsonResponse({ error: 'Erro interno ao consultar cotações.' }, 500);
    }
  },
};
