#!/usr/bin/env python3
"""Poste 17 (pointe de Beauduc), tâche de nuit A du 23 nov. 2026 : turbidité TUR (FNU) de Copernicus Marine à P.
Copie adaptée de outils/turbidite/telecharger.py (branche essai-turbidite, original non modifié) : même produit
OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205, même lecture WMTS GetFeatureInfo sans compte, même zoom 14, même fonction large().
Changements : seulement la partie turbidité ; points du poste 17 ; tri des dates sur P à 1 km puis le témoin à 5 km ;
on garde aussi la position du pixel lu (lat/lon renvoyés par le serveur) et un journal des requêtes.
Les relevés (débits, météo, houle) ne sont PAS retéléchargés : on réutilise la branche essais-turbidite-releves.
Usage : python3 telecharger.py DOSSIER_SORTIE
"""
import json, math, os, sys, time, re, datetime as dt
import urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/turb17"
os.makedirs(OUT, exist_ok=True)
DEBUT = "2020-01-01"
HIER = (dt.date.today() - dt.timedelta(days=1)).isoformat()
T0 = time.time()
LIMITE_S = 4.0 * 3600
STATS = {"requetes": 0, "echecs": 0}


def log(*a):
    print(f"[{time.time()-T0:7.0f} s]", *a, flush=True)


def get(url, tries=3, timeout=90, raw=False):
    for k in range(tries):
        STATS["requetes"] += 1
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Carte-peche essai poste 17 (usage perso)"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
                return b if raw else json.loads(b)
        except urllib.error.HTTPError as e:
            body = e.read()[:300]
            if e.code in (400, 404):
                return {"_erreur": e.code, "_corps": body.decode("utf8", "replace")}
            STATS["echecs"] += 1
            log("HTTP", e.code, url[:120], body[:120])
        except Exception as e:
            STATS["echecs"] += 1
            log("échec", type(e).__name__, str(e)[:120], url[:120])
        time.sleep(5 * (k + 1))
    return None


def save(name, obj):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    log("écrit", name, os.path.getsize(os.path.join(OUT, name)), "octets")


# Poste 17 : P = rive ouest du grau de l'étang de Beauduc (validé par Nico le 22 nov. 2026), mer au sud.
P = (43.36147, 4.59261)
SEAWARD = 186  # trait de côte a → P orienté ≈ 96° (étape 4) → mer à 186°

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
    lez = large(P[0], P[1], SEAWARD, 1000)  # (nom gardé de l'original) : P à 1 km
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
    # Points : P à 300 m et 1 km au large (186°), témoin à 5 km ; repères pour le panache : Faraman à 1 km, large du Grand Rhône
    points = [{"id": "17_300", "m": 300, "ll": large(P[0], P[1], SEAWARD, 300)},
              {"id": "17_1000", "m": 1000, "ll": large(P[0], P[1], SEAWARD, 1000)},
              {"id": "17_5000", "m": 5000, "ll": large(P[0], P[1], SEAWARD, 5000)},
              {"id": "faraman_1000", "m": 1000, "ll": large(43.35473, 4.68710, SEAWARD, 1000)},
              {"id": "rhone_PSL", "m": None, "ll": [43.30, 4.85]}]  # même point que l'essai turbidité (large du Grand Rhône)
    save("turbidite_points.json", points)

    # Tri : une date n'est lue en entier que si P à 1 km ou le témoin à 5 km a une valeur (passage du satellite, pas de nuage)
    temoins = [p for p in points if p["id"] in ("17_1000", "17_5000")]
    res, pixels = {}, {}

    def lire(p, t):
        b = gfi(p["ll"][0], p["ll"][1], t)
        v = valeur(b)
        if v is not None and p["id"] not in pixels:
            try:
                pr = json.loads(b.decode("utf8"))["features"][0]["properties"]; pixels[p["id"]] = [pr.get("lat"), pr.get("lon")]
            except Exception: pass
        return v

    def tester(t):
        out = {}
        for p in temoins:
            v = lire(p, t)
            if v is not None: out[p["id"]] = v; break
        return t, out

    with ThreadPoolExecutor(6) as ex:
        tri = [x for x in ex.map(tester, dates) if x[1]]
    log(len(tri), "dates avec une valeur à P 1 km ou au témoin sur", len(dates), "| requêtes", STATS)
    for k, (t, deja) in enumerate(tri):
        if time.time() - T0 > LIMITE_S:
            log("temps limite atteint, arrêt à", t); break
        reste = [p for p in points if p["id"] not in deja]
        with ThreadPoolExecutor(6) as ex:
            vals = list(ex.map(lambda p: lire(p, t), reste))
        res[t[:10]] = dict(deja, **{p["id"]: v for p, v in zip(reste, vals) if v is not None})
        if k % 50 == 0:
            log(k, "/", len(tri), t[:10], res[t[:10]])
            save("turbidite.json", {"couche": couche["id"], "unite": "FNU", "dates": res})
    for p in points: p["pixel_lu"] = pixels.get(p["id"])
    save("turbidite_points.json", points)
    save("journal.json", {"dates_couche": len(dates), "premiere": dates[:1], "derniere": dates[-1:], "dates_triees": len(tri),
                          "dates_lues": len(res), "requetes": STATS, "duree_s": round(time.time() - T0)})
    save("turbidite.json", {"couche": couche["id"], "unite": "FNU", "dates": res})




if __name__ == "__main__":
    log("===== turbidité poste 17")
    try:
        turbidite()
    except Exception as e:
        log("ERREUR", type(e).__name__, e)
    log("fini", STATS)
