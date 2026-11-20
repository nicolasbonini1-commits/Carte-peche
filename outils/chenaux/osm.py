"""Relève sur OpenStreetMap (Overpass) les chenaux, graus, canaux, embouchures, étangs et digues
entre les Saintes-Maries-de-la-Mer et Frontignan. Écrit osm_chenaux.json (géométries complètes)."""
import json, sys, urllib.request, urllib.parse, time
OUT = sys.argv[1]
BB = "43.40,3.70,43.62,4.50"  # sud, ouest, nord, est
Q = f"""[out:json][timeout:180];
(
  way["waterway"~"^(river|canal|riverbank|ditch|drain|stream)$"]({BB});
  way["natural"="water"]({BB});
  relation["natural"="water"]({BB});
  way["water"]({BB});
  way["man_made"~"^(breakwater|groyne|pier)$"]({BB});
  way["harbour"]({BB});
  way["landuse"="harbour"]({BB});
  nwr["name"~"([Gg]rau|[Cc]henal|[Pp]asse|[Ee]mbouchure|[Pp]ertuis)"]({BB});
);
out geom;"""
for url in ("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"):
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, data=urllib.parse.urlencode({"data": Q}).encode(),
                                      headers={"User-Agent": "Carte-peche essai (github.com/nicolasbonini1-commits/Carte-peche)"}), timeout=300).read()
        j = json.loads(data); break
    except Exception as e:
        print("échec", url, e); time.sleep(10)
else:
    sys.exit(1)
json.dump(j, open(OUT + "/osm_chenaux.json", "w"))
from collections import Counter
print(len(j["elements"]), "objets")
print(Counter((e["type"], next((f"{k}={e['tags'][k]}" for k in ("waterway", "natural", "man_made", "harbour", "landuse") if k in e.get("tags", {})), "autre")) for e in j["elements"]).most_common(30))
names = sorted({e["tags"].get("name") for e in j["elements"] if e.get("tags", {}).get("name")})
print(len(names), "noms :", names)
