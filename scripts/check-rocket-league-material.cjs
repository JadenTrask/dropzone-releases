// Compare tracker content against released CSS while checking the separately
// authorized continuous shell. Shared route motion and launch behavior stay on.
'use strict';
const {execFileSync}=require('node:child_process');
module.exports=async({run,capture,report,pause})=>{
 const baseline=execFileSync('git',['show','HEAD:app/game-atmosphere.css'],{encoding:'utf8',windowsHide:true});
 const sample=()=>[...document.querySelectorAll('.rl-tabs>button,.rl-page button,.rl-page input,.rl-panel,.rl-card,.rl-wait,.rl-empty,.rl-settings-section')].map(el=>{const s=getComputedStyle(el);return{tag:el.tagName,cls:el.className,text:el.textContent.slice(0,60),background:s.background,border:s.border,shadow:s.boxShadow,filter:s.backdropFilter,color:s.color,radius:s.borderRadius,font:s.font};});
 for(const view of ['live','settings']){
  await run(view=>{document.querySelector('[data-rl-view="'+view+'"]')?.click();},view);await pause(250);
  await capture('rocket-league-shell-'+view,1920,1080);const current=await run(sample);
  const chrome=await run(()=>[...document.querySelectorAll('.titlebar,.app-rail,.rl-commandbar')].map(el=>{const s=getComputedStyle(el);return{cls:el.className,background:s.background,border:s.borderColor,shadow:s.boxShadow,filter:s.backdropFilter};}));
  const continuous=chrome.length===3&&chrome.every(s=>s.background===chrome[0].background&&s.border==='rgba(0, 0, 0, 0)'&&s.shadow==='none'&&s.filter===chrome[0].filter);
  report.flows.push({name:'Rocket League '+view+' has continuous chrome without structural seams',passed:continuous,chrome});
  if(!continuous)throw Error('Rocket League shell is inconsistent: '+view);
  await run(css=>{const material=document.querySelector('link[href*="liquid-glass.css"]'),atmos=document.querySelector('link[href*="game-atmosphere.css"]');material.disabled=true;atmos.disabled=true;const style=document.createElement('style');style.id='qa-released-atmosphere';style.textContent=css;document.head.append(style);},baseline);await pause(50);
  const released=await run(sample);await capture('rocket-league-released-reference-'+view,1920,1080);
  const differences=current.map((row,i)=>JSON.stringify(row)===JSON.stringify(released[i])?null:{current:row,released:released[i]}).filter(Boolean);
  report.flows.push({name:'Rocket League '+view+' content matches released material values',passed:differences.length===0,elements:current.length,differences});
  await run(()=>{document.querySelector('link[href*="liquid-glass.css"]').disabled=false;document.querySelector('link[href*="game-atmosphere.css"]').disabled=false;document.querySelector('#qa-released-atmosphere').remove();});
  if(differences.length)throw Error('Rocket League differs from released material: '+view);
 }
 await run(()=>document.querySelector('[data-rl-view="live"]')?.click());await pause(250);
 for(const [width,height]of[[1920,1080],[2560,1440],[3840,2160],[1440,900],[1200,900],[1000,900],[640,900]]){
  await capture('rocket-league-centred-tabs',width,height);
  const geometry=await run(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};};const tabs=rect('.rl-tabs'),brand=rect('.rl-commandbar .rl-brand'),actions=rect('.rl-header-tools');const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;return{viewport:innerWidth,tabs,brand,actions,offset:Math.abs(tabs.x+tabs.width/2-innerWidth/2),overlap:overlaps(tabs,brand)||overlaps(tabs,actions)||overlaps(brand,actions)};});
  const passed=!geometry.overlap&&(width<1200||geometry.offset<1);report.flows.push({name:'Rocket League tabs centre without overlap at '+width,passed,geometry});if(!passed)throw Error('Tab geometry failed at '+width);
 }
};
