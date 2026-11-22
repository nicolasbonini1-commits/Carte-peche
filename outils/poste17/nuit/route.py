#!/usr/bin/env python3
"""Poste 17, tâche de nuit A (23 nov. 2026), A3 : temps de route Poulx → parking de Beauduc, et Poulx → poste 1 pour comparer.
Nominatim (coordonnées de Poulx), puis OSRM en voiture (router.project-osrm.org, comme l'appli), serveur de secours
routing.openstreetmap.de. User-Agent et délai d'attente sur chaque requête (LECONS du 20 nov.).
« Écart » = distance entre le point demandé et le point où OSRM accroche la route (waypoints[].distance, en m) :
si la piste de Beauduc manque dans le graphe routier, l'écart est grand.
Usage : python3 route.py DOSSIER
"""
import json, math, os, sys, time, datetime as dt
import urllib.request, urllib.parse

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/route"
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Carte-peche poste 17 (usage perso ; nicolasbonini1-commits/Carte-peche)"}
CIBLES = {"parking_beauduc": (43.40731, 4.59691), "poste_1": (43.44995, 4.39771)}
journal = []


def get(url):
    t0 = time.time(); e = {"url": url, "debut": dt.datetime.utcnow().isoformat() + "Z"}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
            b = r.read(); e["code"] = r.status
    except Exception as x:
        b = None; e["code"] = getattr(x, "code", None); e["erreur"] = f"{type(x).__name__}: {str(x)[:200]}"
    e["duree_s"] = round(time.time() - t0, 2); journal.append(e); print(e, flush=True)
    try:
        return json.loads(b) if b else None
    except Exception:
        return None


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


# 1. Poulx
q = urllib.parse.urlencode({"q": "Poulx, Gard, France", "format": "jsonv2", "limit": 3, "addressdetails": 1})
nom = get(f"https://nominatim.openstreetmap.org/search?{q}")
src = "nominatim"
if not nom:
    nom = get("https://photon.komoot.io/api/?" + urllib.parse.urlencode({"q": "Poulx Gard", "limit": 3})); src = "photon"
    nom = [{"lat": f["geometry"]["coordinates"][1], "lon": f["geometry"]["coordinates"][0], "display_name": f["properties"].get("name")}
           for f in (nom or {}).get("features", [])]
json.dump(nom, open(f"{OUT}/poulx_{src}.json", "w"), ensure_ascii=False, indent=1)
poulx = (float(nom[0]["lat"]), float(nom[0]["lon"]))
print("Poulx", src, poulx, nom[0].get("display_name"))

# 2. Routes
res = {"poulx": {"source": src, "lat": poulx[0], "lon": poulx[1], "nom": nom[0].get("display_name")}, "routes": {}}
for cle, (la, lo) in CIBLES.items():
    path = f"{poulx[1]},{poulx[0]};{lo},{la}?overview=full&geometries=geojson&steps=false"
    for serveur in ("https://router.project-osrm.org/route/v1/driving/", "https://routing.openstreetmap.de/routed-car/route/v1/driving/"):
        j = get(serveur + path)
        if j and j.get("code") == "Ok":
            break
    json.dump(j, open(f"{OUT}/osrm_{cle}.json", "w"))
    if not (j and j.get("code") == "Ok"):
        res["routes"][cle] = {"erreur": (j or {}).get("code", "pas de réponse")}; continue
    r, w = j["routes"][0], j["waypoints"]
    fin = w[1]["location"]  # [lon, lat] du point accroché
    res["routes"][cle] = {"serveur": serveur.split("/")[2], "distance_km": round(r["distance"] / 1000, 1),
                          "duree_min": round(r["duration"] / 60), "ecart_depart_m": round(w[0]["distance"]),
                          "ecart_arrivee_m": round(w[1]["distance"]), "arrivee_accrochee": [fin[1], fin[0]],
                          "ecart_arrivee_m_calcule": round(km((la, lo), (fin[1], fin[0])) * 1000),
                          "nom_voie_arrivee": w[1].get("name")}
res["vol_oiseau_poulx_parking_km"] = round(km(poulx, CIBLES["parking_beauduc"]), 1)
res["journal"] = journal
json.dump(res, open(f"{OUT}/route.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in res.items() if k != "journal"}, ensure_ascii=False, indent=1))
