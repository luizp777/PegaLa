import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
 *
 * @returns ID do usuário atual e flag indicando se a sessão inicial foi hidratada.
 */
export function useAuthSession(): AuthSessionState {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(() => !supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    void supabase.auth
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
      setSessionLoaded(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { currentUserId, sessionLoaded };
}
