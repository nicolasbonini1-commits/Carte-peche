import json, math, numpy as np
import os
E = json.load(open(os.environ.get("OSM_JSON", "osm_chenaux.json")))["elements"]
LAT0 = 43.5
def xy(lon, lat): return ((lon - 4.0) * 111320 * math.cos(math.radians(LAT0)), (lat - LAT0) * 110540)
def ll(x, y): return (x / (111320 * math.cos(math.radians(LAT0))) + 4.0, y / 110540 + LAT0)
BY = {(e["type"], e["id"]): e for e in E}
def segs_of(e):
    out = []
    if e["type"] == "way" and "geometry" in e:
        g = e["geometry"]; out.append(np.array([xy(p["lon"], p["lat"]) for p in g if p]))
    elif e["type"] == "relation":
        for m in e.get("members", []):
            g = m.get("geometry")
            if g: out.append(np.array([xy(p["lon"], p["lat"]) for p in g if p]))
    return out
WATER = []
for e in E:
    t = e.get("tags", {})
    if t.get("natural") == "water" or "water" in t or t.get("waterway") == "riverbank" or t.get("landuse") == "harbour":
        if e["type"] == "way" and e.get("geometry") and e["geometry"][0] != e["geometry"][-1]: continue
        lines = segs_of(e)
        if lines: WATER.append((e["type"][0] + str(e["id"]), t.get("name", ""), t.get("water", t.get("natural", "")), lines))
COAST = [segs_of(e)[0] for e in E if e.get("tags", {}).get("natural") == "coastline" and e["type"] == "way"]
def inside(P, lines):
    x, y = P; c = False
    for L in lines:
        a = L[:-1]; b = L[1:]
        cond = ((a[:, 1] > y) != (b[:, 1] > y))
        with np.errstate(divide="ignore", invalid="ignore"):
            xi = a[:, 0] + (y - a[:, 1]) * (b[:, 0] - a[:, 0]) / (b[:, 1] - a[:, 1])
        c ^= bool((np.count_nonzero(cond & (x < xi))) % 2)
    return c
def dist(P, lines):
    best = 1e12; p = np.array(P)
    for L in lines:
        a = L[:-1]; b = L[1:]; ab = b - a; t = np.clip(((p - a) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-9), 0, 1)
        d = np.hypot(*(a + ab * t[:, None] - p).T); best = min(best, d.min()) if len(d) else best
    return best
def water_at(lon, lat):
    P = xy(lon, lat); res = []
    for wid, n, k, lines in WATER:
        if inside(P, lines): res.append((wid, n, k, round(dist(P, lines))))
    return res
def coast_dist(lon, lat): return round(min(dist(xy(lon, lat), [L]) for L in COAST))
def line_pts(eid, typ="way"):
    e = BY[(typ, eid)]; return [(p["lon"], p["lat"]) for p in e["geometry"]]
