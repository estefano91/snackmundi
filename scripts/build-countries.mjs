/**
 * Genera los datos de países a partir de world-atlas (Natural Earth 1:50m).
 *   - public/data/countries.geo.json  -> polígonos para el globo (se descarga en runtime)
 *   - src/data/countries.js          -> metadatos (nombre, continente, bandera, centroide)
 *
 * Uso: npm run data
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import topo from 'world-atlas/countries-50m.json' with { type: 'json' };
import * as topojson from 'topojson-client';
import isoCountries from 'i18n-iso-countries';
import esLocale from 'i18n-iso-countries/langs/es.json' with { type: 'json' };
import { countries as meta } from 'countries-list';

isoCountries.registerLocale(esLocale);

/* --- Entidades del dataset sin código ISO numérico ------------------------ */
const MANUAL_ID_TO_A2 = { '-99': null };          // se resuelven por nombre
const BY_NAME = { Kosovo: 'XK' };                 // Kosovo usa el código XK (asignado por el usuario)
const SKIP_NAMES = new Set(['Somaliland', 'N. Cyprus', 'Indian Ocean Ter.', 'Siachen Glacier']);

/* --- Países/territorios ISO sin polígono propio en este dataset ----------- */
const POINT_ONLY = {
  BV: [-54.42, 3.36],   CX: [-10.49, 105.63], CC: [-12.17, 96.83],  GF: [3.93, -53.13],
  GI: [36.14, -5.35],   GP: [16.25, -61.58],  MQ: [14.64, -61.02],  YT: [-12.83, 45.17],
  RE: [-21.12, 55.54],  SJ: [78.0, 20.0],     TK: [-9.2, -171.85],  TV: [-7.11, 177.65],
  UM: [19.28, 166.65],  BQ: [12.18, -68.24],
};

const CONTINENT_ES = {
  AF: 'África', AN: 'Antártida', AS: 'Asia', EU: 'Europa',
  NA: 'América del Norte', OC: 'Oceanía', SA: 'América del Sur',
};

const flagOf = (a2) =>
  String.fromCodePoint(...[...a2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/* --- Centroide robusto: media circular sobre el anillo de mayor área ------ */
const ringArea = (ring) => {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
};

function centroid(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best = null, bestArea = -1;
  for (const poly of polys) {
    const area = ringArea(poly[0]);
    if (area > bestArea) { bestArea = area; best = poly[0]; }
  }
  // media circular en longitud (soporta países que cruzan el antimeridiano)
  let sx = 0, sy = 0, lat = 0;
  for (const [lng, la] of best) {
    const r = (lng * Math.PI) / 180;
    sx += Math.cos(r); sy += Math.sin(r); lat += la;
  }
  const lng = (Math.atan2(sy / best.length, sx / best.length) * 180) / Math.PI;
  return [+(lat / best.length).toFixed(3), +lng.toFixed(3)];
}

const round = (coords, p = 2) =>
  Array.isArray(coords[0])
    ? coords.map((c) => round(c, p))
    : coords.map((n) => +n.toFixed(p));

/* --- Construcción -------------------------------------------------------- */
const geo = topojson.feature(topo, topo.objects.countries);
const features = [];
const list = [];
const seen = new Set();

for (const f of geo.features) {
  const name = f.properties?.name ?? '';
  if (SKIP_NAMES.has(name)) continue;

  const a2 =
    isoCountries.numericToAlpha2(String(f.id)) ?? BY_NAME[name] ?? MANUAL_ID_TO_A2[String(f.id)];
  if (!a2 || seen.has(a2)) continue;
  seen.add(a2);

  const m = meta[a2];
  const nameEs = isoCountries.getName(a2, 'es') ?? m?.name ?? name;
  const [lat, lng] = centroid(f.geometry);

  features.push({
    type: 'Feature',
    properties: { code: a2, name: nameEs },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  });

  list.push({
    code: a2,
    name: nameEs,
    nameEn: m?.name ?? name,
    continent: m?.continent ?? 'AN',
    flag: flagOf(a2),
    lat, lng,
    polygon: true,
  });
}

for (const [a2, [lat, lng]] of Object.entries(POINT_ONLY)) {
  if (seen.has(a2)) continue;
  const m = meta[a2];
  list.push({
    code: a2,
    name: isoCountries.getName(a2, 'es') ?? m?.name ?? a2,
    nameEn: m?.name ?? a2,
    continent: m?.continent ?? 'AN',
    flag: flagOf(a2),
    lat, lng,
    polygon: false,
  });
}

list.sort((a, b) => a.name.localeCompare(b.name, 'es'));

mkdirSync('public/data', { recursive: true });
mkdirSync('src/data', { recursive: true });

writeFileSync(
  'public/data/countries.geo.json',
  JSON.stringify({ type: 'FeatureCollection', features })
);

writeFileSync(
  'src/data/countries.js',
  `// GENERADO AUTOMÁTICAMENTE por scripts/build-countries.mjs — no editar a mano.\n` +
    `// Fuente: Natural Earth 1:50m vía world-atlas + ISO 3166-1.\n\n` +
    `export const CONTINENT_ES = ${JSON.stringify(CONTINENT_ES, null, 2)};\n\n` +
    `export const COUNTRIES = ${JSON.stringify(list, null, 0)};\n\n` +
    `export const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));\n\n` +
    `export const TOTAL = COUNTRIES.length;\n`
);

const byCont = list.reduce((acc, c) => ((acc[c.continent] = (acc[c.continent] || 0) + 1), acc), {});
console.log(`✓ ${features.length} polígonos -> public/data/countries.geo.json`);
console.log(`✓ ${list.length} países/territorios -> src/data/countries.js`);
console.log('  por continente:', byCont);
