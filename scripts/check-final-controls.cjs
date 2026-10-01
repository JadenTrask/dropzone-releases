'use strict';
module.exports=async({route,run,win,pause,capture,report,data})=>{
 if(route==='settings'){
  await require('./check-regression-interactions.cjs')({route,run,win,pause,capture,report,data});
  const passed=await run(()=>{const i=document.querySelector('#launch-at-login').getBoundingClientRect(),s=document.querySelector('.startup-setting-toggle span').getBoundingClientRect();return i.width>=18&&i.height>=18&&s.left-i.right>=8&&s.left-i.right<=12;});
  report.flows.push({name:'Startup checkbox stays next to its label',passed});if(!passed)throw Error('Startup spacing regression');return;
 }
 await run(()=>document.querySelector('[data-gz-tab="missions"]').click());await pause(250);
 const p=await run(()=>{const r=document.querySelector('[data-gz-mission]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
 await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
 for(const [w,h]of [[1920,1080],[1000,900]]){
  await capture('gzw-mission-hover-final',w,h);
  const passed=await run(()=>{const s=document.querySelector('.gz-status'),buttons=[...s.querySelectorAll('button')],sort=document.querySelector('.gz-sort .select-control'),reset=document.querySelector('[data-gz-action="reset-filters"]');return s.getBoundingClientRect().height<=40&&buttons.every(b=>parseFloat(getComputedStyle(b).paddingLeft)>=10&&parseFloat(getComputedStyle(b).paddingRight)>=10)&&sort.getBoundingClientRect().width>=85&&reset.getBoundingClientRect().height>=30&&reset.getBoundingClientRect().left-sort.getBoundingClientRect().right>=6;});
  report.flows.push({name:'Compact GZW sort/footer spacing at '+w,passed});if(!passed)throw Error('GZW compact-control regression');
 }
 await run(()=>document.querySelector('#gz-mission-sort-control').click());await pause(80);
 await run(()=>document.querySelector('#gz-mission-sort-options [data-value="vendor"]').click());await pause(80);
 const sorted=await run(()=>document.querySelector('#gz-mission-sort').value==='vendor');
 await run(()=>document.querySelector('[data-gz-action="reset-filters"]').click());await pause(80);
 const reset=await run(()=>document.querySelector('#gz-mission-sort').value==='name');
 report.flows.push({name:'GZW shared mission sort and reset remain functional',passed:sorted&&reset});if(!sorted||!reset)throw Error('Mission sort/reset failed');
};
