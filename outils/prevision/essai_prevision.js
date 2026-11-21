// Chantier 1, étape 2 : ouvre les deux copies (zones : port 8091, poste : port 8092) dans Chrome sans écran avec les vraies
// réponses d'Open-Meteo, et relève pour chaque poste, chaque heure des 72 prochaines heures et chaque espèce :
// la note de l'appli et les conditions (vent, rafales, direction, houle au poste, couleur de l'eau).
// Écrit /tmp/out/zones.json et /tmp/out/poste.json, comparés ensuite par compare.js.
const puppeteer = require("puppeteer");
const fs = require("fs");
(async () => {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  for (const [nom, url] of [["zones", "http://localhost:8091/"], ["poste", "http://localhost:8092/"]]) {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", e => errs.push(e.message));
    page.on("console", m => { if (m.type() === "error") errs.push("console : " + m.text()); });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__test && window.__test.state.data && document.querySelectorAll("#list .spot").length >= 10, { timeout: 180000 });
    await new Promise(r => setTimeout(r, 15000)); // débits, houle, routes
    const res = await page.evaluate(() => {
      const T = window.__test, D = T.state.data, now = Date.now();
      const i0 = D.times.findIndex(t => t.getTime() > now - 1800000);
      const out = { genere: new Date().toISOString(), fetchedAt: D.fetchedAt, multi: D.multi, mfEnd: D.mfEnd, i0, heures: [], postes: {} };
      for (let i = i0; i < Math.min(D.times.length, i0 + 72); i++) out.heures.push(D.keys[i]);
      window.SPOTS.forEach(s => {
        const rows = [];
        for (let i = i0; i < Math.min(D.times.length, i0 + 72); i++) {
          const c = T.conditions(s, i);
          const L = T.scoreAt(s, i, "loup"), Dd = T.scoreAt(s, i, "dorade");
          rows.push({ loup: L.score, dorade: Dd.score, vent: c.wind, rafales: c.gust, dir: c.windDir, houle: c.hsLocal, houleLarge: c.hsOff, src: c.waveSrc,
            fnu: c.turb && (c.turb.fnu ?? c.turb.value ?? null), terre: c.onshore });
        }
        // séries brutes du point utilisé (vent, houle au large) sur les 7 jours passés aussi, pour l'écart pur des modèles
        const F = D.F[s.zone], S = D.S[s.zone];
        out.postes[s.id] = { zone: s.zone, rows, brut: { vent: F.wind, rafales: F.gust, dir: F.dir, houle: S.hs } };
      });
      out.keys = D.keys;
      return out;
    });
    res.erreurs = errs;
    fs.writeFileSync(`/tmp/out/${nom}.json`, JSON.stringify(res));
    console.log(nom, "postes", Object.keys(res.postes).length, "heures", res.heures.length, "erreurs", errs.length, errs.slice(0, 3));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
