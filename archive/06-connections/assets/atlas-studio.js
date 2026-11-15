(function (global) {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024;
  const MAX_POINTS = 60000;
  const MAX_SEGMENTS = 3000;
  const rad = Math.PI / 180;
  const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
  function distance(a, b) {
    const p = (b[1] - a[1]) * rad, q = wrap(b[0] - a[0]) * rad;
    const h = Math.sin(p / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(q / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
  }
  function lineLength(line) { return line.reduce((sum, p, i) => sum + (i ? distance(line[i - 1], p) : 0), 0); }
  function interpolate(a, b, ratio) {
    return [wrap(a[0] + wrap(b[0] - a[0]) * ratio), a[1] + (b[1] - a[1]) * ratio];
  }
  function trimLine(line, trimMeters) {
    const total = lineLength(line);
    if (total <= trimMeters * 2 || total === 0) return [];
    if (trimMeters === 0) return line.map(p => [...p]);
    const end = total - trimMeters, result = [];
    let walked = 0;
    for (let i = 1; i < line.length; i++) {
      const length = distance(line[i - 1], line[i]);
      if (!length) continue;
      const next = walked + length;
      if (next >= trimMeters && walked <= end) {
        if (!result.length) result.push(interpolate(line[i - 1], line[i], Math.max(0, (trimMeters - walked) / length)));
        if (next >= end) { result.push(interpolate(line[i - 1], line[i], (end - walked) / length)); break; }
        result.push([...line[i]]);
      }
      walked = next;
    }
    return result;
  }
  function sanitizeRoutes(routes, options = {}) {
    const trimMeters = options.trimMeters === undefined ? 250 : Number(options.trimMeters);
    const decimals = options.decimals === undefined ? 4 : Number(options.decimals);
    if (![0, 100, 250, 500, 1000].includes(trimMeters) || ![2, 3, 4].includes(decimals)) throw new Error('Choose one of the available privacy settings.');
    const clean = routes.map(line => trimLine(line, trimMeters).map(p => p.map(v => Number(v.toFixed(decimals)))).filter((p, i, all) => !i || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1])).filter(line => line.length >= 2);
    if (!clean.length) throw new Error('These settings remove every route. Try a shorter trim or finer location detail.');
    return { routes: clean, removedSegments: routes.length - clean.length, geojson: { type: 'FeatureCollection', features: clean.map(coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })) } };
  }
  function parseAtlasXml(text, Parser) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('This file is empty. Choose an exported GPX or KML file.');
    if (text.length > MAX_BYTES) throw new Error('This file is too large. Export a smaller selection, under 5 MB.');
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('This file uses unsupported XML declarations. Export it again as a plain GPX or KML file.');
    const Constructor = Parser || global.DOMParser;
    if (!Constructor) throw new Error('This browser cannot read route files. Try a current browser.');
    const doc = new Constructor().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length || doc.getElementsByTagNameNS('*', 'parsererror').length) throw new Error('This file is not valid XML. Export it again from MapOut.');
    const kind = doc.documentElement && doc.documentElement.localName.toLowerCase();
    if (!['gpx', 'kml'].includes(kind)) throw new Error('Choose a GPX or KML route file. Compressed KMZ and backup ZIP files must be unpacked first.');
    const routes = []; let count = 0;
    const coordinate = (lon, lat) => {
      if (lon === null || lat === null || !String(lon).trim() || !String(lat).trim()) throw new Error('A route coordinate is missing. Export this journey again.');
      const p = [Number(lon), Number(lat)];
      if (!p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('A route has an invalid coordinate. Export this journey again.');
      if (++count > MAX_POINTS) throw new Error('This route has too many points. Export a shorter journey (up to 60,000 points).');
      return p;
    };
    const add = line => { if (line.length >= 2) routes.push(line); if (routes.length > MAX_SEGMENTS) throw new Error('This file contains too many segments. Export a smaller selection.'); };
    const elements = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
    if (kind === 'gpx') {
      for (const [segment, point] of [['trkseg', 'trkpt'], ['rte', 'rtept']]) {
        for (const el of elements(doc, segment)) add(Array.from(el.children).filter(child => child.localName === point).map(p => coordinate(p.getAttribute('lon'), p.getAttribute('lat'))));
      }
    } else {
      for (const el of elements(doc, 'LineString')) {
        const node = Array.from(el.children).find(child => child.localName === 'coordinates');
        if (!node || !node.textContent.trim()) continue;
        add(node.textContent.trim().split(/\s+/).map(tuple => { const p = tuple.split(','); return coordinate(p[0] ?? null, p[1] ?? null); }));
      }
    }
    if (!routes.length) throw new Error('No route lines were found. Choose a GPX track/route or a KML LineString. Waypoints and network links are not imported.');
    return routes;
  }
  const api = { parseAtlasXml, sanitizeRoutes, trimLine, lineLength, distance, MAX_BYTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AtlasStudio = api;
  if (typeof document === 'undefined') return;
  const byId = id => document.getElementById(id);
  if (!byId('route-file')) return;
  let source = [], prepared = null, readGeneration = 0;
  const input = byId('route-file'), status = byId('status-message'), button = byId('export-routes'), previewButton = byId('preview-in-nomad');
  function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
  function clearPreview() {
    byId('original-paths').replaceChildren(); byId('clean-paths').replaceChildren();
    byId('empty-preview').hidden = false; byId('preview-state').textContent = 'Waiting for a journey'; byId('preview-state').classList.remove('ready');
    for (const id of ['stat-segments', 'stat-distance', 'stat-points']) byId(id).textContent = '—';
    button.disabled = true; previewButton.disabled = true; prepared = null;
  }
  function svgNode(name, attrs) { const node = document.createElementNS('http://www.w3.org/2000/svg', name); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); return node; }
  function draw() {
    byId('original-paths').replaceChildren(); byId('clean-paths').replaceChildren();
    if (!prepared) return;
    const points = source.concat(prepared.routes).flat(), origin = points[0][0];
    const meanLat = points.reduce((s, p) => s + p[1], 0) / points.length;
    const factor = Math.max(.01, Math.cos(meanLat * rad));
    const project = p => [wrap(p[0] - origin) * factor, -p[1]];
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const p of points) { const [x, y] = project(p); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const scale = Math.min(840 / Math.max(.000001, xmax - xmin), 440 / Math.max(.000001, ymax - ymin));
    const xy = p => { const [x, y] = project(p); return [500 + (x - (xmin + xmax) / 2) * scale, 300 + (y - (ymin + ymax) / 2) * scale]; };
    function addPaths(lines, parent, original) {
      for (const line of lines) {
        const d = line.map((p, i) => `${i ? 'L' : 'M'}${xy(p).map(v => v.toFixed(2)).join(',')}`).join(' ');
        parent.append(svgNode('path', { d, fill: 'none', stroke: original ? '#cbd3df' : '#ff553b', 'stroke-width': original ? 1.2 : 2.5, 'stroke-opacity': original ? .36 : 1, 'stroke-dasharray': original ? '4 6' : 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
        if (!original) for (const [point, fill] of [[line[0], '#eff1ee'], [line[line.length - 1], '#ff553b']]) { const [cx, cy] = xy(point); parent.append(svgNode('circle', { cx, cy, r: 4, fill, stroke: '#101727', 'stroke-width': 2 })); }
      }
    }
    if (byId('show-original').checked) addPaths(source, byId('original-paths'), true);
    addPaths(prepared.routes, byId('clean-paths'), false);
  }
  function refresh() {
    if (!source.length) return;
    try {
      prepared = sanitizeRoutes(source, { trimMeters: byId('trim-distance').value, decimals: byId('coordinate-precision').value });
      byId('empty-preview').hidden = true; button.disabled = false; previewButton.disabled = false;
      byId('preview-state').textContent = 'Ready for your review'; byId('preview-state').classList.add('ready');
      byId('stat-segments').textContent = prepared.routes.length.toLocaleString();
      byId('stat-points').textContent = prepared.routes.reduce((n, line) => n + line.length, 0).toLocaleString();
      byId('stat-distance').textContent = `${(prepared.routes.reduce((n, line) => n + lineLength(line), 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
      byId('route-preview').setAttribute('aria-label', `Preview of ${prepared.routes.length} cleaned route segments. White marks the start; orange marks the end.`);
      message(`${prepared.removedSegments ? `${prepared.removedSegments} short segment${prepared.removedSegments === 1 ? '' : 's'} removed. ` : ''}White marks the start; orange marks the end. Only the orange routes will be downloaded.`);
      draw();
    } catch (error) { clearPreview(); byId('preview-state').textContent = 'Adjust your settings'; message(error.message, true); }
  }
  async function loadFile(file) {
    const generation = ++readGeneration; source = []; clearPreview();
    byId('file-name').textContent = file ? file.name : 'No file selected'; byId('clear-file').hidden = !file;
    if (!file) return;
    if (file.size > MAX_BYTES) { message('This file is too large. Export a smaller selection, under 5 MB.', true); return; }
    message('Reading your file locally…');
    try { const text = await file.text(); if (generation !== readGeneration) return; source = parseAtlasXml(text); refresh(); }
    catch (error) { if (generation === readGeneration) message(error.message || 'This file could not be read. Please try another export.', true); }
  }
  input.addEventListener('change', () => loadFile(input.files[0]));
  byId('clear-file').addEventListener('click', () => { ++readGeneration; source = []; input.value = ''; clearPreview(); byId('file-name').textContent = 'No file selected'; byId('clear-file').hidden = true; try { sessionStorage.removeItem('nomad.previewRoutes'); } catch (_) {} message('File and local preview cleared. Nothing was uploaded.'); });
  for (const id of ['trim-distance', 'coordinate-precision']) byId(id).addEventListener('change', refresh);
  byId('show-original').addEventListener('change', draw);
  const drop = byId('drop-zone');
  for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('dragover'); });
  for (const type of ['dragleave', 'drop']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('dragover'); });
  drop.addEventListener('drop', event => { if (event.dataTransfer.files.length !== 1) { message('Choose one route file at a time.', true); return; } input.value = ''; loadFile(event.dataTransfer.files[0]); });
  previewButton.addEventListener('click', () => {
    if (!prepared) return;
    try {
      sessionStorage.setItem('nomad.previewRoutes', JSON.stringify(prepared.geojson));
      location.href = './?atlas=preview#travel';
    } catch (_) {
      message('This browser could not keep the preview in this tab. You can still download your clean GeoJSON.', true);
    }
  });
  button.addEventListener('click', () => {
    if (!prepared) return;
    const blob = new Blob([JSON.stringify(prepared.geojson, null, 2) + '\n'], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'atlas-routes.geojson'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    message('Clean GeoJSON downloaded. Review it before adding it to your public atlas.');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
