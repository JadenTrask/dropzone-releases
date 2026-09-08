// Fixed recommendations: a removed weapon or source build requires review.
export function resolveTeam(preset,builds){
  const players=preset.players.map(slot=>{
    const build=builds.find(b=>b.id===slot.build&&b.className===slot.className);
    const weapon=slot.weapon;
    return {...slot,build:build||null,weapon,valid:!!build&&build.weapons.includes(weapon)&&build.gadgets.length===3};
  });
  return {...preset,players,valid:players.length===3&&players.every(p=>p.valid)};
}
export function teamReview(data){
  const t=data.teamPresets,p=data.official;
  if(!p?.gameplay)return {warning:true,message:'Current official patch is unknown. The team strategy needs a patch check.'};
  if(t.season!==p.season)return {warning:true,message:`These team strategies were reviewed for Season ${t.season}. They need a Season ${p.season} review.`};
  const a=p.gameplay.patch.split('.').map(Number),b=t.reviewedPatch.split('.').map(Number);
  const newer=a.some((n,i)=>a.slice(0,i).every((x,j)=>x===b[j])&&n>b[i]);
  if(newer)return {warning:true,message:`Team strategy was reviewed at ${t.reviewedPatch}. Official update ${p.gameplay.patch} needs a new strategy review.`};
  if(Date.now()-Date.parse(p.fetchedAt)>86400000)return {warning:true,message:`Team strategy was reviewed at ${t.reviewedPatch}. The saved official patch check is over a day old; refresh before relying on this comparison.`};
  return {warning:p.cacheState==='offline',message:`Team strategy reviewed ${t.reviewedAt} for ${t.reviewedPatch}. ${p.cacheState==='offline'?'The latest patch check failed.':'The official feed shows no newer non-store update.'}`};
}
