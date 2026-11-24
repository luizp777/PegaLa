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

const isTestEnv = import.meta.env.MODE === 'test';
const isDevEnv = import.meta.env.DEV;
const minLevel = isTestEnv ? 4 : isDevEnv ? 2 : 3;
const remoteLogEndpoint = import.meta.env.VITE_LOG_ENDPOINT as string | undefined;

function sendRemoteLog(levelName: LogLevelName, loggerName: string, args: unknown[]): void {
  if (!remoteLogEndpoint || isDevEnv || isTestEnv || typeof navigator === 'undefined') return;
  if (LOG_LEVEL_IDS[levelName] < 4) return;
  try {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: levelName,
      logger: loggerName,
      data: args,
    });
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(remoteLogEndpoint, payload);
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
    consoleFn(`${ts} ${level} [${name}]`, ...args);
    sendRemoteLog(level, name, args);
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
