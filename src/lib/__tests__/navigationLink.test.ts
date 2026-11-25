import { describe, expect, it } from 'vitest';
import { buildNavigationUrl } from '../navigationLink';

describe('buildNavigationUrl', () => {
  const store = { name: 'Confiança Max', lat: -22.3245, lng: -49.0712 };

  it('gera URI geo: no Android escapando parênteses no nome', () => {
    const res = buildNavigationUrl(
      { name: 'Confiança Max (Centro)', lat: -22.3245, lng: -49.0712 },
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
    );
    expect(res.href).toBe(
      'geo:-22.3245,-49.0712?q=-22.3245,-49.0712(Confian%C3%A7a%20Max%20%28Centro%29)'
    );
    expect(res.externalTab).toBe(false);
  });

  it('gera URI maps:// no iOS (iPhone/iPad)', () => {
    const res = buildNavigationUrl(
      store,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
    );
    expect(res.href).toBe('maps://?daddr=-22.3245,-49.0712&q=Confian%C3%A7a%20Max');
    expect(res.externalTab).toBe(false);
  });

  it('gera link universal do Google Maps no desktop com externalTab true', () => {
    const res = buildNavigationUrl(
      store,
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    );
    expect(res.href).toBe('https://www.google.com/maps/dir/?api=1&destination=-22.3245,-49.0712');
    expect(res.externalTab).toBe(true);
  });
});
