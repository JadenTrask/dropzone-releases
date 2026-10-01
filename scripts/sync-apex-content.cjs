'use strict';
// Maintainer snapshot refresh. Public publisher pages only; no player API key.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {SOURCES,normalizeContent}=require('../core/apex-content.cjs');
const {requestText}=require('../core/source-cache.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
 const cached=process.argv.includes('--cached');
 const raw=Object.fromEntries(await Promise.all(Object.entries(SOURCES).map(async([key,url])=>[key,cached?await fs.readFile(path.join(root,'.validation-cache',({legends:'apex-abilities',news:'apex-news',esports:'algs-news'})[key]+'.html'),'utf8'):await requestText(url)])));
 const data={...normalizeContent(raw),schema:1,feed:'apex-content',fetchedAt:new Date().toISOString()};
 const assets=path.join(root,'app/assets/apex');await fs.mkdir(assets,{recursive:true});
 const allowed=new Set(['drop-assets.ea.com','images.ctfassets.net']);const manifest=[];
 for(const article of [...data.news,...data.esports]){if(!article.imageUrl)continue;const url=new URL(article.imageUrl);if(url.protocol!=='https:'||!allowed.has(url.hostname))throw new Error('Unapproved publisher image host.');
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok||!/^image\/(jpeg|png|webp)/.test(response.headers.get('content-type')||''))throw new Error('Publisher image download failed.');
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>6000000||bytes.length<100)throw new Error('Unexpected publisher image size.');
  const extension=response.headers.get('content-type').includes('png')?'png':response.headers.get('content-type').includes('webp')?'webp':'jpg';
  const id=crypto.createHash('sha256').update(article.imageUrl).digest('hex').slice(0,16),localPath='assets/apex/'+id+'.'+extension;await fs.writeFile(path.join(root,'app',localPath),bytes);article.image=localPath;manifest.push({localPath,sourceUrl:article.url,imageUrl:article.imageUrl,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
 }
 data.cover=data.news[0].image;await fs.mkdir(path.join(root,'app/data/apex'),{recursive:true});await fs.writeFile(path.join(root,'app/data/apex/apex-content.json'),JSON.stringify(data,null,2)+'\n');await fs.writeFile(path.join(root,'app/data/apex/image-sources.json'),JSON.stringify({owner:'EA / Respawn / ALGS',retrievedAt:data.fetchedAt,assets:manifest},null,2)+'\n');console.log(`Saved ${data.catalog.legends.length} legends, ${data.news.length} news links, ${data.esports.length} ALGS links and ${manifest.length} publisher images.`);
}
main().catch(()=>{console.error('Apex public snapshot refresh failed. Existing data was not replaced.');process.exitCode=1;});
