#!/usr/bin/env python3
"""Poste 17 (pointe de Beauduc), tâche de nuit A du 23 nov. 2026 : couleur de l'eau à P.
Même chaîne que outils/turbidite/features.py + indice.py + final.py (branche essai-turbidite), pour un seul poste :
- conditions à 11 h (heure de Paris) au point de zone E (43,40 / 4,30), règle de l'appli pour la houle au poste
  (exposition 0,35 + 0,65·cos(écart à seaward = 186°), pas de facteur « grau ») ;
- mémoire du débit du Rhône (Tarascon) : max sur 15 j du rapport (débit de la veille / médiane du mois depuis 1990) × e^(−j/8) ;
- coefficients communs FIXÉS (js/model.js, M.TURB) : hsmax48 0,3653 ; hs 0,1732 ; ws24 0,1049 (par 10 km/h) ; pluie 0,0431·ln(1+indice) ;
- seuls la base du poste 17 et son coefficient Rhône k sont calés (moindres carrés, 2020-2024), test sur 2025-2026.
Usage : python3 analyse.py RELEVES_DIR TURBIDITE_JSON SORTIE_DIR [turbidite_16_postes.json]
"""
import json, math, sys, os
import numpy as np, pandas as pd
from scipy.stats import spearmanr

R, TJ, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
ANCIEN = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(OUT, exist_ok=True)
SEAWARD, TYPE, ZONE = 186, "plage", "E"
FIX = {"hsmax48": 0.3653, "hs": 0.1732, "ws24": 0.1049, "api": 0.0431}
TAU = 8
CL = [0, 4, 10, 30, 1e9]; NOMS = ["claire", "piquée", "teintée", "très chargée"]
cls = lambda v: np.asarray(pd.cut(np.asarray(v, dtype=float), CL, labels=False, right=False))
out = {"methode": __doc__.strip().splitlines()[1:6]}


def angdiff(a, b):
    return abs(((a - b + 180) % 360) - 180)


# ---- débits (copie de features.py, Rhône seul) ----
d = json.load(open(f"{R}/debits.json"))
q = pd.Series({pd.Timestamp(t): v / 1000 for t, v in d["rhone"]["QmnJ"] if v is not None}).sort_index().asfreq("D").interpolate(limit=3)
mm = pd.DataFrame([(pd.Timestamp(t).month, v / 1000) for t, v in d["rhone"]["QmM"] if v is not None], columns=["m", "q"])
med = mm.groupby("m").q.median()
ratio = q / q.index.month.map(med).values

# ---- météo + houle horaires de la zone E (copie de features.py) ----
m = json.load(open(f"{R}/meteo_zones.json")); h = json.load(open(f"{R}/houle_zones.json"))
iz = m["zones"].index(ZONE)
w = pd.DataFrame(m["data"][iz]["hourly"]); w["time"] = pd.to_datetime(w["time"]); w = w.set_index("time")
hw = pd.DataFrame(h["data"][iz]["hourly"]); hw["time"] = pd.to_datetime(hw["time"]); hw = hw.set_index("time")
w = w.join(hw, how="left")
out["zone"] = {"nom": ZONE, "meteo_point": [m["data"][iz]["latitude"], m["data"][iz]["longitude"]],
               "houle_point": [h["data"][iz]["latitude"], h["data"][iz]["longitude"]], "houle_modele": h.get("modele")}
exp_ = 0.35 + 0.65 * np.maximum(0, np.cos(np.radians(angdiff(w.wave_direction.fillna(SEAWARD), SEAWARD))))
w["hs_loc"] = w.wave_height * exp_ * (0.8 if TYPE == "grau" else 1)
rain = w.precipitation.fillna(0).values; k_ = 0.85 ** (1 / 24); api = np.zeros(len(rain)); acc = 0
for i, x in enumerate(rain):
    acc = acc * k_ + x; api[i] = acc
w["api"] = api
pk = w.hs_loc.rolling(36, min_periods=1).max(); w["falling"] = (pk >= 1.0) & (w.hs_loc < 0.65 * pk)
daily = pd.DataFrame(index=pd.date_range("2020-01-02", w.index[-1].normalize(), freq="D"))
at = daily.index + pd.Timedelta(hours=11)
daily["hs"] = w.hs_loc.reindex(at).values; daily["falling"] = w.falling.reindex(at).values; daily["api"] = w.api.reindex(at).values
daily["hsmax48"] = w.hs_loc.rolling(48, min_periods=12).max().reindex(at).values
daily["ws24"] = w.wind_speed_10m.rolling(24, min_periods=12).mean().reindex(at).values
daily["ratio"] = ratio.reindex(daily.index - pd.Timedelta(days=1)).values  # débit de la veille, comme l'appli
mem = np.full(len(daily), np.nan)
for lag in range(15):
    mem = np.fmax(mem, ratio.reindex(daily.index - pd.Timedelta(days=1 + lag)).values * np.exp(-lag / TAU))
daily["mem"] = mem
# jours depuis le dernier jour ≥ 1,6 fois la normale (sur les 21 jours d'avant ; débit de la veille = 0 jour)
jp = np.full(len(daily), np.nan)
for lag in range(20, -1, -1):
    r_ = ratio.reindex(daily.index - pd.Timedelta(days=1 + lag)).values
    jp = np.where(r_ >= 1.6, lag, jp)
daily["jours_pic"] = jp
daily.index.name = "date"; daily = daily.reset_index()

# ---- turbidité mesurée ----
T = json.load(open(TJ))["dates"]
S = pd.DataFrame([(pd.Timestamp(dd), kk, v) for dd, vals in T.items() for kk, v in vals.items()], columns=["date", "pt", "tur"])
S = S[(S.tur > 0) & (S.tur < 500)]
out["valeurs_par_point"] = S.groupby("pt").size().to_dict()
out["periode_mesures"] = [str(S.date.min().date()), str(S.date.max().date())]
out["periode_conditions"] = [str(daily.date.min().date()), str(daily.dropna(subset=["hs", "ratio"]).date.max().date())]
PT = "17_300" if out["valeurs_par_point"].get("17_300", 0) >= 50 else "17_1000"
out["point_utilise"] = PT

# ---- calage base + k (coefficients communs fixés) ----
X = S[S.pt == PT].merge(daily, on="date").dropna(subset=["hs", "ratio", "mem"]).copy()
X["l"] = np.log10(X.tur)
X["fixe"] = (FIX["hsmax48"] * X.hsmax48.fillna(0) + FIX["hs"] * X.hs.fillna(0) + FIX["ws24"] * X.ws24.fillna(0) / 10
             + FIX["api"] * np.log1p(X.api.fillna(0).clip(lower=0)))
X["lm"] = np.log10(np.maximum(X.mem.fillna(1), 1))
tr = (X.date < "2025-01-01").values; te = ~tr
A = np.c_[np.ones(len(X)), X.lm.values]; yr = (X.l - X.fixe).values
c, *_ = np.linalg.lstsq(A[tr], yr[tr], rcond=None)
res_ = yr[tr] - A[tr] @ c; s2 = (res_ ** 2).sum() / max(1, tr.sum() - 2)
se = np.sqrt(np.diag(s2 * np.linalg.inv(A[tr].T @ A[tr])))
k_brut = float(c[1])
if c[1] < 0:  # plus de débit ne rend pas l'eau plus claire : k mis à 0 (même choix que pour le Lez et le poste 5)
    c = np.array([yr[tr].mean(), 0.0])
base, k = float(c[0]), float(c[1])
X["pred"] = base + k * X.lm + X.fixe
out["calage"] = {"n_cal_2020_2024": int(tr.sum()), "n_test_2025_2026": int(te.sum()), "base": round(base, 4),
                 "base_FNU": round(10 ** base, 2), "k_rhone": round(k, 4), "k_brut": round(k_brut, 4),
                 "k_erreur_type": round(float(se[1]), 4), "base_erreur_type": round(float(se[0]), 4),
                 "rhone_2x": round(2 ** k, 2), "rhone_4x": round(4 ** k, 2)}


def md(v):
    return round(float(v.median()), 2) if len(v) else None


def scores(pred_l, mask, nom):
    y = X.l.values[mask]; p = pred_l[mask]
    r2 = 1 - ((y - p) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    o = cls(10 ** y); pc = cls(10 ** p)
    return {"modele": nom, "n": int(mask.sum()), "R2": round(float(r2), 3), "rang": round(float(spearmanr(p, y).correlation), 3),
            "bonne_classe_4": round(float((o == pc).mean()), 3), "a_une_classe_pres": round(float((abs(o - pc) <= 1).mean()), 3),
            "biais_x": round(float(10 ** (p - y).mean()), 2), "erreur_x": round(float(10 ** np.sqrt(((p - y) ** 2).mean())), 2),
            "tableau_mesure_puis_prevu": pd.crosstab(pd.Series(o).map(dict(enumerate(NOMS))), pd.Series(pc).map(dict(enumerate(NOMS))),
                                   rownames=["mesuré"], colnames=["prévu"]).T.to_dict()}


out["test"] = [scores(X.pred.values, te, "poste 17 calé (base + k)"), scores(X.pred.values, tr, "poste 17 calé, sur la période de calage")]
# Pour comparer : base et k d'autres postes de l'appli, sans calage (M.TURB de main v20)
for pid, b_, k_r in [(1, 0.3588, 1.9528), (2, 0.3324, 0.8459), (3, 0.2607, 0.6727)]:
    out["test"].append(scores((b_ + k_r * X.lm + X.fixe).values, te, f"copie du poste {pid} (base {b_}, k {k_r})"))

# ---- ancienne règle M.water (main v20, Rhône 1,5 / 2,5 / 4 fois), 3 classes ----
rl = np.where(X.ratio >= 4, 3, np.where(X.ratio >= 2.5, 2, np.where(X.ratio >= 1.5, 1, 0)))
old = np.where((X.hs >= 0.8) | (rl >= 2), 2, np.where(X.falling.fillna(False).astype(bool) | (X.hs >= 0.5) | (rl == 1) | (X.api >= 15), 1, 0))
o3 = np.minimum(cls(X.tur), 2); n3 = np.minimum(cls(10 ** X.pred), 2)
out["comparaison_3_classes_test"] = {
    "ancienne_regle": {"bonne_classe": round(float((old[te] == o3[te]).mean()), 3), "rang": round(float(spearmanr(old[te], X.l[te]).correlation), 3),
                       "teintee_ou_plus_annoncee_claire": int(((o3 == 2) & (old == 0) & te).sum())},
    "indice_poste17": {"bonne_classe": round(float((n3[te] == o3[te]).mean()), 3), "rang": round(float(spearmanr(X.pred[te], X.l[te]).correlation), 3),
                       "teintee_ou_plus_annoncee_claire": int(((o3 == 2) & (n3 == 0) & te).sum())},
    "teintee_ou_plus_mesuree": int(((o3 == 2) & te).sum())}

# ---- le panache du Rhône atteint-il P ? (toutes les années, tous les points) ----
ALL = S.merge(daily, on="date").dropna(subset=["ratio"])
ALL["classe_rhone"] = pd.cut(ALL.ratio, [0, 1.5, 2.5, 4, 1e9], right=False, labels=["< 1,5", "1,5-2,5", "2,5-4", "> 4"])
ALL["calme"] = ALL.hsmax48 < 0.5
pan = {}
for pt, g in ALL.groupby("pt"):
    pan[pt] = {"tous": {str(kk): [md(v.tur), int(len(v))] for kk, v in g.groupby("classe_rhone", observed=False)},
               "mer_calme_hsmax48<0,5": {str(kk): [md(v.tur), int(len(v))] for kk, v in g[g.calme].groupby("classe_rhone", observed=False)}}
out["panache_mediane_FNU_et_jours"] = pan
out["jours_par_classe_rhone_2020_2026"] = ALL.drop_duplicates("date").classe_rhone.value_counts().sort_index().astype(int).to_dict()
out["jours_par_classe_rhone_tous_jours"] = pd.cut(daily.ratio.dropna(), [0, 1.5, 2.5, 4, 1e9], right=False,
                                                    labels=["< 1,5", "1,5-2,5", "2,5-4", "> 4"]).value_counts().sort_index().astype(int).to_dict()

# ---- après un pic ≥ 1,6 fois : combien de jours avant de retrouver l'eau normale ? ----
G = ALL[ALL.pt == PT].copy()
G["groupe"] = pd.cut(G.jours_pic, [-0.5, 2.5, 5.5, 8.5, 12.5, 20.5], labels=["0-2 j", "3-5 j", "6-8 j", "9-12 j", "13-20 j"])
apres = {}
for nom, g in [("tous", G), ("mer_calme_hsmax48<0,5", G[G.calme])]:
    ref = g[g.jours_pic.isna()].tur
    d_ = {"sans pic depuis 21 j": [round(float(ref.median()), 2), int(len(ref)), 1.0]}
    for kk, v in g.groupby("groupe", observed=False):
        d_[str(kk)] = [round(float(v.tur.median()), 2) if len(v) else None, int(len(v)), round(float(v.tur.median() / ref.median()), 2) if len(v) else None]
    apres[nom] = d_
out["apres_pic_1_6"] = {"point": PT, "colonnes": "médiane FNU, jours, fois la médiane sans pic", **apres}
out["pics_1_6_jours_2020_2026"] = int((ratio["2020":] >= 1.6).sum())

# ---- comparaison avec le poste 1 (essai turbidité, mêmes jours) ----
if ANCIEN and os.path.exists(ANCIEN):
    A1 = json.load(open(ANCIEN))["dates"]
    z = [(dd, A1[dd].get("1_300"), A1[dd].get("2_300"), T[dd].get(PT)) for dd in T if dd in A1]
    z = pd.DataFrame(z, columns=["date", "p1", "p2", "p17"]).dropna()
    z = z.merge(daily[["date", "ratio"]].assign(date=lambda x: x.date.dt.strftime("%Y-%m-%d")), on="date")
    hi = z.ratio >= 1.5
    out["meme_jours_que_postes_1_2"] = {"n": int(len(z)), "mediane_p1_300": round(float(z.p1.median()), 2), "mediane_p2_300": round(float(z.p2.median()), 2),
                                        "mediane_p17": round(float(z.p17.median()), 2),
                                        "rhone_>=1,5": {"n": int(hi.sum()), "p1": round(float(z.p1[hi].median()), 2) if hi.any() else None,
                                                        "p2": round(float(z.p2[hi].median()), 2) if hi.any() else None,
                                                        "p17": round(float(z.p17[hi].median()), 2) if hi.any() else None},
                                        "rang_p1_p17": round(float(spearmanr(z.p1, z.p17).correlation), 3)}

json.dump(out, open(f"{OUT}/analyse.json", "w"), ensure_ascii=False, indent=1)
X[["date", "tur", "pred", "hs", "hsmax48", "ws24", "api", "ratio", "mem"]].to_csv(f"{OUT}/paires_{PT}.csv", index=False)
print(json.dumps({kk: v for kk, v in out.items()}, ensure_ascii=False, indent=1, default=str))
