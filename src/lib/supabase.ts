import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { authLogger, serializeError } from './logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Indica se as variáveis de ambiente do Supabase estão preenchidas com valores válidos.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('seu-projeto') &&
    !supabaseAnonKey.includes('sua-chave')
);

/**
 * Instância singleton do cliente Supabase, ou `null` quando o app opera em modo 100% local.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

let inFlightSessionPromise: Promise<User | null> | null = null;

/**
 * Executa a verificação ou criação de sessão autenticada no Supabase.
 *
 * @returns Usuário autenticado atual ou `null`.
 */
async function runEnsureSupabaseSession(): Promise<User | null> {
  if (!supabase) return null;

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      authLogger.warn('Falha ao recuperar sessão Supabase', serializeError(sessionError));
    }

    if (session?.user) {
      return session.user;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      authLogger.warn('Falha no login anônimo Supabase', serializeError(error));
      return null;
    }
    return data.user ?? null;
  } catch (err) {
    authLogger.error('Exceção ao garantir sessão Supabase', serializeError(err));
    return null;
  }
}

/**
 * Garante a existência de uma sessão autenticada no Supabase (reutilizando sessão ativa ou criando sessão anônima),
 * serializando chamadas concorrentes para evitar criação de múltiplas sessões anônimas simultâneas.
 *
 * @returns Usuário autenticado atual ou `null` caso o Supabase não esteja configurado ou o login anônimo esteja desabilitado.
 */
export function ensureSupabaseSession(): Promise<User | null> {
  if (!supabase) return Promise.resolve(null);
  if (!inFlightSessionPromise) {
    inFlightSessionPromise = runEnsureSupabaseSession().finally(() => {
      inFlightSessionPromise = null;
    });
  }
  return inFlightSessionPromise;
}

/**
 * Inicia o fluxo de login opcional via Google OAuth no Supabase.
 *
 * @returns Objeto contendo eventual mensagem de erro (`error`) ou `null` em caso de sucesso.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase não configurado neste ambiente.' };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      authLogger.warn('Falha ao iniciar login Google OAuth', serializeError(error));
    }
    return { error: error ? error.message : null };
  } catch (err) {
    const serialized = serializeError(err);
    authLogger.error('Exceção ao iniciar login Google OAuth', serialized);
    return { error: serialized.message };
  }
}

/**
 * Encerra a sessão autenticada atual no Supabase.
 */
export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      authLogger.warn('Falha ao encerrar sessão Supabase', serializeError(error));
    }
  } catch (err) {
    authLogger.error('Exceção ao encerrar sessão Supabase', serializeError(err));
  }
}
