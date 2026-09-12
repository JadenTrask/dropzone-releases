// Heights are informational only. Always use the existing flat-ground table.
export function sightSolution({shot,arc,mapChanged=false}) {
  const unavailable=reason=>({status:'unavailable',distance:null,command:null,reason});
  if(mapChanged)return unavailable('Map calibration changed. Update required.');
  const flat=shot?.solutions?.[arc];
  if(!flat||shot.range!=='in'||shot.azimuth==null||!Number.isFinite(shot.distance)||shot.distance<=0)return unavailable('Place both points within this weapon’s supported range.');
  return {status:'flat',distance:shot.distance,command:flat,reason:'Flat-ground reference · no height correction'};
}
