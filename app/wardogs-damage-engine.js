export const ZONES=['Head','Neck','Upper torso','Middle torso','Lower torso','Pelvis','Upper arm','Lower arm','Hand','Upper leg','Lower leg','Foot'];
export const ARMOR=[{name:'None',reduction:0},{name:'Level 1',reduction:.30},{name:'Level 2',reduction:.40},{name:'Level 3',reduction:.55},{name:'Level 4',reduction:.65},{name:'Ghillie',reduction:0}];
export function protection(zone,body,helmet){
 if(!ZONES.includes(zone)||![body,helmet].every(n=>Number.isInteger(n)&&n>=0&&n<ARMOR.length))return null;
 const head=zone==='Head'||zone==='Neck',tier=head?helmet:body;
 const covered=head?(zone==='Head'||tier===3||tier===4):['Upper torso','Middle torso','Lower torso'].includes(zone)||(tier===4&&['Pelvis','Upper arm'].includes(zone));
 return {reduction:covered?ARMOR[tier].reduction:0,covered:covered&&ARMOR[tier].reduction>0,kind:head?'helmet':'body armor',tier};
}
export function solveDamage(weapon,{zone='Upper torso',body=0,helmet=0,range=0,health=100}={}){
 const cover=protection(zone,body,helmet),invalid=message=>({valid:false,message});
 if(!cover||![range,health].every(Number.isFinite)||range<0||health<=0||health>10000)return invalid('Enter a valid range and target health.');
 if(!weapon||!Number.isFinite(weapon.baseDamage)||!Number.isFinite(weapon.zones?.[zone]))return invalid('A verified hit-location profile is not available for this weapon.');
 let falloff=1,interpolated=false;
 if(range>0){
  const curve=weapon.falloff;
  if(!curve)return invalid('This weapon has no published damage curve in the bundled reference. Use 0 m for its point-blank reference.');
  if(range>curve.end)return invalid(`Beyond the published ${curve.end} m curve. No damage is extrapolated.`);
  if(range>curve.start){falloff=1-(1-curve.floor)*(range-curve.start)/(curve.end-curve.start);interpolated=range!==curve.end;}
 }
 if(weapon.unit==='pellet'&&cover.covered)return invalid('Buckshot versus armor needs ammunition-specific calibration. Unarmored per-pellet reference is available.');
 const multiplier=weapon.zones[zone],raw=weapon.baseDamage*multiplier*falloff,damage=raw*(1-cover.reduction);
 if(!Number.isFinite(damage)||damage<=0)return invalid('No usable damage result for this setup.');
 const hits=Math.ceil(health/damage),ttk=weapon.unit==='pellet'||!Number.isFinite(weapon.rpm)||weapon.rpm<=0?null:(hits-1)*60/weapon.rpm;
 return {valid:true,damage,hits,ttk,raw,multiplier,falloff,interpolated,cover,unit:weapon.unit,mitigated:raw-damage};
}
