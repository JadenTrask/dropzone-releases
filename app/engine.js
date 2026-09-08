export const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plain = s => String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export const number = n => Number.isFinite(Number(n))?Intl.NumberFormat('en-US').format(Number(n)):'—';
export function interval(rate,n) {
  if(!Number.isFinite(rate)||!n)return null;
  const p=rate/100,z=1.96,den=1+z*z/n;
  const mid=(p+z*z/(2*n))/den,spread=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
  return [(mid-spread)*100,(mid+spread)*100];
}
export function itemInfo(id,catalog,build) {
  const item=catalog.items[String(id)];
  const source=build?.sourceItems?.[String(id)];
  return {...item,id:Number(id),name:item?.name||(typeof source==='string'?source:Array.isArray(source)?source[0]:`Item ${id}`),description:plain(item?.description||''),gold:item?.gold?.total||0};
}
export function getPlan(build,catalog,strategy='popular') {
  if(!build || build.unavailable)return null;
  if(build.mode==='arena') {
    const banned=new Set([0,3348,220000,220003,220004,220007,2142,2143,222141,222142,222143]);
    const usable=id=>!banned.has(Number(id)) && !!catalog.items[id] && !catalog.items[id].consumed;
    const sets=(build.items.builtItemSet3||[]).map(r=>({ids:String(r[0]).split('_').map(Number),games:r[3]})).filter(x=>x.ids.length===3 && new Set(x.ids).size===3 && x.ids.every(usable)).sort((a,b)=>b.games-a.games);
    const core=sets[0]?.ids||[];
    const full=[...core];
    const prismatics=new Set(build.prismatics?.map(x=>x.id));
    for(const r of build.items.popularItem||[])if(full.length<6&&usable(r[0])&&!prismatics.has(r[0])&&!full.includes(r[0]) && !(String(r[0]).startsWith('2230') && catalog.items[r[0]]?.tags?.includes('Boots') && full.some(id=>catalog.items[id]?.tags?.includes('Boots'))))full.push(r[0]);
    return {core,full,start:(build.items.startItem||[]).filter(r=>usable(r[0])).slice(0,1).map(r=>r[0]),spells:[],runes:null,skills:String(build.items.skill15?.[0]?.[0]||''),priority:'',coreGames:sets[0]?.games||0,coreRate:null,variant:'Popular Arena purchases',alternatives:build.items.popularItem||[],note:'A popular non-prismatic foundation. Your rolled prismatics and augments can change the build; the six slots are not a measured complete set.'};
  }
  let variant=strategy==='performance'?'win':'pick';
  let summary=build.summaries?.[variant];
  let note='Core items are measured together. Later slots are separate popular purchases, not a measured six-item win rate.';
  const minGames=Math.max(100,Math.ceil((build.header.n||0)*0.005));
  if(!summary?.items?.core?.set?.length)return null;
  if(variant==='win' && summary.items.core.n<minGames) {summary=build.summaries.pick;variant='pick';note=`The higher-win core has fewer than ${number(minGames)} games. Showing the popular build until the sample grows.`;}
  const core=(summary.items.core.set||[]).map(Number);
  const full=[...core];
  const late=build.summaries.pick?.items||summary.items;
  for(const slot of ['item4','item5','item6']) {
    const options=(late[slot]||[]).filter(x=>!full.includes(Number(x.id))&&Number(x.id)!==3041).sort((a,b)=>b.n-a.n);
    if(options[0]&&full.length<6)full.push(Number(options[0].id));
  }
  for(const r of build.items.popularItem||[])if(full.length<6&&!full.includes(r[0])&&r[0]!==3041&&catalog.items[r[0]]?.gold?.total>=2000&&!catalog.items[r[0]]?.tags?.includes('Boots'))full.push(r[0]);
  return {core,full,start:summary.items.start?.set||[],spells:summary.sums?.ids||[],runes:summary.runes?.set,skills:String(summary.skillorder?.id||''),priority:summary.skillpriority?.id||'',coreGames:summary.items.core.n,coreRate:summary.items.core.wr,variant:variant==='win'?'Higher win-rate core':'Most played core',alternatives:build.items.popularItem||[],note};
}
export function situationItems(champion,build,catalog,threats=[]) {
  const ap=champion.tags.includes('Mage') || ['Akali','Diana','Ekko','Evelynn','Fizz','Gwen','Kassadin','Katarina','Lillia','Mordekaiser','Rumble','Sylas'].includes(champion.id);
  const tank=champion.tags.includes('Tank');
  const support=build?.role==='support' && !ap;
  const arena=build?.mode==='arena';
  const defs={
    healing:{ids:ap?[3165]:tank?[3075]:support?[3011]:[3033,6609],title:'Cut their healing',why:'Consider Grievous Wounds when repeated healing is deciding fights. Apply it reliably; avoid duplicating purchases without a reason.'},
    armor:{ids:ap?[3135,3137]:[3036,3033,3071],title:ap?'Check their magic resist':'Break through armor',why:ap?'Armor alone does not call for magic penetration. Buy this when the targets you hit stack magic resistance.':'Percent armor penetration or reduction helps against targets stacking armor.'},
    magic:{ids:ap?[3102]:tank?[3065,4401]:[3156],title:'Survive magic damage',why:'Magic resistance is valuable when magic damage threatens you. Match the defensive passive to the fight.'},
    physical:{ids:ap?[3157]:tank?[3143,3110]:[3026,6333],title:'Survive physical damage',why:'Consider armor, stasis, or a defensive passive when physical damage is stopping you from dealing damage.'},
    shields:{ids:ap?[4645]:[6695],title:ap?'Pressure shielded targets':'Cut through shields',why:ap?'Shadowflame is a damage option, not shield reduction. AP champions do not have a direct equivalent to Serpent’s Fang.':'Serpent’s Fang is a situational option for AD builds facing frequent, substantial shields.'},
    tanks:{ids:ap?[6653,3135]:champion.tags.includes('Marksman')?[3036,3153]:[3071],title:'Answer the frontline',why:ap?'Sustained percent-health damage and magic penetration answer different defenses. Check whether the enemy is buying health or resistance.':'Use sustained damage against health; use penetration against armor. Champion and item synergy still matters.'}
  };
  const observed=new Set((build?.items?.popularItem||[]).map(r=>Number(r[0])));
  return threats.flatMap(t=>(defs[t]?.ids||[]).map(id=>({id:arena && catalog.items[220000+id]?220000+id:id,...defs[t],threat:t}))).filter(x=>catalog.items[x.id] && catalog.items[x.id].inStore!==false && observed.has(x.id)).filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).slice(0,6);
}
export function exportSet(champion,build,plan,modeName) {
  if(!plan?.core?.length)throw new Error('Load a build before exporting.');
  if(!['ranked','flex','normal','aram','mayhem'].includes(build.mode))throw new Error('Client item-set export is available for Rift and ARAM modes. Use Copy build for this mode.');
  return {title:`Dropzone · ${champion.name} · ${modeName} · ${build.patch}`,associatedMaps:[['aram','mayhem'].includes(build.mode)?12:11],associatedChampions:[Number(champion.key)],map:['aram','mayhem'].includes(build.mode)?'HA':'SR',mode:'any',type:'custom',sortrank:1,blocks:[
    {type:'Start',items:group(plan.start)},
    {type:'Core — buy in order',items:group(plan.core)},
    {type:'Later options — adapt to the game',items:group(plan.full.slice(plan.core.length))}
  ].filter(b=>b.items.length)};
}
function group(ids){const counts={};for(const id of ids)counts[id]=(counts[id]||0)+1;return Object.entries(counts).map(([id,count])=>({id,count}));}
