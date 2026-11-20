"""Après une crue : combien de jours le chenal reste-t-il chargé ? (turbidité estimée par Sentinel-2, moyenne des points du chenal)"""
import sys, numpy as np, pandas as pd
D = sys.argv[1] if len(sys.argv) > 1 else "donnees"
X = pd.read_pickle(f"{D}/s2/chenaux_lien.pkl")
CAS = {"Grau-du-Roi, chenal (Vidourle)": X.point.str.startswith("grau-du-roi_chenal"),
       "Petit Rhône, embouchure (fleuve)": X.type.eq("fleuve") & X.groupe.eq("petit-rhone"),
       "Petit Rhône, mer à 300 m": X.point.eq("petit-rhone_mer300"),
       "Étang du Ponant (Vidourle)": X.point.str.startswith("ponant_") & X.type.eq("etang"),
       "Grau-du-Roi, mer à 300 m": X.point.eq("grau-du-roi_mer300")}
SEUIL = {"Petit Rhône, embouchure (fleuve)": 1.5, "Petit Rhône, mer à 300 m": 1.5}
for nom, sel in CAS.items():
    s = SEUIL.get(nom, 4)
    x = X[sel].groupby("date").agg(fnu=("fnu", "mean"), pic=("pic15", "first"), j=(f"jours_dep{s}", "first"), q=("q_veille", "first")).dropna(subset=["fnu", "pic"])
    base = x[x.pic < 1.5].fnu
    print(f"\n{nom} — {len(x)} jours sans nuages ; débit normal (pic des 15 j < 1,5×) : médiane {base.median():.1f} FNU, 90 % < {base.quantile(.9):.1f}")
    e = x[x.j.notna()].copy(); e["apres"] = pd.cut(e.j, [0, 2, 4, 7, 10, 15], labels=["1-2 j", "3-4 j", "5-7 j", "8-10 j", "11-15 j"])
    t = e.groupby("apres", observed=False).fnu.agg(n="size", mediane="median", max="max", plus_de_30=lambda v: (v > 30).mean(), plus_de_15=lambda v: (v > 15).mean())
    print(f"   jours depuis le dernier jour à ≥ {s}× la normale :"); print(t.round(2).to_string())
    print("   dates (pic ≥ seuil) :", ", ".join(f"{d:%d/%m/%y} {r.fnu:.0f} FNU (pic des 15 j {r.pic:.0f}×, dernier jour ≥ {s}× il y a {r.j:.0f} j)" for d, r in e.sort_values("fnu", ascending=False).head(8).iterrows()))
