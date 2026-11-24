import { Logger, type ILogObj } from 'tslog';

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
 * em um objeto {@link SerializedError} seguro para inspeção via `tslog`.
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

const isTestEnv = import.meta.env.MODE === 'test';
const isDevEnv = import.meta.env.DEV;
const remoteLogEndpoint = import.meta.env.VITE_LOG_ENDPOINT as string | undefined;

/**
 * Logger raiz do PegaLá baseado em `tslog`.
 * Em desenvolvimento registra a partir de `debug` (2); em produção a partir de `info` (3);
 * em testes automatizados apenas `warn` (4) ou superior.
 * Quando `VITE_LOG_ENDPOINT` está configurado em produção, envia eventos `warn`/`error`/`fatal` via `sendBeacon`.
 */
export const rootLogger = new Logger<ILogObj>({
  name: 'PegaLa',
  type: 'pretty',
  minLevel: isTestEnv ? 4 : isDevEnv ? 2 : 3,
  pretty: {
    template: '{{hh}}:{{MM}}:{{ss}}.{{ms}} {{logLevelName}} [{{name}}] ',
  },
  stack: {
    capture: isDevEnv ? 'auto' : 'off',
  },
});

if (remoteLogEndpoint && !isDevEnv && !isTestEnv && typeof navigator !== 'undefined') {
  rootLogger.attachTransport((logObj) => {
    const meta = logObj._meta as { logLevelId?: number; logLevelName?: string; name?: string } | undefined;
    if (!meta?.logLevelId || meta.logLevelId < 4) return;
    try {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: meta.logLevelName,
        logger: meta.name,
        data: logObj,
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
  });
}

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
 * que exceções assíncronas ou não capturadas sejam registradas via `tslog`.
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
