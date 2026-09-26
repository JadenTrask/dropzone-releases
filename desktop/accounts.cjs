'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {aggregate}=require('../core/rocket-league-model.cjs');
function createAccounts({directory,safeStorage,config=require('../core/account-config.json'),fetcher=fetch}){
 const enabled=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')&&typeof config.publishableKey==='string'&&config.publishableKey.startsWith('sb_publishable_');
 let session=null,loaded=false,refreshing=null;const file=path.join(directory,'account-session.bin');
 async function persist(){if(!session){await fs.rm(file,{force:true});return;}if(!safeStorage.isEncryptionAvailable())throw Error('Secure account storage is unavailable on this computer.');await fs.mkdir(directory,{recursive:true});const temporary=file+'.'+randomUUID();await fs.writeFile(temporary,safeStorage.encryptString(JSON.stringify(session)));await fs.rename(temporary,file);}
 async function load(){if(loaded)return;loaded=true;if(!safeStorage.isEncryptionAvailable())return;try{session=JSON.parse(safeStorage.decryptString(await fs.readFile(file)));}catch{session=null;}}
 async function send(endpoint,{method='GET',body,token}={}){if(!enabled)throw Error('Accounts are not configured for this test build yet.');const response=await fetcher(config.url+endpoint,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:config.publishableKey,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw Error('Account service returned an invalid response.');}if(!response.ok){if(response.status===429)throw Error('Too many attempts. Please wait before trying again.');if(response.status===401||response.status===403)throw Error('Sign-in expired or permission denied. Please sign in again.');throw Error(data?.msg||data?.error_description||data?.message||'Account request failed.');}return data;}
 async function accept(data){if(!data?.access_token||!data?.refresh_token)throw Error('Check your email to verify your account.');session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),user:{id:data.user.id,email:data.user.email}};await persist();}
 async function token(){await load();if(!session)throw Error('Sign in first.');if(session.expires_at<Date.now()/1000+60){if(!refreshing)refreshing=send('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(accept).finally(()=>{refreshing=null;});await refreshing;}return session.access_token;}
 const rest=async(endpoint,options={})=>send('/rest/v1/'+endpoint,{...options,token:await token()});
 const rpc=(name,body={})=>rest('rpc/'+name,{method:'POST',body});
 const email=v=>{if(typeof v!=='string'||v.length>254||!/^\S+@\S+\.\S+$/.test(v))throw Error('Enter a valid email address.');return v.trim();};
 const password=v=>{if(typeof v!=='string'||v.length<12||v.length>128)throw Error('Use a password with 12 to 128 characters.');return v;};
 const uuid=v=>{if(typeof v!=='string'||!/^[0-9a-f-]{36}$/i.test(v))throw Error('Invalid friend.');return v;};
 async function state(){await load();if(!enabled)return {enabled:false};if(!session)return {enabled:true,user:null};await token();const profiles=await rest('profiles?id=eq.'+session.user.id+'&select=id,handle,display_name,avatar,share_stats');return {enabled:true,user:session.user,profile:profiles?.[0]||null};}
 return {async command(q){switch(q.action){
 case 'account-history-policy':await load();return {days:session?365:30};
 case 'account-state':return state();
 case 'account-signup':{const handle=String(q.handle||'').trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Use 3–24 letters, numbers or underscores for your username.');await send('/auth/v1/signup',{method:'POST',body:{email:email(q.email),password:password(q.password),data:{handle}}});return {message:'Check your email for a verification code.'};}
 case 'account-signin':await accept(await send('/auth/v1/token?grant_type=password',{method:'POST',body:{email:email(q.email),password:password(q.password)}}));return state();
 case 'account-recover':await send('/auth/v1/recover',{method:'POST',body:{email:email(q.email)}});return {message:'If this address has an account, a recovery code is on its way.'};
 case 'account-verify':{if(!['signup','recovery'].includes(q.type)||!/^\d{6,10}$/.test(q.code||''))throw Error('Enter the code from your email.');const next=q.type==='recovery'?password(q.password):null;await accept(await send('/auth/v1/verify',{method:'POST',body:{email:email(q.email),token:q.code,type:q.type}}));if(next)await send('/auth/v1/user',{method:'PUT',token:await token(),body:{password:next}});return state();}
 case 'account-signout':await load();try{if(session)await send('/auth/v1/logout',{method:'POST',token:await token()});}finally{session=null;await persist();}return {enabled,user:null};
 case 'account-profile':{const body={};if(typeof q.share_stats==='boolean')body.share_stats=q.share_stats;if(typeof q.display_name==='string')body.display_name=q.display_name.trim().slice(0,40);if(typeof q.avatar==='string'&&q.avatar.length<200000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(q.avatar))body.avatar=q.avatar;await token();await rest('profiles?id=eq.'+session.user.id,{method:'PATCH',body});return state();}
 case 'account-friends':return rpc('list_friends');
 case 'account-add':if(!/^[a-z0-9_]{3,24}$/.test(q.handle||''))throw Error('Enter their exact Dropzone username.');await rpc('request_friend',{friend_handle:q.handle});return {message:'Friend request sent.'};
 case 'account-accept':await rest('friendships?requester=eq.'+uuid(q.id)+'&recipient=eq.'+(await state()).user.id,{method:'PATCH',body:{accepted:true}});return {ok:true};
 case 'account-remove':await rpc('remove_friend',{other_id:uuid(q.id)});return {ok:true};
 case 'account-stats':{const id=uuid(q.id),rows=[];for(let offset=0;;offset+=1000){const page=await rest('match_records?owner=eq.'+id+'&played_at=gte.'+encodeURIComponent(new Date(Date.now()-365*86400000).toISOString())+'&select=match_id,played_at,won,stats&order=played_at.asc,match_id.asc&limit=1000&offset='+offset);rows.push(...page.filter(r=>![9,73].includes(r.stats?.PlaylistId)));if(page.length<1000)break;}const matches=rows.map(r=>({id:r.match_id,startedAt:Date.parse(r.played_at),status:'complete',overtime:r.stats.Overtime===1,winner:r.won?0:1,players:[{...r.stats,PrimaryId:id,TeamNum:0}]}));const profiles=await rest('profiles?id=eq.'+id+'&select=id,handle,display_name,avatar,share_stats');return {...aggregate(matches,id),profile:profiles?.[0]||null,records:rows};}
 case 'account-upload':{if(!Array.isArray(q.matches)||q.matches.length>100)throw Error('Invalid match batch.');const access=await token();if(q.owner!==session.user.id)throw Error('Account changed. Retry syncing your history.');await send('/rest/v1/rpc/save_matches',{method:'POST',token:access,body:{records:q.matches}});return {ok:true};}
 case 'account-delete':if(q.confirm!=='DELETE')throw Error('Type DELETE to confirm account deletion.');await rpc('delete_my_account');session=null;await persist();return {enabled,user:null};
 default:throw Error('Unknown account request.');
 }} };
}
module.exports={createAccounts};
