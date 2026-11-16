"""Home lab v2 ("Lab Club HQ", attic lab at golden hour): procedural build -> home-lab-v2.blend + home-lab-v2.glb.
Usage: blender -b --factory-startup --python assets/sets/home-lab-v2/build_home_lab_v2.py [-- --no-bake]

Everything is authored in THREE.js coordinates (metres, +Y up, +Z toward the camera) through P()/D() and converted
to Blender's Z-up, so numbers here match the React wrapper (src/sets/home-lab-v2). Mascots are ~1 m tall and stand
around x -1.5..1.5, z 0..1.5 (midground action area, kept clear).

Pipeline: mid-poly hard-surface (bevel + weighted normals), surfaces densified (~0.2 m) and AO baked into vertex
colours (Cycles), objects joined by material (few draw calls), named nodes kept separate for animation/practicals:
  orb, clock_hour, clock_min, fan, pendant_bulb_<i>_noshadow, window_glow_noshadow, neon_noshadow, screen_<i>_noshadow
Budget: ~300k tris max, textures <= 2048 px (here 512-1024, generated: original designs only)."""
import bpy, bmesh, math, os, random, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = "home-lab-v2"
BAKE = "--no-bake" not in sys.argv
R = random.Random(7)

# ----------------------------------------------------------------------------- coordinates (three -> blender)
def P(x, y, z): return Vector((x, -z, y))
def D(w, h, d): return Vector((w, d, h))          # size along three x, y, z

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.unit_settings.system = 'METRIC'
COL = bpy.data.collections.new(NAME); sc.collection.children.link(COL)
CUT = bpy.data.collections.new("Cutters"); sc.collection.children.link(CUT)

# ----------------------------------------------------------------------------- palette + materials
PAL = {
    "plaster": "#ece2d2", "plaster_dk": "#e0d3bf", "wainscot": "#93c4b2", "trim": "#f4ece0",
    "wood_a": "#b98a5e", "wood_b": "#a97b52", "wood_c": "#c69c6d", "beam": "#8a6446", "wood_bench": "#c99a68",
    "brass": "#c9a24a", "copper": "#b86e45", "teal": "#5f9c97", "teal_dk": "#3f6f6b", "coral": "#e8836b",
    "lavender": "#b9a7d6", "lavender_dk": "#9c88bf", "cream_fabric": "#efe3cf", "chalk": "#2f4a44",
    "tile": "#e9f1ec", "grout": "#cfd8d2", "rubber": "#3b3433", "steel": "#c8c6c2", "paper": "#f7f0e2",
    "leaf": "#6fae82", "leaf_dk": "#4f8f66", "pot": "#d98c6c", "book_1": "#e8836b", "book_2": "#7fa7c9",
    "book_3": "#e9c46a", "book_4": "#9c88bf", "book_5": "#93c4b2", "cable": "#4a4040", "black": "#2b2626",
}


def hex2lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


MATS = {}


def mat(key, color=None, rough=0.7, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0, image=None):
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color or PAL.get(key, "#ffffff")), 1)
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
    MATS[key] = m
    return m


# ----------------------------------------------------------------------------- mesh helpers
def _bm():
    bm = bmesh.new(); bm.loops.layers.uv.new("UVMap")   # create_* only writes UVs into an existing layer
    return bm


def _obj(name, bm, material, keep=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob)
    if material: me.materials.append(material)
    ob["keep"] = keep
    return ob


def densify(bm, size, step):
    """Bisect a centred box mesh every `step` metres along each axis (vertex AO needs vertices)."""
    if not step: return
    for ax in range(3):
        n = int(size[ax] / step)
        for k in range(1, n):
            co = Vector((0, 0, 0)); co[ax] = -size[ax] / 2 + size[ax] * k / n
            no = Vector((0, 0, 0)); no[ax] = 1
            geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)


def box(name, size3, at3, material, bevel=0.012, step=0.25, rot_y=0.0, keep=False, segments=2):
    """Box of THREE size (w,h,d) centred at THREE point; optional rotation about the vertical axis (deg)."""
    s = D(*size3)
    bm = _bm(); bmesh.ops.create_cube(bm, size=1.0, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
    densify(bm, s, step)
    ob = _obj(name, bm, material, keep)
    ob.location = P(*at3); ob.rotation_euler = (0, 0, math.radians(rot_y))
    if bevel: add_bevel(ob, bevel, segments)
    return ob


def add_bevel(ob, width, segments=2):
    m = ob.modifiers.new("Bevel", 'BEVEL'); m.width = width; m.segments = segments
    m.limit_method = 'ANGLE'; m.angle_limit = math.radians(30); m.use_clamp_overlap = True
    m.harden_normals = True; m.miter_outer = 'MITER_ARC'
    w = ob.modifiers.new("WN", 'WEIGHTED_NORMAL'); w.keep_sharp = True; w.weight = 50
    for p in ob.data.polygons: p.use_smooth = True


def cyl(name, r, h, at3, material, seg=24, r2=None, bevel=0.006, axis="y", keep=False, cap=True):
    bm = _bm()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, calc_uvs=True)
    ob = _obj(name, bm, material, keep); ob.location = P(*at3)
    if axis == "x": ob.rotation_euler = (0, math.radians(90), 0)
    elif axis == "z": ob.rotation_euler = (math.radians(90), 0, 0)   # along three z (toward camera)
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
    bpy.ops.mesh.primitive_torus_add(major_radius=R_, minor_radius=r, major_segments=seg, minor_segments=minor)
    ob = bpy.context.active_object; ob.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    COL.objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    ob.location = P(*at3)
    if facing == "z": ob.rotation_euler = (math.radians(90), 0, 0)    # ring faces the camera (wall clock, rings)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def plane(name, w, h, at3, material, facing="z", keep=False):
    """Vertical plane facing +Z (three) by default; facing='x' / '-x' for side walls; 'y' = floor decal."""
    bm = _bm(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * h, 0))
    ob = _obj(name, bm, material, keep); ob.location = P(*at3)
    if facing == "z": ob.rotation_euler = (math.radians(90), 0, 0)
    elif facing == "x": ob.rotation_euler = (math.radians(90), 0, math.radians(90))
    elif facing == "-x": ob.rotation_euler = (math.radians(90), 0, math.radians(-90))
    return ob


def tube(name, pts3, radius, material, keep=False, res=8):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 3
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts3) - 1)
    for bp, p in zip(sp.bezier_points, pts3):
        bp.co = P(*p); bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.resolution_u = res; cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); COL.objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    return ob


def poly_tube(name, pts3, radius, material, keep=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 2
    sp = cu.splines.new('POLY'); sp.points.add(len(pts3) - 1)
    for p_, q in zip(sp.points, pts3): p_.co = (*P(*q), 1)
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); COL.objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    return ob


def text(name, body, size, at3, material, extrude=0.02, keep=False):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.bevel_depth = 0.004
    ob = bpy.data.objects.new(name, cu); COL.objects.link(ob); ob.data.materials.append(material); ob["keep"] = keep
    ob.location = P(*at3); ob.rotation_euler = (math.radians(90), 0, 0)
    return ob


# ----------------------------------------------------------------------------- generated textures (original art)
def image(name, w, h, rgba_fn):
    yy, xx = np.mgrid[0:h, 0:w]; u = xx / (w - 1); v = yy / (h - 1)       # v: 0 bottom .. 1 top
    rgba = rgba_fn(u, v)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel()); img.pack()
    return img


def _c(hx): return np.array(hex2lin(hx) + [1.0])


def fill(u, hx): out = np.zeros(u.shape + (4,)); out[...] = _c(hx); return out


def paint(out, mask, hx, a=1.0):
    out[mask] = out[mask] * (1 - a) + _c(hx) * a


def poster_atom(u, v):
    o = fill(u, "#f7efe0"); x, y = (u - 0.5) * 1.0, (v - 0.56) * 1.4
    for k, ang in enumerate((0, 60, 120)):
        a = math.radians(ang); xr = x * math.cos(a) + y * math.sin(a); yr = -x * math.sin(a) + y * math.cos(a)
        e = (xr / 0.36) ** 2 + (yr / 0.13) ** 2
        paint(o, np.abs(e - 1) < 0.09, ["#e8836b", "#5f9c97", "#9c88bf"][k])
    paint(o, x ** 2 + y ** 2 < 0.07 ** 2, "#e9c46a")
    paint(o, (v < 0.16) & (v > 0.08) & (np.abs(u - 0.5) < 0.32), "#3a2c24", 0.85)
    paint(o, (v > 0.93) | (v < 0.03) | (u < 0.04) | (u > 0.96), "#e8836b")
    return o


def poster_planets(u, v):
    o = fill(u, "#3c4a6b")
    rr = random.Random(3)
    for _ in range(60):
        cx, cy = rr.random(), rr.random(); paint(o, (u - cx) ** 2 + ((v - cy) * 1.4) ** 2 < 0.004 ** 2 * 4, "#fff6e0")
    for cx, cy, r, hx in ((0.32, 0.62, 0.17, "#e9c46a"), (0.7, 0.36, 0.11, "#93c4b2"), (0.66, 0.78, 0.06, "#e8836b")):
        paint(o, (u - cx) ** 2 + ((v - cy) * 1.4) ** 2 < r * r, hx)
    ring = ((u - 0.32) / 0.3) ** 2 + (((v - 0.62) * 1.4) / 0.07) ** 2
    paint(o, (np.abs(ring - 1) < 0.12) & ~((u - 0.32) ** 2 + ((v - 0.62) * 1.4) ** 2 < 0.17 ** 2) | (np.abs(ring - 1) < 0.12) & (v < 0.62), "#f4ece0")
    paint(o, (v < 0.12) & (v > 0.06) & (np.abs(u - 0.5) < 0.3), "#f4ece0", 0.9)
    return o


def poster_wave(u, v):
    o = fill(u, "#f4ece0")
    for k, hx in enumerate(("#5f9c97", "#e8836b", "#9c88bf")):
        y = 0.55 + 0.18 * np.sin(u * math.pi * (2 + k) + k) * np.exp(-u * 0.6)
        paint(o, np.abs(v - y) < 0.012, hx)
    paint(o, np.abs(v - 0.55) < 0.004, "#3a2c24", 0.6)
    paint(o, np.abs(u - 0.08) < 0.004, "#3a2c24", 0.6)
    paint(o, (v > 0.85) & (v < 0.9) & (u > 0.12) & (u < 0.7), "#3a2c24", 0.85)
    return o


def chalkboard(u, v):
    o = fill(u, PAL["chalk"]); W = "#e9efe9"
    x, y = u * 1.8, v * 1.1
    paint(o, np.abs(y - (0.25 + 0.75 * (1 - ((x - 0.55) / 0.42) ** 2))) < 0.012 & True if False else (np.abs(y - (0.25 + 0.7 * (1 - ((x - 0.55) / 0.42) ** 2))) < 0.011) & (y > 0.24), W, 0.8)
    paint(o, (np.abs(y - 0.24) < 0.006) & (x > 0.08) & (x < 1.05), W, 0.7)
    paint(o, (np.abs(x - 0.1) < 0.006) & (y > 0.2) & (y < 1.0), W, 0.7)
    for row in range(5):
        yy = 0.92 - row * 0.15
        for k in range(R.randint(3, 6)):
            x0 = 1.15 + k * 0.11 + R.random() * 0.03
            paint(o, (np.abs(y - yy) < 0.012) & (x > x0) & (x < x0 + 0.06 + R.random() * 0.03), W, 0.75)
    paint(o, (np.abs(((x - 1.45) / 0.16) ** 2 + ((y - 0.17) / 0.1) ** 2 - 1) < 0.08), "#e9c46a", 0.8)
    paint(o, np.abs(y - 0.03) < 0.02, "#e8eee8", 0.15)
    return o


def pegboard(u, v):
    o = fill(u, "#d9c4a3")
    gx, gy = (u * 40) % 1, (v * 24) % 1
    paint(o, (gx - 0.5) ** 2 + (gy - 0.5) ** 2 < 0.06, "#6b5640")
    return o


def screen(seed):
    def f(u, v):
        o = fill(u, "#0f2a2a"); rr = random.Random(seed)
        y = 0.5 + 0.28 * np.sin(u * math.pi * (3 + seed) + seed)
        paint(o, np.abs(v - y) < 0.025, "#7ff0c8")
        for k in range(6):
            paint(o, (np.abs(v - (0.92 - k * 0.05)) < 0.012) & (u > 0.06) & (u < 0.2 + rr.random() * 0.4), "#7ff0c8", 0.6)
        paint(o, (u < 0.02) | (u > 0.98) | (v < 0.03) | (v > 0.97), "#2f6b5e")
        return o
    return f


# ----------------------------------------------------------------------------- the room
W2, BACK, CEIL = 5.0, -4.0, 4.6           # half width, back wall z, ceiling height
M = lambda k, **kw: mat(k, **kw)

# floor: honey wood planks along z, staggered joints, three tints
for i in range(int(2 * W2 / 0.2)):
    x = -W2 + 0.1 + i * 0.2; z = BACK; first = True
    while z < 5.0:
        L = R.uniform(1.4, 2.6) if not first else R.uniform(0.4, 2.2); first = False
        L = min(L, 5.0 - z)
        if L < 0.15: break
        box(f"plank_{i}_{z:.1f}", (0.194, 0.04, L - 0.006), (x, -0.02 + R.uniform(-0.0012, 0.0012), z + L / 2),
            M(R.choice(["wood_a", "wood_b", "wood_c"]), rough=R.choice([0.55, 0.62, 0.7])) if False else M(R.choice(["wood_a", "wood_b", "wood_c"]), rough=0.62),
            bevel=0.004, step=0.3, segments=1)
        z += L

box("floor_base", (2 * W2, 0.05, 9.0), (0, -0.065, BACK + 4.5), M("beam", color="#5a3f2c", rough=0.9), bevel=0, step=0.5)

# back wall with a window opening (boolean), plaster upper, wainscot lower
WIN = dict(x=-1.6, w=1.9, y0=1.15, y1=3.75)
wall = box("wall_back", (2 * W2, CEIL, 0.2), (0, CEIL / 2, BACK - 0.1), M("plaster", rough=0.9), bevel=0, step=0.2)
cut = box("cut_window", (WIN["w"], WIN["y1"] - WIN["y0"], 0.6), (WIN["x"], (WIN["y0"] + WIN["y1"]) / 2, BACK - 0.1), None, bevel=0, step=0)
for c in cut.users_collection: c.objects.unlink(cut)
CUT.objects.link(cut); cut.display_type = 'WIRE'; cut.hide_render = True
bo = wall.modifiers.new("Window", 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = 'EXACT'

# side walls (only the back half: the front stays open for the camera)
for sx in (-1, 1):
    box(f"wall_side_{sx}", (0.2, CEIL, 5.0), (sx * (W2 + 0.1), CEIL / 2, BACK + 2.5), M("plaster_dk", rough=0.9), bevel=0, step=0.2)

# ceiling planks + beams
box("ceiling", (2 * W2 + 0.4, 0.08, 7.5), (0, CEIL + 0.04, BACK + 3.75), M("beam", rough=0.8), bevel=0, step=0.3)
for k, z in enumerate((-3.4, -2.0, -0.6, 0.8, 2.2)):
    box(f"beam_{k}", (2 * W2 + 0.4, 0.26, 0.22), (0, CEIL - 0.13, z), M("beam", rough=0.8), bevel=0.02, step=0.3)

# wainscoting: vertical boards, chair rail, baseboard
for i in range(int(2 * W2 / 0.16)):
    x = -W2 + 0.08 + i * 0.16
    if WIN["x"] - WIN["w"] / 2 - 0.05 < x < WIN["x"] + WIN["w"] / 2 + 0.05: continue
    box(f"wains_{i}", (0.15, 1.0, 0.03), (x, 0.55, BACK + 0.015), M("wainscot", rough=0.6), bevel=0.006, step=0.25, segments=1)
box("chair_rail", (2 * W2, 0.06, 0.06), (0, 1.06, BACK + 0.03), M("trim", rough=0.5), bevel=0.01)
box("baseboard", (2 * W2, 0.14, 0.04), (0, 0.07, BACK + 0.02), M("trim", rough=0.5), bevel=0.008)
for sx in (-1, 1):
    box(f"baseboard_side_{sx}", (0.04, 0.14, 5.0), (sx * (W2 - 0.02), 0.07, BACK + 2.5), M("trim", rough=0.5), bevel=0.008)
    box(f"chair_rail_side_{sx}", (0.06, 0.06, 5.0), (sx * (W2 - 0.03), 1.06, BACK + 2.5), M("trim", rough=0.5), bevel=0.01)
    for i in range(int(5.0 / 0.16)):
        box(f"wains_side_{sx}_{i}", (0.03, 1.0, 0.15), (sx * (W2 - 0.015), 0.55, BACK + 0.08 + i * 0.16), M("wainscot", rough=0.6), bevel=0.006, step=0.25, segments=1)

# window: deep frame, mullions, sill, warm "outside" glow card (the React wrapper puts the sky + hills behind it)
wx, ww, wy0, wy1 = WIN["x"], WIN["w"], WIN["y0"], WIN["y1"]
for nm, sz, at in (("win_frame_l", (0.1, wy1 - wy0 + 0.1, 0.3), (wx - ww / 2 - 0.0, (wy0 + wy1) / 2, BACK - 0.05)),
                   ("win_frame_r", (0.1, wy1 - wy0 + 0.1, 0.3), (wx + ww / 2 + 0.0, (wy0 + wy1) / 2, BACK - 0.05)),
                   ("win_frame_t", (ww + 0.2, 0.1, 0.3), (wx, wy1, BACK - 0.05))):
    box(nm, sz, at, M("trim", rough=0.45), bevel=0.012)
box("win_sill", (ww + 0.34, 0.06, 0.38), (wx, wy0 - 0.02, BACK + 0.04), M("trim", rough=0.45), bevel=0.012)
for k in range(1, 3):
    box(f"win_mull_v{k}", (0.045, wy1 - wy0, 0.06), (wx - ww / 2 + ww * k / 3, (wy0 + wy1) / 2, BACK - 0.12), M("trim", rough=0.45), bevel=0.006, step=0)
for k in range(1, 4):
    box(f"win_mull_h{k}", (ww, 0.045, 0.06), (wx, wy0 + (wy1 - wy0) * k / 4, BACK - 0.12), M("trim", rough=0.45), bevel=0.006, step=0)
# window sill clutter: little plants + a jar
for k, x in enumerate((wx - 0.6, wx + 0.55)):
    cyl(f"sill_pot_{k}", 0.08, 0.13, (x, wy0 + 0.075, BACK + 0.08), M("pot", rough=0.7), seg=16)
    for j in range(5):
        a = j / 5 * 6.283 + k
        sphere(f"sill_leaf_{k}_{j}", 0.06, (x + math.cos(a) * 0.05, wy0 + 0.2 + (j % 2) * 0.05, BACK + 0.08 + math.sin(a) * 0.05), M("leaf", rough=0.6), seg=8, scale=(0.6, 1.4, 0.4))
cyl("sill_jar", 0.06, 0.16, (wx + 0.1, wy0 + 0.09, BACK + 0.1), M("glass", color="#cfeee4", rough=0.08, alpha=0.35), seg=16, bevel=0)

# copper pipes along the top of the back wall + one down the right corner, with brackets and a valve wheel
pipe_y = 4.15
cyl("pipe_back", 0.045, 2 * W2, (0, pipe_y, BACK + 0.12), M("copper", rough=0.32, metal=1.0), seg=16, axis="x", bevel=0)
cyl("pipe_back_2", 0.03, 2 * W2, (0, pipe_y - 0.14, BACK + 0.1), M("copper", rough=0.32, metal=1.0), seg=12, axis="x", bevel=0)
for k in range(9):
    box(f"pipe_bracket_{k}", (0.04, 0.26, 0.12), (-4.4 + k * 1.1, pipe_y - 0.07, BACK + 0.06), M("steel", rough=0.4, metal=1.0), bevel=0.006, step=0)
cyl("pipe_down", 0.045, pipe_y, (W2 - 0.25, pipe_y / 2, BACK + 0.25), M("copper", rough=0.32, metal=1.0), seg=16, bevel=0)
torus("valve_wheel", 0.11, 0.015, (W2 - 0.25, 1.6, BACK + 0.36), M("coral", rough=0.45), seg=24, minor=8)
cyl("valve_stem", 0.02, 0.1, (W2 - 0.25, 1.6, BACK + 0.31), M("steel", rough=0.4, metal=1.0), seg=8, axis="z", bevel=0)

# wall clock above the window (hands are separate named nodes, origin at the pivot)
CLK = (wx, 4.0 - 0.0, BACK + 0.04)
cyl("clock_body", 0.27, 0.06, (CLK[0], 3.98, BACK + 0.04), M("teal", rough=0.45), seg=48, axis="z")
cyl("clock_face", 0.235, 0.01, (CLK[0], 3.98, BACK + 0.075), M("paper", rough=0.6), seg=48, axis="z", bevel=0)
for k in range(12):
    a = k / 12 * 6.283
    box(f"clock_tick_{k}", (0.012, 0.035 if k % 3 else 0.055, 0.006), (CLK[0] + math.sin(a) * 0.2, 3.98 + math.cos(a) * 0.2, BACK + 0.083), M("black", rough=0.5), bevel=0, step=0, rot_y=0)
for nm, L, wdt in (("clock_hour", 0.12, 0.02), ("clock_min", 0.18, 0.013)):
    ob = box(nm, (wdt, L, 0.006), (CLK[0], 3.98, BACK + 0.09 + (0.006 if nm == "clock_min" else 0)), M("black", rough=0.5), bevel=0, step=0, keep=True)
    for v in ob.data.vertices: v.co.z += L / 2 - 0.02                 # pivot at the clock centre, hand points up (12:00)

# ----------------------------------------------------------------------------- left: workbench with tiled backsplash and shelves
BX = -3.65
box("bench_top", (2.2, 0.07, 0.8), (BX, 0.92, BACK + 0.42), M("wood_bench", rough=0.55), bevel=0.012, step=0.25)
box("bench_body", (2.1, 0.86, 0.72), (BX, 0.45, BACK + 0.4), M("teal", rough=0.55), bevel=0.012, step=0.25)
for k in range(4):
    box(f"bench_drawer_{k}", (0.48, 0.3, 0.02), (BX - 0.78 + k * 0.52, 0.62, BACK + 0.77), M("teal_dk", rough=0.5), bevel=0.006, step=0)
    cyl(f"bench_knob_{k}", 0.022, 0.03, (BX - 0.78 + k * 0.52, 0.66, BACK + 0.795), M("brass", rough=0.3, metal=1.0), seg=12, axis="z", bevel=0)
    box(f"bench_door_{k}", (0.48, 0.32, 0.02), (BX - 0.78 + k * 0.52, 0.24, BACK + 0.77), M("teal_dk", rough=0.5), bevel=0.006, step=0)
# backsplash tiles (individual, slight variation) above the bench
for r_ in range(7):
    for c in range(14):
        x = BX - 1.05 + c * 0.152 + (0.076 if r_ % 2 else 0)
        if x > BX + 1.08: continue
        box(f"tile_{r_}_{c}", (0.146, 0.146, 0.012), (x, 1.04 + r_ * 0.152, BACK + 0.012), M("tile", rough=R.choice([0.25, 0.3])), bevel=0.004, step=0, segments=1)
# open shelves with jars + books
for k, y in enumerate((2.35, 2.95)):
    box(f"shelf_{k}", (1.9, 0.04, 0.3), (BX, y, BACK + 0.17), M("wood_bench", rough=0.55), bevel=0.006)
    for j in range(2):
        box(f"shelf_bracket_{k}_{j}", (0.03, 0.16, 0.22), (BX - 0.8 + j * 1.6, y - 0.1, BACK + 0.13), M("brass", rough=0.35, metal=1.0), bevel=0.004, step=0)
    x = BX - 0.85
    while x < BX + 0.85:
        if R.random() < 0.55:
            r_ = R.uniform(0.045, 0.07); h = R.uniform(0.12, 0.24)
            cyl(f"jar_{k}_{x:.2f}", r_, h, (x + r_, y + 0.02 + h / 2, BACK + 0.17), M(f"jar_{R.randint(0, 3)}", color=R.choice(["#bfe6d4", "#f6c9b8", "#d9cdf0", "#f5e3a8"]), rough=0.12, alpha=0.6), seg=16, bevel=0)
            cyl(f"jar_lid_{k}_{x:.2f}", r_ * 0.9, 0.025, (x + r_, y + 0.035 + h, BACK + 0.17), M(R.choice(["coral", "teal", "brass"]), rough=0.4), seg=16, bevel=0)
            x += 2 * r_ + 0.03
        else:
            n = R.randint(3, 6)
            for b in range(n):
                h = R.uniform(0.2, 0.27)
                box(f"book_{k}_{x:.2f}_{b}", (0.035, h, 0.2), (x + 0.02, y + 0.02 + h / 2, BACK + 0.15), M(f"book_{R.randint(1, 5)}", rough=0.75), bevel=0.003, step=0, segments=1, rot_y=0)
                x += 0.04
            x += 0.04
# bench clutter: flasks (glow ones are practicals), microscope, notebook, test tube rack
for k, (x, col, glow) in enumerate(((BX - 0.7, "#7ff0c8", 2.5), (BX - 0.45, "#ff9ab8", 2.0), (BX + 0.75, "#ffd76b", 1.6))):
    cyl(f"flask_base_{k}", 0.09, 0.16, (x, 1.04, BACK + 0.45), M(f"flaskglass_{k}", color="#e9f6f1", rough=0.06, alpha=0.3), seg=20, r2=0.04, bevel=0)
    cyl(f"flask_neck_{k}", 0.028, 0.14, (x, 1.19, BACK + 0.45), M(f"flaskglass_{k}"), seg=12, bevel=0)
    cyl(f"flask_liquid_{k}_noshadow", 0.075, 0.09, (x, 1.005, BACK + 0.45), M(f"liquid_{k}", color=col, rough=0.2, emit=col, emit_strength=glow), seg=20, r2=0.05, bevel=0, keep=True)
box("rack_base", (0.36, 0.04, 0.12), (BX - 0.05, 0.98, BACK + 0.35), M("wood_bench", rough=0.55), bevel=0.004, step=0)
for j in range(5):
    cyl(f"tube_{j}", 0.016, 0.18, (BX - 0.2 + j * 0.075, 1.07, BACK + 0.35), M("glass", color="#e9f6f1", rough=0.06, alpha=0.3), seg=10, bevel=0)
    cyl(f"tube_liq_{j}", 0.013, 0.08, (BX - 0.2 + j * 0.075, 1.02, BACK + 0.35), M(f"book_{j % 5 + 1}", rough=0.3), seg=10, bevel=0)
box("scope_base", (0.26, 0.05, 0.2), (BX + 0.3, 0.98, BACK + 0.4), M("steel", rough=0.4, metal=0.6), bevel=0.008, step=0)
box("scope_arm", (0.06, 0.32, 0.08), (BX + 0.36, 1.15, BACK + 0.36), M("coral", rough=0.45), bevel=0.01, step=0)
cyl("scope_eye", 0.035, 0.18, (BX + 0.28, 1.32, BACK + 0.4), M("black", rough=0.5), seg=16, bevel=0.004)
box("notebook", (0.3, 0.025, 0.22), (BX + 0.62, 0.97, BACK + 0.62), M("book_3", rough=0.75), bevel=0.004, step=0, rot_y=12)
# a tiny desk monitor with a live plot (screen is a practical)
box("monitor_body", (0.5, 0.36, 0.06), (BX + 0.5, 1.36, BACK + 0.28), M("steel", rough=0.4, metal=0.3), bevel=0.015, step=0)
box("monitor_stand", (0.06, 0.2, 0.06), (BX + 0.5, 1.07, BACK + 0.26), M("steel", rough=0.4, metal=0.3), bevel=0.006, step=0)
img = image("screen_0", 512, 384, screen(0))
plane("screen_0_noshadow", 0.44, 0.3, (BX + 0.5, 1.36, BACK + 0.312), M("screen_0", rough=0.3, emit="#ffffff", emit_strength=1.4, image=img), keep=True)
MATS["screen_0"].node_tree.links.new(MATS["screen_0"].node_tree.nodes["Image Texture"].outputs["Color"], MATS["screen_0"].node_tree.nodes["Principled BSDF"].inputs["Emission Color"])

# ----------------------------------------------------------------------------- right: chalkboard, neon sign, pegboard
CX = 2.55
img = image("chalkboard", 1024, 640, chalkboard)
box("chalk_frame", (2.0, 1.28, 0.06), (CX, 2.05, BACK + 0.03), M("wood_bench", rough=0.55), bevel=0.012, step=0.2)
plane("chalk_surface", 1.86, 1.14, (CX, 2.05, BACK + 0.061), M("chalkboard", rough=0.85, image=img))
box("chalk_tray", (1.6, 0.03, 0.08), (CX, 1.4, BACK + 0.09), M("wood_bench", rough=0.55), bevel=0.006, step=0)
for k, col in enumerate(("#f4ece0", "#e8836b", "#e9c46a")):
    cyl(f"chalk_{k}", 0.012, 0.08, (CX - 0.3 + k * 0.12, 1.43, BACK + 0.09), M(f"chalk_stick_{k}", color=col, rough=0.9), seg=8, axis="x", bevel=0)
neon = text("neon_noshadow", "LAB CLUB", 0.34, (CX, 3.18, BACK + 0.06), M("neon", color="#ff8fb3", rough=0.4, emit="#ff7aa8", emit_strength=6.0), extrude=0.012, keep=True)
box("neon_backplate", (1.75, 0.5, 0.025), (CX, 3.18, BACK + 0.02), M("glass", color="#e9f6f1", rough=0.06, alpha=0.3), bevel=0.01, step=0)
for k in range(2):
    poly_tube(f"neon_wire_{k}", [(CX - 0.6 + k * 1.2, 3.42, BACK + 0.03), (CX - 0.6 + k * 1.2, 3.95, BACK + 0.03)], 0.006, M("cable", rough=0.6))
# right side wall: pegboard with tools + a poster
img = image("pegboard", 1024, 614, pegboard)
plane("pegboard", 1.9, 1.14, (W2 - 0.025, 1.85, -2.2), M("pegboard_m", rough=0.8, image=img), facing="-x")
for k, (y, z, L, col) in enumerate(((2.15, -2.8, 0.42, "coral"), (2.05, -2.45, 0.34, "teal"), (1.75, -1.9, 0.5, "brass"), (1.6, -1.55, 0.3, "coral"))):
    box(f"tool_{k}", (0.03, L, 0.06), (W2 - 0.05, y, z), M(col, rough=0.45, metal=1.0 if col == "brass" else 0.0), bevel=0.008, step=0)
torus("tool_coil", 0.12, 0.018, (W2 - 0.06, 1.55, -2.65), M("cable", rough=0.6), seg=24, minor=8, facing="x") if False else None

# ----------------------------------------------------------------------------- posters (original art) on the walls
for nm, fn, w, h, at, facing in (("poster_atom", poster_atom, 0.62, 0.86, (-W2 + 0.03, 2.3, -2.4), "x"),
                                  ("poster_planets", poster_planets, 0.7, 0.98, (0.75, 2.75, BACK + 0.012), "z"),
                                  ("poster_wave", poster_wave, 0.6, 0.6, (W2 - 0.03, 2.95, -0.9), "-x")):
    img = image(nm, 512, int(512 * h / w), fn)
    plane(nm, w, h, at, M(nm, rough=0.7, image=img), facing=facing)
    # paper slightly lifted at the corners: pins
    for dx, dy in ((-1, 1), (1, 1)):
        off = (dx * (w / 2 - 0.04), dy * (h / 2 - 0.04))
        if facing == "z": pin = (at[0] + off[0], at[1] + off[1], at[2] + 0.01)
        else: pin = (at[0] + (0.01 if facing == "x" else -0.01), at[1] + off[1], at[2] + off[0])
        sphere(f"{nm}_pin_{dx}", 0.014, pin, M("coral", rough=0.4), seg=8)

# ----------------------------------------------------------------------------- left side wall: tall bookcase
LZ = -2.4
box("case_back", (0.04, 2.6, 1.3), (-W2 + 0.04, 1.3, LZ - 0.4), M("wood_bench", rough=0.6), bevel=0.006, step=0.25)
for k in range(2):
    box(f"case_side_{k}", (0.36, 2.6, 0.04), (-W2 + 0.2, 1.3, LZ - 0.4 + (k - 0.5) * 1.26), M("wood_bench", rough=0.6), bevel=0.008, step=0.25)
for k in range(6):
    y = 0.05 + k * 0.5
    box(f"case_shelf_{k}", (0.36, 0.035, 1.24), (-W2 + 0.2, y, LZ - 0.4), M("wood_bench", rough=0.6), bevel=0.005, step=0.3)
    if k == 5: break
    z = LZ - 0.4 - 0.58
    while z < LZ - 0.4 + 0.56:
        h = R.uniform(0.26, 0.4)
        if R.random() < 0.12:
            sphere(f"case_globe_{k}_{z:.2f}", 0.11, (-W2 + 0.2, y + 0.13, z + 0.12), M("teal", rough=0.5), seg=16); z += 0.26; continue
        th = R.uniform(0.03, 0.06); tilt = 0
        box(f"case_book_{k}_{z:.2f}", (0.24, h, th), (-W2 + 0.18, y + 0.02 + h / 2, z + th / 2), M(f"book_{R.randint(1, 5)}", rough=0.75), bevel=0.003, step=0, segments=1)
        z += th + 0.004

# ----------------------------------------------------------------------------- HERO: the orb apparatus (centre-back)
HX, HZ = 0.95, -2.75
cyl("hero_base", 0.62, 0.32, (HX, 0.16, HZ), M("teal_dk", rough=0.45), seg=48, bevel=0.02)
cyl("hero_base_trim", 0.64, 0.05, (HX, 0.34, HZ), M("brass", rough=0.3, metal=1.0), seg=48, bevel=0.008)
cyl("hero_plinth", 0.5, 0.22, (HX, 0.47, HZ), M("teal", rough=0.45), seg=48, bevel=0.015)
for k in range(16):                                                   # hazard stripes on the base (decals)
    a = k / 16 * 6.283
    if k % 2: continue
    box(f"hero_stripe_{k}", (0.12, 0.2, 0.012), (HX + math.sin(a) * 0.625, 0.16, HZ + math.cos(a) * 0.625), M("coral", rough=0.5), bevel=0, step=0, rot_y=math.degrees(a))
cyl("hero_jar", 0.42, 0.95, (HX, 1.06, HZ), M("bell_glass", color="#e9f6f1", rough=0.04, alpha=0.22), seg=48, bevel=0, cap=False)
sphere("hero_jar_top", 0.42, (HX, 1.535, HZ), M("bell_glass"), seg=48, scale=(1, 0.55, 1))
torus("hero_ring_low", 0.43, 0.025, (HX, 0.62, HZ), M("brass", rough=0.3, metal=1.0), seg=64, minor=10, facing="y") if False else None
for k, y in enumerate((0.6, 1.53)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.43, minor_radius=0.028, major_segments=64, minor_segments=10)
    ob = bpy.context.active_object; ob.name = f"hero_ring_{k}"
    for c in ob.users_collection: c.objects.unlink(ob)
    COL.objects.link(ob); ob.data.materials.append(M("brass", rough=0.3, metal=1.0)); ob["keep"] = False
    ob.location = P(HX, y, HZ)
    for p in ob.data.polygons: p.use_smooth = True
cyl("hero_cap", 0.12, 0.12, (HX, 1.82, HZ), M("brass", rough=0.3, metal=1.0), seg=24, bevel=0.01)
sphere("hero_cap_ball", 0.07, (HX, 1.93, HZ), M("copper", rough=0.3, metal=1.0), seg=16)
cyl("orb_stand", 0.05, 0.42, (HX, 0.79, HZ), M("steel", rough=0.35, metal=1.0), seg=16, bevel=0.004)
sphere("orb", 0.2, (HX, 1.18, HZ), M("orb_glow", color="#c9fff0", rough=0.2, emit="#7ff0d0", emit_strength=4.0), seg=48, keep=True)
# coil around the orb
pts = [(HX + math.cos(t) * 0.3, 0.75 + t * 0.022, HZ + math.sin(t) * 0.3) for t in np.linspace(0, 6.283 * 4, 160)]
poly_tube("hero_coil", pts, 0.012, M("copper", rough=0.3, metal=1.0))
# side control box with dials, cables to the wall
box("hero_ctrl", (0.5, 0.7, 0.35), (HX + 0.95, 0.35, HZ + 0.1), M("teal", rough=0.45), bevel=0.02)
box("hero_ctrl_panel", (0.42, 0.3, 0.02), (HX + 0.95, 0.5, HZ + 0.285), M("paper", rough=0.6), bevel=0.004, step=0)
for k in range(3):
    cyl(f"hero_dial_{k}", 0.04, 0.04, (HX + 0.83 + k * 0.12, 0.55, HZ + 0.3), M(["coral", "brass", "teal_dk"][k], rough=0.4, metal=1.0 if k == 1 else 0.0), seg=16, axis="z", bevel=0.004)
for k in range(2):
    sphere(f"hero_lamp_{k}_noshadow", 0.025, (HX + 0.86 + k * 0.18, 0.42, HZ + 0.3), M(f"ctrl_led_{k}", color="#ffffff", rough=0.3, emit=["#7ff0c8", "#ff7aa8"][k], emit_strength=5.0), seg=12, keep=True)
poly_tube("cable_hero_1", [(HX + 1.15, 0.05, HZ + 0.05), (HX + 1.35, 0.022, HZ - 0.1), (HX + 1.7, 0.022, HZ - 0.35), (HX + 1.95, 0.022, BACK + 0.25), (HX + 2.0, 0.08, BACK + 0.04), (HX + 2.0, 0.4, BACK + 0.04)], 0.022, M("cable", rough=0.6))
poly_tube("cable_hero_2", [(HX - 0.6, 0.05, HZ + 0.1), (HX - 0.8, 0.018, HZ + 0.25), (HX - 1.2, 0.018, HZ + 0.3), (-0.45, 0.018, BACK + 0.35), (-0.4, 0.06, BACK + 0.04), (-0.4, 0.35, BACK + 0.04)], 0.018, M("cable", rough=0.6))
box("socket", (0.12, 0.12, 0.02), (HX + 2.0, 0.4, BACK + 0.01), M("trim", rough=0.5), bevel=0.004, step=0)
box("socket_2", (0.12, 0.12, 0.02), (-0.4, 0.35, BACK + 0.01), M("trim", rough=0.5), bevel=0.004, step=0)

# ----------------------------------------------------------------------------- pendant lamps (practicals) + ceiling fan
for k, (x, z) in enumerate(((-2.3, -1.2), (0.95, -1.5), (3.1, -0.7))):
    drop = 1.35 + 0.15 * (k % 2)
    poly_tube(f"pendant_cord_{k}", [(x, CEIL, z), (x, CEIL - drop, z)], 0.008, M("cable", rough=0.6))
    cyl(f"pendant_shade_{k}", 0.08, 0.26, (x, CEIL - drop - 0.12, z), M("teal", rough=0.4), seg=32, r2=0.03, bevel=0.004, cap=False)
    cyl(f"pendant_rim_{k}", 0.24, 0.03, (x, CEIL - drop - 0.25, z), M("brass", rough=0.3, metal=1.0), seg=32, bevel=0.004, cap=False) if False else None
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.26, radius2=0.05, depth=0.22, end_fill_type='NOTHING')
    ob = bpy.context.active_object; ob.name = f"pendant_hood_{k}"
    for c in ob.users_collection: c.objects.unlink(ob)
    COL.objects.link(ob); ob.data.materials.append(M("teal", rough=0.4)); ob["keep"] = False
    ob.location = P(x, CEIL - drop - 0.2, z)
    for p in ob.data.polygons: p.use_smooth = True
    sol = ob.modifiers.new("Solid", 'SOLIDIFY'); sol.thickness = 0.012
    sphere(f"pendant_bulb_{k}_noshadow", 0.07, (x, CEIL - drop - 0.3, z), M("bulb", color="#fff4dc", rough=0.3, emit="#ffd9a0", emit_strength=8.0), seg=20, keep=True)
FAN = (-0.6, CEIL - 0.42, 0.9)
cyl("fan_rod", 0.02, 0.36, (FAN[0], CEIL - 0.2, FAN[2]), M("brass", rough=0.3, metal=1.0), seg=12, bevel=0)
fan = cyl("fan", 0.13, 0.12, FAN, M("teal", rough=0.4), seg=24, bevel=0.01, keep=True)
for k in range(4):                                                    # blades joined into the "fan" node below
    a = k / 4 * 6.283
    b = box(f"fan_blade_{k}", (0.85, 0.018, 0.17), (FAN[0] + math.cos(a) * 0.5, FAN[1] + 0.02, FAN[2] - math.sin(a) * 0.5), M("wood_bench", rough=0.55), bevel=0.006, step=0, rot_y=math.degrees(a))
    b["join_into"] = "fan"

# ----------------------------------------------------------------------------- floor dressing: rug, stool, plant, crate, reel
for k, (r_, col) in enumerate(((1.75, "lavender"), (1.55, "cream_fabric"), (1.45, "lavender"), (1.0, "lavender_dk"), (0.9, "lavender"))):
    cyl(f"rug_{k}", r_, 0.012 + k * 0.001, (0, 0.006 + k * 0.001, 0.6), M(col, rough=0.95), seg=64, bevel=0)
# stool (foreground right)
cyl("stool_seat", 0.24, 0.06, (1.0, 0.62, 4.4), M("coral", rough=0.5), seg=32, bevel=0.015)
for k in range(3):
    a = k / 3 * 6.283
    pts = [(1.0 + math.cos(a) * 0.14, 0.6, 4.4 + math.sin(a) * 0.14), (1.0 + math.cos(a) * 0.22, 0.0, 4.4 + math.sin(a) * 0.22)]
    poly_tube(f"stool_leg_{k}", pts, 0.02, M("steel", rough=0.35, metal=1.0))
torus("stool_ring", 0.18, 0.012, (2.35, 0.25, 2.6), M("steel", rough=0.35, metal=1.0), seg=32, minor=8, facing="y") if False else None
# big plant (foreground left framing)
cyl("plant_pot", 0.3, 0.55, (-1.2, 0.275, 4.0), M("pot", rough=0.65), seg=32, r2=0.24, bevel=0.012)
cyl("plant_soil", 0.27, 0.02, (-1.2, 0.54, 4.0), M("beam", color="#6b4b35", rough=0.95), seg=32, bevel=0)
for j in range(11):
    a = j / 11 * 6.283 + 0.3; h = 0.8 + (j % 3) * 0.28; rr_ = 0.12 + (j % 2) * 0.14
    poly_tube(f"plant_stem_{j}", [(-1.2, 0.55, 4.0), (-1.2 + math.cos(a) * rr_, 0.55 + h * 0.85, 4.0 + math.sin(a) * rr_)], 0.012, M("leaf_dk", rough=0.6))
    lf = sphere(f"plant_leaf_{j}", 0.2, (-1.2 + math.cos(a) * (rr_ + 0.12), 0.55 + h, 4.0 + math.sin(a) * (rr_ + 0.12)), M("leaf" if j % 2 else "leaf_dk", rough=0.55), seg=16, scale=(1.0, 0.18, 0.62))
    lf.rotation_euler = (math.radians(20 * math.sin(a)), math.radians(15), -a)
# wooden crate with cable reel (background right floor)
box("crate", (0.6, 0.45, 0.45), (4.0, 0.225, -2.9), M("wood_c", rough=0.7), bevel=0.012, step=0.15)
for k in range(3):
    box(f"crate_slat_{k}", (0.62, 0.05, 0.47), (4.0, 0.06 + k * 0.165, -2.9), M("wood_b", rough=0.7), bevel=0.006, step=0)
cyl("reel", 0.2, 0.18, (4.0, 0.6, -2.9), M("coral", rough=0.5), seg=32, axis="z", bevel=0.01)
torus("reel_cable", 0.15, 0.06, (4.0, 0.6, -2.9), M("cable", rough=0.6), seg=32, minor=10, facing="z")

# ----------------------------------------------------------------------------- finalize: apply modifiers/curves, bake AO, join
for ob in [o for o in COL.objects if o.type in ('CURVE', 'FONT')]:
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    new = bpy.data.objects.new(ob.name + "_m", me); new.matrix_world = ob.matrix_world; COL.objects.link(new)
    new["keep"] = ob.get("keep", False); nm = ob.name; bpy.data.objects.remove(ob); new.name = nm
    for p in me.polygons: p.use_smooth = True
dg = bpy.context.evaluated_depsgraph_get()
for ob in [o for o in COL.objects if o.type == 'MESH' and o.modifiers]:
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); ob.modifiers.clear(); old = ob.data; ob.data = me
    bpy.data.meshes.remove(old)
bpy.data.objects.remove(cut)

meshes = [o for o in COL.objects if o.type == 'MESH']
emissive = lambda o: "_noshadow" in o.name or o.name == "orb"
glassy = lambda o: o.data.materials and o.data.materials[0].surface_render_method == 'BLENDED'

if BAKE:
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48
    world = bpy.data.worlds.new("bake"); sc.world = world; world.light_settings.distance = 0.7
    targets = [o for o in meshes if not emissive(o) and not glassy(o)]
    for o in targets:
        a = o.data.color_attributes.new("AO", 'BYTE_COLOR', 'CORNER'); o.data.color_attributes.active_color = a
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in targets: o.select_set(True)
    bpy.context.view_layer.objects.active = targets[0]
    sc.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='AO')
    # AO -> soft lavender-tinted occlusion (never black: the lab stays airy; runtime AO adds contact detail)
    tint = np.array(hex2lin("#8f7aa6"))
    for o in targets:
        a = o.data.color_attributes["AO"]; n = len(a.data)
        c = np.zeros(n * 4, np.float32); a.data.foreach_get("color", c); c = c.reshape(n, 4)
        ao = np.clip(c[:, 0], 0, 1) ** 0.85
        k = 0.42 + 0.58 * ao
        c[:, :3] = tint * (1 - k)[:, None] + k[:, None]
        a.data.foreach_set("color", c.ravel())
    print("BAKE| AO on", len(targets), "objects")

# join by material: static, opaque, non-named meshes -> one object per material (few draw calls)
named = {}
for o in [o for o in COL.objects if o.type == 'MESH']:
    if o.get("join_into"): named.setdefault(o["join_into"], []).append(o)
for tgt, parts in named.items():
    t = bpy.data.objects[tgt]
    with bpy.context.temp_override(active_object=t, selected_editable_objects=[t] + parts):
        bpy.ops.object.join()
groups = {}
for o in [o for o in COL.objects if o.type == 'MESH' and not o.get("keep")]:
    has_ao = "AO" in o.data.color_attributes
    groups.setdefault((o.data.materials[0].name if o.data.materials else "none", has_ao), []).append(o)
for (mname, has_ao), objs in groups.items():
    if len(objs) < 2: objs[0].name = f"set_{mname}"; continue
    if not has_ao:                                                        # keep attribute sets consistent for join
        pass
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
        bpy.ops.object.join()
    objs[0].name = f"set_{mname}" + ("" if has_ao else "_noshadow" if mname.startswith(("glass", "bell", "flaskglass", "jar")) else "")
for o in COL.objects:                                                     # glass never casts shadows
    if o.type == 'MESH' and o.data.materials and o.data.materials[0].surface_render_method == 'BLENDED' and "_noshadow" not in o.name:
        o.name += "_noshadow"

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in COL.objects if o.type == 'MESH')
print("STATS| objects", len([o for o in COL.objects if o.type == 'MESH']), "materials", len(bpy.data.materials), "tris", tris)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f"{NAME}.blend"))
for o in bpy.context.view_layer.objects: o.select_set(o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, f"{NAME}.glb"), export_format='GLB', use_selection=True,
                          export_apply=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                          export_yup=True, export_cameras=False, export_lights=False, export_extras=False,
                          export_image_format='AUTO', export_materials='EXPORT', export_animations=False)
print("EXPORT|", os.path.getsize(os.path.join(HERE, f"{NAME}.glb")), "bytes")
