const {EventEmitter}=require('node:events');
const {validateFeed}=require('../core/release-config.cjs');
class AppUpdateService extends EventEmitter{
  constructor({version,feed,installed=false,packaged=false,platform=process.platform,createUpdater,now=Date.now}){
    super();this.now=now;this.inFlight=null;this.lastAttempt=0;
    let destination,configurationError=false;try{destination=validateFeed(feed);}catch{configurationError=true;}
    const reason=configurationError?'configuration':!packaged?'development':platform!=='win32'?'platform':!installed?'portable':!destination?'unconfigured':null;
    this.state={version,status:reason?'disabled':'idle',reason,enabled:!reason,availableVersion:null,percent:0,checkedAt:null,error:null};
    if(reason)return;
    const updater=this.updater=createUpdater(destination);
    updater.autoDownload=true;
    updater.autoInstallOnAppQuit=false;
    updater.allowPrerelease=false;
    updater.allowDowngrade=false;
    updater.disableWebInstaller=true;
    updater.on('checking-for-update',()=>this.set({status:'checking',error:null}));
    updater.on('update-not-available',()=>this.set({status:'current',availableVersion:null,percent:0,error:null,checkedAt:new Date(this.now()).toISOString()}));
    updater.on('update-available',info=>this.set({status:'downloading',availableVersion:info.version,percent:0,error:null,checkedAt:new Date(this.now()).toISOString()}));
    updater.on('download-progress',info=>this.set({status:'downloading',percent:Math.max(0,Math.min(100,Number(info.percent)||0))}));
    updater.on('update-downloaded',info=>this.set({status:'ready',availableVersion:info.version,percent:100,error:null}));
    updater.on('error',()=>this.fail());
    updater.on('update-cancelled',()=>this.set({status:'error',error:'Update download stopped. Try again when you are ready.'}));
  }
  status(){return {...this.state};}
  set(patch){Object.assign(this.state,patch);this.emit('status',this.status());}
  fail(){this.set({status:'error',error:'App update failed. Your current version is still available. Try again later.'});}
  check(force=false){
    if(!this.updater||['ready','installing'].includes(this.state.status))return Promise.resolve(this.status());
    if(this.inFlight)return this.inFlight;
    if(!force&&this.lastAttempt&&this.now()-this.lastAttempt<6*60*60_000)return Promise.resolve(this.status());
    this.lastAttempt=this.now();
    this.inFlight=Promise.resolve().then(async()=>{
      try{const result=await this.updater.checkForUpdates();if(result?.downloadPromise)await result.downloadPromise;}
      catch{this.fail();}
      finally{this.inFlight=null;}
      return this.status();
    });
    return this.inFlight;
  }
  install(){
    if(!this.updater||this.state.status!=='ready')return false;
    this.set({status:'installing',error:null});
    try{this.updater.quitAndInstall(false,true);return true;}catch{this.fail();return false;}
  }
}
module.exports={AppUpdateService};
