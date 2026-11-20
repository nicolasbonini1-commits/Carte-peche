// Essai du 20 nov. 2026 : ouvre la vraie appli (serveur local, vraies réponses météo / débits / bouées) dans Chrome sans écran,
// règle le plan de sortie (demain, départ 6 h, 5 h aller-retour compris) et relève le classement et les fiches des meilleurs postes.
// Lancé par .github/workflows/essai-sortie.yml ; résultats dans la branche essais-sortie (jamais dans donnees).
const puppeteer = require("puppeteer");
const fs = require("fs");
(async () => {
  const out = { genere: new Date().toISOString(), runs: [] , erreurs: [] };
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  for (const species of ["les deux", "loup", "dorade"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    page.on("pageerror", e => out.erreurs.push(species + " : " + e.message));
    await page.evaluateOnNewDocument(sp => {
      localStorage.setItem("cp_plan", JSON.stringify({ day: 1, depart: "06:00", hours: 5, species: sp, origin: "home" }));
    }, species);
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 120000 });
    await new Promise(r => setTimeout(r, 15000)); // débits, bouées et temps de route arrivent après la météo
    const txt = sel => page.$eval(sel, e => e.innerText).catch(() => "");
    const run = { species, banner: await txt("#banner"), reco: await txt("#reco"), when: await txt("#when"), list: await txt("#list"), cond: (await txt("#cond")).slice(0, 6000), fiches: [] };
    const ids = await page.$$eval("#list .spot", els => els.slice(0, 4).map(e => +e.dataset.id));
    for (const id of ids) {
      await page.evaluate(id => { document.querySelector("#goDay").value = "1"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
      await new Promise(r => setTimeout(r, 1500));
      run.fiches.push({ id, texte: await txt("#sheetBody") });
      if (species === "les deux" && id === ids[0]) await page.screenshot({ path: "/tmp/out/fiche_1.png", fullPage: true });
      await page.evaluate(() => document.querySelector("#sheetClose").click());
    }
    if (species === "les deux") await page.screenshot({ path: "/tmp/out/accueil.png", fullPage: true });
    out.runs.push(run);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync("/tmp/out/sortie.json", JSON.stringify(out, null, 1));
  console.log("erreurs JS :", out.erreurs.length, out.erreurs.slice(0, 5));
})().catch(e => { console.error(e); process.exit(1); });
