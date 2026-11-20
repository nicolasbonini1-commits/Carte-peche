// Carte de pêche loup & dorade — application
(function () {
  const M = window.MODEL;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const PAL = {
    jour: ["#d6e2ea", "#f3d27e", "#eea13f", "#d9602a", "#9c2a1c"],
    nuit: ["#3a4c66", "#1f7a8c", "#35b7a0", "#f2d24b", "#ff7b3a"]
  };
  const pad = n => String(n).padStart(2, "0");
  const hm = d => `${pad(d.getHours())} h ${pad(d.getMinutes())}`;
  const dayName = d => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- État ----------
  const overrides = LS.get("cp_pos", {});
  const SPOTS = window.SPOTS.map(s => overrides[s.id] ? { ...s, lat: overrides[s.id][0], lon: overrides[s.id][1], moved: true } : s);
  const state = {
    data: null, // {times:[Date], F:{W,C,E,R}, S:{W,C,E}, sun:{'YYYY-MM-DD':{rise,set}}, fetchedAt}
    drive: LS.get("cp_drive", null),
    plan: Object.assign({ day: 0, depart: "06:00", hours: 4, species: "loup", origin: "home" }, LS.get("cp_plan", {})),
    themeMode: LS.get("cp_theme", "auto"),
    origin: LS.get("cp_origin", window.HOME),
    carnet: LS.get("cp_carnet", []),
    results: [],
    selected: null
  };

  // ---------- Thème jour / nuit ----------
  function isNightNow() {
    const now = new Date();
    const key = now.toISOString().slice(0, 10);
    const sun = state.data && state.data.sun[localKey(now)];
    const min = now.getHours() * 60 + now.getMinutes();
    const rise = sun ? sun.rise : 450, set = sun ? sun.set : 1035;
    return min < rise - 20 || min > set + 20;
  }
  function theme() { return state.themeMode === "auto" ? (isNightNow() ? "nuit" : "jour") : state.themeMode; }
  function applyTheme() {
    const t = theme();
    document.documentElement.dataset.theme = t;
    $("#themeBtn").textContent = state.themeMode === "auto" ? `Auto (${t})` : t === "jour" ? "Jour" : "Nuit";
    setBaseLayer();
  }
  $("#themeBtn").addEventListener("click", () => {
    state.themeMode = state.themeMode === "auto" ? "jour" : state.themeMode === "jour" ? "nuit" : "auto";
    LS.set("cp_theme", state.themeMode); applyTheme(); render();
  });

  // ---------- Carte ----------
  const map = L.map("map", { zoomControl: true, attributionControl: true }).setView([43.50, 4.10], 10);
  const layers = {
    jour: L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", { maxZoom: 19, subdomains: "abc", attribution: "© OpenStreetMap France" }),
    // Nuit : le même fond OpenStreetMap France que le jour, assombri par un filtre (css/style.css, .tuiles-nuit).
    // Avant (jusqu'au 18 nov. 2026) : CARTO « dark_all », qui depuis fin août 2026 exige une clé et renvoie sinon
    // des images marquées « API KEY REQUIRED », sans routes ni villes.
    nuit: L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", { maxZoom: 19, subdomains: "abc", attribution: "© OpenStreetMap France", className: "tuiles-nuit" }),
    sat: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagerie © Esri" })
  };
  const bathy = L.tileLayer.wms("https://ows.emodnet-bathymetry.eu/wms", {
    layers: "emodnet:mean_multicolour", format: "image/png", transparent: true, opacity: 0.55,
    attribution: "Profondeurs © EMODnet Bathymetry (MNT 2024)"
  });
  // Densité des navires de pêche (EMODnet Human Activities, moyenne annuelle d'après l'AIS ; ajout du 18 nov. 2026).
  // Année fixée à 2024 : la plus récente au 18 nov. 2026 (GetCapabilities, essai GitHub) ; à avancer quand 2025 sortira.
  // Sert à repérer les zones habituelles des chalutiers, pas leur position du jour. Les bateaux sans AIS (petits métiers) n'y sont pas.
  const pechePro = L.tileLayer.wms("https://ows.emodnet-humanactivities.eu/wms", {
    layers: "vesseldensity_01avg", time: "2024-01-01T00:00:00.000Z", format: "image/png", transparent: true, opacity: 0.6,
    attribution: "Navires de pêche © EMODnet Human Activities"
  });
  let base = null, useSat = false, useBathy = LS.get("cp_bathy", true), usePechePro = LS.get("cp_peche_pro", false);
  function setBaseLayer() {
    const want = useSat ? layers.sat : layers[theme()];
    if (base !== want) { if (base) map.removeLayer(base); base = want.addTo(map); base.bringToBack(); }
    if (useBathy && !map.hasLayer(bathy)) bathy.addTo(map);
    if (!useBathy && map.hasLayer(bathy)) map.removeLayer(bathy);
    if (usePechePro && !map.hasLayer(pechePro)) pechePro.addTo(map);
    if (!usePechePro && map.hasLayer(pechePro)) map.removeLayer(pechePro);
    $("#pecheProNote").hidden = !usePechePro;
  }
  $("#satBtn").addEventListener("click", e => { useSat = !useSat; e.target.classList.toggle("on", useSat); setBaseLayer(); });
  $("#bathyBtn").addEventListener("click", e => { useBathy = !useBathy; LS.set("cp_bathy", useBathy); e.target.classList.toggle("on", useBathy); setBaseLayer(); });
  $("#bathyBtn").classList.toggle("on", useBathy);
  $("#peche-proBtn").addEventListener("click", e => { usePechePro = !usePechePro; LS.set("cp_peche_pro", usePechePro); e.target.classList.toggle("on", usePechePro); setBaseLayer(); });
  $("#peche-proBtn").classList.toggle("on", usePechePro);

  // Profondeur au toucher (service EMODnet ; peut être indisponible)
  map.on("click", async e => {
    if (dragging) return;
    const { lat, lng } = e.latlng;
    const pop = L.popup().setLatLng(e.latlng).setContent("Profondeur…").openOn(map);
    try {
      const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lng.toFixed(5)}%20${lat.toFixed(5)})`);
      const j = await r.json();
      const v = j.avg ?? j.depth ?? j.mean;
      pop.setContent(v != null ? `Profondeur moyenne ≈ ${Math.abs(v).toFixed(1)} m<br><small>EMODnet, maille ~115 m</small>` : "Pas de donnée ici");
    } catch (err) { pop.setContent("Profondeur indisponible (service EMODnet)"); }
  });

  const markers = {};
  let dragging = false;
  function drawMarkers() {
    const pal = PAL[theme()];
    state.results.forEach(r => {
      const s = r.spot;
      const c = r.feasible ? pal[M.classOf(r.score)] : "#8a8f96";
      if (!markers[s.id]) {
        const halo = L.circle([s.lat, s.lon], { radius: 600, stroke: false, fillOpacity: 0.28 }).addTo(map);
        const dot = L.marker([s.lat, s.lon], { icon: dotIcon(c, ""), draggable: false }).addTo(map);
        dot.on("click", () => openSpot(s.id));
        dot.on("dragend", ev => {
          const p = ev.target.getLatLng();
          overrides[s.id] = [+p.lat.toFixed(5), +p.lng.toFixed(5)]; LS.set("cp_pos", overrides);
          s.lat = p.lat; s.lon = p.lng; halo.setLatLng(p); dot.dragging.disable(); dragging = false;
          toast("Position enregistrée sur ce téléphone");
          state.drive = null; computeDrive().then(render);
        });
        markers[s.id] = { halo, dot };
      }
      markers[s.id].halo.setStyle({ fillColor: c });
      markers[s.id].dot.setIcon(dotIcon(c, r.rank <= 3 && r.feasible ? r.rank : ""));
    });
  }
  function dotIcon(c, label) {
    const big = label !== "";
    const sz = big ? 28 : 18;
    return L.divIcon({
      className: "dot", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
      html: `<span style="background:${c};width:${sz}px;height:${sz}px">${label}</span>`
    });
  }

  // ---------- Données : météo, mer ----------
  function localKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  const toMin = s => { const t = s.split("T")[1]; return +t.slice(0, 2) * 60 + +t.slice(3, 5); };

  // Météo : deux modèles demandés en une fois à Open-Meteo.
  //  - meteofrance_seamless : AROME (maille ~1,5-2,5 km, 2 jours) puis ARPEGE Europe (~11 km, jusqu'à 4 jours) [S, doc Open-Meteo] ;
  //  - ecmwf_ifs025 : modèle européen ECMWF, pris quand Météo-France s'arrête (jours 4 à 7) et pour juger la fiabilité.
  // Mer : Open-Meteo Marine « best match », qui donne ici les mêmes valeurs que le modèle de vagues MFWAM de Météo-France
  // (vérifié le 18 nov. 2026 en comparant les deux réponses).
  // 7 jours passés : pour la pluie des jours d'avant (état des fleuves et de l'eau).
  // lastOk : le dernier essai de téléchargement a-t-il marché ? (sert aux nouveaux essais automatiques et au message du bouton)
  let lastOk = true;
  async function fetchData(force) {
    const cached = LS.get("cp_data2", null);
    if (!force && cached && Date.now() - cached.at < 45 * 60 * 1000) return parseData(cached);
    const U = window.DATA.urls(window.WX_POINTS), base = U.forecast, sUrl = U.marine;
    const getJson = async url => { const r = await fetch(url); const j = await r.json(); if (!Array.isArray(j)) throw new Error(j.reason || "réponse inattendue"); return j; };
    try {
      const sP = getJson(sUrl);
      sP.catch(() => { }); // si la météo échoue avant, l'échec de la mer n'est pas une « erreur non rattrapée »
      let f, multi = true;
      try { f = await getJson(U.forecastModels); }
      catch (e) { multi = false; f = await getJson(base); } // secours : modèle par défaut d'Open-Meteo
      const raw = { at: Date.now(), f, s: await sP, multi };
      LS.set("cp_data2", raw);
      lastOk = true; banner("");
      return parseData(raw);
    } catch (e) {
      const when = cached ? ` J'affiche les prévisions reçues le ${dayName(new Date(cached.at))} à ${hm(new Date(cached.at))}.` : "";
      lastOk = false;
      // « Failed to fetch » (Chrome) / « NetworkError » (Firefox) / « Load failed » (Safari) = aucune réponse : réseau absent ou trop faible.
      // C'est aussi le cas d'un Wi-Fi connecté sans internet (le téléphone se croit alors en ligne).
      const noNet = navigator.onLine === false || e instanceof TypeError;
      banner((noNet ? "Pas de réseau (ou réseau trop faible). Nouvel essai automatique dès qu'il revient." : `Météo indisponible (${e.message}).`) + when);
      return cached ? parseData(cached) : null;
    }
  }

  const parseData = raw => window.DATA.parse(raw);

  // ---------- Débits des fleuves (Hub'Eau, données Vigicrues) ----------
  // Une station par fleuve (window.RIVERS). Débit horaire des 7 derniers jours. Gardé 30 min sur le téléphone.
  async function fetchFlows(force) {
    const cached = LS.get("cp_flow", null);
    if (!force && cached && Date.now() - cached.at < 30 * 60 * 1000) return cached.rivers;
    const since = new Date(Date.now() - 16 * 86400000).toISOString().slice(0, 19); // 16 j : mémoire des crues (couleur de l'eau)
    const refs = await fetchFlowRefs();
    const rivers = {};
    await Promise.all(Object.entries(window.RIVERS).map(async ([key, rv]) => {
      try {
        const url = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${rv.station}&grandeur_hydro=Q&timestep=60&date_debut_obs=${since}&size=500&fields=date_obs,resultat_obs`;
        const j = await (await fetch(url)).json();
        const pts = (j.data || []).map(o => [Date.parse(o.date_obs), o.resultat_obs == null ? null : o.resultat_obs / rv.div]).filter(p => isFinite(p[0]) && p[1] != null).sort((a, b) => a[0] - b[0]);
        if (pts.length >= 6) rivers[key] = { name: rv.name, pts, ref: refs[key] || null };
      } catch (e) { /* station muette : on se rabat sur la pluie */ }
    }));
    // Sans réseau (aucune station n'a répondu) : on garde les derniers débits reçus au lieu de les effacer.
    if (!Object.keys(rivers).length && cached) return cached.rivers;
    LS.set("cp_flow", { at: Date.now(), rivers });
    return rivers;
  }
  // ---------- Houle mesurée (bouées Candhis d'Espiguette et de Sète) ----------
  // Rangée toutes les 3 h environ par la tâche GitHub « alertes » dans la branche « donnees » (la clé Candhis ne peut pas être
  // dans l'appli, qui est publique). Gardée sur le téléphone : sans réseau, on affiche la dernière reçue avec son heure.
  const HOULE_URL = "https://raw.githubusercontent.com/nicolasbonini1-commits/Carte-peche/donnees/houle.json";
  async function fetchHoule(force) {
    const cached = LS.get("cp_houle", null);
    if (!force && cached && Date.now() - cached.at < 20 * 60 * 1000) return cached.d;
    try {
      const r = await fetch(HOULE_URL, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (!d || !Array.isArray(d.bouees)) throw new Error("réponse inattendue");
      LS.set("cp_houle", { at: Date.now(), d });
      return d;
    } catch (e) { return cached ? cached.d : null; }
  }
  function renderHoule() {
    const H = state.houle;
    if (!H || !H.bouees.length) return `<h3>Houle mesurée maintenant</h3><p class="sub">Pas encore de mesure reçue des bouées.</p>`;
    const f1 = v => v == null ? "—" : v.toFixed(1).replace(".", ",");
    const rows = H.bouees.map(b => {
      const ms = (b.mesures || []).filter(m => m.h != null);
      if (!ms.length) return `<li><b>${esc(b.nom)}</b> : pas de mesure sur les 48 dernières heures.</li>`;
      const m = ms[ms.length - 1], t = new Date(m.t), age = Math.round((Date.now() - t) / 60000);
      // Prévision Open-Meteo Marine (MFWAM) au même endroit, à l'heure la plus proche de la mesure
      const pv = (b.prevu || []).reduce((a, x) => !a || Math.abs(Date.parse(x.t) - t) < Math.abs(Date.parse(a.t) - t) ? x : a, null);
      const pvOk = pv && Math.abs(Date.parse(pv.t) - t) <= 90 * 60000;
      // Tendance : mesure d'il y a environ 6 h (entre 5 et 7 h) ; seuil ±0,2 m [P]
      const old = ms.filter(x => { const d = (t - Date.parse(x.t)) / 3600000; return d >= 5 && d <= 7; })[0];
      const dh = old ? m.h - old.h : null;
      const tend = dh == null ? "" : ` · sur 6 h : ${dh >= 0.2 ? "en hausse" : dh <= -0.2 ? "en baisse" : "stable"} (${dh >= 0 ? "+" : "−"}${f1(Math.abs(dh))} m)`;
      const ageTxt = age < 90 ? `il y a ${age} min` : `il y a ${Math.round(age / 60)} h`;
      return `<li><b>${esc(b.nom)}</b> <small>(bouée au large, ${b.fond} m de fond)</small> : <b>${f1(m.h)} m</b> mesurés ${dayName(t)} à ${hm(t)} (${ageTxt}${age > 180 ? ", mesure ancienne" : ""})
        · vagues max ${f1(m.hmax)} m${m.dir != null ? " · de " + M.compass(m.dir) : ""}${m.per != null ? " · " + Math.round(m.per) + " s" : ""}${m.sst != null ? " · eau " + f1(m.sst) + " °C" : ""}
        <br><small>Prévu à cette heure au même endroit : ${pvOk ? f1(pv.h) + " m" : "—"}${tend}</small></li>`;
    }).join("");
    const g = new Date(H.genere);
    return `<h3>Houle mesurée maintenant</h3><ul class="rivers">${rows}</ul>
      <p class="sub">Mesure : bouées CANDHIS – Cerema (Licence Ouverte), une mesure toutes les 30 min, relevées par la tâche « alertes » (dernier relevé ${dayName(g)} à ${hm(g)}).
      Hauteur H1/3, comparable à la houle prévue. Heure des mesures lue en heure UTC, à vérifier.</p>`;
  }

  // Débit habituel de chaque mois : médiane des débits moyens mensuels mesurés depuis 1990 (Hub'Eau, obs_elab QmM).
  // Gardé 30 jours sur le téléphone (ça ne change presque pas).
  async function fetchFlowRefs() {
    const cached = LS.get("cp_qref", null);
    if (cached && Date.now() - cached.at < 30 * 86400000 && Object.keys(cached.refs).length) return cached.refs;
    const refs = {};
    await Promise.all(Object.entries(window.RIVERS).map(async ([key, rv]) => {
      try {
        const url = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/obs_elab?code_entite=${rv.station}&grandeur_hydro_elab=QmM&date_debut_obs_elab=1990-01-01&size=1000&fields=date_obs_elab,resultat_obs_elab`;
        const j = await (await fetch(url)).json();
        const byM = {};
        (j.data || []).forEach(o => { if (o.resultat_obs_elab == null) return; const m = +o.date_obs_elab.slice(5, 7); (byM[m] = byM[m] || []).push(o.resultat_obs_elab / rv.div); });
        const med = v => { const s = v.slice().sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
        const r = {}; Object.entries(byM).forEach(([m, v]) => { if (v.length >= 5) r[m] = { q: med(v), years: v.length }; });
        if (Object.keys(r).length) refs[key] = r;
      } catch (e) { }
    }));
    if (Object.keys(refs).length) LS.set("cp_qref", { at: Date.now(), refs });
    return refs;
  }
  // État du fleuve à l'heure t : débit à ce moment (ou le dernier mesuré si t est dans les 36 h à venir).
  function flowAt(key, t) {
    const r = state.flows && state.flows[key]; if (!r) return null;
    const pts = r.pts, last = pts[pts.length - 1], ms = t.getTime();
    let k = -1;
    if (ms >= last[0]) { if (ms - last[0] > 36 * 3600000) return null; k = pts.length - 1; }
    else { if (ms < pts[0][0]) return null; k = pts.findIndex(p => p[0] >= ms); }
    const q = pts[k][1];
    const ago = pts.findIndex(p => p[0] >= pts[k][0] - 6 * 3600000);
    const q6 = pts[Math.max(0, ago)][1];
    const ref = r.ref && r.ref[t.getMonth() + 1];
    return { name: r.name, q, ref: ref ? ref.q : null, refYears: ref ? ref.years : 0, month: t.getMonth() + 1,
      ratio: ref && ref.q > 0 ? q / ref.q : null, trend: q6 > 0 ? (q - q6) / q6 : 0, at: new Date(pts[k][0]) };
  }

  // Mémoire du débit pour la couleur de l'eau (model.js, section 2 bis) : débit moyen de chaque jour (heure de Paris),
  // rapporté au débit habituel du mois, puis max sur 15 jours de rapport × e^(−jours/τ), en partant de la veille.
  // Les jours sans mesure (à venir) sont sautés : l'effet d'une crue continue de baisser dans la prévision.
  const memCache = {};
  function riverMem(key, t) {
    const r = state.flows && state.flows[key], R = M.TURB.rivers[key];
    if (!r || !r.ref || !R) return null;
    const ck = `${key}|${r.pts.length}|${r.pts[r.pts.length - 1][0]}|${localKey(t)}`;
    if (ck in memCache) return memCache[ck];
    const days = {};
    for (const [ms, q] of r.pts) { const k = localKey(new Date(ms)); (days[k] = days[k] || []).push(q); }
    let mem = 1;
    for (let lag = 0; lag < 15; lag++) {
      const d = new Date(t); d.setDate(d.getDate() - 1 - lag);
      const qs = days[localKey(d)], ref = r.ref[d.getMonth() + 1];
      if (!qs || qs.length < 6 || !ref || !(ref.q > 0)) continue;
      const ratio = qs.reduce((a, b) => a + b, 0) / qs.length / ref.q;
      mem = Math.max(mem, ratio * Math.exp(-lag / R.tau));
    }
    return (memCache[ck] = mem);
  }

  // ---------- Temps de route (OSRM) ----------
  async function computeDrive() {
    const o = state.origin;
    const sig = `${o.lat.toFixed(3)},${o.lon.toFixed(3)}|` + SPOTS.map(s => `${s.lat.toFixed(3)},${s.lon.toFixed(3)}`).join(";");
    if (state.drive && state.drive.sig === sig) return;
    const coords = [`${o.lon},${o.lat}`].concat(SPOTS.map(s => `${s.lon},${s.lat}`)).join(";");
    let mins = {}, src = "OSRM";
    try {
      const r = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`);
      const j = await r.json();
      SPOTS.forEach((s, k) => { mins[s.id] = Math.round(j.durations[0][k + 1] / 60) + 10; }); // +10 min : se garer et marcher
    } catch (e) {
      src = "estimation";
      SPOTS.forEach(s => { const km = haversine(o.lat, o.lon, s.lat, s.lon) * 1.35; mins[s.id] = Math.round(km / 65 * 60) + 10; });
    }
    state.drive = { sig, mins, src };
    LS.set("cp_drive", state.drive);
  }
  function haversine(a, b, c, d) {
    const R = 6371, r = x => x * Math.PI / 180;
    const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  // Séries de pluie calculées une seule fois par zone et par bassin (sommes 72 h / 7 j, indice de pluie antérieure).
  const rainCache = {};
  function rainSeries(spot) {
    const D = state.data, key = `${D.fetchedAt.getTime()}|${spot.zone}|${spot.river}`;
    if (rainCache[key]) return rainCache[key];
    const coast = D.F[spot.zone].rain;
    const basin = spot.river === "vidourle" ? D.F.RV : spot.river === "lez" ? D.F.RL : null;
    const mx = basin ? coast.map((v, k) => Math.max(v || 0, basin.rain[k] || 0)) : coast;
    const n = mx.length, s72 = new Array(n), s168 = new Array(n), api = new Array(n), apiCoast = new Array(n);
    const kh = Math.pow(M.API_K, 1 / 24);
    let a = 0, ac = 0;
    for (let i = 0; i < n; i++) {
      a = a * kh + (mx[i] || 0); ac = ac * kh + (coast[i] || 0);   // indice de pluie, décroissance continue
      api[i] = a; apiCoast[i] = ac;
      s72[i] = M.rainSum(mx, i, 72); s168[i] = M.rainSum(mx, i, 168);
    }
    return (rainCache[key] = { s72, s168, api, apiCoast });
  }

  // ---------- Conditions à un poste et à une heure ----------
  function conditions(spot, i) {
    const D = state.data, z = spot.zone;
    const F = D.F[z], S = D.S[z];
    const hsAt = k => k >= 0 && S.hs[k] != null ? M.localWave(spot, S.hs[k], S.dir[k]) : null;
    const hsLocal = hsAt(i);
    let maxPast = 0;
    for (let k = Math.max(0, i - 36); k < i; k++) { const v = hsAt(k); if (v != null && v > maxPast) maxPast = v; }
    const falling = hsLocal != null && maxPast >= 1.0 && hsLocal <= 0.65 * maxPast && hsLocal < 1.2;
    // Couleur de l'eau : houle max des 48 h au poste, vent moyen des 24 h, mémoire des 3 fleuves.
    let hsmax48 = hsLocal ?? 0, ws = 0, nw = 0;
    for (let k = Math.max(0, i - 48); k < i; k++) { const v = hsAt(k); if (v != null && v > hsmax48) hsmax48 = v; }
    for (let k = Math.max(0, i - 24); k <= i; k++) if (F.wind[k] != null) { ws += F.wind[k]; nw++; }
    const mem = {}; for (const r of Object.keys(M.TURB.rivers)) mem[r] = riverMem(r, D.times[i]);
    const turb = M.turbidity(spot, { hs: hsLocal, hsmax48, ws24: nw ? ws / nw : 0, mem });
    const prev = hsAt(i - 6);
    const rising = hsLocal != null && prev != null && hsLocal > prev + 0.2;
    // Pluie : sur la côte (zone du poste) et, pour les postes de fleuve, sur le bassin versant.
    const R = rainSeries(spot);
    const rain72 = R.s72[i], rain7 = R.s168[i], apiCoast = R.apiCoast[i], apiBasin = R.api[i];
    const flow = spot.river ? flowAt(spot.river, D.times[i]) : null;
    let sst = S.sst[i];
    if (sst == null) for (const zz of ["C", "W", "E"]) if (D.S[zz].sst[i] != null) { sst = D.S[zz].sst[i]; break; }
    const t = D.times[i];
    const sun = D.sun[localKey(t)] || { rise: 450, set: 1035 };
    const light = M.lightPeriod(t.getHours() * 60 + t.getMinutes(), sun.rise, sun.set);
    const moon = M.moon(t);
    const cloud = F.cloud[i] ?? 0;
    return {
      spot, month: t.getMonth() + 1, light, cloud, moon,
      darkNight: moon.illum < 0.35 || cloud >= 70,
      wind: F.wind[i] ?? 0, windDir: F.dir[i] ?? 0, gust: F.gust[i] ?? 0,
      onshore: M.onshore(spot, F.wind[i] ?? 0, F.dir[i] ?? 0),
      hsLocal, hsOff: S.hs[i], waveDir: S.dir[i], period: S.per[i], falling, rising, rain72, rain7, apiCoast, apiBasin, flow, sst, turb,
      future: D.times[i].getTime() > Date.now() + 3 * 3600000
    };
  }

  function learnFor(spot, species, p) {
    const mine = state.carnet.filter(e => e.spotId === spot.id && (e.species === species || e.species === "les deux"));
    const k = mine.filter(e => (species === "loup" ? e.nLoup : e.nDorade) > 0).length;
    return M.learnFactor(k, mine.length, p);
  }

  function scoreAt(spot, i, species) {
    const c = conditions(spot, i);
    const base = M.score(spot, species, c, null);
    const learn = learnFor(spot, species, base.score / 100);
    return learn.n ? M.score(spot, species, c, learn) : base;
  }
  function bestSpecies(spot, i) {
    const sp = state.plan.species;
    if (sp !== "les deux") return { ...scoreAt(spot, i, sp), species: sp };
    const a = scoreAt(spot, i, "loup"), b = scoreAt(spot, i, "dorade");
    return a.score >= b.score ? { ...a, species: "loup" } : { ...b, species: "dorade" };
  }

  // ---------- Plan de sortie ----------
  function departDate() {
    const d = new Date(); d.setDate(d.getDate() + +state.plan.day);
    const [h, m] = state.plan.depart.split(":").map(Number);
    d.setHours(h, m, 0, 0); return d;
  }
  function computePlan() {
    state.results = planFor(departDate());
  }
  function planFor(dep) {
    const D = state.data;
    const total = state.plan.hours * 60;
    const res = SPOTS.map(spot => {
      const drive = state.drive ? state.drive.mins[spot.id] : 60;
      const start = new Date(dep.getTime() + drive * 60000);
      const end = new Date(dep.getTime() + (total - drive) * 60000);
      const fishMin = (end - start) / 60000;
      const idx = [];
      D.times.forEach((t, i) => { const mid = t.getTime() + 30 * 60000; if (mid >= start.getTime() && t.getTime() < end.getTime()) idx.push(i); });
      if (!idx.length) { const k = D.times.findIndex(t => t >= start); if (k >= 0) idx.push(k); }
      const hours = idx.map(i => ({ i, t: D.times[i], ...bestSpecies(spot, i) }));
      const scores = hours.map(h => h.score);
      const max = scores.length ? Math.max(...scores) : 0;
      const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const best = hours.reduce((a, b) => (b.score > (a ? a.score : -1) ? b : a), null);
      return { spot, drive, start, end, fishMin, feasible: fishMin >= 45 && hours.length > 0, hours, best, score: Math.round(0.6 * max + 0.4 * mean) };
    });
    res.sort((a, b) => (b.feasible - a.feasible) || (b.score - a.score));
    res.forEach((r, k) => r.rank = k + 1);
    return res;
  }

  // Quand partir ? Compare les sessions aube et soir des 3 prochains jours avec ton temps disponible.
  function renderWhen() {
    const D = state.data, now = new Date();
    const drives = state.drive ? Object.values(state.drive.mins).sort((a, b) => a - b) : [60];
    const typical = drives[Math.floor(drives.length / 2)];
    const cands = [];
    for (let d = 0; d < 3; d++) {
      const day = new Date(); day.setDate(day.getDate() + d);
      const sun = D.sun[localKey(day)]; if (!sun) continue;
      const mk = (min, label) => { const x = new Date(day); x.setHours(0, Math.round(min), 0, 0); return { dep: x, label, d }; };
      cands.push(mk(sun.rise - 60 - typical, "aube"));
      cands.push(mk(sun.set - state.plan.hours * 60 + typical + 90, "soir"));
    }
    const rows = cands.filter(c => c.dep > now && c.dep < D.times[D.times.length - 1])
      .map(c => ({ ...c, top: planFor(c.dep)[0] })).filter(c => c.top && c.top.feasible)
      .sort((a, b) => b.top.score - a.top.score).slice(0, 4);
    if (!rows.length) { $("#when").innerHTML = ""; return; }
    $("#when").innerHTML = `<h3>Quand partir ? (${state.plan.hours} h dispo)</h3>` + rows.map((c, k) => `
      <div class="when-row">${pill(c.top.score, true)}<span class="spot-main"><b>${dayName(c.dep)} · ${c.label} · départ ${hm(c.dep)}</b>
      <small>${esc(c.top.spot.name)} · meilleure heure ${hm(c.top.best.t)}</small></span>
      <button class="btn small" data-when="${k}">Choisir</button></div>`).join("");
    document.querySelectorAll("[data-when]").forEach(b => b.onclick = () => {
      const c = rows[+b.dataset.when];
      state.plan.day = String(c.d); state.plan.depart = `${pad(c.dep.getHours())}:${pad(c.dep.getMinutes())}`;
      $("#pDay").value = state.plan.day; $("#pDepart").value = state.plan.depart; LS.set("cp_plan", state.plan); render();
      window.scrollTo({ top: $("#reco").offsetTop - 70, behavior: "smooth" });
    });
  }

  // ---------- Rendu ----------
  function render() {
    applyThemeOnly();
    if (!state.data) return;
    computePlan();
    drawMarkers();
    renderAlerts();
    renderReco();
    renderWhen();
    renderList();
    renderConditions();
    $("#legend").innerHTML = PAL[theme()].map((c, k) => `<i style="background:${c}" title="${M.CLASS_LABELS[k]}"></i>`).join("") + `<small class="sub">&nbsp;faible → forte</small>`;
    const D = state.data;
    const mfUntil = D.multi && D.mfEnd > 0 ? ` · Météo-France jusqu'au ${dayName(D.times[D.mfEnd])} ${D.times[D.mfEnd].getHours()} h, puis ECMWF` : D.multi ? "" : " · modèle par défaut d'Open-Meteo (Météo-France indisponible)";
    $("#fresh").textContent = `Météo du ${dayName(D.fetchedAt)} à ${hm(D.fetchedAt)}${mfUntil} · débits : ${Object.keys(state.flows || {}).length}/${Object.keys(window.RIVERS).length} fleuves · routes : ${state.drive ? state.drive.src : "—"} depuis ${esc(state.origin.name)}`;
  }

  // ---------- Alertes des 3 prochains jours ----------
  function renderAlerts() {
    const list = M.alerts(state.data, new Date());
    const now = new Date();
    // État actuel des fleuves (débit mesuré)
    const rivers = Object.entries(window.RIVERS).map(([k, rv]) => {
      const f = flowAt(k, now);
      if (!f) return `<li><b>${esc(rv.name)}</b> : débit indisponible (la pluie sert d'estimation)</li>`;
      const lv = M.riverLevel({ spot: { river: k }, flow: f });
      return `<li><b>${esc(rv.name)}</b> : ${lv.why.split(" : ")[1] || lv.why} · ${["normal", "eau qui se charge", "en crue", "forte crue"][lv.level]}${lv.falling ? ", décrue" : ""}</li>`;
    }).join("");
    const icon = { mer: "🌊", chance: "🎣", vent: "💨", pluie: "🌧️", fiabilite: "❔" };
    const cls = ["a-ok", "a-info", "a-warn", "a-danger"];
    $("#alerts").innerHTML = `<h3 class="nomt">Les 3 prochains jours</h3>` +
      (list.length ? list.map(a => `<div class="alert ${cls[a.level]}"><b>${icon[a.kind] || ""} ${esc(a.title)}</b><br><small>${esc(a.text)}</small></div>`).join("")
        : `<p class="sub">Rien de marquant : ni coup de mer, ni vent fort, ni fortes pluies prévus.</p>`) +
      `<details><summary>Fleuves maintenant</summary><ul class="rivers">${rivers}</ul>
       <p class="sub"><a href="https://www.vigicrues.gouv.fr/" target="_blank" rel="noopener">Vigicrues</a> · <a href="https://www.meteolanguedoc.com/" target="_blank" rel="noopener">Météo Languedoc</a> (prévisionnistes, à lire en complément)</p></details>`;
  }
  function applyThemeOnly() { document.documentElement.dataset.theme = theme(); }

  function pill(score, feasible) {
    const pal = PAL[theme()];
    const c = feasible ? pal[M.classOf(score)] : "#8a8f96";
    return `<span class="pill" style="background:${c}">${feasible ? score : "—"}</span>`;
  }

  function renderReco() {
    const r = state.results[0];
    if (!r || !r.feasible) { $("#reco").innerHTML = `<p>Aucun poste faisable avec ce temps disponible : la route prend trop de temps. Allonge la durée.</p>`; return; }
    const b = r.best, sc = M.SCENARIOS[b.scenario];
    const past = departDate() < Date.now() - 30 * 60000;
    const second = state.results.slice(1, 3).filter(x => x.feasible).map(x => `${esc(x.spot.name)} (${x.score})`).join(" · ");
    $("#reco").innerHTML = `
      ${past ? `<p class="warn-soft">Ton heure de départ (${state.plan.depart}) est déjà passée aujourd'hui : touche « Je pars maintenant » ou choisis un autre jour.</p>` : ""}
      <div class="reco-top"><span class="tag">Meilleur choix</span>${pill(r.score, true)}</div>
      <h2>${esc(r.spot.name)}</h2>
      <p class="sub">${esc(r.spot.commune)} · ${r.drive} min de route · en pêche de ${hm(r.start)} à ${hm(r.end)}</p>
      <p><b>Meilleure heure :</b> ${hm(b.t)} (${b.score}/100, ${b.species}) · <b>${sc.name}</b></p>
      ${b.species === "loup" ? `<p><b>Leurre :</b> ${sc.lure}</p>` : `<p><b>Dorade :</b> calée 40-60 g près des enrochements ou en sortie de grau ; appâts durs (crabe, couteau, moule) [P].</p>`}
      ${b.safety ? `<p class="warn">Prudence : mer ou rafales dangereuses sur les enrochements à ce moment.</p>` : ""}
      <p class="sub">Ensuite : ${second || "—"}</p>
      <div class="row">${goButtons(r.spot)}<button class="btn" data-open="${r.spot.id}">Détails</button></div>`;
    $("#reco").querySelector("[data-open]").onclick = () => openSpot(r.spot.id);
  }

  function goButtons(s) {
    return `<a class="btn primary" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=driving" target="_blank" rel="noopener">Y aller (Maps)</a>
      <a class="btn" href="https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes" target="_blank" rel="noopener">Waze</a>`;
  }

  function renderList() {
    $("#list").innerHTML = state.results.map(r => `
      <button class="spot" data-id="${r.spot.id}">
        ${pill(r.score, r.feasible)}
        <span class="spot-main"><b>${esc(r.spot.name)}</b>
        <small>${esc(r.spot.commune)} · ${r.drive} min · ${r.feasible ? `${Math.round(r.fishMin / 60 * 10) / 10} h de pêche · meilleure heure ${hm(r.best.t)}` : "pas assez de temps sur place"}</small>
        ${strip(r.spot)}</span>
      </button>`).join("");
    document.querySelectorAll("#list .spot").forEach(b => b.onclick = () => openSpot(+b.dataset.id));
  }

  // Bandeau des 48 prochaines heures pour un poste
  function strip(spot) {
    const D = state.data, now = Date.now(), pal = PAL[theme()];
    let cells = "";
    D.times.forEach((t, i) => {
      if (t.getTime() < now - 3600000 || t.getTime() > now + 48 * 3600000) return;
      const s = bestSpecies(spot, i).score;
      cells += `<i style="background:${pal[M.classOf(s)]}" title="${dayName(t)} ${t.getHours()} h : ${s}"></i>`;
    });
    return `<span class="strip" aria-label="Note heure par heure sur 48 h">${cells}</span>`;
  }

  function renderConditions() {
    const D = state.data, r = state.results[0];
    const i = r && r.best ? r.best.i : D.times.findIndex(t => t >= new Date());
    const t = D.times[i];
    const rows = ["W", "C", "E"].map(z => {
      const F = D.F[z], S = D.S[z];
      return `<tr><th>${window.WX_POINTS[z].name}</th>
        <td>${M.compass(F.dir[i])} ${Math.round(F.wind[i])} km/h<br><small>rafales ${Math.round(F.gust[i])}</small></td>
        <td>${S.hs[i] != null ? S.hs[i].toFixed(1) + " m" : "—"}<br><small>${S.dir[i] != null ? "de " + M.compass(S.dir[i]) : ""}${S.per[i] ? " · " + Math.round(S.per[i]) + " s" : ""}</small></td>
        <td>${S.sst[i] != null ? S.sst[i].toFixed(1) + " °C" : "—"}</td></tr>`;
    }).join("");
    const moon = M.moon(t);
    const sun = D.sun[localKey(t)];
    $("#cond").innerHTML = `<p class="sub">Au moment conseillé : ${dayName(t)} ${t.getHours()} h · ${M.windName(D.F.C.dir[i])}</p>
      <table><thead><tr><th>Zone</th><th>Vent</th><th>Houle (large)</th><th>Eau</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="sub">Soleil ${sun ? `${pad(Math.floor(sun.rise / 60))} h ${pad(sun.rise % 60)} – ${pad(Math.floor(sun.set / 60))} h ${pad(sun.set % 60)}` : ""} · Lune : ${moon.name}, ${Math.round(moon.illum * 100)} % éclairée</p>` + renderHoule();
  }

  // ---------- Fiche poste ----------
  function openSpot(id) {
    const r = state.results.find(x => x.spot.id === id); if (!r) return;
    const s = r.spot, b = r.best;
    state.selected = id;
    const facts = b ? b.factors.map(f => `<tr><th>${f.k}</th><td>${Math.round(f.v * 100)} %</td><td>${esc(f.why)}</td></tr>`).join("") : "";
    const sc = b ? M.SCENARIOS[b.scenario] : null;
    const mine = state.carnet.filter(e => e.spotId === id);
    $("#sheetBody").innerHTML = `
      <h2>${esc(s.name)} ${pill(r.score, r.feasible)}</h2>
      <p class="sub">${esc(s.commune)} · ${r.drive} min de route · ${M.HABITAT[s.type].label}${s.moved ? " · position corrigée" : ""}</p>
      ${b ? `<p><b>Meilleure heure de ta fenêtre :</b> ${hm(b.t)} · ${b.score}/100 pour le ${b.species}</p>
      <p><b>Situation :</b> ${sc.name}.</p>${b.species === "loup" ? `<p><b>Leurre :</b> ${sc.lure}</p>` : ""}
      ${b.safety ? `<p class="warn">Prudence : mer ou rafales dangereuses sur les enrochements.</p>` : ""}
      <h3>Pourquoi cette note</h3>
      <table class="facts"><tbody>${facts}</tbody></table>
      <p class="sub">La note est le produit de ces facteurs. 100 % = idéal, 50 % = divise la note par deux.</p>` : ""}
      <h3>Ta journée ici</h3>
      <div class="row daypick">${[0,1,2,3,4,5].map(d => { const x = new Date(); x.setDate(x.getDate() + d); return `<button class="btn small${d === (state.dayView ?? 0) ? " on" : ""}" data-day="${d}">${d === 0 ? "Auj." : d === 1 ? "Demain" : x.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</button>`; }).join("")}</div>
      <div id="dayBox"></div>
      <h3>48 prochaines heures</h3>${strip(s)}
      <h3>Le poste</h3><p>${esc(s.structure)}</p><p class="warn-soft">${esc(s.attention)}</p>
      <p class="sub">Position : ${s.moved ? "corrigée par toi sur ce téléphone" : esc(s.pos || "")}</p>
      <p class="sub">${s.webcams && s.webcams.length ? `Webcam (de jour, vue à vérifier) : ${s.webcams.map(w => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.label)}</a>`).join(" · ")}` : "Pas de webcam trouvée près de ce poste."}</p>
      <p class="sub">Ton carnet ici : ${mine.length} sortie(s).</p>
      <div class="row">${goButtons(s)}</div>
      <div class="row"><button class="btn" id="logHere">Noter une sortie ici</button><button class="btn" id="moveBtn">Corriger la position</button></div>`;
    $("#sheet").hidden = false;
    renderDay(s, state.dayView ?? 0);
    document.querySelectorAll("[data-day]").forEach(btn => btn.onclick = () => {
      state.dayView = +btn.dataset.day;
      document.querySelectorAll("[data-day]").forEach(x => x.classList.toggle("on", x === btn));
      renderDay(s, state.dayView);
    });
    $("#logHere").onclick = () => { closeSheet(); showView("carnet"); $("#fSpot").value = id; };
    $("#moveBtn").onclick = () => {
      closeSheet(); showView("sortie");
      const m = markers[id].dot; m.dragging.enable(); dragging = true;
      map.setView([s.lat, s.lon], 15);
      toast("Fais glisser le point à sa vraie place");
    };
    map.panTo([s.lat, s.lon]);
  }
  // Créneaux d'une journée pour un poste, avec l'ordre des leurres
  function renderDay(spot, dayOff) {
    const D = state.data, day = new Date(); day.setDate(day.getDate() + dayOff);
    const key = localKey(day), now = Date.now();
    const drive = state.drive ? state.drive.mins[spot.id] : 60;
    const hrs = [];
    D.times.forEach((t, i) => {
      if (localKey(t) !== key || t.getHours() < 4 || t.getHours() > 22 || t.getTime() < now - 3600000) return;
      hrs.push({ i, t, ...bestSpecies(spot, i) });
    });
    if (!hrs.length) { $("#dayBox").innerHTML = `<p class="sub">Pas de prévision pour ce jour.</p>`; return; }
    const max = Math.max(...hrs.map(h => h.score));
    const thr = Math.max(max - 8, 35);
    const wins = []; let cur = null;
    hrs.forEach((h, k) => {
      const contiguous = cur && k > 0 && h.t - hrs[k - 1].t <= 3600000;
      if (h.score >= thr) { if (!contiguous) { cur = { hours: [] }; wins.push(cur); } cur.hours.push(h); } else cur = null;
    });
    wins.forEach(w => { w.peak = w.hours.reduce((a, b) => b.score > a.score ? b : a); });
    wins.sort((a, b) => b.peak.score - a.peak.score);
    const far = dayOff >= 3 ? `<p class="warn-soft">Prévision à ${dayOff} jours : fiabilité moyenne, à revérifier la veille.</p>` : "";
    $("#dayBox").innerHTML = far + wins.slice(0, 3).map((w, k) => {
      const a = w.hours[0].t, b = new Date(w.hours[w.hours.length - 1].t.getTime() + 3600000), p = w.peak;
      const c = conditions(spot, p.i), sc = M.SCENARIOS[p.scenario];
      const dep = new Date(a.getTime() - drive * 60000);
      let body;
      if (p.species === "loup") {
        const seq = M.lureSequence(c);
        body = `<p class="sub">Eau ${seq.water} · coloris ${seq.color.fam} (${seq.color.why})</p><ol class="seq">` +
          seq.steps.map(st => `<li><b>${st.zone} :</b> ${st.lure}<br><small>Coloris : ${st.color} · ${st.anim}</small></li>`).join("") +
          `</ol><p class="sub">Environ 15-20 min par leurre. Commence par les premiers mètres devant toi, puis lance plus loin.</p>`;
      } else {
        body = `<p class="sub">Dorade : calée 40-60 g, près des enrochements ou dans la veine de courant du grau ; appâts durs (crabe, couteau, moule) [P].</p>`;
      }
      return `<div class="win"><div class="win-top">${pill(p.score, true)}<b>${k + 1}. ${hm(a)} – ${hm(b)}</b></div>
        <p class="sub">${c.light} · ${sc.name} · ${M.windName(c.windDir)} ${Math.round(c.wind)} km/h · mer ${M.seaState(c.hsLocal)}${c.falling ? " qui retombe" : ""} · départ de ${esc(state.origin.name)} vers ${hm(dep)}</p>
        ${p.safety ? `<p class="warn">Prudence : mer ou rafales dangereuses sur les enrochements.</p>` : ""}${body}</div>`;
    }).join("");
  }
  function closeSheet() { $("#sheet").hidden = true; }
  $("#sheetClose").onclick = closeSheet;

  // ---------- Formulaire « Ma sortie » ----------
  function bindPlan() {
    const p = state.plan;
    $("#pDay").value = p.day; $("#pDepart").value = p.depart; $("#pHours").value = p.hours; $("#pSpecies").value = p.species;
    $("#pHoursOut").textContent = `${p.hours} h`;
    ["#pDay", "#pDepart", "#pHours", "#pSpecies"].forEach(sel => $(sel).addEventListener("input", () => {
      p.day = $("#pDay").value; p.depart = $("#pDepart").value; p.hours = +$("#pHours").value; p.species = $("#pSpecies").value;
      $("#pHoursOut").textContent = `${p.hours} h`;
      LS.set("cp_plan", p); render();
    }));
    $("#nowBtn").onclick = () => { const d = new Date(); $("#pDay").value = 0; $("#pDepart").value = `${pad(d.getHours())}:${pad(d.getMinutes())}`; $("#pDepart").dispatchEvent(new Event("input")); };
    $("#gpsBtn").onclick = () => {
      if (!navigator.geolocation) return toast("Localisation indisponible");
      navigator.geolocation.getCurrentPosition(pos => {
        state.origin = { name: "ma position", lat: pos.coords.latitude, lon: pos.coords.longitude };
        LS.set("cp_origin", state.origin); state.drive = null; computeDrive().then(render);
      }, () => toast("Localisation refusée"), { timeout: 10000 });
    };
    $("#homeBtn").onclick = () => { state.origin = window.HOME; LS.set("cp_origin", state.origin); state.drive = null; computeDrive().then(render); };
    $("#goSpot").innerHTML = SPOTS.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
    $("#goDay").innerHTML = [0,1,2,3,4,5].map(d => { const x = new Date(); x.setDate(x.getDate() + d); return `<option value="${d}">${d === 0 ? "Aujourd'hui" : d === 1 ? "Demain" : x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}</option>`; }).join("");
    $("#goBtn").onclick = () => { state.dayView = +$("#goDay").value; openSpot(+$("#goSpot").value); };
    $("#refreshBtn").onclick = () => refresh(true);
  }

  // ---------- Carnet ----------
  function bindCarnet() {
    $("#fSpot").innerHTML = SPOTS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
    const d = new Date(); $("#fDate").value = localKey(d); $("#fStart").value = `${pad(d.getHours())}:00`;
    $("#carnetForm").addEventListener("submit", e => {
      e.preventDefault();
      const entry = {
        id: Date.now(), spotId: +$("#fSpot").value, date: $("#fDate").value, start: $("#fStart").value,
        dur: +$("#fDur").value, species: $("#fSpecies").value,
        nLoup: +$("#fLoup").value || 0, nDorade: +$("#fDorade").value || 0, maxSize: +$("#fSize").value || null,
        lure: $("#fLure").value.trim(), notes: $("#fNotes").value.trim(),
        // Ajout du 18 nov. 2026 : pour vérifier si filets et chalutiers font baisser les touches.
        // Vide = pas regardé / pas compté (différent de « aucun »), pour ne pas fausser les comparaisons.
        bites: $("#fBites").value === "" ? null : +$("#fBites").value,
        nets: $("#fNets").value || null, trawlers: $("#fTrawl").value || null,
        // Ajout du 20 nov. 2026 : couleur de l'eau vue sur place, pour caler les seuils de l'estimation (vide = pas regardé).
        water: $("#fWater").value || null
      };
      entry.snapshot = snapshot(entry);
      state.carnet.unshift(entry); LS.set("cp_carnet", state.carnet);
      e.target.reset(); bindCarnetDefaults(); renderCarnet(); render(); toast("Sortie enregistrée");
    });
    $("#exportBtn").onclick = async () => {
      const txt = JSON.stringify(state.carnet);
      try { await navigator.clipboard.writeText(txt); toast("Carnet copié : colle-le à Claude ou dans Notion"); }
      catch (e) { $("#importBox").value = txt; toast("Copie impossible : le texte est dans la zone ci-dessous"); }
    };
    $("#importBtn").onclick = () => {
      try {
        const arr = JSON.parse($("#importBox").value);
        const ids = new Set(state.carnet.map(e => e.id));
        arr.forEach(e => { if (!ids.has(e.id)) state.carnet.push(e); });
        state.carnet.sort((a, b) => b.id - a.id); LS.set("cp_carnet", state.carnet); renderCarnet(); render(); toast("Carnet importé");
      } catch (e) { toast("Texte illisible"); }
    };
    renderCarnet();
  }
  function bindCarnetDefaults() { const d = new Date(); $("#fDate").value = localKey(d); $("#fStart").value = `${pad(d.getHours())}:00`; }
  function snapshot(e) {
    if (!state.data) return null;
    const t = new Date(`${e.date}T${e.start}`);
    const i = state.data.times.findIndex(x => Math.abs(x - t) < 1800001);
    if (i < 0) return null;
    const spot = SPOTS.find(s => s.id === e.spotId);
    const c = conditions(spot, i);
    return { wind: Math.round(c.wind), windDir: Math.round(c.windDir), gust: Math.round(c.gust), hsLocal: c.hsLocal != null ? +c.hsLocal.toFixed(2) : null,
      sea: M.seaState(c.hsLocal), falling: c.falling, light: c.light, moon: Math.round(c.moon.illum * 100), sst: c.sst, rain72: Math.round(c.rain72),
      rain7: Math.round(c.rain7), api: Math.round(c.apiBasin), flowRatio: c.flow && c.flow.ratio != null ? +c.flow.ratio.toFixed(2) : null, river: M.riverLevel(c).level,
      model: state.data.src ? state.data.src[i] : null,
      scoreLoup: M.score(spot, "loup", c).score, scoreDorade: M.score(spot, "dorade", c).score, scenario: M.scenario(c),
      turb: c.turb ? +c.turb.fnu.toFixed(1) : null, waterPred: c.turb ? c.turb.cls : null };
  }
  function renderCarnet() {
    const list = state.carnet;
    if (!list.length) { $("#carnetList").innerHTML = `<p class="sub">Aucune sortie notée. Chaque sortie, même bredouille, affine les notes du poste.</p>`; return; }
    $("#carnetList").innerHTML = list.map(e => {
      const s = SPOTS.find(x => x.id === e.spotId) || { name: "?" };
      const res = e.nLoup || e.nDorade ? `${e.nLoup ? e.nLoup + " loup(s) " : ""}${e.nDorade ? e.nDorade + " dorade(s)" : ""}${e.maxSize ? " · max " + e.maxSize + " cm" : ""}` : "bredouille";
      const sn = e.snapshot;
      return `<div class="entry"><b>${esc(e.date)} ${esc(e.start)} · ${esc(s.name)}</b>
        <small>${res}${e.bites != null ? ` · ${e.bites} touche(s)` : ""} · ${esc(e.lure || "")}</small>
        ${e.water ? `<small>Eau vue : ${esc(e.water)}${e.snapshot && e.snapshot.waterPred ? ` (estimée : ${esc(e.snapshot.waterPred)}, ${String(e.snapshot.turb).replace(".", ",")} FNU)` : ""}</small>` : ""}
        ${e.nets || e.trawlers ? `<small>Filets : ${{ aucun: "aucun", loin: "au large", pres: "près du bord" }[e.nets] || "pas regardé"} · chalutiers : ${e.trawlers == null ? "pas regardé" : e.trawlers === "0" ? "aucun" : esc(e.trawlers)}</small>` : ""}
        ${sn ? `<small>Vent ${sn.wind} km/h ${M.compass(sn.windDir)}, mer ${sn.sea}${sn.falling ? " qui retombe" : ""}, ${sn.light} · note prévue : loup ${sn.scoreLoup}, dorade ${sn.scoreDorade}</small>` : ""}
        ${e.notes ? `<small>${esc(e.notes)}</small>` : ""}
        <button class="link" data-del="${e.id}">Supprimer</button></div>`;
    }).join("");
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      state.carnet = state.carnet.filter(e => e.id !== +b.dataset.del); LS.set("cp_carnet", state.carnet); renderCarnet(); render();
    });
  }

  // ---------- Navigation, messages ----------
  function showView(v) {
    document.querySelectorAll(".view").forEach(el => el.hidden = el.id !== v);
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
    if (v === "sortie") setTimeout(() => map.invalidateSize(), 50);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("nav button").forEach(b => b.onclick = () => showView(b.dataset.view));
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3000); }
  function banner(msg) { const b = $("#banner"); b.textContent = msg; b.hidden = !msg; }

  // ---------- Mise à jour (bouton et essais automatiques) ----------
  // Après un échec, l'appli réessaie seule : quand le téléphone signale le retour du réseau (événement « online »),
  // quand on revient sur l'appli, et au bout de 10 s, 30 s puis 60 s. Elle s'arrête au premier essai réussi.
  let busy = false, retryT = null, retryN = 0;
  const RETRY_S = [10, 30, 60];
  async function refresh(manual) {
    if (busy) return;
    busy = true; clearTimeout(retryT);
    try {
      const [d, fl, hl] = await Promise.all([fetchData(true), fetchFlows(true).catch(() => state.flows || {}), fetchHoule(true).catch(() => state.houle)]);
      if (d) state.data = d;
      state.flows = fl; if (hl) state.houle = hl;
      if (state.data) { applyTheme(); render(); }
      if (manual) toast(lastOk ? "Météo et débits mis à jour" : "Toujours pas de réseau : prévisions précédentes gardées");
      else if (lastOk) toast("Réseau revenu : météo mise à jour");
    } finally { busy = false; }
    if (lastOk) retryN = 0;
    else if (retryN < RETRY_S.length) retryT = setTimeout(() => refresh(false), RETRY_S[retryN++] * 1000);
  }
  const retryNow = () => { if (!lastOk) { retryN = 0; setTimeout(() => refresh(false), 3000); } }; // 3 s : laisser le réseau s'établir
  window.addEventListener("online", retryNow);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") retryNow(); });

  // ---------- Démarrage ----------
  async function start() {
    applyTheme();
    bindPlan(); bindCarnet();
    $("#reco").innerHTML = "<p>Chargement de la météo et de la mer…</p>";
    const [data, flows, houle] = await Promise.all([fetchData(false), fetchFlows(false).catch(() => ({})), fetchHoule(false).catch(() => null), computeDrive()]);
    state.data = data; state.flows = flows; state.houle = houle;
    setInterval(() => { applyTheme(); }, 5 * 60 * 1000);
    if (!lastOk) retryT = setTimeout(() => refresh(false), RETRY_S[retryN++] * 1000);
    if (!data) { $("#reco").innerHTML = "<p>Pas de données météo. L'appli réessaie seule quand le réseau revient (ou touche « Mettre à jour »).</p>"; return; }
    applyTheme(); render();
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
  start();
})();
