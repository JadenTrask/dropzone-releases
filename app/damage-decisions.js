import {e} from './shared.js';
import {solveDamage,rangeBreakpoints} from './wardogs-damage-engine.js';
export function decisions(weapon,settings){
 const points=rangeBreakpoints(weapon,settings);
 const ammo=weapon.caliber==='5.56x45mm'?['FMJ','AP','HP'].map(round=>{const r=solveDamage(weapon,{...settings,ammo:round});return `<div><strong>${round}</strong><span>${r.valid?r.damage.toFixed(1)+' HP · '+r.hits+' constant-damage hits':e(r.message)}</span></div>`;}).join(''):'<p>This caliber has no verified AP / HP profile bundled yet.</p>';
 return `<div class="decision-columns"><section><h3>Next range breakpoints</h3>${points.length?points.map(p=>`<div><span>Beyond ~${p.after.toFixed(1)} m</span><strong>${p.hits} hits</strong></div>`).join(''):'<p>No further breakpoint inside the supported curve for this setup.</p>'}<small>Estimated from linear falloff. Each threshold means just beyond that distance; these are not measured in-game breakpoints.</small></section><section><h3>Ammo tradeoffs · ${e(weapon.name)}</h3>${ammo}<small>AP reduces the armor penalty but lowers base damage. HP favors uncovered hits and is heavily penalized by armor. Constant-armor results can substantially overstate hits once plates break.</small></section></div>`;
}
