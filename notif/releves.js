// Analyse des relevés « Je suis sur place » envoyés par tickets GitHub (décision de Nico du 20 nov. 2026, 12 h 33 :
// « le plus fiable possible »). Compare ce que Nico a vu sur place à ce que l'appli estimait au même moment, et, quand la
// sortie a été notée, regarde la pêche selon l'eau vue. Le même calcul à chaque passage, sans rien deviner.
//   node notif/releves.js tickets.jsonl PROPRIETAIRE > releves.json
// tickets.jsonl : un ticket par ligne, tel que renvoyé par l'API GitHub (gh api --paginate … --jq '.[]').
// Ne lit que du JSON (jamais exécuté) : un ticket écrit par quelqu'un d'autre est simplement écarté.
const fs = require("fs");

const VERSION = 1;
const MIN_N = 5; // en dessous : « pas assez pour conclure » (règle du skill coach-peche, section 6)
const TITLE = "Relevés sur place";
const IGNORE_LABEL = "ignorer"; // étiquette à mettre sur un ticket d'essai pour l'exclure

// Classes comparées. Eau : « marron » vu = « très chargée » de l'appli (même libellé que le carnet).
const EAU = ["claire", "piquée", "teintée", "marron"];
const EAU_APPLI = { claire: "claire", "piquée": "piquée", "teintée": "teintée", "très chargée": "marron" };
// Mer : l'appli a 4 classes (M.SEA_CLASSES), le relevé 3 boutons → « peu agitée » et « formée » comptent comme « agitée ».
const MER = ["calme", "agitée", "forte"];
const MER_APPLI = { calme: "calme", "peu agitée": "agitée", "formée": "agitée", forte: "forte" };

// Intervalle de confiance à 95 % d'une proportion (Wilson) : honnête même avec peu de relevés, contrairement à « x / n ».
function wilson(k, n) {
  if (!n) return null;
  const z = 1.96, p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, +(c - h).toFixed(2)), Math.min(1, +(c + h).toFixed(2))];
}
const rate = (k, n) => ({ n, accord: k, taux: n ? +(k / n).toFixed(2) : null, ic95: wilson(k, n), conclure: n >= MIN_N });

function extract(issue) {
  const m = /```json\s*([\s\S]*?)```/.exec(issue.body || "");
  if (!m) throw new Error("pas de bloc JSON");
  const list = JSON.parse(m[1]);
  if (!Array.isArray(list)) throw new Error("bloc JSON qui n'est pas une liste");
  return list;
}

function analyse(issues, owner) {
  const used = [], rejected = [];
  const byId = new Map(); // id du relevé → { r, issue }
  // Du plus ancien au plus récent : la version la plus récente d'un relevé (« complément » avec la pêche) remplace l'ancienne.
  issues.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const is of issues) {
    if (is.pull_request) continue;
    if (!(is.title || "").startsWith(TITLE)) continue;
    const why = (is.user && is.user.login) !== owner ? "auteur autre que le propriétaire du dépôt"
      : (is.labels || []).some(l => (l.name || l) === IGNORE_LABEL) ? `étiquette « ${IGNORE_LABEL} »` : null;
    if (why) { rejected.push({ ticket: is.number, raison: why }); continue; }
    let list;
    try { list = extract(is); } catch (e) { rejected.push({ ticket: is.number, raison: e.message }); continue; }
    let n = 0;
    for (const r of list) {
      if (!r || r.id == null || !r.vu) continue;
      const old = byId.get(r.id);
      // Un complément sans pêche ne doit pas effacer une pêche déjà reçue.
      const peche = r.peche || (old && old.r.peche) || null;
      byId.set(r.id, { r: { ...r, peche }, ticket: is.number });
      n++;
    }
    used.push({ ticket: is.number, releves: n, le: is.created_at });
  }
  const rel = [...byId.values()].sort((a, b) => a.r.id - b.r.id);

  // 1) « Pêchable ? » (postes 6 et 8) : l'appli dit oui / douteux / non, Nico oui / non.
  const pe = { table: {}, oui_oui: 0, non_non: 0, n_net: 0, douteux: { oui: 0, non: 0 } };
  // 2) Couleur de l'eau : exacte, à une classe près, et dans quel sens l'appli se trompe.
  const eau = { table: {}, exact: 0, une_classe: 0, n: 0, appli_plus_sale: 0, appli_plus_claire: 0 };
  // 3) Mer.
  const mer = { table: {}, exact: 0, n: 0, appli_plus_forte: 0, appli_plus_calme: 0 };
  const add = (t, a, b) => { t[a] = t[a] || {}; t[a][b] = (t[a][b] || 0) + 1; };
  // 4) Pêche selon l'eau vue (sorties notées seulement), et cas qui contredisent la règle « eau marron = pas pêchable ».
  const peche = {}, contre = [];
  for (const { r, ticket } of rel) {
    const a = r.appli || {}, vu = r.vu;
    if (vu.pechable && a.pechable) {
      add(pe.table, `appli ${a.pechable}`, `vu ${vu.pechable}`);
      if (a.pechable === "douteux") pe.douteux[vu.pechable]++;
      else { pe.n_net++; if (a.pechable === vu.pechable) a.pechable === "oui" ? pe.oui_oui++ : pe.non_non++; }
    }
    const ea = EAU_APPLI[a.eau];
    if (vu.eau && ea) {
      const iv = EAU.indexOf(vu.eau), ia = EAU.indexOf(ea);
      add(eau.table, `appli ${ea}`, `vu ${vu.eau}`); eau.n++;
      if (iv === ia) eau.exact++;
      if (Math.abs(iv - ia) <= 1) eau.une_classe++;
      if (ia > iv) eau.appli_plus_sale++; else if (ia < iv) eau.appli_plus_claire++;
    }
    const ma = MER_APPLI[a.mer];
    if (vu.mer && ma) {
      const iv = MER.indexOf(vu.mer), ia = MER.indexOf(ma);
      add(mer.table, `appli ${a.mer}`, `vu ${vu.mer}`); mer.n++;
      if (iv === ia) mer.exact++; else if (ia > iv) mer.appli_plus_forte++; else mer.appli_plus_calme++;
    }
    const p = r.peche;
    if (p && p.duree_h > 0) {
      const k = vu.eau || "pas regardée", s = peche[k] = peche[k] || { sorties: 0, heures: 0, loups: 0, dorades: 0, touches: 0, heures_touches: 0 };
      s.sorties++; s.heures += +p.duree_h; s.loups += p.loups || 0; s.dorades += p.dorades || 0;
      if (p.touches != null) { s.touches += p.touches; s.heures_touches += +p.duree_h; }
      const pris = (p.loups || 0) + (p.dorades || 0);
      if (pris > 0 && (vu.eau === "marron" || vu.pechable === "non" || a.pechable === "non"))
        contre.push({ ticket, le: r.t, poste: r.poste, vu_eau: vu.eau, vu_pechable: vu.pechable, appli_pechable: a.pechable || null, loups: p.loups || 0, dorades: p.dorades || 0 });
    }
  }
  for (const s of Object.values(peche)) {
    s.heures = +s.heures.toFixed(1);
    s.prises_par_heure = s.heures ? +((s.loups + s.dorades) / s.heures).toFixed(2) : null;
    s.touches_par_heure = s.heures_touches ? +(s.touches / s.heures_touches).toFixed(2) : null;
    s.conclure = s.sorties >= MIN_N;
  }

  const res = {
    pechable: { ...rate(pe.oui_oui + pe.non_non, pe.n_net), note: "accord sur les « oui » et « non » de l'appli ; les « douteux » sont comptés à part", douteux_vu: pe.douteux, tableau: pe.table },
    eau: { ...rate(eau.exact, eau.n), a_une_classe_pres: rate(eau.une_classe, eau.n).taux, appli_plus_sale: eau.appli_plus_sale, appli_plus_claire: eau.appli_plus_claire, tableau: eau.table },
    mer: { ...rate(mer.exact, mer.n), appli_plus_forte: mer.appli_plus_forte, appli_plus_calme: mer.appli_plus_calme, note: "« peu agitée » et « formée » de l'appli comptent comme « agitée »", tableau: mer.table },
    peche_selon_eau_vue: peche,
    contredit_la_regle: contre
  };
  // Une seule ligne, lisible dans l'appli si Nico le veut un jour (il veut une appli légère).
  const part = (lbl, x) => x.n < MIN_N ? `${lbl} : pas assez pour conclure (${x.n}/${MIN_N})` : `${lbl} juste ${Math.round(x.taux * 100)} % (${x.accord}/${x.n})`;
  const ligne = rel.length ? [part("Pêchable ?", res.pechable), part("Eau", res.eau), part("Mer", res.mer)].join(" · ") +
    (contre.length ? ` · ${contre.length} prise(s) en eau jugée non pêchable` : "") : "Aucun relevé reçu pour l'instant.";

  return {
    version: VERSION, genere: new Date().toISOString(), minimum_pour_conclure: MIN_N,
    releves: rel.length, sorties_notees: rel.filter(x => x.r.peche).length,
    ligne, resultats: res,
    tickets_lus: used, tickets_ecartes: rejected,
    detail: rel.map(({ r, ticket }) => ({ ticket, id: r.id, le: r.t, poste: r.poste, vu: r.vu,
      appli: { pechable: r.appli && r.appli.pechable, eau: r.appli && r.appli.eau, fnu: r.appli && r.appli.fnu, mer: r.appli && r.appli.mer, houle_poste: r.appli && r.appli.houle_poste },
      peche: r.peche || null }))
  };
}

if (require.main === module) {
  const [file, owner] = process.argv.slice(2);
  if (!file || !owner) { console.error("usage : node notif/releves.js tickets.jsonl PROPRIETAIRE"); process.exit(2); }
  const txt = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const issues = txt.split("\n").filter(l => l.trim()).map(l => JSON.parse(l));
  process.stdout.write(JSON.stringify(analyse(issues, owner), null, 1));
}
module.exports = { analyse, wilson };
