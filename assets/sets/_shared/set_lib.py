"""Shared helpers for procedural set builds (Blender 5.2, headless). Import from a set's build script:

    import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_shared"))
    import set_lib as S
    S.begin("my-set", palette={...})
    S.box("bench", (2, 0.08, 0.8), (0, 0.9, -1), S.M("wood"))
    ...
    S.finish(ao_tint="#7f86a6")          # curves -> meshes, apply modifiers, bake AO, join by material, save + export

Everything is authored in THREE.js coordinates (metres, +Y up, +Z toward the camera) through P()/D() and converted to
Blender's Z-up, so the numbers match the React wrapper in episodes/src/sets/<name>/.
Naming: objects with keep=True stay separate nodes (animated parts, practicals); "_noshadow" in a name = no shadow
casting at runtime (useSetGLB). Blended (alpha) materials never cast shadows.
Pipeline notes: bmesh primitives only write UVs into an existing UV layer (_bm() creates one, otherwise textures
render black); surfaces are densified (~0.2-0.3 m) so the baked vertex AO has vertices to land on.
"""
import bpy, bmesh, math, os, random, sys
import numpy as np
from mathutils import Vector

STATE = {"name": None, "dir": None, "col": None, "cut": None, "pal": {}, "mats": {}}
R = random.Random(7)
BAKE = "--no-bake" not in sys.argv


def P(x, y, z): return Vector((x, -z, y))
def D(w, h, d): return Vector((w, d, h))          # size along three x, y, z


def begin(name, out_dir, palette, seed=7):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'
    col = bpy.data.collections.new(name); sc.collection.children.link(col)
    cut = bpy.data.collections.new("Cutters"); sc.collection.children.link(cut)
    STATE.update(name=name, dir=out_dir, col=col, cut=cut, pal=palette, mats={})
    R.seed(seed)


def hex2lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def M(key, color=None, rough=0.7, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0, image=None, emit_image=False):
    """Material by key (cached: the first call defines it). color defaults to palette[key]."""
    mats = STATE["mats"]
    if key in mats: return mats[key]
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color or STATE["pal"].get(key, "#ffffff")), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*hex2lin(emit), 1)
        b.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if image is not None:
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = image
        m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
        if emit_image: m.node_tree.links.new(t.outputs["Color"], b.inputs["Emission Color"])
    mats[key] = m
    return m


# ----------------------------------------------------------------------------- meshes
def _bm():
    bm = bmesh.new(); bm.loops.layers.uv.new("UVMap")
    return bm


def _obj(name, bm, material, keep=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); STATE["col"].objects.link(ob)
    if material: me.materials.append(material)
    ob["keep"] = keep
    return ob


def _adopt(ob, name, material, keep=False):
    """Move an operator-created object into the set collection."""
    ob.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    STATE["col"].objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def densify(bm, size, step):
    if not step: return
    for ax in range(3):
        n = int(size[ax] / step)
        for k in range(1, n):
            co = Vector((0, 0, 0)); co[ax] = -size[ax] / 2 + size[ax] * k / n
            no = Vector((0, 0, 0)); no[ax] = 1
            bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=co, plane_no=no)


def add_bevel(ob, width, segments=2):
    m = ob.modifiers.new("Bevel", 'BEVEL'); m.width = width; m.segments = segments
    m.limit_method = 'ANGLE'; m.angle_limit = math.radians(30); m.use_clamp_overlap = True
    m.harden_normals = True; m.miter_outer = 'MITER_ARC'
    w = ob.modifiers.new("WN", 'WEIGHTED_NORMAL'); w.keep_sharp = True; w.weight = 50
    for p in ob.data.polygons: p.use_smooth = True


def box(name, size3, at3, material, bevel=0.012, step=0.25, rot_y=0.0, keep=False, segments=2, rot=None):
    """Box of THREE size (w,h,d) centred at a THREE point. rot_y: degrees about the vertical; rot: (rx, ry, rz) degrees in three axes."""
    s = D(*size3)
    bm = _bm(); bmesh.ops.create_cube(bm, size=1.0, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
    densify(bm, s, step)
    ob = _obj(name, bm, material, keep)
    ob.location = P(*at3)
    if rot: ob.rotation_euler = (math.radians(rot[0]), -math.radians(rot[2]), math.radians(rot[1]))
    else: ob.rotation_euler = (0, 0, math.radians(rot_y))
    if bevel: add_bevel(ob, bevel, segments)
    return ob


def cyl(name, r, h, at3, material, seg=24, r2=None, bevel=0.006, axis="y", keep=False, cap=True):
    bm = _bm()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, calc_uvs=True)
    ob = _obj(name, bm, material, keep); ob.location = P(*at3)
    if axis == "x": ob.rotation_euler = (0, math.radians(90), 0)
    elif axis == "z": ob.rotation_euler = (math.radians(90), 0, 0)
    if bevel: add_bevel(ob, bevel)
    else:
        for p in ob.data.polygons: p.use_smooth = True
    return ob


def sphere(name, r, at3, material, seg=24, scale=(1, 1, 1), keep=False, smooth=True):
    bm = _bm(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r, calc_uvs=True)
    ob = _obj(name, bm, material, keep); ob.location = P(*at3); ob.scale = (scale[0], scale[2], scale[1])
    for p in ob.data.polygons: p.use_smooth = smooth
    return ob


def torus(name, R_, r, at3, material, seg=48, minor=12, facing="z", keep=False):
    """facing 'z': ring faces the camera; 'y': lies flat; 'x': faces the side."""
    bpy.ops.mesh.primitive_torus_add(major_radius=R_, minor_radius=r, major_segments=seg, minor_segments=minor)
    ob = _adopt(bpy.context.active_object, name, material, keep)
    ob.location = P(*at3)
    if facing == "z": ob.rotation_euler = (math.radians(90), 0, 0)
    elif facing == "x": ob.rotation_euler = (0, math.radians(90), 0)
    return ob


def cone_shell(name, r1, r2, h, at3, material, seg=32, thickness=0.012, keep=False):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, end_fill_type='NOTHING')
    ob = _adopt(bpy.context.active_object, name, material, keep); ob.location = P(*at3)
    sol = ob.modifiers.new("Solid", 'SOLIDIFY'); sol.thickness = thickness
    return ob


def plane(name, w, h, at3, material, facing="z", keep=False):
    bm = _bm(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * h, 0))
    ob = _obj(name, bm, material, keep); ob.location = P(*at3)
    if facing == "z": ob.rotation_euler = (math.radians(90), 0, 0)
    elif facing == "x": ob.rotation_euler = (math.radians(90), 0, math.radians(90))
    elif facing == "-x": ob.rotation_euler = (math.radians(90), 0, math.radians(-90))
    return ob


def _curve(name, material, keep, radius, kind, pts3, res=8, bevel_res=3):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = bevel_res
    cu.use_fill_caps = True
    if kind == 'BEZIER':
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts3) - 1)
        for bp, p in zip(sp.bezier_points, pts3):
            bp.co = P(*p); bp.handle_left_type = bp.handle_right_type = 'AUTO'
        cu.resolution_u = res
    else:
        sp = cu.splines.new('POLY'); sp.points.add(len(pts3) - 1)
        for p_, q in zip(sp.points, pts3): p_.co = (*P(*q), 1)
    ob = bpy.data.objects.new(name, cu); STATE["col"].objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    return ob


def tube(name, pts3, radius, material, keep=False, res=8):
    return _curve(name, material, keep, radius, 'BEZIER', pts3, res)


def poly_tube(name, pts3, radius, material, keep=False):
    return _curve(name, material, keep, radius, 'POLY', pts3, bevel_res=2)


def text(name, body, size, at3, material, extrude=0.02, keep=False):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.bevel_depth = 0.004
    ob = bpy.data.objects.new(name, cu); STATE["col"].objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    ob.location = P(*at3); ob.rotation_euler = (math.radians(90), 0, 0)
    return ob


def boolean_cut(target, cutter, solver='EXACT'):
    for c in cutter.users_collection: c.objects.unlink(cutter)
    STATE["cut"].objects.link(cutter); cutter.display_type = 'WIRE'; cutter.hide_render = True
    bo = target.modifiers.new("Cut_" + cutter.name, 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cutter; bo.solver = solver
    return bo


# ----------------------------------------------------------------------------- generated textures (original art only)
def image(name, w, h, rgba_fn):
    yy, xx = np.mgrid[0:h, 0:w]; u = xx / (w - 1); v = yy / (h - 1)       # v: 0 bottom .. 1 top
    rgba = rgba_fn(u, v)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel()); img.pack()
    return img


def C(hx): return np.array(hex2lin(hx) + [1.0])
def fill(u, hx): out = np.zeros(u.shape + (4,)); out[...] = C(hx); return out
def paint(out, mask, hx, a=1.0): out[mask] = out[mask] * (1 - a) + C(hx) * a


# ----------------------------------------------------------------------------- finalize
def finish(ao_tint="#8f7aa6", ao_floor=0.42, ao_distance=0.7, samples=48):
    """Curves/text -> meshes, apply modifiers, bake AO into vertex colours (tinted, never black), join static meshes by
    material, save <name>.blend and export <name>.glb next to the build script."""
    col, sc, name, out = STATE["col"], bpy.context.scene, STATE["name"], STATE["dir"]
    for ob in [o for o in col.objects if o.type in ('CURVE', 'FONT')]:
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        new = bpy.data.objects.new(ob.name + "_m", me); new.matrix_world = ob.matrix_world; col.objects.link(new)
        new["keep"] = ob.get("keep", False)
        if ob.get("join_into"): new["join_into"] = ob["join_into"]
        nm = ob.name; bpy.data.objects.remove(ob); new.name = nm
        for p in me.polygons: p.use_smooth = True
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in [o for o in col.objects if o.type == 'MESH' and o.modifiers]:
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); ob.modifiers.clear(); old = ob.data; ob.data = me
        bpy.data.meshes.remove(old)
    for ob in list(STATE["cut"].objects): bpy.data.objects.remove(ob)

    meshes = [o for o in col.objects if o.type == 'MESH']
    emissive = lambda o: "_noshadow" in o.name or o.get("keep")
    glassy = lambda o: o.data.materials and o.data.materials[0].surface_render_method == 'BLENDED'
    if BAKE:
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
        world = bpy.data.worlds.new("bake"); sc.world = world; world.light_settings.distance = ao_distance
        targets = [o for o in meshes if not emissive(o) and not glassy(o)]
        for o in targets:
            a = o.data.color_attributes.new("AO", 'BYTE_COLOR', 'CORNER'); o.data.color_attributes.active_color = a
        for o in bpy.context.view_layer.objects: o.select_set(False)
        for o in targets: o.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        sc.render.bake.target = 'VERTEX_COLORS'
        bpy.ops.object.bake(type='AO')
        tint = np.array(hex2lin(ao_tint))
        for o in targets:
            a = o.data.color_attributes["AO"]; n = len(a.data)
            c = np.zeros(n * 4, np.float32); a.data.foreach_get("color", c); c = c.reshape(n, 4)
            k = ao_floor + (1 - ao_floor) * np.clip(c[:, 0], 0, 1) ** 0.85
            c[:, :3] = tint * (1 - k)[:, None] + k[:, None]
            a.data.foreach_set("color", c.ravel())
        print("BAKE| AO on", len(targets), "objects")

    named = {}
    for o in [o for o in col.objects if o.type == 'MESH']:
        if o.get("join_into"): named.setdefault(o["join_into"], []).append(o)
    for tgt, parts in named.items():
        t = bpy.data.objects[tgt]
        with bpy.context.temp_override(active_object=t, selected_editable_objects=[t] + parts):
            bpy.ops.object.join()
    groups = {}
    for o in [o for o in col.objects if o.type == 'MESH' and not o.get("keep")]:
        groups.setdefault((o.data.materials[0].name if o.data.materials else "none", "AO" in o.data.color_attributes), []).append(o)
    for (mname, _), objs in groups.items():
        if len(objs) > 1:
            with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
                bpy.ops.object.join()
        objs[0].name = f"set_{mname}"
    for o in col.objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0].surface_render_method == 'BLENDED' and "_noshadow" not in o.name:
            o.name += "_noshadow"

    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in col.objects if o.type == 'MESH')
    print("STATS| objects", len([o for o in col.objects if o.type == 'MESH']), "materials", len(bpy.data.materials), "tris", tris)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f"{name}.blend"))
    for o in bpy.context.view_layer.objects: o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, f"{name}.glb"), export_format='GLB', use_selection=True,
                              export_apply=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_yup=True, export_cameras=False, export_lights=False, export_extras=False,
                              export_image_format='AUTO', export_materials='EXPORT', export_animations=False)
    print("EXPORT|", os.path.getsize(os.path.join(out, f"{name}.glb")), "bytes")
    return tris
