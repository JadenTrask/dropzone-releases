export const MAX_OBJECTS=300,MAX_POINTS=4096,MAX_HISTORY=60,MAX_TOTAL_POINTS=100000;
export class DrawingBoard{
 constructor(){this.objects=[];this.undoStack=[];this.redoStack=[];}
 commit(next){this.undoStack.push(this.objects);if(this.undoStack.length>MAX_HISTORY)this.undoStack.shift();this.objects=next.slice(-MAX_OBJECTS);let points=this.objects.reduce((n,o)=>n+(o.points?.length||0),0);while(points>MAX_TOTAL_POINTS&&this.objects.length>1)points-=this.objects.shift().points?.length||0;this.redoStack=[];}
 add(object){if(object.points?.length>MAX_POINTS)throw Error('Stroke limit reached.');this.commit([...this.objects,object]);}
 clear(temporaryOnly=false){const next=temporaryOnly?this.objects.filter(o=>o.layer==='persistent'):[];if(next.length!==this.objects.length)this.commit(next);}
 undo(){if(!this.undoStack.length)return;this.redoStack.push(this.objects);this.objects=this.undoStack.pop();}
 redo(){if(!this.redoStack.length)return;this.undoStack.push(this.objects);this.objects=this.redoStack.pop();}
 expire(now){const next=this.objects.filter(o=>!o.expires||o.expires>now);if(next.length!==this.objects.length){this.objects=next;this.undoStack=[];this.redoStack=[];return true;}return false;}
}
function path(ctx,o,w,h){const a=o.points[0],b=o.points.at(-1),x=a.x*w,y=a.y*h,ex=b.x*w,ey=b.y*h;ctx.beginPath();
 if(o.tool==='pencil'){ctx.moveTo(x,y);if(o.points.length===1){ctx.lineTo(x+.1,y+.1);return;}for(let i=1;i<o.points.length-1;i++){const p=o.points[i],q=o.points[i+1];ctx.quadraticCurveTo(p.x*w,p.y*h,(p.x+q.x)*w/2,(p.y+q.y)*h/2);}ctx.lineTo(ex,ey);}
 else if(o.tool==='ellipse')ctx.ellipse((x+ex)/2,(y+ey)/2,Math.max(.5,Math.abs(ex-x)/2),Math.max(.5,Math.abs(ey-y)/2),0,0,Math.PI*2);
 else if(o.tool==='box')ctx.rect(x,y,ex-x,ey-y);
 else{ctx.moveTo(x,y);ctx.lineTo(ex,ey);if(o.tool==='arrow'){const angle=Math.atan2(ey-y,ex-x),length=Math.max(12,ctx.lineWidth*4);ctx.moveTo(ex-length*Math.cos(angle-.48),ey-length*Math.sin(angle-.48));ctx.lineTo(ex,ey);ctx.lineTo(ex-length*Math.cos(angle+.48),ey-length*Math.sin(angle+.48));}}
}
export function drawObject(ctx,o,w,h){ctx.save();ctx.globalAlpha=o.opacity;ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineWidth=o.width*Math.min(w,h);ctx.lineJoin='round';ctx.lineCap='round';if(o.tool==='text'){ctx.font=`600 ${Math.max(14,o.width*Math.min(w,h)*6)}px Segoe UI,sans-serif`;ctx.textBaseline='top';ctx.fillText(o.text,o.points[0].x*w,o.points[0].y*h);}else{path(ctx,o,w,h);ctx.stroke();}ctx.restore();}
export function hitObject(ctx,o,x,y,w,h){if(o.tool==='text'){const p=o.points[0],size=Math.max(14,o.width*Math.min(w,h)*6);ctx.font=`600 ${size}px Segoe UI,sans-serif`;return x>=p.x*w-6&&x<=p.x*w+ctx.measureText(o.text).width+6&&y>=p.y*h-6&&y<=p.y*h+size+6;}ctx.save();ctx.lineWidth=Math.max(14,o.width*Math.min(w,h)+10);path(ctx,o,w,h);const hit=ctx.isPointInStroke(x,y);ctx.restore();return hit;}
