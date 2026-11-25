import type { NearbyStore, StoreType } from '../../shared/priceTypes.js';
import { encodeGeohash, haversineKm, roundCoord } from './_shared/geohash.js';
import {
  authenticateRequest,
  checkRateLimit,
  createSupabaseAdmin,
  hashClientIp,
  jsonResponse,
  validateSameOrigin,
} from './_shared/security.js';

interface NearbyRequestBody {
  cep?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  types?: StoreType[];
}

interface StoreRow {
  id: string;
  osm_id: string | null;
  name: string;
  chain_slug: string | null;
  store_type: StoreType;
  lat: number;
  lng: number;
  cep: string | null;
  city: string | null;
  neighborhood: string | null;
  fetched_at: string;
}

const CHAIN_ALIASES: Array<{ slug: string; storeType: StoreType; patterns: string[] }> = [
  { slug: 'confianca', storeType: 'mercado', patterns: ['confianca', 'confiança'] },
  { slug: 'tauste', storeType: 'mercado', patterns: ['tauste'] },
  { slug: 'jauserve', storeType: 'mercado', patterns: ['jau serve', 'jaú serve', 'jauserve'] },
  { slug: 'samsclub', storeType: 'mercado', patterns: ["sam's club", 'sams club', 'sam s club'] },
  { slug: 'mambo', storeType: 'mercado', patterns: ['mambo'] },
  { slug: 'obahortifruti', storeType: 'mercado', patterns: ['oba hortifruti', 'oba'] },
  { slug: 'swift', storeType: 'mercado', patterns: ['swift'] },
  {
    slug: 'drogariasaopaulo',
    storeType: 'farmacia',
    patterns: ['drogaria sao paulo', 'drogaria são paulo', 'drogarias sao paulo'],
  },
  { slug: 'drogariaspacheco', storeType: 'farmacia', patterns: ['pacheco'] },
  { slug: 'paguemenos', storeType: 'farmacia', patterns: ['pague menos'] },
];

function detectChainSlug(name: string, storeType: StoreType): string | null {
  const norm = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const entry of CHAIN_ALIASES) {
    if (entry.storeType !== storeType) continue;
    if (entry.patterns.some((p) => norm.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return entry.slug;
    }
  }
  return null;
}

function getOsmUserAgent(): string {
  const email = process.env.OSM_CONTACT_EMAIL || 'contato@pegala.app';
  return `PegaLa/1.0 (${email})`;
}

async function resolveCepToLocation(cep: string): Promise<{
  lat: number;
  lng: number;
  cep: string;
  city: string;
  neighborhood: string;
  label: string;
} | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;

  let city = '';
  let uf = '';
  let neighborhood = '';
  let street = '';

  try {
    const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: AbortSignal.timeout(3500),
    });
    if (viaRes.ok) {
      const via = (await viaRes.json()) as {
        erro?: boolean;
        localidade?: string;
        uf?: string;
        bairro?: string;
        logradouro?: string;
      };
      if (!via.erro && via.localidade) {
        city = via.localidade;
        uf = via.uf ?? '';
        neighborhood = via.bairro ?? '';
        street = via.logradouro ?? '';
      }
    }
  } catch {
    // Fallback direto para Nominatim
  }

  const query = city
    ? `${street ? `${street}, ` : ''}${city}, ${uf}, Brasil`
    : `${clean.slice(0, 5)}-${clean.slice(5)}, Brasil`;

  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
      {
        headers: { 'User-Agent': getOsmUserAgent() },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!nomRes.ok) return null;
    const nomJson = (await nomRes.json()) as Array<{ lat?: string; lon?: string }>;
    const first = nomJson[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const label = neighborhood ? `${neighborhood}, ${city}` : city || `CEP ${clean.slice(0, 5)}-${clean.slice(5)}`;
    return { lat, lng, cep: clean, city, neighborhood, label };
  } catch {
    return null;
  }
}

async function reverseGeocodeCoords(lat: number, lng: number): Promise<{
  cep: string;
  city: string;
  neighborhood: string;
  label: string;
}> {
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      {
        headers: { 'User-Agent': getOsmUserAgent() },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (nomRes.ok) {
      const data = (await nomRes.json()) as {
        address?: {
          postcode?: string;
          city?: string;
          town?: string;
          municipality?: string;
          suburb?: string;
          neighbourhood?: string;
        };
      };
      const addr = data.address ?? {};
      const cep = (addr.postcode ?? '').replace(/\D/g, '').slice(0, 8);
      const city = addr.city || addr.town || addr.municipality || '';
      const neighborhood = addr.suburb || addr.neighbourhood || '';
      const label = neighborhood && city ? `${neighborhood}, ${city}` : city || 'Localização atual';
      return { cep, city, neighborhood, label };
    }
  } catch {
    // Segue com fallback
  }
  return { cep: '', city: '', neighborhood: '', label: 'Localização atual' };
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchNominatimFallback(
  lat: number,
  lng: number,
  types: StoreType[]
): Promise<Array<{
  osm_id: string;
  name: string;
  chain_slug: string | null;
  store_type: StoreType;
  lat: number;
  lng: number;
}>> {
  const out: Array<{
    osm_id: string;
    name: string;
    chain_slug: string | null;
    store_type: StoreType;
    lat: number;
    lng: number;
  }> = [];
  const dLat = 0.08;
  const dLng = 0.08;
  const viewbox = `${(lng - dLng).toFixed(4)},${(lat + dLat).toFixed(4)},${(lng + dLng).toFixed(4)},${(lat - dLat).toFixed(4)}`;

  for (const storeType of types) {
    const q = storeType === 'farmacia' ? 'farmacia' : 'supermercado';
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=20&bounded=1&countrycodes=br&viewbox=${encodeURIComponent(viewbox)}&q=${q}`,
        {
          headers: { 'User-Agent': getOsmUserAgent() },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!res.ok) continue;
      const items = (await res.json()) as Array<{
        osm_type?: string;
        osm_id?: number;
        lat?: string;
        lon?: string;
        name?: string;
        display_name?: string;
      }>;
      for (const el of items) {
        const elLat = Number(el.lat);
        const elLng = Number(el.lon);
        const rawName = (el.name || el.display_name?.split(',')[0] || '').trim();
        if (!rawName || !Number.isFinite(elLat) || !Number.isFinite(elLng)) continue;
        const osmId =
          el.osm_type && el.osm_id
            ? `${el.osm_type}/${el.osm_id}`
            : `nom/${roundCoord(elLat)}/${roundCoord(elLng)}`;
        out.push({
          osm_id: osmId,
          name: rawName.slice(0, 160),
          chain_slug: detectChainSlug(rawName, storeType),
          store_type: storeType,
          lat: roundCoord(elLat),
          lng: roundCoord(elLng),
        });
      }
    } catch {
      // Continua para o próximo tipo
    }
  }

  return out;
}

async function fetchOverpassStores(
  lat: number,
  lng: number,
  radiusKm: number,
  types: StoreType[]
): Promise<Array<{
  osm_id: string;
  name: string;
  chain_slug: string | null;
  store_type: StoreType;
  lat: number;
  lng: number;
  cep?: string | null;
  city?: string | null;
  neighborhood?: string | null;
}>> {
  const radiusM = Math.min(Math.max(radiusKm, 1), 10) * 1000;
  const parts: string[] = [];
  if (types.includes('mercado')) {
    parts.push(`nwr["shop"="supermarket"](around:${radiusM},${lat},${lng});`);
  }
  if (types.includes('farmacia')) {
    parts.push(`nwr["amenity"="pharmacy"](around:${radiusM},${lat},${lng});`);
  }
  if (parts.length === 0) return [];

  const ql = `[out:json][timeout:6];(${parts.join('')});out center 50;`;

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': getOsmUserAgent(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(ql)}`,
        signal: AbortSignal.timeout(5500),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as {
        elements?: Array<{
          type: string;
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const out: Array<{
        osm_id: string;
        name: string;
        chain_slug: string | null;
        store_type: StoreType;
        lat: number;
        lng: number;
        cep: string | null;
        city: string | null;
        neighborhood: string | null;
      }> = [];

      for (const el of data.elements ?? []) {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        const name = el.tags?.name?.trim() || el.tags?.brand?.trim();
        if (!name || typeof elLat !== 'number' || typeof elLng !== 'number') continue;

        const storeType: StoreType = el.tags?.amenity === 'pharmacy' ? 'farmacia' : 'mercado';
        const chainSlug = detectChainSlug(
          `${name} ${el.tags?.brand ?? ''} ${el.tags?.operator ?? ''}`,
          storeType
        );
        const tagCep = (el.tags?.['addr:postcode'] ?? '').replace(/\D/g, '').slice(0, 8) || null;
        const tagCity = el.tags?.['addr:city']?.trim().slice(0, 120) || null;
        const tagNeighborhood =
          el.tags?.['addr:suburb']?.trim().slice(0, 120) ||
          el.tags?.['addr:neighbourhood']?.trim().slice(0, 120) ||
          null;

        out.push({
          osm_id: `${el.type}/${el.id}`,
          name: name.slice(0, 160),
          chain_slug: chainSlug,
          store_type: storeType,
          lat: roundCoord(elLat),
          lng: roundCoord(elLng),
          cep: tagCep,
          city: tagCity,
          neighborhood: tagNeighborhood,
        });
      }

      if (out.length > 0) return out;
    } catch {
      // Tenta próximo mirror ou fallback Nominatim
    }
  }

  return fetchNominatimFallback(lat, lng, types);
}

/**
 * Serverless Function (`POST /api/prices/nearby-stores`) para descoberta de mercados e farmácias
 * próximos via ViaCEP/Nominatim + Overpass API, com cache por bounding box no Supabase e rate limit.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    try {
      if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    const originErr = validateSameOrigin(req);
    if (originErr) return originErr;

    const userId = await authenticateRequest(req);
    if (!userId) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const ipHash = hashClientIp(req);
    const [userOk, ipOk] = await Promise.all([
      checkRateLimit(`nearby:u:${userId}`, 20),
      checkRateLimit(`nearby:ip:${ipHash}`, 60),
    ]);
    if (!userOk || !ipOk) {
      return jsonResponse({ error: 'Muitas consultas. Aguarde alguns minutos.' }, 429);
    }

    let body: NearbyRequestBody;
    try {
      body = (await req.json()) as NearbyRequestBody;
    } catch {
      return jsonResponse({ error: 'Malformed JSON' }, 400);
    }

    const radiusKm = [1, 3, 5, 10].includes(Number(body.radiusKm))
      ? (Number(body.radiusKm) as 1 | 3 | 5 | 10)
      : 3;
    const filteredTypes: StoreType[] = Array.isArray(body.types)
      ? body.types.filter((t): t is StoreType => t === 'mercado' || t === 'farmacia')
      : [];
    const types: StoreType[] = filteredTypes.length > 0 ? filteredTypes : ['mercado'];

    const rawLat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : NaN;
    const rawLng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : NaN;
    if (
      (!Number.isNaN(rawLat) && (rawLat < -90 || rawLat > 90)) ||
      (!Number.isNaN(rawLng) && (rawLng < -180 || rawLng > 180))
    ) {
      return jsonResponse({ error: 'Coordenadas geográficas inválidas.' }, 400);
    }
    let lat = rawLat;
    let lng = rawLng;
    let cep = (body.cep ?? '').replace(/\D/g, '').slice(0, 8);
    let city = '';
    let neighborhood = '';
    let locationLabel = 'Localização atual';

    if (cep.length === 8 && (Number.isNaN(lat) || Number.isNaN(lng))) {
      const resolved = await resolveCepToLocation(cep);
      if (!resolved) {
        return jsonResponse({ error: 'Não foi possível localizar esse CEP.' }, 400);
      }
      lat = resolved.lat;
      lng = resolved.lng;
      city = resolved.city;
      neighborhood = resolved.neighborhood;
      locationLabel = resolved.label;
    } else if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (cep.length < 8) {
        const rev = await reverseGeocodeCoords(lat, lng);
        cep = rev.cep;
        city = rev.city;
        neighborhood = rev.neighborhood;
        locationLabel = rev.label;
      }
    } else {
      return jsonResponse({ error: 'Informe um CEP válido ou coordenadas GPS.' }, 400);
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return jsonResponse({ error: 'Supabase não configurado no servidor.' }, 503);
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const latDelta = (radiusKm + 1) / 111;
    const lngDelta = (radiusKm + 1) / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

    let storeRows: StoreRow[] = [];
    const { data: cachedStores, error: cacheError } = await admin
      .from('stores')
      .select('id, osm_id, name, chain_slug, store_type, lat, lng, cep, city, neighborhood, fetched_at')
      .in('store_type', types)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .gte('fetched_at', thirtyDaysAgo)
      .limit(80);

    if (cacheError) {
      console.warn('[PegaLa:NearbyStores] Erro ao ler cache stores', cacheError.message);
    } else if (cachedStores) {
      storeRows = cachedStores as StoreRow[];
    }

    const oneDayAgoMs = Date.now() - 24 * 3600_000;
    const missingTypes = types.filter((t) => {
      const ofTypeInRadius = storeRows.filter(
        (s) => s.store_type === t && haversineKm(lat, lng, s.lat, s.lng) <= radiusKm + 1
      );
      if (ofTypeInRadius.length === 0) return true;
      if (ofTypeInRadius.length < 3) {
        const hasFreshFetch = ofTypeInRadius.some((s) => Date.parse(s.fetched_at) >= oneDayAgoMs);
        return !hasFreshFetch;
      }
      return false;
    });
    if (missingTypes.length > 0) {
      // Popula sempre com raio de 10km para não prender a região em cache de raio menor
      const rawOsmStores = await fetchOverpassStores(lat, lng, 10, missingTypes);
      const dedupedStores = Array.from(
        new Map(rawOsmStores.map((s) => [s.osm_id, s])).values()
      );
      if (dedupedStores.length > 0) {
        const nowIso = new Date().toISOString();
        const payload = dedupedStores.map((s) => ({
          osm_id: s.osm_id,
          name: s.name,
          chain_slug: s.chain_slug,
          store_type: s.store_type,
          lat: s.lat,
          lng: s.lng,
          geohash5: encodeGeohash(s.lat, s.lng, 5),
          cep: s.cep ?? null,
          city: s.city ?? (city || null),
          neighborhood: s.neighborhood ?? null,
          fetched_at: nowIso,
          updated_at: nowIso,
        }));

        const { data: upserted, error: upsertError } = await admin
          .from('stores')
          .upsert(payload, { onConflict: 'osm_id' })
          .select('id, osm_id, name, chain_slug, store_type, lat, lng, cep, city, neighborhood, fetched_at');

        if (!upsertError && upserted) {
          const existingIds = new Set(storeRows.map((r) => r.id));
          for (const row of upserted as StoreRow[]) {
            if (!existingIds.has(row.id)) storeRows.push(row);
          }
        } else {
          console.warn('[PegaLa:NearbyStores] Falha ao salvar stores no Supabase', upsertError?.message);
          storeRows.push(
            ...payload.map((p, idx) => ({
              id: `temp-${idx}-${p.osm_id}`,
              osm_id: p.osm_id,
              name: p.name,
              chain_slug: p.chain_slug,
              store_type: p.store_type,
              lat: p.lat,
              lng: p.lng,
              cep: p.cep,
              city: p.city,
              neighborhood: p.neighborhood,
              fetched_at: p.fetched_at,
            }))
          );
        }
      }
    }

    const stores: NearbyStore[] = storeRows
      .map((row) => ({
        id: row.id,
        osmId: row.osm_id,
        name: row.name,
        chainSlug: row.chain_slug,
        storeType: row.store_type,
        lat: row.lat,
        lng: row.lng,
        distanceKm: haversineKm(lat, lng, row.lat, row.lng),
        cep: row.cep,
        city: row.city,
        neighborhood: row.neighborhood,
      }))
      .filter((s) => s.distanceKm <= radiusKm + 1)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);

    return jsonResponse({
      location: {
        cep,
        cepPrefix: cep.slice(0, 5),
        city,
        neighborhood,
        label: locationLabel,
        lat: roundCoord(lat),
        lng: roundCoord(lng),
        radiusKm,
      },
      stores,
    });
    } catch (err) {
      console.error('[PegaLa:NearbyStores] Erro inesperado', err);
      return jsonResponse({ error: 'Erro interno ao buscar lojas próximas.' }, 500);
    }
  },
};
