// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissPwaInstallForDays,
  isPwaInstallDismissed,
  usePwaInstall,
} from '../usePwaInstall';

describe('usePwaInstall', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14)',
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    vi.restoreAllMocks();
  });

  it('tracks dismissal window via localStorage helpers', () => {
    const now = 1_700_000_000_000;
    expect(isPwaInstallDismissed(now)).toBe(false);

    dismissPwaInstallForDays(7, now);
    expect(isPwaInstallDismissed(now + 1000)).toBe(true);
    expect(isPwaInstallDismissed(now + 8 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('shows banner on beforeinstallprompt and handles prompt acceptance and dismiss', async () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canShowBanner).toBe(false);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = promptMock;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.canShowBanner).toBe(true);
    expect(result.current.isIosManualInstall).toBe(false);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(result.current.canShowBanner).toBe(false);
  });

  it('detects iOS manual install and hides banner when dismissed', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });

    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIosManualInstall).toBe(true);
    expect(result.current.canShowBanner).toBe(true);

    act(() => {
      result.current.dismissInstall();
    });

    expect(result.current.canShowBanner).toBe(false);
    expect(isPwaInstallDismissed()).toBe(true);
  });
});
