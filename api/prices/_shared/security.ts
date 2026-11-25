import { createHash } from 'node:crypto';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Valida cabeçalho Origin same-origin quando presente (mesmo padrão de `/api/logs`).
 */
export function validateSameOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return jsonResponse({ error: 'Forbidden Origin' }, 403);
    }
    return null;
  } catch {
    return jsonResponse({ error: 'Invalid Origin' }, 400);
  }
}

export function getSupabaseServerConfig(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/$/, ''), serviceKey };
}

/**
 * Monta cabeçalhos compatíveis com chaves `sb_secret_...` (apenas `apikey`)
 * e chaves legadas JWT `eyJ...` (`apikey` + `Authorization: Bearer`).
 */
export function buildSupabaseServiceHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    'Content-Type': 'application/json',
  };
  if (serviceKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

/**
 * Valida JWT do usuário no Supabase Auth e retorna o `userId` autenticado.
 */
export async function authenticateRequest(req: Request): Promise<string | null> {
  const cfg = getSupabaseServerConfig();
  if (!cfg) return null;

  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token) return null;

  try {
    const res = await fetch(`${cfg.url}/auth/v1/user`, {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  } catch {
    return null;
  }
}

export function hashClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ip = forwarded.split(',')[0].trim();
  const salt = process.env.PRICE_RATE_LIMIT_SALT || 'pegala-default-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * Executa rate limit atômico por janela deslizante de 1 hora via RPC `check_price_api_rate_limit`.
 */
export async function checkRateLimit(bucketKey: string, maxPerHour: number): Promise<boolean> {
  const cfg = getSupabaseServerConfig();
  if (!cfg) return true;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/check_price_api_rate_limit`, {
      method: 'POST',
      headers: buildSupabaseServiceHeaders(cfg.serviceKey),
      body: JSON.stringify({
        p_bucket_key: bucketKey,
        p_max_per_hour: maxPerHour,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return true;
    const allowed = (await res.json()) as unknown;
    return allowed !== false;
  } catch {
    return true;
  }
}
