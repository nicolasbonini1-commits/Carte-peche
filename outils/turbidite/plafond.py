"""Le panache sature-t-il ? Mémoire du débit plafonnée (cap) ou forme 1 - exp. Validation une année de côté."""
import numpy as np, pandas as pd, itertools
X = pd.read_pickle("outils/turbidite/donnees/indice_paires.pkl").reset_index(drop=True)
TAU = {"rhone": 8, "vidourle": 1, "lez": 5}
RIV = {"rhone": [1, 2, 4, 5], "vidourle": [5, 6, 7, 9], "lez": [11, 12, 13]}
CL = [0, 4, 10, 30, 1e9]
cls = lambda v: np.asarray(pd.cut(np.asarray(v), CL, labels=False, right=False))
def mem(r): return np.maximum(np.nan_to_num(X[f"mem{TAU[r]}_{r}"].values, nan=1.0), 1.0)
def design(caps):
    M = pd.DataFrame(index=X.index)
    for pid in sorted(X.poste.unique()): M[f"b{pid}"] = (X.poste == pid).astype(float)
    M["hsmax48"] = X.hsmax48.fillna(0); M["hs"] = X.hs.fillna(0); M["falling"] = X.falling.fillna(False).astype(float); M["ws24"] = X.ws24.fillna(0) / 10
    for r, pids in RIV.items():
        m = np.log10(np.minimum(mem(r), caps[r]))
        for pid in pids: M[f"{r}_{pid}"] = m * (X.poste == pid)
    return M
years = X.date.dt.year.values; y = X.l.values; obs = cls(X.tur.values)
rd = {r: X.poste.isin(p).values & (mem(r) >= 1.5) for r, p in RIV.items()}
anyrd = rd["rhone"] | rd["vidourle"] | rd["lez"]
def cv(M):
    p = np.full(len(X), np.nan)
    for yr in np.unique(years):
        c, *_ = np.linalg.lstsq(M[years != yr].values, y[years != yr], rcond=None); p[years == yr] = M[years == yr].values @ c
    return p
out = []
for cr, cv_, cl in itertools.product([2, 2.5, 3, 4, 99], [2, 3, 4, 6, 99], [2, 3, 99]):
    p = cv(design({"rhone": cr, "vidourle": cv_, "lez": cl}))
    e = (p - y) ** 2
    out.append((cr, cv_, cl, 1 - e.sum() / ((y - y.mean()) ** 2).sum(), 10 ** np.sqrt(e[anyrd].mean()),
                10 ** np.sqrt(e[rd["rhone"]].mean()), (cls(10 ** p)[anyrd] == obs[anyrd]).mean(), (cls(10**p)[rd['rhone']]==obs[rd['rhone']]).mean()))
R = pd.DataFrame(out, columns=["cap_rh", "cap_vi", "cap_lez", "R2_cv", "err_fleuve", "err_rhone", "classe_fleuve", "classe_rhone"])
print(R.sort_values("err_fleuve").head(8).round(3).to_string()); print(R[(R.cap_rh == 99) & (R.cap_vi == 99) & (R.cap_lez == 99)].round(3).to_string())

print("\n--- plafond Rhône 2 : calé 2020-2024, testé 2025-2026 ---")
from scipy.stats import spearmanr
tr = (X.date < "2025-01-01").values; te = ~tr
for caps in [{"rhone": 99, "vidourle": 99, "lez": 99}, {"rhone": 2, "vidourle": 99, "lez": 99}]:
    M = design(caps); c, *_ = np.linalg.lstsq(M[tr].values, y[tr], rcond=None); p = M.values @ c
    r2 = 1 - ((y[te] - p[te]) ** 2).sum() / ((y[te] - y[te].mean()) ** 2).sum()
    rr = te & rd["rhone"]
    print(caps["rhone"], f"R² {r2:.3f} rang {spearmanr(p[te], y[te]).correlation:.3f} | jours Rhône test n={rr.sum()} erreur ×{10**np.sqrt(((p-y)[rr]**2).mean()):.2f} biais ×{10**(p-y)[rr].mean():.2f} classe {(cls(10**p)[rr]==obs[rr]).mean():.0%}"
          f" | très chargée reconnue {((cls(10**p)==3)&(obs==3)&te).sum()}/{((obs==3)&te).sum()}")
    cs = pd.Series(c, index=M.columns); print("   k Rhône :", {k: round(v, 3) for k, v in cs.items() if k.startswith("rhone")}, "base 1:", round(cs.b1, 3), "hsmax48", round(cs.hsmax48, 3), "hs", round(cs.hs, 3), "ws24", round(cs.ws24, 3))
    d = X.assign(p=10 ** p)[X.date.between("2026-11-05", "2026-11-17")]
    print(d[["date", "poste", "tur", "p", "mem8_rhone", "mem1_vidourle", "mem5_lez", "hsmax48"]].round(2).to_string(index=False))
