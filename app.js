// Mapa de actividades v1.14 (2026-11-24 20:35: botón «Marcar / corregir parking» en cada barranco y ferrata —se toca el mapa donde se aparca—, guardado en este móvil y exportable en CSV para pegarlo en la tabla online y que llegue a todos; decisión d de Rafael). Antes v1.13 (2026-11-24 20:30: MAPA BASE DE ESPAÑA SIN COBERTURA, archivo PMTiles propio mapa-base/espana.pmtiles —OpenStreetMap vía Protomaps, ODbL—, zoom 0–9 con Canarias y Baleares, dibujado con protomaps-leaflet; se descarga una vez con el botón y se usa solo cuando no hay conexión o si se elige en el selector de capas). Antes v1.12 (2026-11-24 19:27: datos tabla v13, parkings de OpenStreetMap QUITADOS por no fiables —corrección de Rafael—; parking solo de fuentes con punto propio, con su origen; enlace «Buscar en Wikiloc»). Antes v1.11 (2026-11-24 18:35: datos tabla v12, V/A/C, tiempos, combinación y parking de Descente-Canyon también en 129 barrancos de Francia, Portugal y Andorra). Antes v1.10 (2026-11-24 17:25: datos tabla v11, 5 barrancos repetidos de Descente-Canyon unidos a su ficha de Infobarrancos y unión equivocada Uixo I/II corregida; 2026-11-24 16:40: datos tabla v10, V/A/C, compromiso, tiempos, combinación y parking de Descente-Canyon en barrancos de España; 2026-11-24 13:23: datos tabla v9, parking OSM aproximado en 1.206 barrancos/ferratas; 2026-11-24 11:04: buscar alrededor de mí o de un punto, radio 5–100 km, lista por distancia; v1.6 parking OSM aproximado en la ficha; antes v1.5 desplegables Comunidad/país y Provincia) — E-056 (2026-11-24). Datos: datos.json (por defecto) o la URL de ?datos=
// (sirve también el CSV de la Google Sheet «publicada como CSV»: misma cabecera que la tabla v2).
'use strict';
const DATOS_URL = new URLSearchParams(location.search).get('datos') || 'datos.json';
const COL = {verde:'#2e9e4f',azul:'#2f6fd0',rojo:'#d23a2f',morado:'#8a3fc4',negro:'#111',gris:'#8a8f8c'};
const PCOL = {ac:'#e08a00',cam:'#a0632a',nat:'#3aa6a0'}, CUEVA = '#4a4f55';
const LV = ['I','II','III','IV','V','VI'], LVC = {I:'verde',II:'verde',III:'azul',IV:'rojo',V:'morado',VI:'negro'};
const KS = ['K1','K2','K3','K4','K5','K6',''], KC = {K1:'verde',K2:'verde',K3:'azul',K4:'rojo',K5:'morado',K6:'negro','':'gris'};
const CSVMAP = {tipo:'t',zona_provincia:'zona',parking_lat:'plat',parking_lon:'plon',compromiso_I_VI:'lv',t_aprox_min:'ta',t_actividad_min:'td',t_retorno_min:'tr',combinacion_coches:'comb',restricciones:'restr',pernocta_tipo:'pt',pago:'pg',descripcion:'desc',provincia:'prov',comunidad:'ccaa',parking_nota:'pnota',parking_fuente:'pfu',enlace_fuente:'url',enlace_caudales:'caudal'};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

// ---------- interfaz de filtros ----------
$('lv').innerHTML = LV.map(l => `<label><input type="checkbox" class="lv" value="${l}" checked><span class="dot" style="background:${COL[LVC[l]]}"></span>${l}</label>`).join('');
$('kk').innerHTML = KS.map(k => `<label><input type="checkbox" class="k" value="${k}" checked><span class="dot" style="background:${COL[KC[k]]}"></span>${k || 'sin K'}</label>`).join('');
$('vmax').innerHTML = '<option value="">Cualquiera</option>' + [1,2,3,4,5,6,7].map(v => `<option>${v}</option>`).join('');
$('amax').innerHTML = $('vmax').innerHTML;

// ---------- mapa ----------
const map = L.map('map', {preferCanvas: true}).setView([40.6, -2.5], 6);
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const osm = L.tileLayer(TILE, {maxZoom: 18, attribution: '© colaboradores de OpenStreetMap'}).addTo(map);
// Mapa base propio sin cobertura (PMTiles, vectorial, zoom 0–9; más allá se amplía).
const BASE_URL = new URL('mapa-base/espana.pmtiles', location.href).href, BASE_CACHE = 'mapabase-v1';
const oscuro = matchMedia('(prefers-color-scheme: dark)').matches;
const base = (window.protomapsL ? protomapsL.leafletLayer({url: BASE_URL, flavor: oscuro ? 'dark' : 'light', lang: 'es', maxDataZoom: 9, maxZoom: 18,
  attribution: '© colaboradores de OpenStreetMap · Protomaps'}) : null);
if (base) L.control.layers({'OpenStreetMap (con cobertura)': osm, 'España sin cobertura (propio)': base}, null, {position: 'topright'}).addTo(map);
async function baseGuardada() { try { return !!(await (await caches.open(BASE_CACHE)).match(BASE_URL)); } catch (e) { return false; } }
async function eligeBase() {
  if (!base) return;
  const sinRed = !navigator.onLine;
  if (sinRed && await baseGuardada()) { if (map.hasLayer(osm)) { map.removeLayer(osm); map.addLayer(base); } }
  else if (!sinRed && map.hasLayer(base) && !base._elegidaAMano) { map.removeLayer(base); map.addLayer(osm); }
}
map.on('baselayerchange', e => { if (base) base._elegidaAMano = (e.layer === base); });
const cl = L.markerClusterGroup({chunkedLoading: true, disableClusteringAtZoom: 12});
map.addLayer(cl);

let P = [];  // puntos normalizados
function normal(o) {
  const t = ({barranco:'b',ferrata:'f',pernocta:'p',cueva:'c'})[o.t] || o.t;
  let pt = String(o.pt || '').toLowerCase(), pg = String(o.pg || '').toLowerCase();
  pt = pt.startsWith('camp') ? 'cam' : pt.startsWith('área') || pt.startsWith('area') || pt === 'ac' ? 'ac' : pt ? 'nat' : '';
  pg = pg.startsWith('no') || pg === 'g' ? 'g' : pg.startsWith('sí') || pg.startsWith('si') || pg === 'p' ? 'p' : '?';
  let lv = String(o.lv || o.dificultad_fuente || '').trim().toUpperCase();
  return {id:o.id, t, n:o.nombre || '', z:o.zona || '', la:num(o.lat), lo:num(o.lon), pla:num(o.plat), plo:num(o.plon), lv,
    V:num(o.V), A:num(o.A), C:o.C || '', K:String(o.K || '').toUpperCase(), ta:num(o.ta), td:num(o.td), tr:num(o.tr),
    comb:String(o.comb || '').toLowerCase(), restr:o.restr || '', ep:o.epoca || '', pt, pg, de:o.desc || '', url:o.url || '', cau:o.caudal || '', fu:o.fuente || '', pr:o.prov || '', cc:o.ccaa || '', pn:o.pnota || '', pf:o.pfu || ''};
}
function parseCSV(txt) {
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  if (cur || row.length) { row.push(cur); out.push(row); }
  const h = out.shift().map(k => CSVMAP[k] || k);
  return out.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
async function cargar() {
  let txt, desdeCache = false;
  try { const r = await fetch(DATOS_URL, {cache: 'no-cache'}); if (!r.ok) throw new Error(r.status); txt = await r.clone().text(); if ('caches' in window) caches.open('datos-v1').then(c => c.put(DATOS_URL, r)).catch(() => {}); }
  catch (e) { const c = await caches.match(DATOS_URL, {ignoreSearch: false}).catch(() => null) || await caches.match(new URL(DATOS_URL, location.href).href).catch(() => null); if (!c) { $('fuente').innerHTML = '<small>No se han podido cargar los datos (sin cobertura y sin copia guardada).</small>'; return; } txt = await c.text(); desdeCache = true; }
  let filas, info = {};
  if (txt.trim().startsWith('{')) { const j = JSON.parse(txt); info = j; filas = j.rows.map(r => Object.fromEntries(j.cols.map((k, i) => [k, r[i]]))); }
  else filas = parseCSV(txt);
  P = filas.map(normal).filter(p => p.la != null && p.lo != null);
  const n = {b:0,f:0,c:0,p:0}; P.forEach(p => n[p.t] = (n[p.t] || 0) + 1);
  $('fuente').innerHTML = `<small>${n.b} barrancos · ${n.f} ferratas · ${n.c} cuevas · ${n.p} pernocta${info.version ? ' · datos ' + esc(info.version) : ''}${desdeCache ? ' · <b>copia sin conexión</b>' : ''}</small>`;
  $('lic').textContent = info.licencias || '';
  const conV = P.filter(p => p.t === 'b' && p.V != null).length, conT = P.filter(p => p.t === 'b' && p.tr != null).length;
  $('notaB').textContent = `Con V/A: ${conV} de ${n.b}; con tiempos: ${conT}. Graduación, compromiso y tiempos de Descente-Canyon (CC BY-NC-SA) donde existen; en el resto, el compromiso es provisional (dificultad de Infobarrancos).`;
  aplicaMios(); rellenaCC(); construir(); aplicar();
}
// ---------- desplegables de comunidad/país y provincia ----------
const ord = (x, y) => x.localeCompare(y, 'es');
function opciones(el, lista, cuenta) { const v = el.value; el.innerHTML = '<option value="">Todas</option>' + lista.map(x => `<option value="${esc(x)}">${esc(x)} (${cuenta[x]})</option>`).join(''); el.value = lista.includes(v) ? v : ''; }
function rellenaCC() { const n = {}; P.forEach(p => { if (p.cc) n[p.cc] = (n[p.cc] || 0) + 1; }); opciones($('cc'), Object.keys(n).sort(ord), n); rellenaPR(); }
function rellenaPR() { const c = $('cc').value, n = {}; P.forEach(p => { if (p.pr && (!c || p.cc === c)) n[p.pr] = (n[p.pr] || 0) + 1; }); opciones($('pr'), Object.keys(n).sort(ord), n); }
$('cc').addEventListener('change', rellenaPR);
function encuadra() { setTimeout(() => { const b = cl.getBounds(); if (b.isValid()) map.fitBounds(b, {padding: [20, 20], maxZoom: 12}); }, 0); }
$('cc').addEventListener('change', encuadra); $('pr').addEventListener('change', encuadra);

// ---------- marcadores y ficha ----------
let MK = [];
function color(p) { if (p.t === 'p') return PCOL[p.pt] || PCOL.nat; if (p.t === 'c') return CUEVA; if (p.t === 'f') return COL[KC[p.K] || 'gris']; return COL[LVC[p.lv]] || COL.gris; }
function ficha(p) {
  const park = p.pla != null ? [p.pla, p.plo] : [p.la, p.lo];
  const min = v => v == null ? null : v === 0 ? 'inmediato' : v + ' min';
  const R = [['Zona', p.z], p.pr && !String(p.z).includes(p.pr) ? ['Provincia', p.pr + (p.cc ? ' (' + p.cc + ')' : '')] : null,
    p.t === 'b' ? ['Compromiso / dificultad', p.lv] : null,
    p.t === 'b' && (p.V != null || p.A != null) ? ['Graduación', `V${p.V ?? '?'} A${p.A ?? '?'} ${p.C}`] : null,
    p.t === 'f' ? ['K', p.K || 'sin dato'] : null,
    min(p.ta) ? ['Aproximación', min(p.ta)] : null, min(p.td) ? [p.t === 'b' ? 'Descenso' : 'Actividad', min(p.td)] : null, min(p.tr) ? ['Retorno', min(p.tr)] : null,
    p.comb ? ['Combinación de coches', p.comb] : null, p.restr ? ['Restricciones', p.restr] : null,
    p.t === 'p' ? ['Tipo', {ac:'Área de autocaravanas', cam:'Camping', nat:'Zona natural / acampada'}[p.pt]] : null,
    p.t === 'p' ? ['Pago', {g:'Gratis', p:'De pago', '?':'Sin dato'}[p.pg]] : null,
    p.pn ? ['Parking', p.pn.replace(/\s*https?:\/\/\S+$/, '')] : (p.t === 'b' || p.t === 'f') && p.pla == null ? ['Parking', 'sin parking verificado (mira la reseña o Wikiloc)'] : null, p.pf && p.t !== 'p' ? ['Origen del parking', p.pf] : null, p.ep ? ['Época', p.ep] : null, p.de ? ['Nota', p.de] : null].filter(Boolean);
  const urls = String(p.url).split(/\s*;\s*/).filter(Boolean).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">${i ? 'Otra fuente' : 'Fuente / reseña'}</a>`).join(' · ');
  return `<div class="pop"><b>${esc(p.n || '(sin nombre)')}</b><table>${R.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>${urls}
  ${p.cau ? ` · <a href="${esc(p.cau)}" target="_blank" rel="noopener">Caudales</a>` : ''}
  ${/https?:\/\/\S+$/.test(p.pn) ? ` · <a href="${esc(p.pn.match(/https?:\/\/\S+$/)[0])}" target="_blank" rel="noopener">Ficha del parking</a>` : ''}
  ${p.t === 'b' || p.t === 'f' ? ` · <a href="https://www.google.com/search?q=${encodeURIComponent('site:wikiloc.com ' + (p.n || '') + ' ' + (p.pr || ''))}" target="_blank" rel="noopener">Buscar en Wikiloc</a>` : ''}
  · <a href="https://www.google.com/maps/dir/?api=1&destination=${park[0]},${park[1]}" target="_blank" rel="noopener">Cómo llegar${p.pla != null ? ' (parking)' : ''}</a>
  ${p.t === 'b' || p.t === 'f' ? ` · <a href="#" onclick="marcaParking('${esc(p.id)}');return false">📍 ${MIOS[p.id] ? 'Corregir mi parking' : 'Marcar / corregir parking'}</a>${MIOS[p.id] ? ` · <a href="#" onclick="quitaParking('${esc(p.id)}');return false">Quitar mi parking</a>` : ''}` : ''}
  · <a href="#" onclick="alrededor(${p.la},${p.lo},'${esc(p.n || 'este punto').replace(/'/g, '')}');return false">Buscar alrededor</a></div>`;
}
function construir() {
  MK = P.map(p => L.circleMarker([p.la, p.lo], {radius: p.t === 'p' ? 5 : 7, color: '#0007', weight: 1, fillColor: color(p), fillOpacity: .95}).bindPopup(() => ficha(p)));
}

// ---------- filtros ----------
const vals = c => new Set([...document.querySelectorAll('.' + c + ':checked')].map(e => e.value));
function aplicar() {
  const T = vals('t'), LVs = vals('lv'), Ks = vals('k'), PT = vals('pt'), PG = vals('pg'), q = $('q').value.trim().toLowerCase();
  const vmax = num($('vmax').value), amax = num($('amax').value), ret = num($('ret').value), apx = num($('apx').value), dsc = num($('dsc').value);
  const sinComb = $('sinComb').checked, inc = $('incSin').checked, CC = $('cc').value, PR = $('pr').value;
  const okMax = (v, m) => m == null || (v == null ? inc : v <= m);
  const okRet = (v, m) => m == null || (v == null ? inc : m === 0 ? v === 0 : v < m);
  const on = [], cerca = [], R = num($('rad').value);
  P.forEach((p, i) => {
    if (!T.has(p.t)) return;
    if (CC && p.cc !== CC) return; if (PR && p.pr !== PR) return;
    if (p.t === 'b') { if (!LVs.has(p.lv)) return; if (!okMax(p.V, vmax) || !okMax(p.A, amax) || !okRet(p.tr, ret) || !okMax(p.ta, apx) || !okMax(p.td, dsc)) return;
      if (sinComb && (p.comb ? p.comb.startsWith('s') : !inc)) return; }
    if (p.t === 'f' && !Ks.has(p.K)) return;
    if (p.t === 'p' && (!PT.has(p.pt) || !PG.has(p.pg))) return;
    if (q && !(p.n + ' ' + p.z + ' ' + p.pr + ' ' + p.cc).toLowerCase().includes(q)) return;
    if (CEN) { const d = distKm(CEN.lat, CEN.lng, p.la, p.lo); if (R != null && d > R) return; cerca.push([d, i]); }
    on.push(MK[i]);
  });
  cl.clearLayers(); cl.addLayers(on);
  $('count').textContent = on.length.toLocaleString('es-ES') + ' puntos visibles' + (CEN && R != null ? ` a ≤ ${R} km` : '');
  pintaCerca(cerca, R);
}
// ---------- alrededor de mí / de un punto ----------
let CEN = null, circ = null, cenMk = null, pick = false;
function distKm(a, b, c, d) { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); }
const TIPO = {b: 'Barranco', f: 'Ferrata', c: 'Cueva', p: 'Pernocta'};
function pintaCerca(cerca, R) {
  if (circ) { circ.remove(); circ = null; }
  if (!CEN) { $('cerca').innerHTML = ''; return; }
  if (R != null) circ = L.circle(CEN, {radius: R * 1000, color: '#1e88e5', weight: 1, fillOpacity: .04, interactive: false}).addTo(map);
  cerca.sort((a, b) => a[0] - b[0]);
  $('cerca').innerHTML = cerca.length ? cerca.slice(0, 100).map(([d, i]) => `<div class="cer" data-i="${i}" style="cursor:pointer;padding:2px 0;border-bottom:1px solid var(--line)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color(P[i])}"></span> ${d < 10 ? d.toFixed(1) : Math.round(d)} km · ${esc(TIPO[P[i].t] || '')} · ${esc(P[i].n || '(sin nombre)')}</div>`).join('') + (cerca.length > 100 ? `<small>… y ${cerca.length - 100} más (acerca el radio)</small>` : '') : '<small>Nada con estos filtros en ese radio.</small>';
}
$('cerca').addEventListener('click', e => { const el = e.target.closest('.cer'); if (!el) return; const m = MK[+el.dataset.i]; cl.zoomToShowLayer(m, () => m.openPopup()); });
function ponCentro(ll, txt) {
  CEN = L.latLng(ll); if (cenMk) cenMk.remove();
  cenMk = L.circleMarker(CEN, {radius: 9, color: '#e53935', weight: 3, fillColor: '#fff', fillOpacity: .9, interactive: false}).addTo(map);
  $('cenTxt').textContent = '(' + txt + ')'; $('btnCenX').hidden = false;
  if ($('rad').value === '') $('rad').value = '25';
  aplicar(); const R = num($('rad').value); if (R) map.fitBounds(CEN.toBounds(R * 2000));
}
window.alrededor = (la, lo, n) => { map.closePopup(); ponCentro([la, lo], 'alrededor de ' + n); };
$('btnPick').onclick = () => { pick = !pick; $('btnPick').classList.toggle('pri', pick); estado(pick ? 'Toca el mapa donde quieras buscar alrededor.' : ''); };
map.on('click', e => { if (!pick) return; pick = false; $('btnPick').classList.remove('pri'); estado(''); ponCentro(e.latlng, 'punto elegido'); });
$('btnCenX').onclick = () => { CEN = null; if (cenMk) cenMk.remove(); cenMk = null; $('btnCenX').hidden = true; $('cenTxt').textContent = '(sin centro: pulsa «Dónde estoy» o elige un punto)'; aplicar(); };
$('side').addEventListener('input', aplicar);
$('side').addEventListener('change', aplicar);

// ---------- ubicación ----------
let yo;
$('btnLoc').onclick = () => map.locate({setView: false, enableHighAccuracy: true, timeout: 20000});
map.on('locationfound', e => { if (yo) yo.remove(); yo = L.circleMarker(e.latlng, {radius: 8, color: '#fff', weight: 2, fillColor: '#1e88e5', fillOpacity: 1}).addTo(map); ponCentro(e.latlng, 'donde estás'); });
map.on('locationerror', () => estado('No se ha podido obtener la ubicación.'));

// ---------- sin cobertura: guardar la zona visible ----------
// Respeta la política de uso de las teselas de OpenStreetMap: máximo 400 teselas por zona y zoom ≤ 15.
// Para un mapa base completo sin cobertura está prevista una fase con teselas propias (PMTiles), ver LEEME.
const MAXT = 400;
function estado(t) { $('estado').textContent = t; }
function teselas(b, z) { const n = 2 ** z, X = lo => Math.floor((lo + 180) / 360 * n),
  Y = la => { const r = la * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n); };
  const out = []; for (let x = X(b.getWest()); x <= X(b.getEast()); x++) for (let y = Y(b.getNorth()); y <= Y(b.getSouth()); y++) out.push(TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y)); return out; }
$('btnZona').onclick = async () => {
  if (!('caches' in window)) return estado('Este navegador no permite guardar mapas.');
  const z0 = map.getZoom(); if (z0 < 9) return estado('Acerca más el mapa (zoom 9 o más) a la zona que quieras guardar.');
  let lista = []; for (let z = z0; z <= Math.min(15, z0 + 3); z++) { const t = teselas(map.getBounds(), z); if (lista.length + t.length > MAXT) break; lista = lista.concat(t); }
  const c = await caches.open('teselas-v1'); let ok = 0;
  for (let i = 0; i < lista.length; i++) { try { if (!(await c.match(lista[i]))) { const r = await fetch(lista[i], {mode: 'cors'}); if (r.ok) await c.put(lista[i], r); } ok++; } catch (e) {}
    if (i % 20 === 0) estado(`Guardando mapa: ${i}/${lista.length}…`); }
  const dc = await caches.open('datos-v1'); try { const r = await fetch(DATOS_URL, {cache: 'no-cache'}); if (r.ok) await dc.put(DATOS_URL, r); } catch (e) {}
  estado(`Zona guardada para usar sin cobertura: ${ok} teselas (zoom ${z0}–${Math.min(15, z0 + 3)}) y los puntos.`);
};

// ---------- mapa base de España sin cobertura (una sola descarga) ----------
$('btnBase').onclick = async () => {
  if (!base || !('caches' in window)) return estado('Este navegador no permite guardar el mapa base.');
  if (await baseGuardada()) { estado('El mapa base de España ya está guardado: se usa solo cuando no hay cobertura.'); return; }
  try {
    estado('Descargando el mapa base de España (unos 30 MB, mejor con wifi)…');
    const r = await fetch(BASE_URL, {cache: 'no-cache'}); if (!r.ok) throw new Error(r.status);
    await (await caches.open(BASE_CACHE)).put(BASE_URL, r);
    estado('Mapa base de España guardado (zoom 0–9, carreteras, pueblos, ríos, zonas verdes y agua). Sin cobertura se usa solo.');
  } catch (e) { estado('No se ha podido descargar el mapa base: ' + e.message); }
};
eligeBase();

// ---------- parkings marcados a mano (decisión d de Rafael, v1.14) ----------
// Se guardan en este navegador; «Exportar mis parkings» da un CSV para pegarlo en la tabla online (Google Sheet) y que llegue a todos.
const MIOS_KEY = 'e056-parkings-v1';
let MIOS = {}; try { MIOS = JSON.parse(localStorage.getItem(MIOS_KEY) || '{}') || {}; } catch (e) { MIOS = {}; }
const ORIG = {};
function guardaMios() { try { localStorage.setItem(MIOS_KEY, JSON.stringify(MIOS)); } catch (e) { estado('No se ha podido guardar en este navegador.'); } }
function aplicaMios() {
  P.forEach(p => { if (!(p.id in ORIG)) ORIG[p.id] = {pla: p.pla, plo: p.plo, pn: p.pn, pf: p.pf};
    const m = MIOS[p.id];
    if (m) Object.assign(p, {pla: m.la, plo: m.lo, pn: `Marcado a mano el ${m.f.slice(0, 10)}`, pf: 'Marcado a mano en la web (Rafael)'});
    else Object.assign(p, ORIG[p.id]); });
}
function rehaz() { aplicaMios(); }
window.marcaParking = id => {
  const p = P.find(x => x.id === id); if (!p) return;
  map.closePopup(); estado(`Toca en el mapa dónde se aparca para «${p.n}» (acerca bien el mapa antes).`);
  setTimeout(() => map.once('click', e => {
    MIOS[id] = {la: +e.latlng.lat.toFixed(6), lo: +e.latlng.lng.toFixed(6), f: new Date().toISOString(), n: p.n};
    guardaMios(); rehaz(); estado(`Parking guardado para «${p.n}». Expórtalo para pasarlo a la tabla online.`);
  }), 50);
};
window.quitaParking = id => { delete MIOS[id]; guardaMios(); map.closePopup(); rehaz(); estado('Parking marcado quitado.'); };
$('btnExp').onclick = () => {
  const ids = Object.keys(MIOS); if (!ids.length) return estado('Aún no has marcado ningún parking.');
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = 'id,nombre,parking_lat,parking_lon,parking_fuente,fecha\n' + ids.map(i => [i, MIOS[i].n, MIOS[i].la, MIOS[i].lo, 'Marcado a mano en la web (Rafael)', MIOS[i].f].map(q).join(',')).join('\n') + '\n';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
  a.download = `parkings-marcados-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  estado(`${ids.length} parkings exportados.`);
};

// ---------- instalación (PWA) ----------
let promptInst;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInst = e; $('btnInst').hidden = false; });
$('btnInst').onclick = async () => { if (promptInst) { promptInst.prompt(); promptInst = null; $('btnInst').hidden = true; } };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
addEventListener('offline', () => { estado('Sin conexión: se usa lo guardado.'); eligeBase(); });
addEventListener('online', () => { estado(''); eligeBase(); });

cargar();
