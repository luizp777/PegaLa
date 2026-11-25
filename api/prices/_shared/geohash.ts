const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Codifica latitude e longitude em uma string geohash com a precisão informada (padrão 5, ~5 km).
 */
export function encodeGeohash(lat: number, lng: number, precision = 5): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    bit += 1;
    if (bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

/**
 * Calcula distância aproximada em quilômetros via fórmula de Haversine.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const clamped = Math.min(1, Math.max(0, a));
  return Number((2 * R * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped))).toFixed(2));
}

/**
 * Arredonda coordenada para 3 casas decimais (~110 m) para privacidade.
 */
export function roundCoord(coord: number): number {
  return Math.round(coord * 1000) / 1000;
}
