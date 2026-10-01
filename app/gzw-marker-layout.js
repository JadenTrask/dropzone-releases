// Group in world coordinates, not viewport pixels: panning cannot change a
// cluster's members or move its anchor relative to the terrain underneath.
export function markerCellSize(scale,previous){
 if(previous===0&&scale>=60)return 0;
 if(scale>=85)return 0;
 if(previous>0&&previous*scale>=32&&previous*scale<=110)return previous;
 return 2**Math.ceil(Math.log2(56/scale));
}
export function groupMarkers(points,cell,selected){
 const buckets=new Map();
 for(const p of points){
  const key=!cell||p.id===selected?'item:'+p.id:Math.floor(p.x/cell)+','+Math.floor(p.y/cell);
  let group=buckets.get(key);if(!group){group={key,points:[],x:0,y:0};buckets.set(key,group);}
  group.points.push(p);group.x+=p.x;group.y+=p.y;
 }
 return [...buckets.values()].map(g=>({...g,x:g.x/g.points.length,y:g.y/g.points.length}));
}
// Compact symbols distinguish the publisher's real categories without relying
// on color. Exact category names remain in Layers, hover text and the inspector.
export function markerSymbol(category,type){
 if(type==='pin')return 'P';
 if(type==='route')return '';
 if([18].includes(category))return '⚿';
 if([3,48].includes(category))return '▣';
 if([27,28,69,41].includes(category))return '+';
 if([40].includes(category))return 'i';
 if([36].includes(category))return '!';
 if([17].includes(category))return 'B';
 if([2].includes(category))return 'HQ';
 if([38].includes(category))return 'CP';
 if([4,5,37].includes(category))return '◇';
 if([22].includes(category))return '★';
 if([19].includes(category))return '↗';
 if([20,65].includes(category))return 'A';
 if([6,21,35,49,52,56,62,70,72].includes(category))return 'W';
 if([9,8,46,50,71].includes(category))return '$';
 if([26,29,31,59,61].includes(category))return 'F';
 return '□';
}
export const SYMBOL_LABELS={'LZ':'Landing zone','HQ':'Base','CP':'Outpost','◇':'Location','!':'Objective','⚿':'Key','▣':'Door','+':'Medical','i':'Intel','B':'Boss','★':'Secret','↗':'Interaction','A':'Ammo','W':'Weapons / gear','F':'Food','$':'Valuables','□':'Container'};
