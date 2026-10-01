// Package the publisher's current public low-zoom terrain for accurate offline
// geometry. Higher zoom uses the same XYZ grid. No remote JavaScript is executed.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {fetchMarkers,normalizeMarkers}=require('../core/gzw-markers.cjs');
const root=path.resolve(__dirname,'../app'),dataDir=path.join(root,'data/gzw');
async function main(){
 const fetchedAt=new Date().toISOString(),markers={...normalizeMarkers(await fetchMarkers()),schema:1,feed:'gzw-markers',fetchedAt};
 const z=14,half=20037508.342789244,span=half*2/2**z,tiles=[];
 const dir=path.join(root,'assets/gzw/terrain-'+markers.mapVersion);await fs.mkdir(dir,{recursive:true});
 for(let x=Math.floor(half/span);x<Math.ceil((half+14000)/span);x++)for(let y=Math.floor((half-8000)/span);y<Math.ceil(half/span);y++){
  const url=`https://cdn.gzwtacmap.com/${markers.mapVersion}/lamang/${z}/${x}/${y}.png`;
  const res=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!res.ok||!res.headers.get('content-type')?.includes('image/png'))throw Error('Terrain tile unavailable: '+res.status);
  const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>2*1024*1024||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid terrain tile');
  const asset=`assets/gzw/terrain-${markers.mapVersion}/${z}-${x}-${y}.png`;await fs.writeFile(path.join(root,asset),bytes);
  tiles.push({z,x,y,asset,sourceUrl:url,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 const config=JSON.parse(await fs.readFile(path.join(dataDir,'map.json'),'utf8'));
 config.remoteTiles=true;config.terrain={version:markers.mapVersion,bounds:{minX:100,maxX:240,minY:100,maxY:180},coordinateSystem:'Publisher local metres on the standard XYZ tile grid; game grid = 100 + metres / 100.',sourceUrl:'https://gzwtacmap.com/maps/lamang',fetchedAt,imageryDate:null,tiles};
 await fs.writeFile(path.join(dataDir,'map.json'),JSON.stringify(config,null,2)+'\n');
 await fs.writeFile(path.join(dataDir,'gzw-markers.json'),JSON.stringify(markers)+'\n');
 console.log(JSON.stringify({version:markers.mapVersion,tiles:tiles.length,bytes:tiles.reduce((n,t)=>n+t.bytes,0),counts:markers.counts,fetchedAt}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
