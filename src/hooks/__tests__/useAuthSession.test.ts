// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getSessionMock = vi.fn();
const unsubscribeMock = vi.fn();
let authCallback: ((event: string, session: { user?: { id: string } } | null) => void) | null = null;

const mockAuthClient = vi.hoisted(() => ({
  auth: {
    getSession: () => getSessionMock(),
    onAuthStateChange: (cb: (event: string, session: { user?: { id: string } } | null) => void) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: unsubscribeMock } } };
    },
  },
}));

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  hasImmediateAuthOrJoinIntent: () => true,
  getSupabaseClient: vi.fn(async () => mockAuthClient),
  supabase: mockAuthClient,
}));

import { useAuthSession } from '../useAuthSession';

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
  });

  it('hydrates user id from getSession and updates on auth state change', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    const { result, unmount } = renderHook(() => useAuthSession());
    expect(result.current.sessionLoaded).toBe(false);

    await waitFor(() => {
      expect(result.current.sessionLoaded).toBe(true);
    });
    expect(result.current.currentUserId).toBe('user-1');

    act(() => {
      authCallback?.('SIGNED_OUT', null);
    });
    expect(result.current.currentUserId).toBeNull();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('marks sessionLoaded true even if getSession rejects', async () => {
    getSessionMock.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => {
      expect(result.current.sessionLoaded).toBe(true);
    });
    expect(result.current.currentUserId).toBeNull();
  });
});
