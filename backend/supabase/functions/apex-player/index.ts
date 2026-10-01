// Existing Supabase dashboard function: bright-api. Keep Verify JWT ENABLED.
// v5 field structure verified by authenticated UID lookup on 2026-09-30.
// Only the explicit display contract below leaves the provider boundary.
// No provider key, access token or raw upstream payload is returned or logged.
const json=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...extra}});
const env=(name:string)=>Deno.env.get(name)||'';
const supabaseUrl=env('SUPABASE_URL');
const diagnosticCode=(http:number)=>({400:'provider-request-rejected',403:'provider-access-denied',404:'player-not-found',405:'provider-external-error',410:'platform-rejected',429:'provider-rate-limited'} as Record<number,string>)[http]||'provider-http-error';
async function readBounded(response:Request|Response,limit:number){
  const reader=response.body?.getReader();if(!reader)return '';
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Response too large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
async function gate(seconds=0){
  const service=env('SUPABASE_SERVICE_ROLE_KEY');
  const response=await fetch(supabaseUrl+'/rest/v1/rpc/reserve_apex_request',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({backoff_seconds:seconds})});
  if(!response.ok)throw Error('Rate gate unavailable');
  const wait=await response.json();if(!Number.isInteger(wait)||wait<0)throw Error('Invalid rate gate');return wait;
}
function schema(value:unknown,path='$',depth=0,rows:string[]=[]):string[]{
  if(rows.length>=600)return rows;
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  rows.push(path+': '+type);
  if(depth<7&&value&&typeof value==='object'){
    if(Array.isArray(value)){if(value.length)schema(value[0],path+'[]',depth+1,rows);}
    else for(const [key,child] of Object.entries(value)){if(/auth|token|secret|password|key/i.test(key))continue;schema(child,path+'.'+key.slice(0,80),depth+1,rows);if(rows.length>=600)break;}
  }
  return rows;
}
const cleanText=(value:unknown,max=100)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
const stat=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
function asset(value:unknown){
  if(typeof value!=='string'||value.length>600)return null;
  try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||!['apexlegendsstatus.com','api.apexlegendsstatus.com','cdn.apexlegendsstatus.com','api.mozambiquehe.re'].includes(url.hostname)||!/\.(png|jpg|jpeg|webp)$/i.test(url.pathname))return null;url.search='';url.hash='';return url.href;}catch{return null;}
}
function normalizePlayer(payload:any,platform:string,uid?:string){
  const g=payload.global,name=cleanText(g?.name,64),id=typeof g?.uid==='string'?g.uid:'';
  if(!name||!/^\d{1,20}$/.test(id)||g.platform!==platform||(uid&&uid!==id))return null;
  const tracker=(row:any)=>cleanText(row?.name)&&stat(row?.value)!==null?{label:cleanText(row.name),value:row.value}:null;
  const legends=Object.entries(payload.legends?.all||{}).slice(0,40).flatMap(([name,row]:[string,any])=>{
    if(name==='Global')return [];
    const trackers=(Array.isArray(row?.data)?row.data:[]).slice(0,12).map(tracker).filter(Boolean);
    return trackers.length?[{name:cleanText(name),trackers}]:[];
  });
  const selected=payload.legends?.selected,selectedName=cleanText(selected?.LegendName||payload.realtime?.selectedLegend);
  if(selectedName&&!legends.some(l=>l.name===selectedName)&&Array.isArray(selected?.data)){
    const trackers=selected.data.slice(0,12).map(tracker).filter(Boolean);if(trackers.length)legends.unshift({name:selectedName,trackers});
  }
  const rank=g.rank,ranks=cleanText(rank?.rankName)?[{mode:'Battle Royale',name:cleanText(rank.rankName),division:stat(rank.rankDiv),score:stat(rank.rankScore),emblem:asset(rank.rankImg),season:cleanText(rank.rankedSeason)}]:[];
  // Preserve explicit career trackers only. Never sum seasonal/equipped trackers.
  const metrics=[['career_kills','Career kills'],['career_wins','Career wins']].flatMap(([key,label])=>stat(payload.total?.[key]?.value)!==null?[{label,value:payload.total[key].value}]:[]);
  return {schema:1,identity:{name,uid:id,platform},level:stat(g.level),prestige:stat(g.levelPrestige),selectedLegend:selectedName,banner:asset(selected?.ImgAssets?.banner),checkedAt:new Date().toISOString(),ranks,metrics,legends};
}
Deno.serve(async request=>{
  if(request.method!=='POST')return json({status:'method-not-allowed'},405,{Allow:'POST'});
  const authorization=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization))return json({status:'sign-in-required'},401);
  let stage='authentication';
  try{
    // Validate the actual Dropzone user session; a publishable key is not login.
    const auth=await fetch(supabaseUrl+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:authorization}});
    if(!auth.ok)return json({status:'sign-in-required'},401);
    const user=await auth.json();if(typeof user.id!=='string')return json({status:'sign-in-required'},401);
    let text;try{text=await readBounded(request,2048);}catch{return json({status:'invalid-request'},400);}
    let body;try{body=JSON.parse(text);}catch{return json({status:'invalid-request'},400);}
    const key=env('DROPZONE_APEX_ALS_KEY');
    if(body?.action==='status')return json({configured:!!key,available:!!key,status:key?'ready':'setup-required',contractVersion:1});
    if(!['validate','lookup'].includes(body?.action))return json({available:false,status:'invalid-request'},400);
    if(!key)return json({status:'setup-required'},503);
    const byUid=typeof body.uid==='string'&&/^\d{1,20}$/.test(body.uid)&&body.player===undefined;
    const byName=typeof body.player==='string'&&body.player.trim().length>=1&&body.player.length<=64&&!/[\u0000-\u001f]/.test(body.player)&&body.uid===undefined;
    if(!(byUid?['PC','PS4','X1','SWITCH']:['PC','PS4','X1']).includes(body.platform)||!(byUid||byName))return json({status:'invalid-player'},400);
    stage='quota';
    const wait=await gate();if(wait)return json({status:'rate-limited',configured:true,retryAfter:wait},429,{'Retry-After':String(wait)});
    const url=new URL('https://api.apexlegendsstatus.com/bridge');url.searchParams.set('version','5');url.searchParams.set('platform',body.platform);url.searchParams.set(byUid?'uid':'player',byUid?body.uid:body.player.trim());
    stage='provider';
    // The provider's extensionless route negotiates its PHP handler before JSON
    // execution. A JSON-only Accept header returns HTTP 406 at that layer.
    const upstream=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:key,Accept:'*/*'}});
    const diagnostic={stage:'provider',http:upstream.status,code:diagnosticCode(upstream.status)};
    if(upstream.status===429){const retry=Math.min(300,Math.max(2,Number(upstream.headers.get('Retry-After'))||10));await gate(Math.ceil(retry));return json({status:'rate-limited',configured:true,diagnostic,retryAfter:Math.ceil(retry)},429,{'Retry-After':String(Math.ceil(retry))});}
    // Only numeric HTTP status and our fixed code escape this boundary. Never
    // read, forward or log a provider error body, header, request URL or key.
    if(!upstream.ok)return json({status:upstream.status===404?'player-not-found':'provider-unavailable',configured:true,diagnostic},upstream.status===404?404:502);
    let raw;try{raw=await readBounded(upstream,1000000);}catch{return json({status:'provider-response-invalid',configured:true,diagnostic:{...diagnostic,code:'response-too-large'}},502);}
    let payload;try{payload=JSON.parse(raw);}catch{return json({status:'provider-response-invalid',configured:true,diagnostic:{...diagnostic,code:'invalid-json'}},502);}
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.Error||payload.error)return json({status:'provider-response-invalid',configured:true,diagnostic:{...diagnostic,code:'invalid-payload'}},502);
    if(body.action==='validate')return json({status:'response-received',configured:true,available:false,apiVersion:5,checkedAt:new Date().toISOString(),schema:schema(payload)});
    const profile=normalizePlayer(payload,body.platform,byUid?body.uid:undefined);
    if(!profile)return json({status:'provider-response-invalid',configured:true},502);
    return json({status:'ready',configured:true,available:true,contractVersion:1,profile});
  }catch{return json({status:'service-unavailable',diagnostic:{stage,code:'request-failed'}},503);}
});
