'use strict';
const {url}=require('./account-config.json');
const FUNCTION='bright-api',ENDPOINT=url+'/functions/v1/'+FUNCTION;
const base={available:false,provider:'Apex Legends Status (unofficial)',providerUrl:'https://apexlegendsstatus.com',documentationUrl:'https://apexlegendsapi.com/documentation',platforms:['PC','PS4','X1'],uidPlatforms:['PC','PS4','X1','SWITCH'],minimumIntervalMs:2000,historyAvailable:false,leaderboardsAvailable:false};
const messages={
 'ready':'Player lookup is available.',
 'sign-in-required':'Sign in to your Dropzone account to look up an Apex player.',
 'setup-required':'The Apex player service needs provider configuration.',
 'validation-required':'The secure player service is deployed. Live player fields still need validation before lookup is enabled.',
 'service-unavailable':'The player service could not be reached. Try again shortly.',
 'provider-unavailable':'Apex Legends Status is unavailable. Try again shortly.',
 'provider-response-invalid':'The provider returned an unsupported response. Player statistics have not been displayed.',
 'invalid-player':'Enter a valid EA or platform name.',
 'player-not-found':'No player was found. Check the platform and EA or platform name.',
 'rate-limited':'The provider is busy. Wait before trying again.',
 'response-received':'A real v5 response was received. Player fields are awaiting validation.'
};
function request(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid player lookup request.');
 const action=input.action||'status';if(!['status','lookup','validate'].includes(action))throw Error('Unsupported player action.');
 if(action==='status')return{action};
 if(typeof input.uid==='string'&&/^\d{1,20}$/.test(input.uid)&&input.player===undefined&&['PC','PS4','X1','SWITCH'].includes(input.platform))return {action,platform:input.platform,uid:input.uid};
 if(input.uid!==undefined)throw Error('Enter a valid EA or platform name.');
 if(!['PC','PS4','X1'].includes(input.platform)||typeof input.player!=='string'||!input.player.trim()||input.player.length>64||/[\u0000-\u001f]/.test(input.player))throw Error('Enter a valid EA or platform name.');
 return {action,platform:input.platform,player:input.player.trim()};
}
function sanitize(result){
 const status=Object.hasOwn(messages,result?.status)?result.status:'service-unavailable';
 const clean={...base,status,configured:result?.configured===true,message:messages[status]};
 if(status==='ready'){
  if(result.contractVersion!==1||result.available!==true||result.configured!==true)return sanitize({status:'provider-response-invalid'});
  clean.available=true;clean.contractVersion=1;
  if(result.profile!==undefined){const profile=require('./apex-profile.cjs').sanitizeProfile(result.profile);if(!profile)return sanitize({status:'provider-response-invalid',configured:true});clean.profile=profile;}
 }
 const diagnostic=result?.diagnostic;
 if(diagnostic&&['authentication','quota','provider'].includes(diagnostic.stage)&&['provider-request-rejected','provider-access-denied','player-not-found','provider-external-error','platform-rejected','provider-rate-limited','provider-http-error','response-too-large','invalid-json','invalid-payload','request-failed'].includes(diagnostic.code)){
  clean.diagnostic={stage:diagnostic.stage,code:diagnostic.code};
  if(Number.isInteger(diagnostic.http)&&diagnostic.http>=100&&diagnostic.http<=599)clean.diagnostic.http=diagnostic.http;
 }
 if(status==='rate-limited')clean.retryAfter=Math.min(300,Math.max(2,Number(result.retryAfter)||2));
 if(status==='response-received'&&result.apiVersion===5&&Array.isArray(result.schema)){
  clean.apiVersion=5;clean.checkedAt=typeof result.checkedAt==='string'?result.checkedAt:null;
  clean.schema=result.schema.slice(0,600).filter(x=>typeof x==='string'&&x.length<700&&!/auth|token|secret|password/i.test(x));
 }
 return clean;
}
// Main injects the encrypted account boundary; tokens stay inside that module.
class ApexPlayerProvider{
 constructor({invoke=null}={}){this.invoke=invoke;}
 setInvoke(invoke){this.invoke=invoke;}
 async get(input={}){const body=request(input);if(!this.invoke)return sanitize({status:'sign-in-required'});try{return sanitize(await this.invoke(body));}catch{return sanitize({status:'service-unavailable'});}}
}
module.exports={ApexPlayerProvider,ENDPOINT,FUNCTION,request,sanitize};
