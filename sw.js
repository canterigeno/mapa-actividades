// Service worker — Mapa de actividades v1.39 (cachés app-v36/datos-v31). Antes v1.38 (app-v35/datos-v30). Antes v1.37 (app-v34/datos-v29). Antes v1.36 (app-v33/datos-v28). Antes v1.35 (app-v32/datos-v27). Antes v1.34 (app-v31/datos-v26). Antes v1.33 (app-v30/datos-v25). Antes v1.32 (app-v29/datos-v24). Antes v1.31 (app-v28/datos-v23). Antes v1.30 (app-v27/datos-v22). Antes v1.29 (app-v26/datos-v21). Antes v1.28 (app-v25/datos-v20). Antes v1.27 (app-v24/datos-v19). Antes v1.26 (app-v23/datos-v18). Antes v1.25 (app-v22/datos-v17). Antes v1.24 (app-v21/datos-v16). Antes v1.23 (app-v20/datos-v15). Antes v1.22 (app-v19/datos-v14). Antes v1.21 (app-v18/datos-v13). Antes v1.20 (app-v17/datos-v12). Antes v1.19 (app-v16/datos-v11). Antes v1.18 (app-v15/datos-v10). Antes v1.17 (app-v14/datos-v9). Antes v1.16 (app-v13/datos-v8). Antes v1.13 (mapa base PMTiles sin cobertura, con peticiones por rangos). Antes v1.7 (E-056). Funciona sin cobertura con lo ya visto/guardado.
const SHELL = 'app-v36', DATOS = 'datos-v31', TESELAS = 'teselas-v1', BASE = 'mapabase-v1', MAX_TESELAS = 3000;
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
