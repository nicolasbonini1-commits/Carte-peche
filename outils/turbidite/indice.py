"""Indice « couleur de l'eau » simple, transposable dans l'appli, calé sur 2020-2024 et testé sur 2025-2026.
log10(TUR) = base(poste) + a·hsmax48 + b·hs + c·falling + Σ rivières k(poste, rivière)·log10(mémoire du débit)
mémoire du débit = max sur 15 j de (rapport à la normale du mois) × exp(-jours/τ_rivière), au moins 1."""
import json, itertools
import numpy as np, pandas as pd
from scipy.stats import spearmanr

D = pd.read_pickle("outils/turbidite/donnees/features.pkl")
T = json.load(open("outils/turbidite/donnees/s/turbidite.json"))
S = pd.DataFrame([(pd.Timestamp(d), k, v) for d, vals in T["dates"].items() for k, v in vals.items()], columns=["date", "pt", "tur"])
S = S[(S.tur > 0) & (S.tur < 500) & S.pt.str.contains(r"^\d+_300$")]
S["poste"] = S.pt.str.split("_").str[0].astype(int)
# Postes écartés : 3 et 14 (moins de 50 valeurs à 300 m), 8 (aucune : point dans les terres)
X = S.merge(D, on=["date", "poste"])
X = X[~X.poste.isin([3, 8, 14])].copy()
X["l"] = np.log10(X.tur)
RIV = {"rhone": [1, 2, 4, 5], "vidourle": [5, 6, 7, 9], "lez": [11, 12, 13]}
train = X.date < "2025-01-01"; test = ~train
CLASSES = [0, 4, 10, 30, 1e9]; NOMS = ["claire", "piquée", "teintée", "très chargée"]


def mem(r, tau):
    return np.log10(np.maximum(np.nan_to_num(X[f"mem{tau}_{r}"].values, nan=1.0), 1.0))


def design(taus):
    M = pd.DataFrame(index=X.index)
    for pid in sorted(X.poste.unique()): M[f"b{pid}"] = (X.poste == pid).astype(float)
    M["hsmax48"] = X.hsmax48.fillna(0); M["hs"] = X.hs.fillna(0); M["falling"] = X.falling.fillna(False).astype(float)
    M["ws24"] = X.ws24.fillna(0) / 10
    for r, pids in RIV.items():
        m = mem(r, taus[r])
        for pid in pids: M[f"{r}_{pid}"] = m * (X.poste == pid)
    return M


best = None
for tr, tv, tl in itertools.product([1, 2, 3, 5, 8], repeat=3):
    taus = {"rhone": tr, "vidourle": tv, "lez": tl}
    M = design(taus)
    coef, *_ = np.linalg.lstsq(M[train].values, X.l[train].values, rcond=None)
    p = M[test].values @ coef
    r2 = 1 - np.sum((X.l[test] - p) ** 2) / np.sum((X.l[test] - X.l[test].mean()) ** 2)
    if best is None or r2 > best[0]: best = (r2, taus, coef, M)
r2, taus, coef, M = best
cs = pd.Series(coef, index=M.columns)
X["pred"] = M.values @ coef
print("τ (jours) :", taus, f" R² test = {r2:.3f}  Spearman test = {spearmanr(X.pred[test], X.l[test]).correlation:.3f}")
print("\nTurbidité de base par poste (FNU, mer calme, débits normaux) :")
print({int(k[1:]): round(10 ** v, 1) for k, v in cs.items() if k.startswith("b")})
print("\nMultiplicateurs :")
print(f"  par mètre de houle max sur 48 h au poste : ×{10**cs.hsmax48:.2f} ; par mètre de houle au poste : ×{10**cs.hs:.2f} ;"
      f" mer qui retombe : ×{10**cs.falling:.2f} ; par 10 km/h de vent moyen 24 h : ×{10**cs.ws24:.2f}")
for r, pids in RIV.items():
    print(f"  {r} : débit 2× la normale →", {pid: f"×{2**cs[f'{r}_{pid}']:.2f}" for pid in pids},
          "; 5× →", {pid: f"×{5**cs[f'{r}_{pid}']:.2f}" for pid in pids})

# Classes et comparaison avec la règle actuelle (période de test)
obs = pd.cut(X.tur, CLASSES, labels=False, right=False)
new = pd.cut(10 ** X.pred, CLASSES, labels=False, right=False)
old = X.actuel  # 0 claire, 1 piquée, 2 teintée (la règle actuelle n'a pas « très chargée »)
obs3 = obs.clip(upper=2)
for nom, pr, ob in [("règle actuelle", old, obs3), ("indice proposé (3 classes)", new.clip(upper=2), obs3), ("indice proposé (4 classes)", new, obs)]:
    t = test
    acc = (pr[t] == ob[t]).mean(); near = (abs(pr[t] - ob[t]) <= 1).mean()
    print(f"\n{nom} — test 2025-2026 : bonne classe {acc:.0%}, à une classe près {near:.0%}")
    print(pd.crosstab(ob[t].map(dict(enumerate(NOMS))), pr[t].map(dict(enumerate(NOMS))), rownames=["mesuré"], colnames=["prévu"]))
X.to_pickle("outils/turbidite/donnees/indice_paires.pkl")
json.dump({"taus": taus, "coef": cs.to_dict(), "classes_FNU": CLASSES[1:-1], "r2_test": r2}, open("outils/turbidite/donnees/indice.json", "w"), indent=1)
