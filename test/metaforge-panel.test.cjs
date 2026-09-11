const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {allowedNavigation,panelBounds,createMetaForgePanel}=require('../desktop/metaforge-panel.cjs');
test('MetaForge navigation permits HTTPS pages and known sign-in providers only',()=>{
 for(const url of ['https://metaforge.app/wardogs/progression','https://accounts.google.com/o/oauth2/auth','https://discord.com/oauth2/authorize','https://steamcommunity.com/openid/login'])assert.ok(allowedNavigation(url));
 for(const url of ['http://metaforge.app','https://metaforge.app.evil.test','https://metaforge.app@evil.test','file:///C:/Windows','javascript:alert(1)','https://metaforge.app:8080'])assert.ok(!allowedNavigation(url));
});
test('browser view bounds scale with app zoom and stay inside the window',()=>{
 assert.deepEqual(panelBounds({x:100,y:150,width:600,height:400},[1000,800],1.25),{x:125,y:188,width:750,height:500});
 assert.equal(panelBounds({x:Infinity,y:0,width:100,height:100},[1000,800]),null);
 assert.equal(panelBounds(null,[1000,800]),null);
 assert.deepEqual(panelBounds({x:900,y:700,width:500,height:500},[1000,800]),{x:900,y:700,width:100,height:100});
});
test('remote view is isolated, closed on exit, and ignores stale layout requests',()=>{
 const main=new EventEmitter();main.isDestroyed=()=>false;main.getContentSize=()=>[1200,900];main.webContents=new EventEmitter();main.webContents.isDestroyed=()=>false;main.webContents.send=()=>{};main.webContents.getZoomFactor=()=>1;let child;
 main.contentView={addChildView:v=>child=v,removeChildView:()=>{}};
 const partition=new EventEmitter();partition.setPermissionRequestHandler=fn=>partition.permission=fn;partition.setPermissionCheckHandler=()=>{};
 let sessionName;
 class View{constructor(options){this.options=options;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=fn=>this.popup=fn;this.webContents.loadURL=async()=>{};this.webContents.isDestroyed=()=>false;this.webContents.close=()=>this.closed=true;}setVisible(v){this.visible=v;}setBounds(b){this.bounds=b;}}
 const panel=createMetaForgePanel({main,WebContentsView:View,BrowserWindow:class{},session:{fromPartition:name=>{sessionName=name;return partition;}}});
 panel.command({action:'show',token:1,bounds:{x:200,y:250,width:900,height:500}});
 assert.equal(sessionName,'persist:dropzone-metaforge');assert.equal(child.options.webPreferences.nodeIntegration,false);assert.equal(child.options.webPreferences.sandbox,true);assert.equal(child.options.webPreferences.preload,undefined);
 let permitted;partition.permission(null,'camera',v=>permitted=v);assert.equal(permitted,false);
 const old=child;panel.command({action:'hide',token:1});assert.equal(old.closed,true);
 panel.command({action:'show',token:2,bounds:{x:200,y:250,width:900,height:500}});
 assert.deepEqual(panel.command({action:'hide',token:1}),{ignored:true});assert.equal(child.closed,undefined);panel.close();
});
