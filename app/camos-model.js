export const CAMO_STORAGE_KEY='dropzone-mw4-camos-v1';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const emptyProgress=()=>({version:1,unlocked:{},mastery:{mp:{},dmz:{}}});

export function readProgress(storage){
 const raw=storage.getItem(CAMO_STORAGE_KEY);
 if(raw===null)return emptyProgress();
 const saved=JSON.parse(raw);
 if(!object(saved)||saved.version!==1||!object(saved.unlocked)||!object(saved.mastery))throw new Error('Unrecognized camo save.');
 for(const camos of Object.values(saved.unlocked))if(!object(camos)||Object.values(camos).some(value=>typeof value!=='boolean'))throw new Error('Invalid weapon progress.');
 for(const mode of ['mp','dmz'])if(!object(saved.mastery[mode])||Object.values(saved.mastery[mode]).some(value=>typeof value!=='boolean'&&(!Number.isSafeInteger(value)||value<0)))throw new Error('Invalid mastery progress.');
 return saved;
}

export function toggleCamo(progress,weapon,id,checked){
 const camo=weapon.camos.find(c=>c.id===id);
 if(!camo)throw new Error('Unknown camo.');
 const unlocked={...progress.unlocked[weapon.id],[id]:checked};
 // Earned Completionist camos imply the earlier unlocks on this weapon only.
 if(checked&&['gold','platinum','harmonic'].includes(camo.tier))for(const prior of weapon.camos.slice(0,weapon.camos.indexOf(camo)))unlocked[prior.id]=true;
 if(checked&&camo.tier==='military')for(const prior of weapon.camos.slice(0,weapon.camos.indexOf(camo)).filter(c=>c.tier==='military'))unlocked[prior.id]=true;
 return {...progress,unlocked:{...progress.unlocked,[weapon.id]:unlocked}};
}

export function toggleMastery(progress,mode,camo,checked){
 if(!['mp','dmz'].includes(mode)||typeof checked!=='boolean')throw new Error('Invalid mastery unlock.');
 return {...progress,mastery:{...progress.mastery,[mode]:{...progress.mastery[mode],[camo.id]:checked}}};
}

// Completed counters from the early local preview remain earned after switching to checkboxes.
export const masteryEarned=(progress,mode,camo)=>progress.mastery[mode][camo.id]===true||progress.mastery[mode][camo.id]===camo.target;

export const earned=(progress,weapon,id)=>progress.unlocked[weapon.id]?.[id]===true;
export const weaponCount=(progress,weapon)=>weapon.camos.filter(c=>earned(progress,weapon,c.id)).length;
export function camoTotals(catalog,progress){
 const count=tier=>catalog.weapons.filter(w=>w.camos.some(c=>c.tier===tier&&earned(progress,w,c.id))).length;
 const gold=count('gold'),platinum=count('platinum'),harmonic=count('harmonic');
 return {gold,platinum,harmonic,divergence:harmonic>=catalog.requiredWeapons,total:catalog.weapons.reduce((sum,w)=>sum+weaponCount(progress,w),0),possible:catalog.weapons.reduce((sum,w)=>sum+w.camos.length,0)};
}

export function camoGate(catalog,progress,weapon,camo){
 if(camo.tier==='military')return 'Shared weapon level';
 if(camo.tier==='special')return camo.level?`Weapon level ${camo.level}`:'Weapon level requirement shown in game';
 if(camo.tier==='gold')return 'Requires all 8 Military and 3 Special camos on this weapon';
 if(camo.tier==='platinum'){
  const group=catalog.weapons.filter(w=>w.category===weapon.category),count=group.filter(w=>w.camos.some(c=>c.tier==='gold'&&earned(progress,w,c.id))).length;
  return `Requires Gold on all ${group.length} ${weapon.category} weapons · ${count}/${group.length} recorded`;
 }
 return `Requires Platinum on ${catalog.requiredWeapons} weapons · ${camoTotals(catalog,progress).platinum}/${catalog.requiredWeapons} recorded`;
}
