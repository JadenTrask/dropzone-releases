'use strict';
const {SourceCache,text}=require('./source-cache.cjs');
const BASE='https://www.ubisoft.com/en-us/game/rainbow-six/siege/game-info/operators/';
const validId=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<60;
function asset(value){if(!value)return null;const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='staticctf.ubisoft.com'||u.username||u.password)throw new Error('Unexpected operator artwork source.');return u.href;}
function normalizeOperator(html,id){
 if(!validId(id))throw new Error('Invalid operator.');
 const raw=html.match(/window\.__PRELOADED_STATE__\s*=\s*([\s\S]*?);<\/script>/)?.[1];
 const content=raw&&JSON.parse(raw).ContentfulGraphQl?.['OperatorDetailsContainer-'+id]?.content;
 const h=content?.header,b=content?.biography||h;
 if(!h?.operatorName||typeof h.side!=='boolean'||!Array.isArray(h.roles)||!Array.isArray(content.loadout)||!content.loadout.length||!b)throw new Error('The official operator profile is incomplete.');
 const rating=value=>Number.isInteger(value)&&value>=1&&value<=3?value:null;
 return {id,name:text(h.operatorName),side:h.side?'attack':'defense',roles:h.roles.map(text),unit:text(h.factionName),squad:(h.squad||[]).map(text),health:rating(h.armor),speed:rating(h.speed),difficulty:rating(h.difficulty),image:asset(h.operatorImage?.url),icon:asset(h.operatorIcon?.url),biography:{realName:text(b.realName),dateOfBirth:text(b.dateOfBirth),placeOfBirth:text(b.placeOfBirth)},loadout:content.loadout.map(w=>{if(!['primary','secondary','gadget','unique-ability'].includes(w.weaponType)||!w.title)throw new Error('Invalid operator equipment.');return {name:text(w.title),category:w.weaponType,type:text(w.weaponSubtype),image:asset(w.weaponImage?.url)};}),source:'Ubisoft',sourceUrl:BASE+id};
}
class OperatorProfiles{
 constructor(options){this.options=options;this.feeds=new Map();}
 get(id,refresh=false){if(!validId(id))throw new Error('Invalid operator.');if(!this.feeds.has(id)){this.feeds.set(id,new SourceCache({...this.options,id:'operator-'+id,url:BASE+id,normalize:html=>normalizeOperator(html,id),validate:d=>d.id===id&&Array.isArray(d.loadout)&&d.loadout.length>0&&!!d.biography&&!!d.image}));}return this.feeds.get(id).get(refresh===true||refresh==='true');}
}
module.exports={normalizeOperator,OperatorProfiles,validId};
