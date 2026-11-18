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
  const MODELS = "meteofrance_seamless,ecmwf_ifs025";
  function urls(P) {
    const forecast = "https://api.open-meteo.com/v1/forecast?latitude=" + ZL.map(z => P[z].land[0]).join(",") +
      "&longitude=" + ZL.map(z => P[z].land[1]).join(",") +
      "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation" +
      "&daily=sunrise,sunset&past_days=7&forecast_days=7&timezone=Europe%2FParis&wind_speed_unit=kmh";
    const marine = "https://marine-api.open-meteo.com/v1/marine?latitude=" + ZS.map(z => P[z].sea[0]).join(",") +
      "&longitude=" + ZS.map(z => P[z].sea[1]).join(",") +
      "&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&past_days=7&forecast_days=7&timezone=Europe%2FParis";
    return { forecast, forecastModels: forecast + "&models=" + MODELS, marine };
  }
  const DATA = { ZL, ZS, MODELS, urls, mergeModels, parse: parseData };
  if (typeof window !== "undefined") window.DATA = DATA;
  if (typeof module !== "undefined") module.exports = DATA;
})();
