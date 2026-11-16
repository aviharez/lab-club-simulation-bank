"""Shared Blender helpers for the chibi pipeline. exec() this file inside Blender, with a
dict named CFG already defined:  CFG = {"name": "anna", "root": "/abs/path/mascots/"}
"""
import bpy, bmesh, math, os, json
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

NAME = CFG["name"]
ROOT = CFG["root"]
TEST = ROOT + "_archive/" + NAME + "_test/"      # first import (archived)
V2 = ROOT + "_archive/" + NAME + "_v2/"          # source rig the final file is rebuilt from (archived)
DIR_TEX = ROOT + "_shared/textures/" + NAME + "/"
DIR_EXPR = ROOT + "_shared/expressions/" + NAME + "/"
DIR_BUILD = ROOT + "_shared/build/" + NAME + "/"
DIR_MODEL = ROOT + NAME + "/model/"
DIR_SPRITES = ROOT + NAME + "/sprites/"
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
EXPR = ["neutral", "happy", "smug", "shocked", "dizzy", "crying"]
POSES = {"standing": 1, "happy": 10, "panic": 20}
FACE_S = 0.36            # size of the square face-decal window in model units


def scene():
    return bpy.context.scene


def get_mesh():
    return [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("tripo_node")][0]


def get_arm():
    return [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]


def base_image():
    return [i for i in bpy.data.images if i.name.startswith("Color_")][0]


def face_window():
    """(y0, z0, size) of the front-projected decal window, centred on the eyes."""
    a = get_arm()
    ez = a.data.bones["L_Eye"].head_local.z if "L_Eye" in a.data.bones else a.data.bones["Head"].head_local.z + 0.1
    zc = CFG.get("face_zc", ez + 0.02)
    yc = CFG.get("face_yc", a.data.bones["Head"].head_local.y)
    return (yc - FACE_S / 2, zc - FACE_S / 2, FACE_S)


def aim(ob, direction, target, dist=5):
    d = Vector(direction).normalized()
    ob.location = Vector(target) + d * dist
    ob.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()


def make_cam(name, direction, scale, target, col):
    ob = bpy.data.objects.get(name)
    if not ob:
        cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.clip_end = 50
        ob = bpy.data.objects.new(name, cd); col.objects.link(ob)
    ob.data.ortho_scale = scale
    aim(ob, direction, target)
    return ob


def render(path, cam=None, res=None):
    s = scene()
    if cam: s.camera = bpy.data.objects[cam] if isinstance(cam, str) else cam
    if res: s.render.resolution_x = s.render.resolution_y = res
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def flat_material(name, backface_magenta=False):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = base_image()
    em = nt.nodes.new("ShaderNodeEmission"); o = nt.nodes.new("ShaderNodeOutputMaterial")
    if backface_magenta:
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.inputs["B"].default_value = (1, 0, 1, 1)
        nt.links.new(geo.outputs["Backfacing"], mix.inputs["Factor"]); nt.links.new(tex.outputs["Color"], mix.inputs["A"])
        nt.links.new(mix.outputs["Result"], em.inputs["Color"])
    else:
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], o.inputs["Surface"])
    return m


# ---- posing ---------------------------------------------------------------
def reset_pose():
    for pb in get_arm().pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def rot(name, axis, deg):
    """Rotate a pose bone about a world axis through its head."""
    pb = get_arm().pose.bones[name]; h = pb.matrix.translation.copy()
    pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis)) @ Matrix.Translation(-h) @ pb.matrix
    bpy.context.view_layer.update()


def key_pose(frame):
    for pb in get_arm().pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame); pb.keyframe_insert("location", frame=frame)


def _cls(n):
    if n in ("Head", "FacialBone", "L_Eye", "R_Eye", "NeckTwist01", "NeckTwist02"): return "head"
    for k in ("Upperarm", "Forearm", "Hand", "Pinky", "Ring", "Mid", "Index", "Thumb", "Elbow"):
        if k in n: return "arm"
    for k in ("Thigh", "Calf", "Foot", "Toe", "Knee"):
        if k in n: return "leg"
    return "body"


class Clip:
    """Intersection test between limbs and the head/hair on the posed mesh (per arm side)."""
    def __init__(self):
        self.mesh = get_mesh(); me = self.mesh.data
        gn = {g.index: g.name for g in self.mesh.vertex_groups}
        dom = [gn[max(v.groups, key=lambda x: x.weight).group] if v.groups else "" for v in me.vertices]
        self.vc = [_cls(n) for n in dom]
        self.tris = {"head": [], "arm_L": [], "arm_R": [], "leg": []}
        for p in me.polygons:
            cs = {self.vc[v] for v in p.vertices}
            if cs == {"head"}: self.tris["head"].append(tuple(p.vertices))
            elif "arm" in cs and "head" not in cs:
                side = next(dom[v][0] for v in p.vertices if self.vc[v] == "arm")
                self.tris["arm_" + side].append(tuple(p.vertices))
            elif cs == {"leg"}: self.tris["leg"].append(tuple(p.vertices))
        self.armverts = {sd: sorted({v for t in self.tris["arm_" + sd] for v in t if self.vc[v] == "arm"}) for sd in "LR"}

    def check(self):
        """-> {"L": {"hits", "gap"}, "R": {...}, "leg_hits": n}"""
        mods = [m for m in self.mesh.modifiers if m.type in ('WELD', 'SOLIDIFY', 'MASK')]
        for m in mods: m.show_viewport = False
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        ev = self.mesh.evaluated_get(dg); em = ev.to_mesh()
        co = [ev.matrix_world @ v.co for v in em.vertices]
        ev.to_mesh_clear()
        for m in mods: m.show_viewport = True

        def bvh(ts):
            idx = sorted({v for t in ts for v in t}); mp = {v: i for i, v in enumerate(idx)}
            return BVHTree.FromPolygons([co[v] for v in idx], [tuple(mp[v] for v in t) for t in ts])
        H = bvh(self.tris["head"])
        out = {"leg_hits": len(H.overlap(bvh(self.tris["leg"])))}
        for sd in "LR":
            out[sd] = {"hits": len(H.overlap(bvh(self.tris["arm_" + sd]))),
                       "gap": round(min(H.find_nearest(co[v])[3] for v in self.armverts[sd]), 4)}
        return out


def arm_level_angle():
    """Rotation (deg) that lifts the rest-pose upper arm to horizontal."""
    b = get_arm().data.bones
    d = b["L_Hand"].head_local - b["L_Upperarm"].head_local
    return math.degrees(math.atan2(-d.z, abs(d.y)))


def fix_head_weights(z_lo=None, z_hi=None):
    """Repair auto-rig skinning where the head/hood/hair is partly bound to clavicle and arm bones
    (the head then squashes when the arms move). Vertices in the head region become 100% Head,
    with a short blend band below it. The untouched mesh is kept as '<name>_original_weights'.
    Returns the number of vertices changed."""
    mesh = get_mesh(); me = mesh.data; b = get_arm().data.bones
    if any(m.name.endswith("_original_weights") for m in bpy.data.meshes): return 0
    bak = me.copy(); bak.name = NAME + "_original_weights"; bak.use_fake_user = True
    hz = b["Head"].head_local.z
    z_lo = hz - 0.045 if z_lo is None else z_lo
    z_hi = hz + 0.005 if z_hi is None else z_hi
    gn = {g.index: g.name for g in mesh.vertex_groups}
    HEADG = ("Head", "FacialBone", "L_Eye", "R_Eye")
    head = mesh.vertex_groups["Head"]

    def sstep(x, a, c):
        t = min(1.0, max(0.0, (x - a) / (c - a))); return t * t * (3 - 2 * t)
    n = 0
    for v in me.vertices:
        hw = sum(g.weight for g in v.groups if gn[g.group] in HEADG)
        if hw < 0.1 or hw > 0.999: continue
        t = max(sstep(v.co.z, z_lo, z_hi), sstep(hw, 0.3, 0.5))
        if t <= 0.001: continue
        old = [(g.group, g.weight) for g in v.groups]
        tot = sum(w for _, w in old) or 1.0
        for gi, w in old:
            if gn[gi] in HEADG: continue
            mesh.vertex_groups[gi].add([v.index], w / tot * (1 - t), 'REPLACE')
        hsum = sum(w for gi, w in old if gn[gi] in HEADG) / tot
        others_h = sum(w for gi, w in old if gn[gi] in HEADG and gn[gi] != "Head") / tot
        head.add([v.index], hsum * (1 - t) + t - others_h * (1 - t), 'REPLACE')
        for gi, w in old:
            if gn[gi] in HEADG and gn[gi] != "Head":
                mesh.vertex_groups[gi].add([v.index], w / tot * (1 - t), 'REPLACE')
        n += 1
    me.update()
    return n
