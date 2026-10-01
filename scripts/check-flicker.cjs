'use strict';
// Normal-speed compositor frames, not paused/retimed transition screenshots.
const fs=require('node:fs'),path=require('node:path');
module.exports=async({run,win,pause,report,output,data})=>{
 const before=process.argv.includes('--before'),directory=path.join(output,'flicker');fs.mkdirSync(directory,{recursive:true});
 await win.setContentSize(1920,1080);await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,screenWidth:1920,screenHeight:1080,deviceScaleFactor:1,mobile:false});
 let frames=null;
 win.webContents.debugger.on('message',(_event,method,event)=>{if(method!=='Page.screencastFrame')return;if(frames)frames.push({data:event.data,timestamp:event.metadata.timestamp});void win.webContents.debugger.sendCommand('Page.screencastFrameAck',{sessionId:event.sessionId});});
 const check=(name,passed,details={})=>{report.flows.push({name,passed,...details});if(!passed&&!before)throw Error(name);};
 const click=async selector=>{for(let i=0;i<100;i++){if(await run(s=>!!document.querySelector(s),selector)){await run(s=>document.querySelector(s).click(),selector);return;}await pause(50);}throw Error('Missing '+selector+' on '+await run(()=>document.documentElement.dataset.game));};
 const settle=async()=>{await pause(500);for(let i=0;i<100;i++){if(await run(()=>!document.documentElement.classList.contains('dz-transitioning')&&!document.activeViewTransition))return;await pause(50);}throw Error('Transition did not settle');};
 await run(async games=>{
  window.qaPreferences={startMinimized:false,openLiveTrackerOnSession:false,startup:false};
  const save=async()=>new Promise(resolve=>setTimeout(resolve,25));
  rift.launchBehavior=async input=>{if(input.action==='set'){await save();qaPreferences[input.key]=input.enabled;}return{available:true,startMinimized:qaPreferences.startMinimized,openLiveTrackerOnSession:qaPreferences.openLiveTrackerOnSession};};
  rift.loginStartup=async input=>{if(input.action==='set'){await save();qaPreferences.startup=input.enabled;}return{available:true,enabled:qaPreferences.startup,message:qaPreferences.startup?'Dropzone starts when you sign in to Windows.':'Off. Dropzone will not start with Windows.'};};
  const {mountSettings}=await import('/app-settings.js');mountSettings(games);
 },data.games);await settle();
 async function record(name,actions){
  frames=[];
  await run(()=>{
   window.qaFlicker={samples:[],events:[],running:true,started:Date.now()};
   const el=document.querySelector('.app-settings');window.qaFlicker.originalSettings=el;
   const sample=()=>{if(!qaFlicker.running)return;const h=document.querySelector('.rl-commandbar'),c=h?getComputedStyle(h):null;
    qaFlicker.samples.push({at:Date.now(),settingsTops:[...document.querySelectorAll('.startup-setting,.app-settings>.panel')].map(n=>n.getBoundingClientRect().top),settingsSame:!el||el===document.querySelector('.app-settings'),saveStatus:[...document.querySelectorAll('.startup-setting p')].filter(p=>!p.hidden&&p.getBoundingClientRect().height>2).map(p=>p.textContent),header:h?{x:h.getBoundingClientRect().x,y:h.getBoundingClientRect().y,width:h.getBoundingClientRect().width,height:h.getBoundingClientRect().height,background:c.backgroundImage,backdrop:c.backdropFilter}:null,theme:getComputedStyle(document.documentElement).getPropertyValue('--atmos-primary'),transition:document.documentElement.classList.contains('dz-transitioning')});requestAnimationFrame(sample);};
   document.addEventListener('animationstart',event=>qaFlicker.events.push({name:event.animationName,tag:event.target.tagName,at:Date.now()}),{signal:(window.qaFlickerController=new AbortController()).signal});sample();
  });
  await win.webContents.debugger.sendCommand('Page.startScreencast',{format:'png',maxWidth:1280,maxHeight:720,everyNthFrame:1});await pause(180);
  await run(()=>qaFlicker.actionsStarted=Date.now());
  await actions();await pause(450);
  await win.webContents.debugger.sendCommand('Page.stopScreencast');
  const samples=await run(()=>{qaFlicker.running=false;qaFlickerController.abort();return{samples:qaFlicker.samples,events:qaFlicker.events,started:qaFlicker.started,actionsStarted:qaFlicker.actionsStarted};});
  const saved=frames;frames=null;
  for(let i=0;i<saved.length;i++)fs.writeFileSync(path.join(directory,name+'-'+String(i).padStart(3,'0')+'.png'),Buffer.from(saved[i].data,'base64'));
  const header=samples.samples.find(s=>s.header)?.header;
  const visuals=await run(async input=>{
   const images=[];for(const frame of input.frames){const img=new Image();img.src='data:image/png;base64,'+frame.data;await img.decode();images.push(img);}
   const pixels=document.createElement('canvas');pixels.width=images[0].width;pixels.height=images[0].height;const ctx=pixels.getContext('2d',{willReadFrequently:true});
   const headerColors=[];for(const img of images){ctx.drawImage(img,0,0);if(input.header){const h=input.header,scale=img.width/1920,x=Math.floor((h.x+50)*scale),y=Math.floor((h.y+7)*scale),w=Math.floor((h.width-100)*scale),bytes=ctx.getImageData(x,y,w,3).data,sums=[0,0,0];for(let i=0;i<bytes.length;i+=4)for(let c=0;c<3;c++)sums[c]+=bytes[i+c];headerColors.push(sums.map(v=>v/(bytes.length/4)));}}
   const candidates=[];for(let i=0;i<input.frames.length;i++){if(!i||i===input.frames.length-1||input.frames[i].timestamp-input.frames[candidates.at(-1)||0].timestamp>.085)candidates.push(i);}
   const selected=candidates.slice(0,24),cols=4,cellW=320,cellH=input.header?110:220,strip=document.createElement('canvas');strip.width=cols*cellW;strip.height=Math.ceil(selected.length/cols)*cellH;const sc=strip.getContext('2d');sc.fillStyle='#10131a';sc.fillRect(0,0,strip.width,strip.height);sc.font='13px sans-serif';
   selected.forEach((i,n)=>{const x=(n%cols)*cellW,y=Math.floor(n/cols)*cellH,im=images[i];sc.fillStyle='#fff';sc.fillText(((input.frames[i].timestamp-input.frames[0].timestamp)*1000).toFixed(0)+' ms',x+6,y+17);if(input.header){const scale=im.width/1920;sc.drawImage(im,0,input.header.y*scale,im.width,(input.header.height+12)*scale,x,y+25,cellW,cellH-25);}else sc.drawImage(im,45,65,900,520,x,y+25,cellW,cellH-25);});
   return{strip:strip.toDataURL('image/png').split(',')[1],headerColors,dimensions:{width:images[0].width,height:images[0].height}};
  },{frames:saved,header});
  fs.writeFileSync(path.join(directory,name+'-timeline.png'),Buffer.from(visuals.strip,'base64'));delete visuals.strip;
  const result={name,source:'Normal-speed Page.startScreencast; original timestamps retained. Isolated service fixture saves after 25ms.',frames:saved.map((f,i)=>({file:name+'-'+String(i).padStart(3,'0')+'.png',timestamp:f.timestamp})),...samples,...visuals};fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(result,null,2));report.captures.push({file:'flicker/'+name+'-timeline.png',frames:saved.length,normalSpeed:true});return result;
 }
 const settings=await record('settings-save',async()=>{for(const id of ['launch-startMinimized','launch-openLiveTrackerOnSession','launch-at-login','launch-startMinimized']){await click('#'+id);await pause(450);}});
 const start=settings.samples[0].settingsTops;const shift=Math.max(...settings.samples.flatMap(s=>s.settingsTops.map((v,i)=>Math.abs(v-start[i]))));check('Settings saves do not move rows or cards',shift<.5,{maxShift:shift});check('Settings saves retain the existing text DOM',settings.samples.every(s=>s.settingsSame));
 await click('[data-route="rocket-league"]');await settle();
 const rl=await record('rocket-tabs',async()=>{for(const view of ['history','personal','friends','settings']){await click('[data-rl-view="'+view+'"]');await pause(600);}});
 // The warm-up frames can include the tail of the preceding cross-game paint.
 // Compare against the last frame before the first tab click, not that warm-up.
 const baselineFrame=Math.max(0,rl.frames.findIndex(f=>f.timestamp*1000>=rl.actionsStarted)-1),base=rl.headerColors[baselineFrame],pulse=Math.max(...rl.headerColors.slice(baselineFrame).flatMap(c=>c.map((v,i)=>Math.abs(v-base[i]))));check('Same-game header pixels remain stable through tab fades',pulse<1.5,{maxChannelChange:pulse,first:base,baselineFrame});check('Same-game theme channels do not change',new Set(rl.samples.map(s=>s.theme)).size===1);
 if(before)return;
 await record('rapid-tabs-games',async()=>{for(const view of ['live','videos','history','friends','settings']){await click('[data-rl-view="'+view+'"]');await pause(65);}await pause(500);await click('[data-route="apex"]');await pause(110);await click('[data-route="siege"]');await pause(600);});
 check('Interrupted game changes finish on Siege',await run(()=>document.documentElement.dataset.game==='siege'&&!!document.querySelector('.r6-team-member')));
 await click('[data-route="rocket-league"]');await settle();
 await run(()=>document.querySelector('[data-rl-view="history"]').focus());for(const type of ['keyDown','keyUp'])await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});await settle();check('Keyboard tab activation works',await run(()=>document.querySelector('[data-rl-view="history"]').getAttribute('aria-pressed')==='true'));
 await click('[data-route="home"]');await settle();check('Home remains navigable after interrupted transitions',await run(()=>!!document.querySelector('.library-page .game-grid')),{page:await run(()=>({game:document.documentElement.dataset.game,main:document.querySelector('#hub-app main')?.className}))});
 report.flicker={settingsShift:shift,headerPulse:pulse,directory};
 if(process.argv.includes('--evidence'))await require('./flicker-evidence.cjs')({run,output});
};
