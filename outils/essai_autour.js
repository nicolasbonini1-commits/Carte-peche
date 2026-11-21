// Essai du 21 nov. 2026 (chantier 1) : affichage « Autour » (pêche de zone) avant fusion sur main.
// 3e passage (21 nov. 4 h 45) : postes validés par Nico (16), main v17 fusionnée, captures 6, 12, 14 ; contrôle des textes 6 et 12.
// Version d'essai = main (cache v17) + chantier-1-postes, cache v18 (port 8080) ; main en ligne pour comparer (port 8081).
// Ouvre la vraie appli (vraies réponses API) dans Chrome sans écran, taille A55 (412 × 915).
// Contrôles : les 16 fiches s'ouvrent sans erreur ; « Autour » et ses points gris = nombre de points de js/spots.js ;
// points retirés à la fermeture ; même chose sans réseau (service worker) et au retour du réseau ; notes des postes essai / main.
// Résultats dans la branche essais-autour (jamais dans donnees).
const puppeteer = require("puppeteer");
const fs = require("fs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GRIS = 'path[fill="#9aa0a6"]';
let out;
process.on("exit", () => { try { fs.writeFileSync("/tmp/out/resultat.json", JSON.stringify(out, null, 1)); } catch (e) {} });
(async () => {
  out = { genere: new Date().toISOString(), versions: {}, erreurs: [], console: [] };
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  for (const [nom, url] of [["essai", "http://localhost:8080/"], ["main", "http://localhost:8081/"]]) try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    page.on("pageerror", e => out.erreurs.push(nom + " : " + e.message));
    page.on("console", m => { if (m.type() === "error") out.console.push(nom + " : " + m.text()); });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 120000 });
    await sleep(15000);
    const txt = sel => page.$eval(sel, e => e.innerText).catch(() => "");
    const v = { notes: await page.$$eval("#list .spot", els => els.map(e => e.innerText.replace(/\s+/g, " ").slice(0, 140))), banner: await txt("#banner") };
    out.versions[nom] = v;
    v.cacheShell = await page.evaluate(() => caches.keys());
    v.version = await page.evaluate(() => window.SPOTS.filter(s => s.autour).map(s => s.id));
    const ouvrir = async id => {
      await page.evaluate(id => { document.querySelector("#goDay").value = "0"; document.querySelector("#goSpot").value = String(id); document.querySelector("#goBtn").click(); }, id);
      await sleep(1200);
    };
    const fiche = async id => {
      await ouvrir(id);
      const r = await page.evaluate((id, GRIS) => {
        const s = window.SPOTS.find(x => x.id === id), body = document.querySelector("#sheetBody");
        const p = [...body.querySelectorAll("p")].find(e => e.innerText.startsWith("Autour"));
        return { ouverte: !document.querySelector("#sheet").hidden, titre: (body.querySelector("h2") || {}).innerText || "",
          attendu: (s.autour || []).length, points: document.querySelectorAll(GRIS).length, texte: p ? p.innerText : null };
      }, id, GRIS);
      return r;
    };
    const fermer = async () => { await page.evaluate(() => document.querySelector("#sheetClose").click()); await sleep(400); return page.$$eval(GRIS, e => e.length); };
    if (nom === "essai") {
      v.fiches = {};
      for (let id = 1; id <= 16; id++) {
        const r = await fiche(id);
        r.apresFermeture = await fermer();
        r.ok = r.ouverte && r.points === r.attendu && r.apresFermeture === 0 && (r.attendu ? !!r.texte : !r.texte);
        r.texteFiche = await page.evaluate(() => document.querySelector("#sheetBody").innerText).catch(() => "");
        r.resteProposé = /PROPOS/.test(r.texteFiche);
        if (id === 6) r.texteAttendu = r.texteFiche.includes("confirmé par Nico");
        if (id === 12) r.texteAttendu = (r.texte || "").includes("non évalué");
        delete r.texteFiche;
        v.fiches[id] = r;
      }
      // Captures : fiche ouverte puis carte zoomée sur le poste (les points gris ne sont visibles qu'avec la fiche ouverte)
      for (const id of [6, 12, 14]) {
        await ouvrir(id);
        await page.screenshot({ path: `/tmp/out/fiche_${id}.png` });
        await page.evaluate(() => document.querySelector("#sheet").style.display = "none"); // cache la fiche sans la fermer
        for (let k = 0; k < 5; k++) { await page.click(".leaflet-control-zoom-in").catch(() => {}); await sleep(500); }
        await sleep(3000);
        await page.screenshot({ path: `/tmp/out/carte_${id}.png` });
        await page.evaluate(() => document.querySelector("#sheet").style.display = "");
        await fermer();
        for (let k = 0; k < 5; k++) { await page.click(".leaflet-control-zoom-out").catch(() => {}); await sleep(300); }
      }
      await page.screenshot({ path: "/tmp/out/accueil.png", fullPage: true });
      // Sans réseau (chaque étape protégée : une erreur est notée et l'essai continue)
      const etape = async (k, f) => { try { await f(); } catch (e) { out.erreurs.push(`étape ${k} : ${e.message}`); } };
      await etape("sw", async () => { v.swPret = await page.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active)).catch(e => "erreur " + e.message); });
      await etape("hors ligne", async () => {
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }).catch(() => {});
      await sleep(4000);
      v.horsLigne = { postes: await page.$$eval("#list .spot", e => e.length), banner: await txt("#banner"), sw: await page.evaluate(() => !!navigator.serviceWorker.controller),
        fiche7: await fiche(7) };
      await page.screenshot({ path: "/tmp/out/hors_ligne_fiche7.png" });
      v.horsLigne.fiche7.apresFermeture = await fermer();
      });
      // Retour du réseau
      await etape("retour", async () => {
      await page.setOfflineMode(false);
      const t0 = Date.now(), req = [];
      const onReq = r => { const u = r.url(); if (!u.startsWith("http://localhost")) req.push(Math.round((Date.now() - t0) / 1000) + " s " + u.split("?")[0]); };
      const onRep = r => { const u = r.url(); if (!u.startsWith("http://localhost")) req.push(Math.round((Date.now() - t0) / 1000) + " s ← " + r.status() + " " + u.split("?")[0]); };
      page.on("request", onReq); page.on("response", onRep);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      // on attend que le bandeau disparaisse (au plus 120 s) et on note le temps
      let attente = null;
      for (let k = 0; k < 120; k++) { await sleep(1000); if (!(await txt("#banner"))) { attente = Math.round((Date.now() - t0) / 1000); break; } }
      page.off("request", onReq); page.off("response", onRep);
      v.retourAttente = attente; v.retourRequetes = req.slice(0, 40);
      // si l'appli s'est rechargée seule (nouveau service worker), attendre la liste
      await page.waitForFunction(() => document.querySelectorAll("#list .spot").length >= 10, { timeout: 60000 }).catch(() => {});
      v.retour = { postes: await page.$$eval("#list .spot", e => e.length), banner: await txt("#banner"), fiche4: await fiche(4) };
      v.retour.fiche4.apresFermeture = await fermer();
      });
      await etape("caches", async () => { v.cacheApres = await page.evaluate(() => caches.keys()); });
    }
    await page.close();
  } catch (e) { out.erreurs.push(`${nom} : arrêt de la version : ${e.message}`); }
  await browser.close().catch(() => {});
  const E = out.versions.essai || {}, f = E.fiches || {};
  const ok = (x, n) => !!(x && x.points === n && x.apresFermeture === 0);
  out.resume = { fichesOk: Object.values(f).filter(x => x.ok).length, fichesKo: Object.entries(f).filter(([, x]) => !x.ok).map(([k]) => k),
    horsLigneOk: ok(E.horsLigne && E.horsLigne.fiche7, 3), retourOk: ok(E.retour && E.retour.fiche4, 2),
    cacheV18: (E.cacheApres || E.cacheShell || []).includes("carte-peche-v18"), erreurs: out.erreurs.length };
  fs.writeFileSync("/tmp/out/resultat.json", JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.resume), "erreurs :", out.erreurs.slice(0, 5));
})().catch(e => { console.error(e); out.erreurs.push("arrêt : " + e.message); process.exit(1); });
