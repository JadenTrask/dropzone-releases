import {careerLevel} from './wardogs-progress-data.js';
// Published unlock requirements, not purchase prices or a complete unlock tree.
export const UNLOCKS=[
 ['ak74','AK-74','assault',3,10000],['galil','Galil','assault',10,35000],['m4','M4','assault',20,100000],['fal','FAL','assault',35,200000],
 ['pp-19-vityaz','PP-19 Vityaz','medic',4,25000],['mp5','MP5','medic',15,75000],['super-45','Super 45','medic',35,150000],
 ['rpg-7','RPG-7','support',5,30000],['m500','M500','support',10,50000],['m249-saw','M249','support',15,100000],['9k333-verba','9K333 Verba','support',16,50000],['maaws','MAAWS','support',20,125000],['pkm','PKM','support',30,150000],['mgl-40','MGL-40','support',35,200000],
 ['sks','SKS','recon',5,25000],['mosin-nagant','Mosin','recon',10,50000],['svd','SVD','recon',12,50000],['compound-bow','Compound Bow','recon',17,125000],['sv98','SV-98','recon',19,100000],['mk22','MK-22','recon',25,150000],['bmr-308','BMR-308','recon',30,125000],['amr-50','AMR-50','recon',35,200000],
 ['ggx-17','GGX-17','career',1,5000],['judge','Judge','career',18,15000],['m1911','M1911','career',40,25000],['ggx-18','GGX-18','career',70,50000],['deagle','Deagle','career',85,75000]
].map(([id,name,role,level,cost])=>({id,name,role,level,cost,source:'https://metaforge.app/wardogs/progression'+(role==='career'?'':'/tables/'+(role==='assault'?'infantry':role))}));
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
export function unlockState(item,snapshot){
 const owned=(Array.isArray(snapshot?.unlocks)?snapshot.unlocks:[]).some(n=>[item.name,item.id].some(s=>normalize(s)===normalize(n)));
 const level=item.role==='career'?careerLevel(snapshot):snapshot?.roles?.[item.role]?.level;
 const known=Number.isInteger(level)&&level>=0;
 return {owned,known,level:known?level:null,remaining:known?Math.max(0,item.level-level):null,status:owned?'Owned':!known?'Level unknown':level>=item.level?'Eligible to unlock':'Locked'};
}
export function nextUnlock(snapshot,role){return UNLOCKS.filter(i=>i.role===role).map(item=>({item,...unlockState(item,snapshot)})).filter(s=>s.known&&!s.owned&&s.remaining>0).sort((a,b)=>a.remaining-b.remaining||a.item.cost-b.item.cost)[0]||null;}
