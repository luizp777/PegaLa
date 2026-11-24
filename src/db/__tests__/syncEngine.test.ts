import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addItemsFromText, createList, db, leaveList } from '../localDb';

const mockUpsertLists = vi.fn();
const mockUpsertItems = vi.fn();
const mockDeleteListMembers = vi.fn();
const mockRefreshSession = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  ensureSupabaseSession: vi.fn(async () => ({ id: 'user-1' })),
  supabase: {
    auth: {
      refreshSession: () => mockRefreshSession(),
    },
    rpc: (...args: unknown[]) => ({
      returns: () => mockRpc(...args),
    }),
    from: (table: string) => {
      if (table === 'lists') {
        return {
          upsert: (...args: unknown[]) => mockUpsertLists(...args),
          delete: () => ({ eq: vi.fn(async () => ({ error: null })) }),
        };
      }
      if (table === 'list_items') {
        return {
          upsert: (...args: unknown[]) => mockUpsertItems(...args),
          delete: () => ({ eq: vi.fn(async () => ({ error: null })) }),
        };
      }
      if (table === 'list_members') {
        return {
          delete: () => ({
            eq: () => ({
              eq: (...args: unknown[]) => mockDeleteListMembers(...args),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

import { flushPendingSync, joinSharedListByCode } from '../syncEngine';

describe('syncEngine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    mockUpsertLists.mockResolvedValue({ error: null });
    mockUpsertItems.mockResolvedValue({ error: null });
    mockDeleteListMembers.mockResolvedValue({ error: null });
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });

    await db.lists.clear();
    await db.items.clear();
    await db.dictionary.clear();
    await db.pendingSync.clear();
  });

  it('auto-marks foreign lists as shared and drains upsert_item + leave_list mutations', async () => {
    const now = new Date().toISOString();
    await db.lists.put({
      id: 'foreign-1',
      name: 'Mercado Família',
      type: 'mercado',
      shareCode: 'PEGA-ABCD1234',
      ownerId: 'other-user',
      isSynced: true,
      createdAt: now,
      updatedAt: now,
    });

    const list = await createList('Minha Lista', 'mercado');
    await addItemsFromText(list.id, 'Leite');

    const ok = await flushPendingSync();
    expect(ok).toBe(true);

    const foreign = await db.lists.get('foreign-1');
    expect(foreign?.isShared).toBe(true);
    expect(mockUpsertItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ onConflict: 'list_id,normalized_name' })
    );

    await leaveList('foreign-1');
    const leftOk = await flushPendingSync();
    expect(leftOk).toBe(true);
    expect(mockDeleteListMembers).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('retries with a new shareCode when PostgreSQL returns 23505 unique collision', async () => {
    const list = await createList('Colisão', 'mercado');
    const originalCode = list.shareCode;

    mockUpsertLists
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate share_code' } })
      .mockResolvedValueOnce({ error: null });

    const ok = await flushPendingSync();
    expect(ok).toBe(true);
    const updated = await db.lists.get(list.id);
    expect(updated?.shareCode).not.toBe(originalCode);
    expect(updated?.isSynced).toBe(true);
  });

  it('treats 42501 as transient, keeps mutation queued, and triggers refreshSession', async () => {
    const list = await createList('Sessão Expirada', 'mercado');
    await db.lists.update(list.id, { isSynced: true, ownerId: 'user-1' });
    await db.pendingSync.clear();
    await addItemsFromText(list.id, 'Pão francês');

    mockUpsertItems.mockResolvedValueOnce({ error: { code: '42501', message: 'rls denied' } });

    const ok = await flushPendingSync();
    expect(ok).toBe(false);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    const remaining = await db.pendingSync.toArray();
    expect(remaining).toHaveLength(1);
  });

  it('returns error instead of false success after 3 consecutive 23505 share_code collisions', async () => {
    const list = await createList('Colisão Persistente', 'mercado');
    mockUpsertLists.mockResolvedValue({ error: { code: '23505', message: 'duplicate share_code' } });

    const ok = await flushPendingSync();
    expect(ok).toBe(false);
    const updated = await db.lists.get(list.id);
    expect(updated?.isSynced).toBe(false);
    expect(await db.pendingSync.count()).toBeGreaterThan(0);
  });

  it('does not send duplicate item upserts when seeding a newly created local list', async () => {
    const list = await createList('Sem Duplicar', 'mercado');
    await addItemsFromText(list.id, 'Café');

    const ok = await flushPendingSync();
    expect(ok).toBe(true);
    expect(mockUpsertItems).toHaveBeenCalledTimes(1);
    expect(await db.pendingSync.count()).toBe(0);
  });

  it('preserves P0001 rate-limit message in joinSharedListByCode', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'P0001', message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' },
    });

    const res = await joinSharedListByCode('PEGA-12345678');
    expect(res.list).toBeNull();
    expect(res.error).toBe('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
  });
});
