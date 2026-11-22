// Lecture des réponses d'Open-Meteo, commune à l'appli (navigateur) et à la tâche des alertes (GitHub, Node).
(function () {
  const ZL = ["W", "C", "E", "RV", "RL"], ZS = ["W", "C", "E"];
  const toMin = s => { const t = s.split("T")[1]; return +t.slice(0, 2) * 60 + +t.slice(3, 5); };
  // Fusionne les modèles heure par heure : Météo-France tant qu'il donne une valeur, sinon ECMWF.
  function mergeModels(h, v) {
    const mf = h[`${v}_meteofrance_seamless`], ec = h[`${v}_ecmwf_ifs025`], plain = h[v];
    if (!mf && !ec) return { val: plain || [], src: null };
    const n = (mf || ec).length, val = new Array(n), src = new Array(n);
    for (let k = 0; k < n; k++) {
      if (mf && mf[k] != null) { val[k] = mf[k]; src[k] = "MF"; }
      else if (ec && ec[k] != null) { val[k] = ec[k]; src[k] = "EC"; }
      else { val[k] = null; src[k] = null; }
    }
    return { val, src, ec: ec || null };
  }

  function parseData(raw) {
    const zl = ZL.filter((z, i) => raw.f[i]), zs = ZS;
    const times = raw.f[0].hourly.time;
    const F = {}, S = {}, sun = {}, alt = {};
    let srcC = null, mfEnd = null;
    zl.forEach((z, i) => {
      const h = raw.f[i].hourly;
      const m = v => mergeModels(h, v);
      const ws = m("wind_speed_10m"), wd = m("wind_direction_10m");
      F[z] = { wind: ws.val, dir: wd.val, gust: m("wind_gusts_10m").val, cloud: m("cloud_cover").val, rain: m("precipitation").val };
      if (ws.ec) alt[z] = { wind: ws.ec, dir: wd.ec };
      if (z === "C") { srcC = ws.src; if (ws.src) mfEnd = ws.src.lastIndexOf("MF"); }
    });
    // Avec deux modèles, Open-Meteo renomme aussi le lever et le coucher (sunrise_meteofrance_seamless…) : on prend le premier trouvé.
    const dly = raw.f[1].daily, dkey = p => Object.keys(dly).find(k => k === p || k.startsWith(p + "_"));
    const rise = dly[dkey("sunrise")], set = dly[dkey("sunset")];
    dly.time.forEach((d, k) => { if (rise && set && rise[k] && set[k]) sun[d] = { rise: toMin(rise[k]), set: toMin(set[k]) }; });
    zs.forEach((z, i) => {
      const h = raw.s[i].hourly;
      const idx = {}; h.time.forEach((t, k) => idx[t] = k);
      const pick = arr => times.map(t => arr && idx[t] != null ? arr[idx[t]] : null);
      S[z] = { hs: pick(h.wave_height), dir: pick(h.wave_direction), per: pick(h.wave_period), sst: pick(h.sea_surface_temperature) };
    });
    return { times: times.map(t => new Date(t)), keys: times, F, S, sun, fetchedAt: new Date(raw.at),
      multi: !!raw.multi, src: srcC, mfEnd, alt: Object.keys(alt).length ? alt : null };
  }

  // Adresses demandées à Open-Meteo (mêmes pour l'appli et pour la tâche des alertes).
  // Météo : 14 jours passés (7 avant le 20 nov. 2026). L'indice de pluie de la côte (couleur de l'eau) a été calé sur une série
  // continue depuis 2020 : avec 7 jours seulement, la pluie d'il y a 8 jours (qui compte encore 0,85^8 = 27 %) était oubliée.
  // Avec 14 jours, ce qui manque pèse au plus 0,85^14 = 10 %. La mer garde 7 jours passés (la houle ne regarde que 48 h en arrière).
  const PAST_DAYS = 14;
  const MODELS = "meteofrance_seamless,ecmwf_ifs025";
  function urls(P) {
    const forecast = "https://api.open-meteo.com/v1/forecast?latitude=" + ZL.map(z => P[z].land[0]).join(",") +
      "&longitude=" + ZL.map(z => P[z].land[1]).join(",") +
      "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation" +
      "&daily=sunrise,sunset&past_days=" + PAST_DAYS + "&forecast_days=7&timezone=Europe%2FParis&wind_speed_unit=kmh";
    const marine = "https://marine-api.open-meteo.com/v1/marine?latitude=" + ZS.map(z => P[z].sea[0]).join(",") +
      "&longitude=" + ZS.map(z => P[z].sea[1]).join(",") +
      "&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&past_days=7&forecast_days=7&timezone=Europe%2FParis";
    return { forecast, forecastModels: forecast + "&models=" + MODELS, marine };
  }

  // ---------- Vent au poste (chantier 1, étape 2 ; accord de Nico le 22 nov. 2026 à 8 h 03) ----------
  // Pourquoi : comparé au vent mesuré par 4 stations Météo-France du littoral (15 jours, essai du 21 nov.), le vent prévu au point
  // de la station est plus juste que celui du point de zone : vitesse 2,8-4,4 km/h d'écart moyen au lieu de 4,1-5,7, direction 11-12°
  // au lieu de 16-22° [M] (branche essais-prevision, STATIONS.md). Seuls vent, direction et rafales passent au poste : pluie, nuages,
  // couleur de l'eau et mer gardent les zones (la pluie des 14 jours passés pour 16 points serait trop lourde).
  // Requête : 16 postes, 1 jour passé + 7 prévus, Météo-France puis ECMWF = 15 Ko téléchargés, 151 Ko gardés, 7-12 s [M] (22 nov.,
  // essais-prevision/taille/RESULTAT.md). Coût Open-Meteo : 16 appels sur 10 000 par jour (1 par point sous 14 jours et 10 séries).
  function ventUrl(spots) {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + spots.map(s => s.lat.toFixed(4)).join(",") +
      "&longitude=" + spots.map(s => s.lon.toFixed(4)).join(",") +
      "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&past_days=1&forecast_days=7" +
      "&timezone=Europe%2FParis&wind_speed_unit=kmh&models=" + MODELS;
  }
  // raw = { at, ids: [id des postes dans l'ordre de la requête], r: réponse d'Open-Meteo (tableau, un objet par point) }.
  // keys = heures de la météo des zones (D.keys). Renvoie { id: { wind, dir, gust } } aligné sur ces heures ; null là où le
  // poste n'a pas de valeur (l'appli prend alors le vent de la zone pour cette heure-là).
  function parseVent(raw, keys) {
    const out = {};
    if (!raw || !Array.isArray(raw.r) || !Array.isArray(raw.ids) || raw.r.length !== raw.ids.length) return out;
    raw.ids.forEach((id, n) => {
      const h = raw.r[n] && raw.r[n].hourly; if (!h || !h.time) return;
      const idx = {}; h.time.forEach((t, k) => idx[t] = k);
      const pick = arr => keys.map(t => idx[t] != null && arr[idx[t]] != null ? arr[idx[t]] : null);
      const ws = mergeModels(h, "wind_speed_10m").val, wd = mergeModels(h, "wind_direction_10m").val, wg = mergeModels(h, "wind_gusts_10m").val;
      const p = { wind: pick(ws), dir: pick(wd), gust: pick(wg) };
      // une heure n'est prise que si vitesse ET direction sont là (sinon vent de terre / de mer faux)
      for (let k = 0; k < keys.length; k++) if (p.wind[k] == null || p.dir[k] == null) { p.wind[k] = null; p.dir[k] = null; p.gust[k] = null; }
      out[id] = p;
    });
    return out;
  }
  const DATA = { ZL, ZS, MODELS, PAST_DAYS, urls, mergeModels, parse: parseData, ventUrl, parseVent };
  if (typeof window !== "undefined") window.DATA = DATA;
  if (typeof module !== "undefined") module.exports = DATA;
})();
