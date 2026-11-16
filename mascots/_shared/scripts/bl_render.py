"""Final stage: materials, decals, (Lumi) rebuilt glasses, standard poses, renders, save.
CFG = {"name", "root"}; optional "render": False to only set up.
Standard poses (identical absolute angles for every character):
  idle  : rest A-pose
  happy : clavicle +10, arms straight 20 deg above horizontal, 15 deg forward, thighs 7 deg apart
  panic : arms straight horizontal, thighs 30 deg apart, feet flattened 12 deg
"""
exec(open(CFG["root"] + "_shared/scripts/bl_pose.py").read())
s = scene(); rep = {}
HAPPY = (10, 20, 15, 0); PANIC = (0, 0, 0, 0)
col = mesh.users_collection[0]

# ---- decals
for im in list(bpy.data.images):
    if im.name.startswith("face_"): bpy.data.images.remove(im)
for e in EXPR3:
    im = bpy.data.images.load(DIR_EXPR + f"face_{e}.png"); im.name = "face_" + e
    im.alpha_mode = 'CHANNEL_PACKED'; im.use_fake_user = True
toon = build_materials(); std_camera()
dec = toon.node_tree.nodes["Face Decal"]; dec.image = bpy.data.images["face_01_neutral"]
for d in ("FaceDebug", "Inspect", "FlatRef", "Momo_Toon", "Momo_Outline"):
    mm = bpy.data.materials.get(d)
    if mm and mm.users == 0: bpy.data.materials.remove(mm)


# ---- Lumi: new glasses as separate objects parented to the head bone
def tube(bm, pts, r, seg=8, closed=False):
    """sweep a circle of radius r along the polyline pts"""
    rings = []; n = len(pts)
    for i, p in enumerate(pts):
        a = pts[(i - 1) % n] if (closed or i > 0) else p
        c = pts[(i + 1) % n] if (closed or i < n - 1) else p
        t = (Vector(c) - Vector(a)).normalized()
        u = t.cross(Vector((1, 0, 0)));  u = u.normalized() if u.length > 1e-4 else Vector((0, 0, 1))
        w = t.cross(u).normalized()
        rings.append([bm.verts.new(Vector(p) + (u * math.cos(2 * math.pi * k / seg) + w * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(n if closed else n - 1):
        a, c = rings[i], rings[(i + 1) % n]
        for k in range(seg):
            f = bm.faces.new((a[k], a[(k + 1) % seg], c[(k + 1) % seg], c[k])); f.smooth = True
    if not closed:
        for rg, flip in ((rings[0], True), (rings[-1], False)):
            bm.faces.new(rg[::-1] if flip else rg)


def bone_parent(ob, bone="Head"):
    pb = arm.pose.bones[bone]
    ob.parent = arm; ob.parent_type = 'BONE'; ob.parent_bone = bone
    ob.matrix_parent_inverse = (arm.matrix_world @ pb.bone.matrix_local @ Matrix.Translation((0, pb.bone.length, 0))).inverted()


def build_glasses():
    for nme in ("Kiri_Glasses", "Kiri_Glasses_Lenses"):
        o = bpy.data.objects.get(nme)
        if o:
            d = o.data; bpy.data.objects.remove(o); bpy.data.meshes.remove(d)
    F = json.load(open(DIR_BUILD + "face.json")); y0, z0, S = face_window()
    ez = z0 + (1 - F["eye_y"] / 1024) * S
    eys = [y0 + F["eye_r"] / 1024 * S, y0 + F["eye_l"] / 1024 * S]        # character's left (+y), right (-y)
    old = json.load(open(DIR_BUILD + "old_glasses.json"))
    old_tube = old["L"]["r_out"] - old["L"]["r_in"]
    RR = CFG.get("glasses_r", 0.039); tr = old_tube * 0.4 / 2               # frame thickness = 40% of the old one
    # depth: just in front of whatever the head surface is across both lenses
    reset_pose()
    bv = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    xs = []
    for ey in eys:
        for rr in (0, 0.5, 1.0):
            for k in range(12):
                a = 2 * math.pi * k / 12
                h = bv.ray_cast(Vector((3, ey + RR * rr * math.cos(a), ez + RR * rr * math.sin(a))), Vector((-1, 0, 0)))
                if h[0] is not None: xs.append(h[0].x)
    gx = max(xs) + tr + 0.004
    bm = bmesh.new()
    for ey in eys:
        tube(bm, [(gx, ey + RR * math.cos(2 * math.pi * k / 48), ez + RR * math.sin(2 * math.pi * k / 48)) for k in range(48)], tr, closed=True)
    yi = min(abs(e) for e in eys); gap0, gap1 = eys[1] + RR, eys[0] - RR      # bridge over the nose
    tube(bm, [(gx, gap0 + (gap1 - gap0) * t, ez + 0.010 + 0.006 * math.sin(math.pi * t)) for t in [i / 8 for i in range(9)]], tr)
    for ey in eys:                                                           # temples run back into the hair
        sg = 1 if ey > 0 else -1; yo = ey + sg * RR
        tube(bm, [(gx - 0.14 * t, yo + sg * 0.035 * t, ez + 0.006 + 0.012 * t) for t in [i / 6 for i in range(7)]], tr)
    gm = bpy.data.meshes.new("Kiri_Glasses"); bm.to_mesh(gm); bm.free()
    go = bpy.data.objects.new("Kiri_Glasses", gm); col.objects.link(go)
    fm = bpy.data.materials.get("Glasses_Frame") or bpy.data.materials.new("Glasses_Frame"); fm.use_nodes = True
    nt = fm.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (0.082, 0.035, 0.016, 1)   # dark brown
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs["Emission"], o.inputs["Surface"])
    gm.materials.append(fm); gm.materials.append(bpy.data.materials["Outline"])
    sol = go.modifiers.new("Outline_Hull", 'SOLIDIFY')                       # thinner than the body outline (0.007)
    sol.thickness = 0.0022; sol.offset = 1.0; sol.use_flip_normals = True; sol.use_rim = False; sol.material_offset = 1
    # lenses
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    for ey in eys:
        c = bm.verts.new((gx, ey, ez)); ring = [bm.verts.new((gx, ey + RR * math.cos(2 * math.pi * k / 40), ez + RR * math.sin(2 * math.pi * k / 40))) for k in range(40)]
        for k in range(40):
            f = bm.faces.new((c, ring[k], ring[(k + 1) % 40]))
            for l in f.loops: l[uvl].uv = (0.5 - (l.vert.co.y - ey) / (2 * RR), 0.5 + (l.vert.co.z - ez) / (2 * RR))
    lm = bpy.data.meshes.new("Kiri_Glasses_Lenses"); bm.to_mesh(lm); bm.free()
    lo = bpy.data.objects.new("Kiri_Glasses_Lenses", lm); col.objects.link(lo)
    for nme in ("lens_clear", "lens_glint"):
        im = load_img(DIR_TEX + f"{nme}.png", nme); im.alpha_mode = 'CHANNEL_PACKED'
    m = bpy.data.materials.get("Glasses_Lens") or bpy.data.materials.new("Glasses_Lens"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.name = tx.label = "Lens Image"; tx.image = bpy.data.images["lens_clear"]; tx.extension = 'CLIP'
    em = nt.nodes.new("ShaderNodeEmission"); tr_ = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader"); o = nt.nodes.new("ShaderNodeOutputMaterial")
    L(tx.outputs["Color"], em.inputs["Color"]); L(tx.outputs["Alpha"], mx.inputs["Fac"])
    L(tr_.outputs["BSDF"], mx.inputs[1]); L(em.outputs["Emission"], mx.inputs[2]); L(mx.outputs["Shader"], o.inputs["Surface"])
    m.surface_render_method = 'BLENDED'; m.use_backface_culling = False
    lm.materials.append(m)
    for ob in (go, lo): bone_parent(ob)
    bpy.context.view_layer.update()
    return {"eye_y": [round(v, 4) for v in eys], "eye_z": round(ez, 4), "ring_radius": RR, "frame_thickness": round(tr * 2, 4),
            "old_frame_thickness": round(old_tube, 4), "x": round(gx, 4), "world_after_parent": [round(v, 4) for v in go.matrix_world.translation]}


if NAME == "lumi": rep["glasses"] = build_glasses()

# ---- poses
if arm.animation_data: arm.animation_data_clear()
for a in list(bpy.data.actions):
    if a.users == 0: bpy.data.actions.remove(a)


def set_pose(arms, thigh, foot=0):
    reset_pose()
    for sd, sg in SIDES:
        if arms: pose_arm3(sd, sg, *arms)
        if thigh: rot(sd + "_Thigh", X, sg * thigh)
        if foot: rot(sd + "_Foot", X, -sg * foot)


def chk():
    r = check3()
    return {sd: {k: r[sd][k] for k in ("hits", "gap", "over")} for sd in "LR"} | {"leg_hits": clip.check()["leg_hits"]}


# ---- last deformation check: faces that still stretch badly in the poses are slivers left at the
#      sleeve/coat cut; remove them (they sit under the arm) and report what is left
def _coords():
    mods = [m for m in mesh.modifiers if m.type in ('WELD', 'SOLIDIFY', 'MASK')]
    for m in mods: m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    ev = mesh.evaluated_get(dg); em = ev.to_mesh(); co = np.array([v.co[:] for v in em.vertices]); ev.to_mesh_clear()
    for m in mods: m.show_viewport = True
    return co


def stretch_report():
    tv = np.array([p.vertices[:] for p in me.polygons])
    el = lambda co: np.stack([np.linalg.norm(co[tv][:, i] - co[tv][:, (i + 1) % 3], axis=1) for i in range(3)], 1)
    nr = lambda co: np.cross(co[tv][:, 1] - co[tv][:, 0], co[tv][:, 2] - co[tv][:, 0])
    reset_pose(); c0 = _coords(); l0 = el(c0); n0 = nr(c0); r = np.zeros(len(tv)); inv = np.zeros(len(tv), bool)
    for arms, th, ft in ((HAPPY, 7, 0), (PANIC, 30, 12)):
        set_pose(arms, th, ft); c1 = _coords()
        r = np.maximum(r, (el(c1) / np.maximum(l0, 1e-6)).max(1))
        n1 = nr(c1); inv |= (n0 * n1).sum(1) < -0.2 * np.linalg.norm(n0, axis=1) * np.linalg.norm(n1, axis=1)
    reset_pose()
    return r, inv


r, inv = stretch_report()
bad = np.where((r > 2.2) | inv)[0].tolist()
if bad:
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in bad], context='FACES')
    bm.to_mesh(me); bm.free(); me.update()
    clip = Clip()
    gn = {g.index: g.name for g in mesh.vertex_groups}
    handv = {sd: [v.index for v in me.vertices if v.groups and
                  (lambda n: n.startswith(sd + "_") and any(k in n for k in ("Hand", "Pinky", "Ring", "Mid", "Index", "Thumb")))(gn[max(v.groups, key=lambda x: x.weight).group])]
             for sd in "LR"}
r, inv = stretch_report()
rep["deform"] = {"sliver_faces_removed": len(bad), "max_stretch_now": round(float(r.max()), 2),
                 "faces_stretched_over_2.2": int((r > 2.2).sum()), "inverted_faces": int(inv.sum())}

set_pose(None, 0); key_pose(1); rep["idle"] = chk()
set_pose(HAPPY, 7); key_pose(10); rep["happy"] = chk()
set_pose(PANIC, 30, 12); key_pose(20); rep["panic"] = chk()
if arm.animation_data and arm.animation_data.action: arm.animation_data.action.name = NAME.capitalize() + "_Poses"
for mk in list(s.timeline_markers): s.timeline_markers.remove(mk)
for nm, f in POSES3.items(): s.timeline_markers.new(nm, frame=f)
s.frame_start = 1; s.frame_end = 20

txt = bpy.data.texts.get("expressions.py") or bpy.data.texts.new("expressions.py")
for t in list(bpy.data.texts):
    if t is not txt: bpy.data.texts.remove(t)
txt.clear(); txt.write('''import bpy
EXPRESSIONS = %r
POSES = {"idle": 1, "happy": 10, "panic": 20}   # frame numbers

def set_expression(name):
    """Swap the face decal, e.g. set_expression("05_dizzy"). "08_glint" (Lumi) also turns the lenses white."""
    bpy.data.materials["Toon"].node_tree.nodes["Face Decal"].image = bpy.data.images["face_" + name]
    lens = bpy.data.materials.get("Glasses_Lens")
    if lens:
        lens.node_tree.nodes["Lens Image"].image = bpy.data.images["lens_glint" if name == "08_glint" else "lens_clear"]

def set_pose(name):
    bpy.context.scene.frame_set(POSES[name])
''' % (EXPR3,))
txt.use_fake_user = True

# ---- renders
n = 0
lens = bpy.data.materials.get("Glasses_Lens")
only = CFG.get("only")
if CFG.get("render", True):
    for p, f in POSES3.items():
        s.frame_set(f)
        for e in EXPR3:
            if only and (p, e) not in only: continue
            dec.image = bpy.data.images["face_" + e]
            if lens: lens.node_tree.nodes["Lens Image"].image = bpy.data.images["lens_glint" if e == "08_glint" else "lens_clear"]
            render((CFG.get("out") or DIR_SPRITES) + f"{NAME}_{p}_{e}.png", "Cam_Front", 1024); n += 1
dec.image = bpy.data.images["face_01_neutral"]; s.frame_set(1)
if lens: lens.node_tree.nodes["Lens Image"].image = bpy.data.images["lens_clear"]
for im in bpy.data.images:
    if (im.name.startswith(("face_", "lens_")) or im.name.startswith(NAME + "_")) and not im.packed_file and im.filepath: im.pack()
s.render.filepath = DIR_SPRITES
bpy.ops.wm.save_mainfile()
rep["rendered"] = n
result = rep
