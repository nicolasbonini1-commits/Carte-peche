// Essai espèces (25 nov. 2026) : ouvre l'appli de la branche essai-especes dans Chrome sans écran (vraies API),
// pour chaque espèce (loup, dorade, loup ou dorade, sar, tassergal, liche, toutes) : classement, carte « Meilleur choix »,
// fiche du 1er poste, erreurs JS ; puis hors réseau et retour du réseau. Résultats dans la branche essais-especes.
const puppeteer = require("puppeteer");
const fs = require("fs");
const OUT = "/tmp/out";
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const out = { genere: new Date().toISOString(), runs: [], erreurs: [] };
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  for (const sp of ["loup", "dorade", "les deux", "sar", "tassergal", "liche", "toutes"]) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true });
    page.on("pageerror", e => out.erreurs.push(`${sp} : ${e.message}`));
    await page.evaluateOnNewDocument(s => localStorage.setItem("cp_plan", JSON.stringify({ day: 0, depart: "06:00", hours: 4, species: s, origin: "home" })), sp);
    const t0 = Date.now();
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
    let ok = true;
    try { await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 150000 }); } catch (e) { ok = false; }
    const run = { espece: sp, liste_ms: ok ? Date.now() - t0 : null };
    await sleep(12000);
    const txt = sel => page.$eval(sel, e => e.innerText).catch(() => "");
    run.cache = await page.evaluate(() => caches.keys()).catch(() => []);
    run.reco = (await txt("#reco")).slice(0, 2500);
    run.liste = (await txt("#list")).slice(0, 2500);
    // Fiche du 1er poste, jour de demain (créneaux et leurres)
    const id = await page.$eval("#list .spot", e => e.dataset.id).catch(() => null);
    if (id) {
      await page.evaluate(id => { document.querySelector("#goDay").value = "1"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
      await sleep(2000);
      run.fiche = (await txt("#sheetBody")).slice(0, 5000);
      if (["sar", "tassergal", "toutes"].includes(sp)) await page.screenshot({ path: `${OUT}/fiche_${sp}.png`, fullPage: true });
      await page.evaluate(() => document.querySelector("#sheetClose").click());
    }
    if (sp === "sar") {
      await page.screenshot({ path: `${OUT}/accueil_sar.png`, fullPage: true });
      // Carnet : une sortie « sar » avec 2 prises, puis vérifier qu'elle apparaît et que la note du poste a un facteur « Carnet »
      await page.evaluate(() => {
        const f = document.querySelector("#carnetForm"); if (!f) return;
        document.querySelector("#fSpecies").value = "sar"; document.querySelector("#fAutre").value = "2"; document.querySelector("#fSpot").value = "2";
        f.requestSubmit();
      });
      await sleep(1500);
      run.carnet = (await txt("#carnetList")).slice(0, 600);
      // Hors réseau puis retour
      await page.setOfflineMode(true);
      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
      try { await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }); run.hors_reseau_ms = Date.now() - t1; } catch (e) { run.hors_reseau_ms = null; }
      run.banner_hors_reseau = await txt("#banner");
      await page.setOfflineMode(false);
      const t2 = Date.now();
      try { await page.waitForFunction(() => { const b = document.querySelector("#banner"); return !b || b.hidden || !/réseau/i.test(b.innerText); }, { timeout: 120000 }); run.retour_ms = Date.now() - t2; } catch (e) { run.retour_ms = null; }
    }
    out.runs.push(run);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/especes.json`, JSON.stringify(out, null, 1));
  console.log("erreurs JS :", out.erreurs.length, out.erreurs.slice(0, 5));
  out.runs.forEach(r => console.log(r.espece, r.liste_ms, (r.reco || "").split("\n").slice(0, 6).join(" | ")));
})().catch(e => { console.error(e); process.exit(1); });
