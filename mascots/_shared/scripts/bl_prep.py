"""Stage A: open _archive/<name>_v2/<name>_v2.blend, remove Lumi's generated glasses, move coat weights off the arm
bones, export mesh data for texture cleaning, save <name>/model/<name>.blend.
CFG = {"name":..., "root":...}
"""
exec(open(CFG["root"] + "_shared/scripts/bl_common.py").read())
from mathutils.geometry import intersect_point_line
os.makedirs(DIR_BUILD, exist_ok=True); os.makedirs(DIR_MODEL, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=V2 + NAME + "_v2.blend")
for junk in ("Cube", "Camera", "Light"):
    o = bpy.data.objects.get(junk)
    if o: bpy.data.objects.remove(o)
mesh = get_mesh(); me = mesh.data; arm = get_arm(); b = arm.data.bones
rep = {}

# ---- Lumi: measure, then delete the generated glasses geometry
if "glasses_rings" in mesh.vertex_groups:
    gi = {mesh.vertex_groups[n].index: n for n in ("glasses_rings", "glasses_bar")}
    ring = [v.co.copy() for v in me.vertices if any(g.group in gi and gi[g.group] == "glasses_rings" for g in v.groups)]
    info = {}
    for sd, sg in (("L", 1), ("R", -1)):
        pts = [p for p in ring if p.y * sg > 0]
        ys = [p.y for p in pts]; zs = [p.z for p in pts]; xs = [p.x for p in pts]
        cy, cz = (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2
        rr = [math.hypot(p.y - cy, p.z - cz) for p in pts]
        info[sd] = {"c": [round(cy, 4), round(cz, 4)], "r_out": round(max(rr), 4), "r_in": round(min(rr), 4),
                    "x": [round(min(xs), 4), round(max(xs), 4)]}
    rep["old_glasses"] = info
    json.dump(info, open(DIR_BUILD + "old_glasses.json", "w"))
    kill = {v.index for v in me.vertices if any(g.group in gi and g.weight > 0 for g in v.groups)}
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in kill], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
    for mn in ("Hide_Glasses_Bar",):
        if mn in mesh.modifiers: mesh.modifiers.remove(mesh.modifiers[mn])
    for n in ("glasses_rings", "glasses_bar"): mesh.vertex_groups.remove(mesh.vertex_groups[n])
    rep["glasses_verts_deleted"] = len(kill)

# ---- weld UV-seam duplicates so the surface is connected (needed to cut and cap below)
if "v3_fixed" not in me:
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me); bm.free(); me.update()

# ---- coat: only real sleeve follows the arm bones, only leg/shorts follow the leg bones;
#      everything else (coat body, coat back, hem) goes to hips + spine
gn = {g.index: g.name for g in mesh.vertex_groups}
ARMK = ("Upperarm", "Forearm", "Hand", "Pinky", "Ring", "Mid", "Index", "Thumb", "Elbow")
LEGK = ("Thigh", "Calf", "Knee")
CORE = ("Hip", "Pelvis", "Waist", "Spine01", "Spine02")


def sstep(x, a, c):
    t = min(1.0, max(0.0, (x - a) / (c - a))); return t * t * (3 - 2 * t)


def seg_dist(co, pts):
    d = 9; bt = 0
    for i in range(len(pts) - 1):
        p, t = intersect_point_line(co, pts[i], pts[i + 1]); t = min(1, max(0, t))
        dd = (co - pts[i].lerp(pts[i + 1], t)).length
        if dd < d: d = dd; bt = i + t
    return d, bt


if "v3_fixed" not in me:
    bak = me.copy(); bak.name = NAME + "_v2_weights"; bak.use_fake_user = True
    n_changed = 0
    sleeve = {}            # vertex -> 'S' sleeve / 'C' coat, only for the part of the arm beyond mid upper arm
    for sd in "LR":
        apts = [b[sd + "_Upperarm"].head_local, b[sd + "_Forearm"].head_local, b[sd + "_Hand"].head_local]
        apts.append(apts[2] + (apts[2] - apts[1]).normalized() * 0.09)
        lpts = [b[sd + "_Thigh"].head_local, b[sd + "_Calf"].head_local, b[sd + "_Foot"].head_local]
        zsh = apts[0].z; zknee = lpts[1].z
        isarm = lambda nm: nm.startswith(sd + "_") and any(k in nm for k in ARMK)
        isleg = lambda nm: nm.startswith(sd + "_") and any(k in nm for k in LEGK)
        for v in me.vertices:
            ws = [(g.group, g.weight) for g in v.groups]
            aw = sum(w for gi_, w in ws if isarm(gn[gi_]))
            cw = sum(w for gi_, w in ws if gn[gi_] == sd + "_Clavicle")
            lw = sum(w for gi_, w in ws if isleg(gn[gi_]))
            d, bt = seg_dist(v.co, apts)
            if aw < 1e-4 and cw < 1e-4 and lw < 1e-4: continue
            keep_a = keep_c = keep_l = 1.0; boost = False
            if aw > 1e-4:
                if bt <= 0.8: keep_a = 1 - sstep(d, 0.06, 0.085)
                elif aw >= 0.5 and d < 0.085: boost = True; sleeve[v.index] = 'S'
                else: keep_a = 0.0
            if cw > 1e-4: keep_c = sstep(v.co.z, zsh - 0.13, zsh - 0.07)
            if lw > 1e-4 and v.co.z > zknee - 0.02:
                keep_l = 1 - sstep(seg_dist(v.co, lpts)[0], 0.05, 0.07)
            if boost:                       # real sleeve: 100% arm chain
                if aw > 0.999: continue
                for gi_, w in ws:
                    mesh.vertex_groups[gi_].add([v.index], w / aw if isarm(gn[gi_]) else 0.0, 'REPLACE')
                n_changed += 1; continue
            freed = aw * (1 - keep_a) + cw * (1 - keep_c) + lw * (1 - keep_l)
            if freed < 1e-3: continue
            n_changed += 1
            core = [(gi_, w) for gi_, w in ws if gn[gi_] in CORE]
            cs = sum(w for _, w in core)
            for gi_, w in ws:
                nm = gn[gi_]
                if isarm(nm): mesh.vertex_groups[gi_].add([v.index], w * keep_a, 'REPLACE')
                elif nm == sd + "_Clavicle": mesh.vertex_groups[gi_].add([v.index], w * keep_c, 'REPLACE')
                elif isleg(nm): mesh.vertex_groups[gi_].add([v.index], w * keep_l, 'REPLACE')
            if cs > 0.02:
                for gi_, w in core: mesh.vertex_groups[gi_].add([v.index], w + freed * w / cs, 'REPLACE')
            else:
                tgt = min(("Hip", "Waist", "Spine01", "Spine02"), key=lambda k: abs((b[k].head_local.z + b[k].tail_local.z) / 2 - v.co.z))
                mesh.vertex_groups[tgt].add([v.index], freed, 'ADD')
    rep["verts_reweighted"] = n_changed
    me.update()

    # ---- cut the faces that fuse sleeve to coat, cap both openings with flat-coloured faces
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    uvl = bm.loops.layers.uv["UVMap"]; ful = bm.loops.layers.uv["FaceUV"]
    dl = bm.verts.layers.deform.verify()
    armg = {g.index for g in mesh.vertex_groups if any(k in g.name for k in ARMK)}
    for v in bm.verts:                      # coat side = anything that barely follows the arm now
        if sleeve.get(v.index) != 'S':
            sleeve[v.index] = 'C' if sum(w for gi_, w in v[dl].items() if gi_ in armg) < 0.3 else None
    web = [f for f in bm.faces if {sleeve.get(v.index) for v in f.verts} >= {'S', 'C'}]
    rim = {v for f in web for v in f.verts}
    rep["bridge_faces_cut"] = len(web)
    bmesh.ops.delete(bm, geom=web, context='FACES_ONLY')
    for e in [e for e in bm.edges if not e.link_faces]: bm.edges.remove(e)
    caps = 0
    for side in ('S', 'C'):
        edges = [e for e in bm.edges if e.is_boundary and all(v in rim and sleeve.get(v.index) == side for v in e.verts)]
        res = bmesh.ops.holes_fill(bm, edges=edges, sides=0)
        nf = res["faces"]
        if nf: nf = bmesh.ops.triangulate(bm, faces=nf)["faces"]
        for f in nf:
            src = None
            for l in f.loops:
                for l2 in l.vert.link_loops:
                    if l2.face not in nf: src = l2[uvl].uv.copy(); break
                if src: break
            f.smooth = True; f.material_index = 0
            for l in f.loops:
                l[uvl].uv = src or (0.5, 0.5); l[ful].uv = (-1, -1)
        caps += len(nf)
    # loose scraps left at the cut (tiny islands touching it) would float under the lifted arm
    seen = set(); scraps = []
    for f0 in bm.faces:
        if f0 in seen: continue
        comp = []; st = [f0]
        while st:
            f = st.pop()
            if f in seen: continue
            seen.add(f); comp.append(f)
            for e in f.edges: st.extend(x for x in e.link_faces if x not in seen)
        if len(comp) < 14 and any(v in rim for f in comp for v in f.verts): scraps += comp
    rep["scrap_faces_removed"] = len(scraps)
    if scraps: bmesh.ops.delete(bm, geom=scraps, context='FACES')
    rep["cap_faces"] = caps
    rep["open_edges_left_at_cut"] = sum(1 for e in bm.edges if e.is_boundary and all(v in rim for v in e.verts))
    bm.to_mesh(me); bm.free(); me.update()
    me["v3_fixed"] = 1

# ---- export for texture cleaning
T = len(me.polygons)
assert all(len(p.vertices) == 3 for p in me.polygons)
uvl = me.uv_layers["UVMap"].data
uv = np.array([[uvl[li].uv[:] for li in p.loop_indices] for p in me.polygons], np.float32)
pos = np.array([[me.vertices[v].co[:] for v in p.vertices] for p in me.polygons], np.float32)
HG = {g.index for g in mesh.vertex_groups if g.name in ("Head", "FacialBone", "L_Eye", "R_Eye")}
hw = np.array([sum(g.weight for g in v.groups if g.group in HG) for v in me.vertices], np.float32)
tv = np.array([p.vertices[:] for p in me.polygons])
np.savez(DIR_BUILD + "mesh.npz", uv=uv, pos=pos, head_min=hw[tv].min(1), head_max=hw[tv].max(1),
         head_z=b["Head"].head_local.z)
bpy.ops.wm.save_as_mainfile(filepath=DIR_MODEL + NAME + ".blend")
rep["tris"] = T; rep["file"] = bpy.data.filepath
result = rep
