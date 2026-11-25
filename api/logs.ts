const MAX_BODY_BYTES = 8192;
const ALLOWED_LEVELS = new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

/**
 * Serverless Function opcional da Vercel (same-origin `/api/logs`) para registrar
 * eventos sanitizados de erro/telemetria no stdout estruturado sem violar a CSP estrita.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
      });
    }

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Unsupported Media Type' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new Response(JSON.stringify({ error: 'Forbidden Origin' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid Origin' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload Too Large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      const level = typeof parsed.level === 'string' ? parsed.level : '';
      const logger = typeof parsed.logger === 'string' ? parsed.logger.slice(0, 64) : '';
      const message = typeof parsed.message === 'string' ? parsed.message.slice(0, 240) : '';

      if (!ALLOWED_LEVELS.has(level) || !logger || !message) {
        return new Response(JSON.stringify({ error: 'Invalid log payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log(
        JSON.stringify({
          source: 'pegala-client',
          timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString(),
          level,
          logger,
          message,
          ...(parsed.data && typeof parsed.data === 'object' ? { data: parsed.data } : {}),
        })
      );

      return new Response(null, { status: 204 });
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
