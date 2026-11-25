import type { PriceQuoteCandidate, QuotesStreamEvent, QuoteTermInput } from '../../shared/priceTypes.js';
import { getEnabledAdapters } from './_adapters/index.js';
import {
  authenticateRequest,
  buildSupabaseServiceHeaders,
  checkRateLimit,
  getSupabaseServerConfig,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatPostgrestIn(values: string[]): string {
  return values
    .map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',');
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
    const cepPrefix = cleanCep.length >= 5 ? cleanCep.slice(0, 5) : '00000';
    const city = typeof body.city === 'string' ? body.city.slice(0, 80) : undefined;
    const requestedChains = Array.isArray(body.chains)
      ? [...new Set(body.chains.filter((c): c is string => typeof c === 'string'))].slice(0, 12)
      : [];
    const storeIds = Array.isArray(body.storeIds)
      ? [
          ...new Set(
            body.storeIds.filter((s): s is string => typeof s === 'string' && UUID_RE.test(s))
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

    const cfg = getSupabaseServerConfig();
    if (!cfg) {
      return jsonResponse({ error: 'Supabase não configurado no servidor.' }, 503);
    }

    const sbHeaders = buildSupabaseServiceHeaders(cfg.serviceKey);

    const adapters = getEnabledAdapters(requestedChains);
    const uniqueTerms = [...new Set(terms.map((t) => t.normalizedTerm.trim().toLowerCase()).filter(Boolean))];
    const nowIso = new Date().toISOString();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: QuotesStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          // 1. Cache-first no Supabase (preços online válidos + comunidade das lojas)
          const cachedCandidates: PriceQuoteCandidate[] = [];
          const termsFilter = formatPostgrestIn(uniqueTerms);

          if (storeIds.length > 0) {
            const storeFilter = formatPostgrestIn(storeIds);
            const storeUrl =
              `${cfg.url}/rest/v1/store_prices?store_id=in.(${encodeURIComponent(storeFilter)})` +
              `&normalized_term=in.(${encodeURIComponent(termsFilter)})` +
              `&expires_at=gt.${encodeURIComponent(nowIso)}&limit=500`;
            const res = await fetch(storeUrl, { headers: sbHeaders, signal: AbortSignal.timeout(3500) });
            if (res.ok) {
              const rows = (await res.json()) as StorePriceDbRow[];
              cachedCandidates.push(...rows.map(mapDbRowToCandidate));
            }
          }

          if (requestedChains.length > 0) {
            const chainFilter = formatPostgrestIn(requestedChains);
            const onlineUrl =
              `${cfg.url}/rest/v1/store_prices?source=eq.online` +
              `&cep_prefix=eq.${encodeURIComponent(cepPrefix)}` +
              `&chain_slug=in.(${encodeURIComponent(chainFilter)})` +
              `&normalized_term=in.(${encodeURIComponent(termsFilter)})` +
              `&expires_at=gt.${encodeURIComponent(nowIso)}&limit=800`;
            const res = await fetch(onlineUrl, { headers: sbHeaders, signal: AbortSignal.timeout(3500) });
            if (res.ok) {
              const rows = (await res.json()) as StorePriceDbRow[];
              cachedCandidates.push(...rows.map(mapDbRowToCandidate));
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
          const tasks: Array<() => Promise<void>> = [];

          for (const adapter of adapters) {
            for (const term of uniqueTerms) {
              if (cachedPairs.has(`${adapter.slug}:${term}`)) continue;

              tasks.push(async () => {
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

                  if (candidates.length > 0) {
                    const rows = candidates.map((c) => ({
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
                    }));

                    const upsertRes = await fetch(`${cfg.url}/rest/v1/rpc/upsert_online_prices`, {
                      method: 'POST',
                      headers: sbHeaders,
                      body: JSON.stringify({ p_rows: rows }),
                      signal: AbortSignal.timeout(3500),
                    });
                    if (!upsertRes.ok) {
                      console.warn('[PegaLa:Quotes] Falha ao gravar cache online', upsertRes.status);
                    }
                  }
                } catch {
                  failedChainsSet.add(adapter.slug);
                }
              });
            }
          }

          await runWithConcurrency(tasks, 6);
          emit({ type: 'done', failedChains: Array.from(failedChainsSet) });
        } catch {
          emit({ type: 'done', failedChains: adapters.map((a) => a.slug) });
        } finally {
          controller.close();
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
  },
};
