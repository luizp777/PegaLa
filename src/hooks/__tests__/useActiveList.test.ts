// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/localDb';
import * as syncEngine from '../../db/syncEngine';
import { useActiveList } from '../useActiveList';

describe('useActiveList', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.lists.clear();
    await db.items.clear();
    await db.dictionary.clear();
    await db.pendingSync.clear();
    window.history.replaceState({}, '', '/');

    vi.spyOn(syncEngine, 'subscribeToListRealtime').mockReturnValue(() => {});
    vi.spyOn(syncEngine, 'flushPendingSync').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes default lists and selects the active list', async () => {
    const { result } = renderHook(() => useActiveList());

    await waitFor(() => {
      expect(result.current.activeList).not.toBeNull();
    });

    expect(result.current.lists).toHaveLength(2);
    expect(result.current.activeList?.type).toBe('mercado');
  });

  it('selects the matching list when opened via ?list=farmacia shortcut and cleans URL', async () => {
    window.history.replaceState({}, '', '/?list=farmacia');

    const { result } = renderHook(() => useActiveList());

    await waitFor(() => {
      expect(result.current.activeList?.type).toBe('farmacia');
    });

    expect(window.location.search).toBe('');
  });

  it('joins shared list via ?join= parameter and shows toast', async () => {
    const now = new Date().toISOString();
    const joinedList = {
      id: 'shared-1',
      name: 'Churrasco',
      type: 'geral' as const,
      shareCode: 'PEGA-123456',
      ownerId: 'owner-2',
      isSynced: true,
      isShared: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.lists.put(joinedList);

    vi.spyOn(syncEngine, 'joinSharedListByCode').mockResolvedValue({
      list: joinedList,
      error: null,
    });

    window.history.replaceState({}, '', '/?join=PEGA-123456');
    const { result } = renderHook(() => useActiveList());

    await waitFor(() => {
      expect(result.current.activeList?.id).toBe('shared-1');
    });

    expect(result.current.joinToast).toContain('Churrasco');
    expect(window.location.search).toBe('');

    act(() => {
      result.current.clearJoinToast();
    });
    expect(result.current.joinToast).toBeNull();
  });

  it('falls back to another list when active list is deleted', async () => {
    const { result } = renderHook(() => useActiveList());

    await waitFor(() => {
      expect(result.current.lists).toHaveLength(2);
    });

    const firstId = result.current.activeList!.id;
    await act(async () => {
      await db.lists.delete(firstId);
    });

    await waitFor(() => {
      expect(result.current.activeList?.id).not.toBe(firstId);
    });
    expect(result.current.activeList).not.toBeNull();
  });
});
