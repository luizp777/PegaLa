// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appLogger,
  clearRecentLogs,
  getRecentLogs,
  installGlobalErrorHandlers,
  redactSensitiveText,
  sanitizeLogArgs,
  serializeError,
} from '../logger';
import { buildDiagnosticsReport } from '../diagnostics';
import { getWebVitalsSnapshot } from '../webVitals';

describe('logger & diagnostics', () => {
  afterEach(() => {
    clearRecentLogs();
    vi.restoreAllMocks();
  });

  it('serializes Error instances, Postgrest-like objects, and primitives', () => {
    const err = new Error('boom') as Error & { code?: string; details?: string };
    err.code = '42501';
    err.details = 'rls policy';
    expect(serializeError(err)).toEqual({
      name: 'Error',
      message: 'boom',
      code: '42501',
      details: 'rls policy',
    });

    expect(serializeError({ message: 'pg err', code: '23505', hint: 'unique' })).toEqual({
      message: 'pg err',
      code: '23505',
      hint: 'unique',
    });

    expect(serializeError('string error')).toEqual({ message: 'string error' });
  });

  it('redacts share codes, emails, JWTs, and arbitrary string fields', () => {
    expect(redactSensitiveText('Lista PEGA-8K4M2P para user@example.com')).toBe(
      'Lista PEGA-*** para [email]'
    );

    const sanitized = sanitizeLogArgs([
      'Erro ao salvar PEGA-ABCD12',
      { code: '42501', listName: 'Mercado Secreto', count: 3 },
    ]);
    expect(sanitized.message).toBe('Erro ao salvar PEGA-***');
    expect(sanitized.data).toEqual({
      code: '42501',
      listName: '[redacted]',
      count: 3,
    });
  });

  it('stores sanitized entries in circular buffer and installs global handlers once', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    clearRecentLogs();
    appLogger.warn('aviso teste PEGA-9999AA', { code: 'TEST', itemName: 'Leite' });
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const recent = getRecentLogs();
    expect(recent).toHaveLength(1);
    expect(recent[0]?.message).toBe('aviso teste PEGA-***');
    expect(recent[0]?.data).toEqual({ code: 'TEST', itemName: '[redacted]' });

    installGlobalErrorHandlers();
    installGlobalErrorHandlers();

    window.dispatchEvent(new ErrorEvent('error', { message: 'erro global' }));
    expect(errSpy).toHaveBeenCalled();

    const reportJson = await buildDiagnosticsReport();
    const parsed = JSON.parse(reportJson) as {
      localDbCounts: { lists: number };
      recentLogs: unknown[];
    };
    expect(parsed.localDbCounts.lists).toBeGreaterThanOrEqual(0);
    expect(parsed.recentLogs.length).toBeGreaterThanOrEqual(1);
    expect(getWebVitalsSnapshot()).toEqual({});
  });
});
