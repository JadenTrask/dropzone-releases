const HOME='https://metaforge.app/wardogs/progression';
const PAGES={progression:HOME,profile:'https://metaforge.app/wardogs/player-stats',career:'https://metaforge.app/wardogs/progression/tables/career'};
const HOSTS=new Set(['metaforge.app','accounts.google.com','discord.com','steamcommunity.com']);
function allowedNavigation(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&HOSTS.has(u.hostname);}catch{return false;}}
function panelBounds(value,size,zoom=1){
 if(!value||!['x','y','width','height'].every(k=>Number.isFinite(value[k]))||!Number.isFinite(zoom)||zoom<=0)return null;
 const [width,height]=size,x=Math.max(0,Math.min(width,Math.round(value.x*zoom))),y=Math.max(36,Math.min(height,Math.round(value.y*zoom)));
 const w=Math.max(0,Math.min(width-x,Math.round(value.width*zoom))),h=Math.max(0,Math.min(height-y,Math.round(value.height*zoom)));
 return w>=40&&h>=40?{x,y,width:w,height:h}:null;
}
function createMetaForgePanel({main,WebContentsView,BrowserWindow,session}){
 let preferences=null;
 function remotePreferences(){
  if(preferences)return preferences;
  const isolated=session.fromPartition('persist:dropzone-metaforge');
  isolated.setPermissionRequestHandler((_wc,_permission,done)=>done(false));
  isolated.setPermissionCheckHandler(()=>false);
  isolated.on('will-download',event=>event.preventDefault());
  return preferences={session:isolated,sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true};
 }
 let view=null,popup=null,token=null,page='progression',timer=null;
 const emit=(status,message)=>{if(!main.isDestroyed()&&!main.webContents.isDestroyed())main.webContents.send('metaforge-status',{token,status,message});};
 const closePopup=()=>{if(popup&&!popup.isDestroyed())popup.destroy();popup=null;};
 const protect=wc=>{
  const guard=(event,url)=>{if(!allowedNavigation(url)){event.preventDefault();emit('blocked','This destination cannot open inside Dropzone. Use Open in browser.');}};
  wc.on('will-navigate',guard);wc.on('will-redirect',guard);
  wc.on('will-attach-webview',event=>event.preventDefault());
  wc.setWindowOpenHandler(({url})=>{
   if(!allowedNavigation(url)){emit('blocked','Use Open in browser for this external link.');return {action:'deny'};}
   closePopup();return {action:'allow',overrideBrowserWindowOptions:{parent:main,width:560,height:760,autoHideMenuBar:true,title:'MetaForge sign-in · '+new URL(url).hostname,webPreferences:remotePreferences()}};
  });
  wc.on('did-create-window',child=>{
   popup=child;protect(child.webContents);
   child.webContents.on('page-title-updated',event=>event.preventDefault());
   child.webContents.on('did-navigate',(_event,next)=>{try{child.setTitle('MetaForge sign-in · '+new URL(next).hostname);}catch{}});
   child.on('closed',()=>{if(popup===child)popup=null;});
  });
 };
 function close(){clearTimeout(timer);closePopup();if(view){const old=view;view=null;if(!main.isDestroyed())main.contentView.removeChildView(old);if(!old.webContents.isDestroyed())old.webContents.close({waitForBeforeUnload:false});}token=null;}
 function layout(bounds){if(!view)return;const rect=panelBounds(bounds,main.getContentSize(),main.webContents.getZoomFactor());view.setVisible(!!rect);if(rect)view.setBounds(rect);}
 function navigate(){
  if(!view)return;clearTimeout(timer);emit('loading','Loading MetaForge…');
  const wc=view.webContents;
  timer=setTimeout(()=>{if(view?.webContents===wc)emit('slow','MetaForge is taking longer than expected. Complete any verification shown below, or open it in your browser.');},15000);
  wc.loadURL(PAGES[page]).catch(error=>{if(view?.webContents===wc&&error.code!=='ERR_ABORTED')emit('error','MetaForge could not load. Retry or open it in your browser.');});
 }
 function command(input){
  if(!input||!Number.isSafeInteger(input.token)||input.token<1)throw new Error('Invalid panel request.');
  if(input.action==='show'){
   close();token=input.token;page=Object.hasOwn(PAGES,input.page)?input.page:'progression';
   view=new WebContentsView({webPreferences:remotePreferences()});main.contentView.addChildView(view);protect(view.webContents);
   const wc=view.webContents;
   wc.on('did-start-loading',()=>{if(view?.webContents===wc)emit('loading','Loading MetaForge…');});
   wc.on('did-finish-load',()=>{if(view?.webContents!==wc)return;clearTimeout(timer);emit('ready','Live MetaForge website · sign-in and data stay with MetaForge.');});
   wc.on('did-fail-load',(_event,code,_description,_url,isMainFrame)=>{if(view?.webContents===wc&&isMainFrame&&code!==-3){clearTimeout(timer);emit('error','MetaForge could not load. Retry or open it in your browser.');}});
   wc.on('render-process-gone',()=>emit('error','The MetaForge panel stopped responding. Select Reload.'));
   layout(input.bounds);navigate();return {available:true};
  }
  if(input.token!==token)return {ignored:true};
  if(input.action==='hide')close();
  else if(input.action==='layout')layout(input.bounds);
  else if(input.action==='page'){if(!Object.hasOwn(PAGES,input.page))throw new Error('Unknown MetaForge page.');page=input.page;navigate();}
  else if(input.action==='reload')navigate();
  else throw new Error('Unknown panel action.');
  return {available:true};
 }
 main.on('closed',close);
 main.webContents.on('render-process-gone',close);
 main.webContents.on('did-start-navigation',(_event,_url,isInPlace,isMainFrame)=>{if(isMainFrame&&!isInPlace)close();});
 return {command,close};
}
module.exports={createMetaForgePanel,allowedNavigation,panelBounds,PAGES};
