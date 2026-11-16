"""Actor build library: turns <name>/model/<name>.blend (toon sprite rig) into a web actor
(<name>/model/<name>_actor.glb) for @remotion/three: soft PBR look, separate face mesh with
swappable expression textures, one glTF animation per clip (in place), anti-clip pass.

Use inside Blender (MCP or headless):
    import sys, importlib; sys.path.insert(0, ROOT + "_shared/scripts")
    import actor_lib as A; importlib.reload(A)
Every stage is a function; actor_build.py chains them.
Conventions of these rigs: character faces +X, left = +Y, up = +Z, armature object at identity.
"""
import bpy, bmesh, math, os, json
import numpy as np
from mathutils import Matrix, Vector, Quaternion
from mathutils.bvhtree import BVHTree
from bpy_extras import anim_utils

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")) + "/"   # .../mascots/
FPS = 30
EXPR = ["neutral", "happy", "smug", "shocked", "dizzy", "crying", "squint"]
EXPR_SRC = {"neutral": "01_neutral", "happy": "02_happy", "smug": "03_smug", "shocked": "04_shocked",
            "dizzy": "05_dizzy", "crying": "06_crying", "squint": "07_squint", "glint": "08_glint"}
FACE_BASE, FACE_EMIT = 0.35, 0.75          # face = tex*0.35 lit + tex*0.75 emissive: never darkened by shadow
BODY_ROUGH = 0.7


def exprs(name):
    return EXPR + (["glint"] if name == "lumi" else [])


def paths(name):
    d = ROOT + name + "/"
    return {"src": d + f"model/{name}.blend", "blend": d + f"model/{name}_actor.blend",
            "glb": d + f"model/{name}_actor.glb", "tex": d + "model/textures/", "tests": d + "tests/",
            "expr": ROOT + f"_shared/expressions/{name}/", "shared_tex": ROOT + f"_shared/textures/{name}/",
            "build": ROOT + f"_shared/build/{name}/", "mixamo": ROOT + "_shared/mixamo/"}


# ----------------------------------------------------------------------------- objects
def arm():
    o = bpy.data.objects.get(bpy.context.scene.get("actor_rig", ""))
    return o or [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]


def body():
    o = bpy.data.objects.get(bpy.context.scene.get("actor_body", ""))
    return o or [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("tripo_node")][0]


def skinned():
    a = arm()
    return [o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() == a]


def attached():
    """Meshes that follow the rig: skinned + bone-parented (glasses)."""
    a = arm()
    return [o for o in bpy.data.objects if o.type == 'MESH' and (o.find_armature() == a or o.parent == a)]


def depth(b):
    n = 0
    while b.parent: b = b.parent; n += 1
    return n


def bone_order(a=None):
    a = a or arm()
    return [b.name for b in sorted(a.data.bones, key=depth)]


def descendants(a, name):
    out = []; st = [a.data.bones[name]]
    while st:
        b = st.pop(); out.append(b.name); st.extend(b.children)
    return out


# ----------------------------------------------------------------------------- stage 1: file + mesh fixes
def open_source(name):
    p = paths(name)
    bpy.ops.wm.open_mainfile(filepath=p["src"])
    os.makedirs(p["tex"], exist_ok=True); os.makedirs(p["tests"], exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=p["blend"])
    bpy.context.scene["actor_name"] = name
    return {"file": bpy.data.filepath}


def fix_mesh(name):
    """Remove toon outline (inverted hull) + weld, loose verts, cap weights at 4, rename objects."""
    rep = {}
    a = arm(); b = body()
    for ob in attached():
        for m in [m for m in ob.modifiers if m.type in ('SOLIDIFY', 'WELD')]:
            rep.setdefault("removed_modifiers", []).append(f"{ob.name}:{m.name}")
            ob.modifiers.remove(m)
        me = ob.data
        for i in reversed(range(len(me.materials))):
            if me.materials[i] and me.materials[i].name == "Outline":
                me.materials.pop(index=i)
    # loose verts / tiny islands (QA: single floating verts)
    me = b.data; bm = bmesh.new(); bm.from_mesh(me)
    loose = [v for v in bm.verts if not v.link_faces]
    seen = set(); tiny = []
    for f0 in bm.faces:
        if f0 in seen: continue
        comp = []; st = [f0]
        while st:
            f = st.pop()
            if f in seen: continue
            seen.add(f); comp.append(f)
            for e in f.edges: st.extend(x for x in e.link_faces if x not in seen)
        if len(comp) < 3: tiny += comp
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bmesh.ops.delete(bm, geom=tiny, context='FACES')
    loose2 = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose2, context='VERTS')
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me); bm.free(); me.update()
    rep["loose_verts_removed"] = len(loose) + len(loose2); rep["tiny_island_faces_removed"] = len(tiny)
    # weights: max 4 influences, normalized, drop < 0.01
    n4 = 0
    for v in me.vertices:
        gs = sorted([(g.group, g.weight) for g in v.groups], key=lambda x: -x[1])
        keep = [(gi, w) for gi, w in gs[:4] if w >= 0.01] or gs[:1]
        if len(gs) > 4: n4 += 1
        tot = sum(w for _, w in keep) or 1
        for gi, w in gs:
            b.vertex_groups[gi].remove([v.index])
        for gi, w in keep:
            b.vertex_groups[gi].add([v.index], w / tot, 'REPLACE')
    rep["verts_capped_to_4"] = n4
    # scene junk from the sprite pipeline
    for nm in ("Icosphere", "Toon_Sun", "Cam_FaceRef", "Cam_Front", "Cam_ThreeQuarter"):
        o = bpy.data.objects.get(nm)
        if o: bpy.data.objects.remove(o)
    # names used at runtime
    a.name = f"{name}_rig"; a.data.name = f"{name}_rig"; bpy.context.scene["actor_rig"] = a.name
    b.name = f"{name}_body"; b.data.name = f"{name}_body"
    bpy.context.scene["actor_body"] = b.name
    for o in attached():
        if o.name == "Kiri_Glasses": o.name = o.data.name = "lumi_glasses"
        if o.name == "Kiri_Glasses_Lenses": o.name = o.data.name = "lumi_lenses"
    if a.animation_data: a.animation_data.action = None
    for act in list(bpy.data.actions):
        if act.users == 0 or act.name.endswith("_Poses"): bpy.data.actions.remove(act)
    reset_pose()
    # feet on the floor
    dg = bpy.context.evaluated_depsgraph_get()
    zmin = min((o.matrix_world @ v.co).z for o in [b] for v in o.evaluated_get(dg).data.vertices)
    rep["feet_z_before"] = round(zmin, 4)
    rep["tris"] = sum(len(p.vertices) - 2 for p in me.polygons)
    rep["height"] = round(b.dimensions.z, 4)
    return rep


# ----------------------------------------------------------------------------- stage 2: face split + expressions
def _img_np(path):
    im = bpy.data.images.load(path, check_existing=True)
    w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    return px.reshape(h, w, 4), im


def _sample(arr, uv):
    h, w = arr.shape[:2]
    x = int(min(w - 1, max(0, uv[0] * w))); y = int(min(h - 1, max(0, uv[1] * h)))
    return arr[y, x]


def split_face(name):
    """Move the face-decal region of the body into its own mesh '<name>_face' (FaceUV as its only UV),
    so expressions swap by changing one material map. Normals are frozen first so there is no seam."""
    p = paths(name); b = body(); me = b.data
    union = None
    for e in exprs(name):
        arr, im = _img_np(p["expr"] + f"face_{EXPR_SRC[e]}.png")
        union = arr[..., 3] if union is None else np.maximum(union, arr[..., 3])
    masks, _ = _img_np(p["shared_tex"] + f"{name}_masks.png")
    a = arm(); gn = {g.index: g.name for g in b.vertex_groups}
    HEADG = {"Head", "FacialBone", "L_Eye", "R_Eye"}
    head_v = [bool(v.groups) and gn[max(v.groups, key=lambda g: g.weight).group] in HEADG for v in me.vertices]
    fuv = me.uv_layers["FaceUV"].data; buv = me.uv_layers["UVMap"].data
    pick = set()
    for poly in me.polygons:
        if poly.normal.x < 0.1 or not all(head_v[v] for v in poly.vertices): continue
        uvs = [Vector(fuv[li].uv) for li in poly.loop_indices]
        if not all(0 <= u.x <= 1 and 0 <= u.y <= 1 for u in uvs): continue
        c = sum(uvs, Vector((0, 0))) / len(uvs)
        al = max([_sample(union[..., None], u)[0] for u in uvs + [c]])
        bc = sum((Vector(buv[li].uv) for li in poly.loop_indices), Vector((0, 0))) / len(uvs)
        if al > 0.02 or _sample(masks, bc)[0] > 0.5: pick.add(poly.index)
    # close pin-holes (face fully surrounded by face) and drop specks
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    for _ in range(2):
        add = [f.index for f in bm.faces if f.index not in pick and
               len({g.index for e in f.edges for g in e.link_faces if g is not f} & pick) >= 2 and
               all(g.index in pick for e in f.edges for g in e.link_faces if g is not f)]
        pick |= set(add)
    bm.free()
    # freeze smooth normals so the cut does not show
    me.normals_split_custom_set_from_vertices([v.normal[:] for v in me.vertices])
    # duplicate -> face object
    fo = b.copy(); fo.data = me.copy(); bpy.context.scene.collection.objects.link(fo)
    for c in b.users_collection:
        if fo.name not in c.objects: c.objects.link(fo)
    if fo.name in bpy.context.scene.collection.objects and b.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.unlink(fo)
    fo.name = fo.data.name = f"{name}_face"
    for ob, keep in ((fo, True), (b, False)):
        bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
        kill = [f for f in bm.faces if (f.index in pick) != keep]
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(ob.data); bm.free(); ob.data.update()
    return {"face_polys": len(fo.data.polygons), "body_polys": len(b.data.polygons), "face_obj": fo.name}


def _cycles_bake_setup():
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'
    sc.cycles.samples = 1; sc.cycles.device = 'CPU'
    sc.render.bake.margin = 16; sc.render.bake.use_clear = True
    sc.render.bake.target = 'IMAGE_TEXTURES'


def bake_expressions(name, res=1024):
    """One texture per expression in FaceUV space: body base colour underneath + decal on top."""
    p = paths(name); fo = bpy.data.objects[f"{name}_face"]; me = fo.data
    base = bpy.data.images.get(f"{name}_base_clean") or bpy.data.images.load(p["shared_tex"] + f"{name}_base_clean.png")
    m = bpy.data.materials.new("_bake_tmp"); nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
    u0 = N("ShaderNodeUVMap"); u0.uv_map = "UVMap"
    u1 = N("ShaderNodeUVMap"); u1.uv_map = "FaceUV"
    tb = N("ShaderNodeTexImage"); tb.image = base; L(u0.outputs["UV"], tb.inputs["Vector"])
    td = N("ShaderNodeTexImage"); td.extension = 'CLIP'; L(u1.outputs["UV"], td.inputs["Vector"])
    mx = N("ShaderNodeMix"); mx.data_type = 'RGBA'
    L(td.outputs["Alpha"], mx.inputs["Factor"]); L(tb.outputs["Color"], mx.inputs["A"]); L(td.outputs["Color"], mx.inputs["B"])
    em = N("ShaderNodeEmission"); out = N("ShaderNodeOutputMaterial")
    L(mx.outputs["Result"], em.inputs["Color"]); L(em.outputs["Emission"], out.inputs["Surface"])
    tgt = N("ShaderNodeTexImage"); nt.nodes.active = tgt
    old = list(me.materials); me.materials.clear(); me.materials.append(m)
    me.uv_layers.active = me.uv_layers["FaceUV"]
    _cycles_bake_setup()
    a = arm(); reset_pose()
    for o in bpy.context.view_layer.objects: o.select_set(False)
    fo.select_set(True); bpy.context.view_layer.objects.active = fo
    out_paths = {}
    for e in exprs(name):
        dec = bpy.data.images.load(p["expr"] + f"face_{EXPR_SRC[e]}.png", check_existing=True)
        td.image = dec
        img = bpy.data.images.new(f"{name}_face_{e}", res, res, alpha=False)
        tgt.image = img
        bpy.ops.object.bake(type='EMIT')
        fp = p["tex"] + f"{name}_face_{e}.png"
        img.filepath_raw = fp; img.file_format = 'PNG'; img.save()
        out_paths[e] = fp
        if e != "neutral": bpy.data.images.remove(img)
    me.materials.clear()
    for x in old: me.materials.append(x)
    bpy.data.materials.remove(m)
    return out_paths


def finalize_face_uv(name):
    """Face object keeps only FaceUV (renamed UVMap -> TEXCOORD_0); body drops FaceUV."""
    fo = bpy.data.objects[f"{name}_face"]; b = body()
    uv = fo.data.uv_layers
    uv.remove(uv["UVMap"]); uv["FaceUV"].name = "UVMap"; uv.active = uv[0]; uv[0].active_render = True
    if "FaceUV" in b.data.uv_layers: b.data.uv_layers.remove(b.data.uv_layers["FaceUV"])
    return {"face_uv": [l.name for l in fo.data.uv_layers], "body_uv": [l.name for l in b.data.uv_layers]}


# ----------------------------------------------------------------------------- stage 3: soft PBR materials
def _principled(mname):
    m = bpy.data.materials.get(mname) or bpy.data.materials.new(mname)
    nt = m.node_tree; nt.nodes.clear()
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf.location = (0, 0); out.location = (350, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = BODY_ROUGH
    m.use_backface_culling = False
    return m, nt, bsdf


def build_materials(name):
    p = paths(name); b = body(); fo = bpy.data.objects[f"{name}_face"]
    base = bpy.data.images.get(f"{name}_base_clean") or bpy.data.images.load(p["shared_tex"] + f"{name}_base_clean.png")
    base.name = f"{name}_base"
    # body: base colour + roughness only
    m, nt, bsdf = _principled(f"{name}_body_mat")
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = base; t.location = (-400, 100)
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    b.data.materials.clear(); b.data.materials.append(m)
    # face: flat-bright (dim lit base + emissive of the same map)
    fimg = bpy.data.images.get(f"{name}_face_neutral") or bpy.data.images.load(p["tex"] + f"{name}_face_neutral.png")
    fimg.name = f"{name}_face_neutral"; fimg.filepath = p["tex"] + f"{name}_face_neutral.png"
    m2, nt2, b2 = _principled(f"{name}_face_mat")
    t2 = nt2.nodes.new("ShaderNodeTexImage"); t2.image = fimg; t2.location = (-600, 0); t2.name = "Face Map"
    mul = nt2.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.location = (-300, 150)
    mul.inputs["Factor"].default_value = 1.0; mul.inputs["B"].default_value = (FACE_BASE,) * 3 + (1,)
    nt2.links.new(t2.outputs["Color"], mul.inputs["A"]); nt2.links.new(mul.outputs["Result"], b2.inputs["Base Color"])
    nt2.links.new(t2.outputs["Color"], b2.inputs["Emission Color"])
    b2.inputs["Emission Strength"].default_value = FACE_EMIT
    b2.inputs["Roughness"].default_value = 0.9
    fo.data.materials.clear(); fo.data.materials.append(m2)
    rep = {"body": m.name, "face": m2.name}
    # lumi glasses
    g = bpy.data.objects.get("lumi_glasses")
    if g:
        old = g.data.materials[0]
        col = (0.25, 0.22, 0.3, 1)
        if old and old.node_tree:
            for n in old.node_tree.nodes:
                for s in ("Color", "Base Color"):
                    if s in n.inputs and not n.inputs[s].is_linked: col = tuple(n.inputs[s].default_value)
        m3, nt3, b3 = _principled("lumi_glasses_mat")
        b3.inputs["Base Color"].default_value = col; b3.inputs["Roughness"].default_value = 0.45
        g.data.materials.clear(); g.data.materials.append(m3)
        lo = bpy.data.objects["lumi_lenses"]
        for nme in ("lens_clear", "lens_glint"):
            im = bpy.data.images.get(nme) or bpy.data.images.load(p["shared_tex"] + f"{nme}.png")
            im.alpha_mode = 'CHANNEL_PACKED'
        m4, nt4, b4 = _principled("lumi_lens_mat")
        t4 = nt4.nodes.new("ShaderNodeTexImage"); t4.image = bpy.data.images["lens_clear"]; t4.extension = 'CLIP'; t4.name = "Lens Map"
        nt4.links.new(t4.outputs["Color"], b4.inputs["Base Color"]); nt4.links.new(t4.outputs["Alpha"], b4.inputs["Alpha"])
        nt4.links.new(t4.outputs["Color"], b4.inputs["Emission Color"]); b4.inputs["Emission Strength"].default_value = FACE_EMIT
        b4.inputs["Roughness"].default_value = 0.2
        m4.surface_render_method = 'BLENDED'
        lo.data.materials.clear(); lo.data.materials.append(m4)
        rep["glasses"] = {"frame_color": [round(c, 3) for c in col[:3]], "lens": m4.name}
    for mm in list(bpy.data.materials):
        if mm.users == 0: bpy.data.materials.remove(mm)
    return rep


# ----------------------------------------------------------------------------- pose math (world = armature space)
def reset_pose(a=None):
    a = a or arm()
    for pb in a.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def rest_rel(a):
    out = {}
    for b in a.data.bones:
        out[b.name] = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()
    return out


def world_from_basis(a, basis, rr=None, order=None):
    rr = rr or rest_rel(a); order = order or bone_order(a); W = {}
    for n in order:
        b = a.data.bones[n]; loc, q = basis[n]
        M = Matrix.Translation(loc) @ q.to_matrix().to_4x4()
        W[n] = (W[b.parent.name] if b.parent else Matrix.Identity(4)) @ rr[n] @ M
    return W


def basis_from_world(a, W, rr=None, order=None):
    rr = rr or rest_rel(a); order = order or bone_order(a); B = {}
    for n in order:
        b = a.data.bones[n]
        P = (W[b.parent.name] if b.parent else Matrix.Identity(4)) @ rr[n]
        M = P.inverted() @ W[n]
        loc, q, _ = M.decompose(); B[n] = (loc, q.normalized())
    return B


def apply_basis(a, B):
    for n, (loc, q) in B.items():
        pb = a.pose.bones[n]; pb.rotation_mode = 'QUATERNION'
        pb.location = loc; pb.rotation_quaternion = q; pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def rotate_chain(a, W, bone, axis, deg, pivot=None):
    piv = pivot if pivot is not None else W[bone].translation.copy()
    R = Matrix.Translation(piv) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized()) @ Matrix.Translation(-piv)
    for d in descendants(a, bone): W[d] = R @ W[d]


def translate_all(W, v):
    T = Matrix.Translation(Vector(v))
    for k in W: W[k] = T @ W[k]


# ----------------------------------------------------------------------------- clip sources -> list of world-pose frames
class Clip:
    def __init__(self, name, frames, loop, source):
        self.name, self.frames, self.loop, self.source = name, frames, loop, source  # frames: list of {bone: Matrix}


def _import(fn, **kw):
    before = set(bpy.data.objects); bacts = set(bpy.data.actions); bimgs = set(bpy.data.images)
    bmeshes = set(bpy.data.meshes); bmats = set(bpy.data.materials); barms = set(bpy.data.armatures)
    fn(**kw)
    new = [o for o in bpy.data.objects if o not in before]

    def cleanup():
        for o in new: bpy.data.objects.remove(o)
        for coll, b in ((bpy.data.meshes, bmeshes), (bpy.data.materials, bmats), (bpy.data.images, bimgs), (bpy.data.armatures, barms)):
            for x in [x for x in coll if x not in b]: coll.remove(x)
    return new, [x for x in bpy.data.actions if x not in bacts], cleanup


def tripo_clips(glb):
    """Sample every action of a Tripo retarget GLB (same skeleton + rest pose as our rig) as world poses."""
    sc = bpy.context.scene; sc.render.fps = FPS; tgt = arm()
    new, acts, cleanup = _import(bpy.ops.import_scene.gltf, filepath=glb)
    src = [o for o in new if o.type == 'ARMATURE'][0]
    out = {}
    for act in acts:
        src.animation_data.action = act
        if act.slots: src.animation_data.action_slot = act.slots[0]
        f0, f1 = act.frame_range; frames = []
        for f in range(int(round(f0)), int(round(f1)) + 1):
            sc.frame_set(f)
            frames.append({pb.name: (src.matrix_world @ pb.matrix).copy() for pb in src.pose.bones if pb.name in tgt.data.bones})
        out[act.name.split(".")[0]] = frames          # ".001" when the file already holds a same-named action
    for act in acts: bpy.data.actions.remove(act)
    cleanup()
    return out


MIXAMO_MAP = {"Hip": "Hips", "Waist": "Spine", "Spine01": "Spine1", "Spine02": "Spine2", "NeckTwist01": "Neck", "Head": "Head"}
for _s, _m in (("L", "Left"), ("R", "Right")):
    MIXAMO_MAP.update({f"{_s}_Clavicle": f"{_m}Shoulder", f"{_s}_Upperarm": f"{_m}Arm", f"{_s}_Forearm": f"{_m}ForeArm",
                       f"{_s}_Hand": f"{_m}Hand", f"{_s}_Thigh": f"{_m}UpLeg", f"{_s}_Calf": f"{_m}Leg",
                       f"{_s}_Foot": f"{_m}Foot", f"{_s}_ToeBase": f"{_m}ToeBase"})
    for _f, _mf in (("Thumb", "Thumb"), ("Index", "Index"), ("Mid", "Middle"), ("Ring", "Ring"), ("Pinky", "Pinky")):
        for _i in (1, 2, 3): MIXAMO_MAP[f"{_s}_{_f}{_i}"] = f"{_m}Hand{_mf}{_i}"
ALIGN = ("Clavicle", "Upperarm", "Forearm", "Hand", "Thumb", "Index", "Mid", "Ring", "Pinky", "Thigh", "Calf")


def mixamo_clip(fbx):
    """Retarget a Mixamo FBX (T-pose rest, facing -Y, cm) onto the Tripo rig (A-pose rest, facing +X).
    The target gets a T-pose reference (limb directions aligned to the source rest); each mapped bone then
    receives the source bone's world rotation change from rest on top of that reference."""
    sc = bpy.context.scene; sc.render.fps = FPS; arm()
    new, acts, cleanup = _import(bpy.ops.import_scene.fbx, filepath=fbx, automatic_bone_orientation=False)
    src = [o for o in new if o.type == 'ARMATURE'][0]
    pre = src.data.bones[0].name.split(":")[0] + ":" if ":" in src.data.bones[0].name else ""
    C = Matrix.Rotation(math.radians(90), 4, 'Z') @ src.matrix_world
    tgt = arm(); rr = rest_rel(tgt); order = bone_order(tgt)
    mp = {t: pre + s for t, s in MIXAMO_MAP.items() if pre + s in src.data.bones and t in tgt.data.bones}
    # source rest (world)
    S_rest = {s: C @ src.data.bones[s].matrix_local for s in mp.values()}
    # target reference pose: rest, with limb directions turned onto the source rest directions
    W = {n: tgt.data.bones[n].matrix_local.copy() for n in order}
    for n in order:
        if n not in mp or not any(k in n for k in ALIGN): continue
        sb = src.data.bones[mp[n]]
        sd = ((C @ sb.tail_local.to_4d()).to_3d() - (C @ sb.head_local.to_4d()).to_3d()).normalized()
        td = (W[n].to_3x3() @ Vector((0, 1, 0))).normalized()
        q = td.rotation_difference(sd)
        ang = math.degrees(q.angle)
        if ang > 0.5: rotate_chain(tgt, W, n, q.axis, ang)
    ref = {n: W[n].to_quaternion() for n in mp}
    hips = mp["Hip"]
    s_h = S_rest[hips].translation.z; t_h = tgt.data.bones["Hip"].head_local.z
    k = t_h / s_h
    act = acts[0] if acts else src.animation_data.action
    f0, f1 = [int(round(x)) for x in act.frame_range]
    frames = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        Wf = {}
        for n in order:
            b = tgt.data.bones[n]
            Wd = (Wf[b.parent.name] if b.parent else Matrix.Identity(4)) @ rr[n]
            if n in mp:
                Sw = C @ src.pose.bones[mp[n]].matrix
                d = Sw.to_quaternion() @ S_rest[mp[n]].to_quaternion().inverted()
                pos = Wd.translation
                if n == "Hip":
                    pos = tgt.data.bones["Hip"].head_local + (Sw.translation - S_rest[hips].translation) * k
                Wf[n] = Matrix.Translation(pos) @ (d @ ref[n]).to_matrix().to_4x4()
            elif b.parent:                  # unmapped (twist/pelvis/eyes): keep its reference relation to the parent
                Wf[n] = Wf[b.parent.name] @ (W[b.parent.name].inverted() @ W[n])
            else:
                Wf[n] = W[n].copy()
        frames.append(Wf)
    for a_ in acts: bpy.data.actions.remove(a_)
    cleanup()
    return frames


# ----------------------------------------------------------------------------- clip processing
def frames_basis(frames):
    a = arm(); rr = rest_rel(a); order = bone_order(a)
    return [basis_from_world(a, W, rr, order) for W in frames]


def frames_world(bases):
    a = arm(); rr = rest_rel(a); order = bone_order(a)
    return [world_from_basis(a, B, rr, order) for B in bases]


def in_place(frames, keep_z=True):
    """Remove the horizontal travel of the hips (linear drift + average) so the clip stays on the spot."""
    hp = np.array([W["Hip"].translation[:] for W in frames])
    t = np.arange(len(frames))
    fit = [np.polyfit(t, hp[:, i], 1) for i in (0, 1)]
    rest = arm().data.bones["Hip"].head_local
    for i, W in enumerate(frames):
        dx = np.polyval(fit[0], i) - rest.x; dy = np.polyval(fit[1], i) - rest.y
        translate_all(W, (-dx, -dy, 0))
    return frames


def trim(frames, a, b):
    return frames[a:b]


def loop_seam(frames, blend=8):
    """Make last frame == first: blend the tail into the head pose (basis space, slerp)."""
    B = frames_basis(frames); n = len(B); blend = min(blend, n // 3)
    first = B[0]
    for i in range(blend):
        t = (i + 1) / blend; t = t * t * (3 - 2 * t)
        j = n - blend + i
        B[j] = {k: (B[j][k][0].lerp(first[k][0], t), B[j][k][1].slerp(first[k][1], t)) for k in B[j]}
    B[-1] = dict(first)
    return frames_world(B)


def ground(frames, smooth=2.0):
    """Shift each frame vertically so the lowest sole point (heel or toe, measured against the rest pose)
    touches z=0. For grounded clips whose hips were edited (damped lean, crouch)."""
    a = arm(); bb = a.data.bones
    refs = {}
    for sd in "LR":
        refs[sd + "_Foot"] = bb[sd + "_Foot"].head_local.z          # ankle height over the sole
        refs[sd + "_ToeBase"] = bb[sd + "_ToeBase"].head_local.z    # ball of the foot
    dz = np.array([min(W[n].translation.z - h for n, h in refs.items()) for W in frames])
    if smooth:
        k = np.exp(-0.5 * (np.arange(-6, 7) / smooth) ** 2); k /= k.sum()
        dz = np.convolve(np.pad(dz, 6, mode='edge'), k, mode='same')[6:-6]
    for W, d in zip(frames, dz): translate_all(W, (0, 0, -float(d)))
    return frames


def _lerpB(b0, b1, t):
    return {k: (b0[k][0].lerp(b1[k][0], t), b0[k][1].slerp(b1[k][1] if b0[k][1].dot(b1[k][1]) >= 0 else -b1[k][1], t)) for k in b0}


def pose_dist(B0, B1, skip=("Hip",)):
    return sum(B0[k][1].rotation_difference(B1[k][1]).angle for k in B0 if k not in skip)


def best_loop(frames, min_len=40):
    """Frame index j >= min_len whose pose is closest to frame 0 (for trimming a long loop)."""
    B = frames_basis(frames); d = [pose_dist(B[0], B[j]) for j in range(len(B))]
    j = min(range(min_len, len(B)), key=lambda i: d[i])
    return j, round(d[j], 3), round(d[-1], 3)


def blend_between(W0, W1, n, ease=True):
    """n in-between frames from world pose W0 to W1 (excluding both ends)."""
    B0, B1 = frames_basis([W0, W1]); out = []
    for i in range(1, n + 1):
        t = i / (n + 1); t = t * t * (3 - 2 * t) if ease else t
        out.append(_lerpB(B0, B1, t))
    return frames_world(out)


def pingpong(frames):
    return frames + [ {k: v.copy() for k, v in W.items()} for W in frames[-2:0:-1] ] + [{k: v.copy() for k, v in frames[0].items()}]


def flatten_vertical(frames):
    """Remove the hips' vertical travel relative to rest (airborne clips: code drives the height)."""
    rz = arm().data.bones["Hip"].head_local.z
    for W in frames: translate_all(W, (0, 0, rz - W["Hip"].translation.z))
    return frames


def damp(frames, bones, factor):
    """Scale the rotation of `bones` (local, basis space) toward rest by `factor` (0 = rest, 1 = unchanged)."""
    B = frames_basis(frames); I = Quaternion()
    for Bf in B:
        for n in bones:
            l, q = Bf[n]; Bf[n] = (l, I.slerp(q if q.w >= 0 else -q, factor))
    return frames_world(B)


def offset(frames, bone, axis, deg):
    """Add a constant world-axis rotation to a bone chain on every frame (pose touch-ups)."""
    a = arm()
    for W in frames: rotate_chain(a, W, bone, axis, deg)
    return frames


def resample(frames, speed):
    if abs(speed - 1) < 1e-3: return frames
    B = frames_basis(frames); n = len(B); m = max(2, int(round((n - 1) / speed)) + 1); out = []
    for i in range(m):
        x = i * (n - 1) / (m - 1); j = int(x); t = x - j
        if j >= n - 1: out.append(B[-1]); continue
        out.append({k: (B[j][k][0].lerp(B[j + 1][k][0], t), B[j][k][1].slerp(B[j + 1][k][1], t)) for k in B[j]})
    return frames_world(out)


# ----------------------------------------------------------------------------- anti-clip (hands/arms vs head + hair)
ARMK = ("Upperarm", "Forearm", "Hand", "Pinky", "Ring", "Mid", "Index", "Thumb", "Elbow")
HEADK = ("Head", "FacialBone", "L_Eye", "R_Eye")


class Collider:
    def __init__(self):
        self.parts = []                     # (object, {class: [tris]})
        for ob in skinned():
            me = ob.data; gn = {g.index: g.name for g in ob.vertex_groups}
            dom = [gn[max(v.groups, key=lambda x: x.weight).group] if v.groups else "" for v in me.vertices]

            def cls(n):
                if n in HEADK: return "head"
                for k in ARMK:
                    if k in n: return "arm_" + n[0]
                return "body"
            vc = [cls(n) for n in dom]; tris = {"head": [], "arm_L": [], "arm_R": []}
            me.calc_loop_triangles()
            for lt in me.loop_triangles:
                cs = {vc[v] for v in lt.vertices}
                if cs == {"head"}: tris["head"].append(tuple(lt.vertices))
                elif len(cs) == 1 and next(iter(cs)) in tris: tris[next(iter(cs))].append(tuple(lt.vertices))
            self.parts.append((ob, tris))
        for ob in bpy.data.objects:          # glasses are rigid on the head bone
            if ob.type == 'MESH' and ob.parent == arm() and ob.parent_type == 'BONE':
                ob.data.calc_loop_triangles()
                self.parts.append((ob, {"head": [tuple(t.vertices) for t in ob.data.loop_triangles], "arm_L": [], "arm_R": []}))

    def check(self):
        dg = bpy.context.evaluated_depsgraph_get()
        acc = {"head": ([], []), "arm_L": ([], []), "arm_R": ([], [])}
        for ob, tris in self.parts:
            ev = ob.evaluated_get(dg); em = ev.to_mesh(); mw = ev.matrix_world
            co = [mw @ v.co for v in em.vertices]; ev.to_mesh_clear()
            for k, ts in tris.items():
                if not ts: continue
                vs, fs = acc[k]; base = len(vs)
                idx = sorted({v for t in ts for v in t}); mp = {v: i + base for i, v in enumerate(idx)}
                vs.extend(co[v] for v in idx); fs.extend(tuple(mp[v] for v in t) for t in ts)
        H = BVHTree.FromPolygons(*acc["head"])
        out = {}
        for sd in "LR":
            vs, fs = acc["arm_" + sd]
            A = BVHTree.FromPolygons(vs, fs)
            gap = min((H.find_nearest(v)[3] for v in vs[::3]), default=1)
            out[sd] = {"hits": len(H.overlap(A)), "gap": gap}
        return out


def anti_clip(frames, min_gap=0.003, step=3.0, max_deg=50, report_only=False):
    """Per frame: if an arm touches the head/hair, swing that arm chain (from the upper arm) away from the
    head until it clears; corrections are dilated + smoothed over time so the motion stays fluid."""
    a = arm(); col = Collider(); rr = rest_rel(a); order = bone_order(a)
    n = len(frames); corr = {"L": np.zeros(n), "R": np.zeros(n)}
    before = 0

    def away_axis(W, sd, root="_Upperarm"):
        """Rotation axis that mostly LOWERS the arm segment (toward the hips, in the body frame) with a little
        push away from the head centre: chibi arms must stay under the big head, not splay sideways."""
        s = W[sd + root].translation; h = W[sd + "_Hand"].translation
        hc = W["Head"].translation + W["Head"].to_3x3() @ Vector((0, 0.12, 0))
        down = (W["Hip"].translation - W["Spine02"].translation).normalized()
        armv = (h - s).normalized()
        aw = (h - hc).normalized() * 0.35 + down
        aw = aw - armv * aw.dot(armv)
        if aw.length < 1e-4: aw = Vector((0, 1 if sd == "L" else -1, 0))
        return armv.cross(aw).normalized()

    def touching(r, sd): return r[sd]["hits"] or r[sd]["gap"] < min_gap

    if report_only:
        for W in frames:
            apply_basis(a, basis_from_world(a, W, rr, order)); r = col.check()
            before += sum(bool(touching(r, sd)) for sd in "LR")
        reset_pose(a)
        return frames, {"frames_touching": int(before)}

    kern = np.exp(-0.5 * (np.arange(-6, 7) / 2.5) ** 2); kern /= kern.sum()

    def smooth(c):
        dil = np.array([c[max(0, i - 4):i + 5].max() for i in range(n)])
        return np.maximum(np.convolve(np.pad(dil, 6, mode='edge'), kern, mode='same')[6:-6], c)

    def stage(src, root, limit, idx):
        """Search per touching frame for the swing of `root` (and below) that clears the head, smooth over
        time, apply. Returns new frames + the frames that still touch."""
        corr = {"L": np.zeros(n), "R": np.zeros(n)}; cnt = 0
        for i in idx:
            W = src[i]; apply_basis(a, basis_from_world(a, W, rr, order)); r = col.check()
            for sd in "LR":
                if not touching(r, sd): continue
                cnt += 1; Wt = {k: v.copy() for k, v in W.items()}; ang = 0
                while ang < limit:
                    ang += step; rotate_chain(a, Wt, sd + root, away_axis(Wt, sd, root), step)
                    apply_basis(a, basis_from_world(a, Wt, rr, order))
                    if not touching(col.check(), sd): break
                corr[sd][i] = ang + step                      # one extra step of margin
        for sd in "LR": corr[sd] = smooth(corr[sd])
        out = []
        for i, W in enumerate(src):
            Wt = {k_: v.copy() for k_, v in W.items()}
            for sd in "LR":
                if corr[sd][i] > 0.05: rotate_chain(a, Wt, sd + root, away_axis(Wt, sd, root), float(corr[sd][i]))
            out.append(Wt)
        left = []
        for i, W in enumerate(out):
            apply_basis(a, basis_from_world(a, W, rr, order)); r = col.check()
            if r["L"]["hits"] or r["R"]["hits"]: left.append(i)
        return out, left, cnt, max(corr["L"].max(), corr["R"].max())

    out, left, before, mx1 = stage(frames, "_Upperarm", max_deg, range(n))
    mx2 = 0
    if left:                                       # upper arm ran out of range: fold the forearm away too
        out, left, _, mx2 = stage(out, "_Forearm", 90, left)
    reset_pose(a)
    return out, {"frames_touching_before": int(before), "max_correction_deg": round(float(mx1), 1),
                 "forearm_correction_deg": round(float(mx2), 1), "frames_still_touching": left}


# ----------------------------------------------------------------------------- coat clearance (hands vs lab coat / body)
HANDK = ("Hand", "Pinky", "Ring", "Mid", "Index", "Thumb")


class HandCollider:
    """Hand vertices (per side) and body triangles (everything that is not head or arm: coat, torso, legs)."""
    def __init__(self):
        self.parts = []                     # (object, {"L": [verts], "R": [verts]}, [body tris])
        for ob in skinned():
            me = ob.data; gn = {g.index: g.name for g in ob.vertex_groups}
            dom = [gn[max(v.groups, key=lambda x: x.weight).group] if v.groups else "" for v in me.vertices]

            def cls(n):
                if n in HEADK: return "head"
                if any(k in n for k in HANDK): return "hand_" + n[0]
                if any(k in n for k in ARMK): return "arm"
                return "body"
            vc = [cls(n) for n in dom]
            hands = {sd: [i for i, c in enumerate(vc) if c == "hand_" + sd] for sd in "LR"}
            me.calc_loop_triangles()
            tris = [tuple(lt.vertices) for lt in me.loop_triangles if all(vc[v] == "body" for v in lt.vertices)]
            self.parts.append((ob, hands, tris))

    def covered(self, W=None, reach=0.4):
        """How hidden each hand is: fraction of its vertices whose view ray toward the camera is blocked by the
        body/coat, averaged over a front view and a 3/4 view from the hand's own side (0 = fully visible)."""
        dg = bpy.context.evaluated_depsgraph_get()
        vs, fs, hv = [], [], {"L": [], "R": []}
        for ob, hands, tris in self.parts:
            ev = ob.evaluated_get(dg); em = ev.to_mesh(); mw = ev.matrix_world
            co = [mw @ v.co for v in em.vertices]; ev.to_mesh_clear()
            base = len(vs); vs.extend(co); fs.extend(tuple(v + base for v in t) for t in tris)
            for sd in "LR": hv[sd].extend(co[i] for i in hands[sd])
        if not fs: return {"L": 0.0, "R": 0.0}
        T = BVHTree.FromPolygons(vs, fs)
        a = arm(); pb = a.pose.bones; mw = a.matrix_world
        left = ((mw @ pb["L_Upperarm"].head) - (mw @ pb["R_Upperarm"].head)).normalized()
        up = ((mw @ pb["Spine02"].head) - (mw @ pb["Hip"].head)).normalized()
        fwd = left.cross(up).normalized()
        out = {}
        for sd in "LR":
            side = left if sd == "L" else -left
            dirs = (fwd, (fwd + side).normalized())
            pts = hv[sd]; bad = 0
            for p in pts:
                for d in dirs:
                    if T.ray_cast(p + d * 0.002, d, reach)[0] is not None: bad += 1
            out[sd] = bad / max(1, len(pts) * len(dirs))
        return out


def coat_clearance(frames, thresh=0.04, step=2.5, max_deg=40, extra=4.0):
    """Per frame: if a hand is buried in the lab coat (arms hanging down), swing that arm outward (abduct the
    upper arm sideways, away from the body) until the hand clears the coat, plus `extra` degrees of margin.
    Corrections are dilated + smoothed over time like anti_clip so the arm motion stays fluid."""
    a = arm(); col = HandCollider(); rr = rest_rel(a); order = bone_order(a); n = len(frames)
    corr = {"L": np.zeros(n), "R": np.zeros(n)}; before = 0

    def out_axis(W, sd):
        left = (W["L_Upperarm"].translation - W["R_Upperarm"].translation).normalized()
        up = (W["Spine02"].translation - W["Hip"].translation).normalized()
        fwd = left.cross(up).normalized()
        return fwd if sd == "L" else -fwd          # +angle about this axis lifts that hand away from the body

    for i, W in enumerate(frames):
        apply_basis(a, basis_from_world(a, W, rr, order)); r = col.covered()
        for sd in "LR":
            if r[sd] <= thresh: continue
            before += 1; Wt = {k: v.copy() for k, v in W.items()}; ang = 0
            while ang < max_deg:
                ang += step; rotate_chain(a, Wt, sd + "_Upperarm", out_axis(Wt, sd), step)
                apply_basis(a, basis_from_world(a, Wt, rr, order))
                if col.covered()[sd] <= thresh: break
            corr[sd][i] = min(max_deg, ang + extra)
    kern = np.exp(-0.5 * (np.arange(-6, 7) / 2.5) ** 2); kern /= kern.sum()
    for sd in "LR":
        c = corr[sd]; dil = np.array([c[max(0, i - 4):i + 5].max() for i in range(n)])
        corr[sd] = np.maximum(np.convolve(np.pad(dil, 6, mode='edge'), kern, mode='same')[6:-6], c)
    out = []
    for i, W in enumerate(frames):
        Wt = {k: v.copy() for k, v in W.items()}
        for sd in "LR":
            if corr[sd][i] > 0.05: rotate_chain(a, Wt, sd + "_Upperarm", out_axis(Wt, sd), float(corr[sd][i]))
        out.append(Wt)
    reset_pose(a)
    return out, {"frames_covered_before": int(before),
                 "max_deg": round(float(max(corr["L"].max(), corr["R"].max())), 1)}


# ----------------------------------------------------------------------------- clip recipes
def foot_tap_layer(frames, side="R", taps_per_loop=4, deg=22):
    """Hand-keyed toe tap: heel stays planted, toe lifts and slaps down (fast down, slower up)."""
    a = arm(); n = len(frames); out = []
    for i, W in enumerate(frames):
        W = {k: v.copy() for k, v in W.items()}
        ph = (i / (n - 1)) * taps_per_loop % 1.0
        lift = math.sin(ph / 0.6 * math.pi) if ph < 0.6 else 0.0          # up 60% of the beat, then rest
        lift = max(0.0, lift) ** 0.8
        ank = W[side + "_Foot"].translation
        heel = Vector((ank.x - 0.035, ank.y, max(0.0, ank.z - 0.06)))
        rotate_chain(a, W, side + "_Foot", (0, 1, 0), -deg * lift, pivot=heel)
        out.append(W)
    return out


def tripo_recipes(tc):
    cp = lambda L: [{a_: b.copy() for a_, b in W.items()} for W in L]
    j = in_place(cp(tc["jump"]))
    return {
        "idle": (in_place(cp(tc["idle"])), True),
        "walk": (in_place(cp(tc["walk"])), True),
        "run": (loop_seam(in_place(cp(tc["run"])[11:31]), 4), True),
        "jump_crouch": (ground([j[0]] + blend_between(j[0], j[13], 7) + j[13:18]), False),
        "jump_air": (pingpong(flatten_vertical(cp(j[18:25]))), True),
        "jump_land": (ground(j[26:30] + blend_between(j[29], j[0], 9) + [j[0]]), False),
    }


def mixamo_recipes(only=None):
    M = lambda lab: in_place(mixamo_clip(paths("x")["mixamo"] + lab + ".fbx"))
    R = {}

    def want(k): return only is None or k in only
    if want("push"):
        R["push"] = (loop_seam(ground(damp(M("push_a"), ["Hip"], 0.45)), 10), True)
    NECK = ["NeckTwist01", "NeckTwist02", "Head"]                          # chibi: keep the face readable
    if want("sad"):
        f = damp(damp(M("sad_a"), NECK + ["Spine02"], 0.2), ["Hip", "Waist", "Spine01"], 0.4)
        R["sad"] = (loop_seam(ground(f), 10), True)
    if want("dizzy"):
        R["dizzy"] = (loop_seam(ground(M("dizzy_a")), 10), True)
    if want("float_sleep"):
        f = flatten_vertical(M("float_a"))
        f = offset(f, "Head", (0, 1, 0), 12)                               # chin drops toward chest: dozing
        R["float_sleep"] = (loop_seam(f, 12), True)
    if want("foot_tap"):
        b = M("bored_a")[:90]
        R["foot_tap"] = (foot_tap_layer(loop_seam(ground(b), 14)), True)
    if want("throw"):
        R["throw"] = (ground(damp(M("throw_a"), NECK, 0.3)), False)
    if want("point"):
        R["point"] = (ground(damp(M("point_b"), NECK, 0.4)), False)
    if want("cheer"):
        R["cheer"] = (ground(damp(damp(M("cheer_b"), NECK, 0.35), ["Hip", "Waist", "Spine01", "Spine02"], 0.5)), False)
    if want("panic_fall"):
        R["panic_fall"] = (loop_seam(flatten_vertical(damp(M("panic_b"), NECK, 0.4)), 10), False)   # seamless, code may loop it
    if want("sit"):
        R["sit"] = (damp(M("sit_a"), NECK, 0.4), False)
    return R


def land_squash_from_jump(tc):
    """Heavy landing built from the Tripo hop: touchdown -> deep crouch held -> recover to standing.
    (Mixamo's hard landing kneels so low the chibi body disappears under the head.)"""
    cp = lambda L: [{a_: b.copy() for a_, b in W.items()} for W in L]
    j = in_place(cp(tc["jump"]))
    # extra squash: exaggerate the crouch's bend relative to standing by 45% (ground() re-plants the feet)
    B = frames_basis([j[0], j[13]]); Bd = {}
    for k in B[1]:
        q0, q1 = B[0][k][1], B[1][k][1]
        d = q0.inverted() @ q1; ax, ang = d.to_axis_angle()
        if ang > math.pi: ang -= 2 * math.pi
        Bd[k] = (B[1][k][0], q0 @ Quaternion(ax, ang * 1.45))
    deep = frames_world([Bd])[0]
    seq = j[26:30] + blend_between(j[29], deep, 4) + [deep] * 6 + blend_between(deep, j[0], 14) + [j[0]] * 3
    return ground(seq)


# ----------------------------------------------------------------------------- hand-keyed clips (no mocap source)
# Built on top of the Tripo idle/walk so the body keeps breathing; arms are placed with a two-bone IK whose
# targets are measured from the character's own landmarks (shoulders, chest, head), so the same recipe fits all
# four mascots. Conventions: +X forward, +Y = character's left, +Z up.
FINGERS = ("Index", "Mid", "Ring", "Pinky")
PROC_CLIPS = ["hold_drop", "carry", "compare", "spin_overhead", "pull_rope", "push_hands", "slide", "hold_sign",
              "sleep_stand"]


def _cp(L): return [{k: v.copy() for k, v in W.items()} for W in L]


def _smooth(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)


def _key(t, keys):
    """Piecewise smoothstep through [(t, value), ...] (values: float or Vector)."""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            u = _smooth((t - t0) / max(1e-9, t1 - t0))
            return v0 + (v1 - v0) * u
    return keys[-1][1]


def rotate_chain_q(a, W, bone, q, pivot):
    R = Matrix.Translation(pivot) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pivot)
    for d in descendants(a, bone): W[d] = R @ W[d]


def arm_ik(a, W, sd, target, pole):
    """Two-bone IK in world space: place the wrist (Hand head) on `target`, elbow bent toward `pole`."""
    S = W[sd + "_Upperarm"].translation.copy(); E0 = W[sd + "_Forearm"].translation.copy()
    H0 = W[sd + "_Hand"].translation.copy()
    L1, L2 = (E0 - S).length, (H0 - E0).length
    d = target - S; dist = max(abs(L1 - L2) + 1e-4, min(d.length, (L1 + L2) * 0.995)); dn = d.normalized()
    T = S + dn * dist
    ca = max(-1.0, min(1.0, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))); a1 = math.acos(ca)
    pv = pole - S; pv = pv - dn * pv.dot(dn)
    if pv.length < 1e-6: pv = Vector((0, 0, -1)) - dn * dn.z
    pv.normalize()
    E = S + dn * (math.cos(a1) * L1) + pv * (math.sin(a1) * L1)
    rotate_chain_q(a, W, sd + "_Upperarm", (E0 - S).rotation_difference(E - S), S)
    E1 = W[sd + "_Forearm"].translation.copy(); H1 = W[sd + "_Hand"].translation.copy()
    rotate_chain_q(a, W, sd + "_Forearm", (H1 - E1).rotation_difference(T - E1), E1)


def _palm_local(a):
    """Palm normal of each hand in the hand bone's local frame (rest: palms face the body)."""
    out = {}
    for sd in "LR":
        hb = a.data.bones[sd + "_Hand"]; M = hb.matrix_local
        fdir = (a.data.bones[sd + "_Mid1"].head_local - hb.head_local).normalized()
        across = (a.data.bones[sd + "_Index1"].head_local - a.data.bones[sd + "_Pinky1"].head_local).normalized()
        n = fdir.cross(across).normalized()
        if n.dot(Vector((0, -hb.head_local.y, 0)).normalized()) < 0: n = -n
        out[sd] = M.to_3x3().inverted() @ n
    return out


def curl(a, W, sd, deg, thumb=0.5, palm=None):
    """Close the fingers of one hand by `deg` per joint (0 = open, ~70 = fist); thumb closes `thumb` as much."""
    if abs(deg) < 1e-3: return
    palm = palm or _palm_local(a)
    n = (W[sd + "_Hand"].to_3x3() @ palm[sd]).normalized()
    for f in FINGERS + ("Thumb",):
        k = thumb if f == "Thumb" else 1.0
        for j in (1, 2, 3):
            b = f"{sd}_{f}{j}"
            if b not in W: continue
            nxt = f"{sd}_{f}{j + 1}"
            tip = W[nxt].translation if nxt in W else W[b] @ Vector((0, a.data.bones[b].length, 0))
            v = (tip - W[b].translation)
            ax = v.cross(n)
            if ax.length < 1e-6: continue
            rotate_chain(a, W, b, ax.normalized(), deg * k)


def wrist(a, W, sd, axis, deg):
    rotate_chain(a, W, sd + "_Hand", axis, deg)


def _land(W, a):
    """Per-frame landmarks: shoulders, chest, head (pivot + approx. sphere centre), body axes."""
    left = (W["L_Upperarm"].translation - W["R_Upperarm"].translation).normalized()
    up = (W["Spine02"].translation - W["Hip"].translation).normalized()
    fwd = left.cross(up).normalized()
    hp = W["Head"].translation.copy()
    hc = hp + W["Head"].to_3x3() @ Vector((0, 0.12, 0))
    return {"S": {"L": W["L_Upperarm"].translation.copy(), "R": W["R_Upperarm"].translation.copy()},
            "C": W["Spine02"].translation.copy(), "H": hp, "HC": hc, "fwd": fwd, "left": left, "up": up}


def _sg(sd): return 1 if sd == "L" else -1


def _P(L, sd, base, f=0.0, s=0.0, u=0.0):
    """Point = base + f*forward + s*outward(for side sd) + u*up, in the body frame."""
    return base + L["fwd"] * f + L["left"] * (s * _sg(sd)) + L["up"] * u


def _arm_len(a, sd):
    b = a.data.bones
    return (b[sd + "_Forearm"].head_local - b[sd + "_Upperarm"].head_local).length + \
           (b[sd + "_Hand"].head_local - b[sd + "_Forearm"].head_local).length


def _loop_from(base, n):
    """The first n frames of a clip at normal speed, made seamless (frame n would equal frame 0)."""
    f = loop_seam(_cp(base[:n + 1]), blend=min(14, n // 3))
    return f[:n]


def procedural_recipes(tc, only=None):
    a = arm(); palm = _palm_local(a); AL = _arm_len(a, "R")
    idle = in_place(_cp(tc["idle"])); walk = in_place(_cp(tc["walk"]))
    R = {}

    def want(k): return only is None or k in only

    def body(W, lean=0.0, roll=0.0, yaw=0.0):
        """Lean (deg, + = forward) / roll (+ = toward the left) / yaw from the waist up."""
        p = W["Waist"].translation.copy()
        if lean: rotate_chain(a, W, "Waist", (0, 1, 0), lean, pivot=p)
        if roll: rotate_chain(a, W, "Waist", (1, 0, 0), -roll, pivot=p)
        if yaw: rotate_chain(a, W, "Waist", (0, 0, 1), yaw, pivot=p)

    def head(W, nod=0.0, turn=0.0, tilt=0.0):
        """nod + = chin down, turn + = look to her left, tilt + = ear toward the left shoulder."""
        p = W["NeckTwist01"].translation.copy()
        if turn: rotate_chain(a, W, "NeckTwist01", (0, 0, 1), turn, pivot=p)
        if nod: rotate_chain(a, W, "NeckTwist01", (0, 1, 0), nod, pivot=p)
        if tilt: rotate_chain(a, W, "NeckTwist01", (1, 0, 0), -tilt, pivot=p)

    def legs(W, spread=0.0, fwd_l=0.0, bend=0.0):
        """spread: thighs apart (deg); fwd_l: left thigh forward / right back (deg); bend: knee bend (deg)."""
        for sd in "LR":
            th = W[sd + "_Thigh"].translation.copy()
            if spread: rotate_chain(a, W, sd + "_Thigh", (1, 0, 0), -spread * _sg(sd), pivot=th)
            if fwd_l: rotate_chain(a, W, sd + "_Thigh", (0, 1, 0), -fwd_l * _sg(sd), pivot=th)
            if bend:
                rotate_chain(a, W, sd + "_Thigh", (0, 1, 0), -bend * 0.5, pivot=th)
                kn = W[sd + "_Calf"].translation.copy()
                rotate_chain(a, W, sd + "_Calf", (0, 1, 0), bend, pivot=kn)
                an = W[sd + "_Foot"].translation.copy()
                rotate_chain(a, W, sd + "_Foot", (0, 1, 0), -bend * 0.5, pivot=an)

    # --- hold_drop: right arm reaches forward holding a small object, the hand opens ~60% through (one-shot)
    if want("hold_drop"):
        n = 46; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            t = i / (n - 1); L = _land(W, a)
            reach = _key(t, [(0, 0.0), (0.22, 1.0)])
            rest = W["R_Hand"].translation.copy()
            tgt = _P(L, "R", L["S"]["R"], f=AL * 0.93, s=0.02, u=-0.025)
            arm_ik(a, W, "R", rest.lerp(tgt, reach), _P(L, "R", L["S"]["R"], f=0.02, s=0.12, u=-0.15))
            head(W, nod=6 * reach, turn=-8 * reach)
            opn = _key(t, [(0.58, 0.0), (0.66, 1.0)])
            curl(a, W, "R", 55 * reach * (1 - opn) - 8 * opn, palm=palm)
            out.append(W)
        R["hold_drop"] = (ground(out), False)

    # --- carry: walking with an object held at chest height in both hands (loop on the walk cycle)
    if want("carry"):
        out = []
        for i, W in enumerate(_cp(walk)):
            L = _land(W, a)
            for sd in "LR":
                tgt = _P(L, sd, L["C"], f=AL * 0.72, s=0.07, u=-0.035)
                arm_ik(a, W, sd, tgt, _P(L, sd, L["S"][sd], f=-0.02, s=0.15, u=-0.12))
                curl(a, W, sd, 35, palm=palm)
            body(W, lean=-4)
            out.append(W)
        R["carry"] = (loop_seam(out, 4), True)

    # --- compare: hand on chin, look left, then right, small head tilt (loop)
    if want("compare"):
        n = 96; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            t = i / n; L = _land(W, a)
            turn = _key(t, [(0, 0.0), (0.12, 26.0), (0.38, 26.0), (0.55, -26.0), (0.82, -26.0), (1.0, 0.0)])
            tilt = _key(t, [(0, 0.0), (0.12, 7.0), (0.38, 7.0), (0.55, -7.0), (0.82, -7.0), (1.0, 0.0)])
            chin = L["H"] + L["fwd"] * 0.115 + L["up"] * -0.005
            arm_ik(a, W, "R", chin + L["left"] * -0.01 + L["up"] * -0.04, _P(L, "R", L["S"]["R"], f=0.05, s=0.03, u=-0.2))
            wrist(a, W, "R", L["left"], -55)
            curl(a, W, "R", 45, palm=palm)
            # left forearm across the belly, supporting the right elbow
            arm_ik(a, W, "L", _P(L, "R", L["C"], f=AL * 0.62, s=0.02, u=-0.09), _P(L, "L", L["S"]["L"], f=0.0, s=0.15, u=-0.12))
            curl(a, W, "L", 25, palm=palm)
            head(W, turn=turn, tilt=tilt, nod=3)
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["compare"] = (out, True)

    # --- spin_overhead: right arm swings a bucket in a vertical circle beside the body (loop, 1 turn / s)
    if want("spin_overhead"):
        n = 30; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            th = 2 * math.pi * i / n; L = _land(W, a)
            c = _P(L, "R", L["S"]["R"], f=0.01, s=0.11, u=-0.01)
            r = AL * 0.82
            tgt = c + L["fwd"] * (r * math.sin(th)) + L["up"] * (r * math.cos(th))
            arm_ik(a, W, "R", tgt, _P(L, "R", L["S"]["R"], s=0.3, u=-0.05))
            curl(a, W, "R", 65, palm=palm)
            body(W, roll=3.5 * math.cos(th), lean=2 * math.sin(th))
            arm_ik(a, W, "L", _P(L, "L", L["S"]["L"], f=0.02, s=0.11, u=-0.13), _P(L, "L", L["S"]["L"], s=0.2, u=-0.1))
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["spin_overhead"] = (ground(out), True)

    # --- pull_rope: hand-over-hand on a vertical rope in front of the chest (loop: two pulls)
    if want("pull_rope"):
        n = 40; out = []
        hi, lo = 0.06, -0.12           # rope grip heights relative to the shoulders (chin .. belly)
        for i, W in enumerate(_loop_from(idle, n)):
            t = i / n; L = _land(W, a)
            body(W, lean=-7 + 3 * math.sin(4 * math.pi * t))
            L = _land(W, a)
            rope = (L["S"]["L"] + L["S"]["R"]) * 0.5 + L["fwd"] * (AL * 0.9)
            for sd, ph in (("R", 0.0), ("L", 0.5)):
                u = (t + ph) % 1.0
                if u < 0.5:                       # gripping: pull down the rope
                    z = hi + (lo - hi) * _smooth(u / 0.5); off = 0.0; g = 70
                else:                             # released: reach up again, a little off the rope
                    v = (u - 0.5) / 0.5; z = lo + (hi - lo) * _smooth(v); off = 0.035 * math.sin(math.pi * v); g = 20 + 50 * (v > 0.85)
                tgt = rope + L["up"] * z + L["left"] * (0.012 * _sg(sd)) + L["fwd"] * (-off * 0.3) + L["left"] * (off * _sg(sd))
                arm_ik(a, W, sd, tgt, _P(L, sd, L["S"][sd], f=-0.03, s=0.2, u=-0.1))
                curl(a, W, sd, g, palm=palm)
            legs(W, bend=10, spread=3)
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["pull_rope"] = (ground(out), True)

    # --- push_hands: two-hand shove forward, then recoil (lean back, elbows bend) and settle to neutral (one-shot)
    if want("push_hands"):
        n = 40; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            t = i / (n - 1)
            lean = _key(t, [(0, 0.0), (0.15, -5.0), (0.3, 12.0), (0.45, 12.0), (0.6, -8.0), (0.78, -3.0), (1.0, 0.0)])
            ext = _key(t, [(0, 0.15), (0.15, 0.1), (0.3, 1.0), (0.45, 1.0), (0.6, 0.35), (1.0, 0.35)])
            up = _key(t, [(0, 0.0), (0.13, 1.0), (0.72, 1.0), (1.0, 0.0)])
            body(W, lean=lean); legs(W, fwd_l=9 * min(1.0, up * 2), bend=5 * up)
            L = _land(W, a)
            for sd in "LR":
                rest = W[sd + "_Hand"].translation.copy()
                tgt = _P(L, sd, L["S"][sd], f=0.06 + (AL * 0.97 - 0.06) * ext, s=0.02, u=-0.015)
                arm_ik(a, W, sd, rest.lerp(tgt, up), _P(L, sd, L["S"][sd], f=-0.05, s=0.2, u=-0.12))
                wrist(a, W, sd, L["left"], -65 * up * min(1.0, ext * 1.6))      # palms forward while pushing
                curl(a, W, sd, -6 * up, palm=palm)
            out.append(W)
        R["push_hands"] = (ground(out), False)

    # --- slide: balanced glide on ice, arms out, gentle sway (loop)
    if want("slide"):
        n = 60; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            th = 2 * math.pi * i / n; L = _land(W, a)
            legs(W, fwd_l=14, bend=16, spread=8)
            body(W, lean=8, roll=4 * math.sin(th))
            L = _land(W, a)
            for sd in "LR":
                tgt = _P(L, sd, L["S"][sd], f=0.03, s=AL * 0.9, u=-0.02 + 0.03 * math.sin(th) * _sg(sd))
                arm_ik(a, W, sd, tgt, _P(L, sd, L["S"][sd], f=-0.05, s=0.1, u=-0.15))
                curl(a, W, sd, 12, palm=palm)
            head(W, tilt=-3 * math.sin(th))
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["slide"] = (ground(out), True)

    # --- hold_sign: both hands raised beside the head (chibi arms cannot reach above it) gripping the stick(s) of a
    #     sign the episode draws above the head; small bounce
    if want("hold_sign"):
        n = 30; out = []
        for i, W in enumerate(_loop_from(idle, n)):
            th = 2 * math.pi * i / n; L = _land(W, a)
            b = 0.5 - 0.5 * math.cos(th)
            legs(W, bend=7 * b)
            L = _land(W, a)
            for sd in "LR":
                tgt = _P(L, sd, L["S"][sd], f=0.035, s=0.12, u=0.125 + 0.015 * b)
                arm_ik(a, W, sd, tgt, _P(L, sd, L["S"][sd], f=-0.02, s=0.3, u=-0.1))
                curl(a, W, sd, 60, palm=palm)
            head(W, nod=-3 * b)
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["hold_sign"] = (ground(out), True)

    # --- sleep_stand: standing asleep, head slowly sinks then jerks up (loop)
    if want("sleep_stand"):
        n = 90; base = damp(_loop_from(idle, n), ["L_Upperarm", "R_Upperarm", "L_Forearm", "R_Forearm"], 0.6)
        out = []
        for i, W in enumerate(base):
            t = i / n
            nod = _key(t, [(0, 6.0), (0.72, 24.0), (0.8, 2.0), (0.9, 7.0), (1.0, 6.0)])
            sway = 3 * math.sin(2 * math.pi * t)
            body(W, lean=4 + nod * 0.12, roll=sway)
            head(W, nod=nod, tilt=-sway * 1.5)
            out.append(W)
        out.append(_cp([out[0]])[0])
        R["sleep_stand"] = (ground(out), True)
    return R


def build(name, log=print):
    """Full pipeline for one character -> <name>_actor.blend + .glb. Returns a report dict."""
    import glob as _g, time as _t
    t0 = _t.time(); rep = {"name": name}
    rep["open"] = open_source(name)
    rep["fix"] = fix_mesh(name)
    rep["split"] = split_face(name)
    rep["bake"] = list(bake_expressions(name))
    rep["uv"] = finalize_face_uv(name)
    rep["materials"] = build_materials(name)
    glb = _g.glob(ROOT + f"_shared/build/{name}/tripo_anim/tripo-out/{name}-anim5-*/model.glb")[0]
    tc = tripo_clips(glb)
    clips = tripo_recipes(tc)
    clips["land_squash"] = (land_squash_from_jump(tc), False)
    clips.update(mixamo_recipes())
    clips.update(procedural_recipes(tc))
    rep["clips"] = {}
    for k, (fr, loop) in clips.items():
        fr, cc = coat_clearance(fr)                    # hands out of the lab coat first, then keep them off the head
        fr, ac = anti_clip(fr, max_deg=85)
        info = write_action(k, fr, loop); info["anticlip"] = ac; info["coat"] = cc; rep["clips"][k] = info
        log(f"{name}: {k} {info['frames']}f touching={ac.get('frames_touching_before')} left={ac.get('frames_still_touching')}")
    rep["export"] = export_glb(name)
    bpy.ops.wm.save_mainfile()
    rep["seconds"] = round(_t.time() - t0)
    with open(paths(name)["build"] + "actor_report.json", "w") as f:
        json.dump(rep, f, indent=1, default=str)
    return rep


# ----------------------------------------------------------------------------- write actions
def write_action(name, frames, loop):
    a = arm(); rr = rest_rel(a); order = bone_order(a)
    B = [basis_from_world(a, W, rr, order) for W in frames]
    for n in order:                                             # quaternion continuity
        for i in range(1, len(B)):
            l, q = B[i][n]
            if q.dot(B[i - 1][n][1]) < 0: B[i][n] = (l, -q)
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name); act.use_fake_user = True
    if not a.animation_data: a.animation_data_create()
    slot = act.slots.new(id_type='OBJECT', name=a.name)
    a.animation_data.action = act; a.animation_data.action_slot = slot
    cb = anim_utils.action_ensure_channelbag_for_slot(act, slot)
    nf = len(B); fr = np.arange(1, nf + 1, dtype=np.float32)
    moving = {n for n in order if max((B[i][n][0] - B[0][n][0]).length for i in range(nf)) > 1e-5 or B[0][n][0].length > 1e-5}
    for n in order:
        chans = [("rotation_quaternion", 4, lambda i, j: B[i][n][1][j])]
        if n in moving: chans.append(("location", 3, lambda i, j: B[i][n][0][j]))
        for prop, cnt, get in chans:
            for j in range(cnt):
                fc = cb.fcurves.new(f'pose.bones["{n}"].{prop}', index=j, group_name=n)
                fc.keyframe_points.add(nf)
                vals = np.array([get(i, j) for i in range(nf)], np.float32)
                fc.keyframe_points.foreach_set("co", np.column_stack([fr, vals]).ravel())
                fc.keyframe_points.foreach_set("interpolation", [2] * nf)   # LINEAR
                fc.update()
    act.frame_range = (1, nf); act.use_frame_range = True
    act["loop"] = bool(loop)
    a.animation_data.action = None
    return {"name": name, "frames": nf, "seconds": round((nf - 1) / FPS, 3), "loop": loop}


# ----------------------------------------------------------------------------- previews
def preview_frames(frames, out_dir, tag, n=8, res=256, views=(("front", (4, 0, 0.55)), ("side", (0.6, 4, 0.55))), ortho=1.5):
    """Workbench renders of n evenly spaced frames from each view -> out_dir/<tag>_<view>_<i>.png"""
    sc = bpy.context.scene; a = arm(); rr = rest_rel(a); order = bone_order(a)
    eng = sc.render.engine; cam0 = sc.camera
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
    rx, ry = sc.render.resolution_x, sc.render.resolution_y; sc.render.resolution_x = sc.render.resolution_y = res
    cd = bpy.data.cameras.get("_prevcam") or bpy.data.cameras.new("_prevcam"); cd.type = 'ORTHO'; cd.ortho_scale = ortho
    cam = bpy.data.objects.get("_prevcam") or bpy.data.objects.new("_prevcam", cd)
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    sc.camera = cam
    hidden = [o for o in bpy.data.objects if o.name.startswith("_lookdev") or o.name in ("_key", "_fill", "_rim")]
    for o in hidden: o.hide_render = True
    os.makedirs(out_dir, exist_ok=True)
    idx = [round(i * (len(frames) - 1) / max(1, n - 1)) for i in range(n)]
    for k, i in enumerate(idx):
        apply_basis(a, basis_from_world(a, frames[i], rr, order))
        for vn, pos in views:
            cam.location = pos; cam.rotation_euler = (Vector((0, 0, 0.5)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = f"{out_dir}/{tag}_{vn}_{k}.png"; bpy.ops.render.render(write_still=True)
    for o in hidden: o.hide_render = False
    sc.render.engine = eng; sc.camera = cam0; sc.render.resolution_x, sc.render.resolution_y = rx, ry
    bpy.data.objects.remove(cam); reset_pose(a)
    return idx


def locomotion_speed(action):
    """Ground speed (m/s, in actor units where height ~1) that keeps the planted foot from sliding:
    median backward speed of whichever foot is on the ground."""
    a = arm(); act = bpy.data.actions[action]
    a.animation_data_create(); a.animation_data.action = act; a.animation_data.action_slot = act.slots[0]
    fr = []
    for f in range(1, int(act.frame_range[1]) + 1):
        bpy.context.scene.frame_set(f); fr.append({n: (a.matrix_world @ a.pose.bones[n].matrix).translation.copy() for n in ("L_Foot", "R_Foot")})
    a.animation_data.action = None
    v = []
    for n in ("L_Foot", "R_Foot"):
        z = np.array([W[n].z for W in fr]); x = np.array([W[n].x for W in fr]); st = z < z.min() + 0.01
        dx = np.diff(x) * FPS; v += list(-dx[st[:-1] & st[1:]])
    return round(float(np.median(v)), 3)


# ----------------------------------------------------------------------------- export
def export_glb(name):
    p = paths(name); a = arm()
    if a.animation_data: a.animation_data.action = None
    for act in list(bpy.data.actions):                     # only finished clips (they carry a 'loop' flag)
        if act.get("loop") is None: bpy.data.actions.remove(act)
    reset_pose(a)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    objs = [a] + attached()
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.export_scene.gltf(filepath=p["glb"], export_format='GLB', use_selection=True,
                              export_animation_mode='ACTIONS', export_anim_slide_to_zero=True,
                              export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_skins=True, export_all_influences=False,
                              export_morph=False, export_texcoords=True, export_normals=True,
                              export_def_bones=False, export_optimize_animation_size=True,
                              export_anim_single_armature=True, export_reset_pose_bones=True,
                              export_image_format='AUTO', export_cameras=False, export_lights=False,
                              export_extras=False, export_materials='EXPORT')
    return {"glb": p["glb"], "bytes": os.path.getsize(p["glb"])}
