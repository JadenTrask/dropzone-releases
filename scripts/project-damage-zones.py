import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.art-tools'))
from shapely.geometry import Polygon
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1]/'app/assets/damage-body'
data=json.loads((Path(__file__).resolve().parents[1]/'art/body-source/projected-faces.json').read_text())
result={}
for zone,polys in data.items():
 shape=unary_union([Polygon(p).buffer(.035) for p in polys if Polygon(p).is_valid]).buffer(-.035).simplify(.45,preserve_topology=True)
 shapes=list(shape.geoms) if hasattr(shape,'geoms') else [shape];paths=[]
 for p in shapes:
  if p.area<.3:continue
  for ring in [p.exterior,*p.interiors]:paths.append('M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in ring.coords)+'Z')
 result[zone]=' '.join(paths)
(root/'zones.json').write_text(json.dumps(result),encoding='utf-8')
print('Built',len(result),'body region masks')
