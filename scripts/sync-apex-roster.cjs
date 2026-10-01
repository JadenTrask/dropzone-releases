'use strict';
// Public EA character index; original publisher artwork, never generated art.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),source='https://www.ea.com/games/apex-legends/apex-legends/characters-hub';
async function main(){
 const rows=[];
 for(const page of ['', '?page=2']){
  const response=await fetch(source+page,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('EA roster unavailable');
  const document=new JSDOM(await response.text()).window.document;
  for(const link of document.querySelectorAll('a[href*="characters-hub/"]')){
   const image=link.querySelector('img'),match=link.textContent.trim().match(/^(Assault|Skirmisher|Recon|Controller|Support) Class Legends(.+)$/);
   if(!image||!match)continue;
   const imageUrl=new URL(image.src);if(imageUrl.protocol!=='https:'||imageUrl.hostname!=='drop-assets.ea.com')throw Error('Unexpected portrait host');
   const slug=new URL(link.href,source).pathname.split('/').pop();if(!/^[a-z-]+$/.test(slug))throw Error('Invalid legend slug');
   const asset=await fetch(imageUrl,{signal:AbortSignal.timeout(20000)});if(!asset.ok||!asset.headers.get('content-type')?.startsWith('image/jpeg'))throw Error('Portrait download failed');
   const bytes=Buffer.from(await asset.arrayBuffer());if(bytes.length<100||bytes.length>8000000)throw Error('Unexpected portrait size');
   const localPath='assets/apex/legends/'+slug+'.jpg';await fs.mkdir(path.join(root,'app/assets/apex/legends'),{recursive:true});await fs.writeFile(path.join(root,'app',localPath),bytes);
   rows.push({name:match[2],role:match[1],localPath,sourceUrl:new URL(link.href,source).href,imageUrl:imageUrl.href,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
  }
 }
 const catalog=JSON.parse(await fs.readFile(path.join(root,'app/data/apex/apex-content.json'),'utf8')).catalog;
 const unique=[...new Map(rows.map(row=>[row.name,row])).values()];
 if(unique.length!==catalog.legends.length||catalog.legends.some(l=>!unique.some(r=>r.name===l.name.trim())))throw Error('Roster coverage: '+unique.length+'; missing '+catalog.legends.filter(l=>!unique.some(r=>r.name===l.name.trim())).map(l=>l.name).join(', '));
 await fs.writeFile(path.join(root,'app/data/apex/legend-art.json'),JSON.stringify({owner:'EA / Respawn',sourceUrl:source,checkedAt:new Date().toISOString(),legends:unique},null,2)+'\n');
 console.log('Saved '+rows.length+' matching official EA legend images and source records.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
