'use strict';
// Explicit presentation fixtures exercise unavailable/sparse states. No service
// credentials or fabricated production statistics are used by this renderer audit.
const fs=require('node:fs'),path=require('node:path');
module.exports=async({boot,run,win,pause,capture,report})=>{
 const sizes=[[1920,1080],[2560,1440],[3840,2160]],fixtureTime='2026-10-01T04:00:00Z';
 const base={schema:1,identity:{name:'Layout fixture',uid:'123456789',platform:'PC'},level:140,prestige:0,selectedLegend:'Wraith',checkedAt:fixtureTime,metrics:[{label:'Career kills',value:1234},{label:'Career wins',value:67}],ranks:[{mode:'Battle Royale',name:'Gold',division:2,score:8500,season:'br_ranked_s30_s2'}],legends:[{name:'Wraith',trackers:[{label:'BR Kills',value:840},{label:'BR Wins',value:36},{label:'Portal: Distance traveled',value:91000},{label:'BR Season 9 kills',value:74}]}]};
 const ready=profile=>({status:'ready',available:true,configured:true,profile});
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 const click=async selector=>{await run(selector=>{const target=document.querySelector(selector);if(!target)throw Error('Missing '+selector);target.click();},selector);await pause(120);};
 const configure=async(saved={recent:[],favorites:[]},result=ready(base),delay=0)=>{await boot('?game=apex');await run(async(saved,result,delay)=>{localStorage.setItem('dropzone-apex-players-v1',JSON.stringify(saved));window.qaPlayerResult=result;window.qaPlayerDelay=delay;window.qaPlayerCalls=[];window.rift.apexPlayer=async q=>{window.qaPlayerCalls.push(q);if(q.action==='status')return{available:true,status:'ready',configured:true};if(window.qaPlayerDelay)await new Promise(r=>setTimeout(r,window.qaPlayerDelay));return window.qaPlayerResult;};await(await import('/apex-ui.js')).mountApex('loadouts');},saved,result,delay);await pause(130);};
 const submit=async(value='Layout fixture')=>{await run(value=>{const input=document.querySelector('.apex-player-form input');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.apex-player-form').requestSubmit();},value);await pause(150);};
 const shots=async(name,widths=sizes)=>{for(const [w,h]of widths)await capture('apex-composition-'+name,w,h);};
 if(process.argv.includes('--apex-smoke')){
  await configure();await shots('landing-empty',[...sizes,[1000,900],[640,900]]);
  report.flows.push({name:'Liquid search diffuses only its backdrop',passed:await run(()=>parseFloat(getComputedStyle(document.querySelector('.apex-player-form')).backdropFilter.match(/blur\(([\d.]+)px\)/)?.[1])>=24&&getComputedStyle(document.querySelector('.apex-player-form input')).filter==='none'&&getComputedStyle(document.querySelector('.apex-player-form input')).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(document.querySelector('.apex-player-form input')).backgroundImage==='none'),style:await run(()=>{const f=getComputedStyle(document.querySelector('.apex-player-form'));return{backdrop:f.backdropFilter,background:f.backgroundColor};})});
  await run(()=>document.querySelector('.apex-player-form input').focus());await capture('apex-composition-search-focus',1920,1080);
  const actual=path.resolve(__dirname,'../.validation-cache/regressions-248/apex-fresh-profile.json'),result=fs.existsSync(actual)?JSON.parse(fs.readFileSync(actual)):ready(base);
  await configure(undefined,result);await submit(result.profile.identity.name);await shots('actual-response-replay',[...sizes,[1000,900]]);
  await run(()=>document.querySelector('.apex-profile-legend summary').focus());
  for(const type of ['keyDown','keyUp'])await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});
  await check('Native keyboard Enter expands tracker details',()=>document.querySelector('.apex-profile-legend details').open);
  await run(()=>document.querySelector('[data-apex-back]').focus());
  for(const type of ['keyDown','keyUp'])await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})});
  await pause(300);await check('Keyboard Back returns to player search',()=>!!document.querySelector('.apex-player-form'));
  fs.writeFileSync(path.resolve(__dirname,'../.validation-cache/apex-composition-smoke-report.json'),JSON.stringify(report,null,2));return;
 }
 const saved=Array.from({length:9},(_,i)=>({name:'Fixture player '+(i+1),uid:String(40000+i),platform:['PC','PS4','X1'][i%3],rank:i%2?'Gold II':'',checkedAt:fixtureTime}));
 for(const [name,rows]of [['empty',[]],['one',saved.slice(0,1)],['many',saved]]){
  await configure({recent:rows,favorites:rows.slice(0,3)});await shots('landing-'+name);
  await check(name+' landing keeps centered search usable over local scene',()=>{const page=document.querySelector('.apex-page[data-player-view=landing]'),form=document.querySelector('.apex-player-form'),input=form?.querySelector('input'),r=form?.getBoundingClientRect(),scene=page&&getComputedStyle(page,'::before');return !document.querySelector('.apex-profile')&&!!input&&r.width>400&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<innerHeight&&scene.backgroundImage.includes('/assets/apex/')&&scene.position==='fixed';});
  if(name==='many'){await click('[data-apex-history="favorites"]');await check('Favorites list and star toggle',()=>document.querySelectorAll('.apex-saved-player').length===3);await click('[data-apex-toggle]');await check('Removing favorite updates local list',()=>document.querySelectorAll('.apex-saved-player').length===2);await shots('favorites');}
 }
 await configure({recent:saved.slice(0,1),favorites:[]});
 await run(()=>{const select=document.querySelector('#apex-platform');select.value='PS4';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await submit('Original query');await shots('profile-one-legend');
 await check('Profile owns full workspace without search or news rail',()=>!!document.querySelector('[data-apex-back]')&&!!document.querySelector('.apex-profile')&&!document.querySelector('.apex-player-form,.apex-landing-news,.apex-overview-feed')&&getComputedStyle(document.querySelector('.apex-page'),'::before').backgroundImage==='none');
 await check('Selected platform/name reach existing API boundary',()=>window.qaPlayerCalls.some(q=>q.player==='Original query'&&q.platform==='PS4'));
 await click('[data-apex-favorite]');await check('Favorite saves checked rank metadata',()=>{const f=JSON.parse(localStorage.getItem('dropzone-apex-players-v1')).favorites[0];return f.rank==='Gold 2'&&!!f.checkedAt;});
 await click('.apex-profile-legend summary');await check('Scoped extra tracker details expand',()=>document.querySelector('.apex-profile-legend details').open&&document.querySelector('.apex-profile-legend details').textContent.includes('Season 9'));
 await click('[data-apex-back]');await pause(250);
 await check('Back to Players restores query and platform',()=>document.querySelector('.apex-player-form input')?.value==='Original query'&&document.querySelector('#apex-platform')?.value==='PS4');
 const before=await run(()=>window.qaPlayerCalls.filter(q=>q.action==='lookup').length);await run(()=>history.forward());await pause(350);
 const after=await run(()=>window.qaPlayerCalls.filter(q=>q.action==='lookup').length);await check('Browser forward restores profile',()=>!!document.querySelector('.apex-profile-identity'));if(before!==after)throw Error('History forward unnecessarily queried provider');
 await run(()=>history.back());await pause(300);await click('[data-apex-identifier]');await submit('123456789');await check('UID mode sends UID without player-name key',()=>window.qaPlayerCalls.some(q=>q.uid==='123456789'&&!q.player));
 const art=require('../app/data/apex/legend-art.json');
 const many={...base,identity:{...base.identity,name:'Extensive layout fixture'},legends:art.legends.slice(0,22).map((legend,i)=>({name:legend.name,trackers:i%3===0?[{label:'BR Kills',value:100+i}]:[{label:'BR Kills',value:100+i},{label:'BR Wins',value:5+i},{label:'BR Season 9 kills',value:22},{label:'Tactical: Uses',value:500}]}))};
 for(const [name,profile]of [['many-legends',many],['sparse',{...base,level:null,prestige:null,selectedLegend:'',ranks:[],metrics:[],legends:[]}],['seasonal-duplicates',{...base,ranks:[],metrics:[],legends:[{name:'Lifeline',trackers:[{label:'BR Season 9 kills',value:23},{label:'BR Season 9 kills',value:23},{label:'BR Season 9 kills',value:25},{label:'Arenas Wins',value:4},{label:'BR Wins',value:8}]},{name:'Unknown legend',trackers:[{label:'Equipment: Charges',value:2}]}]}]]){
  await configure(undefined,ready(profile));await submit();await shots('profile-'+name);
  if(name==='many-legends')await check('Tracked legends appear in first screenful',()=>document.querySelector('.apex-profile-legend').getBoundingClientRect().bottom<innerHeight);
  if(name==='seasonal-duplicates')await check('Only exact duplicate removed; seasonal and mode scope retained',()=>document.querySelector('.apex-profile-legend header>span').textContent==='4 trackers'&&document.querySelector('.apex-profile-legends').textContent.includes('Arenas'));
 }
 const actual=path.resolve(__dirname,'../.validation-cache/regressions-248/apex-fresh-profile.json');if(fs.existsSync(actual)){const result=JSON.parse(fs.readFileSync(actual));await configure(undefined,result);await submit(result.profile.identity.name);await shots('actual-response-replay',[...sizes,[1000,900]]);report.flows.push({name:'Actual authenticated profile contract replay',passed:true,checkedAt:result.profile.checkedAt,network:'No new live call; existing validated response replayed'});}
 await configure(undefined,ready(base),6000);await submit();await shots('loading',[[1920,1080]]);await click('[data-apex-back]');await pause(6200);await check('Back during slow lookup cancels stale profile paint',()=>!!document.querySelector('.apex-player-form')&&!document.querySelector('.apex-profile-identity'));
 for(const [name,result]of [['not-found',{status:'player-not-found',message:'No player found. Check the EA name and platform.'}],['provider-error',{status:'provider-unavailable',message:'The provider could not respond. Try again shortly.'}],['rate-limit',{status:'rate-limited',retryAfter:2,message:'Please wait two seconds before another lookup.'}],['sign-in',{status:'sign-in-required',available:false,message:'Sign in to your Dropzone account to continue.'}]]){
  await configure(undefined,result);await submit();if(name==='rate-limit')await check('Quota retry is disabled during cooldown',()=>document.querySelector('[data-apex-retry]').disabled);await shots(name);
  await check(name+' retains back and recovery controls',()=>!!document.querySelector('[data-apex-back]')&&!!document.querySelector('.apex-player-error'));
  if(name==='rate-limit'){await pause(2100);await check('Quota retry becomes available after cooldown',()=>!document.querySelector('[data-apex-retry]').disabled);}
 }
 await configure();for(const page of ['apex-news']){await click('[data-game-page="'+page+'"]');await pause(350);await check(page+' shared navigation remains functional',()=>document.querySelectorAll('.patches-page .patch-row').length>0);}
 fs.writeFileSync(path.resolve(__dirname,'../.validation-cache/apex-composition-report.json'),JSON.stringify(report,null,2));
};
