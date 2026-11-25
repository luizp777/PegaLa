import type { SupabaseClient, User } from '@supabase/supabase-js';
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

let cachedClient: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;
let inFlightSessionPromise: Promise<User | null> | null = null;

/**
 * Indica se a URL atual contém intenção imediata de autenticação OAuth ou ingresso em lista compartilhada.
 *
 * @returns `true` quando há `?join=`, `?code=` ou tokens OAuth no hash da URL.
 */
export function hasImmediateAuthOrJoinIntent(): boolean {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  if (search.has('join') || search.has('code')) return true;
  const hash = window.location.hash;
  return hash.includes('access_token=') || hash.includes('refresh_token=');
}

/**
 * Carrega dinamicamente `@supabase/supabase-js` e retorna a instância singleton do cliente Supabase,
 * mantendo os ~59 KB gzip do SDK fora do bundle inicial de boot.
 *
 * @returns Cliente Supabase configurado ou `null` quando o app opera em modo 100% local.
 */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (cachedClient) return Promise.resolve(cachedClient);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        cachedClient = createClient(supabaseUrl!, supabaseAnonKey!, {
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
        });
        return cachedClient;
      })
      .catch((err) => {
        clientPromise = null;
        authLogger.error('Falha ao carregar SDK do Supabase', serializeError(err));
        return null;
      });
  }
  return clientPromise;
}

/**
 * Executa a verificação ou criação de sessão autenticada no Supabase.
 *
 * @returns Usuário autenticado atual ou `null`.
 */
async function runEnsureSupabaseSession(): Promise<User | null> {
  const client = await getSupabaseClient();
  if (!client) return null;

  try {
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) {
      authLogger.warn('Falha ao recuperar sessão Supabase', serializeError(sessionError));
    }

    if (session?.user) {
      return session.user;
    }

    const { data, error } = await client.auth.signInAnonymously();
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
  if (!isSupabaseConfigured) return Promise.resolve(null);
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
  const client = await getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado neste ambiente.' };
  }
  try {
    const { error } = await client.auth.signInWithOAuth({
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
  const client = await getSupabaseClient();
  if (!client) return;
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      authLogger.warn('Falha ao encerrar sessão Supabase', serializeError(error));
    }
  } catch (err) {
    authLogger.error('Exceção ao encerrar sessão Supabase', serializeError(err));
  }
}
