(() => {
  const D = window.CAMPGROUNDS;
  const NETS = { tt: { name: 'Thousand Trails', color: '#1f9d55' }, en: { name: 'Encore', color: '#2563eb' }, pa: { name: 'Passport America', color: '#dc2626' } };
  const ORDER = { tt: 300, en: 200, pa: 100 };           // keeps the smaller networks on top of Passport America
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const map = L.map('map', { zoomControl: true, worldCopyJump: true });
  const US_BOUNDS = [[24.4, -125.5], [49.6, -66.5]];
  map.fitBounds(US_BOUNDS);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, and the GIS User Community',
  }).addTo(map);

  // One donut per cluster, split into the colors of the networks inside it.
  function clusterIcon(cluster) {
    const kids = cluster.getAllChildMarkers(), n = kids.length;
    const counts = { tt: 0, en: 0, pa: 0 }; kids.forEach((m) => counts[m.options.net]++);
    const size = n < 10 ? 40 : n < 100 ? 48 : 58, r = size / 2 - 5, C = 2 * Math.PI * r;
    let off = 0, arcs = '';
    for (const k of ['tt', 'en', 'pa']) {
      if (!counts[k]) continue;
      const len = (counts[k] / n) * C;
      arcs += `<circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${NETS[k].color}" stroke-width="8" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      off += len;
    }
    return L.divIcon({ className: '', iconSize: [size, size], html: `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff" stroke="#fff"/>${arcs}<text class="cl" x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#16202b">${n}</text></svg>` });
  }
  const cluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 45, showCoverageOnHover: false, iconCreateFunction: clusterIcon }).addTo(map);

  function popup(r, net) {
    const q = encodeURIComponent([r.n, r.a, r.c, r.s, r.z].filter(Boolean).join(', '));
    const line = [r.c, [r.s, r.z].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return `<div class="pop"><span class="tag" style="background:${NETS[net].color}">${NETS[net].name}</span><h3>${esc(r.n)}</h3>${r.a ? `<p>${esc(r.a)}</p>` : ''}<p>${esc(line)}</p><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Find on Google Maps</a><small>${r.p === 'exact' ? 'Exact location' : 'Pin is at the ZIP code center'}</small></div>`;
  }

  const markers = {}, on = { tt: true, en: true, pa: true };
  for (const net of Object.keys(NETS)) {
    markers[net] = D.networks[net].map((r) => {
      const m = L.marker([r.lat, r.lng], { net, zIndexOffset: ORDER[net], icon: L.divIcon({ className: '', iconSize: [16, 16], html: `<span class="dot" style="--c:${NETS[net].color}"></span>` }) });
      m.bindPopup(() => popup(r, net), { maxWidth: 280 }); m.rec = r; return m;
    });
    cluster.addLayers(markers[net]);
  }

  // ---- state search ----
  const states = Object.keys(D.bounds).sort();
  let current = null, shown = [], active = -1;
  const q = $('q'), sugg = $('sugg'), msg = $('msg');

  function match(text) {
    const t = norm(text); if (!t) return [];
    const scored = [];
    for (const s of states) {
      const n = norm(s), ab = (D.abbr[s] || '').toLowerCase();
      let score = 0;
      if (n === t || ab === t) score = 4; else if (n.startsWith(t)) score = 3; else if (n.split(' ').some((w) => w.startsWith(t))) score = 2; else if (n.includes(t)) score = 1;
      if (score) scored.push([score, s]);
    }
    return scored.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1])).map((x) => x[1]);
  }
  function openList(list) {
    shown = list; active = list.length ? 0 : -1;
    sugg.innerHTML = list.map((s, i) => `<li role="option" id="o${i}" data-s="${esc(s)}" aria-selected="${i === 0}">${esc(s)}<span>${esc(D.abbr[s] || '')}</span></li>`).join('');
    sugg.hidden = !list.length; q.setAttribute('aria-expanded', String(!!list.length));
  }
  const closeList = () => { sugg.hidden = true; q.setAttribute('aria-expanded', 'false'); };
  function highlight(i) {
    active = (i + shown.length) % shown.length;
    [...sugg.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === active)));
    q.setAttribute('aria-activedescendant', 'o' + active); sugg.children[active].scrollIntoView({ block: 'nearest' });
  }
  function goTo(state) {
    current = state; q.value = state; msg.textContent = ''; closeList(); $('clear').hidden = false;
    const [s, w, n, e] = D.bounds[state];
    map.flyToBounds([[s, w], [n, e]], { padding: [40, 40], maxZoom: 9, duration: reduced ? 0 : 0.9 });
    render();
  }
  function clearState() { current = null; q.value = ''; msg.textContent = ''; closeList(); $('clear').hidden = true; render(); }

  q.addEventListener('input', () => {
    const list = match(q.value); $('clear').hidden = !q.value; msg.textContent = '';
    if (q.value && !list.length) msg.textContent = `No state matches “${q.value}”.`;
    openList(list);
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && shown.length) { e.preventDefault(); sugg.hidden ? openList(shown) : highlight(active + 1); }
    else if (e.key === 'ArrowUp' && shown.length) { e.preventDefault(); highlight(active - 1); }
    else if (e.key === 'Escape') closeList();
    else if (e.key === 'Enter') {
      e.preventDefault();
      const list = sugg.hidden ? match(q.value) : shown;
      if (list.length) goTo(list[Math.max(active, 0)]); else if (q.value) msg.textContent = `No state matches “${q.value}”.`;
    }
  });
  sugg.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); goTo(li.dataset.s); } });
  q.addEventListener('blur', closeList);
  $('clear').addEventListener('click', () => { clearState(); q.focus(); });
  $('reset').addEventListener('click', () => { clearState(); map.flyToBounds(US_BOUNDS, { duration: reduced ? 0 : 0.9 }); });

  // ---- network toggles ----
  document.querySelectorAll('.net').forEach((b) => b.addEventListener('click', () => {
    const net = b.dataset.net; on[net] = !on[net];
    on[net] ? cluster.addLayers(markers[net]) : cluster.removeLayers(markers[net]);
    render();
  }));

  function render() {
    document.querySelectorAll('.net').forEach((b) => {
      const net = b.dataset.net, total = markers[net].length;
      const inState = current ? markers[net].filter((m) => m.rec.s === current).length : total;
      b.setAttribute('aria-pressed', String(on[net])); b.querySelector('b').textContent = inState.toLocaleString();
    });
    const count = Object.keys(NETS).reduce((a, net) => a + (on[net] ? (current ? markers[net].filter((m) => m.rec.s === current).length : markers[net].length) : 0), 0);
    const where = current ? ` in ${current}` : '';
    $('summary').textContent = !Object.values(on).some(Boolean) ? 'Select a network to show campgrounds.' : count ? `${count.toLocaleString()} campground${count === 1 ? '' : 's'}${where}` : `No campgrounds${where} for the selected networks.`;
  }
  render();
})();
