'use strict';
const {buildOverview}=require('../core/rocket-league-analysis.cjs');
module.exports=async({boot,run,win,pause,capture,report})=>{
 const asOf=Date.UTC(2026,9,1,15),state={status:'waiting',historyDays:365,dataRevision:1,settings:{identity:'isolated-fixture',tracking:true}};
 const history=Array.from({length:63},(_,i)=>({id:'fixture-'+i,startedAt:asOf-(i+1)*86400000,status:'complete',ended:true,winner:i%3?0:1,players:[{PrimaryId:'isolated-fixture',Name:'TEST FIXTURE',TeamNum:0,Goals:i%4,Shots:5,Score:400}],game:{PlaylistId:11}}));
 const fixtures=Object.fromEntries(['nice','brutal'].map(t=>{const {text,summary}=buildOverview({state,history,asOf,playtime:[]},t);return[t,{text,summary}];}));
 {const {text,summary}=buildOverview({state,history:[],asOf,playtime:[]});fixtures.empty={text,summary};}
 report.fixture='Isolated synthetic tracker data for clipboard and renderer tests; no real account, clipboard writes, gameplay data or external AI service.';
 await boot(()=>run(({state,fixtures})=>{
  window.qaAnalysis={calls:[],copies:[],pending:null,fail:false,clipboardFail:false};
  rift.rocketLeague=async q=>{qaAnalysis.calls.push(q);if(q.action==='analysis-overview')return new Promise((resolve,reject)=>{qaAnalysis.pending=()=>qaAnalysis.fail?reject(Error('Your account history could not be read. Check your connection and sign-in, then try again. Nothing was copied.')):resolve(fixtures[qaAnalysis.empty?'empty':q.tone==='brutal'?'brutal':'nice']);});if(q.action==='state')return state;if(q.action==='account-state')return{enabled:true,user:null};if(q.action==='players')return[];if(q.action==='analytics')return{career:{matches:0},recent:{matches:0},session:{matches:0}};if(q.action==='history')return{total:0,matches:[],groups:[]};return{};};
  rift.onRocketLeague=()=>()=>{};rift.copy=async text=>{if(qaAnalysis.clipboardFail)throw Error('fixture clipboard failure');qaAnalysis.copies.push(text);return true;};
 },{state,fixtures}));
 const check=(name,passed,details={})=>{report.flows.push({name,passed,...details});if(!passed)throw Error(name);};
 const click=async selector=>{await run(s=>document.querySelector(s).click(),selector);await pause(120);};
 await click('[data-rl-view=analysis]');
 const tabs=await run(()=>[...document.querySelectorAll('.rl-tabs>[data-rl-view]:not(#rl-live-indicator)')].map(b=>b.textContent));
 check('AI Overview precedes final Videos tab',JSON.stringify(tabs)===JSON.stringify(['Live tracker','Match history','My profile','Friends','Tracker settings','AI Overview','Videos']),{tabs});
 check('No prompt collection or clipboard write on mount',await run(()=>qaAnalysis.copies.length===0&&!qaAnalysis.calls.some(q=>q.action==='analysis-overview')));
 for(const [w,h]of[[1920,1080],[2560,1440],[3840,2160],[1000,900],[640,900]]){
  await capture('rl-ai-overview',w,h);
  const geometry=await run(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};},tabs=rect('.rl-tabs'),brand=rect('.rl-brand'),tools=rect('.rl-header-tools'),overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;return{tabs,brand,tools,offset:Math.abs(tabs.x+tabs.width/2-innerWidth/2),overlap:overlap(tabs,brand)||overlap(tabs,tools)||overlap(brand,tools),controls:[...document.querySelectorAll('.rl-ai-overview button')].every(b=>{const r=b.getBoundingClientRect();return r.width>=40&&r.height>=36;}),internalOverflow:[...document.querySelectorAll('.rl-ai-overview,.rl-ai-workspace,.rl-tabs')].map(n=>n.scrollWidth-n.clientWidth)};});
  check('AI layout remains readable and navigation does not overlap at '+w,!geometry.overlap&&(w<1200||geometry.offset<1)&&geometry.controls&&geometry.internalOverflow.every(n=>n<2),geometry);
 }
 await capture('rl-ai-ready',1920,1080);
 const original=await run(()=>{window.qaOverview=document.querySelector('.rl-ai-overview');return document.querySelector('.rl-ai-summary').getBoundingClientRect().top;});
 await click('[data-ai-tone=brutal]');await click('[data-ai-copy]');await click('[data-ai-copy]');
 check('One snapshot for repeated copy clicks; tone controls locked while loading',await run(()=>qaAnalysis.calls.filter(q=>q.action==='analysis-overview').length===1&&document.querySelector('[data-ai-tone=brutal]').disabled&&document.querySelector('[data-ai-copy]').disabled));
 await capture('rl-ai-loading',1920,1080);await run(()=>qaAnalysis.pending());await pause(100);
 await capture('rl-ai-copied-brutal',1920,1080);
 check('Brutal prompt copied privately without repaint or layout jump',await run(top=>qaAnalysis.copies.length===1&&qaAnalysis.copies[0].includes('BRUTAL COACH')&&!document.body.textContent.includes('BEGIN TRACKED DATA')&&qaOverview===document.querySelector('.rl-ai-overview')&&Math.abs(document.querySelector('.rl-ai-summary').getBoundingClientRect().top-top)<.5,original));
 await click('[data-ai-tone=nice]');await click('[data-ai-copy]');await run(()=>qaAnalysis.pending());await pause(100);
 check('Nice tone produces its own prompt on the same action',await run(()=>qaAnalysis.copies.length===2&&qaAnalysis.copies[1].includes('NICE COACH')));
 await run(()=>qaAnalysis.fail=true);await click('[data-ai-copy]');await run(()=>qaAnalysis.pending());await pause(100);await capture('rl-ai-history-error',1920,1080);
 check('History failure recovers without copy or row movement',await run(top=>qaAnalysis.copies.length===2&&!document.querySelector('[data-ai-copy]').disabled&&document.querySelector('.rl-ai-feedback').dataset.state==='error'&&Math.abs(document.querySelector('.rl-ai-summary').getBoundingClientRect().top-top)<.5,original));
 await run(()=>{qaAnalysis.fail=false;qaAnalysis.clipboardFail=true;});await click('[data-ai-copy]');await run(()=>qaAnalysis.pending());await pause(100);await capture('rl-ai-clipboard-error',1920,1080);
 check('Clipboard failure is clear and retryable',await run(()=>document.querySelector('.rl-ai-feedback').textContent.includes('Clipboard access failed')&&!document.querySelector('[data-ai-copy]').disabled));
 await run(()=>qaAnalysis.clipboardFail=false);await click('[data-ai-copy]');await click('[data-rl-view=videos]');await run(()=>qaAnalysis.pending());await pause(350);
 check('Leaving AI Overview during preparation prevents late clipboard write',await run(()=>qaAnalysis.copies.length===2&&!!document.querySelector('.watch-page')));await capture('rl-ai-videos-final-tab',1920,1080);
 await run(()=>document.querySelector('[data-rl-view=analysis]').focus());for(const type of ['keyDown','keyUp'])await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});await pause(200);
 check('AI tab supports keyboard activation and restores selected tone',await run(()=>!!document.querySelector('.rl-ai-overview')&&document.querySelector('[data-ai-tone=nice]').getAttribute('aria-pressed')==='true'));
 await run(()=>qaAnalysis.empty=true);await click('[data-ai-copy]');await run(()=>qaAnalysis.pending());await pause(100);await capture('rl-ai-empty-history',1920,1080);
 check('Empty retained history copies an explicit no-data prompt',await run(()=>document.querySelector('.rl-ai-feedback').textContent.includes('no-data prompt')&&document.querySelector('[data-ai-count]').textContent==='0 matches'&&document.querySelector('[data-ai-period]').textContent==='No recorded matches'));
 await run(()=>document.body.classList.add('app-high-contrast'));await capture('rl-ai-high-contrast',1920,1080);
 check('AI Overview honors high-contrast material preference',await run(()=>{const s=getComputedStyle(document.querySelector('.rl-ai-compose'));return s.backdropFilter==='none'&&s.backgroundColor.startsWith('rgb(')&&s.borderTopColor===getComputedStyle(document.querySelector('.rl-ai-overview')).color;}));
 await run(()=>document.body.classList.remove('app-high-contrast'));await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]});await capture('rl-ai-reduced-transparency',1920,1080);
 check('AI Overview removes backdrop blur and translucency when requested',await run(()=>{const s=getComputedStyle(document.querySelector('.rl-ai-compose'));return s.backdropFilter==='none'&&s.backgroundColor.startsWith('rgb(');}));
};
