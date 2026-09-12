import {CENTER_KEY} from './command-model.js';

export async function readBackupText(file,limit=350*1024*1024){
 const stream=file.name.endsWith('.gz')?file.stream().pipeThrough(new DecompressionStream('gzip')):file.stream();
 const reader=stream.getReader(),decoder=new TextDecoder();let size=0,result='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Expanded backup exceeds 350 MB.');result+=decoder.decode(value,{stream:true});}return result+decoder.decode();}
 finally{await reader.cancel();}
}

// Imported blobs get fresh IDs, so the downloaded rollback can still refer to
// every original file even after a successful restore.
export function remapRestoredMedia(entries,files){
 const mapping=new Map();for(const [id]of files){if(mapping.has(id))throw Error('Duplicate media ID in backup.');mapping.set(id,crypto.randomUUID());}
 const restored={...entries};if(restored[CENTER_KEY]){const state=JSON.parse(restored[CENTER_KEY]);for(const r of state.records)for(const key of ['mediaId','imageId'])if(mapping.has(r.data[key]))r.data[key]=mapping.get(r.data[key]);for(const r of state.records)for(const b of r.data.boards||[])if(mapping.has(b.imageId))b.imageId=mapping.get(b.imageId);for(const r of state.records)for(const a of r.data.attachments||[])if(mapping.has(a.id))a.id=mapping.get(a.id);restored[CENTER_KEY]=JSON.stringify(state);}
 return {entries:restored,files:files.map(([id,file])=>[mapping.get(id),file])};
}
