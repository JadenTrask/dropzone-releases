'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async({boot,run,win,pause,capture,report,output})=>{
 const directory=path.resolve(output,'../../watch-backgrounds');fs.mkdirSync(directory,{recursive:true});
 await boot('siege');
 report.art=await run(async()=>{
  const rows=[];
  for(const name of ['siege.png','lol.png','rlcs.webp','finals.svg']){
   const image=new Image();image.src='/assets/watch/'+name;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1,transparent=0;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const a=pixels[(y*canvas.width+x)*4+3];if(a<1)transparent++;if(a>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
   rows.push({name,width:canvas.width,height:canvas.height,bounds:[x0,y0,x1+1,y1+1],transparentPixels:transparent,corners:[0,canvas.width-1,canvas.width*(canvas.height-1),canvas.width*canvas.height-1].map(i=>Array.from(pixels.slice(i*4,i*4+4)))});
  }
  return rows;
 });
 fs.writeFileSync(path.join(directory,'asset-bounds.json'),JSON.stringify(report.art,null,2));
 if(process.argv.includes('--asset-inspect')){
  await run(async()=>{const grid=document.createElement('div');grid.style.cssText='position:fixed;inset:0;z-index:99999;display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:40px;background:#243347;box-sizing:border-box';grid.innerHTML=['siege.png','lol.png','rlcs.webp','finals.svg'].map(name=>'<div style="display:grid;place-items:center;min-height:0"><img style="width:90%;height:350px;object-fit:contain;'+(/siege|finals/.test(name)?'filter:invert(1);':'')+'" src="/assets/watch/'+name+'"></div>').join('');document.body.append(grid);await Promise.all([...grid.querySelectorAll('img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const shot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(directory,'originals-rendered.png'),Buffer.from(shot.data,'base64'));return;
 }
 const check=(name,passed,details={})=>{report.flows.push({name,passed,...details});if(!passed)throw Error(name);};
 const screenshot=async()=>{await pause(100);return(await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',fromSurface:true})).data;};
 const difference=async(a,b,regions)=>run(async(a,b,regions)=>{
  const images=await Promise.all([a,b].map(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();return i;}));
  const values=images.map(image=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);return c.getImageData(0,0,canvas.width,canvas.height).data;});let sum=0,count=0;
  for(const r of regions)for(let y=Math.max(0,Math.ceil(r.y));y<Math.min(images[0].height,Math.floor(r.y+r.height));y++)for(let x=Math.max(0,Math.ceil(r.x));x<Math.min(images[0].width,Math.floor(r.x+r.width));x++){const i=(y*images[0].width+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(values[0][i+c]-values[1][i+c]);count++;}}
  return sum/count;
 },a,b,regions);
 for(const game of ['siege','lol','finals','rocket-league']){
  await boot(game);await run(game=>document.querySelector(game==='rocket-league'?'[data-rl-view="videos"]':'[data-game-page="videos"]').click(),game);
  for(let i=0;i<100;i++){if(await run(()=>!!document.querySelector('.watch-page')&&!document.querySelector('[data-refresh-videos]').disabled))break;await pause(50);}
  for(const [w,h]of (process.argv.includes('--background-proof')?[[1920,1080]]:[[1920,1080],[2560,1440],[3840,2160],[1000,900]])){
   await capture('background-'+game,w,h);
   const metrics=await run(async()=>{
    const page=document.querySelector('.watch-page'),s=getComputedStyle(page,'::before'),image=new Image();image.src=s.backgroundImage.slice(5,-2);await image.decode();
    const rect={left:parseFloat(s.left)-parseFloat(s.width)/2,top:parseFloat(s.top)-parseFloat(s.height)/2,width:parseFloat(s.width),height:parseFloat(s.height)};
    const rail=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-width'))||72;
    const panel=document.querySelector('.video-copy'),p=getComputedStyle(panel),title=getComputedStyle(panel.querySelector('strong'));
    return{image:[image.naturalWidth,image.naturalHeight],background:s.backgroundImage,position:s.position,rect,rail,viewport:[innerWidth,innerHeight],center:[rect.left+rect.width/2,rect.top+rect.height/2],panelBlur:p.backdropFilter,panelBackground:p.backgroundColor,titleFilter:title.filter,opacity:s.opacity};
   });
   check(game+' contained and centered art at '+w,metrics.position==='fixed'&&Math.abs(metrics.center[0]-(w+metrics.rail)/2)<1&&Math.abs(metrics.center[1]-h/2)<1&&metrics.rect.left>=metrics.rail&&metrics.rect.top>=0&&metrics.rect.left+metrics.rect.width<=w&&metrics.rect.top+metrics.rect.height<=h,metrics);
   check(game+' glass diffuses behind sharp titles at '+w,/blur\(/.test(metrics.panelBlur)&&metrics.titleFilter==='none');
   await run(()=>{const p=document.querySelector('.watch-page'),scroller=p.closest('.rl-main-panel')||p,more=document.querySelector('[data-more-videos]');if(scroller.scrollHeight<=scroller.clientHeight&&more&&!more.hidden)more.click();});
   const scrolling=await run(()=>{const page=document.querySelector('.watch-page'),scroller=page.closest('.rl-main-panel')||page;const before=getComputedStyle(page,'::before');const rect=[before.top,before.left,before.width,before.height,before.transform];const content=document.querySelector('.video-card').getBoundingClientRect().top;scroller.scrollTop=500;const after=getComputedStyle(page,'::before');return{before:rect,after:[after.top,after.left,after.width,after.height,after.transform],scroll:scroller.scrollTop,contentMove:content-document.querySelector('.video-card').getBoundingClientRect().top,contentFits:scroller.scrollHeight<=scroller.clientHeight};});
   check(game+(scrolling.contentFits?' centered art when content fits at ':' fixed art while scrolling at ')+w,((scrolling.scroll>0&&scrolling.contentMove>0)||scrolling.contentFits)&&JSON.stringify(scrolling.before)===JSON.stringify(scrolling.after),scrolling);
   await capture('background-'+game+'-scroll',w,h);
   await run(()=>{const p=document.querySelector('.watch-page');(p.closest('.rl-main-panel')||p).scrollTop=0;});
  }
  if(process.argv.includes('--background-proof')){
   await run(()=>{window.qaArtworkStyle=document.createElement('style');qaArtworkStyle.textContent='.watch-page>*{visibility:hidden!important}';document.head.append(qaArtworkStyle);});
   const before=await screenshot();await run(()=>{const p=document.querySelector('.watch-page');(p.closest('.rl-main-panel')||p).scrollTop=500;});const after=await screenshot();
   const stationary=await difference(before,after,[{x:80,y:110,width:1840,height:970}]);check(game+' rendered background pixels stay stationary during scrolling',stationary<.25,{meanRgbDifference:stationary});
   fs.writeFileSync(path.join(directory,game+'-isolated-background.png'),Buffer.from(before,'base64'));
   const regions=await run(()=>{qaArtworkStyle.textContent='';const p=document.querySelector('.watch-page');(p.closest('.rl-main-panel')||p).scrollTop=0;return[...document.querySelectorAll('.watch-filter,.video-copy')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x+4,y:r.y+4,width:r.width-8,height:r.height-8};});});
   const glass=await screenshot();await run(()=>qaArtworkStyle.textContent='.watch-page :is(.watch-filter,.video-copy){backdrop-filter:none!important}');const clear=await screenshot();
   const diffusion=await difference(glass,clear,regions);check(game+' actual rendered glass changes backdrop pixels',diffusion>.15,{meanRgbDifference:diffusion});await run(()=>qaArtworkStyle.remove());
   await run(()=>document.body.classList.add('app-high-contrast'));check(game+' high contrast removes decorative art',await run(()=>getComputedStyle(document.querySelector('.watch-page'),'::before').display==='none'));await run(()=>document.body.classList.remove('app-high-contrast'));
   await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]});check(game+' reduced transparency removes decorative art',await run(()=>getComputedStyle(document.querySelector('.watch-page'),'::before').display==='none'));await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  }
 }
 fs.writeFileSync(path.join(directory,process.argv.includes('--background-proof')?'pixel-proof-report.json':'renderer-report.json'),JSON.stringify(report,null,2));
};
