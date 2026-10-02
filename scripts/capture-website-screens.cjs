'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async({boot,run,win,pause,capture,report})=>{
 const destination=path.resolve(__dirname,'../.validation-cache/followup-252/website-screens');fs.mkdirSync(destination,{recursive:true});
 report.fixture='Real Dropzone renderer with bundled public game data. Rocket League uses isolated, explicitly fictional Demo Player match fixtures; these are labeled sample statistics on the website. No actual account or gameplay data is read.';
 const shoot=async name=>{await capture('website-252-'+name,1600,1000);const shot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'webp',quality:90,captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width:1600,height:1000,scale:1}});fs.writeFileSync(path.join(destination,name+'.webp'),Buffer.from(shot.data,'base64'));};
 const click=async selector=>{await run(s=>{const b=document.querySelector(s);if(!b)throw Error('Missing '+s);b.click();},selector);await pause(300);};
 await boot('home');await shoot('library');
 await boot('finals');await click('[data-finals-class="Medium"]');await shoot('finals');await click('[data-finals-tab="teams"]');await shoot('finals-team');
 await boot('wardogs');
 await run(()=>{for(const [key,x,y] of [['origin',80,70],['target',84,72]]){const form=document.querySelector('[data-wd-coordinate="'+key+'"]');form.querySelector('[name=x]').value=x;form.querySelector('[name=y]').value=y;form.requestSubmit();}});await pause(400);await click('[data-wd-action="sight"]');await shoot('wardogs');
 await boot('sensitivity');await shoot('sensitivity');
 await boot('rocket-league',()=>run(()=>{
  const identity='website-demo',now=Date.now();
  const players=['Demo Player','Atlas','Nova','Echo','Orbit','Vector'].map((Name,i)=>({Name,PrimaryId:i===0?identity:'demo-'+i,TeamNum:i<3?0:1,Score:[540,380,310,410,290,220][i],Goals:[2,1,1,2,1,0][i],Assists:[1,2,0,1,0,1][i],Saves:[3,1,2,2,3,1][i],Shots:[5,4,3,4,2,2][i],Touches:25+i*3,CarTouches:7+i,Demos:i%2}));
  const match={id:'website-demo-match',startedAt:now-340000,status:'complete',ended:true,winner:0,players,game:{PlaylistId:13,TimeSeconds:0,Teams:[{TeamNum:0,Score:4},{TeamNum:1,Score:3}]},events:[]};
  const state={status:'connected',connected:true,dataRevision:1,historyDays:30,settings:{identity,tracking:true},match:null,lastMatch:match};
  const records=Array.from({length:48},(_,i)=>({match_id:'website-demo-'+i,played_at:new Date(now-(Math.floor(i/3)+1)*86400000).toISOString(),won:i%5<3,stats:{PlaylistId:i%2?11:13,Score:320+i%6*35,Goals:i%4,Assists:i%3,Saves:1+i%4,Shots:4+i%5,Touches:24+i%15,CarTouches:5+i%4,Demos:i%3,EpicSaves:i%2,CrossbarHits:i%2,TimesDemolished:i%3,Overtime:i%8===0?1:0}}));
  rift.rocketLeague=async q=>{if(q.action==='state')return state;if(q.action==='players')return players.map(p=>({id:p.PrimaryId,name:p.Name}));if(q.action==='account-state')return{enabled:true,user:null,profile:{display_name:'Demo Player'}};if(q.action==='cloud-records')return records;if(q.action==='playtime')return Array.from({length:16},(_,i)=>({source:'website-demo',day:Math.floor((now-(i+1)*86400000)/86400000)*86400000,kind:'ranked',seconds:1800+i%4*600}));if(q.action==='history')return{total:0,matches:[],groups:[]};if(q.action==='analytics')return{career:{matches:0},recent:{matches:0},session:{matches:0}};return{};};
  rift.onRocketLeague=()=>()=>{};
 }));
 await shoot('rocket-league-match');await click('[data-rl-view="personal"]');await shoot('rocket-league-profile');
 fs.writeFileSync(path.join(destination,'provenance.json'),JSON.stringify({capturedAt:new Date().toISOString(),appVersion:require('../package.json').version,sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),sourceState:'Current local UI changes; no app release created',dimensions:[1600,1000],fixture:report.fixture,files:fs.readdirSync(destination).filter(n=>n.endsWith('.webp'))},null,2)+'\n');
};
