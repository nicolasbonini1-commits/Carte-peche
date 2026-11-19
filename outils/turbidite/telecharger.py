#!/usr/bin/env python3
"""Essai turbidité (branche essai-turbidite) : télécharge les relevés depuis 2020 pour simuler
l'indice « eau teintée » et le contrôler avec la turbidité satellite (Sentinel-2, 100 m).

Sources (aucune clé) :
- Hub'Eau hydrométrie : débits moyens journaliers (QmnJ) depuis 2020 et mensuels (QmM) depuis 1990.
- Open-Meteo archive (ERA5) : vent, rafales, pluie horaires aux 3 points de zone ; pluie des bassins.
- Open-Meteo Marine (historique) : houle aux 3 points de zone.
- Copernicus Marine WMTS : turbidité TUR (FNU) du produit OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205,
  lue point par point (GetFeatureInfo) à 300 m et 1 km au large de chaque poste.

Écrit tout dans le dossier donné en argument. Bibliothèque standard seulement.
"""
import json, math, os, sys, time, re, datetime as dt
import urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/turb"
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
POSTES = json.load(open(os.path.join(HERE, "postes.json")))["spots"]
DEBUT = "2020-01-01"
HIER = (dt.date.today() - dt.timedelta(days=1)).isoformat()
T0 = time.time()
LIMITE_S = 4.5 * 3600  # on s'arrête avant la limite de 6 h de GitHub


def log(*a):
    print(f"[{time.time()-T0:7.0f} s]", *a, flush=True)


def get(url, tries=3, timeout=90, raw=False):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Carte-peche essai turbidite (usage perso)"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
                return b if raw else json.loads(b)
        except urllib.error.HTTPError as e:
            body = e.read()[:300]
            if e.code in (400, 404):
                return {"_erreur": e.code, "_corps": body.decode("utf8", "replace")}
            log("HTTP", e.code, url[:120], body[:120])
        except Exception as e:
            log("échec", type(e).__name__, str(e)[:120], url[:120])
        time.sleep(5 * (k + 1))
    return None


def save(name, obj):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    log("écrit", name, os.path.getsize(os.path.join(OUT, name)), "octets")


# ---------- 1. Débits Hub'Eau ----------
STATIONS = {"rhone": "V720001002", "vidourle": "Y346400501", "lez": "Y321002001"}


def hubeau(code, grandeur, debut):
    url = ("https://hubeau.eaufrance.fr/api/v2/hydrometrie/obs_elab?"
           + urllib.parse.urlencode({"code_entite": code, "grandeur_hydro_elab": grandeur,
                                     "date_debut_obs_elab": debut, "size": 20000,
                                     "fields": "date_obs_elab,resultat_obs_elab"}))
    rows = []
    while url:
        j = get(url)
        if not j or "data" not in j:
            log("Hub'Eau sans données", code, grandeur, str(j)[:200]); break
        rows += [[d["date_obs_elab"], d["resultat_obs_elab"]] for d in j["data"]]
        url = j.get("next")
    return rows


def debits():
    out = {}
    for nom, code in STATIONS.items():
        out[nom] = {"station": code, "unite": "l/s", "QmnJ": hubeau(code, "QmnJ", DEBUT), "QmM": hubeau(code, "QmM", "1990-01-01")}
        log(nom, len(out[nom]["QmnJ"]), "jours,", len(out[nom]["QmM"]), "mois")
    # Recherche d'autres stations utiles (Vistre, Petit Rhône) pour plus tard
    url = ("https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?"
           + urllib.parse.urlencode({"code_departement": "30,34,13", "size": 2000,
                                     "fields": "code_station,libelle_station,en_service,longitude_station,latitude_station,date_fermeture_station"}))
    j = get(url)
    if j and "data" in j:
        out["_autres"] = [s for s in j["data"] if re.search(r"vistre|petit rh|mosson|lez|vidourle|rh[oô]ne", s.get("libelle_station") or "", re.I)]
        log("stations trouvées :", [(s["code_station"], s["libelle_station"]) for s in out["_autres"]][:40])
    save("debits.json", out)


# ---------- 2. Météo ERA5 (Open-Meteo archive) ----------
ZONES = {"W": [43.44, 3.90], "C": [43.48, 4.06], "E": [43.40, 4.30]}
BASSINS = {"RV": [43.90, 3.92], "RL": [43.70, 3.86], "RR": [44.5, 4.7]}  # RR : Rhône moyen, indicatif


def meteo():
    pts = list(ZONES.items())
    url = ("https://archive-api.open-meteo.com/v1/archive?"
           + urllib.parse.urlencode({"latitude": ",".join(str(p[1][0]) for p in pts),
                                     "longitude": ",".join(str(p[1][1]) for p in pts),
                                     "start_date": DEBUT, "end_date": HIER, "timezone": "Europe/Paris",
                                     "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover"}))
    j = get(url, timeout=300)
    if isinstance(j, dict): j = [j]
    save("meteo_zones.json", {"zones": [p[0] for p in pts], "data": j})
    pts = list(BASSINS.items())
    url = ("https://archive-api.open-meteo.com/v1/archive?"
           + urllib.parse.urlencode({"latitude": ",".join(str(p[1][0]) for p in pts),
                                     "longitude": ",".join(str(p[1][1]) for p in pts),
                                     "start_date": DEBUT, "end_date": HIER, "timezone": "Europe/Paris",
                                     "daily": "precipitation_sum"}))
    j = get(url, timeout=300)
    if isinstance(j, dict): j = [j]
    save("pluie_bassins.json", {"bassins": [p[0] for p in pts], "data": j})


def houle():
    pts = list(ZONES.items())
    base = {"latitude": ",".join(str(p[1][0]) for p in pts), "longitude": ",".join(str(p[1][1]) for p in pts),
            "start_date": DEBUT, "end_date": HIER, "timezone": "Europe/Paris",
            "hourly": "wave_height,wave_period,wave_direction"}
    for modele in ("era5_ocean", None):
        q = dict(base)
        if modele: q["models"] = modele
        j = get("https://marine-api.open-meteo.com/v1/marine?" + urllib.parse.urlencode(q), timeout=300)
        ok = j and not (isinstance(j, dict) and (j.get("error") or j.get("_erreur")))
        log("houle modèle", modele, "ok" if ok else str(j)[:300])
        if ok:
            if isinstance(j, dict): j = [j]
            save("houle_zones.json", {"zones": [p[0] for p in pts], "modele": modele, "data": j}); return


# ---------- 3. Turbidité Copernicus Marine (WMTS, sans compte) ----------
PRODUIT = "OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205"
WMTS = "https://wmts.marine.copernicus.eu/teroWmts"
NS = {"w": "http://www.opengis.net/wmts/1.0", "ows": "http://www.opengis.net/ows/1.1"}


def large(lat, lon, bearing, m):
    """Point à m mètres du poste dans la direction de la mer."""
    b = math.radians(bearing)
    return [round(lat + m * math.cos(b) / 111320, 5), round(lon + m * math.sin(b) / (111320 * math.cos(math.radians(lat))), 5)]


def tuile(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return int(y), int(x), int((x % 1) * 256), int((y % 1) * 256)


def temps_liste(dim):
    """Valeurs de la dimension time : liste, ou intervalles debut/fin/P1D."""
    vals = []
    for v in dim:
        for part in v.split(","):
            part = part.strip()
            if "/" in part:
                a, b, p = (part.split("/") + ["P1D"])[:3]
                d0 = dt.datetime.fromisoformat(a.replace("Z", "+00:00")); d1 = dt.datetime.fromisoformat(b.replace("Z", "+00:00"))
                step = dt.timedelta(days=1) if p == "P1D" else None
                if step is None: vals += [a, b]; continue
                while d0 <= d1: vals.append(d0.strftime("%Y-%m-%dT%H:%M:%SZ")); d0 += step
            elif part: vals.append(part)
    return vals


def turbidite():
    cap = get(f"{WMTS}/{PRODUIT}?service=WMTS&version=1.0.0&request=GetCapabilities", raw=True, timeout=180)
    if not cap or isinstance(cap, dict):
        log("pas de GetCapabilities", str(cap)[:300]); return
    open(os.path.join(OUT, "wmts_capabilities.xml"), "wb").write(cap)
    root = ET.fromstring(cap)
    couches = []
    for L in root.iter("{http://www.opengis.net/wmts/1.0}Layer"):
        ident = L.findtext("ows:Identifier", namespaces=NS)
        dims = {}
        for D in L.findall("w:Dimension", NS):
            dims[D.findtext("ows:Identifier", namespaces=NS)] = [v.text for v in D.findall("w:Value", NS)]
        tms = [t.findtext("w:TileMatrixSet", namespaces=NS) for t in L.findall("w:TileMatrixSetLink", NS)]
        styles = [s.findtext("ows:Identifier", namespaces=NS) for s in L.findall("w:Style", NS)]
        fmts = [f.text for f in L.findall("w:InfoFormat", NS)]
        couches.append({"id": ident, "dims": {k: (v[:3] + ["…"] + v[-3:] if len(v) > 8 else v) for k, v in dims.items()},
                        "tms": tms, "styles": styles[:5], "infoformats": fmts, "_time": dims.get("time", [])})
    for c in couches:
        log("couche", c["id"], c["dims"], c["tms"], c["infoformats"])
    save("wmts_couches.json", [{k: v for k, v in c.items() if k != "_time"} for c in couches])
    tur = [c for c in couches if (c["id"] or "").endswith("/TUR")]
    if not tur:
        log("aucune couche TUR"); return
    couche = tur[0]
    log("couche choisie :", couche["id"])
    dates = temps_liste(couche["_time"])
    dates = [d for d in dates if d[:10] >= DEBUT]
    log(len(dates), "dates, de", dates[:1], "à", dates[-1:])
    tms = next((t for t in couche["tms"] if "3857" in t), couche["tms"][0])
    fmt = "application/json" if "application/json" in couche["infoformats"] else (couche["infoformats"] or ["text/plain"])[0]
    Z = 14  # ~9,5 m par pixel de tuile à cette latitude : on tombe dans un seul pixel de 100 m

    def gfi(lat, lon, t):
        r, c, i, j = tuile(lat, lon, Z)
        q = {"service": "WMTS", "version": "1.0.0", "request": "GetFeatureInfo", "layer": couche["id"],
             "tilematrixset": tms, "tilematrix": str(Z), "tilerow": r, "tilecol": c, "i": i, "j": j,
             "infoformat": fmt, "time": t}
        return get(f"{WMTS}?" + urllib.parse.urlencode(q), tries=2, timeout=60, raw=True)

    # Essai sur 3 dates pour voir la forme de la réponse
    lez = large(43.5237, 3.9353, 155, 1000)
    essais = {}
    for t in dates[-40::13] + [dates[len(dates)//2]]:
        b = gfi(lez[0], lez[1], t)
        essais[t] = (b.decode("utf8", "replace")[:800] if isinstance(b, bytes) else str(b)[:800])
        log("GFI", t, essais[t][:300])
    save("wmts_essais_gfi.json", essais)

    def valeur(b):
        if not isinstance(b, bytes): return None
        s = b.decode("utf8", "replace")
        try:
            j = json.loads(s)
        except Exception:
            m = re.search(r"value[^0-9\-]*(-?[0-9.]+(?:[eE][-+]?\d+)?)", s); return float(m.group(1)) if m else None
        vals = []
        def walk(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    if k.lower() in ("value", "values", "tur") and isinstance(v, (int, float)): vals.append(v)
                    elif k.lower() in ("value", "values") and isinstance(v, list): vals.extend(x for x in v if isinstance(x, (int, float)))
                    else: walk(v)
            elif isinstance(o, list):
                for x in o: walk(x)
        walk(j)
        vals = [v for v in vals if v is not None and not (isinstance(v, float) and math.isnan(v)) and -1 < v < 1e4]
        return vals[0] if vals else None

    if not any('"value"' in v for v in essais.values()):
        log("réponse sans champ value : extraction complète pas lancée (voir wmts_essais_gfi.json)")
        return
    # Essai d'une série de dates en une requête (si le serveur l'accepte, ce serait bien plus rapide)
    r, c, i, j = tuile(lez[0], lez[1], Z)
    q = {"service": "WMTS", "version": "1.0.0", "request": "GetFeatureInfo", "layer": couche["id"], "tilematrixset": tms,
         "tilematrix": str(Z), "tilerow": r, "tilecol": c, "i": i, "j": j, "infoformat": fmt,
         "time": "2026-10-01T00:00:00Z/2026-11-17T00:00:00Z"}
    b = get(f"{WMTS}?" + urllib.parse.urlencode(q), tries=1, raw=True)
    log("essai série :", (b.decode("utf8", "replace") if isinstance(b, bytes) else str(b))[:400])

    # Points : 300 m et 1 km au large de chaque poste, plus 4 points témoins au large (5 km)
    points = []
    for s in POSTES:
        for m in (300, 1000):
            points.append({"id": f"{s['id']}_{m}", "poste": s["id"], "m": m, "ll": large(s["lat"], s["lon"], s["seaward"], m)})
    for nom, ll in {"large_W": [43.46, 3.90], "large_C": [43.49, 4.06], "large_E": [43.40, 4.30], "rhone_PSL": [43.30, 4.85]}.items():
        points.append({"id": nom, "poste": None, "m": None, "ll": ll})
    save("turbidite_points.json", points)

    # Tri : une date n'est lue en entier que si un des 3 points témoins a une valeur (passage du satellite, pas de nuage)
    temoins = [p for p in points if p["id"] in ("12_1000", "6_1000", "1_1000")]
    res = {}

    def tester(t):
        for p in temoins:
            v = valeur(gfi(p["ll"][0], p["ll"][1], t))
            if v is not None: return t
        return None

    with ThreadPoolExecutor(6) as ex:
        utiles = [t for t in ex.map(tester, dates) if t]
    log(len(utiles), "dates avec au moins une valeur sur", len(dates))
    for k, t in enumerate(utiles):
        if time.time() - T0 > LIMITE_S:
            log("temps limite atteint, arrêt à", t); break
        with ThreadPoolExecutor(6) as ex:
            vals = list(ex.map(lambda p: valeur(gfi(p["ll"][0], p["ll"][1], t)), points))
        res[t[:10]] = {p["id"]: v for p, v in zip(points, vals) if v is not None}
        if k % 25 == 0:
            log(k, "/", len(utiles), t[:10], len(res[t[:10]]), "valeurs")
            save("turbidite.json", {"couche": couche["id"], "unite": "FNU", "dates": res})
    save("turbidite.json", {"couche": couche["id"], "unite": "FNU", "dates": res})


if __name__ == "__main__":
    quoi = sys.argv[2].split(",") if len(sys.argv) > 2 else ["debits", "meteo", "houle", "turbidite"]
    for f in quoi:
        log("=====", f)
        try:
            globals()[f]()
        except Exception as e:
            log("ERREUR", f, type(e).__name__, e)
    log("fini")
