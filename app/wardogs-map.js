import {clamp,clampPoint,validPoint,project,unproject,fitCamera,zoomCamera,easeZoom,geometry,bearingText,coordinateText} from './wardogs-model.js';

export class WardogsMap {
  constructor(canvas,{map,revision,getState,onPoint,onTool,onCursor,onImageStatus}) {
    Object.assign(this,{canvas,map,revision,getState,onPoint,onTool,onCursor,onImageStatus});
    this.ctx=canvas.getContext('2d');this.images=new Map();this.camera=null;this.pending=0;this.dead=false;this.ruler=[];this.drag=null;this.zoomTarget=null;this.zoomTime=null;this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.events=new AbortController();const signal=this.events.signal;
    canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.drag)return;this.cursor=this.mouse(e);const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.height:1);this.zoom(Math.exp(-clamp(delta,-240,240)*.0025),this.cursor);},{passive:false,signal});
    canvas.addEventListener('pointerenter',e=>{this.cursor=e.pointerType==='touch'?null:this.mouse(e);this.updateCursor();},{signal});
    canvas.addEventListener('pointerleave',()=>{this.cursor=null;this.updateCursor();},{signal});
    canvas.addEventListener('pointerdown',e=>this.down(e),{signal});
    canvas.addEventListener('pointermove',e=>this.move(e),{signal});
    canvas.addEventListener('pointerup',e=>this.up(e),{signal});
    canvas.addEventListener('pointercancel',()=>{this.drag=null;this.cursor=null;this.updateCursor();delete this.canvas.dataset.dragging;this.draw();},{signal});
    canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    canvas.addEventListener('keydown',e=>this.key(e),{signal});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  destroy(){this.dead=true;this.events.abort();this.observer.disconnect();cancelAnimationFrame(this.pending);this.images.clear();}
  resize(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    this.stopZoom();this.width=rect.width;this.height=rect.height;this.dpr=Math.min(window.devicePixelRatio||1,3);
    this.canvas.width=Math.round(rect.width*this.dpr);this.canvas.height=Math.round(rect.height*this.dpr);
    const fit=fitCamera(this.map.bounds,this.width,this.height);this.minScale=fit.scale*.7;this.maxScale=fit.scale*48;
    this.camera=this.camera?{...this.camera,scale:clamp(this.camera.scale,this.minScale,this.maxScale)}:fit;
    this.constrain();this.draw();
  }
  mouse(e){const r=this.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  screen(p){return project(p,this.camera,this.width,this.height);}
  world(p){return unproject(p,this.camera,this.width,this.height);}
  updateCursor(){
    const p=this.cursor;
    if(!p||!this.camera||p.x<0||p.y<0||p.x>this.width||p.y>this.height){this.onCursor?.(`${this.map.name} · North is up`,null);return;}
    const w=this.world(p),inside=validPoint(w,this.map);
    this.onCursor?.(inside?coordinateText(w):'Outside map',inside?p:null);
  }
  constrain(){const b=this.map.bounds;this.camera.x=clamp(this.camera.x,b.minX,b.maxX);this.camera.y=clamp(this.camera.y,b.minY,b.maxY);}
  stopZoom(){this.zoomTarget=null;this.zoomTime=null;}
  zoom(factor,anchor={x:this.width/2,y:this.height/2}){
    if(!Number.isFinite(factor)||factor<=0||!this.camera)return;
    if(this.reducedMotion.matches){this.stopZoom();this.camera=zoomCamera(this.camera,factor,anchor,this.width,this.height,this.minScale,this.maxScale);this.constrain();}
    else {this.zoomTarget=clamp((this.zoomTarget??this.camera.scale)*factor,this.minScale,this.maxScale);this.zoomAnchor=anchor;this.zoomTime??=performance.now();}
    this.draw();
  }
  fit(){this.stopZoom();this.camera=fitCamera(this.map.bounds,this.width,this.height);this.draw();}
  frameShot(){
    this.stopZoom();
    const {origin,target}=this.getState();if(!origin&&!target)return;
    const points=[origin,target].filter(Boolean),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const b={minX:Math.min(...xs)-1,maxX:Math.max(...xs)+1,minY:Math.min(...ys)-1,maxY:Math.max(...ys)+1};
    this.camera=fitCamera(b,this.width,this.height,90);this.camera.scale=clamp(this.camera.scale,this.minScale,this.maxScale);this.constrain();this.draw();
  }
  hit(p){
    const s=this.getState();
    for(const key of ['target','origin'])if(s[key]){const q=this.screen(s[key]);if(Math.hypot(q.x-p.x,q.y-p.y)<24)return key;}
    return null;
  }
  down(e){
    if(this.drag||![0,1,2].includes(e.button))return;
    this.stopZoom();e.preventDefault();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);
    const p=this.mouse(e),s=this.getState(),hit=e.button===0?this.hit(p):null;
    const mode=hit&&!(hit==='origin'&&s.lockOrigin)?hit:'pan';
    this.drag={id:e.pointerId,start:p,last:p,mode,moved:false,button:e.button};
    this.canvas.dataset.dragging='true';
  }
  move(e){
    const p=this.mouse(e),w=this.world(p);this.cursor=e.pointerType==='touch'?null:p;
    const d=this.drag;if(!d||d.id!==e.pointerId){this.updateCursor();return;}
    if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>4)d.moved=true;
    if(d.moved){
      if(d.mode==='pan'){this.camera.x-=(p.x-d.last.x)/this.camera.scale;this.camera.y+=(p.y-d.last.y)/this.camera.scale;this.constrain();}
      else this.onPoint(d.mode,clampPoint(w,this.map),false);
      this.draw();
    }
    d.last=p;this.updateCursor();
  }
  up(e){
    const d=this.drag;if(!d||d.id!==e.pointerId)return;
    this.drag=null;delete this.canvas.dataset.dragging;
    if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
    const point=this.world(this.mouse(e)),s=this.getState();
    if(d.moved&&d.mode!=='pan')this.onPoint(d.mode,clampPoint(point,this.map),true);
    if(!d.moved&&d.button===0&&validPoint(point,this.map)){
      if(s.tool==='ruler'){if(this.ruler.length===2)this.ruler=[];this.ruler.push(point);}
      else if(['origin','target'].includes(s.tool)&&!(s.tool==='origin'&&s.lockOrigin))this.onPoint(s.tool,point,true);
    }
    this.draw();
  }
  key(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const speed=(e.shiftKey?160:50)/this.camera.scale;
    const pan={ArrowLeft:[-speed,0],ArrowRight:[speed,0],ArrowUp:[0,speed],ArrowDown:[0,-speed]};
    if(pan[e.key]){this.stopZoom();e.preventDefault();this.camera.x+=pan[e.key][0];this.camera.y+=pan[e.key][1];this.constrain();this.draw();}
    else if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?.8:1.25);}
    else if(e.key.toLowerCase()==='f'){e.preventDefault();this.fit();}
    else if({g:'origin',t:'target',h:'pan',r:'ruler',Escape:'pan'}[e.key]){e.preventDefault();this.onTool({g:'origin',t:'target',h:'pan',r:'ruler',Escape:'pan'}[e.key]);}
  }
  image(z,x,y){
    const key=`${z}/${x}_${y}`,cached=this.images.get(key);if(cached){cached.used=performance.now();return cached;}
    const local=z<=this.map.tiles.maxZoom;
    if(local){const [left,right,top,bottom]=this.map.tiles.limits[z];if(x<left||x>right||y<top||y>bottom)return null;}
    const record={image:new Image(),ready:false,failed:false,local,used:performance.now()};this.images.set(key,record);
    record.image.onload=()=>{record.ready=true;this.draw();};record.image.onerror=()=>{record.failed=true;this.draw();};
    record.image.src=local?`${this.map.tiles.path}/zoom_${z}/${x}_${y}.webp`:`https://raw.githubusercontent.com/apollyon-sys/wardogs-calculator/${this.revision}/maps/tiles/${this.map.id}/zoom_${z}/${x}_${y}.webp`;
    return record;
  }
  draw(){if(this.dead||this.pending)return;this.pending=requestAnimationFrame(now=>{
    this.pending=0;if(this.dead)return;
    if(this.zoomTarget!=null){this.camera=easeZoom(this.camera,this.zoomTarget,this.zoomAnchor,this.width,this.height,now-this.zoomTime,this.minScale,this.maxScale);this.zoomTime=now;this.constrain();if(this.camera.scale===this.zoomTarget)this.stopZoom();}
    this.paint();if(this.zoomTarget!=null)this.draw();
  });}
  label(value,x,y,color='#f5f2df',align='left'){
    const c=this.ctx;c.font=`${14*this.fontScale}px system-ui,sans-serif`;c.textAlign=align;c.lineWidth=4;c.strokeStyle='#101512';c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y);
  }
  line(points,color,dash=[],width=2){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.screen(p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
  pin(point,label,color,outline=false){
    if(!point)return;const p=this.screen(point),c=this.ctx;
    if(p.x<-80||p.x>this.width+80||p.y<-80||p.y>this.height+80)return;
    c.beginPath();c.arc(p.x,p.y,outline?6:11,0,Math.PI*2);c.fillStyle=outline?'#141a18':color;c.fill();c.strokeStyle=outline?color:'#101411';c.lineWidth=outline?2:3;c.stroke();
    if(!outline){c.beginPath();c.moveTo(p.x-17,p.y);c.lineTo(p.x+17,p.y);c.moveTo(p.x,p.y-17);c.lineTo(p.x,p.y+17);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();}
    this.label(label,p.x+19,p.y-15,color);
  }
  paint(){
    if(!this.camera)return;
    const c=this.ctx,s=this.getState(),b=this.map.bounds,t=this.map.tileBounds;
    this.fontScale=clamp(parseFloat(getComputedStyle(document.documentElement).fontSize)/16,1,2);
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.fillStyle='#0d1312';c.fillRect(0,0,this.width,this.height);
    const nw=this.screen({x:b.minX,y:b.maxY}),se=this.screen({x:b.maxX,y:b.minY});
    c.save();c.beginPath();c.rect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);c.clip();
    const topLeft=this.world({x:0,y:0}),bottomRight=this.world({x:this.width,y:this.height});
    const zWanted=clamp(Math.ceil(Math.log2(this.camera.scale*this.dpr*(t.maxX-t.minX)/256)),0,7);
    let detailReady=false,detailFailed=false,baseReady=false;
    for(let z=0;z<=zWanted;z++){
      const n=2**z,dx=(t.maxX-t.minX)/n,dy=(t.maxY-t.minY)/n;
      const left=clamp(Math.floor((Math.max(b.minX,topLeft.x)-t.minX)/dx),0,n-1),right=clamp(Math.floor((Math.min(b.maxX,bottomRight.x)-t.minX)/dx),0,n-1);
      const top=clamp(Math.floor((t.maxY-Math.min(b.maxY,topLeft.y))/dy),0,n-1),bottom=clamp(Math.floor((t.maxY-Math.max(b.minY,bottomRight.y))/dy),0,n-1);
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
        const tile=this.image(z,x,y);if(!tile)continue;
        if(tile.ready){const p=this.screen({x:t.minX+x*dx,y:t.maxY-y*dy});c.drawImage(tile.image,p.x,p.y,dx*this.camera.scale+.5,dy*this.camera.scale+.5);if(z===0)baseReady=true;if(z>5)detailReady=true;}
        else if(tile.failed&&z>5)detailFailed=true;
      }
    }
    this.onImageStatus?.(!baseReady?'Loading map…':zWanted<=5?'Bundled map':detailFailed?'Bundled detail · online detail unavailable':detailReady?'High-resolution detail':'Loading map detail…');
    if(s.grid){
      const step=this.camera.scale>=190?0.1:this.camera.scale>=32?1:10;
      const labelEvery=Math.max(1,Math.ceil(75*this.fontScale/(step*this.camera.scale)));
      const startX=Math.ceil(Math.max(b.minX,topLeft.x)/step)*step,endX=Math.min(b.maxX,bottomRight.x);
      const startY=Math.ceil(Math.max(b.minY,bottomRight.y)/step)*step,endY=Math.min(b.maxY,topLeft.y);
      for(let x=startX;x<=endX&&x<startX+step*300;x+=step){this.line([{x,y:b.minY},{x,y:b.maxY}],'#edf0c83d',[],1);if(Math.round(x/step)%labelEvery===0){const p=this.screen({x,y:Math.min(b.maxY,topLeft.y)});if(p.x<this.width-80)this.label(x.toFixed(step<1?1:0),p.x+4,Math.max(22,p.y+19),'#f0eac5');}}
      for(let y=startY;y<=endY&&y<startY+step*300;y+=step){this.line([{x:b.minX,y},{x:b.maxX,y}],'#edf0c83d',[],1);if(Math.round(y/step)%labelEvery===0){const p=this.screen({x:Math.max(b.minX,topLeft.x),y});this.label(y.toFixed(step<1?1:0),Math.max(5,p.x+5),p.y-5,'#f0eac5');}}
    }
    if(s.ranges&&s.origin&&s.weapon){
      const p=this.screen(s.origin);
      for(const [distance,color] of [[s.weapon.maxRange,'#f2d471aa'],[s.weapon.minRange,'#fb937da0']]){c.beginPath();c.arc(p.x,p.y,distance/this.map.coordinateMetersPerUnit*this.camera.scale,0,Math.PI*2);c.strokeStyle=color;c.setLineDash([8,7]);c.lineWidth=2;c.stroke();c.setLineDash([]);}
    }
    if(s.landmarks)for(const p of this.map.markers||[])this.pin(p,p.name,'#d2d5cb',true);
    for(const record of s.saved||[])if(record.map===this.map.id)this.pin(record.target,record.name,'#b0bdcc',true);
    if(s.origin&&s.target)this.line([s.origin,s.target],'#f4d276',[8,5],2);
    if(this.ruler.length){for(let i=0;i<this.ruler.length;i++)this.pin(this.ruler[i],i?'B':'A','#79d5e6');if(this.ruler.length===2){this.line(this.ruler,'#79d5e6',[3,5]);const g=geometry(...this.ruler,this.map);if(g)this.label(`Ruler: ${Math.round(g.distance)} m · ${bearingText(g.azimuth)}`,24,this.height-70,'#a2e9f7');}}
    this.pin(s.origin,s.lockOrigin?'GUN · LOCKED':'GUN','#a2e9bd');this.pin(s.target,'TARGET','#ff947e');
    c.restore();
    c.strokeStyle='#6c735a';c.lineWidth=1;c.strokeRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);
    const metresPerPixel=this.map.coordinateMetersPerUnit/this.camera.scale,nominal=100*metresPerPixel;
    const power=10**Math.floor(Math.log10(nominal));const scaleMetres=[1,2,5,10].map(v=>v*power).filter(v=>v<=nominal).at(-1)||power;
    const length=scaleMetres/metresPerPixel;
    c.fillStyle='#111714db';c.fillRect(13,this.height-56,Math.max(length+28,120),45);
    c.strokeStyle='#edf0d8';c.lineWidth=2;c.beginPath();c.moveTo(24,this.height-22);c.lineTo(24+length,this.height-22);c.stroke();
    this.label(scaleMetres>=1000?`${scaleMetres/1000} km`:`${Math.round(scaleMetres)} m`,24,this.height-33);
    this.label('N ↑',this.width-20,31,'#f1d57e','right');
    this.canvas.dataset.tool=s.tool;
    this.updateCursor();
    if(this.images.size>300){const removable=[...this.images].filter(([key,r])=>!key.startsWith('0/')&&r.used<performance.now()-1500).sort((a,b)=>a[1].used-b[1].used);for(const [key] of removable.slice(0,this.images.size-260))this.images.delete(key);}
  }
}
