"""Compare la turbidité Sentinel-2 (FNU) aux postes avec (1) la règle actuelle de l'appli et (2) un indice proposé
calculé à partir des débits, du vent, de la houle et de la pluie. Validation : calé sur 2020-2024, testé sur 2025-2026."""
import json, math, itertools, sys
import numpy as np, pandas as pd
from scipy.stats import spearmanr

D = pd.read_pickle("outils/turbidite/donnees/features.pkl")
T = json.load(open("outils/turbidite/donnees/s/turbidite.json"))
P = {s["id"]: s for s in json.load(open("outils/turbidite/postes.json"))["spots"]}
DIST = sys.argv[1] if len(sys.argv) > 1 else "300"

rows = []
for d, vals in T["dates"].items():
    for k, v in vals.items():
        if "_" in k and k.split("_")[0].isdigit():
            p, m = k.split("_"); rows.append((pd.Timestamp(d), int(p), int(m), v))
S = pd.DataFrame(rows, columns=["date", "poste", "m", "tur"])
S = S[(S.tur > 0) & (S.tur < 500)]
print("valeurs satellite :", len(S), "| dates :", S.date.nunique(), "| par distance :", S.groupby("m").size().to_dict())
print("valeurs par poste (300 m / 1 km) :")
print(S.groupby(["poste", "m"]).size().unstack().fillna(0).astype(int).T.to_string())
print("quantiles TUR (FNU) à 300 m et 1 km :")
print(S.groupby("m").tur.quantile([.1, .25, .5, .75, .9, .97]).unstack().round(2))

X = S[S.m == int(DIST)].merge(D, on=["date", "poste"], how="inner")
X["ltur"] = np.log10(X.tur)
print("\npaires satellite / conditions :", len(X))

# ---- 1. Règle actuelle ----
print("\n=== Règle actuelle de l'appli (claire / piquée / teintée) ===")
g = X.groupby("actuel").tur
print(pd.DataFrame({"n": g.size(), "médiane FNU": g.median().round(2), "q75": g.quantile(.75).round(2), "q90": g.quantile(.9).round(2)}))
print("Spearman règle actuelle vs turbidité :", round(spearmanr(X.actuel, X.tur).correlation, 3))

# ---- 2. Indice proposé ----
MOUTHS = {"rhone": [(43.4515, 4.3945, 0.15), (43.33, 4.845, 0.85)],  # Petit Rhône (poste 1, à vérifier) ; Grand Rhône (approx.)
          "vidourle": [(43.5347, 4.1323, 1.0)],  # chenal du Grau-du-Roi (poste 6, feu OSM) ; passe du Ponant voisine
          "lez": [(43.5237, 3.9353, 1.0)]}        # embouchure du Lez (poste 12, feu OSM)


def hav(a, b, c, d):
    R = 6371; p1, p2 = math.radians(a), math.radians(c); dl = math.radians(d - b); dp = p2 - p1
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def bearing(a, b, c, d):
    y = math.sin(math.radians(d - b)) * math.cos(math.radians(c))
    x = math.cos(math.radians(a)) * math.sin(math.radians(c)) - math.sin(math.radians(a)) * math.cos(math.radians(c)) * math.cos(math.radians(d - b))
    return math.degrees(math.atan2(y, x)) % 360


GEO = {}
for pid, s in P.items():
    for r, ms in MOUTHS.items():
        GEO[(pid, r)] = [(hav(m[0], m[1], s["lat"], s["lon"]), bearing(m[0], m[1], s["lat"], s["lon"]), m[2]) for m in ms]


def river_terms(X, tau, L, drift):
    out = {}
    for r in MOUTHS:
        ex = np.log(np.maximum(np.nan_to_num(X[f"mem{tau}_{r}"].values, nan=1.0), 1.0))  # excès de débit (0 si débit ≤ normal)
        w = np.zeros(len(X))
        for i, pid in enumerate(X.poste.values):
            u, v = np.nan_to_num(X.u72.values[i]), np.nan_to_num(X.v72.values[i])
            for dkm, brg, share in GEO[(pid, r)]:
                push = (u * math.sin(math.radians(brg)) + v * math.cos(math.radians(brg)))  # km/h vers le poste
                f = math.exp(-dkm / L) * share * (1 + drift * math.tanh(push / 15))
                w[i] += max(f, 0)
        out[r] = ex * w
    return out


def design(X, tau, L, drift):
    rt = river_terms(X, tau, L, drift)
    M = pd.DataFrame({f"riv_{k}": v for k, v in rt.items()}, index=X.index)
    M["hs"] = X.hs.fillna(0); M["hsmax48"] = X.hsmax48.fillna(0); M["hs72"] = X.hs72.fillna(0)
    M["api"] = np.log1p(X.api.fillna(0)); M["on24"] = X.on24.fillna(0).clip(lower=0) / 20
    M["ws24"] = X.ws24.fillna(0) / 20
    M["falling"] = X.falling.fillna(False).astype(float)
    mo = X.date.dt.month; M["cos"] = np.cos(2 * np.pi * mo / 12); M["sin"] = np.sin(2 * np.pi * mo / 12)
    for pid in sorted(P):
        if pid != 1: M[f"p{pid}"] = (X.poste == pid).astype(float)
    M["c"] = 1.0
    return M


train = X.date < "2025-01-01"; test = ~train
best = None
for tau, L, drift in itertools.product([1, 2, 3, 5, 8], [2, 5, 10, 20, 40], [0, 0.5, 1]):
    M = design(X, tau, L, drift)
    A = M[train].values; y = X.ltur[train].values
    coef, *_ = np.linalg.lstsq(A, y, rcond=None)
    pred = M[test].values @ coef
    rho = spearmanr(pred, X.ltur[test]).correlation
    r2 = 1 - np.sum((X.ltur[test] - pred) ** 2) / np.sum((X.ltur[test] - X.ltur[test].mean()) ** 2)
    if best is None or r2 > best[0]: best = (r2, rho, tau, L, drift, coef, list(M.columns))
r2, rho, tau, L, drift, coef, cols = best
print(f"\n=== Indice proposé (meilleur réglage, testé sur 2025-2026) ===\nτ = {tau} j, portée L = {L} km, effet du vent = {drift}")
print(f"R² test = {r2:.3f}   Spearman test = {rho:.3f}")
print(pd.Series(coef, index=cols).round(3).to_string())

# Comparaison à la règle actuelle sur la même période de test
print("Spearman règle actuelle (test 2025-2026) :", round(spearmanr(X.actuel[test], X.tur[test]).correlation, 3))
# sans le terme poste (pour mesurer ce qu'apportent vraiment les conditions du jour)
M = design(X, tau, L, drift)
base_cols = [c for c in M.columns if c.startswith("p") or c in ("c", "cos", "sin")]
cb, *_ = np.linalg.lstsq(M[base_cols][train].values, X.ltur[train].values, rcond=None)
pb = M[base_cols][test].values @ cb
print("Spearman poste + saison seulement (test) :", round(spearmanr(pb, X.ltur[test]).correlation, 3))

X["pred"] = M.values @ coef
X.to_pickle(f"outils/turbidite/donnees/paires_{DIST}.pkl")
json.dump({"tau": tau, "L": L, "drift": drift, "coef": dict(zip(cols, map(float, coef)))}, open(f"outils/turbidite/donnees/modele_{DIST}.json", "w"), indent=1)
