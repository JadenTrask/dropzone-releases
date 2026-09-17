'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
// Only named visual controls can change remotely. Never load remote code or CSS.
const CONTROLS={introBlur:[0,40,'px'],introZoom:[1,2.5,''],pageGutter:[16,48,'px'],settingsGap:[12,32,'px'],panelPadding:[16,32,'px']};
const CSS_NAMES={introBlur:'--visual-intro-blur',introZoom:'--visual-intro-zoom',pageGutter:'--visual-page-gutter',settingsGap:'--visual-settings-gap',panelPadding:'--visual-panel-padding'};
function validate(payload){
 if(!payload||payload.schema!==1||!Number.isSafeInteger(payload.revision)||payload.revision<1||payload.compatibility!=='visual-v1')throw Error('Unsupported visual package.');
 if(Object.keys(payload).some(k=>!['schema','revision','compatibility','tokens','assets'].includes(k)))throw Error('Unknown visual package field.');
 const tokens=payload.tokens||{},assets=payload.assets||{};
 for(const [k,v] of Object.entries(tokens)){const spec=CONTROLS[k];if(!spec||typeof v!=='number'||!Number.isFinite(v)||v<spec[0]||v>spec[1])throw Error('Invalid visual control: '+k);}
 for(const [k,v] of Object.entries(assets)){
  if(!['startupLogo','brandIcon'].includes(k)||typeof v!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(v)||v.length>2800000)throw Error('Invalid visual asset.');
  const bytes=Buffer.from(v.split(',')[1],'base64');if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)>4096||bytes.readUInt32BE(20)>4096)throw Error('Invalid PNG asset.');
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(!w||!h||(k==='startupLogo'&&(w!==1536||h!==1024))||(k==='brandIcon'&&w!==h))throw Error('Unexpected asset dimensions.');
 }
 return {schema:1,revision:payload.revision,compatibility:payload.compatibility,tokens,assets};
}
function verify(envelope,publicKey){
 if(!envelope||typeof envelope.payload!=='string'||typeof envelope.signature!=='string'||envelope.payload.length>8000000)throw Error('Invalid signed visual package.');
 const bytes=Buffer.from(envelope.payload,'base64');
 if(!crypto.verify(null,bytes,publicKey,Buffer.from(envelope.signature,'base64')))throw Error('Visual signature rejected.');
 return validate(JSON.parse(bytes.toString('utf8')));
}
class VisualUpdates{
 constructor({directory,config,fetcher=fetch}){Object.assign(this,{directory,config,fetcher});this.active=null;this.staged=null;this.error=null;this.pending=null;}
 async start(){try{const envelope=JSON.parse(await fs.readFile(path.join(this.directory,'visual.json'),'utf8'));this.active=verify(envelope,this.config.publicKey);}catch{}return this.status();}
 status(){return {active:this.active,stagedRevision:this.staged,error:this.error};}
 async check(){if(this.pending)return this.pending;this.pending=this.download().finally(()=>this.pending=null);return this.pending;}
 async download(){try{
  const response=await this.fetcher(this.config.url,{signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});if(!response.ok)throw Error('Visual feed HTTP '+response.status);
  let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>8100000)throw Error('Visual package too large.');chunks.push(Buffer.from(chunk));}
  const envelope=JSON.parse(Buffer.concat(chunks).toString('utf8')),data=verify(envelope,this.config.publicKey);
  if(data.revision>Math.max(this.active?.revision||0,this.staged||0)){await fs.mkdir(this.directory,{recursive:true});const file=path.join(this.directory,'visual.json');await fs.writeFile(file+'.tmp',JSON.stringify(envelope));await fs.rename(file+'.tmp',file);this.staged=data.revision;}
  this.error=null;
 }catch(error){this.error=error.message;}return this.status();}
}
module.exports={VisualUpdates,validate,verify,CONTROLS,CSS_NAMES};
