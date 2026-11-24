// Service worker — Mapa de actividades v1.13 (mapa base PMTiles sin cobertura, con peticiones por rangos). Antes v1.7 (E-056). Funciona sin cobertura con lo ya visto/guardado.
const SHELL = 'app-v11', DATOS = 'datos-v6', TESELAS = 'teselas-v1', BASE = 'mapabase-v1', MAX_TESELAS = 3000;
const ARCHIVOS = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png',
  'vendor/leaflet.min.js', 'vendor/protomaps-leaflet.js', 'vendor/leaflet.min.css', 'vendor/leaflet.markercluster.min.js',
  'vendor/MarkerCluster.min.css', 'vendor/MarkerCluster.Default.min.css'];
self.addEventListener('install', e => e.waitUntil(Promise.all([caches.open(SHELL).then(c => c.addAll(ARCHIVOS)),
  caches.open(DATOS).then(c => c.add('datos.json')).catch(() => {})]).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, DATOS, TESELAS, BASE].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function recorta() { const c = await caches.open(TESELAS); const ks = await c.keys(); for (let i = 0; i < ks.length - MAX_TESELAS; i++) await c.delete(ks[i]); }
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin && u.pathname.endsWith('.pmtiles')) {   // mapa base propio: desde la copia guardada, por rangos
    e.respondWith(rango(e.request)); return;
  }
  if (u.hostname.endsWith('tile.openstreetmap.org')) {          // teselas: primero la copia
    e.respondWith(caches.open(TESELAS).then(async c => { const m = await c.match(e.request.url); if (m) return m;
      const r = await fetch(e.request); if (r.ok) { c.put(e.request.url, r.clone()); recorta(); } return r; }));
    return;
  }
  if (/datos\.json$|output=csv|\.csv$/.test(u.pathname + u.search) || u.searchParams.get('output') === 'csv') {   // datos: primero la red
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const k = r.clone(); caches.open(DATOS).then(c => c.put(e.request.url, k)); } return r; })
      .catch(() => caches.match(e.request.url)));
    return;
  }
  if (u.origin === location.origin) e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(m => m || fetch(e.request)));
});

async function rango(req) {
  const c = await caches.open(BASE); const m = await c.match(req.url.split('?')[0], {ignoreSearch: true});
  if (!m) return fetch(req);
  const blob = await m.blob(), tam = blob.size, h = req.headers.get('Range');
  const r = h && /bytes=(\d+)-(\d*)/.exec(h);
  if (!r) return new Response(blob, {status: 200, headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(tam), 'Accept-Ranges': 'bytes'}});
  const a = +r[1], b = Math.min(r[2] ? +r[2] : tam - 1, tam - 1);
  return new Response(blob.slice(a, b + 1), {status: 206, headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(b - a + 1), 'Content-Range': `bytes ${a}-${b}/${tam}`, 'Accept-Ranges': 'bytes'}});
}
