"""Essai 20 nov. 2026 : le panache des fleuves dépend-il du vent et de la houle ?
Part de l'indice en ligne (τ Rhône 8 j, Vidourle 1 j, Lez 5 j) et ajoute des termes d'interaction.
Calé 2020-2024, testé 2025-2026, plus validation « une année laissée de côté » (2020 → 2026)."""
import json, sys
import numpy as np, pandas as pd
from scipy.stats import spearmanr

X = pd.read_pickle("outils/turbidite/donnees/indice_paires.pkl").reset_index(drop=True)
P = {s["id"]: s for s in json.load(open("outils/turbidite/postes.json"))["spots"]}
TAU = {"rhone": 8, "vidourle": 1, "lez": 5}
RIV = {"rhone": [1, 2, 4, 5], "vidourle": [5, 6, 7, 9], "lez": [11, 12, 13]}
MOUTH = {"rhone": 1, "vidourle": 6, "lez": 12}   # poste à l'embouchure

def lm(r): return np.log10(np.maximum(np.nan_to_num(X[f"mem{TAU[r]}_{r}"].values, nan=1.0), 1.0))

def design(extra):
    M = pd.DataFrame(index=X.index)
    for pid in sorted(X.poste.unique()): M[f"b{pid}"] = (X.poste == pid).astype(float)
    M["hsmax48"] = X.hsmax48.fillna(0); M["hs"] = X.hs.fillna(0); M["falling"] = X.falling.fillna(False).astype(float)
    M["ws24"] = X.ws24.fillna(0) / 10
    u = X.u24.fillna(0) / 10; on = X.on24.fillna(0) / 10; h48 = X.hsmax48.fillna(0)
    for r, pids in RIV.items():
        m = lm(r)
        for pid in pids: M[f"{r}_{pid}"] = m * (X.poste == pid)
        dx = X.poste.map(lambda p: np.sign(P[p]["lon"] - P[MOUTH[r]]["lon"])).values
        inr = X.poste.isin(pids).values
        if "long" in extra:   # vent qui pousse le panache vers le poste (le long de la côte, + = vers le poste)
            M[f"long_{r}"] = m * u * dx * inr
        if "long_post" in extra:  # même chose, un coefficient par poste
            for pid in pids:
                if pid != MOUTH[r]: M[f"longp_{r}_{pid}"] = m * u * dx * (X.poste == pid)
        if "on" in extra:     # vent de mer (+) ou de terre (−) : panache plaqué ou poussé au large
            M[f"on_{r}"] = m * on * inr
        if "houle" in extra:  # houle des 48 h × fleuve
            M[f"houle_{r}"] = m * h48 * inr
    if "on_sea" in extra: M["on24"] = on
    return M

def fit_eval(M, train, test):
    c, *_ = np.linalg.lstsq(M[train].values, X.l[train].values, rcond=None)
    p = M.values @ c
    y = X.l.values
    r2 = 1 - np.sum((y[test] - p[test]) ** 2) / np.sum((y[test] - y[test].mean()) ** 2)
    return c, p, r2

CL = [0, 4, 10, 30, 1e9]
def cls(v): return np.asarray(pd.cut(np.asarray(v), CL, labels=False, right=False))

# jours « fleuve » : embouchures et voisins, mémoire du débit ≥ 1,5
riverday = np.zeros(len(X), bool)
for r, pids in RIV.items(): riverday |= X.poste.isin(pids).values & (np.nan_to_num(X[f"mem{TAU[r]}_{r}"].values, nan=1) >= 1.5)

MODELS = {"indice en ligne": [], "+ vent le long de la côte": ["long"], "+ vent le long, par poste": ["long_post"],
          "+ vent de mer / de terre": ["on"], "+ houle × fleuve": ["houle"], "+ vent de mer partout": ["on_sea"],
          "tout": ["long", "on", "houle"]}
train = (X.date < "2025-01-01").values; test = ~train
years = X.date.dt.year.values
obs = cls(X.tur.values)
print(f"paires : {len(X)} (test {test.sum()}) ; jours fleuve ≥ 1,5 : {riverday.sum()} (test {(riverday & test).sum()})\n")
res = {}
for name, ex in MODELS.items():
    M = design(ex)
    c, p, r2 = fit_eval(M, train, test)
    sp = spearmanr(p[test], X.l[test]).correlation
    rm_r = np.sqrt(np.mean((p - X.l.values)[test & riverday] ** 2))
    acc_r = (cls(10 ** p)[test & riverday] == obs[test & riverday]).mean()
    # une année laissée de côté
    cv = np.full(len(X), np.nan)
    for y in np.unique(years):
        cc, *_ = np.linalg.lstsq(M[years != y].values, X.l.values[years != y], rcond=None)
        cv[years == y] = M[years == y].values @ cc
    cv_r2 = 1 - np.sum((X.l - cv) ** 2) / np.sum((X.l - X.l.mean()) ** 2)
    cv_rm_r = np.sqrt(np.mean((cv - X.l.values)[riverday] ** 2))
    cv_acc_r = (cls(10 ** cv)[riverday] == obs[riverday]).mean()
    cs = pd.Series(c, index=M.columns)
    res[name] = dict(r2=r2, sp=sp, rm_r=rm_r, acc_r=acc_r, cv_r2=cv_r2, cv_rm_r=cv_rm_r, cv_acc_r=cv_acc_r,
                     coef={k: round(v, 4) for k, v in cs.items() if not k.startswith("b")}, n=M.shape[1])
    print(f"{name:28s} n={M.shape[1]:2d} | test R² {r2:.3f} rang {sp:.3f} | jours fleuve : erreur ×{10**rm_r:.2f} bonne classe {acc_r:.0%}"
          f" | 1 an de côté : R² {cv_r2:.3f}, jours fleuve erreur ×{10**cv_rm_r:.2f} bonne classe {cv_acc_r:.0%}")
    extra = {k: v for k, v in cs.items() if k.split("_")[0] in ("long", "longp", "on", "houle", "on24")}
    if extra: print("      coefficients ajoutés :", {k: round(v, 3) for k, v in extra.items()})
json.dump(res, open("outils/turbidite/interactions_resultat.json", "w"), indent=1, ensure_ascii=False)
