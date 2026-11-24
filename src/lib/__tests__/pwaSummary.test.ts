import { afterEach, describe, expect, it } from 'vitest';
import { buildShoppingSummaryText } from '../pwaSummary';
import { dismissPwaInstallForDays, isPwaInstallDismissed } from '../../hooks/usePwaInstall';
import type { ShoppingItem } from '../../types';

describe('buildShoppingSummaryText', () => {
  it('formats a clean summary with item count, aisle count, and quantities', () => {
    const now = '2026-11-24T12:00:00.000Z';
    const items: ShoppingItem[] = [
      {
        id: '1',
        listId: 'list-1',
        name: 'Leite integral',
        normalizedName: 'leite integral',
        quantity: 2,
        unit: 'L',
        categoryId: 'laticinios',
        isChecked: true,
        checkedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '2',
        listId: 'list-1',
        name: 'Banana',
        normalizedName: 'banana',
        quantity: 6,
        unit: 'un',
        categoryId: 'hortifruti',
        isChecked: true,
        checkedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const summary = buildShoppingSummaryText('Mercado', items);
    expect(summary).toContain('Compra concluída — Mercado (2 itens em 2 corredores):');
    expect(summary).toContain('• Leite integral (2L)');
    expect(summary).toContain('• Banana (6x)');
  });
});

describe('PWA install banner 7-day dismissal', () => {
  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('silences banner for 7 days and expires afterwards', () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        clear: () => store.clear(),
      },
      configurable: true,
    });

    const t0 = 1_700_000_000_000;
    expect(isPwaInstallDismissed(t0)).toBe(false);

    dismissPwaInstallForDays(7, t0);
    expect(isPwaInstallDismissed(t0 + 6 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(isPwaInstallDismissed(t0 + 7 * 24 * 60 * 60 * 1000 + 1)).toBe(false);
  });
});
