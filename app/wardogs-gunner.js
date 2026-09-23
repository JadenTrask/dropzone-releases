import {sightSolution} from './wardogs-sight.js';
import {bearingText,milText,calibratedBallistics} from './wardogs-model.js';

// Keep the optic ordered by elevation, not range: SPH-2 range reverses at its peak.
export function sightScale(weapon,command){
 if(!weapon||!command)return [];
 const center=(command.min+command.max)/2;
 const rows=[...new Map(Object.values(calibratedBallistics(weapon)).flat().map(([range,mil])=>[mil,{range,mil}])).values()].sort((a,b)=>a.mil-b.mil);
 return rows.filter(row=>Math.abs(row.mil-center)<=20).map(row=>({...row,y:230+(row.mil-center)*6}));
}
export function gunnerSight(shot,arc,changed=false,weapon=null){
 const solution=sightSolution({shot,arc,mapChanged:changed}),ready=solution.status==='flat',bearing=ready?shot.azimuth:0;
 const center=ready?(solution.command.min+solution.command.max)/2:null;
 const ticks=Array.from({length:17},(_,i)=>{const degrees=(Math.round(bearing/5)*5+(i-8)*5+360)%360,x=300+(((degrees-bearing+540)%360)-180)*5;return `<path fill="none" d="M${x} 55v${degrees%15===0?-14:-7}"/>${degrees%15===0?`<text x="${x}" y="30" stroke="none">${degrees}°</text>`:''}`;}).join('');
 const scale=sightScale(weapon,ready?solution.command:null).map(({range,mil,y})=>`<g data-stadia-mil="${mil}" transform="translate(0 ${y.toFixed(2)})"><path fill="none" d="M130 -9v18m0-9h25M470 -9v18m-25-9h25"/><text x="116" y="5" text-anchor="end" stroke="none">${range.toLocaleString()} m</text><text x="484" y="5" text-anchor="start" stroke="none">${mil}</text></g>`).join('');
 const precise=ready?(solution.command.min===solution.command.max?center.toFixed(1):milText(solution.command)):'—';
 return `<svg viewBox="0 0 600 470" role="img" aria-label="Gunner sight: ${ready?Math.round(shot.distance)+' metres, '+bearingText(shot.azimuth)+', '+precise+' mils':'Place an in-range gun and target'}"><rect width="600" height="470" rx="8" fill="#100a06"/><g fill="#ffb178" stroke="#c77740" stroke-width="1.5" font-family="monospace" font-size="17" text-anchor="middle"><path fill="none" d="M80 55H520"/>${ticks}<path d="M300 60l-7 12h14z" fill="#ffb178"/><text x="75" y="91" stroke="none">RNG</text><text x="524" y="91" stroke="none">MIL</text>${scale}<path fill="none" d="M160 230H245m110 0h85" stroke="#ffad70" stroke-dasharray="7 7"/><path fill="none" d="M269 207h-13v46h13m62-46h13v46h-13M300 172v22m0 72v22"/><circle cx="300" cy="230" r="5" fill="none"/><path d="M142 225l8 5-8 5m316-10-8 5 8 5" fill="#ffb178"/><text x="300" y="403" font-size="28" stroke="none">${ready?Math.round(shot.distance).toLocaleString()+' M · '+precise+' MIL':'NO SOLUTION'}</text><text x="300" y="437" font-size="15" stroke="none">${ready?bearingText(shot.azimuth)+' · '+(arc==='low'?'LOW ARC':arc==='high'?'HIGH ARC':'MORTAR'):'Place gun and target within range'}</text></g></svg><p class="wd-gunner-note">${ready?'Align the centre with this position between the marks.':'Select a supported firing solution.'} Flat-ground reference.</p>`;
}
