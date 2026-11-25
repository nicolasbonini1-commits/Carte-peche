// Essai du correctif « débits habituels » (bogue 1 de l'audit du 25 nov. 2026).
// Ouvre la vraie appli (serveur local, VRAIES API) dans Chrome sans écran, taille téléphone (412 × 915).
// Un fleuve est rendu muet en bloquant SA SEULE requête « débit habituel » (Hub'Eau obs_elab) ; tout le reste passe.
// Cas :
//   A. démarrage normal, branche puis main puis branche… (3 fois chacun, ordre alterné) : mêmes postes, même classement ;
//   B. Lez muet au 1er démarrage → la ligne du bas le dit ; réseau rétabli + « Mettre à jour » → le Lez est rattrapé ;
//   C. Vidourle muet → « Pêchable ? » (poste 6) et la couleur de l'eau le disent (au lieu de « pas de réseau ») ;
//   D. téléphone déjà touché par le bogue (liste de 2 fleuves gardée par la v21) → réparé au démarrage suivant ;
//   E. liste de plus de 30 jours + Rhône muet → redemandée, le Rhône garde son ancienne valeur ;
//   F. hors réseau puis retour du réseau.
// Chaque requête Hub'Eau est notée avec son heure (leçon du 22 nov.). Résultats dans essais-debits, jamais dans donnees.
const puppeteer = require("puppeteer");
const fs = require("fs");
const BR = process.env.BR || "http://localhost:8080/";   // branche d'essai
const MAIN = process.env.MAIN || "http://localhost:8081/"; // main (v21), pour comparer
const OUT = process.env.OUT || "/tmp/out";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ST = { rhone: "V720001002", vidourle: "Y346400501", lez: "Y321002001" };
const res = { genere: new Date().toISOString(), cas: [] };
const ok = (cas, nom, cond, detail) => { cas.controles.push({ nom, ok: !!cond, detail: detail ?? null }); console.log(`${cond ? "OK  " : "RATÉ"} ${cas.nom} — ${nom}${detail != null ? " : " + JSON.stringify(detail).slice(0, 200) : ""}`); };

async function ouvrir(browser, nom, opts = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const cas = { nom, controles: [], erreurs: [], hubeau: [], t0: Date.now() };
  page.on("pageerror", e => cas.erreurs.push(e.message.slice(0, 300)));
  const muets = new Set(opts.muets || []);
  if (!opts.libre) await page.setRequestInterception(true);
  page.on("request", r => {
    const u = r.url();
    if (u.includes("hubeau")) cas.hubeau.push({ t: ((Date.now() - cas.t0) / 1000).toFixed(1), heure: new Date().toISOString().slice(11, 19), type: u.includes("obs_elab") ? "habituel" : "jour", station: (u.match(/code_entite=(\w+)/) || [])[1], bloque: u.includes("obs_elab") && [...muets].some(s => u.includes(s)) });
    if (opts.libre) return;
    if (u.includes("obs_elab") && [...muets].some(s => u.includes(s))) return r.abort("timedout");
    r.continue();
  });
  page.on("response", r => { const u = r.url(); if (u.includes("hubeau")) { const h = cas.hubeau.find(x => x.station === (u.match(/code_entite=(\w+)/) || [])[1] && !x.code && x.type === (u.includes("obs_elab") ? "habituel" : "jour")); if (h) h.code = r.status(); } });
  if (opts.avant) await page.evaluateOnNewDocument(opts.avant.f, opts.avant.arg);
  return { ctx, page, cas, muets };
}
const liste = page => page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 180000, polling: 300 }).then(() => true).catch(() => false);
const texte = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => "");
const qref = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("cp_qref")); } catch (e) { return null; } });
async function fiche(page, id) {
  await page.evaluate(id => { document.querySelector("#goDay").value = "0"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
  await sleep(2500);
  const t = await texte(page, "#sheetBody");
  await page.evaluate(() => { const b = document.querySelector("#sheetClose"); if (b) b.click(); });
  return t;
}
const classement = async page => (await page.$$eval("#list .spot", els => els.map(e => e.dataset.id))).join(",");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ args: ["--no-sandbox"], headless: true });

  // A. Démarrage normal, alterné branche / main, 3 fois chacun.
  for (let n = 1; n <= 3; n++) for (const [v, base] of (n % 2 ? [["branche", BR], ["main", MAIN]] : [["main", MAIN], ["branche", BR]])) {
    const { ctx, page, cas } = await ouvrir(browser, `A-${v}-${n}`);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const l = await liste(page); await sleep(25000);
    const q = await qref(page);
    cas.fresh = await texte(page, "#fresh"); cas.classement = await classement(page);
    cas.fiche6 = (await fiche(page, 6)).slice(0, 3000);
    ok(cas, "liste affichée", l);
    ok(cas, "3 débits habituels gardés", q && Object.keys(q.refs).length === 3, q && Object.keys(q.refs));
    if (v === "branche") ok(cas, "pas de « débit habituel manquant »", !/manquant/.test(cas.fresh), cas.fresh);
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs);
    res.cas.push(cas); await ctx.close();
  }

  // B. Lez muet au 1er démarrage, puis rattrapé par « Mettre à jour ».
  {
    const { ctx, page, cas, muets } = await ouvrir(browser, "B-lez-muet", { muets: [ST.lez] });
    await page.goto(BR, { waitUntil: "domcontentloaded" });
    ok(cas, "liste affichée", await liste(page)); await sleep(30000);
    let q = await qref(page); cas.fresh1 = await texte(page, "#fresh");
    await page.evaluate(() => { const d = document.querySelector("#alerts details"); if (d) d.open = true; });
    cas.fleuves1 = await texte(page, "#alerts .rivers");
    ok(cas, "liste gardée sans le Lez", q && !q.refs.lez && q.refs.rhone && q.refs.vidourle, q && Object.keys(q.refs));
    ok(cas, "ligne du bas : « débit habituel manquant : Lez »", /débit habituel manquant : Lez/.test(cas.fresh1), cas.fresh1);
    ok(cas, "Fleuves maintenant : Lez « débit habituel pas encore reçu »", /Lez[^\n]*débit habituel pas encore reçu/.test(cas.fleuves1), cas.fleuves1);
    await page.screenshot({ path: `${OUT}/B_lez_muet.png`, fullPage: true });
    const at1 = q && q.at;
    muets.clear(); // réseau du Lez rétabli
    const n0 = cas.hubeau.length;
    await page.click("#refreshBtn"); await sleep(30000);
    q = await qref(page); cas.fresh2 = await texte(page, "#fresh");
    cas.redemandes = cas.hubeau.slice(n0).filter(h => h.type === "habituel").map(h => h.station);
    ok(cas, "après « Mettre à jour » : 3 fleuves", q && Object.keys(q.refs).length === 3, q && Object.keys(q.refs));
    ok(cas, "seul le Lez est redemandé", cas.redemandes.length === 1 && cas.redemandes[0] === ST.lez, cas.redemandes);
    ok(cas, "date de la liste inchangée (complétée, pas refaite)", q && q.at === at1, [at1, q && q.at]);
    ok(cas, "plus de « manquant »", !/manquant/.test(cas.fresh2), cas.fresh2);
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs);
    res.cas.push(cas); await ctx.close();
  }

  // C. Vidourle muet : « Pêchable ? » du Grau-du-Roi (poste 6) et couleur de l'eau.
  {
    const { ctx, page, cas } = await ouvrir(browser, "C-vidourle-muet", { muets: [ST.vidourle] });
    await page.goto(BR, { waitUntil: "domcontentloaded" });
    ok(cas, "liste affichée", await liste(page)); await sleep(30000);
    cas.fiche6 = await fiche(page, 6);
    await page.evaluate(id => { document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, 6);
    await sleep(2500); await page.screenshot({ path: `${OUT}/C_poste6_vidourle_muet.png`, fullPage: true });
    ok(cas, "« Pêchable ? » : débit habituel du Vidourle pas encore reçu", /débit habituel du Vidourle pas encore reçu : nouvel essai/.test(cas.fiche6));
    ok(cas, "plus de « pas de réseau depuis plus d'un jour »", !/pas de réseau depuis plus d'un jour/.test(cas.fiche6));
    ok(cas, "couleur de l'eau : « sa crue n'est pas comptée »", /débit habituel du Vidourle pas encore reçu : sa crue n'est pas comptée/.test(cas.fiche6));
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs);
    cas.fiche6 = cas.fiche6.slice(0, 4000);
    res.cas.push(cas); await ctx.close();
  }

  // D. Téléphone déjà touché par le bogue : liste récente (2 jours) gardée par la v21 sans le Lez.
  {
    const { ctx: c0, page: p0 } = await ouvrir(browser, "D-prep");
    await p0.goto(BR, { waitUntil: "domcontentloaded" }); await liste(p0); await sleep(20000);
    const bon = await qref(p0); await c0.close();
    if (!bon || Object.keys(bon.refs).length !== 3) { console.log("D et E impossibles : pas de liste complète"); }
    else {
      const abime = { at: Date.now() - 2 * 86400000, refs: { rhone: bon.refs.rhone, vidourle: bon.refs.vidourle } };
      const { ctx, page, cas } = await ouvrir(browser, "D-telephone-v21-abime", { avant: { f: v => { if (!sessionStorage.getItem("x")) { localStorage.setItem("cp_qref", v); sessionStorage.setItem("x", "1"); } }, arg: JSON.stringify(abime) } });
      await page.goto(BR, { waitUntil: "domcontentloaded" });
      ok(cas, "liste affichée", await liste(page)); await sleep(25000);
      const q = await qref(page); cas.fresh = await texte(page, "#fresh");
      ok(cas, "Lez rattrapé au démarrage", q && Object.keys(q.refs).length === 3, q && Object.keys(q.refs));
      ok(cas, "date gardée (liste récente complétée)", q && q.at === abime.at, [abime.at, q && q.at]);
      ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs);
      res.cas.push(cas); await ctx.close();

      // E. Liste de 31 jours + Rhône muet : redemandée, le Rhône garde l'ancienne valeur, date remise à maintenant.
      const vieille = { at: Date.now() - 31 * 86400000, refs: bon.refs };
      const { ctx: ce, page: pe, cas: ke } = await ouvrir(browser, "E-liste-vieille-rhone-muet", { muets: [ST.rhone], avant: { f: v => { if (!sessionStorage.getItem("x")) { localStorage.setItem("cp_qref", v); sessionStorage.setItem("x", "1"); } }, arg: JSON.stringify(vieille) } });
      const t = Date.now();
      await pe.goto(BR, { waitUntil: "domcontentloaded" });
      ok(ke, "liste affichée", await liste(pe)); await sleep(25000);
      const q2 = await qref(pe);
      ok(ke, "3 fleuves (Rhône gardé)", q2 && Object.keys(q2.refs).length === 3 && JSON.stringify(q2.refs.rhone) === JSON.stringify(bon.refs.rhone), q2 && Object.keys(q2.refs));
      ok(ke, "date remise à maintenant", q2 && q2.at >= t, q2 && q2.at);
      ok(ke, "les 3 fleuves redemandés", ke.hubeau.filter(h => h.type === "habituel").length === 3, ke.hubeau.filter(h => h.type === "habituel").map(h => h.station));
      ok(ke, "0 erreur JS", !ke.erreurs.length, ke.erreurs);
      res.cas.push(ke); await ce.close();
    }
  }

  // F. Hors réseau puis retour du réseau (appli déjà ouverte une fois).
  {
    const { ctx, page, cas } = await ouvrir(browser, "F-hors-reseau", { libre: true });
    await page.goto(BR, { waitUntil: "domcontentloaded" }); await liste(page); await sleep(20000);
    await page.setOfflineMode(true);
    let t = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" }).catch(e => cas.erreurs.push("reload : " + e.message));
    const l = await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }).then(() => true).catch(() => false);
    cas.hors_reseau_s = ((Date.now() - t) / 1000).toFixed(1); cas.banner = await texte(page, "#banner"); cas.fresh = await texte(page, "#fresh");
    ok(cas, "hors réseau : liste affichée", l, cas.hors_reseau_s + " s");
    ok(cas, "hors réseau : pas de « manquant » (débits habituels gardés)", !/manquant/.test(cas.fresh), cas.fresh);
    await page.screenshot({ path: `${OUT}/F_hors_reseau.png` });
    t = Date.now(); await page.setOfflineMode(false);
    const r = await page.waitForFunction(() => { const b = document.querySelector("#banner"); return !b || b.hidden || !/réseau/i.test(b.innerText); }, { timeout: 120000 }).then(() => true).catch(() => false);
    cas.retour_s = ((Date.now() - t) / 1000).toFixed(1);
    ok(cas, "retour du réseau : bandeau parti", r, cas.retour_s + " s");
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs);
    res.cas.push(cas); await ctx.close();
  }
  await browser.close();

  // Bilan : classement branche = main quand les réponses sont les mêmes (même passage, ordre alterné).
  const A = res.cas.filter(c => c.nom.startsWith("A-"));
  res.classements = A.map(c => `${c.nom} : ${c.classement}`);
  // Chaque passage de la branche comparé au passage de main juste à côté (mêmes minutes, mêmes réponses en principe).
  const cmp = { nom: "A-comparaison", controles: [], erreurs: [], hubeau: [] };
  for (let k = 0; k < A.length; k += 2) ok(cmp, `${A[k].nom} / ${A[k + 1].nom} : même classement`, A[k].classement === A[k + 1].classement, [A[k].classement, A[k + 1].classement]);
  res.cas.push(cmp);
  res.total = { controles: res.cas.reduce((a, c) => a + c.controles.length, 0), rates: res.cas.flatMap(c => c.controles.filter(k => !k.ok).map(k => `${c.nom} — ${k.nom}`)) };
  fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(res, null, 1));
  const md = [`# Essai débits habituels — ${res.genere}`, "", `Contrôles : ${res.total.controles}, ratés : ${res.total.rates.length}`, ...res.total.rates.map(x => `- RATÉ ${x}`), "", "## Classements (cas A)", ...res.classements.map(x => `- ${x}`), "",
    ...res.cas.map(c => `## ${c.nom}\n` + c.controles.map(k => `- ${k.ok ? "✅" : "❌"} ${k.nom}${k.detail != null && !k.ok ? ` (${JSON.stringify(k.detail).slice(0, 300)})` : ""}`).join("\n") + `\n- Hub'Eau : ${c.hubeau.map(h => `${h.heure} ${h.type} ${h.station} ${h.bloque ? "bloqué" : h.code ?? "?"}`).join(" · ")}`)].join("\n");
  fs.writeFileSync(`${OUT}/RESULTATS.md`, md);
  console.log(md);
})();
