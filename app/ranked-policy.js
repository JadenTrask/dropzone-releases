// Also applies to snapshots saved by earlier app versions.
import policy from './data/cod/ranked-policy.json' with {type:'json'};
export function eligibleSavedBuild(s){return s.game!=='bo7'||s.mode!=='ranked'||policy.weapons.includes(s.build?.weapon);}
