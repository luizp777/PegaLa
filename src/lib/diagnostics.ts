import { db } from '../db/localDb';
import { getRecentLogs } from './logger';
import { isSupabaseConfigured } from './supabase';
import { getWebVitalsSnapshot } from './webVitals';

/**
 * Gera um relatório técnico de diagnóstico em JSON formatado, livre de PII
 * (sem nomes de itens, listas ou códigos de compartilhamento), para suporte e depuração.
 *
 * @returns String JSON pronta para cópia na área de transferência.
 */
export async function buildDiagnosticsReport(): Promise<string> {
  const [listsCount, itemsCount, pendingSyncCount] = await Promise.all([
    db.lists.count().catch(() => -1),
    db.items.count().catch(() => -1),
    db.pendingSync.count().catch(() => -1),
  ]);

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const win = typeof window !== 'undefined' ? window : undefined;

  const isStandalone = Boolean(
    win &&
      (win.matchMedia?.('(display-mode: standalone)')?.matches ||
        (nav as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true)
  );

  const swState = nav && 'serviceWorker' in nav
    ? (nav.serviceWorker.controller?.state ?? 'uncontrolled')
    : 'unsupported';

  const report = {
    generatedAt: new Date().toISOString(),
    app: {
      version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
      commit: typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'local',
      standalone: isStandalone,
      supabaseConfigured: isSupabaseConfigured,
    },
    runtime: {
      online: nav?.onLine ?? true,
      serviceWorker: swState,
      viewport: win ? `${win.innerWidth}x${win.innerHeight}` : 'unknown',
    },
    localDbCounts: {
      lists: listsCount,
      items: itemsCount,
      pendingSync: pendingSyncCount,
    },
    webVitals: getWebVitalsSnapshot(),
    recentLogs: getRecentLogs(),
  };

  return JSON.stringify(report, null, 2);
}
