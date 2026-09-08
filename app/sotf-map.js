import {projectPoint,unprojectPoint} from './sotf-model.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export class ForestMap{
  constructor(canvas,{getLocations,getColor,getFound,getIcon,onSelect,onStatus}){
    Object.assign(this,{canvas,getLocations,getColor,getFound,getIcon,onSelect,onStatus});this.ctx=canvas.getContext('2d');this.images=new Map();this.frame=0;this.events=new AbortController();const signal=this.events.signal;
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-clamp(e.deltaY,-200,200)*.003),this.pointer(e));},{passive:false,signal});
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);this.drag={pointerId:e.pointerId,start:this.pointer(e),camera:{...this.camera},moved:false};},{signal});
    canvas.addEventListener('pointermove',e=>{const p=this.pointer(e);if(this.drag&&!(e.buttons&1))this.endDrag();if(this.drag){if(e.pointerId!==this.drag.pointerId)return;const dx=p.x-this.drag.start.x,dy=p.y-this.drag.start.y;this.drag.moved||=Math.hypot(dx,dy)>5;this.camera.x=this.drag.camera.x-dx/this.camera.scale;this.camera.y=this.drag.camera.y+dy/this.camera.scale;this.constrain();this.draw();}else{const hit=this.hit(p);canvas.style.cursor=hit?'pointer':'grab';canvas.title=hit?.title||'Drag to pan · Scroll to zoom';}},{signal});
    canvas.addEventListener('pointerup',e=>{if(!this.drag||e.pointerId!==this.drag.pointerId)return;const click=!this.drag.moved;this.endDrag();if(click){const hit=this.hit(this.pointer(e));if(hit)this.onSelect(hit.id);}},{signal});
    canvas.addEventListener('pointercancel',()=>this.endDrag(),{signal});
    canvas.addEventListener('lostpointercapture',()=>this.endDrag(),{signal});
    canvas.addEventListener('blur',()=>this.endDrag(),{signal});
    canvas.addEventListener('keydown',e=>this.key(e),{signal});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  endDrag(){const pointerId=this.drag?.pointerId;this.drag=null;if(pointerId!==undefined&&this.canvas.hasPointerCapture(pointerId))this.canvas.releasePointerCapture(pointerId);this.canvas.style.cursor='grab';}
  key(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const step=80/this.camera.scale;
    if(e.key==='ArrowLeft')this.camera.x-=step;else if(e.key==='ArrowRight')this.camera.x+=step;else if(e.key==='ArrowUp')this.camera.y+=step;else if(e.key==='ArrowDown')this.camera.y-=step;else if(['+','='].includes(e.key))this.zoom(1.4);else if(e.key==='-')this.zoom(1/1.4);else if(e.key==='0')this.fit();else return;
    e.preventDefault();this.constrain();this.draw();
  }
  resize(){const {width,height}=this.canvas.getBoundingClientRect();if(!width||!height)return;this.width=width;this.height=height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);this.minScale=Math.min(width,height)/4200;this.camera??={x:0,y:0,scale:this.minScale};this.camera.scale=clamp(this.camera.scale,this.minScale,4);this.draw();}
  pointer(e){const r=this.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  screen(p){return projectPoint(p,this.camera,this.width,this.height);}
  world(p){return unprojectPoint(p,this.camera,this.width,this.height);}
  constrain(){this.camera.x=clamp(this.camera.x,-2000,2000);this.camera.y=clamp(this.camera.y,-2000,2000);}
  zoom(factor,point={x:this.width/2,y:this.height/2}){const before=this.world(point);this.camera.scale=clamp(this.camera.scale*factor,this.minScale,4);const after=this.world(point);this.camera.x+=before.x-after.x;this.camera.y+=before.y-after.y;this.constrain();this.draw();}
  fit(){this.camera={x:0,y:0,scale:this.minScale};this.draw();}
  focus(p){this.selected=p.id;this.camera={x:p.x,y:p.y,scale:Math.max(.7,this.camera.scale)};this.draw();}
  image(key){if(this.images.has(key))return this.images.get(key);const img=new Image();img.onload=()=>this.draw();img.onerror=()=>{this.onStatus('Some map tiles could not load. Reinstall Dropzone to repair the bundled map.');};img.src='assets/sotf/map/'+key+'.webp';this.images.set(key,img);return img;}
  hit(point){return this.getLocations().map(p=>({p,s:this.screen(p)})).filter(({p,s})=>Math.hypot(s.x-point.x,s.y-point.y)<(p.id===this.selected?18:15)).sort((a,b)=>Math.hypot(a.s.x-point.x,a.s.y-point.y)-Math.hypot(b.s.x-point.x,b.s.y-point.y))[0]?.p;}
  draw(){if(this.dead||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.render();});}
  render(){if(!this.camera)return;const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle='#101c20';ctx.fillRect(0,0,this.width,this.height);
    const origin=this.screen({x:-2000,y:2000}),size=4000*this.camera.scale;const overview=this.image('0-0-0');if(overview.complete&&overview.naturalWidth)ctx.drawImage(overview,0,0,250,250,origin.x,origin.y,size,size);
    // Upstream uses 250-pixel tiles; the outer 6 pixels of each 256-pixel image are padding.
    // Native tiles divide the 4000-unit world into a 16×16 grid. y increases south in tile filenames.
    const level=clamp(Math.ceil(Math.log2(Math.max(size*this.dpr/256,1))),0,4),count=2**level,units=4000/count;
    for(let x=0;x<count;x++)for(let y=0;y<count;y++){const p=this.screen({x:-2000+x*units,y:2000-y*units}),w=units*this.camera.scale;if(p.x+w<0||p.y+w<0||p.x>this.width||p.y>this.height)continue;const img=this.image(`${level}-${x}-${y}`);if(img.complete&&img.naturalWidth)ctx.drawImage(img,0,0,250,250,p.x,p.y,w+.4,w+.4);}
    const done=new Set(this.getFound());this.visible=0;
    // Paint the selected marker last so its icon and focus ring remain visible.
    const locations=this.getLocations();
    for(const p of [...locations.filter(p=>p.id!==this.selected),...locations.filter(p=>p.id===this.selected)]){
      const s=this.screen(p),selected=p.id===this.selected,radius=selected?17:14;
      if(s.x<-20||s.y<-20||s.x>this.width+20||s.y>this.height+20)continue;
      this.visible++;ctx.globalAlpha=done.has(p.id)?.55:1;
      ctx.beginPath();ctx.arc(s.x,s.y,radius,0,Math.PI*2);ctx.fillStyle='#10191f';ctx.fill();
      ctx.lineWidth=selected?3:2;ctx.strokeStyle=selected?'#fff':this.getColor(p);ctx.stroke();
      const src=this.getIcon?.(p)||'assets/sotf/icons/poi.webp',key='icon:'+src;
      let icon=this.images.get(key);
      if(!icon){icon=new Image();this.images.set(key,icon);icon.onload=()=>this.draw();icon.onerror=()=>{if(icon.dataset.fallback)return;icon.dataset.fallback='true';icon.src='assets/sotf/icons/poi.webp';};icon.src=src;}
      if(icon.complete&&icon.naturalWidth){const size=selected?26:22,scale=size/Math.max(icon.naturalWidth,icon.naturalHeight),w=icon.naturalWidth*scale,h=icon.naturalHeight*scale;ctx.drawImage(icon,s.x-w/2,s.y-h/2,w,h);}
      if(done.has(p.id)){ctx.globalAlpha=1;ctx.beginPath();ctx.arc(s.x+10,s.y+10,6,0,Math.PI*2);ctx.fillStyle='#aac9bb';ctx.fill();ctx.fillStyle='#10191f';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('✓',s.x+10,s.y+14);}
    }
    ctx.globalAlpha=1;ctx.fillStyle='#e8f3f2';ctx.font='bold 13px sans-serif';ctx.textAlign='left';ctx.fillText('N ↑',18,25);
  }
  destroy(){this.dead=true;this.events.abort();this.observer.disconnect();cancelAnimationFrame(this.frame);this.images.forEach(i=>{i.onload=null;i.onerror=null;});this.images.clear();}
}
