// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  let darkMatches = false;
  const listeners = new Set<() => void>();

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
    darkMatches = false;
    listeners.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark') ? darkMatches : false,
        media: query,
        addEventListener: (_event: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_event: string, cb: () => void) => listeners.delete(cb),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system theme, syncs dark class and theme-color meta tag', () => {
    darkMatches = true;
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#09090b'
    );
  });

  it('toggles theme, persists in localStorage, and updates meta tag', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem('pegala_theme')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#09090b'
    );

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem('pegala_theme')).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#ffffff'
    );
  });

  it('updates resolvedDark when system preference changes in system mode', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(false);

    act(() => {
      darkMatches = true;
      listeners.forEach((cb) => cb());
    });

    expect(result.current.isDark).toBe(true);
  });
});
