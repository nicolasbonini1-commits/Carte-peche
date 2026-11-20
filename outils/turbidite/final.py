import numpy as np, pandas as pd
from scipy.stats import spearmanr
exec(open("outils/turbidite/plafond.py").read().split("out = []")[0])
tr = (X.date < "2025-01-01").values; te = ~tr
api = np.log1p(X.api.fillna(0).values)
emb = X.poste.isin([1, 6, 12]).values
for name, caps, add in [("en ligne", {"rhone": 99, "vidourle": 99, "lez": 99}, False), ("plafond Rhône 2", {"rhone": 2, "vidourle": 99, "lez": 99}, False),
                        ("+ pluie côte", {"rhone": 99, "vidourle": 99, "lez": 99}, True), ("plafond + pluie", {"rhone": 2, "vidourle": 99, "lez": 99}, True)]:
    M = design(caps)
    if add: M["api"] = api
    c, *_ = np.linalg.lstsq(M[tr].values, y[tr], rcond=None); p = M.values @ c
    r2 = 1 - ((y[te] - p[te]) ** 2).sum() / ((y[te] - y[te].mean()) ** 2).sum()
    pc = cv(M); r2cv = 1 - ((y - pc) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    o3 = obs.clip(max=2); a = (cls(10**p)[te] == obs[te]).mean()
    t_tei = ((obs == 2) & te); 
    print(f"{name:16s} test R² {r2:.3f} rang {spearmanr(p[te], y[te]).correlation:.3f} classe {a:.0%} | teintée reconnue {((cls(10**p)>=2)&(obs>=2)&te).sum()}/{((obs>=2)&te).sum()}"
          f" | embouchures 1-6-12 test classe {(cls(10**p)[te&emb]==obs[te&emb]).mean():.0%} | 1 an de côté R² {r2cv:.3f}")
    if add: print("   api coef", round(c[list(M.columns).index('api')], 4), f"→ 20 mm d'indice : ×{10**(c[list(M.columns).index('api')]*np.log1p(20)):.2f}, 60 mm : ×{10**(c[list(M.columns).index('api')]*np.log1p(60)):.2f}")
print("indice de pluie (mm) aux jours mesurés : médiane", np.median(X.api.dropna()).round(1), "90 %", np.percentile(X.api.dropna(), 90).round(1), "max", X.api.max().round(0))
