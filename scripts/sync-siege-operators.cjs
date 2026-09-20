// Refresh the offline operator facts and official artwork used by the app.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {requestText}=require('../core/source-cache.cjs');
const {normalizeOperator}=require('../core/siege-operator.cjs');
async function main(){
 const root=path.join(__dirname,'..'),dir=path.join(root,'app/data/siege'),rawDir=path.join(root,'.validation-cache/operator-reference');await fs.mkdir(rawDir,{recursive:true});
 const html=await requestText('https://www.ubisoft.com/en-us/game/rainbow-six/siege/game-info/operators');
 const catalog=JSON.parse(html.match(/window\.__PRELOADED_STATE__\s*=\s*([\s\S]*?);<\/script>/)[1]).ContentfulGraphQl.OperatorsListContainer.content;
 const profiles=[];let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<catalog.length){const c=catalog[cursor++],id=c.slug,rawFile=path.join(rawDir,id+'.html');let page;try{if(!process.argv.includes('--resume'))throw Error('Refresh');page=await fs.readFile(rawFile,'utf8');}catch{page=await requestText('https://www.ubisoft.com/en-us/game/rainbow-six/siege/game-info/operators/'+id);await fs.writeFile(rawFile,page);}
 const d={...normalizeOperator(page,id),thumbnail:c.operatorThumbnail.url,schema:1,feed:'operator-'+id,fetchedAt:new Date().toISOString()};await fs.writeFile(path.join(dir,d.feed+'.json'),JSON.stringify(d,null,2)+'\n');profiles.push(d);console.log('Profile '+profiles.length+'/'+catalog.length+' '+id);
 }}));
 const ordered=catalog.map(c=>profiles.find(p=>p.id===c.slug));await fs.writeFile(path.join(dir,'operator-catalog.json'),JSON.stringify({fetchedAt:new Date().toISOString(),operators:ordered.map(({id,name,side,roles,thumbnail,icon})=>({id,name,side,roles,image:thumbnail,icon}))},null,2)+'\n');
 const urls=[...new Set(ordered.flatMap(p=>[p.thumbnail,p.image,p.icon,...p.loadout.map(w=>w.image)]).filter(Boolean))],manifest={};const assets=path.join(root,'app/assets/siege/operators');await fs.mkdir(assets,{recursive:true});cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<urls.length){const url=urls[cursor++],name=crypto.createHash('sha256').update(url).digest('hex').slice(0,20)+'.webp';manifest[url]='assets/siege/operators/'+name;const file=path.join(assets,name);try{await fs.access(file);continue;}catch{}const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Artwork HTTP '+r.status);const sharp=require(process.env.DROPZONE_SHARP||'sharp');await sharp(Buffer.from(await r.arrayBuffer())).resize({width:720,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(file);}}));
 await fs.writeFile(path.join(dir,'operator-assets.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Ready: '+ordered.length+' profiles, '+urls.length+' images.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
