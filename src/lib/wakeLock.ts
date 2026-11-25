import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeError, uiLogger } from './logger';

/**
 * Contrato mínimo do sentinela retornado pela Screen Wake Lock API.
 */
interface WakeLockSentinelLike {
  /** Indica se o bloqueio de tela já foi liberado pelo sistema. */
  released: boolean;
  /** Libera manualmente o bloqueio de tela. */
  release: () => Promise<void>;
  /** Registra ouvintes para eventos do sentinela (ex.: `release`). */
  addEventListener?: (type: string, listener: () => void) => void;
}

/**
 * Hook React para controlar a Screen Wake Lock API e manter a tela acesa durante as compras.
 *
 * @remarks
 * Reativa automaticamente o bloqueio caso o usuário alterne de aba e retorne ao aplicativo.
 *
 * @param onError - Callback opcional chamado quando o sistema recusa o bloqueio de tela.
 * @returns Estado de suporte, estado ativo atual e função para alternar o bloqueio de tela.
 */
export function useWakeLock(onError?: (message: string) => void) {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const desiredActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const requestLock = useCallback(async (notifyOnFailure = false) => {
    if (!isSupported) return;
    if (sentinelRef.current && !sentinelRef.current.released) return;
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      const sentinel = await nav.wakeLock?.request('screen');
      if (sentinel) {
        if (!mountedRef.current || !desiredActiveRef.current) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener?.('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setIsActive(false);
          }
        });
      }
    } catch (err) {
      uiLogger.debug('Falha ao solicitar Wake Lock de tela', serializeError(err));
      desiredActiveRef.current = false;
      if (mountedRef.current) {
        setIsActive(false);
      }
      if (notifyOnFailure) {
        onErrorRef.current?.('Não foi possível manter a tela acesa neste aparelho.');
      }
    }
  }, [isSupported]);

  const releaseLock = useCallback(async () => {
    desiredActiveRef.current = false;
    const current = sentinelRef.current;
    sentinelRef.current = null;
    if (current) {
      try {
        await current.release();
      } catch (err) {
        uiLogger.debug('Falha ao liberar Wake Lock (já liberado pelo sistema)', serializeError(err));
      }
    }
    setIsActive(false);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (desiredActiveRef.current) {
      await releaseLock();
    } else {
      desiredActiveRef.current = true;
      await requestLock(true);
    }
  }, [releaseLock, requestLock]);

  useEffect(() => {
    mountedRef.current = true;
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        desiredActiveRef.current &&
        (!sentinelRef.current || sentinelRef.current.released)
      ) {
        void requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const current = sentinelRef.current;
      sentinelRef.current = null;
      if (current) {
        void current.release().catch(() => {});
      }
    };
  }, [requestLock]);

  return { isSupported, isActive, toggleWakeLock };
}
