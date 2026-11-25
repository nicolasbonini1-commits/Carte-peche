// Essai du nouveau facteur « Carnet » (audit du 25 nov. 2026, point 4). Chrome sans écran, VRAIES API, taille téléphone.
//   G1. carnet vide : même classement que main (3 fois, ordre alterné) ;
//   G2. carnet fictif injecté (10 sorties loup : Grau-du-Roi 5 dont 1 réussie, Lez 5 dont 0 ; 2 sans note gardée) :
//       ligne « Carnet » de la fiche (nouvelle explication), facteurs branche vs main, 0 erreur ;
//   G3. hors réseau puis retour du réseau avec ce carnet.
//   Réglages du 25 nov. 22 h 21 (seuil de 5 sorties, sorties écartées) :
//   G4. 3 sorties au Grau-du-Roi (1 réussie) + 2 au Lez : sous le seuil → facteur 100 %, « pas encore compté »,
//       classement identique au carnet vide (3 paires, ordre alterné) ;
//   G5. Grau-du-Roi 6 sorties : 4 normales (1 réussie), 1 liée à un relevé « pêchable : non » (AVEC prise), 1 de 0,5 h ;
//       Lez 5 sorties (0 réussie) → Grau : 4 comptées, 2 écartées, pas encore compté ; Lez : 9 sorties comptées tous postes,
//       1 réussie, facteur 4 / (0,556 + 4) ≈ 88 %.
// Résultats dans essais-carnet (un dossier par passage), jamais dans donnees.
const puppeteer = require("puppeteer");
const fs = require("fs");
const BR = process.env.BR || "http://localhost:8080/", MAIN = process.env.MAIN || "http://localhost:8081/", OUT = process.env.OUT || "/tmp/out";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = { genere: new Date().toISOString(), cas: [] };
const ok = (cas, nom, cond, d) => { cas.controles.push({ nom, ok: !!cond, detail: d ?? null }); console.log(`${cond ? "OK  " : "RATÉ"} ${cas.nom} — ${nom}${d != null ? " : " + JSON.stringify(d).slice(0, 300) : ""}`); };
const sortie = (id, spotId, ok, snap, dur = 3, releveId = null) => ({ id, spotId, date: "2026-11-10", start: "07:00", dur, species: "loup", nLoup: ok ? 1 : 0, nDorade: 0, maxSize: null, lure: "", notes: "essai",
  bites: null, nets: null, trawlers: null, water: null, releveId, snapshot: snap ? { scoreLoup: snap, scoreDorade: 50 } : null });
const CARNET = [
  ...[0, 1, 2, 3, 4].map(k => sortie(1700000000000 + k, 6, k === 0, k === 4 ? null : 80)),
  ...[5, 6, 7, 8, 9].map(k => sortie(1700000000000 + k, 11, false, k === 9 ? null : 85))
].sort((a, b) => b.id - a.id);
const CARNET4 = [
  ...[0, 1, 2].map(k => sortie(1700000100000 + k, 6, k === 0, 80)),
  ...[3, 4].map(k => sortie(1700000100000 + k, 11, false, 80))
].sort((a, b) => b.id - a.id);
const REL5 = 1700000201000;
const RELEVES5 = [{ v: 1, id: REL5, t: new Date(REL5).toISOString(), poste: 6, nom: "Le Grau-du-Roi", vu: { eau: "marron", mer: null, pechable: "non" },
  appli: { eau: "teintée", fnu: 25, pechable: "non" }, envoye: null }];
const CARNET5 = [
  ...[0, 1, 2, 3].map(k => sortie(1700000200000 + k, 6, k === 0, 80)),
  sortie(1700000200004, 6, true, 80, 3, REL5),
  sortie(1700000200005, 6, false, 80, 0.5),
  ...[6, 7, 8, 9, 10].map(k => sortie(1700000200000 + k, 11, false, 80))
].sort((a, b) => b.id - a.id);
async function ouvrir(browser, nom, carnet, releves) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const cas = { nom, controles: [], erreurs: [] };
  page.on("pageerror", e => cas.erreurs.push(e.message.slice(0, 300)));
  if (carnet) await page.evaluateOnNewDocument((v, r) => { if (!sessionStorage.getItem("x")) { localStorage.setItem("cp_carnet", v); localStorage.setItem("cp_plan", JSON.stringify({ day: 0, depart: "06:00", hours: 4, species: "loup", origin: "home" })); if (r) localStorage.setItem("cp_releves", r); sessionStorage.setItem("x", "1"); } }, JSON.stringify(carnet), releves ? JSON.stringify(releves) : null);
  return { ctx, page, cas };
}
const liste = page => page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 180000, polling: 300 }).then(() => true).catch(() => false);
const texte = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => "");
const classement = async page => (await page.$$eval("#list .spot", els => els.map(e => e.dataset.id))).join(",");
async function fiche(page, id) {
  await page.evaluate(id => { document.querySelector("#goDay").value = "0"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
  await sleep(2500); const t = await texte(page, "#sheetBody");
  await page.evaluate(() => { const b = document.querySelector("#sheetClose"); if (b) b.click(); }); return t;
}
const ligneCarnet = t => (t.split("\n").find(l => /^Carnet/.test(l.trim())) || "").trim() + " " + ((t.split("\n").findIndex(l => /^Carnet/.test(l.trim())) >= 0) ? t.split("\n")[t.split("\n").findIndex(l => /^Carnet/.test(l.trim())) + 1] || "" : "");
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ args: ["--no-sandbox"], headless: true });
  const A = [];
  // Contrôle du site en ligne (SEUL=enligne, BR = adresse GitHub Pages) : G4 et G5 seulement.
  if (process.env.SEUL !== "enligne") {
  for (let n = 1; n <= 3; n++) for (const [v, base] of (n % 2 ? [["branche", BR], ["main", MAIN]] : [["main", MAIN], ["branche", BR]])) {
    const { ctx, page, cas } = await ouvrir(browser, `G1-${v}-${n}`);
    await page.goto(base, { waitUntil: "domcontentloaded" }); ok(cas, "liste affichée", await liste(page)); await sleep(20000);
    cas.classement = await classement(page); ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs); A.push(cas); res.cas.push(cas); await ctx.close();
  }
  const cmp = { nom: "G1-comparaison", controles: [], erreurs: [] };
  for (let k = 0; k < A.length; k += 2) ok(cmp, `${A[k].nom} / ${A[k + 1].nom} : même classement (carnet vide)`, A[k].classement === A[k + 1].classement, [A[k].classement, A[k + 1].classement]);
  res.cas.push(cmp);
  const lignes = {};
  for (const [v, base] of [["branche", BR], ["main", MAIN], ["branche", BR]]) {
    const { ctx, page, cas } = await ouvrir(browser, `G2-${v}`, CARNET);
    await page.goto(base, { waitUntil: "domcontentloaded" }); ok(cas, "liste affichée", await liste(page)); await sleep(20000);
    const f6 = await fiche(page, 6), f11 = await fiche(page, 11), f1 = await fiche(page, 1);
    cas.carnet6 = ligneCarnet(f6); cas.carnet11 = ligneCarnet(f11); cas.carnet1 = ligneCarnet(f1); cas.classement = await classement(page);
    lignes[v] = cas;
    ok(cas, "Grau-du-Roi : ligne Carnet", /Carnet/.test(cas.carnet6), cas.carnet6);
    ok(cas, "Lez : ligne Carnet", /Carnet/.test(cas.carnet11), cas.carnet11);
    ok(cas, "poste jamais pêché (1) : pas de ligne Carnet", !/Carnet/.test(cas.carnet1), cas.carnet1);
    if (v === "branche") {
      ok(cas, "explication nouvelle (« attendue(s) d'après ta moyenne »)", /attendue\(s\) d'après ta moyenne \(1 réussie\(s\) sur 10 sorties/.test(cas.carnet6), cas.carnet6);
      await page.evaluate(() => { document.querySelector("#goSpot").value = "6"; document.querySelector("#goBtn").click(); }); await sleep(2500);
      await page.screenshot({ path: `${OUT}/G2_fiche_grau.png`, fullPage: true });
      await page.evaluate(() => { const b = document.querySelector("#sheetClose"); if (b) b.click(); });
    }
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs); res.cas.push(cas);
    if (v === "branche" && !lignes.hors) {
      lignes.hors = true;
      const off = { nom: "G3-hors-reseau", controles: [], erreurs: cas.erreurs };
      await page.setOfflineMode(true); let t = Date.now();
      await page.reload({ waitUntil: "domcontentloaded" }).catch(e => off.erreurs.push("reload " + e.message));
      ok(off, "hors réseau : liste affichée", await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }).then(() => true).catch(() => false), ((Date.now() - t) / 1000).toFixed(1) + " s");
      t = Date.now(); await page.setOfflineMode(false);
      ok(off, "retour du réseau : bandeau parti", await page.waitForFunction(() => { const b = document.querySelector("#banner"); return !b || b.hidden || !/réseau/i.test(b.innerText); }, { timeout: 120000 }).then(() => true).catch(() => false), ((Date.now() - t) / 1000).toFixed(1) + " s");
      ok(off, "0 erreur JS", !off.erreurs.length, off.erreurs); res.cas.push(off);
    }
    await ctx.close();
  }
  } // fin des cas G1-G3
  // G4 : sous le seuil de 5 sorties → rien ne bouge (comparé au carnet vide, ouvert juste avant ou après)
  for (let n = 1; n <= 3; n++) {
    const paire = {};
    for (const v of (n % 2 ? ["vide", "carnet"] : ["carnet", "vide"])) {
      const { ctx, page, cas } = await ouvrir(browser, `G4-${v}-${n}`, v === "carnet" ? CARNET4 : []);
      await page.goto(BR, { waitUntil: "domcontentloaded" }); ok(cas, "liste affichée", await liste(page)); await sleep(20000);
      cas.classement = await classement(page);
      if (v === "carnet") {
        cas.carnet6 = ligneCarnet(await fiche(page, 6)); cas.carnet11 = ligneCarnet(await fiche(page, 11));
        ok(cas, "Grau-du-Roi : 100 %, pas encore compté", /100 %/.test(cas.carnet6) && /1 sortie\(s\) réussie\(s\) sur 3 comptée\(s\) ici : pas encore compté dans la note \(il en faut 5 ici\)/.test(cas.carnet6), cas.carnet6);
        ok(cas, "Lez : 100 %, pas encore compté", /100 %/.test(cas.carnet11) && /0 sortie\(s\) réussie\(s\) sur 2 comptée\(s\) ici : pas encore compté/.test(cas.carnet11), cas.carnet11);
      }
      ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs); paire[v] = cas; res.cas.push(cas); await ctx.close();
    }
    const cmp = { nom: `G4-comparaison-${n}`, controles: [], erreurs: [] };
    ok(cmp, "sous le seuil : même classement que carnet vide", paire.vide.classement === paire.carnet.classement, [paire.vide.classement, paire.carnet.classement]);
    res.cas.push(cmp);
  }
  // G5 : sorties écartées (relevé « pêchable : non » avec prise, sortie de 0,5 h)
  {
    const { ctx, page, cas } = await ouvrir(browser, "G5-branche", CARNET5, RELEVES5);
    await page.goto(BR, { waitUntil: "domcontentloaded" }); ok(cas, "liste affichée", await liste(page)); await sleep(20000);
    cas.carnet6 = ligneCarnet(await fiche(page, 6)); cas.carnet11 = ligneCarnet(await fiche(page, 11)); cas.classement = await classement(page);
    ok(cas, "Grau-du-Roi : 4 comptées, 1 réussie, pas encore compté", /100 %/.test(cas.carnet6) && /1 sortie\(s\) réussie\(s\) sur 4 comptée\(s\) ici : pas encore compté/.test(cas.carnet6), cas.carnet6);
    ok(cas, "Grau-du-Roi : 2 écartées (1 eau, 1 durée)", /2 écartée\(s\) \(1 eau non pêchable sur place, 1 de moins d'1 h\)/.test(cas.carnet6), cas.carnet6);
    ok(cas, "Lez : compté, 88 %, 1 réussie sur 9 sorties comptées", /88 %/.test(cas.carnet11) && /0,6 attendue\(s\) d'après ta moyenne \(1 réussie\(s\) sur 9 sorties comptées/.test(cas.carnet11), cas.carnet11);
    await page.evaluate(() => { document.querySelector("#goDay").value = "0"; document.querySelector("#goSpot").value = "6"; document.querySelector("#goBtn").click(); }); await sleep(2500);
    await page.screenshot({ path: `${OUT}/G5_fiche_grau.png`, fullPage: true });
    ok(cas, "0 erreur JS", !cas.erreurs.length, cas.erreurs); res.cas.push(cas); await ctx.close();
  }
  await browser.close();
  res.total = { controles: res.cas.reduce((a, c) => a + c.controles.length, 0), rates: res.cas.flatMap(c => c.controles.filter(k => !k.ok).map(k => `${c.nom} — ${k.nom}`)) };
  fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(res, null, 1));
  console.log(`Contrôles : ${res.total.controles}, ratés : ${res.total.rates.length}`); res.total.rates.forEach(r => console.log("RATÉ " + r));
  console.log("BRANCHE 6 : " + (lignes.branche || {}).carnet6); console.log("MAIN 6 : " + (lignes.main || {}).carnet6);
  console.log("BRANCHE 11 : " + (lignes.branche || {}).carnet11); console.log("MAIN 11 : " + (lignes.main || {}).carnet11);
  console.log("CLASSEMENT branche : " + (lignes.branche || {}).classement); console.log("CLASSEMENT main : " + (lignes.main || {}).classement);
})();
