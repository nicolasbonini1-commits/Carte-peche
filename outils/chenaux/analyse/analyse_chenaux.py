"""Analyse de l'essai chenaux : réflectance Sentinel-2 → turbidité (FNU) calée sur Copernicus Marine, puis lien avec débits et pluie."""
import json, glob, sys, os
import numpy as np, pandas as pd
D = sys.argv[1] if len(sys.argv) > 1 else "donnees"
S = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(f"{D}/s2/s2_20*.csv"))], ignore_index=True)
S["date"] = pd.to_datetime(S.date)
if "collection" not in S: S["collection"] = "sentinel-2-c1-l2a"; S["baseline"] = np.nan; S["offset_rouge"] = -0.1
B = ["blue", "green", "red", "rededge1", "nir"]
# ancienne collection, ligne de base ≥ 4.00, sans offset dans les métadonnées → retirer 0,1
fix = (S.collection == "sentinel-2-l2a") & (pd.to_numeric(S.baseline, errors="coerce") >= 4.0) & (S.offset_rouge.fillna(0) == 0)
for b in B + [b + "_m3" for b in B]: S.loc[fix, b] = S.loc[fix, b] - 0.1
S["corrige"] = fix
# une valeur par (date, point) : C1 d'abord, puis le moins de nuages
S["pri"] = (S.collection != "sentinel-2-c1-l2a").astype(int)
S = S.sort_values(["pri", "nuages_groupe"]).drop_duplicates(["date", "point"]).sort_values(["date", "point"])
n0 = len(S)
ok = (S.nuages_groupe < 0.10) & S.scl.isin([2, 5, 6, 7]) & (S.blue < 0.15) & ~((S.nir > 1.2 * S.red) & (S.nir > 0.04)) & (S.red > 0)
Q = S[ok].copy()
print(f"mesures : {n0} ; gardées (sans nuages, pixel d'eau) : {len(Q)} ; dates : {Q.date.nunique()} de {Q.date.min().date()} à {Q.date.max().date()}")
print("mer, rouge médian par collection / correction :", Q[Q.type == "mer"].groupby(["collection", "corrige"]).red.median().round(4).to_dict())
Q.to_pickle(f"{D}/s2/chenaux_propres.pkl")

# ---- calage réflectance rouge → turbidité (FNU) sur le produit Copernicus Marine (même satellite, mêmes jours) ----
T = json.load(open(f"{D}/turbidite.json")); TP = json.load(open(f"{D}/turbidite_points.json"))
pts = json.load(open(os.environ.get("POINTS", "outils/chenaux/points.json")))["points"]
pair = {}
for p in pts:
    best = min(TP, key=lambda t: (t["ll"][0] - p["lat"]) ** 2 + (t["ll"][1] - p["lon"]) ** 2)
    dm = np.hypot((best["ll"][0] - p["lat"]) * 110540, (best["ll"][1] - p["lon"]) * 80900)
    if dm < 60: pair[p["id"]] = best["id"]
Tdf = pd.DataFrame([(pd.Timestamp(d), k, v) for d, vals in T["dates"].items() for k, v in vals.items()], columns=["date", "tp", "tur"])
Tdf = Tdf[(Tdf.tur > 0) & (Tdf.tur < 500)]
C = Q[Q.point.isin(pair)].assign(tp=lambda x: x.point.map(pair)).merge(Tdf, on=["date", "tp"])
print(f"\nCalage : {len(C)} paires (points en mer communs : {sorted(set(C.point))})")
from scipy.optimize import curve_fit
f = lambda r, A, Cc: A * r / (1 - r / Cc)          # forme de Nechad et al. (2009, 2010)
C["rn"] = (C.red - C.nir); C = C[C.rn > 0.0005]
x = C.rn.clip(0.0005, 0.15).values; y = C.tur.values
# loi puissance (régression en log) : FNU = A × ρ^Cc, ρ = rouge − proche infrarouge (B4 − B8, retire reflets et brume)
lx, ly = np.log10(x), np.log10(y)   # régression « axe majeur réduit » : ne tasse pas les fortes valeurs (contrairement aux moindres carrés)
Cc = np.std(ly) / np.std(lx); A = 10 ** (ly.mean() - Cc * lx.mean())
f = lambda r, A, Cc: A * r ** Cc
pr = f(x, A, Cc); r = np.corrcoef(np.log10(pr), np.log10(y))[0, 1]
print(f"FNU = {A:.0f} × ρ^{Cc:.2f}, ρ = rouge − proche infrarouge ; corrélation (log) {r:.2f} ; erreur typique ×{10**np.std(np.log10(pr/y)):.2f}")
for lo, hi in [(0, 4), (4, 10), (10, 30), (30, 500)]:
    m = (y >= lo) & (y < hi); print(f"   Copernicus {lo}-{hi} FNU : n={m.sum()}, estimé médian {np.median(pr[m]) if m.any() else float('nan'):.1f}")
Q["fnu"] = f((Q.red - Q.nir).clip(0.0005), A, Cc)
C["est"] = pr; print(C.assign(e=np.log10(pr / y)).groupby("point").e.agg(lambda e: f"biais ×{10**e.mean():.2f}, écart ×{10**e.std():.2f}").to_string())
Q.to_pickle(f"{D}/s2/chenaux_propres.pkl"); json.dump({"A": A, "C": Cc, "r_log": r, "n": int(len(C))}, open(f"{D}/s2/calage.json", "w"))
