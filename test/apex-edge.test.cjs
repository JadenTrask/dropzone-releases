const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('backend/supabase/functions/apex-player/index.ts','utf8'));
function service(fetcher){let handler;const values={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',DROPZONE_APEX_ALS_KEY:'fixture-provider-secret'};vm.runInNewContext(source,{Deno:{env:{get:n=>values[n]},serve:fn=>handler=fn},Response,URL,AbortSignal,TextDecoder,fetch:fetcher});return body=>handler(new Request('https://fixture.supabase.co/functions/v1/apex-player',{method:'POST',headers:{Authorization:'Bearer fixture.user.jwt'},body:JSON.stringify(body)}));}

test('Provider route negotiates before execution; accept its handler then validate JSON',async()=>{
 const invoke=service(async(url,options)=>{
  if(String(url).endsWith('/user'))return Response.json({id:'fixture'});
  if(String(url).includes('/rpc/'))return Response.json(0);
  if(options.headers.Accept==='application/json')return new Response('Not acceptable: PHP handler',{status:406});
  assert.equal(options.headers.Accept,'*/*');
  return Response.json({global:{name:'fixture'}});
 });
 const response=await invoke({action:'validate',platform:'PC',uid:'1000301388710'});
 assert.equal(response.status,200);assert.equal((await response.json()).status,'response-received');
});
test('Apex function rejects invalid user auth before touching quota or provider',async()=>{let calls=0;const invoke=service(async()=>{calls++;return Response.json({}, {status:401});});const result=await invoke({action:'status'});assert.equal(result.status,401);assert.equal(calls,1);assert.deepEqual(await result.json(),{status:'sign-in-required'});});

test('Validated lookup exposes only supported profile fields and matches the requested identity',async()=>{
 const payload={global:{name:'Test Player',uid:'123',platform:'PC',level:42,levelPrestige:1,rank:{rankName:'Gold',rankDiv:2,rankScore:1234,rankImg:'https://api.apexlegendsstatus.com/assets/ranks/gold.png?private=hidden'},bans:{last_banReason:'private'},avatar:'https://untrusted.invalid/avatar'},realtime:{selectedLegend:'Wraith',currentState:'private'},legends:{selected:{LegendName:'Wraith',ImgAssets:{banner:'https://untrusted.invalid/secret.png'}},all:{Wraith:{data:[{name:'Test kills',value:0},{name:'Missing',value:null}]},Global:{data:[{name:'Do not duplicate',value:10}]}}},total:{career_kills:{value:100},career_wins:{value:8},kills:{value:999},kd:{value:'3.2'}}};
 const invoke=service(async url=>String(url).endsWith('/user')?Response.json({id:'fixture'}):String(url).includes('/rpc/')?Response.json(0):Response.json(payload));
 const response=await invoke({action:'lookup',platform:'PC',uid:'123'}),body=await response.json();assert.equal(response.status,200);assert.equal(body.status,'ready');assert.equal(body.contractVersion,1);assert.equal(body.profile.ranks[0].score,1234);assert.equal(body.profile.banner,null);assert.equal(body.profile.ranks[0].emblem,'https://api.apexlegendsstatus.com/assets/ranks/gold.png');assert.equal(body.profile.legends.length,1);assert.equal(body.profile.legends[0].trackers[0].value,0);assert.equal(body.profile.legends[0].trackers.length,1);assert.deepEqual(body.profile.metrics,[{label:'Career kills',value:100},{label:'Career wins',value:8}]);assert.doesNotMatch(JSON.stringify(body),/private|untrusted|"value":999|"value":"3\.2"|last_banReason|currentState|avatar/);
 const mismatch=await invoke({action:'lookup',platform:'PC',uid:'456'});assert.equal(mismatch.status,502);assert.equal((await mismatch.json()).status,'provider-response-invalid');
 const {sanitize}=require('../core/apex-player.cjs');const clean=sanitize({...body,secret:'private'});assert.equal(clean.available,true);assert.deepEqual(clean.profile.identity,body.profile.identity);assert.equal(clean.secret,undefined);
});
test('Ready status authenticates without consuming a provider request',async()=>{let calls=0;const invoke=service(async()=>{calls++;return Response.json({id:'fixture'});});const result=await invoke({action:'status'});assert.deepEqual(await result.json(),{configured:true,available:true,status:'ready',contractVersion:1});assert.equal(calls,1);});

test('Apex upstream failures expose fixed numeric diagnostics and never read raw error bodies',async()=>{
 for(const http of [400,403,404,405,410,500]){
  const invoke=service(async url=>String(url).endsWith('/user')?Response.json({id:'fixture'}):String(url).includes('/rpc/')?Response.json(0):new Response('private player and provider secret',{status:http}));
  const response=await invoke({action:'validate',platform:'PC',player:'fixture'}),body=await response.json();
  assert.equal(body.configured,true);assert.equal(body.diagnostic.http,http);assert.equal(body.diagnostic.stage,'provider');assert.doesNotMatch(JSON.stringify(body),/private player|provider secret/);
  if(http===403)assert.equal(body.diagnostic.code,'provider-access-denied');
  if(http===404)assert.equal(body.status,'player-not-found');
 }
});

test('Apex UID query preserves verified platform identity and rejects ambiguous lookup input',async()=>{
 const calls=[];const invoke=service(async url=>{calls.push(String(url));return String(url).endsWith('/user')?Response.json({id:'fixture'}):String(url).includes('/rpc/')?Response.json(0):Response.json({global:{name:'fixture'}});});
 assert.equal((await invoke({action:'validate',platform:'PC',uid:'1000301388710'})).status,200);
 const url=new URL(calls.at(-1));assert.equal(url.searchParams.get('uid'),'1000301388710');assert.equal(url.searchParams.has('player'),false);
 const before=calls.length;assert.equal((await invoke({action:'validate',platform:'PC',uid:'1',player:'ambiguous'})).status,400);assert.equal(calls.length,before+1);
});

test('Apex transport failures identify bounded stage without exception or URL leakage',async()=>{
 const invoke=service(async url=>{if(String(url).endsWith('/user'))return Response.json({id:'fixture'});if(String(url).includes('/rpc/'))return Response.json(0);throw Error('private provider URL and credentials');});
 const response=await invoke({action:'validate',platform:'PC',player:'fixture'});assert.equal(response.status,503);assert.deepEqual(await response.json(),{status:'service-unavailable',diagnostic:{stage:'provider',code:'request-failed'}});
});
test('Apex schema validation uses user auth and private distributed quota, and exposes no raw values',async()=>{const calls=[];const invoke=service(async(url,options)=>{calls.push({url:String(url),options});if(String(url).endsWith('/user'))return Response.json({id:'real-user-fixture'});if(String(url).includes('/rpc/'))return Response.json(0);return Response.json({global:{name:'fixture-private-player',rank:{rankScore:1234}},Authorization:'must-never-return'});});const response=await invoke({action:'validate',platform:'PC',player:'fixture-name'});assert.equal(response.status,200);const raw=await response.text();assert.match(raw,/rankScore: number/);assert.doesNotMatch(raw,/fixture-private-player|1234|fixture-provider-secret|fixture.user.jwt|must-never-return/);assert.equal(calls.length,3);assert.match(calls[2].url,/version=5/);assert.equal(calls[2].options.headers.Authorization,'fixture-provider-secret');assert.equal(calls[1].options.headers.Authorization,'Bearer fixture-service');});
test('Apex quota contention prevents provider request; upstream 429 extends shared backoff',async()=>{let providerCalls=0;const invoke=service(async url=>{if(String(url).endsWith('/user'))return Response.json({id:'fixture'});if(String(url).includes('/rpc/'))return Response.json(2);providerCalls++;return Response.json({});});const blocked=await invoke({action:'validate',platform:'PC',player:'fixture'});assert.equal(blocked.status,429);assert.equal(blocked.headers.get('Retry-After'),'2');assert.equal(providerCalls,0);
const reservations=[];const throttled=service(async(url,options)=>{if(String(url).endsWith('/user'))return Response.json({id:'fixture'});if(String(url).includes('/rpc/')){reservations.push(JSON.parse(options.body).backoff_seconds);return Response.json(0);}return new Response('secret upstream error',{status:429,headers:{'Retry-After':'15'}});});const response=await throttled({action:'validate',platform:'PC',player:'fixture'});assert.equal(response.status,429);assert.deepEqual(reservations,[0,15]);assert.doesNotMatch(await response.text(),/secret upstream error/);});
