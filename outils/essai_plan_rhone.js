// Essai du 21 nov. 2026 : vraie appli dans Chrome sans écran, poste 1 (Embouchure du Petit Rhône), 4 jours, aube et après-midi.
// Lancé par .github/workflows/essai-plan-rhone.yml ; résultats dans la branche essais-plan-rhone (jamais dans donnees).
const puppeteer = require("puppeteer");
const fs = require("fs");
(async () => {
  const out = { genere: new Date().toISOString(), runs: [], erreurs: [] };
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const cases = [];
  for (let d = 0; d < 4; d++) for (const [lab, dep] of [["aube", "05:30"], ["apres-midi", "13:30"]]) if (!(d === 0 && lab === "aube")) cases.push({ d, lab, dep });
  let first = true;
  for (const c of cases) {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    page.on("pageerror", e => out.erreurs.push(c.d + c.lab + " : " + e.message));
    await page.evaluateOnNewDocument(c => {
      localStorage.setItem("cp_plan", JSON.stringify({ day: c.d, depart: c.dep, hours: 5, species: "les deux", origin: "home" }));
    }, c);
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 120000 });
    await new Promise(r => setTimeout(r, first ? 20000 : 12000));
    const txt = sel => page.$eval(sel, e => e.innerText).catch(() => "");
    const run = { ...c, fresh: await txt("#fresh"), list: (await txt("#list")).slice(0, 2500) };
    if (first) { run.alerts = await txt("#alerts"); run.when = await txt("#when"); run.cond = (await txt("#cond")).slice(0, 4000); }
    await page.evaluate(d => { document.querySelector("#goDay").value = String(d); document.querySelector("#goSpot").value = "1"; document.querySelector("#goBtn").click(); }, c.d);
    await new Promise(r => setTimeout(r, 2500));
    run.fiche = await txt("#sheetBody");
    out.runs.push(run);
    first = false;
    await page.close();
  }
  await browser.close();
  fs.writeFileSync("/tmp/out/plan_rhone.json", JSON.stringify(out, null, 1));
  console.log("erreurs JS :", out.erreurs.length, out.erreurs.slice(0, 5));
})().catch(e => { console.error(e); process.exit(1); });
