import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

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

/**
 * Garante a existência de uma sessão autenticada no Supabase (reutilizando sessão ativa ou criando sessão anônima).
 *
 * @returns Usuário autenticado atual ou `null` caso o Supabase não esteja configurado ou o login anônimo esteja desabilitado.
 */
export async function ensureSupabaseSession(): Promise<User | null> {
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    return null;
  }
  return data.user ?? null;
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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { error: error ? error.message : null };
}

/**
 * Encerra a sessão autenticada atual no Supabase.
 */
export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
