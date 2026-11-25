// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from '../wakeLock';

describe('useWakeLock', () => {
  const originalWakeLock = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    if (originalWakeLock) {
      Object.defineProperty(navigator, 'wakeLock', originalWakeLock);
    } else {
      delete (navigator as unknown as Record<string, unknown>).wakeLock;
    }
    vi.restoreAllMocks();
  });

  it('acquires and releases screen wake lock and handles visibilitychange', async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = {
      released: false,
      release: releaseMock,
      addEventListener: vi.fn(),
    };
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestMock },
    });

    const { result } = renderHook(() => useWakeLock());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isActive).toBe(false);

    await act(async () => {
      await result.current.toggleWakeLock();
    });

    expect(requestMock).toHaveBeenCalledWith('screen');
    expect(result.current.isActive).toBe(true);

    // Does not acquire a duplicate sentinel while the active one is still held
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(requestMock).toHaveBeenCalledTimes(1);

    // Re-acquires when returning to visible state after browser released the sentinel
    sentinel.released = true;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(requestMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.toggleWakeLock();
    });

    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(result.current.isActive).toBe(false);
  });

  it('invokes onError callback when wakeLock.request rejects', async () => {
    const requestMock = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestMock },
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useWakeLock(onError));

    await act(async () => {
      await result.current.toggleWakeLock();
    });

    expect(result.current.isActive).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Não foi possível manter a tela acesa neste aparelho.'
    );
  });
});
