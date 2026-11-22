// Chantier 1, étape 2 (22 nov. 2026) : adresses à mesurer (taille et temps de la réponse), aucune modification de l'appli.
//   actuel : la requête météo de l'appli (5 points, 14 jours passés, 7 jours prévus, 5 variables × 2 modèles) ;
//   vent   : la requête en plus envisagée = vent, direction, rafales aux 16 postes, 1 jour passé (le matin même), 7 jours prévus, 2 modèles.
global.window = {};
require("../../js/spots.js"); require("../../js/data.js");
const U = window.DATA.urls(window.WX_POINTS), S = window.SPOTS;
const vent = "https://api.open-meteo.com/v1/forecast?latitude=" + S.map(s => s.lat.toFixed(4)).join(",") +
  "&longitude=" + S.map(s => s.lon.toFixed(4)).join(",") +
  "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&past_days=1&forecast_days=7&timezone=Europe%2FParis&wind_speed_unit=kmh&models=" + window.DATA.MODELS;
console.log(`actuel ${U.forecastModels}\nvent ${vent}\nmer ${U.marine}`);
