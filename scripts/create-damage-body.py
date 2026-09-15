import bpy, math, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/assets/damage-body'
ART=ROOT/'art/body-source'
OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Dropzone anatomical target')
bpy.context.window.scene=scene
mat=bpy.data.materials.new('Satin titanium');mat.diffuse_color=(.30,.39,.40,1);mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.30,.39,.40,1);bs.inputs['Metallic'].default_value=.1;bs.inputs['Roughness'].default_value=.57
# MakeHuman CC0 continuous body mesh. OBJ uses Y-up; convert to Blender Z-up.
source=Path(__file__).resolve().parents[1]/'art/body-source/base.obj'
raw=[];faces=[];group=''
for line in source.read_text(encoding='utf-8').splitlines():
 if line.startswith('v '):raw.append(tuple(map(float,line.split()[1:4])))
 elif line.startswith('g '):group=line[2:]
 elif line.startswith('f ') and group=='body':faces.append([int(t.split('/')[0])-1 for t in line.split()[1:]])
raw=[list(v) for v in raw]
for target in source.parent.glob('*.target'):
 weight=.55 if target.name.startswith('universal') else 1/3
 for line in target.read_text().splitlines():
  if not line.strip() or line.startswith('#'):continue
  i,*delta=line.split();i=int(i)
  for axis in range(3):raw[i][axis]+=float(delta[axis])*weight
ids=sorted({i for f in faces for i in f});mapping={old:new for new,old in enumerate(ids)}
bottom=min(raw[i][1] for i in ids);height=max(raw[i][1] for i in ids)-bottom;scale=1.82/height
verts=[(raw[i][0]*scale,-raw[i][2]*scale,(raw[i][1]-bottom)*scale) for i in ids]
# Lower the relaxed A-pose arms, with a smooth shoulder transition.
posed=[]
for x,y,z in verts:
 side=1 if x>=0 else -1
 weight=max(0,min(1,(abs(x)-.17)/.10)) if z>1.0 else 0
 if abs(x)>.42:weight=1
 angle=math.radians(-19)*weight;dx=abs(x)-.20;dz=z-1.47
 if weight:x=side*(.20+dx*math.cos(angle)-dz*math.sin(angle));z=1.47+dx*math.sin(angle)+dz*math.cos(angle)
 posed.append((x,y,z))
verts=posed
mesh=bpy.data.meshes.new('Continuous human anatomy');mesh.from_pydata(verts,[],[[mapping[i] for i in f] for f in faces]);mesh.update()
body=bpy.data.objects.new('Human target',mesh);scene.collection.objects.link(body);body.data.materials.append(mat)
for f in mesh.polygons:f.use_smooth=True
sub=body.modifiers.new('Smooth anatomy','SUBSURF');sub.levels=2;sub.render_levels=2
# Orthographic, front-facing: no perspective distortion of proportions.
camdata=bpy.data.cameras.new('Target camera');cam=bpy.data.objects.new('Target camera',camdata);scene.collection.objects.link(cam);cam.location=(0,-5,.94);cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=1.98;scene.camera=cam
for name,loc,power,size in [('Key',(-2,-3,4),450,3),('Fill',(2,-2,2),220,2),('Rim',(0,2,3),600,2)]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler();d.energy=power;d.shape='DISK';d.size=size
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=640;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.3,.3,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.3
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'target.png')
bpy.context.view_layer.update()
# Project actual mesh faces to preserve hands, feet and contours in the hit masks.
def zone_at(v):
 x=abs(v.x);z=v.z
 if z>1.60:return 'Head'
 if z>1.47 and x<.09:return 'Neck'
 if x> .19 + max(0,1.45-z)*.13 and z>.64:
  if z>1.22:return 'Upper arm'
  if z>.97:return 'Lower arm'
  return 'Hand'
 if z>1.30:return 'Upper torso'
 if z>1.19:return 'Middle torso'
 if z>1.08:return 'Lower torso'
 if z>.94:return 'Pelvis'
 if z>.51:return 'Upper leg'
 if z>.12:return 'Lower leg'
 return 'Foot'
evalbody=body.evaluated_get(bpy.context.evaluated_depsgraph_get());evaluated=evalbody.to_mesh()
zones={}
for face in evaluated.polygons:
 if face.normal.y>0:continue
 coords=[evaluated.vertices[i].co for i in face.vertices];center=sum(coords,Vector())/len(coords);zone=zone_at(center)
 points=[]
 for v in coords:
  p=world_to_camera_view(scene,cam,v);points.append((round(p.x*640,1),round((1-p.y)*1100,1)))
 zones.setdefault(zone,[]).append(points)
(ART/'projected-faces.json').write_text(json.dumps(zones),encoding='utf-8')
# Compact boundary paths are generated after rendering by the build script.

bpy.ops.wm.save_as_mainfile(filepath=str(ART/'dropzone-target.blend'))
bpy.ops.render.render(write_still=True)
