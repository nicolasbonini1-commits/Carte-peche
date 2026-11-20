"""Images en couleurs naturelles (Sentinel-2, 10 m) des zones Grau-du-Roi, Ponant / La Grande-Motte et Palavas
aux dates de dates_galerie.json, avec les points de mesure, pour que Nico juge « pêchable ou pas »."""
import json, os, sys
import numpy as np, rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform as rtransform
from pystac_client import Client
from PIL import Image, ImageDraw
OUT = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES", GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2")
DATES = json.load(open(os.path.join(H, "dates_galerie.json")))
PTS = json.load(open(os.path.join(H, "points.json")))["points"]
ZONES = {"grau-du-roi": (4.118, 43.527, 4.152, 43.552), "ponant-grande-motte": (4.072, 43.545, 4.150, 43.572), "palavas": (3.905, 43.518, 3.945, 43.540)}
cl = Client.open("https://earth-search.aws.element84.com/v1")
for d in DATES:
    for z, (lo0, la0, lo1, la1) in ZONES.items():
        its = []
        for col in ("sentinel-2-c1-l2a", "sentinel-2-l2a"):
            its = sorted(cl.search(collections=[col], bbox=[lo0, la0, lo1, la1], datetime=d).items(), key=lambda i: i.properties.get("eo:cloud_cover", 100))
            if its: break
        if not its: print("aucune image", d, z); continue
        it = its[0]; bands = []
        for b in ("red", "green", "blue"):
            a = it.assets[b]; rb = (a.extra_fields.get("raster:bands") or [{}])[0]; sc, of = rb.get("scale", 1e-4), rb.get("offset", 0.0)
            if col == "sentinel-2-l2a" and float(it.properties.get("s2:processing_baseline", 0) or 0) >= 4.0 and of == 0: of = -0.1
            with rasterio.open(a.href) as ds:
                xs, ys = rtransform("EPSG:4326", ds.crs, [lo0, lo1], [la0, la1])
                win = from_bounds(min(xs), min(ys), max(xs), max(ys), ds.transform).round_offsets().round_lengths()
                bands.append(ds.read(1, window=win) * sc + of); tr = ds.window_transform(win); crs = ds.crs
        rgb = np.clip(np.dstack(bands) / 0.16, 0, 1) ** (1 / 1.5)
        k = 4; im = Image.fromarray((rgb * 255).astype(np.uint8)).resize((rgb.shape[1] * k, rgb.shape[0] * k), Image.LANCZOS)
        dr = ImageDraw.Draw(im)
        for p in PTS:
            if not (lo0 < p["lon"] < lo1 and la0 < p["lat"] < la1): continue
            x, y = rtransform("EPSG:4326", crs, [p["lon"]], [p["lat"]]); c, r = ~tr * (x[0], y[0])
            dr.ellipse([c * k - 7, r * k - 7, c * k + 7, r * k + 7], outline=(255, 0, 255), width=3)
        dr.rectangle([0, 0, 520, 34], fill=(0, 0, 0)); dr.text((8, 8), f"{d}  {z}  {it.id}", fill=(255, 255, 255))
        im.save(os.path.join(OUT, f"{d}_{z}.jpg"), quality=85); print("ok", d, z, it.id, flush=True)
