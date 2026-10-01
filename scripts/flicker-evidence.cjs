'use strict';
// Replay real compositor frames at their recorded intervals for portable review.
// Raw PNGs and their original timestamps remain the authoritative evidence.
const fs=require('node:fs'),path=require('node:path');
module.exports=async({run,output})=>{
 const destination=path.resolve(output,'../../flicker-250/evidence');fs.mkdirSync(destination,{recursive:true});
 for(const stage of ['before','after'])for(const name of ['settings-save','rocket-tabs']){
  const directory=path.resolve(output,'..',stage,'flicker'),record=JSON.parse(fs.readFileSync(path.join(directory,name+'.json')));
  const frames=record.frames.map(f=>({...f,data:fs.readFileSync(path.join(directory,f.file)).toString('base64')}));
  const result=await run(async({frames,name,stage,header})=>{
   const images=await Promise.all(frames.map(async f=>{const i=new Image();i.src='data:image/png;base64,'+f.data;await i.decode();return i;}));
   const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');c.drawImage(images[0],0,0);
   const stream=canvas.captureStream(30),chunks=[],mime=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(MediaRecorder.isTypeSupported),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();const started=performance.now();
   for(let n=0;n<frames.length;n++){const target=(frames[n].timestamp-frames[0].timestamp)*1000;await new Promise(r=>setTimeout(r,Math.max(0,target-(performance.now()-started))));c.drawImage(images[n],0,0);}
   await new Promise(r=>setTimeout(r,180));recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
   const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const sheet=document.createElement('canvas'),count=8;sheet.width=1280;sheet.height=header?count*110:Math.ceil(count/2)*280;const s=sheet.getContext('2d');s.fillStyle='#10131a';s.fillRect(0,0,sheet.width,sheet.height);s.font='15px sans-serif';
   for(let n=0;n<count;n++){const i=Math.round(n*(frames.length-1)/(count-1)),x=header?0:(n%2)*640,y=header?n*110:Math.floor(n/2)*280;s.fillStyle='#fff';s.fillText(stage+' · '+Math.round((frames[i].timestamp-frames[0].timestamp)*1000)+' ms',x+10,y+18);if(header){const k=images[i].width/1920;s.drawImage(images[i],0,header.y*k,1280,Math.min(82,header.height*k),0,y+25,1280,Math.min(82,header.height*k));}else s.drawImage(images[i],380,65,720,290,x,y+26,640,254);}
   return{webm:btoa(binary),timeline:sheet.toDataURL('image/png').split(',')[1]};
  },{frames,name,stage,header:record.samples.find(s=>s.header)?.header});
  for(const [ext,key]of [['webm','webm'],['png','timeline']])fs.writeFileSync(path.join(destination,stage+'-'+name+'.'+ext),Buffer.from(result[key],'base64'));
 }
};
