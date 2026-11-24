// Robot vidéos pêche — étape 2 : regarder les vidéos retenues (Gemini) et écrire les fiches (Notion). v2 « captures » du 24 nov. 2026 (essai).
// Méthode captures (décision de Nico, 24 nov. 11 h 40 → 12 h) : Gemini regarde À L'AVEUGLE (ni titre, ni chaîne, ni description) et note le
// potentiel de localisation : Fort (≥ 1 repère rare vu) / Moyen (≥ 2 repères, aucun rare) / Faible (type de côte banal).
// Fiche Notion neutre « Vidéo n° X » : Intérêt + liens de captures (watch?v=…&t=…s). Le texte (titre, chaîne, description, oral, lieux proposés
// par Gemini) est rangé dans aveugle/<n>.json (branche de sortie) et n'arrive dans la fiche qu'après l'analyse à l'aveugle de Claude.
// Moyen → captures demandées à Nico (au plus 3 demandes par 7 jours) ; Fort → pas de captures, sauf si la prévalidation dit « Doute » ; Faible → rien.
// Entrée : /tmp/sortie/a_analyser.json (écrit par robot.js) + la file d'attente Notion (vidéos que Nico a partagées dans la base).
// Sorties : fiches Notion « À vérifier » dans « Points à explorer (vidéos) », /tmp/sortie/analyses.json, /tmp/sortie/etat.json (lu par Home Assistant).
// Sans clé GEMINI_API_KEY ou NOTION_TOKEN : ne fait rien (le dit dans analyses.json) — le tri de robot.js reste valable.
// Règles : la vidéo n'est jamais téléchargée (Gemini la lit depuis son lien public) ; aucun nom de commentateur ;
// Gemini ne donne PAS de coordonnées (elles seraient inventées) : elles viennent ensuite de la prévalidation (OSM, IGN).
// Ni le robot ni Claude ne cochent jamais « Validé par Nico ».
const fs = require("fs");
const OUT = "/tmp/sortie";
const BASE = "420a0be6c3078152a5d7ce910e4ef866"; // base Notion « Points à explorer (vidéos) »
const { GEMINI_API_KEY: GK, NOTION_TOKEN: NT, GEMINI_MODEL, YOUTUBE_API_KEY: YK } = process.env;
const journal = [];
const sortie = { le: new Date().toISOString(), modele: null, analysees: [], ecartees: [], erreurs: [] };
const ecrire = () => fs.writeFileSync(`${OUT}/analyses.json`, JSON.stringify(sortie, null, 1));
const pause = ms => new Promise(r => setTimeout(r, ms));
const coupe = (s, n = 1900) => (s || "").length > n ? s.slice(0, n - 1) + "…" : (s || "");

// ---------- Notion (API publique, version 2022-06-28) ----------
async function notion(chemin, corps, methode = "POST") {
  const r = await fetch(`https://api.notion.com/v1/${chemin}`, { method: methode, signal: AbortSignal.timeout(60000),
    headers: { Authorization: `Bearer ${NT}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: corps ? JSON.stringify(corps) : undefined });
  const j = await r.json().catch(() => ({}));
  journal.push({ notion: chemin.split("/")[0], code: r.status });
  if (!r.ok) throw new Error(`Notion ${r.status} : ${j.message || ""}`);
  return j;
}
const txt = s => [{ type: "text", text: { content: coupe(s) } }];
const para = s => ({ object: "block", type: "paragraph", paragraph: { rich_text: txt(s) } });
const puce = s => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: txt(s) } });
const titre = s => ({ object: "block", type: "heading_3", heading_3: { rich_text: txt(s) } });
const idDe = s => ((s || "").match(/(?:v=|youtu\.be\/|shorts\/|live\/)([\w-]{11})/) || [])[1];

// Titre, chaîne, date et description par l'API YouTube Data (officielle, 1 unité). Réponse notée dans le journal :
// un code 400/403 = clé refusée. Le texte n'est qu'un indice, possiblement faux (voir la consigne).
async function texteYoutube(v) {
  if (!YK) { journal.push({ youtube: v.id, note: "pas de YOUTUBE_API_KEY : description inconnue" }); return v; }
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${v.id}&key=${YK}`, { signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({}));
    const sn = j.items?.[0]?.snippet;
    journal.push({ youtube: v.id, code: r.status, trouvee: !!sn, message: coupe(j.error?.message || "", 160) || undefined });
    if (sn) Object.assign(v, { titre: sn.title || v.titre, desc: sn.description || "", date: (sn.publishedAt || "").slice(0, 10), chaine: sn.channelTitle || "" });
  } catch (e) { journal.push({ youtube: v.id, erreur: e.message }); }
  return v;
}
async function fileAttente() {
  // Lignes de la base sans « Lieu le plus probable » et avec un lien YouTube (dans « Lien », le titre ou le contenu) :
  // ce sont les vidéos que Nico a ajoutées lui-même (Partager → Notion). Elles passent avant le tri de la semaine.
  const q = await notion(`databases/${BASE}/query`, { filter: { and: [
    { property: "Lieu le plus probable", rich_text: { is_empty: true } },
    { property: "Intérêt", select: { is_empty: true } },
    { property: "Statut", status: { equals: "À vérifier" } }] }, page_size: 20 });
  const liste = [];
  for (const p of q.results) {
    const pr = p.properties;
    let id = idDe(pr["Lien"]?.url) || idDe((pr["Vidéo"]?.title || []).map(t => t.plain_text).join(" "));
    if (!id) {
      const b = await notion(`blocks/${p.id}/children?page_size=50`, null, "GET");
      id = idDe(JSON.stringify(b.results));
    }
    if (id) liste.push(await texteYoutube({ id, lien: `https://www.youtube.com/watch?v=${id}`, page: p.id, demandee: true,
      titre: (pr["Vidéo"]?.title || []).map(t => t.plain_text).join(" "), chaine: "", desc: "", date: "" }));
  }
  return liste;
}
async function dejaFiche(lien, id) {
  const q = await notion(`databases/${BASE}/query`, { filter: { or: [
    { property: "Lien", url: { equals: lien } }, { property: "Lien", url: { contains: id } }] }, page_size: 5 });
  return q.results.filter(p => (p.properties["Lieu le plus probable"]?.rich_text || []).length || p.properties["Intérêt"]?.select).length > 0;
}

// ---------- Gemini ----------
async function modeles() {
  if (GEMINI_MODEL) return [GEMINI_MODEL];
  // Les noms changent souvent : on prend la liste officielle du moment. Flash d'abord (meilleure vue), Flash-Lite en secours.
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${GK}`, { signal: AbortSignal.timeout(30000) });
  const j = await r.json();
  journal.push({ gemini: "models", code: r.status });
  const noms = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => m.name.replace("models/", "")).filter(n => /flash/.test(n) && !/image|tts|audio|live|embed|thinking|exp/.test(n));
  const version = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  return noms.sort((a, b) => (/lite/.test(a) - /lite/.test(b)) || (/preview/.test(a) - /preview/.test(b)) || version(b) - version(a)).slice(0, 6);
}
const SCHEMA = { type: "OBJECT", properties: {
  filme_depuis: { type: "STRING", enum: ["bord", "bateau", "kayak ou paddle", "mélange", "incertain"] },
  mer: { type: "STRING", enum: ["Méditerranée", "autre", "incertain"] },
  resume: { type: "STRING" },
  lieux_nommes: { type: "ARRAY", items: { type: "OBJECT", properties: { timecode: { type: "STRING" }, ou: { type: "STRING" }, texte: { type: "STRING" } } } },
  sequences: { type: "ARRAY", items: { type: "OBJECT", properties: { debut: { type: "STRING" }, fin: { type: "STRING" }, description: { type: "STRING" } }, required: ["debut", "fin", "description"] } },
  reperes: { type: "ARRAY", items: { type: "OBJECT", properties: {
    timecode: { type: "STRING" }, categorie: { type: "STRING", enum: ["ouvrage dans l'eau", "fond et rive", "arrière-plan", "lumière", "texte à l'écran"] },
    description: { type: "STRING" }, rare: { type: "BOOLEAN" }, pourrait_etre_mal_lu: { type: "STRING" } } } },
  ordre_rive_en_face: { type: "STRING" },
  lieux_possibles: { type: "ARRAY", items: { type: "OBJECT", properties: {
    nom: { type: "STRING" }, commune: { type: "STRING" }, confiance: { type: "STRING", enum: ["Élevée", "Moyenne", "Faible"] },
    base: { type: "STRING", enum: ["vu à l'image", "entendu ou écrit dans la vidéo", "les deux"] },
    pour: { type: "STRING" }, contre: { type: "STRING" }, a_regarder_sur_geoportail: { type: "STRING" } },
    required: ["nom", "confiance", "base", "pour", "contre"], propertyOrdering: ["nom", "commune", "confiance", "base", "pour", "contre", "a_regarder_sur_geoportail"] } },
  potentiel: { type: "STRING", enum: ["Fort", "Moyen", "Faible"] },
  potentiel_pourquoi: { type: "STRING" },
  captures: { type: "ARRAY", items: { type: "OBJECT", properties: { timecode: { type: "STRING" }, viser: { type: "STRING" } }, required: ["timecode", "viser"] } },
  dans_la_zone: { type: "STRING", enum: ["oui", "non", "incertain"] },
  especes: { type: "STRING" }, technique_leurres: { type: "STRING" }, saison_conditions: { type: "STRING" }, acces_marche: { type: "STRING" }
}, required: ["filme_depuis", "mer", "resume", "sequences", "reperes", "potentiel", "potentiel_pourquoi", "captures", "lieux_possibles", "dans_la_zone"] };

const consigne = () => `Tu aides un pêcheur du bord (loup au leurre, dorade à la calée) à retrouver où cette vidéo YouTube a été tournée, pour aller prospecter.
Zone qui l'intéresse : côte méditerranéenne française de Valras-Plage (ouest) à Fos-sur-Mer (est).
Tu regardes la vidéo À L'AVEUGLE : on ne te donne ni son titre, ni sa chaîne, ni sa description. Juge sur ce qui se VOIT.

Règles strictes :
- Réponds en français simple. Donne le timecode (mm:ss) de chaque observation. Ne décris que ce qui se voit ou s'entend vraiment ; « incertain » est une bonne réponse.
- Ne donne AUCUNE coordonnée GPS. Ne nomme aucune personne.
- Dis d'abord d'où c'est filmé : du bord, d'un bateau, d'un kayak ou d'un paddle.
- Une vidéo peut mélanger plusieurs moments ou lieux : sépare-les en séquences (ciel, lumière, vêtements) et ne mélange pas leurs indices.
- Repères à relever pour chaque séquence : ouvrages dans l'eau (digue, épi, brise-lames, enrochement, digue effondrée, phare, balise, pieux), fond et rive (sable, galets, rochers posés ou naturels), arrière-plan (étang, ville, immeubles, phare, éoliennes, relief), lumière (indice faible : grand-angle), texte à l'écran.
- IMPORTANT : dans « sequences », « reperes », « ordre_rive_en_face », « potentiel_pourquoi » et « captures », DÉCRIS sans nommer de lieu (ex. « phare blanc à bande noire sur une jetée en blocs », pas « phare de … »). Les noms de lieux vont SEULEMENT dans « lieux_nommes » (ce qui est dit à l'oral ou écrit à l'écran) et « lieux_possibles ».
- « rare » = vrai seulement pour un repère qu'on ne trouve qu'à un ou deux endroits de la côte (phare particulier, ouvrage de forme inhabituelle, bâtiment reconnaissable) ; un épi, une plage, un étang, des salicornes ne sont PAS rares.
- Pour chaque repère, dis ce qui pourrait être mal lu (exemple : une « plage de rochers » peut être une digue effondrée).
- Si on voit une rive en face (canal, chenal, grau), décris l'ordre des repères de gauche à droite ; sinon écris « aucune ».
- Un sponsor ou un magasin affiché donne la région du pêcheur, pas le lieu de pêche. Ce qui est dit à l'oral peut être FAUX exprès (beaucoup de pêcheurs cachent leurs coins).
- Potentiel de localisation : « Fort » si au moins un repère rare est vu ; « Moyen » si au moins deux repères cohérents sont vus mais aucun n'est rare ; « Faible » si on ne voit qu'un type de côte banal. Explique en une ou deux phrases dans « potentiel_pourquoi ».
- Captures : choisis 3 à 5 moments (timecode mm:ss) où une capture d'écran nette aiderait le plus à retrouver le lieu (ouvrage, arrière-plan, rive d'en face, panneau), et pour chacun dis quoi viser dans l'image.
- Propose 1 à 3 lieux possibles d'après l'IMAGE (« base » dit sur quoi chacun repose : « vu à l'image », « entendu ou écrit dans la vidéo », « les deux »), aussi précis que possible (un poste de moins de 500 m) ; si l'image ne permet qu'une zone, dis-le dans « nom » (ex. « zone : … »). Confiance : Élevée SEULEMENT si un ouvrage unique est vu et reconnu ; Moyenne si plusieurs indices vus sont cohérents mais un autre lieu reste possible ; Faible sinon. Pour chacun : raisons pour, raisons contre, et quoi regarder sur une photo aérienne.`;

// « mm:ss » ou « h:mm:ss » → secondes (null si illisible).
const secondes = tc => { const m = String(tc || "").trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : null; };
// Contrôle de la réponse : Gemini peut se tromper de case, se répéter ou surestimer sa confiance.
function controler(r) {
  r.alertes = [];
  const rare = (r.reperes || []).some(x => x.rare && /ouvrage/.test(x.categorie || ""));
  for (const l of r.lieux_possibles || []) {
    for (const k of ["pour", "contre", "a_regarder_sur_geoportail"]) if ((l[k] || "").length > 700) { l[k] = coupe(l[k], 700); r.alertes.push("réponse de Gemini trop longue ou répétée (coupée)"); }
    if (!["Élevée", "Moyenne", "Faible"].includes(l.confiance)) { l.confiance = "Faible"; r.alertes.push("confiance absente dans la réponse : mise à Faible"); }
    if (l.confiance === "Élevée" && !rare) { l.confiance = "Moyenne"; r.alertes.push("Élevée sans ouvrage rare vu : ramenée à Moyenne (règle du skill)"); }
    // Lieu qui ne repose que sur ce que dit le vidéaste (titre, description, oral) : peut être faux exprès → Faible (demande de Nico, 24 nov. 2026).
    if (/^entendu|déclaré seulement/.test(l.base || "") && l.confiance !== "Faible") { l.confiance = "Faible"; r.alertes.push("lieu tiré seulement de l'oral ou d'un texte à l'écran (peut être faux) : confiance ramenée à Faible"); }
    if (!l.base) r.alertes.push("Gemini n'a pas dit sur quoi repose le lieu");
    // Aucun repère rare vu à l'image = seulement un type de côte (règle de la consigne) → Faible ; deux lieux dans le nom (« A / B », « A ou B ») = une zone → Faible.
    // Cas du 24 nov. : Palavas noté Moyenne sur « étang + salicornes + route éclairée » (commun à Ingril, Vic, Prévost…), le lieu précis venant du titre.
    const unRare = (r.reperes || []).some(x => x.rare);
    if (!unRare && l.confiance !== "Faible") { l.confiance = "Faible"; r.alertes.push("aucun repère rare vu à l'image (seulement un type de côte) : confiance ramenée à Faible"); }
    if (/\s\/\s|\sou\s/i.test(l.nom || "") && l.confiance !== "Faible") { l.confiance = "Faible"; r.alertes.push("deux lieux dans le nom = une zone : confiance ramenée à Faible"); }
    // Lieu = une zone (pas un poste de moins de 500 m) : confiance Faible d'office (décision de Nico, 24 nov. 2026 ; fiche BARLOUP du 23 nov. notée Moyenne pour « Zone : embouchure du Grand Rhône »).
    if (/^\s*(\[[^\]]*\]\s*)*zone\b/i.test(l.nom || "") && l.confiance !== "Faible") { l.confiance = "Faible"; r.alertes.push("lieu = une zone, pas un poste : confiance ramenée à Faible"); }
  }
  // Potentiel de localisation, contrôlé par le code (Gemini surestime) : Fort exige un repère rare avec timecode ;
  // Moyen exige deux repères avec timecode hors « lumière » (indice faible) ; sinon Faible.
  // « texte à l'écran » (incrustation du vidéaste ou panneau) : ce qui est écrit peut être faux exprès, comme le titre →
  // ne compte ni pour Fort ni pour Moyen, et reste caché à Claude jusqu'à son analyse (bloc « cache », 24 nov. 2026).
  const avecTc = (r.reperes || []).filter(x => secondes(x.timecode) !== null && !/texte/.test(x.categorie || ""));
  const nbRares = avecTc.filter(x => x.rare).length, nbSolides = avecTc.filter(x => !/lumi/.test(x.categorie || "")).length;
  const pot0 = ["Fort", "Moyen", "Faible"].includes(r.potentiel) ? r.potentiel : "Faible";
  r.potentiel = pot0 === "Fort" && nbRares ? "Fort" : pot0 !== "Faible" && nbSolides >= 2 ? "Moyen" : "Faible";
  r.alertes_vue = []; // seules alertes montrées dans la fiche (celles sur les lieux de Gemini restent cachées avec eux)
  if (r.potentiel !== pot0) r.alertes_vue.push(`potentiel ${pot0} ramené à ${r.potentiel} (${nbRares} repère(s) rare(s), ${nbSolides} repère(s) solide(s) avec timecode)`);
  // Captures : timecodes lisibles seulement, sans doublon, 5 au plus.
  const vus = new Set();
  r.captures = (r.captures || []).filter(c => { const t = secondes(c.timecode); if (t === null || vus.has(t)) return false; vus.add(t); c.t = t; return true; }).slice(0, 5);
  if (r.potentiel !== "Faible" && r.captures.length < 3) r.alertes_vue.push(`seulement ${r.captures.length} capture(s) proposée(s) avec un timecode lisible (3 attendues)`);
  r.alertes = [...new Set(r.alertes)];
  return r;
}

// Vidéo longue = requête lourde : le gratuit la refuse (503 « surchargé », puis 429 « quota » qui bloque aussi les vidéos suivantes).
// BARLOUP 7QcD9Jp7y4s (23 nov.) : 185 684 jetons à 1 image/s (≈ 30 min), 24 essais ratés ; les vidéos de 3 min (≈ 8 000 à 25 000 jetons) passent.
// Donc : on mesure d'abord (countTokens, gratuit), et au-delà de LOURD on envoie 1 image toutes les 5 s (le son, 25 jetons/s, reste entier).
const LOURD = 80000, FPS_LEGER = 0.2;
const exclus = new Set(); // modèles qui ont répondu 404 (retirés par Google) : plus essayés de tout le passage
async function compter(v) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${liste0}:countTokens?key=${GK}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ file_data: { file_uri: v.lien } }, { text: "x" }] }] }), signal: AbortSignal.timeout(120000) });
    const j = await r.json().catch(() => ({}));
    journal.push({ mesure: "countTokens", video: v.id, code: r.status, jetons: j.totalTokens, message: coupe(j.error?.message || "", 160) || undefined });
    return j.totalTokens || 0;
  } catch (e) { journal.push({ mesure: "countTokens", video: v.id, erreur: e.message }); return 0; }
}
let liste0 = "";
async function gemini(v, liste) {
  liste0 = liste0 || liste[0];
  const taille = v.jetons ?? await compter(v);
  const fpsDepart = taille > LOURD ? FPS_LEGER : 0;
  const corps = fps => ({ contents: [{ parts: [{ file_data: { file_uri: v.lien }, ...(fps ? { video_metadata: { fps } } : {}) }, { text: consigne() }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json", responseSchema: SCHEMA } });
  let derniere = "";
  const essayer = async (m, fps, essai) => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GK}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps(fps)), signal: AbortSignal.timeout(300000) });
    const j = await r.json().catch(() => ({}));
    journal.push({ gemini: m, video: v.id, essai, fps: fps || 1, code: r.status, jetons: j.usageMetadata?.totalTokenCount, message: coupe(j.error?.message || "", 160) || undefined });
    if (r.ok) {
      const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
      return { ok: true, res: { modele: m + (fps ? ` (1 image / ${Math.round(1 / fps)} s)` : ""), jetons: j.usageMetadata?.totalTokenCount, r: controler(JSON.parse(t)) } };
    }
    derniere = `${m} ${r.status} ${coupe(j.error?.message || "", 200)}`;
    if (r.status === 404) exclus.add(m);
    return { ok: false, code: r.status };
  };
  // 3 modèles au plus par vidéo : au-delà on brûle le quota du jour pour rien (la vidéo est retentée au passage suivant).
  for (const m of liste.filter(m => !exclus.has(m)).slice(0, 3)) {
    for (let essai = 1; essai <= 2; essai++) {
      try {
        const x = await essayer(m, fpsDepart, essai);
        if (x.ok) return x.res;
        if (x.code === 429) { await pause(65000); continue; } // quota par minute du gratuit : on attend qu'il se recharge
        if (x.code >= 500) { await pause(20000); continue; }   // 503 « surchargé » : on attend puis on réessaie une fois
        break; // 400/403/404 : modèle suivant
      } catch (e) { derniere = `${m} ${e.message}`; }
    }
  }
  throw new Error(`Gemini : ${derniere} (vidéo de ${taille || "?"} jetons à 1 image/s${fpsDepart ? `, envoyée à 1 image / ${Math.round(1 / fpsDepart)} s` : ""})`);
}

// ---------- Fiche Notion (à l'aveugle) ----------
// Numéro neutre : le plus grand « Vidéo n° X » de la base + 1 (même suite pour les essais et main).
async function prochainNumero() {
  const q = await notion(`databases/${BASE}/query`, { filter: { property: "Vidéo", title: { starts_with: "Vidéo n°" } }, page_size: 100 });
  return 1 + Math.max(0, ...q.results.map(p => +(((p.properties["Vidéo"]?.title || []).map(t => t.plain_text).join("")).match(/n°\s*(\d+)/) || [])[1] || 0));
}
// Demandes de captures des 7 derniers jours (Fort + Doute compris, posées par la tâche du soir) : au plus MAX_CAPTURES.
const MAX_CAPTURES = 3;
async function demandesRecentes() {
  const depuis = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  return (await notion(`databases/${BASE}/query`, { filter: { property: "Captures demandées", date: { on_or_after: depuis } }, page_size: 100 })).results.length;
}
const lienT = (v, t) => `https://www.youtube.com/watch?v=${v.id}&t=${t}s`;
// Ce qui est caché à Claude jusqu'à son analyse à l'aveugle : rangé dans GitHub (dossier aveugle/ de la branche de sortie).
function fichierAveugle(n, v, a) {
  const r = a.r;
  return { numero: n, id: v.id, lien: v.lien, analyse_le: new Date().toISOString(), modele: a.modele, jetons: a.jetons,
    lire_dans_cet_ordre: "1) vue (ce que Gemini voit, sans nom de lieu) ; 2) Claude fait sa propre analyse (captures ou vue) ; 3) seulement ensuite : cache.",
    vue: { filme_depuis: r.filme_depuis, potentiel: r.potentiel, potentiel_pourquoi: r.potentiel_pourquoi, sequences: r.sequences, reperes: (r.reperes || []).filter(x => !/texte/.test(x.categorie || "")),
      ordre_rive_en_face: r.ordre_rive_en_face, captures: r.captures, especes: r.especes, technique_leurres: r.technique_leurres, saison_conditions: r.saison_conditions },
    cache: { titre: v.titre, chaine: v.chaine, description: v.desc, date: v.date, resume_gemini: r.resume, lieux_nommes: r.lieux_nommes, textes_a_l_ecran: (r.reperes || []).filter(x => /texte/.test(x.categorie || "")),
      lieux_possibles_gemini: r.lieux_possibles, dans_la_zone: r.dans_la_zone, acces_marche: r.acces_marche },
    alertes_vue: r.alertes_vue, alertes_lieux: r.alertes };
}
function fiche(n, v, a, demander) {
  const r = a.r, pot = r.potentiel;
  const quoi = pot === "Faible" ? "Sans intérêt pour la localisation (type de côte banal) : rien à faire."
    : pot === "Moyen" ? (demander ? "Captures demandées à Nico (liens ci-dessous)." : `Captures à demander : déjà ${MAX_CAPTURES} demandes ces 7 derniers jours, ce sera au prochain passage.`)
    : "Repère rare vu : pas de captures pour l'instant ; Claude cherche à l'aveugle sur la description de Gemini, captures seulement si la prévalidation dit « Doute ».";
  const proprietes = {
    "Vidéo": { title: txt(`Vidéo n° ${n}`) },
    "Lien": { url: v.lien },
    "Intérêt": { select: { name: pot } },
    "À vérifier": { rich_text: txt(`${quoi}${r.alertes_vue.length ? " ⚠️ " + r.alertes_vue.join(" ; ") + "." : ""} Analyse à l'aveugle : titre, chaîne, description et lieux de Gemini rangés dans GitHub (aveugle/${n}.json), ajoutés ici seulement après l'analyse de Claude.`) }
  };
  if (demander) proprietes["Captures demandées"] = { date: { start: new Date().toISOString().slice(0, 10) } };
  if (v.date) proprietes["Date vidéo"] = { date: { start: v.date } };
  const blocs = [
    para(`Fiche écrite par le robot le ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — Gemini (${a.modele}) a regardé la vidéo à l'aveugle (sans titre ni description), depuis son lien public, sans téléchargement. Tout est [V].`),
    titre(`Potentiel de localisation : ${pot}`), para(r.potentiel_pourquoi || "—"),
    ...r.alertes_vue.map(x => puce("⚠️ Contrôle du robot : " + x))
  ];
  if (pot !== "Faible" && (r.captures || []).length) {
    blocs.push(titre(pot === "Fort" ? "Captures (seulement si la prévalidation dit « Doute »)" : "Captures à faire"),
      para("Ouvre chaque lien (la vidéo démarre au bon moment), mets en pause quand l'image est nette, fais une capture d'écran, puis ajoute les images sous ce titre et coche « Captures faites »."),
      ...r.captures.map(c => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [
        { type: "text", text: { content: c.timecode, link: { url: lienT(v, c.t) } } }, { type: "text", text: { content: " — viser : " + coupe(c.viser, 400) } }] } })),
      titre("Images de Nico"), para("(ajoute les captures ici)"));
  }
  return { proprietes, blocs };
}
// Moyen en attente (limite de la semaine atteinte au passage précédent) : demandées dès qu'il y a de la place, les plus anciennes d'abord.
async function rattraperDemandes() {
  let place = MAX_CAPTURES - await demandesRecentes();
  if (place <= 0) return 0;
  const q = await notion(`databases/${BASE}/query`, { filter: { and: [{ property: "Intérêt", select: { equals: "Moyen" } },
    { property: "Captures demandées", date: { is_empty: true } }, { property: "Captures faites", checkbox: { equals: false } },
    { property: "Statut", status: { equals: "À vérifier" } }] }, sorts: [{ timestamp: "created_time", direction: "ascending" }], page_size: place });
  for (const p of q.results) await notion(`pages/${p.id}`, { properties: { "Captures demandées": { date: { start: new Date().toISOString().slice(0, 10) } },
    "À vérifier": { rich_text: txt("Captures demandées à Nico (liens dans la fiche). Analyse à l'aveugle : texte rangé dans GitHub, ajouté après l'analyse de Claude.") } } }, "PATCH");
  return q.results.length;
}

(async () => {
  if (!GK || !NT) { sortie.erreurs.push(`clé absente : ${!GK ? "GEMINI_API_KEY " : ""}${!NT ? "NOTION_TOKEN" : ""} — analyse sautée`); ecrire(); return console.log(sortie.erreurs[0]); }
  const tri = fs.existsSync(`${OUT}/a_analyser.json`) ? JSON.parse(fs.readFileSync(`${OUT}/a_analyser.json`, "utf8")) : { videos: [] };
  let attente = [];
  try { attente = await fileAttente(); } catch (e) { sortie.erreurs.push("file d'attente : " + e.message); }
  for (const x of attente) { const t = tri.videos.find(v => v.id === x.id); if (t && !x.desc && t.desc) Object.assign(x, { desc: t.desc, date: x.date || t.date, chaine: x.chaine || t.chaine }); }
  const aFaire = [...attente, ...tri.videos.filter(v => !attente.some(x => x.id === v.id))];
  console.log("file d'attente", attente.length, "| tri", tri.videos.length);
  let liste = [];
  try { liste = await modeles(); sortie.modele = liste; } catch (e) { sortie.erreurs.push("liste des modèles : " + e.message); }
  // Mesure (gratuite) puis vidéos courtes d'abord : une vidéo longue ne doit pas épuiser le quota des autres.
  if (liste.length) { liste0 = liste[0]; for (const v of aFaire) if (!v.page || v.demandee) v.jetons = await compter(v); }
  aFaire.sort((x, y) => (x.demandee ? -1 : 0) - (y.demandee ? -1 : 0) || (x.jetons || 0) - (y.jetons || 0));
  const rater = []; // vidéos en échec : retirées de vues.json pour être retentées au passage suivant
  for (const v of aFaire) {
    try {
      // Vidéo demandée par Nico (Run workflow) : analysée même si une fiche existe déjà (ex. ré-analyse à l'aveugle d'une ancienne fiche).
      if (!v.page && !v.demandee && await dejaFiche(v.lien, v.id)) { sortie.ecartees.push({ id: v.id, raison: "fiche déjà dans Notion" }); continue; }
      if (!v.titre || !v.chaine) { // titre et chaîne par l'oEmbed officiel si absents (vidéo partagée par Nico)
        const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.lien)}`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
        v.titre = v.titre || o.title || ""; v.chaine = v.chaine || o.author_name || "";
      }
      // Miniature officielle (image publique, pas la vidéo) : seule image que la prévalidation Claude peut regarder elle-même.
      try {
        const im = await fetch(`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, { signal: AbortSignal.timeout(20000) });
        if (im.ok) { fs.mkdirSync(`${OUT}/miniatures`, { recursive: true }); fs.writeFileSync(`${OUT}/miniatures/${v.id}.jpg`, Buffer.from(await im.arrayBuffer())); }
      } catch (e) { journal.push({ miniature: v.id, erreur: e.message }); }
      const a = await gemini(v, liste);
      const hors = a.r.filme_depuis === "bateau" || a.r.filme_depuis === "kayak ou paddle" || a.r.mer === "autre" || a.r.dans_la_zone === "non";
      if (hors && !v.demandee) { // passage de la semaine : pas de fiche pour un bateau ou un lieu hors zone (la vidéo demandée par Nico garde la sienne)
        sortie.ecartees.push({ id: v.id, titre: v.titre, raison: `Gemini : filmé depuis ${a.r.filme_depuis}, mer ${a.r.mer}, zone ${a.r.dans_la_zone}` });
        continue;
      }
      const n = await prochainNumero();
      const demander = a.r.potentiel === "Moyen" && await demandesRecentes() < MAX_CAPTURES;
      fs.mkdirSync(`${OUT}/aveugle`, { recursive: true });
      fs.writeFileSync(`${OUT}/aveugle/${n}.json`, JSON.stringify(fichierAveugle(n, v, a), null, 1));
      const f = fiche(n, v, a, demander);
      let page = v.page;
      if (page) { // page partagée par Nico : titre remplacé par « Vidéo n° X » (le titre d'origine est dans aveugle/X.json)
        await notion(`pages/${page}`, { properties: f.proprietes }, "PATCH");
        await notion(`blocks/${page}/children`, { children: f.blocs }, "PATCH");
      } else page = (await notion("pages", { parent: { database_id: BASE }, properties: f.proprietes, children: f.blocs })).id;
      sortie.analysees.push({ numero: n, id: v.id, page: `https://www.notion.so/${page.replace(/-/g, "")}`, modele: a.modele, jetons: a.jetons,
        interet: a.r.potentiel, captures_demandees: demander, filme_depuis: a.r.filme_depuis, demandee: !!v.demandee });
    } catch (e) { sortie.erreurs.push(`${v.id} : ${e.message}`); rater.push(v.id); }
    ecrire();
  }
  try { const k = await rattraperDemandes(); if (k) sortie.demandes_rattrapees = k; } catch (e) { sortie.erreurs.push("rattrapage des demandes : " + e.message); }
  // État pour Home Assistant : fiches que Nico doit regarder (prévalidées, pas encore validées) et fiches à prévalider.
  try {
    const cpt = async f => (await notion(`databases/${BASE}/query`, { filter: { and: f }, page_size: 100 })).results.length;
    const aVerifier = { property: "Statut", status: { equals: "À vérifier" } }, pasValide = { property: "Validé par Nico", checkbox: { equals: false } };
    const etat = { le: new Date().toISOString(),
      a_valider: await cpt([aVerifier, pasValide, { property: "Prévalidation Claude", select: { equals: "Prévalidé" } }]),
      // À prévalider : anciennes fiches (sans Intérêt), Fort, ou Moyen dont les captures sont faites. Faible : jamais.
      // Trois filtres simples additionnés : Notion refuse un « et » dans un « ou » dans un « et » (erreur 400 du 24 nov., 12 h 29).
      a_prevalider: await (async () => { const base = [aVerifier, pasValide, { property: "Prévalidation Claude", select: { is_empty: true } }];
        return await cpt([...base, { property: "Intérêt", select: { is_empty: true } }]) + await cpt([...base, { property: "Intérêt", select: { equals: "Fort" } }])
          + await cpt([...base, { property: "Intérêt", select: { equals: "Moyen" } }, { property: "Captures faites", checkbox: { equals: true } }]); })(),
      a_capturer: await cpt([aVerifier, { property: "Captures demandées", date: { is_not_empty: true } }, { property: "Captures faites", checkbox: { equals: false } }]),
      nouvelles_fiches: sortie.analysees.length, erreurs: sortie.erreurs.length };
    fs.writeFileSync(`${OUT}/etat.json`, JSON.stringify(etat, null, 1));
  } catch (e) { sortie.erreurs.push("état : " + e.message); }
  if (rater.length && fs.existsSync(`${OUT}/vues.json`)) {
    const vues = JSON.parse(fs.readFileSync(`${OUT}/vues.json`, "utf8"));
    for (const id of rater) delete vues[id];
    fs.writeFileSync(`${OUT}/vues.json`, JSON.stringify(vues, null, 1));
  }
  ecrire();
  fs.writeFileSync(`${OUT}/journal_analyse.json`, JSON.stringify(journal, null, 1));
  console.log("analysées", sortie.analysees.length, "| écartées", sortie.ecartees.length, "| erreurs", sortie.erreurs.length);
  if (sortie.erreurs.length) console.log(sortie.erreurs.join("\n"));
})();
