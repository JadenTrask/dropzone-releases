import low from './data/wardogs/correction/low-main.json' with {type:'json'};
import tail from './data/wardogs/correction/low-tail-apex.json' with {type:'json'};
import high from './data/wardogs/correction/high-v2.json' with {type:'json'};
import reference from './data/wardogs/correction/weapons-reference.json' with {type:'json'};
import {validateLowMain,validateLowExtension,validateHigh,resolveLowMain,resolveLowExtension,resolveHigh} from './wardogs-correction-candidate.js';

validateLowMain(low);validateLowExtension(tail);validateHigh(high);
const supported=reference.weapons.find(w=>w.id==='spg');
export function compatibleWeapon(weapon) {
  return weapon?.id==='spg' && weapon.minElevationMil===supported.minElevationMil && weapon.maxElevationMil===supported.maxElevationMil &&
    weapon.minRange===supported.minRangeKm*1000 && weapon.maxRange===supported.maxRangeKm*1000 &&
    ['low','high'].every(arc=>JSON.stringify(weapon.ballistics[arc])===JSON.stringify(supported.ballistics[arc]));
}
// Invert this weapon's own flat table, on the same arc. This is a sight
// readout estimate at the corrected command, not a new physical distance.
export function rangeAtCommand(table,command) {
  if(!Number.isFinite(command)||!Array.isArray(table))return null;
  const rows=[...table].sort((a,b)=>a[1]-b[1]);
  const exact=rows.filter(r=>r[1]===command);
  if(exact.length)return exact.every(r=>r[0]===exact[0][0])?exact[0][0]:null;
  const i=rows.findIndex(r=>r[1]>command);if(i<=0)return null;
  const [d0,m0]=rows[i-1],[d1,m1]=rows[i];
  return d0+(command-m0)/(m1-m0)*(d1-d0);
}
export function sightSolution({shot,weapon,arc,heights,experimental=false,mapChanged=false}) {
  const unavailable=reason=>({status:'unavailable',distance:null,command:null,reason});
  if(mapChanged)return unavailable('Map calibration changed. Update required.');
  const flat=shot?.solutions?.[arc];
  if(!flat||shot.range!=='in'||shot.azimuth==null)return unavailable('Place both points within this weapon’s supported range.');
  if(!heights?.available||!Number.isFinite(heights.delta))return unavailable('Supply both heights or explicitly choose flat ground.');
  // Same-height results preserve the established calculator exactly, including
  // its duplicate-MIL interval at maximum range. No model quantization here.
  if(heights.delta===0)return {status:'flat',distance:shot.distance,command:flat,reason:heights.mode==='flat'?'Flat ground assumed':'Same height · original firing table'};
  if(weapon.id!=='spg')return unavailable('Mortar height correction needs game calibration. Flat-ground reference only.');
  if(!experimental)return unavailable('Enable the experimental SPH-2 estimate below to adjust for height.');
  if(!compatibleWeapon(weapon))return unavailable('Firing tables differ from this model’s reference. Estimate disabled.');
  if(flat.min!==flat.max)return unavailable('Flat table has multiple commands here. No unique correction.');
  const candidate=arc==='high'?resolveHigh(high,shot.distance,flat.min,heights.delta):shot.distance<=2439?resolveLowMain(low,shot.distance,flat.min,heights.delta):resolveLowExtension(tail,shot.distance,flat.min,heights.delta);
  if(candidate.status==='unreachable')return {status:'unreachable',distance:null,command:null,reason:'Target unreachable in this experimental arc model.'};
  if(candidate.status!=='ok')return unavailable(candidate.reason==='family-boundary-envelope'?'Candidate models disagree at this height. No adjusted setting.':'Outside this model’s supported height/range region. No adjusted setting.');
  const command=candidate.commandMrad;
  if(!Number.isFinite(command)||command<weapon.minElevationMil||command>weapon.maxElevationMil)return unavailable('Corrected command exceeds weapon limits.');
  const distance=rangeAtCommand(weapon.ballistics[arc],command);
  if(!Number.isFinite(distance)||distance<weapon.minRange||distance>weapon.maxRange)return unavailable('Corrected sight distance is outside the firing table.');
  return {status:'experimental',distance,command:{min:command,max:command,interpolated:false},reason:'Experimental · 10-MIL model steps · level chassis'};
}
