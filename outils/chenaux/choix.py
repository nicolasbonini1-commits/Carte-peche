"""Choisit les points de mesure Sentinel-2 dans les chenaux, ports, étangs (polygones d'eau OSM) et en mer."""
import os
import sys, json
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "geo.py")).read())
WID = {w[0]: w for w in WATER}
def poly_at(lon, lat, exclude=()):
    r = [w for w in WATER if w[0] not in exclude and inside(xy(lon, lat), w[3])]
    return sorted(r, key=lambda w: np.vstack(w[3]).shape[0])  # le plus petit d'abord
def sample(wid, n, marge=20, pas=10, near=None, rmax=None, seed=0):
    """n points dans le polygone, à ≥ marge m du bord, répartis (tirage du plus éloigné) ; option : à moins de rmax m de near."""
    lines = WID[wid][3]; A = np.vstack(lines)
    x0, y0 = A.min(0); x1, y1 = A.max(0)
    if near is not None:
        cx, cy = xy(*near); x0, x1, y0, y1 = max(x0, cx - rmax), min(x1, cx + rmax), max(y0, cy - rmax), min(y1, cy + rmax)
    gx, gy = np.meshgrid(np.arange(x0, x1, pas), np.arange(y0, y1, pas)); G = np.c_[gx.ravel(), gy.ravel()]
    if near is not None: G = G[np.hypot(G[:, 0] - cx, G[:, 1] - cy) <= rmax]
    if len(G) > 6000: G = G[np.random.default_rng(seed).choice(len(G), 6000, replace=False)]
    ok = [p for p in G if inside(p, lines) and dist(p, lines) >= marge]
    if not ok: return []
    ok = np.array(ok); ch = [ok[np.argmax(np.array([dist(p, lines) for p in ok]))]]
    while len(ch) < min(n, len(ok)):
        d = np.min([np.hypot(*(ok - c).T) for c in ch], axis=0); ch.append(ok[np.argmax(d)])
    return [(*ll(*p), round(dist(p, lines))) for p in ch]
