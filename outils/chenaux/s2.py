"""Extrait la réflectance Sentinel-2 L2A (Earth Search, AWS Open Data, sans compte) aux points des chenaux, graus,
étangs et en mer (points.json), pour une année (ou « test »). Écrit s2_<annee>.csv et quelques aperçus JPEG des jours d'eau chargée.
Réflectance = DN × scale + offset (métadonnées raster:bands de chaque bande)."""
import json, sys, os, time, math, csv
import numpy as np, rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform as rtransform
from pystac_client import Client
from PIL import Image

AN, OUT = sys.argv[1], sys.argv[2]
DATES = "2024-10-01/2024-11-30" if AN == "test" else (f"{AN}-01-01/{AN}-12-31")
PTS = json.load(open(os.path.join(os.path.dirname(__file__), "points.json")))["points"]
GROUPES = sorted({p["groupe"] for p in PTS})
BANDES = ["blue", "green", "red", "rededge1", "nir", "scl"]   # B02, B03, B04, B05, B08, SCL
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
                  GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2")
lons = [p["lon"] for p in PTS]; lats = [p["lat"] for p in PTS]
bbox = [min(lons) - 0.01, min(lats) - 0.01, max(lons) + 0.01, max(lats) + 0.01]
cl = Client.open("https://earth-search.aws.element84.com/v1")
items = list(cl.search(collections=["sentinel-2-c1-l2a"], bbox=bbox, datetime=DATES, query={"eo:cloud_cover": {"lt": 70}}).items())
print(len(items), "images", DATES, flush=True)
os.makedirs(os.path.join(OUT, "apercus"), exist_ok=True)
fout = open(os.path.join(OUT, f"s2_{AN}.csv"), "w", newline=""); w = csv.writer(fout)
B10 = [b for b in BANDES if b != "scl"]
w.writerow(["date", "heure_utc", "image", "tuile", "nuages_image", "point", "groupe", "type"] + B10 + [b + "_m3" for b in B10] + ["scl", "nuages_groupe"])
napercus = 0; t0 = time.time()
for k, it in enumerate(sorted(items, key=lambda i: i.datetime)):
    try:
        epsg = it.properties.get("proj:epsg") or int(str(it.properties.get("proj:code", "")).split(":")[-1])
        xs, ys = rtransform("EPSG:4326", f"EPSG:{epsg}", [p["lon"] for p in PTS], [p["lat"] for p in PTS])
        vals = {b: {} for b in BANDES}; med = {b: {} for b in BANDES}; qcl = {}; rgbq = {}
        for b in BANDES:
            a = it.assets[b]; rb = (a.extra_fields.get("raster:bands") or [{}])[0]
            sc, of = rb.get("scale", 1.0), rb.get("offset", 0.0)
            with rasterio.open(a.href) as ds:
                for g in GROUPES:
                    idx = [i for i, p in enumerate(PTS) if p["groupe"] == g]
                    gx = [xs[i] for i in idx]; gy = [ys[i] for i in idx]
                    m = 400  # marge (m) pour l'aperçu et les nuages autour
                    L, B_, R, T = min(gx) - m, min(gy) - m, max(gx) + m, max(gy) + m
                    if L < ds.bounds.left or R > ds.bounds.right or B_ < ds.bounds.bottom or T > ds.bounds.top: continue
                    win = from_bounds(L, B_, R, T, ds.transform).round_offsets().round_lengths()
                    arr = ds.read(1, window=win); tr = ds.window_transform(win)
                    if b == "scl":
                        qcl[g] = float(np.isin(arr, [3, 8, 9, 10]).mean()) if arr.size else None
                        if arr.size and (arr == 0).mean() > 0.5: qcl[g] = None   # hors de la trace du satellite
                    if b in ("red", "green", "blue"): rgbq.setdefault(g, {})[b] = (arr * sc + of)
                    for i in idx:
                        c, r = ~tr * (xs[i], ys[i]); c, r = int(c), int(r)
                        if b == "scl":
                            v = int(arr[r, c]) if 0 <= r < arr.shape[0] and 0 <= c < arr.shape[1] else None
                        else:
                            ok = 0 <= r < arr.shape[0] and 0 <= c < arr.shape[1] and arr[r, c] > 0
                            v = round(float(arr[r, c]) * sc + of, 5) if ok else None   # pixel du point (10 m ; 20 m pour rededge1)
                            sub = arr[max(r - 1, 0):r + 2, max(c - 1, 0):c + 2].astype(float); sub = sub[sub > 0]
                            med[b][i] = round(float(np.median(sub)) * sc + of, 5) if sub.size else None   # médiane 3 × 3
                        vals[b][i] = v
        for i, p in enumerate(PTS):
            g = p["groupe"]
            if g not in qcl or qcl[g] is None or vals["red"].get(i) is None: continue
            w.writerow([it.datetime.date(), it.datetime.strftime("%H:%M"), it.id, it.properties.get("s2:mgrs_tile") or it.properties.get("grid:code"),
                        it.properties.get("eo:cloud_cover"), p["id"], g, p["type"]] + [vals[b].get(i) for b in B10] + [med[b].get(i) for b in B10] + [vals["scl"].get(i), round(qcl[g], 3)])
        # aperçu des groupes sans nuages où un point de chenal est chargé (rouge > 0,05) : 80 par an au plus
        for g, d in rgbq.items():
            if napercus >= 80 or qcl.get(g) is None or qcl[g] > 0.3 or len(d) < 3: continue
            reds = [vals["red"].get(i) for i, p in enumerate(PTS) if p["groupe"] == g and p["type"] != "mer"]
            if not reds or max(r or 0 for r in reds) < 0.05: continue
            rgb = np.dstack([d["red"], d["green"], d["blue"]]); rgb = np.clip(rgb / 0.18, 0, 1) ** (1 / 1.6)
            Image.fromarray((rgb * 255).astype(np.uint8)).resize((rgb.shape[1] * 3, rgb.shape[0] * 3), Image.NEAREST).save(
                os.path.join(OUT, "apercus", f"{it.datetime.date()}_{g}.jpg"), quality=80)
            napercus += 1
    except Exception as e:
        print("erreur", it.id, repr(e)[:200], flush=True)
    if k % 20 == 0: print(k, it.id, f"{time.time() - t0:.0f} s", flush=True); fout.flush()
fout.close(); print("fini", f"{time.time() - t0:.0f} s")
