"""Turbidité estimée aux chenaux et étangs vs débits (Hub'Eau) et pluie (ERA5) : niveaux, jours après une crue."""
import json, sys
import numpy as np, pandas as pd
D = sys.argv[1] if len(sys.argv) > 1 else "donnees"
Q = pd.read_pickle(f"{D}/s2/chenaux_propres.pkl")
# débits : rapport à la médiane mensuelle depuis 2020 (comme features.py)
d = json.load(open(f"{D}/debits.json")); R = {}
for r in ("rhone", "vidourle", "lez"):
    q = pd.Series({pd.Timestamp(t): v / 1000 for t, v in d[r]["QmnJ"] if v is not None}).sort_index().asfreq("D").interpolate(limit=3)
    mm = pd.DataFrame([(pd.Timestamp(t).month, v / 1000) for t, v in d[r]["QmM"] if v is not None], columns=["m", "q"]).groupby("m").q.median()
    R[r] = q / q.index.month.map(mm).values
# pluie côte (zone W, C, E) : cumul des 3 jours précédant le passage (avant 11 h)
m = json.load(open(f"{D}/meteo_zones.json")); RAIN = {}
for z, a in zip(m["zones"], m["data"]):
    h = pd.Series(a["hourly"]["precipitation"], index=pd.to_datetime(a["hourly"]["time"])).fillna(0)
    RAIN[z] = h.rolling(72, min_periods=1).sum()
LIEN = {"petit-rhone": ("rhone", "E"), "saintes-maries": ("rhone", "E"), "grau-du-roi": ("vidourle", "C"), "ponant": ("vidourle", "C"),
        "grande-motte": ("vidourle", "C"), "carnon": (None, "C"), "etang-or": (None, "C"), "palavas": ("lez", "W"), "prevost": ("lez", "W"), "frontignan": (None, "W")}
def riv_feats(r, dates):
    s = R[r]
    out = pd.DataFrame(index=dates)
    out["q_veille"] = s.reindex(dates - pd.Timedelta(days=1)).values
    win = pd.concat([s.shift(1 + l).rename(l) for l in range(15)], axis=1).reindex(dates)
    out["pic15"] = win.max(axis=1).values; out["jours_pic"] = win.fillna(-1).idxmax(axis=1).values + 1
    for k in (1.5, 4):   # jours depuis le DERNIER jour où le débit a dépassé k fois la normale (pas depuis le plus haut)
        out[f"jours_dep{k}"] = (win.values >= k).argmax(axis=1).astype(float) + 1
        out.loc[~(win.values >= k).any(axis=1), f"jours_dep{k}"] = np.nan
    return out
Q = Q[Q.date >= "2020-01-02"].copy()
rows = []
for g, (r, z) in LIEN.items():
    x = Q[Q.groupe == g].copy()
    x["pluie72"] = RAIN[z].reindex(x.date + pd.Timedelta(hours=10)).values
    if r:
        f = riv_feats(r, pd.DatetimeIndex(x.date.unique())); x = x.merge(f, left_on="date", right_index=True)
    rows.append(x)
X = pd.concat(rows)
X.to_pickle(f"{D}/s2/chenaux_lien.pkl")
CL = [0, 10, 30, 60, 1e9]; NOM = ["claire/piquée <10", "teintée 10-30", "chargée 30-60", "marron >60"]
X["classe"] = pd.cut(X.fnu, CL, labels=NOM, right=False)
print("Turbidité estimée (FNU), médiane et 90 % des jours sans nuages, par point (type) :")
print(X.groupby(["groupe", "point"]).fnu.agg(n="size", mediane="median", p90=lambda v: v.quantile(0.9), max="max").round(1).to_string())
