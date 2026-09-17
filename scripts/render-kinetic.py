"""Original kinetic sculpture. Offline asset authoring; no browser 3D runtime.

blender --background --python scripts/render-kinetic.py -- OUTPUT [WIDTH] [SAMPLES] [FRAMES] [START] [END]
The 36 positions are a scroll study, not a looping animation.
"""
import bpy
import math
import os
import sys
from mathutils import Vector
from math import pi, sin, cos

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(args[0] if args else 'work/kinetic-v5')
WIDTH = int(args[1]) if len(args) > 1 else 900
SAMPLES = int(args[2]) if len(args) > 2 else 96
FRAMES = int(args[3]) if len(args) > 3 else 36
START = int(args[4]) if len(args) > 4 else 0
END = int(args[5]) if len(args) > 5 else FRAMES - 1
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal, rough):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return mat

silver = material('Bead-blasted aluminium', (.60, .63, .64), 1, .255)
bright = material('Diamond turned edge', (.76, .79, .81), 1, .18)
graphite = material('Graphite anodised rotor', (.035, .046, .054), .88, .28)
black = material('Etched markings', (.018, .025, .03), .5, .4)
red = material('Vermilion enamel', (.69, .054, .021), .38, .27)

def empty(name, parent=None):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    ob.parent = parent
    return ob

def finish(ob, name, mat, parent, bevel=0):
    ob.name = name
    ob.data.materials.append(mat)
    ob.parent = parent
    for p in ob.data.polygons:
        p.use_smooth = True
    if bevel:
        mod = ob.modifiers.new('Machined rounded edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 4
        normals = ob.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
        normals.keep_sharp = True
    return ob

def annulus(name, radius, width, depth, mat, parent, z=0, bevel=.025):
    n = 192
    verts = []
    faces = []
    for r, zz in [(radius + width/2, -depth/2), (radius + width/2, depth/2),
                  (radius - width/2, depth/2), (radius - width/2, -depth/2)]:
        verts += [(r*cos(2*pi*j/n), r*sin(2*pi*j/n), zz+z) for j in range(n)]
    for side in range(4):
        for j in range(n):
            k = (j+1) % n
            faces.append((side*n+j, side*n+k, ((side+1)%4)*n+k, ((side+1)%4)*n+j))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    return finish(ob, name, mat, parent, bevel)

def cylinder(name, radius, depth, location, mat, parent, rotation=(0,0,0), bevel=.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=80, radius=radius, depth=depth, location=location, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent, bevel)

def tick(name, theta, r, length, z, parent, major=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(r*cos(theta), r*sin(theta), z), rotation=(0,0,theta))
    ob = bpy.context.object
    ob.scale = (length, .017 if major else .008, .001)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(ob, name, black, parent)

root = empty('Floating sculpture')
outer = empty('Outer gimbal', root)
middle = empty('Middle gimbal — Y pivot', outer)
inner = empty('Inner gimbal — X pivot', middle)
rotor = empty('Central rotor', inner)

# Flat annular cross-sections and small edge radii keep the object engineered,
# while three mutually pivoting planes create a legible sculptural silhouette.
annulus('Outer aluminium gimbal', 2.05, .235, .29, silver, outer, bevel=.038)
annulus('Outer polished front land', 2.052, .201, .018, bright, outer, z=.146, bevel=.005)
annulus('Outer inset dark seam', 2.171, .008, .072, graphite, outer, bevel=.002)
annulus('Middle aluminium gimbal', 1.58, .20, .25, silver, middle, bevel=.032)
annulus('Middle polished land', 1.58, .164, .012, bright, middle, z=.126, bevel=.004)
annulus('Middle graphite edge seam', 1.682, .008, .053, graphite, middle, bevel=.002)
annulus('Vermilion inner gimbal', 1.115, .17, .225, red, inner, bevel=.034)
annulus('Inner satin rear edge', 1.115, .10, .016, silver, inner, z=-.114, bevel=.005)

for i in range(72):
    theta = 2*pi*i/72
    tick('Laser etched outer index %02d' % i, theta, 2.07, .093 if i%6==0 else .045, .156, outer, i%6==0)
for i in range(48):
    if i%4 == 0:
        tick('Middle index %02d' % i, 2*pi*i/48, 1.595, .058, .134, middle, False)

# Actual coaxial bearing locations: middle pivots at ±Y, inner at ±X.
for sign in [-1, 1]:
    cylinder('Outer pivot spindle', .09, .41, (0, sign*1.825, 0), graphite, outer, (pi/2,0,0))
    cylinder('Outer satin bearing cap', .142, .068, (0, sign*2.195, 0), silver, outer, (pi/2,0,0))
    cylinder('Outer bearing inset', .064, .071, (0, sign*2.228, 0), graphite, outer, (pi/2,0,0), .007)
    cylinder('Middle pivot spindle', .084, .35, (sign*1.36, 0, 0), graphite, middle, (0,pi/2,0))
    cylinder('Middle bearing cap', .123, .069, (sign*1.714, 0, 0), silver, middle, (0,pi/2,0))
    cylinder('Inner axle', .075, .52, (0, sign*.86, 0), silver, inner, (pi/2,0,0))

# A compact flywheel gives the centre a physical purpose and solid visual weight.
cylinder('Graphite flywheel', .60, .30, (0,0,0), graphite, rotor, bevel=.052)
annulus('Rotor silver chamfer', .527, .065, .022, silver, rotor, z=.152, bevel=.008)
cylinder('Vermilion centre inset', .155, .014, (0,0,.167), red, rotor, bevel=.011)
cylinder('Axle bright centre', .058, .028, (0,0,.18), silver, rotor, bevel=.006)
annulus('Rotor rear silver chamfer', .527, .065, .022, silver, rotor, z=-.152, bevel=.008)
cylinder('Rear vermilion centre inset', .155, .014, (0,0,-.167), red, rotor, bevel=.011)
cylinder('Rear axle bright centre', .058, .028, (0,0,-.18), silver, rotor, bevel=.006)
for i in range(6):
    theta = 2*pi*i/6
    cylinder('Rotor fastening inset %d' % i, .027, .006, (.418*cos(theta), .418*sin(theta), .16), black, rotor, bevel=.004)
    cylinder('Rotor rear fastening inset %d' % i, .027, .006, (.418*cos(theta), .418*sin(theta), -.16), black, rotor, bevel=.004)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 7
scene.cycles.glossy_bounces = 5
scene.cycles.diffuse_bounces = 2
scene.render.film_transparent = True
scene.render.resolution_x = WIDTH
scene.render.resolution_y = WIDTH
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.68,.71,.73,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .42
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = -.35

def area(name, location, power, size, color, ratio=1):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = color
    data.shape = 'RECTANGLE'
    data.size = size
    data.size_y = size * ratio
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (-Vector(location)).to_track_quat('-Z','Y').to_euler()

area('Large warm key', (-3,-4,6), 900, 5.0, (1,.95,.86), .65)
area('Long reflected rim', (4,2,3), 1450, 5.5, (.91,.95,1), .20)
area('Front studio fill', (0,-6,.5), 500, 4.0, (1,1,1), .6)
area('Lower silver return', (-2,1,-4), 700, 4.5, (.85,.9,1), .2)

camera_data = bpy.data.cameras.new('Fixed portrait product camera')
camera = bpy.data.objects.new('Fixed portrait product camera', camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (5.5,-9.5,5.4)
camera.rotation_euler = (-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 5.60
scene.camera = camera

try:
    preferences = bpy.context.preferences.addons['cycles'].preferences
    for mode in ['OPTIX', 'CUDA', 'HIP']:
        try:
            preferences.compute_device_type = mode
            preferences.get_devices()
            devices = [d for d in preferences.devices if d.type != 'CPU']
            if devices:
                for device in preferences.devices:
                    device.use = device.type != 'CPU'
                scene.cycles.device = 'GPU'
                print('RENDER_DEVICE', mode, [d.name for d in devices], flush=True)
                break
        except Exception:
            pass
except Exception:
    pass

def pose(index):
    t = index / max(1, FRAMES-1)
    # Deliberate travel through three complementary configurations, without
    # scaling or moving the camera. Every ring remains inside the same sphere.
    root.rotation_euler = (math.radians(12), math.radians(-8), math.radians(-18+88*t))
    outer.rotation_euler = (math.radians(64+10*sin(t*pi)), math.radians(7), math.radians(12))
    middle.rotation_euler = (0, math.radians(52+210*t), 0)
    inner.rotation_euler = (math.radians(-57+260*t), 0, 0)
    rotor.rotation_euler = (math.radians(20), 0, math.radians(35+180*t))
    bpy.context.view_layer.update()

pose(START)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'kinetic-sculpture.blend'))
for index in range(START, min(END, FRAMES-1)+1):
    pose(index)
    scene.render.filepath = os.path.join(OUT, 'frame-%02d.png' % index)
    print('BEGIN_FRAME', index, 'OF', FRAMES, flush=True)
    bpy.ops.render.render(write_still=True)
