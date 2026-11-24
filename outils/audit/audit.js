// Audit du 24-25 nov. 2026 (demande de Nico : utilisation, sécurité, optimisation, limites).
// Ouvre la vraie appli (serveur local, vraies API) dans Chrome sans écran, comme un téléphone (412 × 915).
// Pour chaque passage : temps jusqu'à la liste des postes, toutes les requêtes (service, code, durée, octets), erreurs JS,
// longues tâches (> 50 ms), taille du stockage du téléphone ; puis hors réseau et retour du réseau ; puis le même
// démarrage avec un processeur ralenti 4 fois (téléphone moyen).
// Leçon du 22 nov. : chaque cas au moins 3 fois, chaque requête notée avec son heure.
// Lancé par .github/workflows/audit.yml ; résultats dans la branche essais-audit (jamais dans donnees).
const puppeteer = require("puppeteer");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:8080/";
const OUT = process.env.OUT || "/tmp/out";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const host = u => { try { return new URL(u).hostname; } catch (e) { return "?"; } };

async function ouvrir(browser, nom, opts = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const run = { nom, erreurs: [], console: [], requetes: [], t0: Date.now() };
  page.on("pageerror", e => run.erreurs.push(e.message.slice(0, 300)));
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning") run.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  const req = {};
  cdp.on("Network.requestWillBeSent", e => { req[e.requestId] = { url: e.request.url, t: Date.now() - run.t0 }; });
  cdp.on("Network.responseReceived", e => { const r = req[e.requestId]; if (r) { r.code = e.response.status; r.sw = !!e.response.fromServiceWorker; r.cache = !!e.response.fromDiskCache; } });
  cdp.on("Network.loadingFinished", e => { const r = req[e.requestId]; if (r) { r.fin = Date.now() - run.t0; r.octets = e.encodedDataLength; } });
  cdp.on("Network.loadingFailed", e => { const r = req[e.requestId]; if (r) { r.fin = Date.now() - run.t0; r.echec = e.errorText; } });
  if (opts.cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.cpu });
  await page.evaluateOnNewDocument(sp => {
    if (sp) localStorage.setItem("cp_plan", JSON.stringify({ day: 0, depart: "06:00", hours: 4, species: sp, origin: "home" }));
    window.__longues = [];
    try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__longues.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true }); } catch (e) { }
  }, opts.species || null);
  return { ctx, page, cdp, run, req };
}

async function attendreListe(page, run, cle, limite = 180000) {
  const t = Date.now();
  try { await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: limite, polling: 200 }); run[cle] = Date.now() - t; }
  catch (e) { run[cle] = null; run.erreurs.push(`${cle} : liste pas affichée en ${limite / 1000} s`); }
}
const texte = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => "");

async function bilan(page, run, req) {
  run.requetes = Object.values(req).map(r => ({ host: host(r.url), chemin: r.url.slice(0, 140), debut: r.t, duree: r.fin != null ? r.fin - r.t : null, code: r.code ?? null, octets: r.octets ?? null, echec: r.echec || null, sw: r.sw || false }));
  run.longues = await page.evaluate(() => window.__longues || []);
  run.stockage = await page.evaluate(() => { const o = {}; for (let k = 0; k < localStorage.length; k++) { const n = localStorage.key(k); o[n] = (localStorage.getItem(n) || "").length; } return o; });
  run.metrics = await page.metrics();
  run.fresh = await texte(page, "#fresh");
  run.banner = await texte(page, "#banner");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ args: ["--no-sandbox"], headless: true });
  const out = { genere: new Date().toISOString(), base: BASE, passages: [] };

  // 1. Trois démarrages à froid (téléphone neuf), « les deux » espèces : temps, requêtes, erreurs.
  for (let n = 1; n <= 3; n++) {
    const { ctx, page, run, req } = await ouvrir(browser, `froid-${n}`);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await attendreListe(page, run, "liste_ms");
    await sleep(20000); // débits, bouées, routes, vent au poste
    await bilan(page, run, req);
    if (n === 1) {
      run.reco = (await texte(page, "#reco")).slice(0, 3000);
      run.liste = (await texte(page, "#list")).slice(0, 4000);
      run.alertes = (await texte(page, "#alerts")).slice(0, 2000);
      await page.screenshot({ path: `${OUT}/accueil.png`, fullPage: true });
      // Fiche du premier poste : lisibilité (nombre de mots affichés)
      const id = await page.$eval("#list .spot", e => e.dataset.id).catch(() => null);
      if (id) {
        await page.evaluate(id => { document.querySelector("#goDay").value = "0"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
        await sleep(2000);
        const f = await texte(page, "#sheetBody");
        run.fiche_mots = f.split(/\s+/).length; run.fiche = f.slice(0, 5000);
        await page.screenshot({ path: `${OUT}/fiche.png`, fullPage: true });
        await page.evaluate(() => document.querySelector("#sheetClose").click());
      }
      // 2. Hors réseau puis retour du réseau (même téléphone, appli déjà ouverte une fois)
      const off = { nom: "hors-reseau" };
      await page.setOfflineMode(true);
      let t = Date.now();
      await page.reload({ waitUntil: "domcontentloaded" }).catch(e => off.erreur = e.message);
      try { await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }); off.liste_ms = Date.now() - t; } catch (e) { off.liste_ms = null; }
      off.banner = await texte(page, "#banner");
      await page.screenshot({ path: `${OUT}/hors_reseau.png` });
      t = Date.now();
      await page.setOfflineMode(false);
      try { await page.waitForFunction(() => { const b = document.querySelector("#banner"); return !b || b.hidden || !/réseau/i.test(b.innerText); }, { timeout: 120000 }); off.retour_ms = Date.now() - t; } catch (e) { off.retour_ms = null; }
      off.banner_apres = await texte(page, "#banner");
      out.passages.push(off);
    }
    out.passages.push(run);
    await ctx.close();
  }

  // 3. Une espèce à la fois (classement), et processeur ralenti 4× (téléphone moyen).
  for (const [nom, opts] of [["loup", { species: "loup" }], ["dorade", { species: "dorade" }], ["cpu-x4", { cpu: 4 }]]) {
    const { ctx, page, run, req } = await ouvrir(browser, nom, opts);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await attendreListe(page, run, "liste_ms");
    await sleep(15000);
    await bilan(page, run, req);
    run.liste = (await texte(page, "#list")).slice(0, 3000);
    if (nom === "cpu-x4") {
      // Temps de calcul d'un nouveau plan (changement de durée) avec le processeur ralenti
      const t = await page.evaluate(async () => {
        const s = document.querySelector("#pHours"); if (!s) return null;
        const t0 = performance.now(); s.value = s.value === "4" ? "5" : "4"; s.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return Math.round(performance.now() - t0);
      });
      run.recalcul_ms = t;
    }
    out.passages.push(run);
    await ctx.close();
  }
  await browser.close();
  // Résumé lisible
  const R = out.passages.filter(p => p.requetes);
  out.resume = R.map(p => ({
    nom: p.nom, liste_ms: p.liste_ms, erreurs_js: p.erreurs.length, requetes: p.requetes.length,
    echecs: p.requetes.filter(r => r.echec || (r.code && r.code >= 400)).map(r => `${r.host} ${r.code || r.echec}`),
    lentes: p.requetes.filter(r => r.duree > 8000).map(r => `${r.host} ${Math.round(r.duree / 1000)} s`),
    ko: Math.round(p.requetes.reduce((a, r) => a + (r.octets || 0), 0) / 1024),
    longues_ms: p.longues.reduce((a, b) => a + b, 0), longues_max: Math.max(0, ...p.longues),
    stockage_ko: Math.round(Object.values(p.stockage).reduce((a, b) => a + b, 0) / 1024)
  }));
  out.resume.push(...out.passages.filter(p => p.nom === "hors-reseau"));
  fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.resume, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
