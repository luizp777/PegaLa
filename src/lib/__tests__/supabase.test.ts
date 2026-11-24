import { describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn(async () => ({ data: { session: null }, error: null }));
const mockSignInAnonymously = vi.fn(
  async () =>
    new Promise<{ data: { user: { id: string } }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { user: { id: 'anon-1' } }, error: null }), 20)
    )
);

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
      signInAnonymously: () => mockSignInAnonymously(),
    },
  }),
}));

describe('supabase auth session lock', () => {
  it('serializes concurrent ensureSupabaseSession calls into a single signInAnonymously', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    vi.resetModules();

    const { ensureSupabaseSession } = await import('../supabase');
    const [u1, u2, u3] = await Promise.all([
      ensureSupabaseSession(),
      ensureSupabaseSession(),
      ensureSupabaseSession(),
    ]);

    expect(u1?.id).toBe('anon-1');
    expect(u2?.id).toBe('anon-1');
    expect(u3?.id).toBe('anon-1');
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);

    vi.unstubAllEnvs();
  });
});
