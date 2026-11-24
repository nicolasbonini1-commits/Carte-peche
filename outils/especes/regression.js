// Essai espèces (25 nov. 2026) : vérifie que loup et dorade donnent EXACTEMENT les mêmes notes que main (près d'un million de cas),
// puis montre les 3 meilleurs postes de chaque espèce pour 5 situations types.  node outils/especes/regression.js /tmp/main  (dossier avec spots.js et model.js de main)
const load = f => { delete require.cache[require.resolve(f)]; return require(f); };
global.window = {}; require(process.argv[2] + "/spots.js");
const A = load(process.argv[2] + "/model.js"); global.window = {}; require("../../js/spots.js");
const B = load("../../js/model.js");
const S = window.SPOTS; let n = 0, diff = 0;
for (const spot of S) for (const month of [1,3,5,7,9,11]) for (const light of ["aube","jour","nuit","crépuscule"]) for (const hs of [null,0.1,0.6,1.2,2.2]) for (const wd of [0,120,200,300]) for (const ws of [5,30,50]) for (const sst of [null,10,13,18,25]) for (const per of [4,9]) {
  const t = hs==null?null:A.turbidity(spot,{hs,hsmax48:hs,ws24:ws,mem:{rhone:1.5,vidourle:3},api:10});
  const c = { spot, month, light, cloud: 50, darkNight:false, wind: ws, windDir: wd, gust: ws*1.6, onshore: A.onshore(spot,ws,wd), hsLocal: hs, period: per, falling: hs===0.6, rising:false, rain72:5, rain7:20, apiCoast:20, apiBasin:30, flow:null, sst, turb: t };
  for (const sp of ["loup","dorade"]) { for (const L of [null,{n:3,k:1,factor:0.8}]) { n++; const a=A.score(spot,sp,c,L), b=B.score(spot,sp,c,L); if (JSON.stringify(a)!==JSON.stringify(b)) diff++; } }
}
console.log("comparaisons loup/dorade main vs essai :", n, "différences :", diff);
// Nouvelles espèces : classement à l'aube, peu agitée, par mois et température
for (const [month,sst] of [[2,12.5],[5,17],[8,24],[10,20],[11,16]]) {
  const out = {};
  for (const sp of ["sar","tassergal","liche","loup","dorade"]) {
    const r = S.filter(s=>!s.explore).map(spot=>{ const c={spot,month,light:"aube",cloud:30,darkNight:false,wind:10,windDir:0,gust:15,onshore:B.onshore(spot,10,0),hsLocal:0.5,period:5,falling:false,rising:false,rain72:0,rain7:0,apiCoast:0,apiBasin:0,flow:null,sst,turb:B.turbidity(spot,{hs:0.5,hsmax48:0.6,ws24:12,mem:{},api:0})}; return [spot.id,B.score(spot,sp,c).score]; }).sort((a,b)=>b[1]-a[1]);
    out[sp] = r.slice(0,3).map(x=>x.join(":")).join(" ")+"  (max "+r[0][1]+")";
  }
  console.log(`mois ${month}, eau ${sst} °C`, JSON.stringify(out));
}
