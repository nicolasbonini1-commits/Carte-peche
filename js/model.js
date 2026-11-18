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
  // Sorties de lagune à l'automne : les graus en profitent [S] (calendrier) / [P] (valeur)
  M.GRAU_AUTUMN = { 9: 1.10, 10: 1.25, 11: 1.20, 12: 1.10 };

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
  //    moins de 2 fois = normal, 2 à 4 fois = l'eau se charge, 4 à 10 fois = crue, plus de 10 fois = forte crue.
  // 2) Sinon, indice de pluie sur le bassin versant [P].
  // Les seuils sont des estimations de départ, à caler avec ton carnet (le débit et la pluie y sont enregistrés).
  M.riverLevel = c => {
    if (!c.spot.river) return { level: 0, why: "" };
    const f = c.flow;
    const a = c.apiBasin;
    const rainLv = a >= 100 ? 3 : a >= 50 ? 2 : a >= 20 ? 1 : 0;
    if (f && f.ratio != null) {
      const lv = f.ratio >= 10 ? 3 : f.ratio >= 4 ? 2 : f.ratio >= 2 ? 1 : 0;
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

  // ---------- 3. Scénario (matrice A-J de ton guide Notion) ----------
  M.scenario = c => {
    if (c.hsLocal != null && c.hsLocal >= 1.8) return "G";
    if (c.spot.river && M.riverLevel(c).level >= 1) return "J";
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
    let sea = 1, seaWhy = `mer ${st}` + (c.hsLocal != null ? ` (~${c.hsLocal.toFixed(1)} m au poste)` : "");
    if (st !== "inconnue") sea = species === "loup" ? SEA_LOUP[st][spot.type] : SEA_DORADE[st];
    if (c.falling) { sea = Math.min(1, sea * (species === "loup" ? 1.15 : 1.1)); seaWhy += ", mer qui retombe : souvent le meilleur créneau"; }
    f.push({ k: "Mer", v: sea, why: seaWhy });

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

    let wind = 1, wWhy = `${M.windName(c.windDir)} ${Math.round(c.wind)} km/h`;
    if (c.onshore >= 35) { wind *= 0.8; wWhy += ", de face : lancer difficile"; }
    else if (c.onshore <= -25) wWhy += ", de terre : mer plate et eau claire";
    if (c.gust >= 60) { wind *= 0.6; wWhy += `, rafales ${Math.round(c.gust)} km/h : prudence`; }
    else if (species === "dorade" && c.gust >= 50) { wind *= 0.75; wWhy += ", rafales gênantes pour la calée"; }
    f.push({ k: "Vent", v: wind, why: wWhy });

    // Pluie des 7 derniers jours et état du fleuve [P] :
    // loup : un panache modéré le favorise (bordure d'eau sale, poissons désorientés), une vraie crue le chasse ;
    // dorade : n'aime pas l'eau douce et chargée ; une décrue qui s'éclaircit est un bon moment pour le loup.
    let rain = 1, rWhy = `${Math.round(c.rain7)} mm en 7 j, dont ${Math.round(c.rain72)} mm en 72 h`;
    if (spot.river) {
      const rv = M.riverLevel(c);
      rWhy += ` · ${rv.why}`;
      const T = species === "loup" ? [1, 1.05, 0.8, 0.55] : [1, 0.85, 0.65, 0.45];
      rain = T[rv.level];
      if (rv.falling && species === "loup" && rv.level <= 2) { rain = Math.min(1.1, rain * 1.15); rWhy += " : décrue, l'eau s'éclaircit"; }
      else rWhy += [" : normal", " : panache d'eau sale", " : crue, eau très chargée", " : forte crue, poste à éviter"][rv.level];
    } else if (c.apiCoast >= 40) { rain = species === "loup" ? 1 : 0.9; rWhy += " : eau un peu piquée près du bord"; }
    f.push({ k: "Pluie", v: rain, why: rWhy });

    let temp = 1, tWhy = c.sst != null ? `eau à ${c.sst.toFixed(1)} °C` : "température de l'eau inconnue";
    if (c.sst != null) {
      if (species === "loup") temp = c.sst < 11 ? 0.8 : c.sst < 13 ? 0.9 : c.sst > 24 ? 0.7 : 1;
      else temp = c.sst < 12 ? 0.6 : c.sst < 14 ? 0.85 : 1;
    }
    f.push({ k: "Eau", v: temp, why: tWhy });

    let total = f.reduce((p, x) => p * x.v, 1);
    if (learn && learn.n > 0) {
      f.push({ k: "Carnet", v: learn.factor, why: `${learn.k} sortie(s) réussie(s) sur ${learn.n} ici` });
      total *= learn.factor;
    }
    const safety = (c.hsLocal != null && c.hsLocal >= 1.5 && (spot.type === "digue" || spot.type === "roche")) || c.gust >= 70;
    return { score: Math.round(M.clamp(total, 0, 1) * 100), factors: f, scenario: M.scenario(c), safety };
  };

  // ---------- 6. Apprentissage par le carnet ----------
  // Pour un poste et une espèce : prior = note du modèle (p). On ajoute tes sorties :
  // facteur = ((réussites + a*p) / (sorties + a)) / p, borné entre 0,5 et 1,5. a = 4 :
  // il faut ~4 sorties pour que ton expérience pèse autant que le modèle.
  M.learnFactor = (k, n, p, a = 4) => {
    if (!n) return { n: 0, k: 0, factor: 1 };
    p = M.clamp(p, 0.05, 0.95);
    return { n, k, factor: M.clamp(((k + a * p) / (n + a)) / p, 0.5, 1.5) };
  };

  // ---------- 7. Ordre des leurres pour un créneau ----------
  // Principe : prospecter de haut en bas (surface → sous la surface → fond), du bord vers le large,
  // ~15-20 min par leurre avant de changer. Coloris selon l'eau et la lumière (guide, § 4). [S]/[P]
  M.water = c => {
    const rl = M.riverLevel(c).level;
    if ((c.hsLocal != null && c.hsLocal >= 0.8) || rl >= 2) return "teintée";
    if (c.falling || (c.hsLocal != null && c.hsLocal >= 0.5) || rl === 1 || c.apiCoast >= 15) return "piquée";
    return "claire";
  };
  M.colorFor = c => {
    const w = M.water(c);
    if (c.light === "nuit") return c.darkNight ? { fam: "clair", ex: "Bone, Mat White, Ghost Minnow", why: "nuit sombre : un coloris clair se voit mieux" }
      : { fam: "sombre", ex: "Kaki, Black Mullet", why: "nuit claire : silhouette sombre vue d'en dessous" };
    if (w === "teintée") return { fam: "blanc ou chartreuse", ex: "Lime Juice, Mat White, Bone", why: "eau teintée : il faut être vu" };
    if (w === "piquée") return { fam: "pailleté, kaki ou nacré", ex: "Kaki pailleté, Neo Pearl", why: "eau légèrement piquée" };
    if (c.light === "jour" && c.cloud < 70) return { fam: "naturel translucide", ex: "Ghost Lançon, Real Anchovy, Ghost Minnow", why: "eau claire et soleil : la couleur compte, rester discret" };
    return { fam: "naturel à ventre blanc", ex: "Mat White, Neo Pearl, Ghost Lançon", why: "eau claire, lumière faible ou ciel couvert" };
  };
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
    return { steps: steps.slice(0, 3), color: col, water: M.water(c) };
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
    const fmt = i => { const t = D.times[i]; return `${t.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} ${t.getHours()} h`; };
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
        text: `Houle jusqu'à ${wave.peak.toFixed(1).replace(".", ",")} m (${zones[wave.z]}) de ${fmt(wave.a)} à ${fmt(wave.b)}, pic ${fmt(wave.p)}. Digues et roches exposées dangereuses.`, i: wave.a });
      if (r > 0) out.push({ level: 0, kind: "chance", title: "Mer qui retombe : créneau à viser",
        text: `La houle redescend vers ${fmt(r)}. Après un coup de mer, eau teintée qui s'éclaircit : souvent le meilleur moment pour le loup (scénario H).`, i: r });
    }
    const W = D.F.C;
    for (const [a, b] of runs(i => inSector(W.dir[i] ?? 0, 60, 160) && (W.wind[i] ?? 0) >= 30, 3)) {
      let p = a; for (let i = a; i <= b; i++) if (W.wind[i] > W.wind[p]) p = i;
      out.push({ level: W.wind[p] >= 50 ? 3 : 2, kind: "vent", title: "Vent d'est / marin", text: `${Math.round(W.wind[p])} km/h (rafales ${Math.round(W.gust[p])}) de ${fmt(a)} à ${fmt(b)} : la mer monte et l'eau se charge.`, i: a });
      break;
    }
    for (const [a, b] of runs(i => inSector(W.dir[i] ?? 0, 290, 20) && ((W.wind[i] ?? 0) >= 45 || (W.gust[i] ?? 0) >= 75), 3)) {
      let p = a; for (let i = a; i <= b; i++) if (W.gust[i] > W.gust[p]) p = i;
      out.push({ level: 2, kind: "vent", title: M.windName(W.dir[p]).startsWith("mistral") ? "Mistral fort" : "Tramontane forte", text: `${Math.round(W.wind[p])} km/h, rafales ${Math.round(W.gust[p])} km/h, de ${fmt(a)} à ${fmt(b)}. Mer plate et eau claire au bord, mais lancer difficile et rafales dangereuses sur les digues.`, i: a });
      break;
    }
    for (let i = i0 + 6; i <= i1; i++) {
      if ((W.wind[i] ?? 0) - (W.wind[i - 6] ?? 0) >= 20 && (W.wind[i] ?? 0) >= 30) {
        if (!out.some(x => x.kind === "vent" && Math.abs(x.i - i) <= 6)) out.push({ level: 1, kind: "vent", title: "Vent qui forcit", text: `${M.windName(W.dir[i])} : de ${Math.round(W.wind[i - 6])} à ${Math.round(W.wind[i])} km/h entre ${fmt(i - 6)} et ${fmt(i)}.`, i: i - 6 });
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
