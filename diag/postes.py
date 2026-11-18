# Relevé pour vérifier les postes : objets OSM (feux, digues, lieux-dits, embouchures) + profondeur EMODnet
import json, math, urllib.request, urllib.parse, re, sys
sys.path.insert(0, "js")
src = open("js/spots.js", encoding="utf-8").read()
spots = []
for m in re.finditer(r"id: (\d+), name: \"([^\"]+)\".*?lat: ([\d.]+), lon: ([\d.]+).*?seaward: (\d+)", src, re.S):
    spots.append(dict(id=int(m[1]), name=m[2], lat=float(m[3]), lon=float(m[4]), seaward=int(m[5])))
out = []
def get(url, data=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "carte-peche-diag/1.0 (github nicolasbonini1-commits)"})
    return json.load(urllib.request.urlopen(req, timeout=120))
q = """[out:json][timeout:90];(
node["seamark:type"~"light"](43.38,3.70,43.62,4.48);
node["man_made"="lighthouse"](43.38,3.70,43.62,4.48);
way["man_made"~"breakwater|groyne|pier"](43.38,3.70,43.62,4.48);
nwr["name"~"Grau|Aresquiers|Travers|Boucanet|Ponant|Prévost|Maguelone|Espiguette|Orgon|Couchant|Roquille|Pilou",i](43.38,3.70,43.62,4.48);
way["waterway"="river"]["name"~"Lez|Vidourle|Petit Rhône|Rhône",i](43.38,3.70,43.62,4.48);
);out center tags geom;"""
els = []
for ep in ("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"):
    try:
        els = get(ep, urllib.parse.urlencode({"data": q}).encode())["elements"]; out.append("Overpass OK : " + ep); break
    except Exception as ex:
        out.append(f"Overpass {ep} : {ex!r}")
def hav(a,b,c,d):
    r=math.radians; x=math.sin(r(c-a)/2)**2+math.cos(r(a))*math.cos(r(c))*math.sin(r(d-b)/2)**2; return 2*6371000*math.asin(math.sqrt(x))
feats=[]
for e in els:
    t=e.get("tags",{})
    if e["type"]=="node": la,lo=e["lat"],e["lon"]
    else:
        c=e.get("center") or {}; la,lo=c.get("lat"),c.get("lon")
    if la is None: continue
    kind = t.get("seamark:type") or t.get("man_made") or t.get("waterway") or t.get("natural") or t.get("place") or t.get("landuse") or "?"
    name = t.get("name") or t.get("seamark:name") or ""
    light = t.get("seamark:light:character","") + " " + t.get("seamark:light:colour","")
    item=dict(kind=kind,name=name,lat=round(la,5),lon=round(lo,5),light=light.strip())
    if kind=="river" and "geometry" in e:
        g=e["geometry"]; s=min(g,key=lambda p:p["lat"]); item["southmost"]=[round(s["lat"],5),round(s["lon"],5)]
    if kind in ("breakwater","groyne","pier") and "geometry" in e:
        g=e["geometry"]; item["ends"]=[[round(g[0]["lat"],5),round(g[0]["lon"],5)],[round(g[-1]["lat"],5),round(g[-1]["lon"],5)]]; item["len_m"]=round(sum(hav(g[i]["lat"],g[i]["lon"],g[i+1]["lat"],g[i+1]["lon"]) for i in range(len(g)-1)))
    feats.append(item)
out.append(f"OSM : {len(feats)} objets ; postes lus : {len(spots)}")
for s in spots:
    out.append(f"\n=== {s['id']} {s['name']} ({s['lat']}, {s['lon']}) seaward {s['seaward']}")
    near=sorted(feats,key=lambda f:hav(s['lat'],s['lon'],f['lat'],f['lon']))
    for f in near[:10]:
        d=hav(s['lat'],s['lon'],f['lat'],f['lon'])
        if d>3000: break
        out.append(f"  {round(d):5d} m  {f['kind']:12s} {f['name'][:40]:40s} {f['lat']},{f['lon']} {f.get('light','')} {('ends '+str(f['ends'])+' L='+str(f['len_m'])) if 'ends' in f else ''} {('sud '+str(f['southmost'])) if 'southmost' in f else ''}")
    for dist in (0,150,400):
        b=math.radians(s['seaward']); la=s['lat']+dist*math.cos(b)/111320; lo=s['lon']+dist*math.sin(b)/(111320*math.cos(math.radians(s['lat'])))
        try:
            j=get(f"https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT({lo:.5f}%20{la:.5f})")
            out.append(f"  profondeur à {dist} m vers la mer ({la:.5f},{lo:.5f}) : {j}")
        except Exception as ex:
            out.append(f"  profondeur à {dist} m : erreur {ex}")
out.append("\n=== Rivières (point le plus au sud dans la zone)")
for f in feats:
    if f['kind']=='river': out.append(f"  {f['name']} sud={f.get('southmost')}")
open("diag/out/postes.txt","w").write("\n".join(out))
