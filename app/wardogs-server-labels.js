export const serverMapLabel=value=>({Detroit:'Zestafona',Madrid:'Ozeti'}[value]||value||'Unavailable');
const words=value=>String(value||'').replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\+/g,' / ').replace(/\s+/g,' ').trim();
const knownMode=/^(?:(?:Detroit|Madrid|Zestafona|Ozeti)_)?KOTH(?:_\d+)?(?:\+KOTH_(InfantryOnly|Hardcore))?$/i;
export function serverModeLabel(value){
  return typeof value==='string'&&knownMode.test(value)?'King of the hill':words(value)||'Unavailable';
}
export function serverRulesLabel(rulesets,mode){
  const names={'standard':'Standard','hardcore':'Hardcore','infantry-only':'Infantry only',infantryonly:'Infantry only'};
  const rules=(Array.isArray(rulesets)?rulesets:[]).filter(v=>typeof v==='string').map(v=>names[v.toLowerCase()]||words(v));
  const modifier=typeof mode==='string'?mode.match(knownMode)?.[1]:null;
  if(modifier)rules.push(names[modifier.toLowerCase()]);
  return [...new Set(rules.filter(Boolean))].join(' · ');
}
