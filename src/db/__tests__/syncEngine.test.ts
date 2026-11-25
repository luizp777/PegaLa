import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addItemsFromText, createList, db, deleteItem, leaveList, updateItemDetails } from '../localDb';

const mockUpsertLists = vi.fn();
const mockUpsertItems = vi.fn();
const mockDeleteItemsIn = vi.fn();
const mockSelectListMaybeSingle = vi.fn();
const mockSelectItemsEq = vi.fn();
const mockDeleteListMembers = vi.fn();
const mockRefreshSession = vi.fn();
const mockRpc = vi.fn();

const mockSupabaseClient = vi.hoisted(() => ({
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
        select: () => ({
          eq: () => ({
            maybeSingle: () => mockSelectListMaybeSingle(),
          }),
        }),
        delete: () => ({ eq: vi.fn(async () => ({ error: null })) }),
      };
    }
    if (table === 'list_items') {
      return {
        upsert: (...args: unknown[]) => mockUpsertItems(...args),
        select: () => ({
          eq: () => ({
            returns: () => mockSelectItemsEq(),
          }),
        }),
        delete: () => ({
          eq: vi.fn(async () => ({ error: null })),
          in: (...args: unknown[]) => mockDeleteItemsIn(...args),
        }),
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
}));

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  hasImmediateAuthOrJoinIntent: () => false,
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  ensureSupabaseSession: vi.fn(async () => ({ id: 'user-1' })),
  supabase: mockSupabaseClient,
}));

import { flushPendingSync, joinSharedListByCode, pullListFromCloud, syncListNow } from '../syncEngine';

describe('syncEngine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    mockUpsertLists.mockResolvedValue({ error: null });
    mockUpsertItems.mockResolvedValue({ error: null });
    mockDeleteItemsIn.mockResolvedValue({ error: null });
    mockSelectListMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSelectItemsEq.mockResolvedValue({ data: [], error: null });
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

  it('batches multiple upsert_item mutations for the same list into a single request', async () => {
    const list = await createList('Lote', 'mercado');
    await db.lists.update(list.id, { isSynced: true, ownerId: 'user-1' });
    await db.pendingSync.clear();

    await addItemsFromText(list.id, 'Arroz\nFeijão\nMacarrão');

    const ok = await flushPendingSync();
    expect(ok).toBe(true);
    expect(mockUpsertItems).toHaveBeenCalledTimes(1);
    const [batchRows] = mockUpsertItems.mock.calls[0] as [Array<{ normalized_name: string }>];
    expect(batchRows).toHaveLength(3);
    expect(await db.pendingSync.count()).toBe(0);
  });

  it('executes delete_item before upsert_item when merging renamed duplicates offline', async () => {
    const callOrder: string[] = [];
    mockDeleteItemsIn.mockImplementation(async () => {
      callOrder.push('delete');
      return { error: null };
    });
    mockUpsertItems.mockImplementation(async () => {
      callOrder.push('upsert');
      return { error: null };
    });

    const list = await createList('Merge Order', 'mercado');
    await db.lists.update(list.id, { isSynced: true, ownerId: 'user-1' });
    const [, leite] = await addItemsFromText(list.id, '2 Arroz\n1 Leite');
    await db.pendingSync.clear();

    await updateItemDetails(leite, {
      name: 'Arroz',
      quantity: 3,
      unit: 'un',
      categoryId: 'mercearia',
    });

    const ok = await flushPendingSync();
    expect(ok).toBe(true);
    expect(callOrder).toEqual(['delete', 'upsert']);
  });

  it('reconciles remote additions and deletions atomically in pullListFromCloud without clobbering pending edits', async () => {
    const now = new Date().toISOString();
    const list = await createList('Cloud Sync', 'mercado');
    await db.lists.update(list.id, { isSynced: true, ownerId: 'user-1' });
    const [pendingItem, staleItem] = await addItemsFromText(list.id, 'Café\nItem Removido');
    await db.pendingSync
      .where('listId')
      .equals(list.id)
      .filter((m) => m.entityId === staleItem.id)
      .delete();

    mockSelectListMaybeSingle.mockResolvedValueOnce({
      data: {
        id: list.id,
        name: 'Cloud Sync',
        type: 'mercado',
        share_code: list.shareCode,
        owner_id: 'user-1',
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    mockSelectItemsEq.mockResolvedValueOnce({
      data: [
        {
          id: 'remote-new-1',
          list_id: list.id,
          name: 'Banana prata',
          normalized_name: 'banana prata',
          quantity: 6,
          unit: 'un',
          category_id: 'hortifruti',
          is_checked: false,
          checked_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    });

    await pullListFromCloud(list.id);

    const localIds = new Set((await db.items.where('listId').equals(list.id).toArray()).map((i) => i.id));
    expect(localIds.has('remote-new-1')).toBe(true);
    expect(localIds.has(pendingItem.id)).toBe(true);
    expect(localIds.has(staleItem.id)).toBe(false);
  });

  it('discards all superseded upsert_item mutations for the same normalizedName on permanent error', async () => {
    const now = new Date().toISOString();
    const list = await createList('Superseded Error', 'mercado');
    await db.lists.update(list.id, { isSynced: true, ownerId: 'user-1' });
    await db.pendingSync.clear();

    const basePayload = {
      id: 'item-old',
      listId: list.id,
      name: 'Leite',
      normalizedName: 'leite',
      quantity: 1,
      unit: 'L',
      categoryId: 'laticinios',
      isChecked: false,
      checkedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.pendingSync.bulkAdd([
      {
        action: 'upsert_item',
        entityId: 'item-old',
        listId: list.id,
        payload: basePayload,
        createdAt: now,
      },
      {
        action: 'upsert_item',
        entityId: 'item-new',
        listId: list.id,
        payload: { ...basePayload, id: 'item-new', quantity: 0 },
        createdAt: now,
      },
    ]);

    mockUpsertItems.mockResolvedValueOnce({
      error: { code: '23514', message: 'check_violation: quantity > 0' },
    });

    const ok = await flushPendingSync();
    expect(ok).toBe(false);
    expect(await db.pendingSync.count()).toBe(0);
  });

  it('flushes pending delete_item mutations before upserting items in syncListNow', async () => {
    const callOrder: string[] = [];
    mockDeleteItemsIn.mockImplementation(async () => {
      callOrder.push('delete');
      return { error: null };
    });
    mockUpsertItems.mockImplementation(async () => {
      callOrder.push('upsert');
      return { error: null };
    });

    const list = await createList('SyncNow Deletes', 'mercado');
    const [arroz] = await addItemsFromText(list.id, 'Arroz\nFeijão');
    await deleteItem(arroz);

    const ok = await syncListNow(list.id);
    expect(ok).toBe(true);
    expect(callOrder).toEqual(['delete', 'upsert']);
    expect(mockDeleteItemsIn).toHaveBeenCalledWith('id', [arroz.id]);
    expect(await db.pendingSync.where('listId').equals(list.id).count()).toBe(0);
  });
});
