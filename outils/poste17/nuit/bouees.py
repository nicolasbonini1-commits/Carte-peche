#!/usr/bin/env python3
"""Poste 17, tâche de nuit A (23 nov. 2026), A1 : bouées Candhis plus proches de P que l'Espiguette ?
Même appel que notif/houle.js : API v1, clé seule dans l'en-tête Authorization (variable K = secret CANDHIS_TOKEN).
Au plus 8 requêtes (4 getCampInfos + 4 getCampTR sur 10 jours), aucune nouvelle tentative : la limite de 150/jour
est partagée avec les alertes. Écrit les réponses brutes et un résumé dans le dossier donné.
Usage : K=... python3 bouees.py DOSSIER
"""
import json, math, os, sys, time, datetime as dt
import urllib.request, urllib.error

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/bouees"
os.makedirs(OUT, exist_ok=True)
K = os.environ.get("K", "")
P = (43.36147, 4.59261)
CAMPS = {"01301": "Camargue", "01303": "Fos", "01306": "Golfe de Fos", "03001": "Espiguette"}
API = "https://candhis.cerema.fr/API/v1"
MAX_REQ = 8
journal = []


def km(a, b):
    R = 6371.0088
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def get(url):
    if len(journal) >= MAX_REQ:
        return None
    t0 = time.time(); e = {"url": url, "debut": dt.datetime.utcnow().isoformat() + "Z"}
    try:
        req = urllib.request.Request(url, headers={"Authorization": K, "User-Agent": "Carte-peche poste 17 (usage perso)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            b = r.read(); e["code"] = r.status
    except urllib.error.HTTPError as x:
        b = x.read(); e["code"] = x.code
    except Exception as x:
        b = None; e["code"] = None; e["erreur"] = f"{type(x).__name__}: {str(x)[:200]}"
    e["duree_s"] = round(time.time() - t0, 2); journal.append(e)
    print(e, flush=True)
    if b is None:
        return None
    try:
        return json.loads(b)
    except Exception:
        return {"_texte": b.decode("utf8", "replace")[:2000]}


def cherche(o, *noms):
    """Première valeur dont la clé contient un des noms (recherche dans tout le JSON, sans tenir compte de la casse)."""
    if isinstance(o, dict):
        for k, v in o.items():
            if any(n in k.lower() for n in noms) and not isinstance(v, (dict, list)):
                return v
        for v in o.values():
            r = cherche(v, *noms)
            if r is not None: return r
    elif isinstance(o, list):
        for v in o:
            r = cherche(v, *noms)
            if r is not None: return r
    return None


if not K:
    print("CANDHIS_TOKEN absent : rien demandé")
deb = (dt.date.today() - dt.timedelta(days=10)).isoformat(); fin = (dt.date.today() + dt.timedelta(days=1)).isoformat()
res = {}
for camp, nom in CAMPS.items():
    info = get(f"{API}/getCampInfos.php?camp={camp}") if K else None
    json.dump(info, open(f"{OUT}/candhis_infos_{camp}.json", "w"), ensure_ascii=False, indent=1)
    res[camp] = {"nom": nom, "infos_ok": bool(info) and (info.get("success") in (True, "True") if isinstance(info, dict) else False)}
for camp in CAMPS:
    tr = get(f"{API}/getCampTR.php?camp={camp}&dateDeb={deb}&dateFin={fin}") if K else None
    json.dump(tr, open(f"{OUT}/candhis_tr_{camp}.json", "w"), ensure_ascii=False)
    ok = isinstance(tr, dict) and tr.get("success") in (True, "True") and isinstance(tr.get("results"), list)
    dates = sorted(r[0] for r in tr["results"]) if ok and tr["results"] else []
    res[camp].update({"tr_ok": ok, "tr_message": tr.get("message") if isinstance(tr, dict) else None,
                      "nb_mesures_10j": len(dates), "derniere_mesure": dates[-1] if dates else None,
                      "entete": tr.get("entete") if ok else None})
for camp in CAMPS:
    info = json.load(open(f"{OUT}/candhis_infos_{camp}.json"))
    lat = cherche(info, "lat"); lon = cherche(info, "lon", "lng")
    try:
        lat, lon = float(lat), float(lon); res[camp]["lat"], res[camp]["lon"] = lat, lon
        res[camp]["distance_P_km"] = round(km(P, (lat, lon)), 1)
    except Exception:
        res[camp]["lat"] = res[camp]["lon"] = res[camp]["distance_P_km"] = None
    res[camp]["profondeur"] = cherche(info, "prof", "fond", "depth")
    res[camp]["etat"] = cherche(info, "etat", "statut", "status", "actif", "encours")
    res[camp]["date_fin"] = cherche(info, "datefin", "date_fin", "fin")
    res[camp]["date_debut"] = cherche(info, "datedeb", "date_deb", "debut", "mise")
json.dump({"P": P, "requetes": len(journal), "journal": [{k: v for k, v in e.items()} for e in journal], "bouees": res},
          open(f"{OUT}/bouees.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
print("requêtes Candhis :", len(journal))
