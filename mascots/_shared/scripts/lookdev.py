"""Soft studio lookdev for the actors (EEVEE): big soft key/fill/rim area lights, light pastel backdrop
(seamless floor + wall), contact shadows. Everything lives in collection '_lookdev' (never exported)."""
import bpy, math
from mathutils import Vector

BG = (0.965, 0.925, 0.945)          # light pastel pink-lilac (sRGB)


def lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def _coll():
    c = bpy.data.collections.get("_lookdev")
    if not c:
        c = bpy.data.collections.new("_lookdev"); bpy.context.scene.collection.children.link(c)
    return c


def _obj(name, data, col):
    o = bpy.data.objects.get(name)
    if o: bpy.data.objects.remove(o)
    o = bpy.data.objects.new(name, data); col.objects.link(o); return o


def _area(name, col, loc, target, power, size, color=(1, 1, 1)):
    ld = bpy.data.lights.get(name) or bpy.data.lights.new(name, 'AREA')
    ld.shape = 'DISK'; ld.size = size; ld.energy = power; ld.color = color
    if hasattr(ld, "use_soft_falloff"): ld.use_soft_falloff = True
    o = _obj(name, ld, col); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


def setup(res=768, height=1.0):
    sc = bpy.context.scene; col = _coll()
    sc.render.engine = 'BLENDER_EEVEE'
    ee = sc.eevee
    for k, v in (("taa_render_samples", 64), ("use_shadows", True), ("use_raytracing", True),
                 ("shadow_ray_count", 2), ("shadow_step_count", 8), ("use_fast_gi", True)):
        try: setattr(ee, k, v)
        except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.film_transparent = False
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Base Contrast'
    except TypeError: sc.view_settings.view_transform = 'Standard'
    sc.view_settings.exposure = 0.35
    # world: pastel, gives soft ambient fill
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w
    nt = w.node_tree; nt.nodes.clear()
    bgn = nt.nodes.new("ShaderNodeBackground"); out = nt.nodes.new("ShaderNodeOutputWorld")
    bgn.inputs["Color"].default_value = lin(BG) + (1,); bgn.inputs["Strength"].default_value = 0.9
    nt.links.new(bgn.outputs["Background"], out.inputs["Surface"])
    # seamless backdrop (floor curving into wall), matte pastel
    m = bpy.data.materials.get("_lookdev_backdrop") or bpy.data.materials.new("_lookdev_backdrop")
    b = m.node_tree.nodes.get("Principled BSDF") or [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    b.inputs["Base Color"].default_value = lin(BG) + (1,); b.inputs["Roughness"].default_value = 0.95
    me = bpy.data.meshes.get("_lookdev_backdrop") or bpy.data.meshes.new("_lookdev_backdrop")
    me.clear_geometry()
    r = 1.2                                   # floor (x from +6 to -2) bending up into a wall at x = -3.2
    prof = [(6.0, 0.0)] + [(-2.0 - r * math.sin(math.radians(90 * i / 12)), r - r * math.cos(math.radians(90 * i / 12)))
                           for i in range(13)] + [(-3.2, 6.0)]
    verts = [(x, y, z) for (x, z) in prof for y in (-6, 6)]
    faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(prof) - 1)]
    me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    me.materials.clear(); me.materials.append(m)
    _obj("_lookdev_backdrop", me, col)
    # lights: soft key (front-left, high), fill (front-right), rim (back), all big
    h = height
    _area("_key", col, (2.2, 1.6, 2.4 * h), (0, 0, 0.5 * h), 260, 2.6, (1.0, 0.97, 0.94))
    _area("_fill", col, (2.0, -2.2, 1.0 * h), (0, 0, 0.5 * h), 90, 3.0, (0.95, 0.96, 1.0))
    _area("_rim", col, (-1.8, -0.8, 2.0 * h), (0, 0, 0.7 * h), 140, 1.8, (1.0, 0.98, 1.0))
    # camera
    cd = bpy.data.cameras.get("_cam") or bpy.data.cameras.new("_cam")
    cd.lens = 70; cd.clip_start = 0.05
    cam = _obj("_cam", cd, col)
    tgt = Vector((0, 0, 0.5 * h)); pos = Vector((4.0, 0.0, 0.95 * h))
    cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    return {"collection": col.name, "camera": cam.name}


def render_turntable(out_mp4, frames=120, res=768, action="idle", tmpdir=None):
    """Camera orbits 360 deg around the actor (which plays `action`), EEVEE, then ffmpeg -> mp4."""
    import os, subprocess, tempfile
    sc = bpy.context.scene; setup(res=res)
    col = _coll(); cam = bpy.data.objects["_cam"]
    piv = bpy.data.objects.get("_orbit") or bpy.data.objects.new("_orbit", None)
    if piv.name not in col.objects: col.objects.link(piv)
    piv.animation_data_clear(); piv.rotation_euler = (0, 0, 0)
    cam.parent = piv
    # keep the backdrop + key light facing the camera: parent them to the orbit too
    for n in ("_lookdev_backdrop", "_key", "_fill", "_rim"):
        bpy.data.objects[n].parent = piv
    piv.keyframe_insert("rotation_euler", index=2, frame=1)
    piv.rotation_euler = (0, 0, math.radians(360)); piv.keyframe_insert("rotation_euler", index=2, frame=frames + 1)
    for fc in piv.animation_data.action.layers[0].strips[0].channelbags[0].fcurves:
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
    rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    act = bpy.data.actions.get(action)
    if act:
        rig.animation_data_create(); rig.animation_data.action = act; rig.animation_data.action_slot = act.slots[0]
        n = int(act.frame_range[1])
        for fc in rig.animation_data.action.layers[0].strips[0].channelbags[0].fcurves:
            m = fc.modifiers.new('CYCLES') if not fc.modifiers else fc.modifiers[0]
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.fps = 30
    tmp = tmpdir or tempfile.mkdtemp()
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(tmp, "f_")
    bpy.ops.render.render(animation=True)
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(tmp, "f_%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out_mp4], check=True)
    if act:
        rig.animation_data.action = None
    return out_mp4


def turntable_pivot(objs, frames=96):
    """Parent the actor to an empty spinning 360 deg over `frames` (the empty is in _lookdev)."""
    col = _coll(); e = bpy.data.objects.get("_spin")
    if not e:
        e = bpy.data.objects.new("_spin", None); col.objects.link(e)
    e.animation_data_clear(); e.rotation_euler = (0, 0, 0)
    e.keyframe_insert("rotation_euler", index=2, frame=1)
    e.rotation_euler = (0, 0, math.radians(360)); e.keyframe_insert("rotation_euler", index=2, frame=frames + 1)
    for fc in e.animation_data.action.layers[0].strips[0].channelbags[0].fcurves:
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
    for o in objs:
        o.parent = e
    return e
