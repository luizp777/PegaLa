import { useEffect, useState } from 'react';
import {
  getSupabaseClient,
  hasImmediateAuthOrJoinIntent,
  isSupabaseConfigured,
} from '../lib/supabase';

/**
 * Estado mínimo de sessão autenticada do Supabase para controle de permissões na UI.
 */
export interface AuthSessionState {
  /** ID do usuário autenticado (anônimo ou Google), ou `null` se desconectado. */
  currentUserId: string | null;
  /** Indica se a consulta inicial de sessão já foi concluída. */
  sessionLoaded: boolean;
}

/**
 * Assina o ciclo de sessão do Supabase Auth sem acoplar lógica de autenticação nos componentes de UI.
 * Adia o carregamento do SDK Supabase para depois do primeiro paint quando não há callback OAuth nem `?join=`.
 *
 * @returns ID do usuário atual e flag indicando se a sessão inicial foi hidratada.
 */
export function useAuthSession(): AuthSessionState {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(() => !isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let idleHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    const initAuth = () => {
      if (cancelled) return;
      void getSupabaseClient()
        .then((client) => {
          if (cancelled) return;
          if (!client) {
            setSessionLoaded(true);
            return;
          }

          void client.auth
            .getSession()
            .then(({ data }) => {
              if (!cancelled) {
                setCurrentUserId(data.session?.user?.id ?? null);
                setSessionLoaded(true);
              }
            })
            .catch(() => {
              if (!cancelled) {
                setSessionLoaded(true);
              }
            });

          const {
            data: { subscription },
          } = client.auth.onAuthStateChange((_event, session) => {
            if (!cancelled) {
              setCurrentUserId(session?.user?.id ?? null);
              setSessionLoaded(true);
            }
          });
          unsubscribe = () => subscription.unsubscribe();
        })
        .catch(() => {
          if (!cancelled) {
            setSessionLoaded(true);
          }
        });
    };

    if (hasImmediateAuthOrJoinIntent() || import.meta.env.MODE === 'test') {
      initAuth();
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(initAuth, { timeout: 600 });
    } else {
      timerHandle = setTimeout(initAuth, 120);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
      unsubscribe?.();
    };
  }, []);

  return { currentUserId, sessionLoaded };
}
