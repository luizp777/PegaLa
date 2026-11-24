import { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { appLogger, serializeError } from '../lib/logger';

/**
 * Toast discreto exibido acima do dock inferior quando uma nova versão do Service Worker (PWA)
 * está pronta para ativação, permitindo atualização imediata sem colidir com alertas do topo.
 *
 * @returns Banner de atualização ou `null` quando não há nova versão pendente.
 */
export function PwaUpdatePrompt() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      appLogger.debug('Service Worker registrado', { swUrl });
      registrationRef.current = registration ?? null;
    },
    onRegisterError(error) {
      appLogger.warn('Erro ao registrar Service Worker', serializeError(error));
    },
  });

  useEffect(() => {
    const checkUpdate = () => {
      const registration = registrationRef.current;
      if (registration && navigator.onLine && document.visibilityState === 'visible') {
        void registration.update().catch((err) => {
          appLogger.debug('Falha ao verificar atualização do SW', serializeError(err));
        });
      }
    };

    document.addEventListener('visibilitychange', checkUpdate);
    return () => document.removeEventListener('visibilitychange', checkUpdate);
  }, []);

  useEffect(() => {
    if (needRefresh) {
      appLogger.info('Nova versão do PegaLá disponível para atualização');
    }
  }, [needRefresh]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-toast-in pointer-events-none fixed inset-x-0 bottom-[calc(7.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-zinc-800">
        <RefreshCw className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>Nova versão disponível</span>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-500 active:scale-95"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white dark:hover:bg-zinc-700"
          aria-label="Adiar atualização"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
