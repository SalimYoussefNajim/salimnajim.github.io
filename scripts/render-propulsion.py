"""Original illustrative propulsion study. No manufacturer or flight-design claim.

Run with the verified portable Blender executable:
  blender --background --python scripts/render-propulsion.py -- assembled 1280 128 work/propulsion-renders
"""
import bpy, math, sys, os
from mathutils import Vector
from math import pi, sin, cos

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VIEW = args[0] if args else 'assembled'
WIDTH = int(args[1]) if len(args) > 1 else 1280
SAMPLES = int(args[2]) if len(args) > 2 else 96
if VIEW not in {'assembled','exploded','cutaway'}:
    raise ValueError('View must be assembled, exploded, or cutaway')
OUT = os.path.abspath(args[3]) if len(args)>3 else os.path.join(os.getcwd(),'work','propulsion-renders')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in bpy.data.materials:
    bpy.data.materials.remove(block)

def material(name, color, metallic=1, roughness=.3):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

silver = material('Satin titanium', (.37,.405,.45), 1, .29)
edge = material('Machined edge', (.63,.68,.72), 1, .22)
dark = material('Graphite titanium', (.085,.105,.13), .95, .31)
deep = material('Inner shadow finish', (.022,.03,.04), .8, .4)
fanmat = material('Fan blade satin alloy', (.38,.43,.49), 1, .28)
hot = material('Warm nickel superalloy', (.33,.26,.18), 1, .29)
copper = material('Burnished heat shield', (.44,.29,.14), 1, .32)
black = material('Fastener black oxide', (.03,.04,.055), 1, .25)
ceramic = material('Nozzle ceramic', (.12,.145,.17), .65, .36)
blue = material('Identification enamel', (.12,.32,.58), .65, .26)

groups = {}
active_group = 'core'
def finish(obj, mat, group=None):
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    groups.setdefault(group or active_group, []).append(obj)
    return obj

def lathe(name, profile, mat, segments=144, sweep=2*pi, start=0, group=None):
    vertices=[]; faces=[]
    closed=abs(sweep-2*pi)<.0001
    n=segments if closed else segments+1
    for x,r in profile:
        vertices += [(x,r*cos(start+sweep*j/segments),r*sin(start+sweep*j/segments)) for j in range(n)]
    for i in range(len(profile)-1):
        for j in range(segments):
            k=(j+1)%n
            faces.append((i*n+j,i*n+k,(i+1)*n+k,(i+1)*n+j))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    return finish(obj,mat,group)

def torus(name,x,r,minor,mat,group=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=144,minor_segments=12,location=(x,0,0),rotation=(0,pi/2,0),major_radius=r,minor_radius=minor)
    obj=bpy.context.object; obj.name=name
    return finish(obj,mat,group)

def rod(name, a,b,r,mat,group=None):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2)
    obj=bpy.context.object; obj.rotation_euler=d.to_track_quat('Z','Y').to_euler();obj.name=name
    bevel=obj.modifiers.new('Micro edge bevel','BEVEL');bevel.width=r*.22;bevel.segments=2
    return finish(obj,mat,group)

def blade_stage(name, x, root_r, tip_r, count, mat, sweep=.25, chord=.24, axial=.23, group=None):
    for k in range(count):
        verts=[]; faces=[]; nr=12; nc=5
        for i in range(nr+1):
            t=i/nr; r=root_r+(tip_r-root_r)*t
            for j in range(nc+1):
                u=j/nc-.5
                theta=2*pi*k/count+sweep*t**1.45+u*chord*(.7+.3*t)
                xx=x + axial*u*(1.7-.75*t) + .065*sin(pi*t)*sin(pi*(u+.5))
                verts.append((xx,r*cos(theta),r*sin(theta)))
        for i in range(nr):
            for j in range(nc):
                a=i*(nc+1)+j; faces.append((a,a+1,a+nc+2,a+nc+1))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(name+' %02d'%k,mesh);bpy.context.collection.objects.link(obj)
        finish(obj,mat,group)
        solid=obj.modifiers.new('True blade thickness','SOLIDIFY');solid.thickness=.016 if tip_r>1 else .01
        bevel=obj.modifiers.new('Polished leading edge','BEVEL');bevel.width=.006;bevel.segments=2
        subs=obj.modifiers.new('Continuous curvature','SUBSURF');subs.levels=1;subs.render_levels=1

def bolts(x,r,count=32,group=None):
    for j in range(count):
        th=2*pi*j/count
        rod('Recessed axial fastener',(x-.018,r*cos(th),r*sin(th)),(x+.018,r*cos(th),r*sin(th)),.026,black,group)

# Broad rolled intake, returned inner wall and sculpted 22-blade fan.
active_group='fan'
lip_profile=[(-3.04,1.47),(-3.14,1.49),(-3.205,1.55),(-3.225,1.63),(-3.195,1.71),(-3.13,1.76),(-3.0,1.78),(-2.9,1.77),(-2.84,1.73)]
lathe('Rolled intake lip',lip_profile,edge)
outer_profile=[(-2.91,1.765),(-2.64,1.75),(-2.20,1.68),(-1.78,1.55),(-1.5,1.41),(-1.44,1.37)]
if VIEW=='cutaway':
    lathe('Opened fan nacelle',outer_profile,silver,sweep=1.28*pi,start=-.55*pi)
else: lathe('Fan nacelle outer shell',outer_profile,silver)
lathe('Dark intake interior',[(-3.055,1.485),(-2.91,1.485),(-2.68,1.48),(-2.36,1.43),(-2.12,1.37)],deep)
torus('Nacelle trim seam',-2.46,1.719,.012,dark)
torus('Rear fan attachment',-1.51,1.415,.035,edge)
blade_stage('Swept fan blade',-2.945,.34,1.455,22,fanmat,sweep=.29,chord=.255,axial=.42)
lathe('Elliptical spinner',[(-3.46,.012),(-3.44,.09),(-3.36,.20),(-3.23,.285),(-3.10,.33),(-2.91,.355),(-2.82,.36)],dark)
torus('Spinner base seam',-2.84,.35,.012,edge)
lathe('Fan hub backplate',[(-2.86,.35),(-2.84,.54),(-2.79,.55),(-2.76,.34)],silver)
for j in range(11):
    th=2*pi*(j+.5)/11
    rod('Fan outlet structural guide',(-2.1,.53*cos(th),.53*sin(th)),(-1.91,1.34*cos(th+.1),1.34*sin(th+.1)),.029,dark)

# Main shaft and progressively smaller compressor stages.
active_group='core'
lathe('Continuous main shaft',[(-2.75,.26),(2.5,.26),(2.63,.17)],dark)
for i in range(7):
    x=-2.22+i*.43; rr=1.14-i*.054
    lathe('Compressor drum %d'%i,[(x-.12,.33),(x-.12,rr*.62),(x+.095,rr*.60),(x+.095,.33)],silver)
    blade_stage('Compressor rotor %d'%i,x,rr*.57,rr,30,edge if i%2==0 else silver,sweep=-.16,chord=.145,axial=.20)
    torus('Compressor rotor rim %d'%i,x+.11,rr,.018,dark)

# The outside housing is retained only as an open, genuinely sectioned shell in view three.
active_group='case'
caseprofile=[(-1.72,1.32),(-1.67,1.29),(-1.38,1.22),(-.7,1.16),(.12,1.07),(.4,1.035)]
if VIEW=='cutaway':
    case_shell=lathe('Sectioned compressor case',caseprofile,silver,sweep=1.05*pi,start=-.55*pi)
    for x,r in [(-1.55,1.263),(-1.04,1.190),(-.53,1.141),(-.03,1.089),(.34,1.042)]:
        lathe('Sectioned structural flange',[(x-.034,r),(x-.034,r+.055),(x+.034,r+.055),(x+.034,r)],edge,sweep=1.05*pi,start=-.55*pi)
else:
    case_shell=lathe('Compressor pressure casing',caseprofile,silver)
    for x,r in [(-1.55,1.263),(-1.04,1.190),(-.53,1.141),(-.03,1.089),(.34,1.042)]:
        lathe('Structural flange',[(x-.025,r),(x-.025,r+.045),(x+.025,r+.045),(x+.025,r)],edge)
        bolts(x,r+.025,32)
case_shell.data.materials.append(deep)
case_wall=case_shell.modifiers.new('Pressure shell wall thickness','SOLIDIFY')
case_wall.thickness=.027
case_wall.offset=-1
case_wall.material_offset=1
for j in range(10):
    th=2*pi*j/10
    if VIEW=='cutaway' and pi*.5<th<pi*1.45:continue
    rod('Longitudinal case stiffener',(-1.57,1.278*cos(th),1.278*sin(th)),(.31,1.064*cos(th),1.064*sin(th)),.024,dark)

# Combustion annulus with nested hot-section liner and functional-looking hardware.
active_group='hot'
lathe('Annular combustor liner',[(.40,.34),(.40,.82),(.55,.94),(1.16,.94),(1.36,.83),(1.36,.35)],hot)
for x,r in [(.49,.893),(.65,.947),(.99,.947),(1.22,.916)]:
    torus('Combustor reinforcing hoop',x,r,.026,copper)
for j in range(36):
    th=2*pi*j/36
    rod('Combustor cooling rib',(.63,.95*cos(th),.95*sin(th)),(1.07,.95*cos(th),.95*sin(th)),.010,edge)
for j in range(12):
    th=2*pi*j/12+.11
    rod('External fuel manifold feed',(.28,1.10*cos(th),1.10*sin(th)),(.73,1.045*cos(th),1.045*sin(th)),.022,silver)
    rod('Injector head',(.70,1.045*cos(th),1.045*sin(th)),(.78,.91*cos(th),.91*sin(th)),.033,dark)
torus('Fuel manifold',.24,1.10,.026,silver)
for x,r in [(1.49,.79),(1.80,.73)]:
    blade_stage('Turbine hot stage',x,.32,r,36,hot,sweep=.15,chord=.15,axial=.16)
    torus('Turbine flange',x+.11,r+.08,.035,dark)

active_group='nozzle'
lathe('Exhaust diffuser',[(1.73,.78),(1.94,.90),(2.22,.89),(2.45,.81),(2.83,.63),(2.91,.61)],ceramic)
torus('Exhaust attachment',1.94,.92,.043,edge)
bolts(1.95,.922,28)
for j in range(16):
    start=2*pi*j/16+.012
    lathe('Variable nozzle petal',[(2.08,.905),(2.44,.83),(2.89,.648),(3.05,.56),(3.07,.545)],silver if j%2 else dark,segments=10,sweep=2*pi/16-.024,start=start)
    th=start+pi/16
    rod('Nozzle actuator',(1.94,.982*cos(th),.982*sin(th)),(2.53,.85*cos(th),.85*sin(th)),.022,edge)
lathe('Exhaust center cone',[(1.75,.32),(2.50,.32),(2.96,.18),(3.29,.005)],dark)

# Three composition states are built from the same real mesh assembly.
if VIEW=='exploded':
    offsets={'fan':(-2.45,0,0),'core':(-.18,0,0),'case':(.38,0,2.10),'hot':(1.1,0,0),'nozzle':(2.2,0,0)}
    for key,objects in groups.items():
        for obj in objects: obj.location += Vector(offsets[key])

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=SAMPLES
scene.cycles.use_denoising=True
scene.cycles.max_bounces=8
scene.cycles.diffuse_bounces=3
scene.cycles.glossy_bounces=5
scene.cycles.transparent_max_bounces=4
scene.render.film_transparent=True
scene.render.resolution_x=WIDTH
scene.render.resolution_y=round(WIDTH*2/3)
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.render.image_settings.color_depth='8'
scene.render.filepath=os.path.join(OUT,VIEW+'.png')
scene.render.threads_mode='AUTO'
scene.world.color=(.15,.15,.15)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.24,.31,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.35

def area(name,loc,power,size,color,target=(0,0,0),ratio=1):
    light=bpy.data.lights.new(name,'AREA'); light.energy=power;light.color=color;light.shape='RECTANGLE';light.size=size;light.size_y=size*ratio
    ob=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Broad overhead softbox',(-1,-2,7),2600,8,(.90,.95,1),ratio=.5)
area('Front intake softbox',(-7,-4,2),1750,6,(.95,.975,1),target=(-2,0,0),ratio=.7)
area('Long rear rim strip',(3,4,5),3200,7,(.60,.73,1),ratio=.18)
area('Right warm accent',(5,-1,2),1300,4,(1,.89,.72),target=(2,0,0),ratio=.6)
area('Lower reflection card',(-1,-4,-3),950,7,(.68,.76,.87),ratio=.15)

camdata=bpy.data.cameras.new('Product camera');camera=bpy.data.objects.new('Product camera',camdata);bpy.context.collection.objects.link(camera)
target=Vector((-.1,0,.10 if VIEW!='exploded' else .45))
camera.location=target+Vector((-8.1,-11.8,6.0))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camdata.type='ORTHO'
camdata.ortho_scale=9.0 if VIEW!='exploded' else 13.3
camdata.lens=55
scene.camera=camera
bpy.context.view_layer.update()
# Center and fit the full assembly for every state, including separated parts.
# This is baked into each asset and never depends on a visitor's GPU or viewport.
camera_inverse=camera.matrix_world.inverted()
projected=[]
for objects in groups.values():
    for obj in objects:
        transform=camera_inverse@obj.matrix_world
        projected.extend(transform@vertex.co for vertex in obj.data.vertices)
minx,maxx=min(p.x for p in projected),max(p.x for p in projected)
miny,maxy=min(p.y for p in projected),max(p.y for p in projected)
camera.location += camera.rotation_euler.to_matrix()@Vector(((minx+maxx)/2,(miny+maxy)/2,0))
camdata.ortho_scale=max((maxx-minx)/.86,(maxy-miny)/.81*scene.render.resolution_x/scene.render.resolution_y)
bpy.context.view_layer.update()

# Use a compatible GPU if it is exposed; CPU rendering remains supported.
try:
    cp=bpy.context.preferences.addons['cycles'].preferences
    for mode in ['OPTIX','CUDA','HIP']:
        try:
            cp.compute_device_type=mode;cp.get_devices()
            devices=[d for d in cp.devices if d.type!='CPU']
            if devices:
                for d in cp.devices:d.use=d.type!='CPU'
                scene.cycles.device='GPU'
                print('RENDER_DEVICE',mode,[(d.name,d.type) for d in devices],flush=True)
                break
        except Exception: pass
except Exception:pass
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'propulsion-'+VIEW+'.blend'))
print('BEGIN_RENDER',VIEW,WIDTH,SAMPLES,flush=True)
bpy.ops.render.render(write_still=True)
print('COMPLETE_RENDER',scene.render.filepath,flush=True)
