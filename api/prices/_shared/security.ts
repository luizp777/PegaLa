import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
 * Cria um cliente Supabase server-only usando `SUPABASE_SERVICE_ROLE_KEY`
 * (compatível tanto com `sb_secret_...` quanto com JWT legado `eyJ...`).
 */
export function createSupabaseAdmin(): SupabaseClient | null {
  const cfg = getSupabaseServerConfig();
  if (!cfg) return null;
  return createClient(cfg.url, cfg.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
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
  const admin = createSupabaseAdmin();
  if (!admin) return true;

  try {
    const { data, error } = await admin.rpc('check_price_api_rate_limit', {
      p_bucket_key: bucketKey,
      p_max_per_hour: maxPerHour,
    });
    if (error) {
      console.warn('[PegaLa:RateLimit] Falha na RPC check_price_api_rate_limit', error.message);
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}
