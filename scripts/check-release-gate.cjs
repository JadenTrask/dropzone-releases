'use strict';
module.exports=async({boot,run,win,pause,capture,report})=>{
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 const gated=()=>!!document.querySelector('.construction-hero')&&document.querySelector('.construction-hero').textContent.includes('UNDER CONSTRUCTION')&&!document.querySelector('#gz-canvas')&&document.querySelector('#game-tabs').hidden&&!performance.getEntriesByType('resource').some(r=>/\/gzw-ui\.js|cdn\.gzwtacmap\.com/.test(r.name));
 const click=async id=>{await run(id=>{const e=document.querySelector('[data-route="'+id+'"]');if(!e)throw Error('No route '+id);e.click();},id);await pause(450);};
 for(const query of ['?game=gray-zone','?game=gray-zone&view=missions','?game=patches&context=gray-zone','?game=watch&context=gray-zone']){
  await boot(query);await check('Construction blocks direct route '+query,gated);
 }
 for(const saved of [{id:'gray-zone'},{id:'patches',game:'gray-zone'}]){
  await boot('',saved);await check('Construction blocks restored '+saved.id,gated);
 }
 await boot('?game=gray-zone');
 for(const [w,h]of [[1920,1080],[1000,900],[3840,2160]])await capture('gzw-under-construction',w,h);
 await click('home');
 await check('Home lists GZW only in development',()=>!document.querySelector('.root-games [data-route="gray-zone"]')&&document.querySelector('.upcoming-games [data-route="gray-zone"]').textContent.includes('Under construction'));
 await run(()=>document.querySelector('.upcoming-games [data-route="gray-zone"]').scrollIntoView({block:'center'}));await capture('home-gzw-under-construction',1920,1080);
 await check('Rail announces construction',()=>document.querySelector('.app-rail [data-route="gray-zone"]').getAttribute('aria-label').includes('Under construction')&&document.querySelector('.app-rail [data-route="gray-zone"] .rail-game-state').textContent==='Under construction');
 await click('gray-zone');await check('Rail opens construction',gated);await click('finals');
 await check('Finals remains available',()=>!!document.querySelector('.fn-weapon-stage'));
 await run(()=>history.back());await pause(400);await check('History back cannot restore GZW tools',gated);
 await run(()=>history.forward());await pause(400);await check('History forward restores another game',()=>!!document.querySelector('.fn-weapon-stage'));
 for(const [id,selector] of [['siege','.r6-team-member'],['sotf','#sotf-canvas'],['wardogs','#wd-map-canvas'],['apex','.apex-player-form'],['rocket-league','.rl-page'],['lol','#league-app'],['cod','.collection-games'],['bo7','.arsenal-layout']]){
  await click(id);const passed=await run(selector=>!!document.querySelector(selector)?.checkVisibility({checkVisibilityCSS:true}),selector);report.flows.push({name:'Other game remains usable: '+id,passed});if(!passed)throw Error('Other game route failed: '+id);
 }
};
