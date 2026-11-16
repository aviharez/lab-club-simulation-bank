"""Pose helpers: evaluate a grid of raised-arm poses (absolute angles) for clipping against head/hair.
Writes _shared/build/<name>/posegrid.json : list of [clav, elev, fwd, bend, {L:{hits,gap,over,handz}, R:{...}}]
elev = upper-arm elevation above horizontal, fwd = swing toward the front, bend = extra forearm lift.
"""
exec(open(CFG["root"] + "_shared/scripts/bl_common.py").read())
exec(open(CFG["root"] + "_shared/scripts/bl_materials.py").read())
mesh = get_mesh(); me = mesh.data; arm = get_arm()
if arm.animation_data: arm.animation_data_clear()
clip = Clip(); LEVEL = arm_level_angle(); SIDES = (("L", 1), ("R", -1))
gn = {g.index: g.name for g in mesh.vertex_groups}
handv = {sd: [v.index for v in me.vertices if v.groups and
              (lambda n: n.startswith(sd + "_") and any(k in n for k in ("Hand", "Pinky", "Ring", "Mid", "Index", "Thumb")))(gn[max(v.groups, key=lambda x: x.weight).group])]
         for sd in "LR"}


def pose_arm3(sd, sg, clav, elev, fwd, bend):
    if clav: rot(sd + "_Clavicle", X, sg * clav)
    rot(sd + "_Upperarm", X, sg * (LEVEL + elev - clav)); rot(sd + "_Upperarm", Z, -sg * fwd)
    if bend:
        ax = Matrix.Rotation(math.radians(-sg * fwd), 3, 'Z') @ Vector(X)
        rot(sd + "_Forearm", ax, sg * bend)


def check3():
    """clip.check() plus the share of hand vertices that sit in front of / behind the head in front view."""
    mods = [m for m in mesh.modifiers if m.type in ('WELD', 'SOLIDIFY', 'MASK')]
    for m in mods: m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    ev = mesh.evaluated_get(dg); em = ev.to_mesh()
    co = [v.co.copy() for v in em.vertices]; ev.to_mesh_clear()
    for m in mods: m.show_viewport = True

    def bvh(ts):
        idx = sorted({v for t in ts for v in t}); mp = {v: i for i, v in enumerate(idx)}
        return BVHTree.FromPolygons([co[v] for v in idx], [tuple(mp[v] for v in t) for t in ts])
    H = bvh(clip.tris["head"]); out = {}
    for sd in "LR":
        over = sum(1 for v in handv[sd] if H.ray_cast(Vector((-3, co[v].y, co[v].z)), Vector((1, 0, 0)))[0] is not None)
        out[sd] = {"hits": len(H.overlap(bvh(clip.tris["arm_" + sd]))),
                   "gap": round(min(H.find_nearest(co[v])[3] for v in clip.armverts[sd]), 4),
                   "over": round(over / max(1, len(handv[sd])), 2),
                   "handz": round(sum(co[v].z for v in handv[sd]) / max(1, len(handv[sd])), 3),
                   "handy": round(sum(abs(co[v].y) for v in handv[sd]) / max(1, len(handv[sd])), 3)}
    return out


if "GRID" in CFG:
    rows = []
    for clav, elev, fwd, bend in CFG["GRID"]:
        reset_pose()
        for sd, sg in SIDES: pose_arm3(sd, sg, clav, elev, fwd, bend)
        rows.append([clav, elev, fwd, bend, check3()])
    reset_pose()
    json.dump(rows, open(DIR_BUILD + "posegrid.json", "w"))
    result = {"n": len(rows), "level": round(LEVEL, 1)}
