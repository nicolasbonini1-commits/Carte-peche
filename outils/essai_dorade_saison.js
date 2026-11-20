// Essai du 20 nov. 2026 (chantier 2) : GRAU_AUTUMN sans septembre ni décembre, cache v17.
// Ouvre la vraie appli (vraies réponses API) dans Chrome sans écran : version d'essai (port 8080) et main (port 8081),
// dorade demain ; compare classements ; teste le modèle chargé dans Chrome pour sept./oct./nov./déc. ; hors ligne puis retour.
// Résultats dans la branche essais-dorade-saison (jamais dans donnees).
const puppeteer = require("puppeteer");
const fs = require("fs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = { genere: new Date().toISOString(), versions: {}, erreurs: [] };
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  for (const [nom, url] of [["essai", "http://localhost:8080/"], ["main", "http://localhost:8081/"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    page.on("pageerror", e => out.erreurs.push(nom + " : " + e.message));
    await page.evaluateOnNewDocument(() => localStorage.setItem("cp_plan", JSON.stringify({ day: 1, depart: "06:00", hours: 5, species: "dorade", origin: "home" })));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 120000 });
    await sleep(15000);
    const txt = sel => page.$eval(sel, e => e.innerText).catch(() => "");
    const v = { list: await txt("#list"), reco: await txt("#reco"), banner: await txt("#banner") };
    v.caches = await page.evaluate(() => caches.keys());
    // Le modèle réellement chargé dans Chrome : facteur saison dorade d'un grau (poste 6) et d'une digue (poste 7)
    v.saison = await page.evaluate(() => {
      const M = window.MODEL, r = {};
      for (const id of [6, 7]) for (const m of [9, 10, 11, 12]) {
        const spot = { type: id === 6 ? "grau" : "digue" };
        const c = { month: m, light: "aube", cloud: 20, wind: 10, windDir: 0, gust: 15, onshore: false, hsLocal: 0.2, period: 4, rain72: 0, sst: 18, spot };
        const s = M.score(spot, "dorade", c, null);
        const f = s.factors.find(k => k.k === "Saison");
        r[id + "_" + m] = { saison: +f.v.toFixed(2), pourquoi: f.why, note: s.score };
      }
      return r;
    }).catch(e => "erreur : " + e.message);
    // Fiche du Grau-du-Roi (6) et du Ponant (8)
    v.fiches = {};
    for (const id of [6, 8]) {
      await page.evaluate(id => { document.querySelector("#goDay").value = "1"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
      await sleep(1500);
      v.fiches[id] = (await txt("#sheetBody")).slice(0, 1500);
      await page.evaluate(() => document.querySelector("#sheetClose").click());
    }
    if (nom === "essai") {
      await page.screenshot({ path: "/tmp/out/accueil.png", fullPage: true });
      // Hors ligne puis retour du réseau
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }).catch(() => {});
      await sleep(4000);
      v.horsLigne = { postes: await page.$$eval("#list .spot", e => e.length), banner: await txt("#banner") };
      await page.screenshot({ path: "/tmp/out/hors_ligne.png", fullPage: true });
      await page.setOfflineMode(false);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await sleep(20000);
      v.retour = { postes: await page.$$eval("#list .spot", e => e.length), banner: await txt("#banner") };
    }
    out.versions[nom] = v;
    await page.close();
  }
  await browser.close();
  fs.writeFileSync("/tmp/out/resultat.json", JSON.stringify(out, null, 1));
  console.log("erreurs JS :", out.erreurs.length, out.erreurs.slice(0, 5));
})().catch(e => { console.error(e); process.exit(1); });
