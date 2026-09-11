const fs=require('node:fs/promises');
const path=require('node:path');
// The renderer can request only bundled WARDOGS dataset files, never arbitrary paths.
async function readTerrainFile(resource,root=path.join(__dirname,'../app')){
  if(typeof resource!=='string'||!/^data\/wardogs\/terrain\/(bakurani|ozeti|zestafona)\/(dataset\.json|chunks\/\d+_\d+\.bin)$/.test(resource))throw new Error('Invalid terrain resource.');
  const file=path.join(root,resource),stat=await fs.stat(file);
  if(stat.size>256*1024)throw new Error('Terrain resource exceeds expected size.');
  return new Uint8Array(await fs.readFile(file));
}
module.exports={readTerrainFile};
