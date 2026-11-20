"""Grosses crues : toute la côte se charge-t-elle (pluie, étangs, petits fleuves) au-delà du panache local ?"""
import numpy as np, pandas as pd
exec(open("outils/turbidite/plafond.py").read().split("out = []")[0])
base_caps = {"rhone": 2, "vidourle": 99, "lez": 99}
big = np.maximum(np.nan_to_num(X.mem3_vidourle.values, nan=1), np.nan_to_num(X.mem3_lez.values, nan=1))
bigday = big >= 4
print("jours (poste) avec Vidourle ou Lez ≥ 4 fois (mémoire 3 j) :", bigday.sum(), "dates :", X.date[bigday].dt.date.nunique())
def run(name, add):
    M = design(base_caps)
    for k, v in add.items(): M[k] = v
    p = cv(M); e = (p - y) ** 2
    print(f"{name:34s} R² cv {1 - e.sum()/((y-y.mean())**2).sum():.3f} | grosses crues : erreur ×{10**np.sqrt(e[bigday].mean()):.2f} biais ×{10**(p-y)[bigday].mean():.2f}"
          f" classe {(cls(10**p)[bigday]==obs[bigday]).mean():.0%} | très chargée reconnue {((cls(10**p)==3)&(obs==3)).sum()}/{(obs==3).sum()}")
    return M
run("plafond Rhône 2 (référence)", {})
for tau in (1, 3, 5):
    g = np.log10(np.maximum(np.nan_to_num(X[f"mem{tau}_vidourle"].values, nan=1), np.nan_to_num(X[f"mem{tau}_lez"].values, nan=1)).clip(1))
    run(f"+ crue régionale (τ {tau} j), tous postes", {"reg": g})
run("+ pluie des jours d'avant (côte)", {"api": np.log1p(X.api.fillna(0).values)})
M = run("+ crue régionale τ 3 + pluie", {"reg": np.log10(big.clip(1)), "api": np.log1p(X.api.fillna(0).values)})
c, *_ = np.linalg.lstsq(M.values, y, rcond=None); cs = pd.Series(c, index=M.columns)
print("coefficients (tout 2020-2026) : reg", round(cs.reg, 3), f"(Vidourle ou Lez 10× → ×{10**cs.reg:.2f} partout)", "api", round(cs.api, 3))
