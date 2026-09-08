const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {AppUpdateService}=require('../desktop/app-updater.cjs');
const {validateFeed}=require('../core/release-config.cjs');
const {coordinateStartup}=require('../desktop/startup.cjs');
const feed={provider:'github',owner:'dropzone-test',repo:'releases'};
function setup(overrides={}){
 const updater=new EventEmitter();updater.checkForUpdates=async()=>{updater.emit('checking-for-update');updater.emit('update-not-available');return {};};let installs=0;updater.quitAndInstall=()=>{installs++;};
 let creates=0;const service=new AppUpdateService({version:'1.0.0-beta.1',feed,installed:true,packaged:true,platform:'win32',createUpdater:()=>{creates++;return updater;},...overrides});
 return {service,updater,creates:()=>creates,installs:()=>installs};
}
test('no updater or network for an unconfigured, portable, or development app',async()=>{
 for(const overrides of [{feed:null},{installed:false},{packaged:false},{platform:'linux'}]){const s=setup(overrides);await s.service.check(true);assert.equal(s.creates(),0);assert.equal(s.service.status().enabled,false);assert.equal(s.service.install(),false);}
});
test('release destinations reject credentials, insecure URLs, and malformed repository names',()=>{
 for(const feed of [{provider:'generic',url:'http://example.com/'},{provider:'generic',url:'https://secret:token@example.com/'},{provider:'generic',url:'https://example.com/?token=secret'},{provider:'github',owner:'../../bad',repo:'app'},{provider:'github',owner:'owner',repo:'../bad'},{provider:'other'}])assert.throws(()=>validateFeed(feed));
 assert.equal(validateFeed({provider:'generic',url:'https://example.com/updates'}).url,'https://example.com/updates/');
});
test('only a completed download can trigger an install; no automatic quit or downgrade',async()=>{
 const s=setup();assert.equal(s.updater.autoDownload,true);assert.equal(s.updater.autoInstallOnAppQuit,false);assert.equal(s.updater.allowPrerelease,false);assert.equal(s.updater.allowDowngrade,false);assert.equal(s.updater.disableWebInstaller,true);
 assert.equal(s.service.install(),false);s.updater.emit('update-available',{version:'1.0.0'});s.updater.emit('download-progress',{percent:42});assert.equal(s.service.status().percent,42);assert.equal(s.service.install(),false);
 s.updater.emit('update-downloaded',{version:'1.0.0'});assert.equal(s.service.status().status,'ready');assert.equal(s.installs(),0);assert.equal(s.service.install(),true);assert.equal(s.installs(),1);assert.equal(s.service.install(),false);
});
test('concurrent checks and downloads coalesce and successful checks honor the interval',async()=>{
 let time=1000,resolve,calls=0;const s=setup({now:()=>time});s.updater.checkForUpdates=async()=>{calls++;s.updater.emit('checking-for-update');return {downloadPromise:new Promise(r=>{resolve=r;})};};
 const first=s.service.check(true);assert.equal(first,s.service.check(true));await Promise.resolve();assert.equal(calls,1);assert.equal(first,s.service.check(true));resolve();await first;
 await s.service.check();assert.equal(calls,1);time+=6*60*60_000;s.updater.checkForUpdates=async()=>{calls++;s.updater.emit('update-not-available');return {};};await s.service.check();assert.equal(calls,2);assert.equal(s.service.status().status,'current');
});
test('failed download is never ready, retains the last check time, and can be retried',async()=>{
 const s=setup();await s.service.check(true);const checked=s.service.status().checkedAt;
 s.updater.checkForUpdates=async()=>({downloadPromise:Promise.reject(new Error('checksum mismatch'))});await s.service.check(true);assert.equal(s.service.status().status,'error');assert.equal(s.service.install(),false);assert.equal(s.service.status().checkedAt,checked);
 s.updater.checkForUpdates=async()=>{s.updater.emit('update-not-available');return {};};await s.service.check(true);assert.equal(s.service.status().status,'current');
});
test('synchronous check failures do not leave a permanently locked check',async()=>{
 const s=setup();let calls=0;s.updater.checkForUpdates=()=>{calls++;throw new Error('failure');};await s.service.check(true);await s.service.check(true);assert.equal(calls,2);
});
function startup(){
 const make=()=>{const w=new EventEmitter();w.webContents=new EventEmitter();w.dead=false;w.shown=false;w.isDestroyed=()=>w.dead;w.show=()=>{w.shown=true;};w.destroy=()=>{w.dead=true;};return w;};
 const main=make(),splash=make(),timers=[];coordinateStartup({main,splash,schedule:(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},cancel:t=>{if(t)t.cancelled=true;}});return {main,splash,fire:ms=>{for(const t of timers)if(t.ms===ms&&!t.cancelled){t.cancelled=true;t.fn();}}};
}
test('splash stays for two seconds when the main window is ready early',()=>{
 const s=startup();s.splash.emit('ready-to-show');s.main.emit('ready-to-show');assert.equal(s.splash.shown,true);assert.equal(s.main.shown,false);s.fire(2000);assert.equal(s.main.shown,true);assert.equal(s.splash.dead,true);
});
test('a slow window waits for readiness after the splash minimum; a stalled window has a ceiling',()=>{
 const s=startup();s.splash.emit('ready-to-show');s.fire(2000);assert.equal(s.main.shown,false);s.main.emit('ready-to-show');assert.equal(s.main.shown,true);
 const stalled=startup();stalled.fire(10000);assert.equal(stalled.main.shown,true);assert.equal(stalled.splash.dead,true);
});
test('closing during startup cancels the splash and cannot reopen the main window',()=>{
 const s=startup();s.splash.emit('ready-to-show');s.main.dead=true;s.main.emit('closed');s.fire(2000);s.fire(10000);assert.equal(s.splash.dead,true);assert.equal(s.main.shown,false);
});
