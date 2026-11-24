// Audit du 24-25 nov. 2026 : liste des adresses réellement appelées par l'appli (mêmes fonctions que l'appli).
//   node outils/audit/urls.js  → « nom<TAB>adresse » par ligne, sondées par la tâche audit.yml (5 fois chacune).
global.window = {};
require("../../js/spots.js");
const DATA = require("../../js/data.js");
const U = DATA.urls(window.WX_POINTS);
const S = window.SPOTS;
const since = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 19);
const L = [
  ["meteo_modeles", U.forecastModels],
  ["meteo_simple", U.forecast],
  ["mer_openmeteo", U.marine],
  ["vent_postes", DATA.ventUrl(S)],
  ["debit_vidourle", `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=Y346400501&grandeur_hydro=Q&timestep=60&date_debut_obs=${since}&size=500&fields=date_obs,resultat_obs`],
  ["debit_rhone", `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=V720001002&grandeur_hydro=Q&timestep=60&date_debut_obs=${since}&size=500&fields=date_obs,resultat_obs`],
  ["debit_mensuel_lez", `https://hubeau.eaufrance.fr/api/v2/hydrometrie/obs_elab?code_entite=Y321002001&grandeur_hydro_elab=QmM&date_debut_obs_elab=1990-01-01&size=1000&fields=date_obs_elab,resultat_obs_elab`],
  ["houle_donnees", "https://raw.githubusercontent.com/nicolasbonini1-commits/Carte-peche/donnees/houle.json"],
  ["routes_osrm", `https://router.project-osrm.org/table/v1/driving/${window.HOME.lon},${window.HOME.lat};${S.slice(0, 5).map(s => s.lon + "," + s.lat).join(";")}?sources=0&annotations=duration`],
  ["profondeur_emodnet", "https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(4.13%2043.52)"],
  ["tuile_osmfr", "https://a.tile.openstreetmap.fr/osmfr/12/2093/1494.png"],
  ["leaflet_unpkg", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"],
  ["candhis_site", "https://candhis.cerema.fr/"],
  ["appli_en_ligne", "https://nicolasbonini1-commits.github.io/Carte-peche/"]
];
for (const [n, u] of L) console.log(`${n}\t${u}`);
