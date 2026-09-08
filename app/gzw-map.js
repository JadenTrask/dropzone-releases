import {clamp,validPoint,fitCamera,project,unproject,zoomCamera,easeZoom,gridText} from './gzw-model.js';
const COLORS={green:'#c7dfa1',amber:'#f3c772',red:'#ff8e81',blue:'#8dcef5',region:'#e4e9d7',lz:'#a4d6fa'};
export class GzwMap{
  constructor(canvas,{map,getState,onSelect,onPoint,onCursor,onCamera,onError}){
    Object.assign(this,{canvas,map,getState,onSelect,onPoint,onCursor,onCamera,onError});this.ctx=canvas.getContext('2d');this.images=new Map();this.pending=0;this.dead=false;this.camera=null;this.zoomTarget=null;this.hitTargets=[];this.cursor=null;
    this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');this.events=new AbortController();const signal=this.events.signal;
    canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.drag)return;const p=this.mouse(e);this.cursor=p;this.zoom(Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.height:1),-200,200)*.0028),p);},{signal,passive:false});
    canvas.addEventListener('pointerdown',e=>this.down(e),{signal});canvas.addEventListener('pointermove',e=>this.move(e),{signal});canvas.addEventListener('pointerup',e=>this.up(e),{signal});canvas.addEventListener('pointercancel',()=>{this.drag=null;this.cursor=null;this.canvas.classList.remove('dragging');this.draw();this.updateCursor();},{signal});
    canvas.addEventListener('pointerleave',()=>{this.cursor=null;this.updateCursor();},{signal});canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});canvas.addEventListener('keydown',e=>this.key(e),{signal});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  destroy(){this.dead=true;this.events.abort();this.observer.disconnect();cancelAnimationFrame(this.pending);this.images.clear();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.stop();this.width=r.width;this.height=r.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);const fit=fitCamera(this.map.bounds,r.width,r.height,24);this.minScale=fit.scale*.85;this.maxScale=this.map.remoteTiles?360:this.map.width/(this.map.bounds.maxX-this.map.bounds.minX)*2;this.camera=this.camera?{...this.camera,scale:clamp(this.camera.scale,this.minScale,this.maxScale)}:fit;this.constrain();this.draw();}
  mouse(e){const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  screen(p){return project(p,this.camera,this.width,this.height);}
  world(p){return unproject(p,this.camera,this.width,this.height);}
  constrain(){const b=this.map.bounds;this.camera.x=clamp(this.camera.x,b.minX,b.maxX);this.camera.y=clamp(this.camera.y,b.minY,b.maxY);}
  stop(){this.zoomTarget=null;this.zoomTime=null;}
  zoom(factor,anchor={x:this.width/2,y:this.height/2}){if(!this.camera)return;if(this.motion.matches){this.stop();this.camera=zoomCamera(this.camera,factor,anchor,this.width,this.height,this.minScale,this.maxScale);}else{this.zoomTarget=clamp((this.zoomTarget??this.camera.scale)*factor,this.minScale,this.maxScale);this.zoomAnchor=anchor;this.zoomTime??=performance.now();}this.draw();}
  fit(){this.stop();this.camera=fitCamera(this.map.bounds,this.width,this.height,24);this.draw();}
  focus(points,rightInset=0){if(!points?.length)return;this.stop();const viewWidth=Math.max(150,this.width-rightInset);if(points.length===1){this.camera={x:points[0].x,y:points[0].y,scale:clamp(Math.min(viewWidth,this.height)/18,this.minScale,this.maxScale)};}else{const xs=points.map(p=>p.x),ys=points.map(p=>p.y);this.camera=fitCamera({minX:Math.min(...xs)-2,maxX:Math.max(...xs)+2,minY:Math.min(...ys)-2,maxY:Math.max(...ys)+2},viewWidth,this.height,55);this.camera.scale=clamp(this.camera.scale,this.minScale,this.maxScale);}this.camera.x+=rightInset/(2*this.camera.scale);this.constrain();this.draw();}
  updateCursor(){if(!this.cursor||!this.camera){this.onCursor(null);return;}const point=this.world(this.cursor);this.onCursor(validPoint(point,this.map)?{screen:this.cursor,point,text:gridText(point)}:null);}
  hit(p){return [...this.hitTargets].reverse().find(t=>Math.abs(t.screen.x-p.x)<t.rx&&Math.abs(t.screen.y-p.y)<t.ry)?.item;}
  down(e){if(this.drag||![0,1,2].includes(e.button))return;e.preventDefault();this.stop();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);const p=this.mouse(e);this.drag={id:e.pointerId,start:p,last:p,moved:false,button:e.button};this.canvas.classList.add('dragging');}
  move(e){const p=this.mouse(e);this.cursor=p;if(this.drag&&e.pointerId===this.drag.id){const d=this.drag;if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>4)d.moved=true;if(d.moved){this.camera.x-=(p.x-d.last.x)/this.camera.scale;this.camera.y+=(p.y-d.last.y)/this.camera.scale;this.constrain();}d.last=p;this.draw();}else{this.canvas.style.cursor=this.hit(p)?'pointer':this.getState().tool==='pan'?'grab':'crosshair';}this.updateCursor();}
  up(e){if(!this.drag||this.drag.id!==e.pointerId)return;const d=this.drag;this.drag=null;this.canvas.classList.remove('dragging');if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);const p=this.mouse(e);if(!d.moved&&d.button===0){const hit=this.hit(p),tool=this.getState().tool;if(hit&&tool==='pan')this.onSelect(hit);else if(tool!=='pan'){const point=this.world(p);if(validPoint(point,this.map))this.onPoint(point,tool);}}this.draw();}
  key(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.stop();const step=(e.shiftKey?180:70)/this.camera.scale;this.camera.x+=(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0);this.camera.y+=(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0);this.constrain();this.draw();}else if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?1/1.35:1.35);}else if(e.key==='0'){e.preventDefault();this.fit();}}
  image(src){let slot=this.images.get(src);if(!slot){slot={image:new Image(),loaded:false,failed:false};this.images.set(src,slot);if(this.images.size>350){const key=this.images.keys().next().value;if(key!==this.map.overview)this.images.delete(key);else{const value=this.images.get(key);this.images.delete(key);this.images.set(key,value);}}slot.image.onload=()=>{slot.loaded=true;if(!this.dead)this.draw();};slot.image.onerror=()=>{slot.failed=true;if(!this.dead){this.onError?.();this.draw();}};slot.image.src=src;}return slot.loaded?slot.image:null;}
  draw(){if(this.dead||this.pending||!this.camera)return;this.pending=requestAnimationFrame(t=>{this.pending=0;this.paint(t);});}
  paint(now){
    if(this.dead)return;const c=this.ctx;
    if(this.zoomTarget){const elapsed=Math.min(80,now-this.zoomTime);this.zoomTime=now;this.camera=easeZoom(this.camera,this.zoomTarget,this.zoomAnchor,this.width,this.height,elapsed,this.minScale,this.maxScale);this.constrain();if(Math.abs(Math.log(this.zoomTarget/this.camera.scale))<.0004)this.stop();}
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.fillStyle='#090f10';c.fillRect(0,0,this.width,this.height);
    const b=this.map.bounds,tl=this.screen({x:b.minX,y:b.maxY}),br=this.screen({x:b.maxX,y:b.minY}),dw=br.x-tl.x,dh=br.y-tl.y,base=this.image(this.map.overview);
    if(base)c.drawImage(base,tl.x,tl.y,dw,dh);
    if(dw>1700)for(const tile of this.map.tiles){const x=tl.x+tile.x/this.map.width*dw,y=tl.y+tile.y/this.map.height*dh,w=tile.width/this.map.width*dw,h=tile.height/this.map.height*dh;if(x+w<0||y+h<0||x>this.width||y>this.height)continue;const img=this.image(tile.asset);if(img)c.drawImage(img,x,y,w+.25,h+.25);}
    if(this.map.remoteTiles)this.terrain();
    const s=this.getState();this.hitTargets=[];
    if(s.grid)this.grid();
    c.save();c.fillStyle='#090f102a';c.fillRect(tl.x,tl.y,dw,dh);c.restore();
    const route=s.route||[];if(route.length){c.beginPath();for(const [i,p]of route.entries()){const q=this.screen(p);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);}c.strokeStyle='#f3c772';c.lineWidth=2.5;c.setLineDash([8,6]);c.stroke();c.setLineDash([]);route.forEach((p,i)=>this.marker({...p,id:'route-'+i,name:String(i+1),type:'route',color:'amber'},s));}
    for(const r of s.regions||[]){if(!s.layers.regions&&!s.selectedRegions.includes(r.id))continue;const q=this.screen(r);if(q.x<-130||q.x>this.width+130||q.y<-50||q.y>this.height+50)continue;if(s.selectedRegions.includes(r.id)){c.beginPath();c.arc(q.x,q.y,Math.min(180,Math.max(40,3*this.camera.scale)),0,Math.PI*2);c.fillStyle='#d4db9a1a';c.fill();c.strokeStyle='#d4db9ac9';c.setLineDash([6,6]);c.lineWidth=1.5;c.stroke();c.setLineDash([]);}this.region(r,s);}
    this.pois([...(s.pois||[]),...(s.objectives||[])],s);
    for(const p of s.locations||[])this.marker(p,s);
    if(s.layers.pins)for(const p of s.pins||[])this.marker({...p,type:'pin'},s);
    this.scale();this.updateCursor();this.onCamera?.(this.camera);if(this.zoomTarget)this.draw();
  }
  terrain(){
    const half=20037508.342789244,world=half*2;
    // 100 real metres per grid unit. Standard XYZ coordinates, north-up.
    let z=Math.max(14,Math.min(19,Math.ceil(Math.log2(world*this.camera.scale/25600))));
    const lo=this.world({x:0,y:this.height}),hi=this.world({x:this.width,y:0});
    const minX=Math.max(0,(lo.x-100)*100),maxX=Math.min(14000,(hi.x-100)*100),minY=Math.max(0,(lo.y-100)*100),maxY=Math.min(8000,(hi.y-100)*100);
    if(minX>=maxX||minY>=maxY)return;
    let span=world/2**z;
    while((Math.ceil((maxX-minX)/span)+1)*(Math.ceil((maxY-minY)/span)+1)>72&&z>14){z--;span=world/2**z;}
    const c=this.ctx,tl=this.screen({x:100,y:180}),br=this.screen({x:240,y:100});c.save();c.beginPath();c.rect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);c.clip();
    for(let x=Math.floor((half+minX)/span);x<=Math.floor((half+maxX)/span);x++)for(let y=Math.floor((half-maxY)/span);y<=Math.floor((half-minY)/span);y++){
      const img=this.image(`https://cdn.gzwtacmap.com/${this.map.version}/lamang/${z}/${x}/${y}.png`);if(!img)continue;
      const q=this.screen({x:100+(x*span-half)/100,y:100+(half-y*span)/100}),size=span/100*this.camera.scale;c.drawImage(img,q.x,q.y,size+.3,size+.3);
    }c.restore();
  }
  pois(points,s){
    const buckets=new Map();
    for(const p of points){const q=this.screen(p);if(q.x<-30||q.y<-30||q.x>this.width+30||q.y>this.height+30)continue;const key=this.camera.scale<70&&s.selected!==p.id?Math.floor(q.x/32)+','+Math.floor(q.y/32):p.id;const group=buckets.get(key)||[];group.push(p);buckets.set(key,group);}
    for(const list of buckets.values()){
      if(list.length===1){const p=list[0],colors={18:'amber',3:'amber',48:'amber',40:'blue',22:'red',45:'green',36:'red'};this.marker({...p,color:colors[p.category]||'green'},s);continue;}
      const point={x:list.reduce((v,p)=>v+p.x,0)/list.length,y:list.reduce((v,p)=>v+p.y,0)/list.length},q=this.screen(point),c=this.ctx;
      c.beginPath();c.arc(q.x,q.y,15,0,Math.PI*2);c.fillStyle='#193736';c.fill();c.strokeStyle='#b8d0aa';c.lineWidth=1.5;c.stroke();c.font='600 12px Forge, Segoe UI, sans-serif';c.textAlign='center';c.fillStyle='#eff7e4';c.fillText(list.length,q.x,q.y+4);c.textAlign='left';this.hitTargets.push({item:{type:'cluster',points:list},screen:q,rx:18,ry:18});
    }
  }
  grid(){const c=this.ctx,b=this.map.bounds,step=this.camera.scale<9?10:this.camera.scale<25?5:1;c.save();c.font='12px Forge, Segoe UI, sans-serif';c.lineWidth=1;const min=this.world({x:0,y:this.height}),max=this.world({x:this.width,y:0});for(let x=Math.ceil(Math.max(b.minX,min.x)/step)*step;x<=Math.min(b.maxX,max.x);x+=step){const q=this.screen({x,y:0});c.strokeStyle='#d1deca30';c.beginPath();c.moveTo(q.x,0);c.lineTo(q.x,this.height);c.stroke();c.fillStyle='#d5dfce';c.fillText(String(x),q.x+4,19);}for(let y=Math.ceil(Math.max(b.minY,min.y)/step)*step;y<=Math.min(b.maxY,max.y);y+=step){const q=this.screen({x:0,y});c.strokeStyle='#d1deca30';c.beginPath();c.moveTo(0,q.y);c.lineTo(this.width,q.y);c.stroke();c.fillStyle='#d5dfce';c.fillText(String(y),7,q.y-5);}c.restore();}
  region(item,s){const c=this.ctx,q=this.screen(item),count=s.counts[item.id]||0;const label=item.name.toUpperCase();c.font='600 13px Forge, Segoe UI, sans-serif';const w=c.measureText(label).width+24;const active=s.selectedRegions.includes(item.id);c.fillStyle=active?'#30392cf0':'#0c1413e8';c.strokeStyle=active?'#d4db9a':'#88977580';c.lineWidth=1;c.beginPath();c.roundRect(q.x-w/2,q.y-15,w, count?44:30,4);c.fill();c.stroke();c.textAlign='center';c.fillStyle=active?'#eef4cf':'#edf0e2';c.fillText(label,q.x,q.y+3);if(count){c.font='12px Forge, Segoe UI, sans-serif';c.fillStyle='#acb99f';c.fillText(count+' missions',q.x,q.y+21);}c.textAlign='left';this.hitTargets.push({item:{...item,type:'region'},screen:{x:q.x,y:q.y+7},rx:w/2,ry:25});}
  lzMarker(item,s){
    const c=this.ctx,q=this.screen(item),size=28,half=size/2;
    if(q.x < -half||q.y < -half||q.x>this.width+half||q.y>this.height+half)return;
    const active=s.selected===item.id,label=item.name;
    c.save();c.fillStyle=active?'#e9f4c5':'#a4d6fa';c.strokeStyle=active?'#ffffff':'#071315';c.lineWidth=2;
    c.fillRect(q.x-half,q.y-half,size,size);c.strokeRect(q.x-half,q.y-half,size,size);
    c.font='700 14px Forge, Segoe UI, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#071315';c.fillText('LZ',q.x,q.y+.5);
    // Names stay visible independently of the optional personal-pin labels.
    c.font='600 14px Forge, Segoe UI, sans-serif';const width=c.measureText(label).width+16;
    const labelX=q.x+half+5+width>this.width-5?q.x-half-5-width:q.x+half+5;
    const labelY=Math.max(3,Math.min(this.height-27,q.y-12));
    c.fillStyle='#08100ff5';c.fillRect(labelX,labelY,width,24);c.textAlign='left';c.fillStyle=active?'#e9f4c5':'#d5ecff';c.fillText(label,labelX+8,labelY+12);
    c.restore();
    this.hitTargets.push({item,screen:q,rx:half+3,ry:half+3});
    this.hitTargets.push({item,screen:{x:labelX+width/2,y:labelY+12},rx:width/2,ry:12});
  }
  marker(item,s){if(item.type==='lz')return this.lzMarker(item,s);const c=this.ctx,q=this.screen(item);if(q.x<-40||q.y<-40||q.x>this.width+40||q.y>this.height+40)return;const active=s.selected===item.id,color=COLORS[item.color||item.type]||COLORS.green;c.beginPath();c.arc(q.x,q.y,active?10:7,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle='#0a1111';c.lineWidth=2;c.stroke();if(item.type==='route'||s.labels||active){const label=item.name.length>36?item.name.slice(0,34)+'…':item.name;c.font='12px Forge, Segoe UI, sans-serif';const w=c.measureText(label).width;c.fillStyle='#08100feb';c.fillRect(q.x+11,q.y-12,w+12,24);c.fillStyle=color;c.fillText(label,q.x+17,q.y+4);}if(item.type!=='route')this.hitTargets.push({item,screen:q,rx:16,ry:16});}
  scale(){const c=this.ctx;const desired=110/this.camera.scale*100;const distances=[10,25,50,100,200,500,1000,2000,5000];const meters=distances.reduce((best,n)=>Math.abs(n-desired)<Math.abs(best-desired)?n:best);const width=meters/100*this.camera.scale;const x=16,y=this.height-22;c.fillStyle='#08100fe8';c.fillRect(8,y-28,Math.max(110,width+20),43);c.strokeStyle='#e1e8d8';c.lineWidth=2;c.beginPath();c.moveTo(x,y-4);c.lineTo(x+width,y-4);c.stroke();c.fillStyle='#e1e8d8';c.font='12px Forge, Segoe UI, sans-serif';c.fillText((meters>=1000?meters/1000+' km':meters+' m')+(this.map.remoteTiles?'':' · approx.'),x,y-12);}
}
