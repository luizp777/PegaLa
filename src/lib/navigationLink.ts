/**
 * Resultado da construção de URL de navegação nativa para um estabelecimento.
 */
export interface NavigationLinkResult {
  /** URI nativa (`geo:`, `maps://`) ou URL HTTPS de fallback para direções. */
  href: string;
  /** Indica se deve abrir em nova aba (`target="_blank"`), usado no fallback web. */
  externalTab: boolean;
}

/**
 * Gera o link de abertura direta no aplicativo de mapas/navegação do dispositivo
 * com a localização do estabelecimento marcada.
 *
 * @param store - Nome e coordenadas do estabelecimento.
 * @param userAgent - User-Agent opcional (útil para testes unitários).
 * @returns Objeto com `href` apropriado para Android, iOS ou Desktop/web.
 */
export function buildNavigationUrl(
  store: { name: string; lat: number; lng: number },
  userAgent?: string
): NavigationLinkResult {
  const lat = Number.isFinite(store.lat) ? store.lat : 0;
  const lng = Number.isFinite(store.lng) ? store.lng : 0;
  const coords = `${lat},${lng}`;
  const label = encodeURIComponent(store.name.trim() || 'Estabelecimento');
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  if (/android/i.test(ua)) {
    const geoLabel = label.replace(/\(/g, '%28').replace(/\)/g, '%29');
    return {
      href: `geo:${coords}?q=${coords}(${geoLabel})`,
      externalTab: false,
    };
  }

  if (/iphone|ipad|ipod/i.test(ua)) {
    return {
      href: `maps://?daddr=${coords}&q=${label}`,
      externalTab: false,
    };
  }

  return {
    href: `https://www.google.com/maps/dir/?api=1&destination=${coords}`,
    externalTab: true,
  };
}
