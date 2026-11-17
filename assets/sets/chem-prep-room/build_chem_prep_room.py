"""Chemistry prep room (EP07 "Sorting Race"): procedural build -> chem-prep-room.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/chem-prep-room/build_chem_prep_room.py [-- --no-bake]

Concept: "Chemistry prep room", a warm, well-used school prep room in the late morning.
Palette: warm oak, cream glazed tiles, copper; the liquids (React beakers) are the only saturated colours.
Light story: soft window light from the left (two tall windows in the left wall: window-shaped patches on the floor and
the benches), a warm fill from the camera side, a cool-warm rim from behind that makes the liquids glow; practicals in
frame: the bright windows, two copper pendant lamps over the benches, a small burner flame on the side counter.
Hero piece: two long oak benches (Anna's in front, Lumi's behind), each with 12 ceramic coasters for the beakers.
Depth: a trolley of glassware and a retort stand close to the camera, the benches midground, the back wall with
oak shelves of glassware, a chalkboard and copper pipes behind.

Layout (three.js metres, shared with episodes/src/sets/chem-prep-room/layout.ts):
  room x -3.2..3.2, z -3.7 (back wall) .. 3.4, height 3.2; window wall x = -3.2
  benches (mascot scale, the mascots are 1.0 m): length 2.4, depth 0.46, top surface y = 0.4, centred on x = 0;
  Anna z = 0, Lumi z = -2.1; slots: x = (k - 5.5) * 0.17, k = 0..11, on the bench centre line
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import bmesh
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, image, fill, paint
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "oak": "#c08a52", "oak_dk": "#8a5a32", "oak_lt": "#d6a46a",
    "cream": "#efe3c8", "cream_dk": "#d9c9a6", "plaster": "#eadcc0", "grout": "#b9a888",
    "copper": "#c27a4a", "copper_dk": "#8f5232", "brass": "#c9a45c",
    "iron": "#3a3633", "rubber": "#2e2a28", "ceramic": "#f3ece0",
    "chalk": "#3f4a42", "chalk_frame": "#8a5a32",
    "glass": "#dfeee9", "amber": "#9a6a2e", "fabric": "#e9e2d4", "fabric_dk": "#a99e8a",
    "leaf": "#6f8a55", "leaf_dk": "#4e6a3d", "terra": "#b8704a", "paper": "#f4ecd8",
}
S.begin("chem-prep-room", HERE, PAL)
R = S.R

# ---- layout (keep in sync with episodes/src/sets/chem-prep-room/layout.ts)
X0, X1 = -3.2, 3.2
BACK, FRONT = -3.7, 3.4
H = 3.2
BENCH_L, BENCH_D, BENCH_TOP, TOP_T = 2.4, 0.46, 0.4, 0.045
BENCH_Z = {"anna": 0.0, "lumi": -2.1}
SLOT = 0.17
WIN_Z = [-2.1, 0.1]          # window centres along the left wall
WIN_W, WIN_Y0, WIN_Y1 = 1.25, 0.85, 2.75


# ----------------------------------------------------------------------------- generated textures (original art)
def _noise(u, v, s, seed):
    rr = np.random.RandomState(seed); g = rr.rand(s + 1, s + 1)
    x = u * s; y = v * s; i = np.floor(x).astype(int); j = np.floor(y).astype(int); fx = x - i; fy = y - j
    i = np.clip(i, 0, s - 1); j = np.clip(j, 0, s - 1)
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = g[j, i]; b = g[j, i + 1]; c = g[j + 1, i]; d = g[j + 1, i + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def shade(o, k):
    o[..., :3] = np.clip(o[..., :3] * (1 + k[..., None]), 0, 1)


def wood_img(name, base, dark, seed, w=1024, h=256, rings=22):
    """Oak: long grain along u, a few darker rays and knots, fine pores."""
    def fn(u, v):
        o = fill(u, base)
        grain = np.sin((v * rings + _noise(u, v, 5, seed) * 4 + _noise(u, v, 30, seed + 1) * 0.6) * math.pi)
        k = np.clip((grain + 1) / 2, 0, 1) ** 3 * 0.32 + _noise(u, v, 60, seed + 2) * 0.1
        o[..., :3] = o[..., :3] * (1 - k[..., None]) + S.C(dark)[:3] * k[..., None]
        pores = np.random.RandomState(seed + 3).rand(*u.shape)
        paint(o, pores > 0.992, dark, 0.35)
        shade(o, (_noise(u, v, 3, seed + 4) - 0.5) * 0.12)
        return o
    return image(name, w, h, fn)


OAK_IMG = [wood_img(f"oak_{i}", b, d, 31 + i) for i, (b, d) in enumerate((("#dcb07a", "#a9794a"), ("#d4a56e", "#9e6e42"), ("#e2b886", "#b08252")))]
OAK_DK_IMG = wood_img("oak_dark", "#a97c50", "#74502f", 41)


def oak(i=0, rough=0.55):
    return M(f"oak_{i}", rough=rough, image=OAK_IMG[i % 3])


OAK_DK = M("oak_dark", rough=0.6, image=OAK_DK_IMG)


def _floor(u, v):
    """Cream + warm grey quarry tiles, 8 x 8 per repeat (0.3 m tiles), worn, with grout."""
    n = 8
    o = fill(u, "#e9dcc0")
    i = np.floor(u * n).clip(0, n - 1).astype(int); j = np.floor(v * n).clip(0, n - 1).astype(int)
    fu = u * n - i; fv = v * n - j
    dark = (i + j) % 2 == 1
    paint(o, dark, "#d8c6a2")
    rr = np.random.RandomState(7); tone = rr.uniform(-0.05, 0.05, (n, n))
    shade(o, tone[j, i] + (_noise(u, v, 80, 3) - 0.5) * 0.06 + (_noise(u, v, 7, 4) - 0.5) * 0.1)
    e = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv))
    shade(o, -0.12 * np.clip(1 - e / 0.06, 0, 1) ** 2)
    paint(o, e < 0.025, "#a69273")
    sp = np.random.RandomState(9).rand(*u.shape)
    paint(o, sp > 0.996, "#8a7658", 0.4)
    return o


def _subway(u, v):
    """Cream glazed subway tiles (2:1), 6 columns x 12 rows per repeat, running bond, slight per-tile tone."""
    cols, rows = 6, 12
    o = fill(u, "#efe3c8")
    j = np.floor(v * rows).clip(0, rows - 1).astype(int)
    uu = u * cols + 0.5 * (j % 2)
    i = np.floor(uu).astype(int) % cols
    fu = uu - np.floor(uu); fv = v * rows - j
    rr = np.random.RandomState(13); tone = rr.uniform(-0.035, 0.035, (rows, cols))
    shade(o, tone[j, i] + (_noise(u, v, 40, 5) - 0.5) * 0.04)
    # glaze: a soft highlight toward the top of each tile, darker rounded edges
    shade(o, 0.05 * (fv - 0.5))
    e = np.minimum(np.minimum(fu, 1 - fu) * 2, np.minimum(fv, 1 - fv))
    shade(o, -0.1 * np.clip(1 - e / 0.12, 0, 1) ** 2)
    paint(o, e < 0.035, "#cbbb98")
    return o


def _plaster(u, v):
    o = fill(u, "#eadcc0")
    shade(o, (_noise(u, v, 6, 21) - 0.5) * 0.06 + (_noise(u, v, 60, 22) - 0.5) * 0.04)
    return o


def _chalk(u, v):
    """Chalkboard: 12 unsorted bars → arrow → the same bars sorted, a comparison doodle and a growth sketch."""
    o = fill(u, "#3f4a42")
    shade(o, (_noise(u, v, 30, 9) - 0.5) * 0.1 + (_noise(u, v, 4, 10) - 0.5) * 0.12)
    # smudges of old chalk
    paint(o, _noise(u, v, 9, 11) > 0.72, "#59645b", 0.5)
    ch = "#e9e4d6"
    un = [8, 10, 1, 9, 11, 3, 5, 2, 4, 6, 12, 7]
    for k, val in enumerate(un):
        x0 = 0.06 + k * 0.022
        paint(o, (u > x0) & (u < x0 + 0.014) & (v > 0.52) & (v < 0.52 + val * 0.025), ch, 0.85)
    for k in range(12):
        x0 = 0.42 + k * 0.022
        col = "#f2c94c" if k % 2 else ch
        paint(o, (u > x0) & (u < x0 + 0.014) & (v > 0.52) & (v < 0.52 + (k + 1) * 0.025), col, 0.85)
    paint(o, (np.abs(v - 0.66) < 0.006) & (u > 0.33) & (u < 0.395), ch)                      # arrow shaft
    paint(o, (u > 0.38) & (u < 0.405) & (np.abs(v - 0.66) < (0.405 - u) * 1.3), ch)           # arrow head
    paint(o, (np.abs(v - 0.505) < 0.004) & (u > 0.05) & (u < 0.7), ch, 0.8)                   # base line
    # growth sketch on the right: axes, a steep curve and a gentle one
    paint(o, (np.abs(u - 0.76) < 0.003) & (v > 0.2) & (v < 0.9), ch)
    paint(o, (np.abs(v - 0.2) < 0.004) & (u > 0.76) & (u < 0.96), ch)
    x = (u - 0.76) / 0.2
    steep = 0.2 + 0.68 * np.clip(x, 0, 1) ** 2
    gentle = 0.2 + 0.2 * np.clip(x, 0, 1) * (1 + np.log1p(4 * np.clip(x, 0, 1))) / (1 + math.log(5))
    inside = (u > 0.76) & (u < 0.96)
    paint(o, inside & (np.abs(v - steep) < 0.006), "#f0a3b5")
    paint(o, inside & (np.abs(v - gentle) < 0.006), "#9cc4ff")
    # a "compare" doodle: two beakers and a question mark-ish loop
    for cx in (0.12, 0.24):
        paint(o, (np.abs(u - cx) < 0.03) & (v > 0.12) & (v < 0.36) & ((np.abs(np.abs(u - cx) - 0.03) < 0.004) | (np.abs(v - 0.12) < 0.005)), ch)
    paint(o, (np.abs(np.hypot((u - 0.18) * 1.6, v - 0.42) - 0.035) < 0.005) & (v > 0.4), ch)
    paint(o, (u < 0.012) | (u > 0.988) | (v < 0.02) | (v > 0.98), "#2f3832", 0.6)
    return o


def _poster(u, v):
    """Original lab poster: a grid of soft colour blocks (no text), a margin and a title bar."""
    o = fill(u, "#f4ecd8")
    paint(o, (v > 0.86) & (v < 0.94) & (u > 0.08) & (u < 0.92), "#8a5a32", 0.85)
    cols, rows = 9, 6
    pal = ["#d9a46c", "#a9c1a0", "#9fb6c9", "#d7a3a0", "#e3cf8f", "#b8a3c4"]
    for r_ in range(rows):
        for c_ in range(cols):
            if r_ == 0 and 1 <= c_ <= 7: continue
            x0 = 0.08 + c_ * 0.093; y0 = 0.12 + r_ * 0.12
            paint(o, (u > x0) & (u < x0 + 0.083) & (v > y0) & (v < y0 + 0.105), pal[(c_ * 3 + r_ * 2) % 6], 0.9)
    shade(o, (_noise(u, v, 12, 51) - 0.5) * 0.08)
    return o


def _window(u, v):
    """Bright overcast sky + a soft hint of trees and a building across the yard (pre-blurred, the glass glows)."""
    o = fill(u, "#fff4de")
    shade(o, (v - 0.5) * 0.12)
    tree = (v < 0.32 + 0.12 * _noise(u, v, 6, 61)) & (v > 0.0)
    paint(o, tree, "#d8dcc0", 0.55)
    paint(o, (v < 0.2) & (u > 0.55), "#e9dcc4", 0.5)
    return o


FLOOR = M("floor_tiles", rough=0.62, image=image("floor_img", 1024, 1024, _floor))
SUBWAY = M("subway", rough=0.28, image=image("subway_img", 512, 512, _subway))
PLASTER = M("plaster", rough=0.9, image=image("plaster_img", 256, 256, _plaster))
COPPER = M("copper", rough=0.32, metal=0.9)
COPPER_DK = M("copper_dk", rough=0.45, metal=0.85)
BRASS = M("brass", rough=0.3, metal=0.9)
IRON = M("iron", rough=0.55, metal=0.5)
CERAMIC = M("ceramic", rough=0.35)
GLASS = M("glass_noshadow", color="#e8f4f0", rough=0.08, alpha=0.22)
WINDOW = M("window_glass_noshadow", color="#fff4de", rough=0.2, emit="#fff1d6", emit_strength=2.2, image=image("window_img", 128, 256, _window), emit_image=True)


def uv_scale(ob, su, sv, ou=0.0, ov=0.0):
    for l in ob.data.uv_layers[0].data:
        l.uv = (l.uv[0] * su + ou, l.uv[1] * sv + ov)


def uv_world_xy(ob, scale, ox=0.0, oy=0.0):
    me = ob.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            me.uv_layers[0].data[li].uv = ((co.x + ob.location.x + ox) / scale, (co.y + ob.location.y + oy) / scale)


def grid_plane(name, x0, x1, z0, z1, y, mat, seg=0.6):
    bm = S._bm()
    nx = max(1, int((x1 - x0) / seg)); nz = max(1, int((z1 - z0) / seg))
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=nz, size=0.5, calc_uvs=True)
    for vtx in bm.verts: vtx.co = S.Vector((vtx.co.x * (x1 - x0), vtx.co.y * (z1 - z0), 0))
    ob = S._obj(name, bm, mat)
    ob.location = S.P((x0 + x1) / 2, y, (z0 + z1) / 2)
    return ob


def wall_plane(name, w, h, at, mat, facing, tile=None, seg=0.5):
    """Vertical wall surface subdivided for AO; tile = (metres per texture repeat u, v)."""
    bm = S._bm()
    bmesh.ops.create_grid(bm, x_segments=max(1, int(w / seg)), y_segments=max(1, int(h / seg)), size=0.5, calc_uvs=True)
    for vtx in bm.verts: vtx.co = S.Vector((vtx.co.x * w, vtx.co.y * h, 0))
    ob = S._obj(name, bm, mat); ob.location = S.P(*at)
    if facing == "z": ob.rotation_euler = (math.radians(90), 0, 0)
    elif facing == "x": ob.rotation_euler = (math.radians(90), 0, math.radians(90))
    elif facing == "-x": ob.rotation_euler = (math.radians(90), 0, math.radians(-90))
    if tile: uv_scale(ob, w / tile[0], h / tile[1])
    return ob


# ----------------------------------------------------------------------------- floor, walls
fl = grid_plane("floor", X0, X1, BACK, FRONT, 0.0, FLOOR, seg=0.6)
uv_world_xy(fl, 1.6)
# skirting in dark oak along the walls
box("skirt_back", (X1 - X0, 0.1, 0.03), (0, 0.05, BACK + 0.015), OAK_DK, bevel=0.006, step=1.0)
box("skirt_right", (0.03, 0.1, FRONT - BACK), (X1 - 0.015, 0.05, (BACK + FRONT) / 2), OAK_DK, bevel=0.006, step=1.0)

WAIN = 1.3   # tiled wainscot height
# back wall: tiles below, plaster above, a dark oak chair rail between
wall_plane("back_tiles", X1 - X0, WAIN, (0, WAIN / 2, BACK + 0.002), SUBWAY, "z", tile=(0.9, 0.9))
wall_plane("back_plaster", X1 - X0, H - WAIN, (0, WAIN + (H - WAIN) / 2, BACK + 0.002), PLASTER, "z", tile=(2.0, 2.0))
box("back_rail", (X1 - X0, 0.06, 0.04), (0, WAIN, BACK + 0.02), OAK_DK, bevel=0.008, step=1.0)
box("back_wall_body", (X1 - X0 + 0.4, H, 0.2), (0, H / 2, BACK - 0.1), PLASTER, bevel=0, step=1.0)
# right wall
wall_plane("right_tiles", FRONT - BACK, WAIN, (X1 - 0.002, WAIN / 2, (BACK + FRONT) / 2), SUBWAY, "-x", tile=(0.9, 0.9))
wall_plane("right_plaster", FRONT - BACK, H - WAIN, (X1 - 0.002, WAIN + (H - WAIN) / 2, (BACK + FRONT) / 2), PLASTER, "-x", tile=(2.0, 2.0))
box("right_rail", (0.04, 0.06, FRONT - BACK), (X1 - 0.02, WAIN, (BACK + FRONT) / 2), OAK_DK, bevel=0.008, step=1.0)

# left wall with two real window openings (the key light shines through them)
LW = 0.22
zs = [BACK] + sum([[z - WIN_W / 2, z + WIN_W / 2] for z in WIN_Z], []) + [FRONT]
for k in range(0, len(zs), 2):
    a, b = zs[k], zs[k + 1]
    box(f"left_pier_{k}", (LW, H, b - a), (X0 - LW / 2, H / 2, (a + b) / 2), PLASTER, bevel=0, step=0.6)
for z in WIN_Z:
    box(f"left_sill_wall_{z}", (LW, WIN_Y0, WIN_W), (X0 - LW / 2, WIN_Y0 / 2, z), PLASTER, bevel=0, step=0.5)
    box(f"left_head_{z}", (LW, H - WIN_Y1, WIN_W), (X0 - LW / 2, (H + WIN_Y1) / 2, z), PLASTER, bevel=0, step=0.5)
    # oak frame, mullions (3 x 4 panes), a deep sill with a plant and bottles
    for dz in (-WIN_W / 2, WIN_W / 2):
        box(f"win_jamb_{z}_{dz}", (0.12, WIN_Y1 - WIN_Y0, 0.06), (X0 - 0.06, (WIN_Y0 + WIN_Y1) / 2, z + dz - math.copysign(0.03, dz)), oak(1), bevel=0.008, step=0.6)
    box(f"win_top_{z}", (0.12, 0.07, WIN_W), (X0 - 0.06, WIN_Y1 - 0.035, z), oak(1), bevel=0.008, step=0.6)
    for k in range(1, 3):
        box(f"win_mull_v_{z}_{k}", (0.05, WIN_Y1 - WIN_Y0, 0.025), (X0 - 0.08, (WIN_Y0 + WIN_Y1) / 2, z - WIN_W / 2 + k * WIN_W / 3), oak(1), bevel=0.004, step=0.6)
    for k in range(1, 4):
        box(f"win_mull_h_{z}_{k}", (0.05, 0.025, WIN_W), (X0 - 0.08, WIN_Y0 + k * (WIN_Y1 - WIN_Y0) / 4, z), oak(1), bevel=0.004, step=0.6)
    plane(f"win_glass_{z}", WIN_W, WIN_Y1 - WIN_Y0, (X0 - 0.12, (WIN_Y0 + WIN_Y1) / 2, z), WINDOW, facing="x", keep=True)
    box(f"win_sill_{z}", (0.3, 0.05, WIN_W + 0.16), (X0 + 0.05, WIN_Y0 - 0.025, z), oak(0), bevel=0.01, step=0.5)
    # sill: a potted plant and two amber bottles
    cyl(f"sill_pot_{z}", 0.08, 0.13, (X0 + 0.08, WIN_Y0 + 0.065, z - 0.32), M("terra", rough=0.8), seg=14, r2=0.1)
    for n in range(7):
        a = n * 0.9 + R.uniform(0, 0.4)
        sphere(f"sill_leaf_{z}_{n}", 0.07, (X0 + 0.08 + 0.07 * math.cos(a), WIN_Y0 + 0.2 + 0.03 * (n % 3), z - 0.32 + 0.07 * math.sin(a)), M("leaf" if n % 2 else "leaf_dk", rough=0.8), seg=8, scale=(1, 0.5, 1.4))
    for n, dz in enumerate((0.2, 0.32)):
        cyl(f"sill_bottle_{z}_{n}", 0.04, 0.16, (X0 + 0.06, WIN_Y0 + 0.08, z + dz), M("amber_glass_noshadow", color="#b07a35", rough=0.15, alpha=0.75), seg=12)
# outside: a bright backdrop beyond the windows so the glass never shows the void
box("outside_noshadow", (0.05, H + 1, FRONT - BACK + 4), (X0 - 2.0, H / 2, (BACK + FRONT) / 2), M("outside_noshadow", color="#fff2da", emit="#fff2da", emit_strength=1.2), bevel=0, step=0, keep=True)
wall_plane("left_tiles_a", WIN_Z[0] - WIN_W / 2 - BACK, WAIN, (X0 + 0.002, WAIN / 2, (BACK + WIN_Z[0] - WIN_W / 2) / 2), SUBWAY, "x", tile=(0.9, 0.9))

# ----------------------------------------------------------------------------- the hero: two long oak benches
def bench(name, z):
    top_y = BENCH_TOP - TOP_T / 2
    box(f"{name}_top", (BENCH_L, TOP_T, BENCH_D), (0, top_y, z), oak(0, 0.5), bevel=0.012, step=0.3, segments=3)
    # a slightly raised oak lip at the back and the ends (prep benches keep beakers on)
    box(f"{name}_lip", (BENCH_L, 0.03, 0.03), (0, BENCH_TOP + 0.015, z - BENCH_D / 2 + 0.015), oak(2), bevel=0.006, step=0.6)
    # cabinet: dark oak carcass, drawers + doors in lighter oak, copper pulls
    cab_h = BENCH_TOP - TOP_T - 0.06
    box(f"{name}_carcass", (BENCH_L - 0.08, cab_h, BENCH_D - 0.1), (0, 0.06 + cab_h / 2, z), OAK_DK, bevel=0.008, step=0.4)
    box(f"{name}_kick", (BENCH_L - 0.14, 0.06, BENCH_D - 0.16), (0, 0.03, z), M("rubber", rough=0.8), bevel=0.004, step=0.6)
    nfront = 6
    w = (BENCH_L - 0.12) / nfront
    for side, zf in (("f", z + (BENCH_D - 0.1) / 2 + 0.008), ("b", z - (BENCH_D - 0.1) / 2 - 0.008)):
        for k in range(nfront):
            x = -BENCH_L / 2 + 0.06 + w * (k + 0.5)
            # top drawer + a door below
            box(f"{name}_{side}_drawer_{k}", (w - 0.025, 0.11, 0.02), (x, 0.06 + cab_h - 0.065, zf), oak(k % 3, 0.55), bevel=0.006, step=0.4)
            box(f"{name}_{side}_door_{k}", (w - 0.025, cab_h - 0.16, 0.02), (x, 0.06 + (cab_h - 0.14) / 2 + 0.005, zf), oak((k + 1) % 3, 0.55), bevel=0.006, step=0.4)
            sgn = 1 if side == "f" else -1
            box(f"{name}_{side}_pull_{k}", (0.09, 0.016, 0.018), (x, 0.06 + cab_h - 0.065, zf + sgn * 0.014), COPPER, bevel=0.004, step=0)
            cyl(f"{name}_{side}_knob_{k}", 0.012, 0.02, (x + (w / 2 - 0.05) * (1 if k % 2 else -1), 0.06 + cab_h * 0.45, zf + sgn * 0.014), COPPER, seg=10, axis="z")
    # end panels with a brass label holder
    for sx in (-1, 1):
        box(f"{name}_end_{sx}", (0.04, BENCH_TOP - TOP_T, BENCH_D - 0.04), (sx * (BENCH_L / 2 - 0.04), (BENCH_TOP - TOP_T) / 2, z), oak(1), bevel=0.008, step=0.4)
    # 12 ceramic coasters on the centre line (the beaker slots) + a thin brass guide strip in front of them
    for k in range(12):
        cyl(f"{name}_coaster_{k}", 0.068, 0.007, ((k - 5.5) * SLOT, BENCH_TOP + 0.004, z), CERAMIC, seg=28, bevel=0.002)
    box(f"{name}_strip", (12 * SLOT, 0.004, 0.01), (0, BENCH_TOP + 0.002, z + 0.115), BRASS, bevel=0, step=0)
    # copper gas taps at the back, one at each end + one in the middle (real prep benches)
    for x in (-1.08, 1.08):
        cyl(f"{name}_tap_base_{x}", 0.025, 0.03, (x, BENCH_TOP + 0.015, z - BENCH_D / 2 + 0.06), COPPER, seg=12)
        tube(f"{name}_tap_{x}", [(x, BENCH_TOP + 0.03, z - BENCH_D / 2 + 0.06), (x, BENCH_TOP + 0.12, z - BENCH_D / 2 + 0.06), (x, BENCH_TOP + 0.14, z - BENCH_D / 2 + 0.12)], 0.009, COPPER)
        cyl(f"{name}_tap_handle_{x}", 0.006, 0.06, (x, BENCH_TOP + 0.1, z - BENCH_D / 2 + 0.06), BRASS, seg=8, axis="x")
    # a few well-used marks: a stained ring and a scorch on the top (decals as thin discs)
    for (dx, dz, r, c) in [(-1.1, 0.15, 0.045, "#8a5a32"), (1.1, -0.13, 0.035, "#6e4426"), (-0.05, -0.18, 0.035, "#9a6a3e")]:
        cyl(f"{name}_stain_{dx}", r, 0.001, (dx, BENCH_TOP + 0.0006, z + dz), M(f"stain_{c}", color=c, rough=0.6), seg=20, bevel=0)


for nm, z in BENCH_Z.items():
    bench(f"bench_{nm}", z)

# ----------------------------------------------------------------------------- back wall: shelves, chalkboard, pipes
GLASS_TINTS = ["#d9e6e0", "#e8dcc6", "#cfdce0", "#e6e0d2"]
MUTED_LIQ = ["#c9a46a", "#9fb59a", "#a9b8c6", "#c7a19a", "#b8ad7a"]  # background liquids: low saturation (rule 6)


def flask(name, x, y, z, s=1.0, liquid=None):
    """Erlenmeyer: cone body + neck + rim; optional muted liquid."""
    S.cone_shell(f"{name}_body", 0.07 * s, 0.022 * s, 0.13 * s, (x, y + 0.065 * s, z), GLASS, seg=20, thickness=0.003)
    cyl(f"{name}_neck", 0.02 * s, 0.05 * s, (x, y + 0.155 * s, z), GLASS, seg=14, bevel=0, cap=False)
    if liquid:
        cyl(f"{name}_liq", 0.06 * s, 0.05 * s, (x, y + 0.028 * s, z), M(f"liq_{liquid}", color=liquid, rough=0.25, alpha=0.85), seg=18, r2=0.045 * s, bevel=0)


def round_flask(name, x, y, z, s=1.0, liquid=None):
    sphere(f"{name}_ball", 0.065 * s, (x, y + 0.065 * s, z), GLASS, seg=16)
    cyl(f"{name}_neck", 0.018 * s, 0.08 * s, (x, y + 0.16 * s, z), GLASS, seg=12, bevel=0, cap=False)
    if liquid:
        sphere(f"{name}_liq", 0.055 * s, (x, y + 0.05 * s, z), M(f"liq_{liquid}", color=liquid, rough=0.25, alpha=0.85), seg=14, scale=(1, 0.6, 1))


def bottle(name, x, y, z, h=0.2, r=0.045, mat=None):
    cyl(f"{name}_b", r, h, (x, y + h / 2, z), mat or M("amber_glass_noshadow"), seg=14)
    cyl(f"{name}_cap", r * 0.55, 0.035, (x, y + h + 0.017, z), M("rubber"), seg=10)


def shelf_unit(name, x0, x1, y0, y1, n_shelves=5, depth=0.34):
    zb = BACK + 0.01
    zc = zb + depth / 2
    for sx in (x0, x1):
        box(f"{name}_side_{sx}", (0.04, y1 - y0, depth), (sx, (y0 + y1) / 2, zc), oak(2), bevel=0.006, step=0.5)
    box(f"{name}_back", (x1 - x0, y1 - y0, 0.015), ((x0 + x1) / 2, (y0 + y1) / 2, zb + 0.008), OAK_DK, bevel=0, step=0.5)
    ys = [y0 + 0.05 + k * (y1 - y0 - 0.08) / (n_shelves - 1) for k in range(n_shelves)]
    for k, y in enumerate(ys):
        box(f"{name}_shelf_{k}", (x1 - x0 - 0.04, 0.03, depth - 0.01), ((x0 + x1) / 2, y, zc), oak(k % 3), bevel=0.005, step=0.5)
        # brass label strip on the shelf edge
        box(f"{name}_label_{k}", (x1 - x0 - 0.1, 0.018, 0.004), ((x0 + x1) / 2, y - 0.004, zc + depth / 2 - 0.003), BRASS, bevel=0, step=0)
        if k == n_shelves - 1: continue
        x = x0 + 0.08
        top = ys[k + 1] - 0.03 if k + 1 < len(ys) else y1
        while x < x1 - 0.1:
            kind = R.random()
            zz = zc + R.uniform(-0.06, 0.05)
            if kind < 0.28:
                s = R.uniform(0.8, 1.25)
                flask(f"{name}_fl_{k}_{x:.2f}", x, y + 0.015, zz, s, R.choice(MUTED_LIQ) if R.random() < 0.6 else None); x += 0.17 * s
            elif kind < 0.48:
                s = R.uniform(0.8, 1.2)
                round_flask(f"{name}_rf_{k}_{x:.2f}", x, y + 0.015, zz, s, R.choice(MUTED_LIQ) if R.random() < 0.5 else None); x += 0.15 * s
            elif kind < 0.72:
                h = min(R.uniform(0.14, 0.26), top - y - 0.06)
                bottle(f"{name}_bt_{k}_{x:.2f}", x, y + 0.015, zz, h, R.uniform(0.035, 0.05), M("amber_glass_noshadow") if R.random() < 0.6 else M("jar_glass_noshadow", color="#dfe8e2", rough=0.1, alpha=0.4)); x += 0.12
            elif kind < 0.86:
                # a row of books / binders
                for b in range(R.randint(3, 6)):
                    bh = min(R.uniform(0.2, 0.28), top - y - 0.04)
                    box(f"{name}_bk_{k}_{x:.2f}_{b}", (0.035, bh, 0.22), (x, y + 0.015 + bh / 2, zc + 0.02), M(R.choice(["book_a", "book_b", "book_c", "book_d"]), color=R.choice(["#8a5a3a", "#6f7a5a", "#a9876a", "#5e6a74", "#b89a6a"]), rough=0.8), bevel=0.003, step=0, rot_y=R.uniform(-2, 2))
                    x += 0.04
                x += 0.05
            else:
                # beaker stack / graduated cylinder
                cyl(f"{name}_grad_{k}_{x:.2f}", 0.025, min(0.3, top - y - 0.05), (x, y + 0.015 + min(0.3, top - y - 0.05) / 2, zz), GLASS, seg=12, bevel=0)
                cyl(f"{name}_grad_foot_{k}_{x:.2f}", 0.045, 0.012, (x, y + 0.021, zz), GLASS, seg=14, bevel=0)
                x += 0.1


shelf_unit("shelf_l", -3.0, -1.0, 0.0, 2.5, n_shelves=6)
shelf_unit("shelf_r", 1.75, 2.95, 0.0, 2.5, n_shelves=6)

# chalkboard between the shelves (oak frame, chalk tray with chalk + a duster)
CB = (-0.8, 1.55, 1.38, 2.42)  # x0, x1, y0, y1
cbw, cbh = CB[1] - CB[0], CB[3] - CB[2]
plane("chalkboard", cbw, cbh, ((CB[0] + CB[1]) / 2, (CB[2] + CB[3]) / 2, BACK + 0.04), M("chalk", rough=0.85, image=image("chalk_img", 1024, 380, _chalk)), facing="z")
for (w_, h_, x_, y_) in [(cbw + 0.1, 0.06, (CB[0] + CB[1]) / 2, CB[3] + 0.03), (cbw + 0.1, 0.06, (CB[0] + CB[1]) / 2, CB[2] - 0.03), (0.06, cbh, CB[0] - 0.02, (CB[2] + CB[3]) / 2), (0.06, cbh, CB[1] + 0.02, (CB[2] + CB[3]) / 2)]:
    box(f"cb_frame_{x_:.2f}_{y_:.2f}", (w_, h_, 0.05), (x_, y_, BACK + 0.04), oak(1), bevel=0.008, step=0.5)
box("cb_tray", (cbw, 0.025, 0.08), ((CB[0] + CB[1]) / 2, CB[2] - 0.07, BACK + 0.08), oak(2), bevel=0.005, step=0.5)
for k, x in enumerate((-0.4, -0.33, 0.5)):
    cyl(f"chalk_stick_{k}", 0.008, 0.07, (x, CB[2] - 0.05, BACK + 0.085), M("chalk_white", color="#f4f0e6", rough=0.9), seg=8, axis="x")
box("duster", (0.14, 0.035, 0.05), (1.1, CB[2] - 0.04, BACK + 0.08), M("fabric_dk", rough=0.95), bevel=0.008, step=0)
# a wall clock above the chalkboard (hands are a kept node for the episode)
cyl("clock_rim", 0.2, 0.05, (0.5, 2.8, BACK + 0.04), COPPER, seg=36, axis="z", bevel=0.006)
cyl("clock_face", 0.175, 0.01, (0.5, 2.78, BACK + 0.068), M("ceramic"), seg=36, axis="z", bevel=0)
for k in range(12):
    a = k * math.pi / 6
    box(f"clock_tick_{k}", (0.012, 0.03 if k % 3 else 0.045, 0.004), (0.5 + 0.15 * math.sin(a), 2.78 + 0.15 * math.cos(a), BACK + 0.075), M("iron"), bevel=0, step=0, rot=(0, 0, -math.degrees(a)))
box("clock_hand_h", (0.012, 0.09, 0.004), (0.5 + 0.03, 2.78 + 0.03, BACK + 0.08), M("iron"), bevel=0, step=0, rot=(0, 0, -50))
box("clock_hand_m", (0.008, 0.13, 0.004), (0.5 - 0.0, 2.78 + 0.06, BACK + 0.082), M("iron"), bevel=0, step=0, rot=(0, 0, 10))
# copper pipes along the back wall (gas + water), with brackets, down into the right counter
for k, y in enumerate((1.02, 1.1)):
    poly_tube(f"pipe_back_{k}", [(-1.0, y, BACK + 0.05 + 0.025 * k), (1.75, y, BACK + 0.05 + 0.025 * k)], 0.016, COPPER)
    for x in (-0.95, 0.0, 0.9, 1.7):
        box(f"pipe_bracket_{k}_{x}", (0.03, 0.05, 0.06), (x, y, BACK + 0.04), IRON, bevel=0.004, step=0)
# a poster (original art) on the right wall + a coat hook rail with two lab coats
plane("poster", 0.8, 1.05, (X1 - 0.01, 1.95, 0.6), M("poster", rough=0.8, image=image("poster_img", 384, 512, _poster)), facing="-x")
box("hook_rail", (0.04, 0.08, 1.2), (X1 - 0.03, 1.75, 2.0), oak(1), bevel=0.006, step=0.5)
for k, z in enumerate((1.7, 2.25)):
    cyl(f"hook_{k}", 0.01, 0.07, (X1 - 0.07, 1.75, z), BRASS, seg=8, axis="x")
    S.cone_shell(f"coat_{k}", 0.12, 0.2, 0.9, (X1 - 0.16, 1.28, z), M("fabric", rough=0.95), seg=16, thickness=0.02)
    sphere(f"coat_shoulder_{k}", 0.13, (X1 - 0.15, 1.72, z), M("fabric"), seg=12, scale=(0.7, 0.35, 1.2))

# ----------------------------------------------------------------------------- right side counter (sink, copper kettle, burner)
SC_X, SC_Z0, SC_Z1, SC_H = X1 - 0.33, -3.3, -0.75, 0.42
box("side_top", (0.62, 0.05, SC_Z1 - SC_Z0), (SC_X, SC_H - 0.025, (SC_Z0 + SC_Z1) / 2), oak(2, 0.5), bevel=0.01, step=0.4)
box("side_cab", (0.56, SC_H - 0.11, SC_Z1 - SC_Z0 - 0.06), (SC_X, 0.06 + (SC_H - 0.11) / 2, (SC_Z0 + SC_Z1) / 2), OAK_DK, bevel=0.008, step=0.4)
for k in range(5):
    zc = SC_Z0 + 0.05 + (k + 0.5) * (SC_Z1 - SC_Z0 - 0.1) / 5
    box(f"side_door_{k}", (0.02, SC_H - 0.16, (SC_Z1 - SC_Z0 - 0.1) / 5 - 0.03), (SC_X - 0.29, 0.06 + (SC_H - 0.16) / 2 + 0.01, zc), oak(k % 3), bevel=0.006, step=0.4)
    box(f"side_pull_{k}", (0.018, 0.016, 0.08), (SC_X - 0.305, SC_H - 0.12, zc), COPPER, bevel=0.004, step=0)
# ceramic sink + copper swan-neck tap
box("sink", (0.42, 0.14, 0.5), (SC_X, SC_H - 0.04, -1.1), CERAMIC, bevel=0.03, step=0.3, segments=3)
tube("sink_tap", [(SC_X + 0.22, SC_H, -1.1), (SC_X + 0.22, SC_H + 0.3, -1.1), (SC_X + 0.08, SC_H + 0.36, -1.1), (SC_X - 0.02, SC_H + 0.25, -1.1)], 0.014, COPPER)
# copper kettle / still with a coil
cyl("kettle", 0.13, 0.2, (SC_X, SC_H + 0.1, -1.75), COPPER, seg=28, r2=0.1, bevel=0.01)
sphere("kettle_dome", 0.1, (SC_X, SC_H + 0.2, -1.75), COPPER, seg=20, scale=(1, 0.6, 1))
tube("kettle_neck", [(SC_X, SC_H + 0.26, -1.75), (SC_X - 0.05, SC_H + 0.42, -1.87), (SC_X - 0.1, SC_H + 0.36, -2.1)], 0.015, COPPER_DK)
for k in range(5):
    torus(f"coil_{k}", 0.06, 0.008, (SC_X - 0.1, SC_H + 0.06 + k * 0.05, -2.2), COPPER, seg=24, minor=6, facing="y")
# a burner on a tripod (the flame is a React practical)
cyl("burner_base", 0.045, 0.02, (SC_X - 0.02, SC_H + 0.01, -2.6), IRON, seg=16)
cyl("burner_tube", 0.014, 0.12, (SC_X - 0.02, SC_H + 0.08, -2.6), BRASS, seg=12)
for k in range(3):
    a = k * 2 * math.pi / 3
    poly_tube(f"tripod_leg_{k}", [(SC_X - 0.02 + 0.1 * math.cos(a), SC_H, -2.6 + 0.1 * math.sin(a)), (SC_X - 0.02 + 0.07 * math.cos(a), SC_H + 0.2, -2.6 + 0.07 * math.sin(a))], 0.006, IRON)
torus("tripod_ring", 0.075, 0.007, (SC_X - 0.02, SC_H + 0.2, -2.6), IRON, seg=24, minor=6, facing="y")
box("gauze", (0.16, 0.004, 0.16), (SC_X - 0.02, SC_H + 0.207, -2.6), M("gauze", color="#9a9690", rough=0.7, metal=0.4), bevel=0, step=0)
round_flask("side_rf", SC_X - 0.02, SC_H + 0.21, -2.6, 1.1, "#c9a46a")
# racks of test tubes on the side counter
for k in range(2):
    zr = -1.85 + k * 0.0
    box(f"tube_rack_{k}", (0.12, 0.012, 0.34), (SC_X - 0.12 + k * 0.16, SC_H + 0.1, -3.05), oak(1), bevel=0.003, step=0)
    box(f"tube_rack_base_{k}", (0.12, 0.012, 0.34), (SC_X - 0.12 + k * 0.16, SC_H + 0.006, -3.05), oak(1), bevel=0.003, step=0)
    for t in range(5):
        cyl(f"tt_{k}_{t}", 0.012, 0.13, (SC_X - 0.12 + k * 0.16, SC_H + 0.07, -3.18 + t * 0.065), GLASS, seg=10, bevel=0)
        cyl(f"tt_liq_{k}_{t}", 0.01, 0.05, (SC_X - 0.12 + k * 0.16, SC_H + 0.035, -3.18 + t * 0.065), M(f"liq_{MUTED_LIQ[(t + k) % 5]}", color=MUTED_LIQ[(t + k) % 5], rough=0.25, alpha=0.85), seg=10, bevel=0)

# ----------------------------------------------------------------------------- foreground framing (close to the camera)
# an oak trolley with glassware on the left, a retort stand + round flask on the right
TX, TZ = -1.55, 1.55
box("trolley_top", (0.9, 0.035, 0.5), (TX, 0.46, TZ), oak(1), bevel=0.008, step=0.3)
box("trolley_mid", (0.9, 0.03, 0.5), (TX, 0.18, TZ), oak(2), bevel=0.008, step=0.3)
for sx in (-1, 1):
    for sz in (-1, 1):
        cyl(f"trolley_leg_{sx}_{sz}", 0.015, 0.45, (TX + sx * 0.42, 0.25, TZ + sz * 0.22), BRASS, seg=10)
        sphere(f"trolley_wheel_{sx}_{sz}", 0.025, (TX + sx * 0.42, 0.025, TZ + sz * 0.22), M("rubber"), seg=10)
for k, (dx, dz) in enumerate([(-0.3, 0.05), (-0.1, -0.1), (0.12, 0.08), (0.3, -0.06)]):
    (flask if k % 2 == 0 else round_flask)(f"fg_glass_{k}", TX + dx, 0.478, TZ + dz, 1.3, MUTED_LIQ[k] if k != 2 else None)
for k in range(3):
    bottle(f"fg_bottle_{k}", TX - 0.25 + k * 0.22, 0.195, TZ, 0.16, 0.05)
RX, RZ = 1.6, 1.35
box("retort_base", (0.3, 0.02, 0.2), (RX, 0.01, RZ), IRON, bevel=0.004, step=0)
cyl("retort_rod", 0.008, 0.9, (RX - 0.1, 0.46, RZ), IRON, seg=10)
for y in (0.35, 0.62):
    poly_tube(f"retort_clamp_{y}", [(RX - 0.1, y, RZ), (RX + 0.05, y, RZ)], 0.007, IRON)
torus("retort_ring", 0.06, 0.006, (RX + 0.07, 0.35, RZ), IRON, seg=20, minor=6, facing="y")
round_flask("retort_flask", RX + 0.07, 0.35, RZ, 1.4, "#c7a19a")

# ----------------------------------------------------------------------------- pendant lamps over the benches (copper shades)
for k, (x, z) in enumerate([(-1.45, -2.1), (1.45, -2.1)]):
    poly_tube(f"pend_cord_{k}", [(x, H, z), (x, 2.45, z)], 0.006, M("rubber"))
    S.cone_shell(f"pend_shade_{k}", 0.18, 0.045, 0.16, (x, 2.38, z), COPPER, seg=28, thickness=0.006)
    sphere(f"pend_bulb_{k}_noshadow", 0.045, (x, 2.32, z), M("bulb_noshadow", color="#fff1cf", emit="#ffd99a", emit_strength=6.0), seg=12, keep=True)
box("ceiling", (X1 - X0, 0.1, FRONT - BACK), (0, H + 0.05, (BACK + FRONT) / 2), PLASTER, bevel=0, step=1.0)

tris = S.finish(ao_tint="#9a6a46", ao_floor=0.5)
