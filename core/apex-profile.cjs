'use strict';
// Whitelist the normalized display contract again before crossing into renderer.
const text=(v,max=100)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function asset(v){try{if(typeof v!=='string'||v.length>600)return null;const u=new URL(v);if(u.protocol!=='https:'||u.username||u.password||!['apexlegendsstatus.com','api.apexlegendsstatus.com','cdn.apexlegendsstatus.com','api.mozambiquehe.re'].includes(u.hostname)||!/\.(png|jpg|jpeg|webp)$/i.test(u.pathname))return null;u.search='';u.hash='';return u.href;}catch{return null;}}
function sanitizeProfile(v){
 if(v?.schema!==1||!text(v.identity?.name)||!/^\d{1,20}$/.test(v.identity?.uid||'')||!['PC','PS4','X1','SWITCH'].includes(v.identity?.platform))return null;
 const metric=r=>text(r?.label)&&number(r?.value)!==null?{label:text(r.label),value:r.value}:null;
 return {schema:1,identity:{name:text(v.identity.name,64),uid:v.identity.uid,platform:v.identity.platform},level:number(v.level),prestige:number(v.prestige),selectedLegend:text(v.selectedLegend),banner:asset(v.banner),checkedAt:Number.isFinite(Date.parse(v.checkedAt))?v.checkedAt:null,
  ranks:(Array.isArray(v.ranks)?v.ranks:[]).slice(0,3).flatMap(r=>text(r?.mode)&&text(r?.name)?[{mode:text(r.mode),name:text(r.name),division:number(r.division),score:number(r.score),emblem:asset(r.emblem),season:text(r.season)}]:[]),
  metrics:(Array.isArray(v.metrics)?v.metrics:[]).slice(0,8).map(metric).filter(Boolean),
  legends:(Array.isArray(v.legends)?v.legends:[]).slice(0,40).flatMap(l=>text(l?.name)?[{name:text(l.name),trackers:(Array.isArray(l.trackers)?l.trackers:[]).slice(0,12).map(metric).filter(Boolean)}]:[])};
}
module.exports={sanitizeProfile,asset};
