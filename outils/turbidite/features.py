"""Construit les conditions journalières 2020 → 2026 par poste, à l'heure du passage de Sentinel-2 (~10 h 30 UTC),
avec les mêmes règles que l'appli (js/model.js) pour le « modèle actuel »."""
import json, math
import numpy as np, pandas as pd

R = "outils/turbidite/donnees/releves/"
P = json.load(open("outils/turbidite/postes.json"))["spots"]
ZONE = {1: "E", 2: "E", 3: "E", 4: "C", 5: "C", 6: "C", 7: "C", 8: "C", 9: "C", 10: "C",
        11: "W", 12: "W", 13: "W", 14: "W", 15: "W", 16: "W"}


def angdiff(a, b):
    return abs(((a - b + 180) % 360) - 180)


# ---- débits ----
d = json.load(open(R + "debits.json"))
flows = {}
for r in ("rhone", "vidourle", "lez"):
    q = pd.Series({pd.Timestamp(t): v / 1000 for t, v in d[r]["QmnJ"] if v is not None}).sort_index()
    q = q.asfreq("D").interpolate(limit=3)
    mm = pd.DataFrame([(pd.Timestamp(t).month, v / 1000) for t, v in d[r]["QmM"] if v is not None], columns=["m", "q"])
    med = mm.groupby("m").q.median()
    ratio = q / q.index.month.map(med).values
    flows[r] = pd.DataFrame({"q": q, "ref": q.index.month.map(med).values, "ratio": ratio})

# ---- météo horaire par zone ----
m = json.load(open(R + "meteo_zones.json"))
h = json.load(open(R + "houle_zones.json"))
wx = {}
for z, a, b in zip(m["zones"], m["data"], h["data"]):
    df = pd.DataFrame(a["hourly"]); df["time"] = pd.to_datetime(df["time"]); df = df.set_index("time")
    hw = pd.DataFrame(b["hourly"]); hw["time"] = pd.to_datetime(hw["time"]); hw = hw.set_index("time")
    wx[z] = df.join(hw, how="left")


def zone_hourly(z):
    return wx[z]


def build():
    rows = []
    for s in P:
        z = ZONE[s["id"]]; w = zone_hourly(z).copy()
        # houle au poste (règle de l'appli)
        exp = 0.35 + 0.65 * np.maximum(0, np.cos(np.radians(angdiff(w.wave_direction.fillna(s["seaward"]), s["seaward"]))))
        w["hs_loc"] = w.wave_height * exp * (0.8 if s["type"] == "grau" else 1)
        w["onshore"] = w.wind_speed_10m * np.cos(np.radians(angdiff(w.wind_direction_10m, s["seaward"])))
        # indice de pluie antérieure côte (k = 0,85 par jour), horaire
        rain = w.precipitation.fillna(0).values
        k = 0.85 ** (1 / 24); api = np.zeros(len(rain)); acc = 0
        for i, x in enumerate(rain):
            acc = acc * k + x; api[i] = acc
        w["api"] = api
        # mer qui retombe : pic ≥ 1,0 m sur 36 h et houle actuelle < 65 % du pic
        pk = w.hs_loc.rolling(36, min_periods=1).max()
        w["falling"] = (pk >= 1.0) & (w.hs_loc < 0.65 * pk)
        # composantes du vent (vers où il pousse) : u vers l'est, v vers le nord
        to = np.radians(w.wind_direction_10m + 180)
        w["u"] = w.wind_speed_10m * np.sin(to); w["v"] = w.wind_speed_10m * np.cos(to)
        # moyennes sur 24 h et 72 h avant 11 h locales (passage du satellite vers 10 h 30 UTC)
        daily = pd.DataFrame(index=pd.date_range("2020-01-02", w.index[-1].normalize(), freq="D"))
        at = daily.index + pd.Timedelta(hours=11)
        g = lambda col: w[col].reindex(at).values
        daily["hs"] = g("hs_loc"); daily["hs_off"] = w.wave_height.reindex(at).values
        daily["per"] = g("wave_period"); daily["falling"] = g("falling")
        daily["api"] = g("api"); daily["onshore"] = g("onshore")
        r24 = w[["u", "v", "hs_loc", "onshore", "wind_speed_10m"]].rolling(24, min_periods=12).mean()
        r72 = w[["u", "v", "hs_loc"]].rolling(72, min_periods=36).mean()
        daily["u24"] = r24.u.reindex(at).values; daily["v24"] = r24.v.reindex(at).values
        daily["u72"] = r72.u.reindex(at).values; daily["v72"] = r72.v.reindex(at).values
        daily["hs24"] = r24.hs_loc.reindex(at).values; daily["hs72"] = r72.hs_loc.reindex(at).values
        daily["hsmax48"] = w.hs_loc.rolling(48, min_periods=12).max().reindex(at).values
        daily["on24"] = r24.onshore.reindex(at).values; daily["ws24"] = r24.wind_speed_10m.reindex(at).values
        for r in ("rhone", "vidourle", "lez"):
            f = flows[r].reindex(daily.index - pd.Timedelta(days=1))  # débit moyen de la veille (connu le matin)
            daily[f"ratio_{r}"] = f.ratio.values
            daily[f"q_{r}"] = f.q.values
            # mémoire de la crue : max sur 10 jours du rapport, amorti
            fr = flows[r].ratio
            for tau in (1, 2, 3, 5, 8):
                vals = np.full(len(daily), np.nan)
                for lag in range(0, 15):
                    x = fr.reindex(daily.index - pd.Timedelta(days=1 + lag)).values * np.exp(-lag / tau)
                    vals = np.fmax(vals, x)
                daily[f"mem{tau}_{r}"] = vals
            # pic des 10 derniers jours et jours depuis le pic
            win = pd.concat([fr.shift(1 + l).rename(l) for l in range(10)], axis=1).reindex(daily.index)
            daily[f"pic10_{r}"] = win.max(axis=1).values
            daily[f"jpic_{r}"] = win.fillna(-1).idxmax(axis=1).values
        daily["poste"] = s["id"]
        rows.append(daily)
    D = pd.concat(rows); D.index.name = "date"
    return D.reset_index()


def modele_actuel(D, P):
    """Couleur de l'eau selon M.water (js/model.js), avec le débit de la veille."""
    riv = {s["id"]: s["river"] for s in P}
    out = []
    for _, x in D.iterrows():
        r = riv[x.poste]
        rl = 0
        if r:
            ra = x[f"ratio_{r}"]
            rl = 3 if ra >= 10 else 2 if ra >= 4 else 1 if ra >= 2 else 0
        if (x.hs >= 0.8) or rl >= 2: out.append(2)
        elif x.falling or x.hs >= 0.5 or rl == 1 or x.api >= 15: out.append(1)
        else: out.append(0)
    return np.array(out)


if __name__ == "__main__":
    D = build()
    D["actuel"] = modele_actuel(D, P)
    D.to_pickle("outils/turbidite/donnees/features.pkl")
    print(D.shape); print(D.groupby("poste").actuel.value_counts(normalize=True).unstack().round(2))
    print(D[["ratio_rhone", "ratio_vidourle", "ratio_lez"]].describe().round(2))
