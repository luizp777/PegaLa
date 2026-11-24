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
 * @returns Estado de suporte, estado ativo atual e função para alternar o bloqueio de tela.
 */
export function useWakeLock() {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const desiredActiveRef = useRef(false);

  const requestLock = useCallback(async () => {
    if (!isSupported) return;
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      const sentinel = await nav.wakeLock?.request('screen');
      if (sentinel) {
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener?.('release', () => {
          setIsActive(false);
        });
      }
    } catch (err) {
      uiLogger.debug('Falha ao solicitar Wake Lock de tela', serializeError(err));
      setIsActive(false);
    }
  }, [isSupported]);

  const releaseLock = useCallback(async () => {
    desiredActiveRef.current = false;
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch (err) {
        uiLogger.debug('Falha ao liberar Wake Lock (já liberado pelo sistema)', serializeError(err));
      }
      sentinelRef.current = null;
    }
    setIsActive(false);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (desiredActiveRef.current) {
      await releaseLock();
    } else {
      desiredActiveRef.current = true;
      await requestLock();
    }
  }, [releaseLock, requestLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && desiredActiveRef.current) {
        void requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinelRef.current) {
        void sentinelRef.current.release().catch(() => {});
      }
    };
  }, [requestLock]);

  return { isSupported, isActive, toggleWakeLock };
}
