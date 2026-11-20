"""Essai de l'appli dans Chrome sans écran : « Pêchable ? », relevé « Je suis sur place », carnet pré-rempli,
« Envoyer mes relevés » (adresse du ticket GitHub), sans réseau puis retour du réseau, erreurs JavaScript.
Usage : python3 essai_releves.py DOSSIER_RESULTATS [--simule DOSSIER_REPONSES]
  sans --simule : vraies réponses des services (tâche GitHub) ;
  avec --simule : réponses enregistrées + débits fabriqués (Vidourle 6 fois la normale la veille), horloge fixée au 20 nov. 8 h 30."""
import sys, os, json, time, re, urllib.parse, datetime
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
SIM = sys.argv[sys.argv.index("--simule") + 1] if "--simule" in sys.argv else None
URL = "http://localhost:8080/index.html"
R = {"mode": "simulé" if SIM else "vraies réponses", "erreurs_js": [], "console_erreurs": [], "etapes": [], "verifs": []}


def etape(nom, **kw):
    kw["nom"] = nom; kw["t"] = time.strftime("%H:%M:%S"); R["etapes"].append(kw); print(json.dumps(kw, ensure_ascii=False)[:900], flush=True)


def verif(nom, ok, detail=""):
    R["verifs"].append({"nom": nom, "ok": bool(ok), "detail": str(detail)[:300]}); print(("OK   " if ok else "ÉCHEC ") + nom, str(detail)[:200], flush=True)


def simuler(ctx):
    rec = lambda f: open(os.path.join(SIM, f), "rb").read()
    now = datetime.datetime(2026, 11, 20, 8, 30)  # heure de Paris
    elab = {s: json.loads(rec(f"app_elab_{s}.json")) for s in ("V720001002", "Y346400501", "Y321002001")}
    def ref_nov(s):
        v = sorted(o["resultat_obs_elab"] for o in elab[s]["data"] if o["resultat_obs_elab"] is not None and o["date_obs_elab"][5:7] == "11")
        n = len(v); return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
    ratio_vid = {datetime.date(2026, 11, 19): 6.0}  # crue la veille → « non » attendu aux postes 6 et 8
    def obs(s):
        ref = ref_nov(s); data = []
        t = now - datetime.timedelta(days=16)
        while t <= now:
            r = ratio_vid.get(t.date(), 1.1) if s == "Y346400501" else 1.0
            utc = t - datetime.timedelta(hours=1)
            data.append({"date_obs": utc.strftime("%Y-%m-%dT%H:%M:%SZ"), "resultat_obs": ref * r})
            t += datetime.timedelta(hours=1)
        return json.dumps({"data": data[-500:]}).encode()
    def route(rt):
        u = rt.request.url
        if "unpkg.com" in u: return rt.fulfill(body=rec("leaflet.js" if u.endswith(".js") else "leaflet.css"), content_type="application/javascript" if u.endswith(".js") else "text/css")
        if "marine-api.open-meteo" in u: return rt.fulfill(body=rec("app_marine.json"), content_type="application/json")
        if "api.open-meteo.com" in u: return rt.fulfill(body=rec("app_fc.json"), content_type="application/json")
        if "observations_tr" in u:
            s = re.search(r"code_entite=(\w+)", u).group(1); return rt.fulfill(body=obs(s), content_type="application/json")
        if "obs_elab" in u:
            s = re.search(r"code_entite=(\w+)", u).group(1); return rt.fulfill(body=rec(f"app_elab_{s}.json"), content_type="application/json")
        if "houle.json" in u: return rt.fulfill(body=rec("houle.json"), content_type="application/json")
        if u.startswith("http://localhost"): return rt.continue_()
        return rt.abort()
    ctx.route("**/*", route)
    return now


with sync_playwright() as p:
    b = p.chromium.launch(**({"executable_path": "/usr/bin/google-chrome"} if SIM else {}))
    ctx = b.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=2, locale="fr-FR", timezone_id="Europe/Paris",
                        service_workers="block" if SIM else "allow")
    pg = ctx.new_page()
    if SIM:
        now = simuler(ctx); pg.clock.install(time=now.strftime("%Y-%m-%dT%H:%M:%S+01:00"))
    pg.on("pageerror", lambda e: R["erreurs_js"].append(str(e)))
    pg.on("console", lambda m: R["console_erreurs"].append(m.text) if m.type == "error" else None)
    # window.open remplacé : on garde l'adresse du ticket au lieu d'ouvrir GitHub.
    ctx.add_init_script("window.__ouvert = []; window.open = (u) => { window.__ouvert.push(u); return null; };")
    pg.goto(URL)
    try:
        pg.wait_for_function("document.querySelector('#fresh') && /débits : \\d/.test(document.querySelector('#fresh').textContent)", timeout=150000)
    except Exception:
        print("PAS CHARGÉ :", pg.inner_text("body")[:800], R["erreurs_js"], R["console_erreurs"][:10], flush=True)
        pg.screenshot(path=f"{OUT}/0_pas_charge.png"); raise
    etape("chargement", fresh=pg.inner_text("#fresh"))

    def fiche(sid):
        pg.evaluate(f"document.querySelector('#goSpot').value='{sid}'; document.querySelector('#goDay').value='0'; document.querySelector('#goBtn').click()")
        pg.wait_for_selector("#sheet:not([hidden])", timeout=15000); time.sleep(0.4)
        return pg.inner_text("#sheetBody")

    for sid in (6, 8, 12):
        txt = fiche(sid)
        lignes = [l for l in txt.split("\n") if re.search(r"Pêchable|Vidourle|sur place|couleur d'eau", l)]
        etape(f"fiche {sid}", lignes=lignes[:6])
        mer = [l for l in txt.split("\n") if "Mer pour la pêche" in l or l.startswith("Couleur de l'eau")]
        etape(f"fiche {sid} : mer et eau", lignes=mer)
        verif(f"fiche {sid} : note houle sur 5", any("Mer pour la pêche" in l and "/5" in l for l in mer), mer[:1])
        verif(f"fiche {sid} : couleur de l'eau estimée", any("FNU" in l for l in mer))
        if sid in (6, 8): verif(f"fiche {sid} : ligne Pêchable", "Pêchable ?" in txt, lignes[:2])
        else: verif("fiche 12 : pas de ligne Pêchable", "Pêchable ?" not in txt)
        verif(f"fiche {sid} : bouton Je suis sur place", "Je suis sur place" in txt)
        pg.screenshot(path=f"{OUT}/1_fiche_{sid}.png")
        if sid != 6: pg.evaluate("document.querySelector('#sheetClose').click()")
    txt6 = fiche(6)  # fiche 6 rouverte pour le relevé
    if SIM: verif("simulé : Vidourle 6× la veille → non", re.search(r"Pêchable \?\s*non", txt6) is not None)

    # Relevé sur le poste 6 (fiche ouverte) : eau teintée, mer agitée, pêchable oui
    pg.click("#hereBtn"); pg.click("[data-rel=eau][data-val=teintée]"); pg.click("[data-rel=mer][data-val=agitée]"); pg.click("[data-rel=pechable][data-val=oui]")
    pg.screenshot(path=f"{OUT}/2_releve_choix.png")
    tailles = pg.evaluate("[...document.querySelectorAll('.choice')].map(b => Math.round(b.getBoundingClientRect().height))")
    verif("gros boutons (≥ 48 px de haut)", min(tailles) >= 48, tailles)
    pg.click("#relSave"); time.sleep(0.3)
    rel = pg.evaluate("JSON.parse(localStorage.getItem('cp_releves'))[0]")
    etape("relevé enregistré", releve=rel)
    verif("relevé : 3 réponses gardées", rel["vu"] == {"eau": "teintée", "mer": "agitée", "pechable": "oui"}, rel["vu"])
    verif("relevé : estimations de l'appli gardées", rel["appli"].get("eau") and "note_loup" in rel["appli"] and "pechable" in rel["appli"] and "vidourle_3j" in rel["appli"], list(rel["appli"].keys()))
    pg.screenshot(path=f"{OUT}/3_releve_enregistre.png")
    # Pré-remplissage du carnet
    pg.click("#relLog"); time.sleep(0.3)
    pre = pg.evaluate("({spot: fSpot.value, date: fDate.value, start: fStart.value, water: fWater.value, notes: fNotes.value, note: prefillNote.textContent})")
    etape("carnet pré-rempli", **pre)
    verif("carnet pré-rempli (poste 6, eau teintée, notes)", pre["spot"] == "6" and pre["water"] == "teintée" and "mer agitée" in pre["notes"], pre)
    pg.screenshot(path=f"{OUT}/4_carnet_prerempli.png")
    pg.fill("#fLoup", "1"); pg.fill("#fBites", "4"); pg.fill("#fDur", "2")
    pg.evaluate("document.querySelector('#carnetForm').requestSubmit()"); time.sleep(0.5)
    e = pg.evaluate("JSON.parse(localStorage.getItem('cp_carnet'))[0]")
    verif("sortie du carnet liée au relevé", e.get("releveId") == rel["id"], e.get("releveId"))

    # Envoyer mes relevés
    pg.click("#sendBtn"); time.sleep(0.3)
    ouvert = pg.evaluate("window.__ouvert")
    u = ouvert[-1] if ouvert else ""
    q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
    body = q.get("body", [""])[0]
    etape("ticket", longueur_adresse=len(u), titre=q.get("title"), debut=body[:400])
    verif("ticket : adresse du dépôt Carte-peche", u.startswith("https://github.com/nicolasbonini1-commits/Carte-peche/issues/new?"), u[:90])
    m = re.search(r"```json\n(.*)\n```", body, re.S)
    verif("ticket : données JSON relisibles", m and json.loads(m.group(1))[0]["vu"]["eau"] == "teintée")
    pe = json.loads(m.group(1))[0].get("peche") if m else None
    verif("ticket : touches et prises de la sortie liée", pe and pe["loups"] == 1 and pe["touches"] == 4 and "1 loup(s)" in body, pe)
    verif("ticket : aucune clé ni position", not re.search(r"github_pat|token|lat\"|lon\"", body))
    pg.screenshot(path=f"{OUT}/5_envoi.png")
    pg.click("#sentYes"); time.sleep(0.2)
    verif("relevé marqué envoyé", pg.evaluate("JSON.parse(localStorage.getItem('cp_releves'))[0].envoye") is not None)
    open(f"{OUT}/ticket_url.txt", "w").write(u)
    fiche(6); pg.click("#hereBtn"); pg.click("[data-rel=eau][data-val=piquée]"); pg.click("#relSave"); time.sleep(0.2)
    pg.click("#relLog"); time.sleep(0.2)          # carnet pré-rempli, pas encore enregistré
    pg.click("#sendBtn"); time.sleep(0.2); pg.click("#sentYes"); time.sleep(0.2)   # relevé envoyé sans la pêche
    pg.evaluate("document.querySelector('#carnetForm').requestSubmit()"); time.sleep(0.4)
    r3 = pg.evaluate("JSON.parse(localStorage.getItem('cp_releves'))[0]")
    verif("relevé envoyé puis sortie notée : à renvoyer avec la pêche", r3["envoye"] is None and r3.get("complement") is True, {k: r3.get(k) for k in ("envoye", "complement")})
    pg.click("#sendBtn"); time.sleep(0.2); pg.click("#sentYes"); time.sleep(0.2)
    if not SIM:  # l'adresse est-elle acceptée par GitHub ? (sans compte : page de connexion attendue, pas d'erreur 414)
        p2 = ctx.new_page(); resp = p2.goto(u); time.sleep(2)
        etape("GitHub ouvre l'adresse", statut=resp.status if resp else None, arrivee=p2.url[:120])
        verif("GitHub accepte l'adresse (pas d'erreur 4xx/5xx)", resp and resp.status < 400, resp.status if resp else None)
        # Adresses plus longues : jusqu'où GitHub les accepte-t-il (sans compte, donc avec le détour par la page de connexion) ?
        sondes = {}
        for L in (2500, 3000, 3500, 4000, 5000, 6000, 8000):
            for essai in (1, 2):  # deux fois, à 3 s d'écart : le 1er sondage (20 nov. 11 h 37) donnait 500 à 3500 mais 200 à 5000
                rr = p2.goto(u + "x" * (L - len(u))); sondes[f"{L}-{essai}"] = rr.status if rr else None; time.sleep(3)
        etape("longueurs acceptées par GitHub", sondes=sondes)
        verif("GitHub accepte une adresse de 4000 caractères (limite de l'appli)", all((sondes[f"4000-{k}"] or 999) < 400 for k in (1, 2)), sondes)
        p2.close()

    # Sans réseau : rechargement, relevé hors ligne
    ctx.set_offline(True)
    if not SIM: pg.reload(); time.sleep(6)  # essai local : pas de service worker, donc pas de rechargement sans réseau
    txt = fiche(8)
    verif("sans réseau : fiche 8 et Pêchable affichés", "Pêchable ?" in txt)
    pg.click("#hereBtn"); pg.click("[data-rel=eau][data-val=claire]"); pg.click("#relSave"); time.sleep(0.3)
    rel2 = pg.evaluate("JSON.parse(localStorage.getItem('cp_releves'))[0]")
    verif("sans réseau : relevé enregistré avec estimations", rel2["poste"] == 8 and rel2["appli"].get("meteo_du"), rel2["appli"].get("meteo_du"))
    pg.evaluate("document.querySelector('#sheetClose').click(); document.querySelector('nav button[data-view=carnet]').click()")
    n0 = len(pg.evaluate("window.__ouvert"))
    pg.click("#sendBtn"); time.sleep(0.3)
    verif("sans réseau : pas d'ouverture de GitHub, message affiché", len(pg.evaluate("window.__ouvert")) == n0 and "Pas de réseau" in pg.inner_text("#toast"), pg.inner_text("#toast"))
    pg.screenshot(path=f"{OUT}/6_sans_reseau.png")
    # Retour du réseau
    ctx.set_offline(False)
    pg.evaluate("window.dispatchEvent(new Event('online'))"); time.sleep(12 if not SIM else 1)
    if SIM: pg.clock.run_for(5000); time.sleep(1)
    etape("retour du réseau", fresh=pg.inner_text("#fresh"))
    pg.click("#sendBtn"); time.sleep(0.3)
    verif("retour du réseau : envoi du 2e relevé possible", len(pg.evaluate("window.__ouvert")) == n0 + 1)
    pg.screenshot(path=f"{OUT}/7_retour_reseau.png")
    # Beaucoup de relevés (10 copies du dernier) : envoi découpé en plusieurs tickets, adresse ≤ 7000 caractères
    pg.evaluate("(() => { const a = JSON.parse(localStorage.getItem('cp_releves')); const r = a[0]; for (let k = 1; k <= 10; k++) a.unshift({ ...r, id: r.id + k, envoye: null }); localStorage.setItem('cp_releves', JSON.stringify(a)); })()")
    pg.reload() if not SIM else None; time.sleep(4 if not SIM else 0)
    if SIM: pg.evaluate("location.reload()"); pg.wait_for_function("document.querySelector('#fresh') && /débits : \\d/.test(document.querySelector('#fresh').textContent)", timeout=60000)
    pg.evaluate("document.querySelector('nav button[data-view=carnet]').click()")
    pg.click("#sendBtn"); time.sleep(0.3)
    u2 = pg.evaluate("window.__ouvert.slice(-1)[0]")
    n = len(json.loads(re.search(r"```json\n(.*)\n```", urllib.parse.parse_qs(urllib.parse.urlparse(u2).query)["body"][0], re.S).group(1)))
    verif("11 relevés : découpés, adresse ≤ 4000", len(u2) <= 4000 and "Il en restera" in pg.inner_text("#sendConfirm"), f"{n} relevés dans le 1er ticket, {len(u2)} caractères ; " + pg.inner_text("#sendConfirm")[:120])
    pg.screenshot(path=f"{OUT}/8_decoupe.png")
    b.close()

R["erreurs_js_n"] = len(R["erreurs_js"]); R["echecs"] = [v["nom"] for v in R["verifs"] if not v["ok"]]
json.dump(R, open(f"{OUT}/compte_rendu.json", "w"), ensure_ascii=False, indent=1)
print("erreurs JS :", R["erreurs_js"]); print("erreurs console :", R["console_erreurs"][:15]); print("échecs :", R["echecs"])
sys.exit(1 if R["echecs"] or R["erreurs_js"] else 0)
