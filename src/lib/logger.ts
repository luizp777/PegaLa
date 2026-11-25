/**
 * Representação serializável e segura de uma exceção ou erro PostgREST para logs estruturados.
 */
export interface SerializedError {
  /** Mensagem legível do erro. */
  message: string;
  /** Nome da classe de erro (quando disponível). */
  name?: string;
  /** Código de erro (ex.: código PostgreSQL/PostgREST como `42501`). */
  code?: string;
  /** Detalhes técnicos adicionais retornados por APIs. */
  details?: string | null;
  /** Sugestão de correção retornada pelo PostgreSQL/PostgREST. */
  hint?: string | null;
}

/**
 * Entrada sanitizada armazenada no buffer circular local de observabilidade.
 */
export interface BufferedLogEntry {
  /** Timestamp ISO 8601 do evento. */
  timestamp: string;
  /** Severidade do evento. */
  level: LogLevelName;
  /** Nome do sub-logger emissor. */
  logger: string;
  /** Mensagem principal já sanitizada. */
  message: string;
  /** Metadados opcionais sanitizados sem PII. */
  data?: Record<string, unknown>;
}

/**
 * Converte qualquer valor lançado em um `catch` (ou erro estruturado do Supabase)
 * em um objeto {@link SerializedError} seguro para inspeção nos logs.
 *
 * @param err - Valor desconhecido capturado em bloco `catch` ou erro retornado por SDK.
 * @returns Objeto normalizado contendo mensagem e metadados de diagnóstico.
 */
export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    const extra = err as Error & { code?: string; details?: string | null; hint?: string | null };
    return {
      name: err.name,
      message: err.message,
      ...(extra.code ? { code: extra.code } : {}),
      ...(extra.details ? { details: extra.details } : {}),
      ...(extra.hint ? { hint: extra.hint } : {}),
    };
  }

  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>;
    return {
      message: typeof rec.message === 'string' ? rec.message : String(err),
      ...(typeof rec.name === 'string' ? { name: rec.name } : {}),
      ...(typeof rec.code === 'string' ? { code: rec.code } : {}),
      ...(typeof rec.details === 'string' ? { details: rec.details } : {}),
      ...(typeof rec.hint === 'string' ? { hint: rec.hint } : {}),
    };
  }

  return { message: String(err) };
}

type LogLevelName = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LOG_LEVEL_IDS: Record<LogLevelName, number> = {
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5,
  FATAL: 6,
};

const MAX_BUFFER_SIZE = 50;
const MAX_REMOTE_SENDS_PER_SESSION = 20;
const SAFE_STRING_KEYS = new Set([
  'code',
  'name',
  'action',
  'level',
  'logger',
  'metric',
  'rating',
  'navigationType',
  'status',
]);

const logBuffer: BufferedLogEntry[] = [];
let remoteSendsCount = 0;

/**
 * Remove padrões sensíveis (códigos `PEGA-XXXXXX`, e-mails e tokens Bearer/JWT) de uma string.
 *
 * @param input - Texto bruto a ser higienizado.
 * @returns Texto com eventuais segredos mascarados.
 */
export function redactSensitiveText(input: string): string {
  return input
    .replace(/PEGA-[A-Z0-9]{4,12}/gi, 'PEGA-***')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [token]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[jwt]');
}

function sanitizeValue(value: unknown, key?: string, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (!key || SAFE_STRING_KEYS.has(key) || key === 'message') {
      return redactSensitiveText(value).slice(0, 240);
    }
    return '[redacted]';
  }
  if (depth >= 2) return '[truncated]';
  if (value instanceof Error) {
    return sanitizeValue(serializeError(value), undefined, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeValue(item, undefined, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, k, depth + 1);
    }
    return out;
  }
  return String(value);
}

/**
 * Converte argumentos arbitrários de log em uma estrutura sanitizada sem PII ou tokens.
 *
 * @param args - Argumentos passados ao logger.
 * @returns Mensagem principal e objeto de metadados higienizado.
 */
export function sanitizeLogArgs(args: unknown[]): {
  message: string;
  data?: Record<string, unknown>;
} {
  if (args.length === 0) return { message: '' };
  const [first, ...rest] = args;
  const message =
    typeof first === 'string'
      ? redactSensitiveText(first).slice(0, 240)
      : redactSensitiveText(String(first)).slice(0, 240);

  if (rest.length === 0) return { message };

  if (rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null && !Array.isArray(rest[0])) {
    return {
      message,
      data: sanitizeValue(rest[0], undefined, 0) as Record<string, unknown>,
    };
  }

  return {
    message,
    data: { items: rest.slice(0, 5).map((item) => sanitizeValue(item, undefined, 0)) },
  };
}

/**
 * Retorna uma cópia das últimas entradas sanitizadas registradas no buffer circular em memória.
 *
 * @returns Lista cronológica das últimas até 50 entradas de log.
 */
export function getRecentLogs(): BufferedLogEntry[] {
  return [...logBuffer];
}

/**
 * Limpa o buffer circular local de logs (útil em testes automatizados).
 */
export function clearRecentLogs(): void {
  logBuffer.length = 0;
  remoteSendsCount = 0;
}

const isTestEnv = import.meta.env.MODE === 'test';
const isDevEnv = import.meta.env.DEV;
const minLevel = isTestEnv ? 4 : isDevEnv ? 2 : 3;
const remoteLogEndpoint = import.meta.env.VITE_LOG_ENDPOINT as string | undefined;

function pushToBuffer(entry: BufferedLogEntry): void {
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
  logBuffer.push(entry);
}

function sendRemoteLog(entry: BufferedLogEntry): void {
  if (!remoteLogEndpoint || isDevEnv || isTestEnv || typeof navigator === 'undefined') return;
  if (LOG_LEVEL_IDS[entry.level] < 4) return;
  if (remoteSendsCount >= MAX_REMOTE_SENDS_PER_SESSION) return;
  remoteSendsCount += 1;

  try {
    const payload = JSON.stringify(entry);
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(remoteLogEndpoint, new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch(remoteLogEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Nunca permite que falha no transporte remoto quebre o app
  }
}

/**
 * Contrato do logger estruturado leve do PegaLá.
 */
export interface AppLogger {
  /** Registra mensagem de depuração (nível 2). */
  debug: (...args: unknown[]) => void;
  /** Registra mensagem informativa (nível 3). */
  info: (...args: unknown[]) => void;
  /** Registra aviso operacional (nível 4). */
  warn: (...args: unknown[]) => void;
  /** Registra erro recuperável (nível 5). */
  error: (...args: unknown[]) => void;
  /** Registra falha crítica (nível 6). */
  fatal: (...args: unknown[]) => void;
  /** Cria um sub-logger com prefixo de módulo. */
  getSubLogger: (opts: { name: string }) => AppLogger;
}

function createLogger(name: string): AppLogger {
  const emit = (level: LogLevelName, consoleFn: (...a: unknown[]) => void, args: unknown[]) => {
    if (LOG_LEVEL_IDS[level] < minLevel) return;
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const sanitized = sanitizeLogArgs(args);
    if (sanitized.data) {
      consoleFn(`${ts} ${level} [${name}]`, sanitized.message, sanitized.data);
    } else {
      consoleFn(`${ts} ${level} [${name}]`, sanitized.message);
    }
    const entry: BufferedLogEntry = {
      timestamp: now.toISOString(),
      level,
      logger: name,
      message: sanitized.message,
      ...(sanitized.data ? { data: sanitized.data } : {}),
    };
    pushToBuffer(entry);
    sendRemoteLog(entry);
  };

  return {
    debug: (...args) => emit('DEBUG', console.debug, args),
    info: (...args) => emit('INFO', console.info, args),
    warn: (...args) => emit('WARN', console.warn, args),
    error: (...args) => emit('ERROR', console.error, args),
    fatal: (...args) => emit('FATAL', console.error, args),
    getSubLogger: ({ name: subName }) => createLogger(`${name}:${subName}`),
  };
}

/**
 * Logger raiz leve do PegaLá (zero dependências externas).
 * Em desenvolvimento registra a partir de `debug` (2); em produção a partir de `info` (3);
 * em testes automatizados apenas `warn` (4) ou superior.
 */
export const rootLogger = createLogger('PegaLa');

/** Sub-logger para inicialização, ciclo de vida e erros globais do aplicativo. */
export const appLogger = rootLogger.getSubLogger({ name: 'App' });

/** Sub-logger para sincronização offline-first e canal Supabase Realtime. */
export const syncLogger = rootLogger.getSubLogger({ name: 'Sync' });

/** Sub-logger para autenticação (anônima e Google OAuth) no Supabase. */
export const authLogger = rootLogger.getSubLogger({ name: 'Auth' });

/** Sub-logger para operações no IndexedDB local (Dexie) e armazenamento. */
export const dbLogger = rootLogger.getSubLogger({ name: 'DB' });

/** Sub-logger para interações de UI, voz, área de transferência e Wake Lock. */
export const uiLogger = rootLogger.getSubLogger({ name: 'UI' });

let globalHandlersInstalled = false;

/**
 * Instala ouvintes globais (`error` e `unhandledrejection`) no `window` para garantir
 * que exceções assíncronas ou não capturadas sejam registradas.
 */
export function installGlobalErrorHandlers(): void {
  if (globalHandlersInstalled || typeof window === 'undefined') return;
  globalHandlersInstalled = true;

  window.addEventListener('error', (event) => {
    appLogger.error('Erro global não capturado', serializeError(event.error ?? event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    appLogger.error('Promise rejeitada sem tratamento', serializeError(event.reason));
  });
}
