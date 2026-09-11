"""Original Dropzone 3D ident. Run in Blender 5.2; leaves other scenes intact."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes.new('Dropzone 2.0.2 • Opening ident')
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=960;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.fps=30;scene.frame_start=1;scene.frame_end=54
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Dropzone studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.17,.14,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
scene.view_settings.view_transform='AgX'
def mat(name,color,metal=.0,rough=.35,glow=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=glow
    return m
body=mat('Obsidian ceramic',(.018,.035,.029),.75,.24)
green=mat('Dropzone pale lime',(.48,.78,.27),.65,.25,.18)
edge=mat('Brushed edge',(.13,.23,.11),.8,.3)
rig=bpy.data.objects.new('Animated brand assembly',None);scene.collection.objects.link(rig)
def cube(name,loc,scale,material,bevel=.05,parent=rig):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    if bevel:mod=o.modifiers.new('Machined rounded edges','BEVEL');mod.width=bevel;mod.segments=5;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    o.parent=parent;return o
plate=cube('Rounded shield',(0,0,0),(2.46,2.46,.22),body,.22)
rim=cube('Metal rim',(0,0,-.055),(2.49,2.49,.19),edge,.23)
def bez(p0,p1,p2,p3,n=20):
    return [tuple((1-t)**3*p0[k]+3*(1-t)**2*t*p1[k]+3*(1-t)*t*t*p2[k]+t**3*p3[k] for k in (0,1)) for t in [i/n for i in range(1,n+1)]]
outer=[(55,62),(133,62)]+bez((133,62),(179,62),(203,85),(203,128))+bez((203,128),(203,171),(179,194),(133,194))+[(55,194)]
inner=[(89,93),(89,163),(130,163)]+bez((130,163),(155,163),(168,151),(168,128))+bez((168,128),(168,105),(155,93),(130,93))
curve=bpy.data.curves.new('Exact brand D outline','CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.extrude=.025;curve.bevel_depth=.006;curve.bevel_resolution=3
for points in (outer,inner):
    sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
    for dest,(x,y) in zip(sp.points,points):dest.co=((x-128)/100,(128-y)/100,0,1)
    sp.use_cyclic_u=True
letter=bpy.data.objects.new('D mark',curve);scene.collection.objects.link(letter);letter.location.z=.14;letter.parent=rig;curve.materials.append(green)
bpy.context.view_layer.objects.active=letter;letter.select_set(True)
for ob in bpy.context.selected_objects:
    if ob!=letter:ob.select_set(False)
bpy.ops.object.convert(target='MESH');letter=bpy.context.object
# A true machined cut follows the supplied diagonal logo slash.
cut=cube('Diagonal cut',(0,0,.16),(2.3,.2,1),body,0);cut.rotation_euler.z=math.radians(41.5)
mod=letter.modifiers.new('Brand diagonal cut','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
bpy.context.view_layer.objects.active=letter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
for name,loc,dims in [('NW vertical',(-.90,.665,.14),(.065,.47,.045)),('NW horizontal',(-.665,.90,.14),(.47,.065,.045)),('SE vertical',(.90,-.665,.14),(.065,.47,.045)),('SE horizontal',(.665,-.90,.14),(.47,.065,.045))]:cube(name,loc,dims,green,.02)
# Camera and lights stay fixed while the emblem settles from a three-quarter turn.
bpy.ops.object.camera_add(location=(0,0,9));camera=bpy.context.object;camera.name='Ident camera';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=5.2;camera.rotation_euler=(0,0,0)
for name,loc,power,color,size in [('Key',(-3,4,6),700,(.79,1,.68),5),('Silver edge',(4,1,4),900,(.8,.9,1),3),('Lime rim',(-3,-2,2),600,(.4,1,.15),2)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
for frame,rotation,scale in [(1,(.25,-1.8,-.2),.55),(18,(.16,.38,.08),1.03),(38,(0,-.05,0),1),(48,(0,0,0),1),(54,(0,0,0),1)]:
    rig.rotation_euler=rotation;rig.scale=(scale,)*3;rig.keyframe_insert('rotation_euler',frame=frame);rig.keyframe_insert('scale',frame=frame)
for ob in list(rig.children):
    if ob.name in ['Rounded shield','Metal rim']:continue
    final=ob.location.copy();ob.location.z+=1.4;ob.keyframe_insert('location',frame=1);ob.location=final;ob.keyframe_insert('location',frame=28)
scene.render.filepath=str(root/'.validation-cache/splash-frames/frame-')
scene.frame_set(54)
(root/'design').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'design/Dropzone-Intro.blend'))
print('Dropzone ident scene ready; original scene retained.')
