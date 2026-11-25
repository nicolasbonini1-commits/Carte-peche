// Modèle de présence / d'activité du loup et de la dorade — v1
// Note par poste et par heure = habitat x saison x mer x lumière x vent x pluie x température x carnet
// Chaque facteur renvoie une explication lisible, affichée dans l'appli.
(function () {
  const M = {};

  // ---------- 1. Habitat : qualité du poste selon son type (0 à 1) ----------
  // Loup : il se poste sur les ruptures (digues, embouchures, courants) [S] ;
  // dorade : graus = passage obligé des migrations lagune-mer [S], roches et moules [S].
  M.HABITAT = {
    embouchure:   { loup: 0.95, dorade: 0.80, label: "embouchure" },
    grau:         { loup: 0.90, dorade: 0.95, label: "grau / sortie d'étang" },
    digue:        { loup: 0.80, dorade: 0.70, label: "digue en enrochements" },
    roche:        { loup: 0.85, dorade: 0.95, label: "fonds rocheux" },
    plage_barres: { loup: 0.65, dorade: 0.40, label: "plage à barres" },
    plage_lisse:  { loup: 0.50, dorade: 0.35, label: "plage à pente lisse" }
  };

  // ---------- 2. Saison : présence près du bord, de janvier à décembre ----------
  // Loup : présent près de la côte de septembre à février, reproduction en hiver [S].
  // Dorade : lagunes et côte d'avril à septembre, départ massif à l'automne,
  // reproduction d'octobre à début décembre (surtout vers Marseille) [S].
  M.SEASON = {
    loup:   [0.80, 0.75, 0.60, 0.50, 0.45, 0.35, 0.30, 0.35, 0.60, 0.85, 1.00, 0.90],
    dorade: [0.20, 0.20, 0.30, 0.50, 0.70, 0.85, 0.90, 0.90, 0.90, 1.00, 0.80, 0.40]
  };
  // Sorties de lagune à l'automne : les graus en profitent. Calendrier [S] : départs surtout
  // en oct.-nov., pic mi-octobre (Thambithurai et al. 2026, Movement Ecology 14:10) ; étang du
  // Prévost : départ moyen 6 oct. ± 6 j, aucun en septembre ni en décembre (Mignucci et al. 2023).
  // Valeurs ×1,25 / ×1,20 : [P]. Sept. et déc. retirés le 20 nov. 2026 (accord de Nico).
  // NB : en octobre, 1,00 × 1,25 est plafonné à 1 → ce bonus est aujourd'hui sans effet (à revoir).
  M.GRAU_AUTUMN = { 10: 1.25, 11: 1.20 };

  // ---------- Outils ----------
  const rad = d => d * Math.PI / 180;
  M.angleDiff = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  M.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  M.windName = dir => {
    const d = ((dir % 360) + 360) % 360;
    if (d >= 330 || d < 20) return "mistral (N)";
    if (d < 50) return "nord-est";
    if (d < 110) return "est (grec)";
    if (d < 160) return "marin (SE)";
    if (d < 200) return "sud";
    if (d < 250) return "labech (SO)";
    if (d < 280) return "ouest";
    return "tramontane (NO)";
  };
  M.compass = dir => ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round((((dir % 360) + 360) % 360) / 45) % 8];

  // Vent de mer (positif) ou de terre (négatif), en km/h, pour un poste donné.
  // dir = d'où vient le vent. S'il vient de la direction où regarde le poste, il arrive de la mer.
  M.onshore = (spot, windSpeed, windDir) => windSpeed * Math.cos(rad(M.angleDiff(windDir, spot.seaward)));

  // Houle au poste : la houle du large est réduite si elle n'arrive pas de face. [P]
  M.localWave = (spot, hs, waveDir) => {
    if (hs == null) return null;
    const exp = 0.35 + 0.65 * Math.max(0, Math.cos(rad(M.angleDiff(waveDir ?? spot.seaward, spot.seaward))));
    const shelter = spot.type === "grau" ? 0.8 : 1;
    return hs * exp * shelter;
  };

  M.seaState = h => h == null ? "inconnue" : h < 0.3 ? "calme" : h < 0.8 ? "peu agitée" : h < 1.8 ? "formée" : "forte";
  M.SEA_CLASSES = ["calme", "peu agitée", "formée", "forte"];
  // Houle longue [P] : période ≥ 8 s → une classe de mer au-dessus sur digues et roches.
  // Pourquoi : la longueur d'une vague au large vaut 1,56 × T² (en m, T en s) ; à 8 s, 100 m, elle « sent » le fond dès 50 m
  // de profondeur environ (moitié de la longueur) et déferle plus fort sur les enrochements. À hauteur égale, une houle de 8 s
  // apporte 1,6 fois plus d'énergie par seconde qu'une mer de vent de 5 s (flux d'énergie des vagues ∝ H² × T, eau profonde).
  M.LONG_SWELL_S = 8;
  M.seaClass = (h, per, type) => {
    const st = M.seaState(h);
    if (st === "inconnue" || per == null || per < M.LONG_SWELL_S || (type !== "digue" && type !== "roche")) return { st, long: false };
    const k = Math.min(3, M.SEA_CLASSES.indexOf(st) + 1);
    return { st: M.SEA_CLASSES[k], long: k !== M.SEA_CLASSES.indexOf(st) };
  };

  // ---------- Houle mesurée par les bouées Candhis (Cerema) ----------
  // Bouée la plus proche : Espiguette pour les postes à l'est de 3,95° E (jusqu'à Carnon), Sète à l'ouest (du Lez à Frontignan).
  M.BUOYS = { "03001": "Espiguette", "03404": "Sète" };
  M.buoyFor = spot => spot.lon >= 3.95 ? "03001" : "03404";
  // Règles de lecture [P] :
  //  - heure couverte par les mesures : mesure la plus proche à 45 min près ;
  //  - jusqu'à 3 h après la dernière mesure : on garde la dernière mesure (la houle change lentement, la tâche passe toutes les 3 h) ;
  //  - au-delà : prévision corrigée de l'écart vu à la bouée (mesuré ÷ prévu à la même heure), correction pleine à 3 h,
  //    qui s'efface jusqu'à 24 h après la mesure (la prévision reprend la main) ; écart borné de 0,5 à 1,5.
  M.MEAS = { near: 45, hold: 3, fade: 24 };
  const MIN = 60000, HOUR = 3600000;
  M.buoyRatio = b => {
    const ms = (b && b.mesures || []).filter(m => m.h != null);
    if (!ms.length || !b.prevu || !b.prevu.length) return null;
    const last = ms[ms.length - 1], t = Date.parse(last.t);
    let pv = null;
    for (const x of b.prevu) { const d = Math.abs(Date.parse(x.t) - t); if (x.h != null && d <= 90 * MIN && (!pv || d < pv.d)) pv = { h: x.h, d }; }
    if (!pv || pv.h <= 0.05) return null;
    return { r: M.clamp(last.h / pv.h, 0.5, 1.5), meas: last.h, prevu: pv.h, at: t };
  };
  // Houle au large à l'instant t (ms), d'après la bouée b et la prévision fc = { hs, dir, per } à cette heure.
  M.offshoreWave = (b, t, fc) => {
    const base = { hs: fc.hs, dir: fc.dir, per: fc.per, src: "prévision" };
    const ms = (b && b.mesures || []).filter(m => m.h != null);
    if (!ms.length) return base;
    const T = m => Date.parse(m.t), last = ms[ms.length - 1], tl = T(last);
    const from = m => ({ hs: m.h, dir: m.dir ?? fc.dir, per: m.per ?? fc.per, src: "mesure", at: T(m), buoy: b.nom });
    if (t <= tl + M.MEAS.near * MIN) {
      let best = null;
      for (const m of ms) { const d = Math.abs(T(m) - t); if (d <= M.MEAS.near * MIN && (!best || d < best.d)) best = { m, d }; }
      return best ? from(best.m) : base;
    }
    if (t <= tl + M.MEAS.hold * HOUR) return from(last);
    const q = M.buoyRatio(b);
    if (fc.hs == null || !q) return base;
    const w = 1 - (t - tl - M.MEAS.hold * HOUR) / ((M.MEAS.fade - M.MEAS.hold) * HOUR);
    if (w <= 0) return base;
    return { hs: fc.hs * (1 + (q.r - 1) * w), dir: fc.dir, per: fc.per, src: "prévision corrigée", ratio: q.r, w, at: tl, buoy: b.nom };
  };

  // Facteur « Mer » → note sur 5, avec la phrase affichée à côté.
  M.seaNote = v => v >= 0.95 ? 5 : v >= 0.80 ? 4 : v >= 0.60 ? 3 : v >= 0.40 ? 2 : v >= 0.20 ? 1 : 0;
  M.SEA_NOTE_TXT = ["mer à éviter ici", "très défavorable", "défavorable", "moyenne", "bonne", "idéale"];

  // Lune : fraction éclairée (0-1) et nom de phase (calcul astronomique simplifié, précision ~1 jour)
  M.moon = date => {
    const syn = 29.530588853;
    const ref = Date.UTC(2000, 0, 6, 18, 14); // nouvelle lune de référence
    const age = (((date.getTime() - ref) / 86400000) % syn + syn) % syn;
    const illum = (1 - Math.cos(2 * Math.PI * age / syn)) / 2;
    const name = age < 1.8 ? "nouvelle lune" : age < 7.4 ? "croissant montant" : age < 9.2 ? "premier quartier"
      : age < 14 ? "gibbeuse montante" : age < 16 ? "pleine lune" : age < 21.2 ? "gibbeuse descendante"
      : age < 23 ? "dernier quartier" : age < 27.8 ? "dernier croissant" : "nouvelle lune";
    return { age, illum, name };
  };

  // Période de lumière à une heure donnée (minutes depuis minuit) selon lever/coucher
  M.lightPeriod = (min, sunriseMin, sunsetMin) => {
    if (min >= sunriseMin - 60 && min < sunriseMin + 75) return "aube";
    if (min >= sunsetMin - 75 && min < sunsetMin + 60) return "crépuscule";
    if (min >= sunriseMin + 75 && min < sunsetMin - 75) return "jour";
    return "nuit";
  };

  // ---------- Pluie des jours d'avant et état des fleuves ----------
  // Indice de pluie antérieure (API, Kohler & Linsley 1951) [S] : chaque millimètre compte de moins en moins
  // avec le temps. Ici la pluie d'hier compte à 85 %, celle d'il y a 7 jours à 32 % (0,85^7) [P].
  // rain = pluie horaire (mm), i = heure étudiée. Renvoie l'indice en « mm équivalents ».
  M.API_K = 0.85;
  M.rainIndex = (rain, i, hours = 168) => {
    let s = 0;
    for (let k = Math.max(0, i - hours); k <= i; k++) s += (rain[k] || 0) * Math.pow(M.API_K, (i - k) / 24);
    return s;
  };
  M.rainSum = (rain, i, hours) => { let s = 0; for (let k = Math.max(0, i - hours); k <= i; k++) s += rain[k] || 0; return s; };

  // Niveau du fleuve au poste : 0 normal, 1 eau qui se charge, 2 crue, 3 forte crue.
  // 1) Débit mesuré (Hub'Eau / Vigicrues) quand il existe, comparé au débit habituel du mois
  //    (médiane des débits moyens mensuels mesurés depuis 1990 à la même station) [S pour les données, P pour les seuils] :
  //    moins de 2 fois = normal, 2 à 4 fois = l'eau se charge, 4 à 10 fois = crue, plus de 10 fois = forte crue
  //    (Rhône : 1,5 / 2,5 / 4 fois, voir plus bas).
  // 2) Sinon, indice de pluie sur le bassin versant [P].
  // Les seuils sont des estimations de départ, à caler avec ton carnet (le débit et la pluie y sont enregistrés).
  M.riverLevel = c => {
    if (!c.spot.river) return { level: 0, why: "" };
    const f = c.flow;
    const a = c.apiBasin;
    const rainLv = a >= 100 ? 3 : a >= 50 ? 2 : a >= 20 ? 1 : 0;
    if (f && f.ratio != null) {
      // Rhône : seuils plus bas (simulation 2020-2026 [M] : dès 1,6 fois la normale, l'eau devient très chargée
      // aux Saintes-Maries ; le rapport n'a jamais dépassé 5,2 depuis 2020, les seuils 2 / 4 / 10 ne voyaient pas ses crues).
      const S = c.spot.river === "rhone" ? [1.5, 2.5, 4] : [2, 4, 10];
      const lv = f.ratio >= S[2] ? 3 : f.ratio >= S[1] ? 2 : f.ratio >= S[0] ? 1 : 0;
      const trend = f.trend > 0.08 ? "en hausse" : f.trend < -0.08 ? "en baisse" : "stable";
      const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][f.month - 1];
      const why = `${f.name} : ${fmtQ(f.q)} m³/s, ${fmtQ(f.ratio)} × son débit habituel de ${mois} (${fmtQ(f.ref)} m³/s), ${trend}`;
      // Heure à venir : si la pluie prévue annonce pire que le débit d'aujourd'hui, on la suit.
      if (c.future && rainLv > lv) return { level: rainLv, falling: false, src: "pluie", why: `${why} ; pluie prévue : indice ${Math.round(a)} mm` };
      return { level: lv, falling: f.trend < -0.08 && f.ratio >= 2, src: "débit", why };
    }
    return { level: rainLv, falling: false, src: "pluie", why: `pas de débit mesuré, pluie sur le bassin : indice ${Math.round(a)} mm (7 j)` };
  };
  const fmtQ = q => q >= 10 ? String(Math.round(q)) : q.toFixed(1).replace(".", ",");

  // ---------- 2 bis. Couleur de l'eau estimée (turbidité en FNU) ----------
  // Calée sur 559 jours de turbidité mesurée par Sentinel-2 (Copernicus Marine, pixels de 100 m, à 300 m du bord) de 2020 à 2024,
  // testée sur 2025-2026. Détail et limites : outils/turbidite/RESULTATS.md (branche essai-turbidite). [M] coefficients, [P] seuils des classes.
  // Version du 20 nov. 2026 (12 h 40, accord de Nico) : + pluie des jours d'avant sur la côte. Recalée sur les mêmes données
  // (essai reproduit à l'identique avant : R² test 0,622) : R² test 0,654 (avant 0,622), rang 0,789 (0,767), bonne classe 69 % (66 %),
  // embouchures 1, 6, 12 : 59 % (57 %). Effet seul : indice de pluie 20 mm → ×1,35 ; 60 mm → ×1,5.
  // Avec la pluie, le Lez à Palavas et au Prévost (12, 13) et le Rhône au poste 5 sortaient légèrement négatifs (impossible : plus de débit
  // ne rend pas l'eau plus claire) → mis à 0 (R² test inchangé, 0,654). Le terme « mer qui retombe » (−0,017) n'est pas repris, comme avant.
  // log10(FNU) = base du poste + 0,365 × houle max des 48 h au poste (m) + 0,173 × houle au poste (m) + 0,105 × vent moyen 24 h (par 10 km/h)
  //            + 0,0431 × ln(1 + indice de pluie côte en mm) + Σ fleuves k(poste) × log10(mémoire du débit).
  // Mémoire du débit = max sur 15 jours de (débit moyen du jour / débit habituel du mois) × e^(−jours/τ), au moins 1.
  // Postes 3, 8 et 14 : pas assez de mesures, valeurs reprises des postes voisins (3 = moyenne de 2 et 4, 8 = 6, 14 = moyenne de 13 et 15) [P].
  M.TURB = {
    base: { 1: 0.3588, 2: 0.3324, 3: 0.2607, 4: 0.1889, 5: 0.356, 6: 0.4044, 7: 0.2353, 8: 0.4044, 9: 0.2145, 10: 0.1212,
            11: 0.0812, 12: 0.0499, 13: 0.2002, 14: 0.1787, 15: 0.1571, 16: 0.095,
            // Poste 17 (Beauduc, point à explorer) : point satellite à 300 m de P, calage 2020-2024, test 2025-2026 : R² 0,41, rang 0,68,
            // bonne classe 73 % (ancienne règle 9 %) [M] (branche essai-poste17, outils/poste17/turbidite/RESULTATS.md). Choix de Nico le 23 nov. 2026.
            // Attention : à 300 m, P est plus trouble que ses voisins (médiane 8,4 FNU contre 4,4 aux postes 1 et 2) : à caler avec le carnet.
            17: 0.596 },
    hsmax48: 0.3653, hs: 0.1732, ws24: 0.1049, api: 0.0431,
    rivers: {
      rhone: { tau: 8, k: { 1: 1.9528, 2: 0.8459, 3: 0.6727, 4: 0.4994, 17: 0.3776 } }, // 17 : Beauduc, voir base
      vidourle: { tau: 1, k: { 5: 0.0827, 6: 0.3506, 7: 0.2038, 8: 0.3506, 9: 0.1642 } },
      lez: { tau: 5, k: { 11: 0.0073 } }
    },
    classes: [4, 10, 30],
    names: ["claire", "piquée", "teintée", "très chargée"]
  };
  // x = { hs, hsmax48, ws24 (km/h), mem: { rhone, vidourle, lez } } → { fnu, cls, sea, river, why }
  M.turbidity = (spot, x) => {
    const T = M.TURB, b = T.base[spot.id];
    if (b == null || x.hs == null) return null;
    const lSea = T.hsmax48 * (x.hsmax48 ?? x.hs) + T.hs * x.hs + T.ws24 * (x.ws24 || 0) / 10;
    const lRain = T.api * Math.log(1 + Math.max(0, x.api || 0)); // log népérien, comme dans le calage (np.log1p)
    let lRiv = 0; const rParts = [];
    for (const [r, R] of Object.entries(T.rivers)) {
      const k = R.k[spot.id], m = x.mem && x.mem[r];
      if (!k || !m || m <= 1) continue;
      const l = k * Math.log10(m); lRiv += l;
      if (l >= 0.05) rParts.push(`${window.RIVERS ? window.RIVERS[r].name.split(" ")[0] : r} ×${(10 ** l).toFixed(1).replace(".", ",")}`);
    }
    if (lRain >= 0.05) rParts.push(`pluie des jours d'avant ×${(10 ** lRain).toFixed(1).replace(".", ",")}`);
    const fnu = 10 ** (b + lSea + lRiv + lRain);
    const c = T.classes, i = fnu < c[0] ? 0 : fnu < c[1] ? 1 : fnu < c[2] ? 2 : 3;
    const fmt = v => v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(".", ",");
    const noRef = (x.noRef || []).map(r => window.RIVERS ? window.RIVERS[r].name.split(" ")[0] : r);
    const why = `≈ ${fmt(fnu)} FNU estimés (sans houle ni vent ${fmt(10 ** b)}, houle des 48 h et vent ×${(10 ** lSea).toFixed(1).replace(".", ",")}`
      + (rParts.length ? `, ${rParts.join(", ")}` : "") + ")"
      + (noRef.length ? ` ; débit habituel du ${noRef.join(" et du ")} pas encore reçu : sa crue n'est pas comptée` : "");
    return { fnu, cls: T.names[i], idx: i, sea: 10 ** lSea, river: 10 ** lRiv, rain: 10 ** lRain, land: 10 ** (lRiv + lRain), why }; // land = fleuves + pluie (eau venue de la terre)
  };
  // Couleur de l'eau → note pour le loup sur 5 et facteur de la note du poste (guide Notion, § 2 et 4) [S]/[P] :
  // piquée : souvent le meilleur créneau (scénarios E et H) ; teintée : la journée devient possible avec des coloris visibles (F, J) ;
  // très chargée : repli (G). Dorade : n'aime pas l'eau chargée [P].
  M.WATER_LOUP = { "claire": { note: 4, v: 1.0 }, "piquée": { note: 5, v: 1.05 }, "teintée": { note: 4, v: 1.0 }, "très chargée": { note: 1, v: 0.6 } };
  M.WATER_DORADE = { "claire": 1.0, "piquée": 0.9, "teintée": 0.7, "très chargée": 0.45 };

  // ---------- 2 ter. « Pêchable ? » dans les chenaux (ajout du 20 nov. 2026) ----------
  // Question de Nico : l'eau du chenal sera-t-elle marron (pas pêchable, inutile de faire 1 h de route) ?
  // Seulement là où le satellite voit le chenal (essai du 20 nov., branche essai-chenaux, outils/chenaux/RESULTATS.md) :
  // chenal du Grau-du-Roi (poste 6) et étang du Ponant (poste 8), tous deux alimentés par le Vidourle.
  // Lez à Palavas, Carnon, Frontignan, entrée de La Grande-Motte : chenaux trop étroits pour le satellite, pas de règle.
  // Mesure [M] : sur 804 dates sans nuages (2017-2026), chenal marron seulement quand le Vidourle était ≥ 5,6 fois la normale
  // la veille (8 jours) ; jamais en dessous de 4 fois ; normal dès le 5e jour après le dernier jour ≥ 4 fois.
  // Règle validée par Nico sur la planche d'images le 20 nov. à 9 h 47 (C à 4,3× et D pêchables, A et B non) [C] ;
  // seuils [P], à revoir avec ses relevés sur place.
  // « Normale » = débit moyen du jour ÷ débit habituel du mois (médiane des débits moyens mensuels), comme dans l'appli.
  M.PECHABLE = { spots: { 6: "chenal du Grau-du-Roi", 8: "étang du Ponant" }, river: "vidourle", non: 5, doute: 4 };
  // Débit du fleuve rapporté à la normale pour le jour visé (k = 0), la veille (k = 1) et l'avant-veille (k = 2).
  // pts = [[ms, m³/s]…] (mesures horaires), ref = { mois: { q } }, target = jour visé, now = maintenant.
  // Jours passés : moyenne du jour (heure de Paris), au moins 6 mesures. Aujourd'hui : moyenne des 24 dernières heures
  // mesurées (le matin, la moyenne du jour n'aurait que quelques mesures). Jours à venir : inconnu (null).
  M.dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  M.riverDays = (pts, ref, target, now) => {
    if (!pts || !pts.length || !ref) return [null, null, null];
    const byDay = {};
    for (const [ms, q] of pts) { const k = M.dayKey(new Date(ms)); (byDay[k] = byDay[k] || []).push(q); }
    const today = M.dayKey(now), last = pts[pts.length - 1][0];
    const out = [];
    for (let k = 0; k < 3; k++) {
      const d = new Date(target); d.setDate(d.getDate() - k);
      const key = M.dayKey(d), r = ref[d.getMonth() + 1];
      let q = null, how = "jour";
      if (key > today) q = null;
      else if (key === today) {
        // Dernière mesure de plus de 36 h (téléphone resté sans réseau) : pas de valeur pour aujourd'hui.
        // On garde la plus forte des deux moyennes : 24 dernières heures, ou depuis minuit (au moins 3 mesures),
        // pour qu'une crue qui monte depuis la nuit ne soit pas diluée par la journée calme d'hier.
        if (now.getTime() - last <= 36 * 3600000) {
          const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
          const q24 = pts.filter(p => p[0] > last - 24 * 3600000).map(p => p[1]);
          const qDay = byDay[key] || [];
          if (q24.length >= 6) { q = mean(q24); how = "24h"; }
          if (qDay.length >= 3 && (q == null || mean(qDay) > q)) { q = mean(qDay); how = "minuit"; }
        }
      } else {
        const qs = byDay[key];
        if (qs && qs.length >= 6) q = qs.reduce((a, b) => a + b, 0) / qs.length;
      }
      const rel = Math.round((new Date(key + "T12:00") - new Date(today + "T12:00")) / 86400000); // 0 = aujourd'hui, -1 = hier…
      out.push(q != null && r && r.q > 0 ? { day: key, rel, q, ratio: q / r.q, how } : null);
    }
    return out;
  };
  // days = M.riverDays(...) → { v: "oui" | "douteux" | "non" | null, why, partial }
  M.pechable = (spot, days) => {
    const P = M.PECHABLE;
    if (!P.spots[spot.id]) return null;
    const [d0, d1, d2] = days || [];
    if (!d0 && !d1 && !d2) return { v: null, why: "débit du Vidourle indisponible (pas de réseau depuis plus d'un jour ?)", partial: true };
    const f = x => x.ratio.toFixed(1).replace(".", ",") + "×";
    const lbl = x => x.rel === 0 ? `${f(x)} ${x.how === "minuit" ? "depuis minuit" : "sur les 24 dernières heures"}` : `${f(x)} ${x.rel === -1 ? "hier" : x.rel === -2 ? "avant-hier" : `il y a ${-x.rel} jours`}`;
    const known = [d0, d1, d2].filter(Boolean).map(lbl).join(", ");
    const r = [d0, d1, d2].map(x => x ? x.ratio : null);
    let v;
    if ((r[0] ?? 0) >= P.non || (r[1] ?? 0) >= P.non) v = "non";
    else if (r.some(x => x != null && x >= P.doute)) v = "douteux";
    else v = "oui";
    const why = v === "non" ? `Vidourle en crue (${known}) : chenal probablement marron.`
      : v === "douteux" ? `Vidourle haut ou crue récente (${known}) : eau teintée possible, peut-être marron.`
      : `Vidourle sous 4 fois la normale (${known}).`;
    return { v, why: `${why} Normale = débit habituel du mois.`, partial: !d0 };
  };
  // Courte explication de chaque couleur d'eau (vocabulaire du relevé « Je suis sur place » et du carnet).
  // D'après le guide Notion « Loup au leurre du bord » (scénarios A, E, F, H, J) [G] et l'avis de Nico sur la planche [C].
  M.WATER_TXT = [
    ["Claire", "on voit le fond à plus d'un mètre. Pêchable ; loup méfiant en plein jour : coloris naturels, aube et soir."],
    ["Piquée", "légèrement trouble. Souvent le meilleur moment pour le loup."],
    ["Teintée", "nettement colorée, on ne voit plus le fond. Pêchable avec des coloris visibles (blanc, chartreuse), lentement."],
    ["Marron", "eau de crue, boueuse. Pas pêchable dans le chenal : inutile de se déplacer."]
  ];

  // ---------- 3. Scénario (matrice A-J de ton guide Notion) ----------
  M.scenario = c => {
    if (c.hsLocal != null && c.hsLocal >= 1.8) return "G";
    if (c.turb ? (c.turb.land >= 1.5 && c.turb.land >= c.turb.sea && c.turb.idx >= 1) : (c.spot.river && M.riverLevel(c).level >= 1)) return "J";
    if (c.falling) return "H";
    if (c.hsLocal != null && c.hsLocal >= 0.8) return "F";
    if (c.onshore >= 35) return "I";
    if (c.onshore >= 15 && c.rising) return "E";
    if (c.light === "nuit") return c.darkNight ? "C" : "D";
    if (c.light === "jour") return "A";
    return "B";
  };
  M.SCENARIOS = {
    A: { name: "Calme, eau claire, plein jour", lure: "L3 ou L1 en coloris translucide ou naturel (Ghost Minnow, Kaki), en dérive dans le courant. Créneau difficile : mieux vaut attendre le soir." },
    B: { name: "Calme, aube ou crépuscule", lure: "S1 Patchinko (Ghost Lançon, Mat White) en zigzag avec pauses ; sinon M1 en coloris naturel, linéaire lent." },
    C: { name: "Nuit sombre, mer calme", lure: "M1 ou L3 en coloris clair (Bone, Mat White), linéaire très lent jusque dans les pieds." },
    D: { name: "Nuit claire, mer calme", lure: "M1 ou L3 à dos sombre (Kaki), linéaire très lent ; surface lente." },
    E: { name: "Vent de mer qui se lève", lure: "L1 Kaki, puis coloris clair quand l'eau se charge ; M3 Bone, au ras des blocs, dans l'écume." },
    F: { name: "Mer formée, eau teintée", lure: "L2 Lime Juice ou shad blanc 10-12 cm ; jig clair. Lent près du fond, tirées-relâchées." },
    G: { name: "Mer forte", lure: "Repli à l'intérieur des graus : L1 ou L2 en chartreuse ou blanc, gratter lentement. Digues exposées à éviter." },
    H: { name: "Mer qui retombe après un coup de mer", lure: "M2 Tide Minnow (Neo Pearl, Real Anchovy) ; L1 Kaki pailleté. Linéaire lent coupé d'à-coups et de pauses." },
    I: { name: "Vent fort de face", lure: "J1/J2 jig clair ; M3. Linéaire rapide ou tirées-relâchées, vers les chasses." },
    J: { name: "Après de fortes pluies (fleuve en crue)", lure: "L1 ou L2 Lime Juice ou blanc ; M3 Bone. Lent, en bordure du panache d'eau sale." }
  };

  // ---------- 4. Facteurs ----------
  // Mer (loup) : table issue de la matrice du guide [S]/[P]
  const SEA_LOUP = {
    "calme":      { embouchure: 0.85, grau: 0.85, digue: 0.80, roche: 0.75, plage_barres: 0.55, plage_lisse: 0.50 },
    "peu agitée": { embouchure: 0.90, grau: 0.90, digue: 1.00, roche: 1.00, plage_barres: 0.85, plage_lisse: 0.80 },
    "formée":     { embouchure: 0.90, grau: 0.85, digue: 0.75, roche: 0.85, plage_barres: 1.00, plage_lisse: 0.95 },
    "forte":      { embouchure: 0.60, grau: 0.75, digue: 0.25, roche: 0.30, plage_barres: 0.40, plage_lisse: 0.40 }
  };
  const SEA_DORADE = { "calme": 1.0, "peu agitée": 0.95, "formée": 0.70, "forte": 0.30 }; // [P]

  // ---------- 5. Note d'un poste à une heure ----------
  // c = conditions au poste : month, light, darkNight, cloud, wind, windDir, gust, onshore,
  //     hsLocal, falling, rising, rain72, sst, spot
  M.score = (spot, species, c, learn) => {
    const f = []; // facteurs {k, v, why}
    const H = M.HABITAT[spot.type];
    f.push({ k: "Poste", v: H[species], why: H.label });
    let season = M.SEASON[species][c.month - 1];
    let sWhy = species === "loup" ? "le loup est près du bord de septembre à février" : "la dorade est près du bord d'avril à novembre";
    if (species === "dorade" && (spot.type === "grau" || spot.type === "embouchure") && M.GRAU_AUTUMN[c.month]) {
      season = Math.min(1, season * M.GRAU_AUTUMN[c.month]);
      sWhy = "automne : les dorades sortent des étangs par les graus";
    }
    f.push({ k: "Saison", v: season, why: sWhy });

    const st = M.seaState(c.hsLocal);
    const sc = M.seaClass(c.hsLocal, c.period, spot.type);
    const f1 = v => v.toFixed(1).replace(".", ",");
    let sea = 1, seaWhy = `mer ${st}` + (c.hsLocal != null ? ` (~${f1(c.hsLocal)} m au poste)` : "");
    if (c.waveSrc === "mesure") seaWhy += `, d'après la bouée ${c.waveBuoy} (${f1(c.hsOff)} m mesurés au large)`;
    else if (c.waveSrc === "prévision corrigée") seaWhy += `, prévision corrigée par la bouée ${c.waveBuoy} (×${c.waveRatio.toFixed(2).replace(".", ",")})`;
    if (sc.long) seaWhy += `, houle longue (${Math.round(c.period)} s) : comptée comme mer ${sc.st} sur ce poste`;
    if (sc.st !== "inconnue") sea = species === "loup" ? SEA_LOUP[sc.st][spot.type] : SEA_DORADE[sc.st];
    if (c.falling) { sea = Math.min(1, sea * (species === "loup" ? 1.15 : 1.1)); seaWhy += ", mer qui retombe : souvent le meilleur créneau"; }
    const note = sc.st === "inconnue" ? null : M.seaNote(sea);
    if (note != null) seaWhy += ` → ${note}/5, ${M.SEA_NOTE_TXT[note]} pour ${species === "dorade" ? "la" : "le"} ${species}`;
    f.push({ k: "Mer", v: sea, why: seaWhy, note });

    let light;
    let lWhy = c.light;
    if (species === "loup") {
      if (c.light === "aube" || c.light === "crépuscule") light = 1.0;
      else if (c.light === "nuit") { light = c.darkNight ? 0.85 : 0.75; if (spot.lit) { light += 0.1; lWhy += ", zone éclairée"; } lWhy += c.darkNight ? " sombre" : " claire"; }
      else {
        light = st === "calme" ? 0.45 : st === "peu agitée" ? 0.6 : 0.85;
        if (c.cloud >= 70) { light += 0.1; lWhy += " couvert"; }
        lWhy += st === "calme" ? " par mer calme : le loup se méfie" : "";
      }
    } else {
      light = c.light === "aube" ? 1.0 : c.light === "crépuscule" ? 0.95 : c.light === "jour" ? 0.9 : 0.6;
    }
    f.push({ k: "Lumière", v: Math.min(1, light), why: lWhy });

    // windSrc (22 nov. 2026) : « poste » = vent prévu au poste, « zone » = vent du point de zone (en secours)
    let wind = 1, wWhy = `${M.windName(c.windDir)} ${Math.round(c.wind)} km/h${c.windSrc === "poste" ? " (au poste)" : c.windSrc === "zone" ? " (vent de la zone)" : ""}`;
    if (c.onshore >= 35) { wind *= 0.8; wWhy += ", de face : lancer difficile"; }
    else if (c.onshore <= -25) wWhy += ", de terre : mer plate et eau claire";
    if (c.gust >= 60) { wind *= 0.6; wWhy += `, rafales ${Math.round(c.gust)} km/h : prudence`; }
    else if (species === "dorade" && c.gust >= 50) { wind *= 0.75; wWhy += ", rafales gênantes pour la calée"; }
    f.push({ k: "Vent", v: wind, why: wWhy });

    // Pluie des 7 derniers jours et état du fleuve [P] :
    // loup : un panache modéré le favorise (bordure d'eau sale, poissons désorientés), une vraie crue le chasse ;
    // dorade : n'aime pas l'eau douce et chargée ; une décrue qui s'éclaircit est un bon moment pour le loup.
    let rain = 1, rWhy = `${Math.round(c.rain7)} mm en 7 j, dont ${Math.round(c.rain72)} mm en 72 h`;
    if (c.turb) {
      // Couleur de l'eau estimée (section 2 bis). Si l'eau est très chargée surtout à cause de la houle, le facteur « Mer »
      // la compte déjà : on ne pénalise pas deux fois (0,85 au lieu de 0,6 pour le loup).
      const w = c.turb;
      if (species === "loup") {
        const L = M.WATER_LOUP[w.cls], dueToSea = w.idx === 3 && w.sea > w.land;
        rain = dueToSea ? 0.85 : L.v;
        rWhy = `eau ${w.cls} ${w.why} · pour le loup ${dueToSea ? "3/5 (surtout la houle, déjà comptée dans « Mer »)" : L.note + "/5"} · pluie : ${rWhy}`;
      } else {
        rain = M.WATER_DORADE[w.cls];
        rWhy = `eau ${w.cls} ${w.why} · pluie : ${rWhy}`;
      }
      f.push({ k: "Couleur de l'eau", v: rain, why: rWhy });
    } else {
    if (spot.river) {
      const rv = M.riverLevel(c);
      rWhy += ` · ${rv.why}`;
      const T = species === "loup" ? [1, 1.05, 0.8, 0.55] : [1, 0.85, 0.65, 0.45];
      rain = T[rv.level];
      if (rv.falling && species === "loup" && rv.level <= 2) { rain = Math.min(1.1, rain * 1.15); rWhy += " : décrue, l'eau s'éclaircit"; }
      else rWhy += [" : normal", " : panache d'eau sale", " : crue, eau très chargée", " : forte crue, poste à éviter"][rv.level];
    } else if (c.apiCoast >= 40) { rain = species === "loup" ? 1 : 0.9; rWhy += " : eau un peu piquée près du bord"; }
    f.push({ k: "Pluie", v: rain, why: rWhy });
    }

    let temp = 1, tWhy = c.sst != null ? `eau à ${c.sst.toFixed(1)} °C` : "température de l'eau inconnue";
    if (c.sst != null) {
      if (species === "loup") temp = c.sst < 11 ? 0.8 : c.sst < 13 ? 0.9 : c.sst > 24 ? 0.7 : 1;
      else temp = c.sst < 12 ? 0.6 : c.sst < 14 ? 0.85 : 1;
    }
    f.push({ k: "Eau", v: temp, why: tWhy });

    let total = f.reduce((p, x) => p * x.v, 1);
    if (learn && learn.n > 0) {
      const f2 = v => v.toFixed(1).replace(".", ",");
      f.push({ k: "Carnet", v: learn.factor, why: learn.attendu == null ? `${learn.k} sortie(s) réussie(s) sur ${learn.n} ici`
        : `${learn.k} sortie(s) réussie(s) sur ${learn.n} ici, ${f2(learn.attendu)} attendue(s) d'après ta moyenne (${learn.kTot} réussie(s) sur ${learn.nTot} sorties, tous postes)` });
      total *= learn.factor;
    }
    const safety = (c.hsLocal != null && c.hsLocal >= 1.5 && (spot.type === "digue" || spot.type === "roche")) || c.gust >= 70;
    return { score: Math.round(M.clamp(total, 0, 1) * 100), factors: f, scenario: M.scenario(c), safety };
  };

  // ---------- 6. Apprentissage par le carnet ----------
  // Pour un poste et une espèce : prior = note du modèle (p). On ajoute tes sorties :
  // facteur = ((réussites + a*p) / (sorties + a)) / p, borné entre 0,5 et 1,5. a = 4 :
  // il faut ~4 sorties pour que ton expérience pèse autant que le modèle.
  // Ancienne formule (jusqu'au 25 nov. 2026) : gardée pour comparer dans les essais, plus utilisée par l'appli.
  // Défaut vu par l'audit du 25 nov. : la note du modèle n'est pas une probabilité de prise ; avec 25 % de sorties réussies,
  // un poste noté 80 tombait à ×0,58 après 5 sorties, sous un poste jamais essayé.
  M.learnFactor = (k, n, p, a = 4) => {
    if (!n) return { n: 0, k: 0, factor: 1 };
    p = M.clamp(p, 0.05, 0.95);
    return { n, k, factor: M.clamp(((k + a * p) / (n + a)) / p, 0.5, 1.5) };
  };
  // Nouvelle formule (audit du 25 nov. 2026, point 4) : « observé / attendu », comme on compare un poste à la moyenne.
  // 1) Ton taux moyen, toutes sorties confondues pour l'espèce : c = sorties réussies ÷ somme des notes du modèle (÷ 100)
  //    au moment de chaque sortie. c traduit la note du modèle en chances réelles POUR TOI (débutant ou non).
  // 2) Pour chaque poste : attendu = c × somme des notes de tes sorties à ce poste ; facteur = (réussies + a) / (attendu + a),
  //    borné entre 0,5 et 1,5. a = 2 [P] : il faut quelques sorties pour qu'un poste s'écarte de 1.
  // Conséquences : si tu réussis partout pareil, tous les facteurs restent à 1 (plus de punition des postes où tu vas) ;
  // bredouille partout → 1 partout (rien ne distingue les postes) ; seul l'écart d'un poste à TA moyenne compte.
  // sorties = [{ spotId, ok (vrai si au moins 1 prise de l'espèce), p (note du modèle ÷ 100 à cette sortie) }]
  M.learnCarnet = (sorties, a = 2) => {
    const K = sorties.filter(s => s.ok).length, P = sorties.reduce((t, s) => t + s.p, 0);
    const c = P > 0 ? K / P : 0;
    const per = {};
    sorties.forEach(s => { const x = per[s.spotId] = per[s.spotId] || { n: 0, k: 0, sumP: 0 }; x.n++; if (s.ok) x.k++; x.sumP += s.p; });
    Object.values(per).forEach(x => { x.attendu = c * x.sumP; x.factor = M.clamp((x.k + a) / (x.attendu + a), 0.5, 1.5); });
    return { n: sorties.length, k: K, taux: sorties.length ? K / sorties.length : 0, c, per };
  };

  // ---------- 7. Ordre des leurres pour un créneau ----------
  // Principe : prospecter de haut en bas (surface → sous la surface → fond), du bord vers le large,
  // ~15-20 min par leurre avant de changer. Coloris selon l'eau et la lumière (guide, § 4). [S]/[P]
  M.water = c => {
    if (c.turb) return c.turb.cls;
    const rl = M.riverLevel(c).level;
    if ((c.hsLocal != null && c.hsLocal >= 0.8) || rl >= 2) return "teintée";
    if (c.falling || (c.hsLocal != null && c.hsLocal >= 0.5) || rl === 1 || c.apiCoast >= 15) return "piquée";
    return "claire";
  };
  M.colorFor = c => {
    const w = M.water(c);
    if (c.light === "nuit") return c.darkNight ? { fam: "clair", ex: "Bone, Mat White, Ghost Minnow", why: "nuit sombre : un coloris clair se voit mieux" }
      : { fam: "sombre", ex: "Kaki, Black Mullet", why: "nuit claire : silhouette sombre vue d'en dessous" };
    if (w === "teintée" || w === "très chargée") return { fam: "blanc ou chartreuse", ex: "Lime Juice, Mat White, Bone", why: "eau teintée : il faut être vu" };
    if (w === "piquée") return { fam: "pailleté, kaki ou nacré", ex: "Kaki pailleté, Neo Pearl", why: "eau légèrement piquée" };
    if (c.light === "jour" && c.cloud < 70) return { fam: "naturel translucide", ex: "Ghost Lançon, Real Anchovy, Ghost Minnow", why: "eau claire et soleil : la couleur compte, rester discret" };
    return { fam: "naturel à ventre blanc", ex: "Mat White, Neo Pearl, Ghost Lançon", why: "eau claire, lumière faible ou ciel couvert" };
  };
  M.COLD_WATER = 14; // °C, seuil [P] de l'ordre « eau froide » (voir fin de M.lureSequence)
  // Phrase ajoutée à la ligne « Leurre : » des scénarios en eau froide, pour ne pas contredire l'ordre des leurres (accord de Nico, 20 nov. 2026, 21 h 27)
  M.coldNote = c => (c && c.sst != null && c.sst < M.COLD_WATER)
    ? ` <b>Eau à ${c.sst.toFixed(1).replace(".", ",")} °C :</b> commence près du fond, surface en court essai [P] à vérifier ; tout en plus lent [S].`
    : "";
  M.lureSequence = c => {
    const col = M.colorFor(c), st = M.seaState(c.hsLocal), spot = c.spot;
    const shallow = spot.type === "plage_lisse" || spot.type === "plage_barres";
    const steps = [];
    const rough = st === "formée" || st === "forte";
    // 1. Surface / haut de la colonne d'eau
    if (!rough && c.onshore < 35 && c.light !== "jour") {
      steps.push({ zone: "Surface", lure: c.light === "nuit" ? "S2 Asturie 110 (stickbait)" : "S1 Patchinko 100 (flottant de surface)",
        color: col.ex, anim: c.light === "nuit" ? "linéaire lent en surface, sillage régulier" : "zigzag (walking the dog) avec pauses de 1 à 3 s" });
    } else if (!rough && c.light === "jour" && c.cloud >= 70) {
      steps.push({ zone: "Surface", lure: "S2 Asturie 110 (stickbait)", color: col.ex, anim: "zigzag lent, pauses longues" });
    } else if (rough) {
      steps.push({ zone: "Sous la surface, dans l'écume", lure: "M3 Hagre Minnow 120 F (lourd, passe le vent)", color: "Bone, Secret Sprat", anim: "linéaire lent au ras des blocs et dans l'écume" });
    }
    // 2. Sous la surface
    if (c.onshore >= 35) steps.push({ zone: "Distance (vent de face)", lure: "J1 Westin Sandy SBass 18 g ou J2 jig 20 g", color: "Real Sandeel, clair", anim: "linéaire rapide ou tirées-relâchées, vers les chasses" });
    else if (c.light === "nuit" || shallow) steps.push({ zone: "Sous la surface (0-20 cm)", lure: "M1 Hagre Minnow 96 F", color: col.ex, anim: c.light === "nuit" ? "linéaire très lent, jusque dans les pieds" : "linéaire lent coupé de pauses" });
    else steps.push({ zone: "Sous la surface", lure: "M2 Tide Minnow Slim 140 (jerkbait)", color: col.fam === "naturel translucide" ? "Real Anchovy, Real Sand Lance" : "Neo Pearl", anim: c.falling ? "linéaire lent coupé d'à-coups et de pauses" : "linéaire lent, 2-3 à-coups puis arrêt" });
    // 3. Fond
    const bm = st === "formée" || st === "forte" || (spot.type === "grau" && !shallow) ? "L2 Black Minnow 120, tête Search 18 g" : shallow || c.light === "nuit" ? "L3 Black Minnow 120, tête Shallow 6 g" : "L1 Black Minnow 120, tête Shore 12 g";
    const bmCol = col.fam === "blanc ou chartreuse" ? "Lime Juice" : col.fam === "sombre" ? "Kaki" : col.fam === "clair" ? "Ghost Minnow" : col.fam === "pailleté, kaki ou nacré" ? "Kaki pailleté" : "Kaki ou Ghost Minnow";
    steps.push({ zone: "Près du fond", lure: bm, color: bmCol, anim: spot.type === "grau" || spot.type === "embouchure" ? "dérive dans la veine de courant, puis linéaire lent" : "linéaire lent près du fond, tirées-relâchées si rien" });
    // Eau froide (chantier 2, accord de Nico le 20 nov. 2026, 18 h 56) :
    //  - animation lente sur tous les leurres [S] : métabolisme de base du loup 36 mg O2/kg/h à 10 °C contre 89 à 20 °C
    //    (Claireaux & Lagardère 1999, J. Sea Res. 42) ; arrêt de l'alimentation vers 7 °C (Kara & Quignard 2018, cité par Mignucci et al. 2023) ;
    //  - commencer près du fond, surface en court essai [P] « à vérifier » : aucune étude trouvée, magazines seulement ;
    //  - seuil 14 °C [P] (magazines : 12-15 °C). Température inconnue : ordre habituel.
    const cold = c.sst != null && c.sst < M.COLD_WATER;
    if (cold) {
      const t = c.sst.toFixed(1).replace(".", ",");
      const kept = steps.slice(0, 3);
      const fond = kept.pop();
      fond.zone = `Près du fond en premier (eau à ${t} °C, sous ${M.COLD_WATER} °C) [P] à vérifier`;
      fond.anim = (spot.type === "grau" || spot.type === "embouchure" ? "dérive lente dans la veine de courant, près du fond" : "très lent, au contact du fond, pauses longues") + " [S] eau froide : loup moins actif";
      kept.forEach(s => {
        if (s.zone === "Surface") s.zone = "Surface : court essai (5 min) [P] à vérifier";
        s.anim = s.lure.startsWith("J1") ? "tirées-relâchées lentes, laisser retomber au fond [S] eau froide" : /très lent/.test(s.anim) ? `${s.anim} [S] eau froide` : `${s.anim.replace(/rapide ou /, "")}, en plus lent [S] eau froide`;
      });
      const surf = kept.filter(s => s.zone.startsWith("Surface")), mid = kept.filter(s => !s.zone.startsWith("Surface"));
      return { steps: [fond, ...mid, ...surf], color: col, water: M.water(c), cold: true };
    }
    return { steps: steps.slice(0, 3), color: col, water: M.water(c), cold: false };
  };

  // ---------- 8. Alertes des 3 prochains jours ----------
  // Par zone, sur les 72 h à venir. Seuils [P] (pratique de la côte, à ajuster) :
  //  coup de mer : houle au large ≥ 1,5 m (≥ 2,5 m : forte mer) ; retombée = houle redescendue sous 65 % du pic (scénario H) ;
  //  vent d'est / marin (de 60° à 160°) ≥ 30 km/h pendant 3 h ; mistral / tramontane (de 290° à 20°) ≥ 45 km/h ou rafales ≥ 75 km/h ;
  //  vent qui forcit : +20 km/h en 6 h ; fortes pluies : ≥ 40 mm en 24 h sur un bassin versant ;
  //  modèles en désaccord : Météo-France et ECMWF diffèrent de plus de 15 km/h ou de 60° sur le vent.
  const inSector = (d, a, b) => a <= b ? d >= a && d <= b : d >= a || d <= b;
  M.alerts = (D, now) => {
    const out = [];
    const i0 = D.times.findIndex(t => t >= now), i1 = Math.min(D.times.length - 1, i0 + 72);
    if (i0 < 0) return out;
    // Dates lisibles dans les alertes et les notifications : « jeudi 19 à 4 h », « jeudi 19, de 4 h à 18 h »,
    // « du jeudi 19 à 22 h au vendredi 20 à 3 h ». Pas de « demain » : la notification peut partir le lendemain (attente de 7 h).
    const day = i => D.times[i].toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
    const hour = i => { const h = D.times[i].getHours(); return h === 0 ? "minuit" : h === 12 ? "midi" : `${h} h`; };
    const fmt = i => `${day(i)} à ${hour(i)}`;
    const span = (a, b) => day(a) === day(b) ? `${day(a)}, de ${hour(a)} à ${hour(b)}` : `du ${fmt(a)} au ${fmt(b)}`;
    const runs = (test, minLen) => { const r = []; let s = -1; for (let i = i0; i <= i1 + 1; i++) { const ok = i <= i1 && test(i); if (ok && s < 0) s = i; if (!ok && s >= 0) { if (i - s >= minLen) r.push([s, i - 1]); s = -1; } } return r; };
    const zones = { W: "Frontignan – Palavas", C: "golfe d'Aigues-Mortes", E: "Petite Camargue" };
    // Houle : par zone, on garde la pire
    let wave = null;
    for (const z of ["W", "C", "E"]) {
      const hs = D.S[z].hs;
      for (const [a, b] of runs(i => (hs[i] ?? 0) >= 1.5, 2)) {
        let p = a; for (let i = a; i <= b; i++) if (hs[i] > hs[p]) p = i;
        if (!wave || hs[p] > wave.peak) wave = { z, a, b, p, peak: hs[p] };
      }
    }
    if (wave) {
      const hs = D.S[wave.z].hs; let r = -1;
      for (let i = wave.p; i <= Math.min(D.times.length - 1, wave.p + 48); i++) if (hs[i] != null && hs[i] <= 0.65 * wave.peak && hs[i] < 1.2) { r = i; break; }
      out.push({ level: wave.peak >= 2.5 ? 3 : 2, kind: "mer", title: wave.peak >= 2.5 ? "Forte mer" : "Coup de mer",
        text: `Houle jusqu'à ${wave.peak.toFixed(1).replace(".", ",")} m (${zones[wave.z]}) ${span(wave.a, wave.b)}, pic ${day(wave.p) === day(wave.a) ? "à " + hour(wave.p) : fmt(wave.p)}. Digues et roches exposées dangereuses.`, i: wave.a });
      if (r > 0) out.push({ level: 0, kind: "chance", title: "Mer qui retombe : créneau à viser",
        text: `La houle redescend ${day(r)} vers ${hour(r)}. Après un coup de mer, eau teintée qui s'éclaircit : souvent le meilleur moment pour le loup (scénario H).`, i: r });
    }
    const W = D.F.C;
    for (const [a, b] of runs(i => inSector(W.dir[i] ?? 0, 60, 160) && (W.wind[i] ?? 0) >= 30, 3)) {
      let p = a; for (let i = a; i <= b; i++) if (W.wind[i] > W.wind[p]) p = i;
      out.push({ level: W.wind[p] >= 50 ? 3 : 2, kind: "vent", title: "Vent d'est / marin", text: `${Math.round(W.wind[p])} km/h (rafales ${Math.round(W.gust[p])}) ${span(a, b)} : la mer monte et l'eau se charge.`, i: a });
      break;
    }
    for (const [a, b] of runs(i => inSector(W.dir[i] ?? 0, 290, 20) && ((W.wind[i] ?? 0) >= 45 || (W.gust[i] ?? 0) >= 75), 3)) {
      let p = a; for (let i = a; i <= b; i++) if (W.gust[i] > W.gust[p]) p = i;
      out.push({ level: 2, kind: "vent", title: M.windName(W.dir[p]).startsWith("mistral") ? "Mistral fort" : "Tramontane forte", text: `${Math.round(W.wind[p])} km/h, rafales ${Math.round(W.gust[p])} km/h, ${span(a, b)}. Mer plate et eau claire au bord, mais lancer difficile et rafales dangereuses sur les digues.`, i: a });
      break;
    }
    for (let i = i0 + 6; i <= i1; i++) {
      if ((W.wind[i] ?? 0) - (W.wind[i - 6] ?? 0) >= 20 && (W.wind[i] ?? 0) >= 30) {
        if (!out.some(x => x.kind === "vent" && Math.abs(x.i - i) <= 6)) out.push({ level: 1, kind: "vent", title: "Vent qui forcit", text: `${M.windName(W.dir[i])} : de ${Math.round(W.wind[i - 6])} à ${Math.round(W.wind[i])} km/h, ${span(i - 6, i)}.`, i: i - 6 });
        break;
      }
    }
    for (const [key, label] of [["RV", "Vidourle"], ["RL", "Lez"]]) {
      const r = D.F[key] && D.F[key].rain; if (!r) continue;
      let best = 0, bi = -1;
      for (let i = i0; i <= i1; i++) { const s = M.rainSum(r, i, 24); if (s > best) { best = s; bi = i; } }
      if (best >= 40) out.push({ level: best >= 80 ? 3 : 2, kind: "pluie", title: `Fortes pluies sur le bassin du ${label}`, text: `${Math.round(best)} mm en 24 h jusqu'à ${fmt(bi)} : crue possible, postes du ${label} à éviter puis à surveiller à la décrue. Voir Vigicrues.`, i: bi });
    }
    // Fiabilité : désaccord entre modèles sur les 72 h
    if (D.alt) {
      let n = 0, first = -1;
      for (let i = i0; i <= Math.min(i1, D.mfEnd ?? i1); i++) {
        const a = D.alt.C, dv = Math.abs((a.wind[i] ?? 0) - (W.wind[i] ?? 0)), dd = M.angleDiff(a.dir[i] ?? 0, W.dir[i] ?? 0);
        if (dv >= 15 || (dd >= 60 && W.wind[i] >= 15)) { n++; if (first < 0) first = i; }
      }
      if (n >= 6) out.push({ level: 1, kind: "fiabilite", title: "Prévision incertaine", text: `Météo-France et le modèle européen ECMWF ne sont pas d'accord sur le vent pendant ${n} h (dès ${fmt(first)}). À revérifier la veille.`, i: first });
    }
    return out.sort((a, b) => a.i - b.i);
  };

  M.classOf = s => s < 35 ? 0 : s < 55 ? 1 : s < 70 ? 2 : s < 82 ? 3 : 4;
  M.CLASS_LABELS = ["Très faible", "Faible", "Moyenne", "Forte", "Très forte"];

  window.MODEL = M;
  if (typeof module !== "undefined") module.exports = M;
})();
