"""Night plaza (EP06 "Zuzu's Dizzy Walk"): procedural build -> night-plaza.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/night-plaza/build_night_plaza.py [-- --no-bake]

Concept: "Lab Club Courtyard at night", the lab's long stone-tiled courtyard, enclosed on three sides by the lab
building (U-shape). Palette: deep navy, cool moonlight blue, warm lamp orange, (React) yellow glowing trails.
Light story: a cool moon high behind-left is the key (soft shadows); warm iron street lamps along both hedges make
pools of light (React point lights + floor glow decals); the lab's lit windows and the glowing start marker are the
practicals; light navy fog.
Hero piece: the big grid of square stone tiles (TILE = 0.4 m, one tile per step) with the glowing start ring at the
origin, and brass distance plates every 10 tiles beside Lumi's straight lane (tile column 2, x = 0.8, heading north = -z).
Depth: lamp posts, planters and hedges in the foreground, the plaza midground, the lab facade with lit windows behind.

Layout (three.js metres, shared with episodes/src/sets/night-plaza/layout.ts):
  tile centres at (i * 0.4, 0, -j * 0.4), i = east, j = north; start tile (0, 0) at the origin;
  paved x -10.2..10.2 (±25 tiles), z -44.2..10.2 (110 tiles north, 25 south); Lumi's lane x = 0.8 (column 2, so she
  never shares a tile with Zuzu's walk from the origin), tile 100 at z = -40;
  lab facade at z = -46.6 (entrance steps z -44.2..-46.2), side wings x = ±13.4 from z = -46.6 to -12;
  hedges x = ±10.75, lamps every 6 m on both sides (z = 8 .. -40), foreground planters at x = ±4.6, z = 11.3.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import bmesh
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "navy": "#141c36", "navy_dk": "#0c1226", "navy_lt": "#26304f",
    "stone": "#7d8396", "stone_lt": "#9a9fb0", "stone_dk": "#5d6377", "grout": "#2a3046",
    "facade": "#8a8ea0", "facade_dk": "#6b7084", "trim": "#a9adbb", "roof": "#1c2440",
    "iron": "#23283a", "brass": "#c9a45c", "copper": "#5e8f86",
    "lamp": "#ffb35c", "warm": "#ffc47a", "cool": "#9cc4ff",
    "hedge": "#2f5a3c", "hedge_dk": "#22432d", "leaf": "#3b6b45", "bark": "#4a3b30",
    "wood": "#7a5a40", "soil": "#2c241e", "planter": "#6f7486",
}
S.begin("night-plaza", HERE, PAL)
R = S.R

# ---- layout (keep in sync with episodes/src/sets/night-plaza/layout.ts)
TILE = 0.4
PX0, PX1 = -10.2, 10.2          # paved east-west
PZ_N, PZ_S = -44.2, 10.2        # paved north (lab steps) .. south (camera side)
FACADE_Z = -46.6
WING_X = 13.4
WING_Z1 = -12.0
HEDGE_X = 10.75
LAMP_Z = [8.0, 2.0, -4.0, -10.0, -16.0, -22.0, -28.0, -34.0, -40.0]
LAMP_X = 10.0                   # lamp posts stand just inside the hedges
LAMP_H = 3.4


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


N_T = 8  # tiles per texture repeat (8 x 8 tiles = 3.2 m)


def _tiles(u, v):
    """8x8 square stone tiles: per-tile tone, speckle, soft worn edges, dark grout. Tile boundaries at u, v = k/8."""
    o = fill(u, "#7d8396")
    i = np.floor(u * N_T).clip(0, N_T - 1).astype(int); j = np.floor(v * N_T).clip(0, N_T - 1).astype(int)
    fu = u * N_T - i; fv = v * N_T - j
    rr = np.random.RandomState(61); tone = rr.uniform(-0.09, 0.09, (N_T, N_T)); hue = rr.uniform(-0.03, 0.03, (N_T, N_T))
    k = tone[j, i]
    o[..., 0] *= 1 + k - hue[j, i]; o[..., 1] *= 1 + k; o[..., 2] *= 1 + k + hue[j, i]
    shade(o, (_noise(u, v, 64, 3) - 0.5) * 0.10 + (_noise(u, v, 220, 4) - 0.5) * 0.10)
    sp = np.random.RandomState(5).rand(*u.shape)
    paint(o, sp > 0.985, "#b9bdca", 0.35); paint(o, sp < 0.012, "#3d4254", 0.4)
    e = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv))
    shade(o, -0.22 * np.clip(1 - e / 0.07, 0, 1) ** 2)                  # worn, slightly darker bevel
    paint(o, e < 0.022, "#262b3e")                                       # grout
    shade(o, (_noise(u, v, 6, 8) - 0.5) * 0.16)                          # large-scale wear
    return o


TILE_IMG = image("tiles", 2048, 2048, _tiles)


def _leaves(u, v):
    o = fill(u, "#2f5a3c")
    shade(o, (_noise(u, v, 40, 21) - 0.5) * 0.5 + (_noise(u, v, 140, 22) - 0.5) * 0.45)
    sp = np.random.RandomState(23).rand(*u.shape)
    paint(o, sp > 0.93, "#4f8559", 0.5); paint(o, sp < 0.05, "#17301f", 0.6)
    return o


LEAF_IMG = image("leaves", 512, 512, _leaves)


def _window(u, v):
    """Lit office window: warm gradient, blinds, a plant / shelf silhouette near the bottom."""
    o = fill(u, "#ffc47a")
    shade(o, (v - 0.5) * 0.35 + (_noise(u, v, 4, 31) - 0.5) * 0.3)
    blinds = (np.floor(v * 14) % 2 == 0) & (v > 0.55)
    shade(o, np.where(blinds, -0.18, 0.0))
    paint(o, (v < 0.18) & (np.abs(u - 0.3) < 0.08 + 0.05 * np.sin(v * 40)), "#6b3f1c", 0.75)   # plant
    paint(o, (v > 0.2) & (v < 0.23) & (u > 0.5) & (u < 0.92), "#7a4a24", 0.7)                  # shelf
    for x0 in (0.55, 0.62, 0.7, 0.8):
        paint(o, (v > 0.23) & (v < 0.23 + 0.12 + 0.05 * x0) & (u > x0) & (u < x0 + 0.05), "#8a5530", 0.6)
    return o


WIN_IMG = image("window", 128, 192, _window)




def uv_world(ob, scale, ox=0.0, oy=0.0):
    """UVs from Blender x/y in metres (top-down planes): u = (x + ox) / scale, v = (y + oy) / scale."""
    me = ob.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            me.uv_layers[0].data[li].uv = ((co.x + ob.location.x + ox) / scale, (co.y + ob.location.y + oy) / scale)


def grid_plane(name, x0, x1, z0, z1, y, mat, seg=1.0):
    bm = S._bm()
    nx = max(1, int((x1 - x0) / seg)); nz = max(1, int((z1 - z0) / seg))
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=nz, size=0.5, calc_uvs=True)
    for vtx in bm.verts: vtx.co = S.Vector((vtx.co.x * (x1 - x0), vtx.co.y * (z1 - z0), 0))
    ob = S._obj(name, bm, mat)
    ob.location = S.P((x0 + x1) / 2, y, (z0 + z1) / 2)
    return ob


# ----------------------------------------------------------------------------- the plaza floor (hero)
STONE = M("tiles", rough=0.52, image=TILE_IMG)
fl = grid_plane("floor", PX0, PX1, PZ_N, PZ_S, 0.0, STONE, seg=0.8)
# tile boundaries at x = ±0.2 + k·0.4 -> u = (x + 0.2) / 3.2; three z = -blender y, boundaries at the same offsets
uv_world(fl, TILE * N_T, ox=TILE / 2, oy=TILE / 2)
# a dark granite kerb around the paving
for sgn in (-1, 1):
    box(f"kerb_{sgn}", (0.18, 0.08, PZ_S - PZ_N), (sgn * (PX1 + 0.09), 0.03, (PZ_N + PZ_S) / 2), M("stone_dk", rough=0.7), bevel=0.01, step=1.0)
box("kerb_s", (PX1 - PX0 + 0.36, 0.08, 0.18), (0, 0.03, PZ_S + 0.09), M("stone_dk"), bevel=0.01, step=1.0)
# the ground beyond the paving (dark lawn / gravel strips under the hedges)
for sgn in (-1, 1):
    grid_plane(f"verge_{sgn}", PX1 + 0.18 if sgn > 0 else -WING_X - 1.0, WING_X + 1.0 if sgn > 0 else PX0 - 0.18, PZ_N - 1, PZ_S + 6, -0.005, M("soil", rough=0.95), seg=2.0)
grid_plane("verge_s", PX0 - 3, PX1 + 3, PZ_S + 0.18, PZ_S + 8, -0.005, M("soil"), seg=2.0)

# start marker: brass ring inlay on the start tile + an outer ring with 4 ticks (the glow is a separate kept node)
torus("start_ring_brass", 0.17, 0.012, (0, 0.004, 0), M("brass", rough=0.3, metal=0.9), seg=48, minor=6, facing="y")
torus("start_ring_outer", 0.52, 0.014, (0, 0.004, 0), M("brass"), seg=64, minor=6, facing="y")
for a in range(4):
    th = a * math.pi / 2
    box(f"start_tick_{a}", (0.03, 0.008, 0.16), (0.6 * math.sin(th), 0.004, 0.6 * math.cos(th)), M("brass"), bevel=0, step=0, rot_y=math.degrees(th))
cyl("start_glow", 0.15, 0.006, (0, 0.003, 0), M("start_glow_noshadow", color="#ffd84a", rough=0.4, emit="#ffd84a", emit_strength=3.0), seg=40, bevel=0, keep=True)
text("start_label", "START", 0.16, (0, 0.006, 0.82), M("brass"), extrude=0.003).rotation_euler = (0, 0, 0)

# distance plates every 10 tiles beside Lumi's lane (tile column 1, between the start and the lane): brass plate +
# engraved number; Lumi's start line is a brass bar across her lane at the south edge of tile (2, 0)
LANE_X = 2 * TILE
box("lane_start", (0.34, 0.01, 0.035), (LANE_X, 0.004, TILE / 2), M("brass"), bevel=0.003, step=0, segments=1)
for n in range(10, 101, 10):
    zc = -n * TILE
    box(f"plate_{n}", (0.3, 0.012, 0.2), (TILE, 0.004, zc), M("brass"), bevel=0.004, step=0, segments=1)
    t = text(f"plate_num_{n}", str(n), 0.13, (TILE, 0.012, zc), M("navy_dk", rough=0.5), extrude=0.002)
    t.rotation_euler = (0, 0, 0)
# the 100 tile gets a larger brass medallion
torus("ring_100", 0.17, 0.012, (LANE_X, 0.004, -100 * TILE), M("brass"), seg=40, minor=6, facing="y")

# drain grates and small manhole covers (detail, kept off Lumi's lane)
for (x, z) in [(-3.6, -6.0), (4.4, -14.0), (-5.2, -26.0), (3.0, 4.4), (-7.6, 6.0), (6.8, -36.0)]:
    box(f"grate_{x}_{z}", (0.36, 0.01, 0.36), (x, 0.002, z), M("iron", rough=0.5, metal=0.6), bevel=0.004, step=0)
    for k in range(5):
        box(f"grate_bar_{x}_{z}_{k}", (0.3, 0.012, 0.025), (x, 0.006, z - 0.12 + k * 0.06), M("navy_dk", rough=0.6), bevel=0, step=0)

# ----------------------------------------------------------------------------- hedges along both long sides
HEDGE = M("hedge", rough=0.92, image=LEAF_IMG)
for sgn in (-1, 1):
    zs = [PZ_S + 2.0] + LAMP_Z + [PZ_N - 1.2]
    for a, b in zip(zs[:-1], zs[1:]):
        z0, z1 = b + 0.5, a - 0.5
        if z1 - z0 < 0.4: continue
        h = 1.05 + R.uniform(-0.05, 0.05)
        box(f"hedge_{sgn}_{a}", (0.9, h, z1 - z0), (sgn * HEDGE_X, h / 2, (z0 + z1) / 2), HEDGE, bevel=0.12, step=0.6, segments=3)
        # topiary balls in planters between the hedge runs
    for z in LAMP_Z:
        cyl(f"hedge_post_{sgn}_{z}", 0.32, 0.5, (sgn * HEDGE_X, 0.25, z), M("planter", rough=0.75), seg=16, r2=0.36, bevel=0.01)
        sphere(f"topiary_{sgn}_{z}", 0.4, (sgn * HEDGE_X, 0.85, z + (0.0 if sgn > 0 else 0.0)), HEDGE, seg=14)

# ----------------------------------------------------------------------------- street lamps (iron posts, lantern heads)
IRON = M("iron", rough=0.45, metal=0.65)
LAMP_GLASS = M("lamp_glass_noshadow", color="#ffcf8a", rough=0.3, emit="#ffb35c", emit_strength=6.0)


def lamp_post(name, x, z, h=LAMP_H, arm=0.0):
    cyl(f"{name}_base", 0.16, 0.32, (x, 0.16, z), IRON, seg=12, r2=0.11, bevel=0.01)
    cyl(f"{name}_plinth", 0.2, 0.06, (x, 0.03, z), IRON, seg=12, bevel=0.008)
    cyl(f"{name}_pole", 0.045, h - 0.5, (x, 0.32 + (h - 0.5) / 2, z), IRON, seg=10, r2=0.035, bevel=0)
    for y in (0.9, h - 0.35):
        torus(f"{name}_ring_{y}", 0.055, 0.016, (x, y, z), IRON, seg=16, minor=6, facing="y")
    # lantern: tapered glass, 4 corner bars, a cap and a finial
    yh = h - 0.05
    cyl(f"{name}_glass", 0.12, 0.34, (x, yh, z), LAMP_GLASS, seg=8, r2=0.16, bevel=0)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        poly_tube(f"{name}_bar_{k}", [(x + 0.12 * math.cos(a), yh - 0.17, z + 0.12 * math.sin(a)), (x + 0.165 * math.cos(a), yh + 0.17, z + 0.165 * math.sin(a))], 0.01, IRON)
    cyl(f"{name}_cap", 0.2, 0.1, (x, yh + 0.22, z), IRON, seg=8, r2=0.05, bevel=0.006)
    sphere(f"{name}_finial", 0.035, (x, yh + 0.31, z), IRON, seg=10)
    cyl(f"{name}_cup", 0.11, 0.06, (x, yh - 0.2, z), IRON, seg=8, r2=0.08, bevel=0.004)


for sgn in (-1, 1):
    for z in LAMP_Z:
        lamp_post(f"lamp_{sgn}_{z}", sgn * LAMP_X, z + 0.0)

# ----------------------------------------------------------------------------- benches between the lamps (facing the plaza)
WOOD = M("wood", rough=0.7)
for sgn in (-1, 1):
    for z in (5.0, -7.0, -19.0, -31.0):
        x = sgn * (HEDGE_X - 0.75)
        for k in range(4):
            box(f"bench_slat_{sgn}_{z}_{k}", (0.09, 0.035, 1.5), (x - sgn * (0.06 - k * 0.1) * -1, 0.44, z), WOOD, bevel=0.008, step=0.5)
        for k in range(3):
            box(f"bench_back_{sgn}_{z}_{k}", (0.03, 0.08, 1.5), (x + sgn * 0.2, 0.6 + k * 0.12, z), WOOD, bevel=0.008, step=0.5)
        for dz in (-0.62, 0.62):
            box(f"bench_leg_{sgn}_{z}_{dz}", (0.42, 0.44, 0.05), (x + sgn * 0.05, 0.22, z + dz), IRON, bevel=0.01, step=0)
            box(f"bench_upr_{sgn}_{z}_{dz}", (0.04, 0.4, 0.05), (x + sgn * 0.22, 0.65, z + dz), IRON, bevel=0.006, step=0)

# ----------------------------------------------------------------------------- foreground framing (camera side)
for sgn in (-1, 1):
    x = sgn * 4.6
    box(f"fg_planter_{sgn}", (2.2, 0.55, 0.9), (x, 0.275, 11.3), M("planter", rough=0.75), bevel=0.03, step=0.5)
    box(f"fg_planter_cap_{sgn}", (2.3, 0.06, 1.0), (x, 0.58, 11.3), M("trim", rough=0.6), bevel=0.012, step=0.6)
    box(f"fg_hedge_{sgn}", (2.0, 0.6, 0.72), (x, 0.88, 11.3), HEDGE, bevel=0.1, step=0.5, segments=3)
    lamp_post(f"fg_lamp_{sgn}", sgn * 2.6, 11.4, h=3.6)
    # a young tree in a round planter at the open south corners
    cyl(f"tree_pot_{sgn}", 0.7, 0.6, (sgn * 8.2, 0.3, 12.0), M("planter"), seg=20, r2=0.78, bevel=0.02)
    cyl(f"tree_trunk_{sgn}", 0.09, 2.6, (sgn * 8.2, 1.6, 12.0), M("bark", rough=0.9), seg=10, r2=0.06, bevel=0)
    for k in range(6):
        sphere(f"tree_crown_{sgn}_{k}", R.uniform(0.6, 0.9), (sgn * 8.2 + R.uniform(-0.5, 0.5), 3.0 + R.uniform(-0.2, 0.7), 12.0 + R.uniform(-0.5, 0.5)), M("leaf", rough=0.9, image=LEAF_IMG), seg=12)
# bollards across the south entrance
for x in np.arange(-1.6, 1.61, 0.8):
    cyl(f"bollard_{x:.1f}", 0.08, 0.7, (x, 0.35, 10.6), IRON, seg=12, bevel=0.01)
    sphere(f"bollard_top_{x:.1f}", 0.085, (x, 0.7, 10.6), IRON, seg=10)
    torus(f"bollard_band_{x:.1f}", 0.083, 0.01, (x, 0.58, 10.6), M("brass"), seg=16, minor=4, facing="y")

# ----------------------------------------------------------------------------- the lab building (U-shape)
FAC = M("facade", rough=0.85)
FAC_DK = M("facade_dk", rough=0.85)
TRIM = M("trim", rough=0.6)
ROOF = M("roof", rough=0.7)
FRAME = M("navy_dk", rough=0.5, metal=0.2)
WIN_MATS = [
    M("win_warm_noshadow", color="#ffc47a", rough=0.3, image=WIN_IMG, emit="#ffffff", emit_image=True, emit_strength=2.2),
    M("win_dim_noshadow", color="#c8925a", rough=0.3, image=WIN_IMG, emit="#ffffff", emit_image=True, emit_strength=0.8),
    M("win_cool_noshadow", color="#6f9ee8", rough=0.3, emit="#7fb0ff", emit_strength=1.4),
    M("win_dark", color="#1a2238", rough=0.15, metal=0.3),
]
FLOORS = [1.2, 4.6, 8.0]       # window sill heights
WIN_W, WIN_H = 1.3, 2.1
LIT = [0.55, 0.2, 0.08, 0.17]  # warm, dim, cool, dark


def window(name, c, facing, w=WIN_W, h=WIN_H):
    """A window on a wall: c = centre of the pane on the wall face, facing '+z' | '+x' | '-x'."""
    x, y, z = c
    mat = WIN_MATS[int(np.searchsorted(np.cumsum(LIT), R.random()))]
    if facing == "+z":
        plane(f"{name}_pane", w - 0.1, h - 0.1, (x, y, z + 0.005), mat, facing="z")
        box(f"{name}_sill", (w + 0.2, 0.08, 0.18), (x, y - h / 2 - 0.04, z + 0.07), TRIM, bevel=0.01, step=0)
        box(f"{name}_head", (w + 0.12, 0.12, 0.1), (x, y + h / 2 + 0.06, z + 0.03), TRIM, bevel=0.01, step=0)
        for dx in (-1, 1):
            box(f"{name}_jamb_{dx}", (0.06, h, 0.06), (x + dx * (w / 2 - 0.03), y, z + 0.03), FRAME, bevel=0.005, step=0)
        box(f"{name}_mull", (0.04, h, 0.04), (x, y, z + 0.03), FRAME, bevel=0, step=0)
        box(f"{name}_tr", (w, 0.04, 0.04), (x, y + h * 0.22, z + 0.03), FRAME, bevel=0, step=0)
    else:
        s = 1 if facing == "+x" else -1
        plane(f"{name}_pane", w - 0.1, h - 0.1, (x + s * 0.005, y, z), mat, facing="x" if s > 0 else "-x")
        box(f"{name}_sill", (0.18, 0.08, w + 0.2), (x + s * 0.07, y - h / 2 - 0.04, z), TRIM, bevel=0.01, step=0)
        box(f"{name}_head", (0.1, 0.12, w + 0.12), (x + s * 0.03, y + h / 2 + 0.06, z), TRIM, bevel=0.01, step=0)
        for dz in (-1, 1):
            box(f"{name}_jamb_{dz}", (0.06, h, 0.06), (x + s * 0.03, y, z + dz * (w / 2 - 0.03)), FRAME, bevel=0.005, step=0)
        box(f"{name}_mull", (0.04, h, 0.04), (x + s * 0.03, y, z), FRAME, bevel=0, step=0)


# main facade (north end): 3 storeys + a parapet, a central entrance bay with a canopy and an observatory dome
FW = 2 * WING_X + 2.4
FH = 10.6
box("facade_wall", (FW, FH, 6.0), (0, FH / 2, FACADE_Z - 3.0), FAC, bevel=0.02, step=1.2)
box("facade_plinth", (FW + 0.1, 0.9, 1.2), (0, 0.45, FACADE_Z - 0.45), FAC_DK, bevel=0.02, step=1.2)
for y in (3.85, 7.25):
    box(f"facade_band_{y}", (FW + 0.06, 0.18, 1.16), (0, y, FACADE_Z - 0.48), TRIM, bevel=0.015, step=1.2)
box("facade_cornice", (FW + 0.4, 0.35, 1.5), (0, FH + 0.1, FACADE_Z - 0.45), TRIM, bevel=0.03, step=1.2)
box("facade_parapet", (FW + 0.2, 0.7, 0.4), (0, FH + 0.6, FACADE_Z - 0.25), FAC_DK, bevel=0.02, step=1.2)
for k, x in enumerate(np.arange(-FW / 2 + 1.3, FW / 2 - 1.0, 2.15)):
    if abs(x) < 2.6: continue
    box(f"pilaster_{k}", (0.34, FH - 0.9, 0.16), (x - 1.07, 0.9 + (FH - 0.9) / 2, FACADE_Z + 0.08), FAC_DK, bevel=0.015, step=1.0)
    for y in FLOORS:
        window(f"fw_{k}_{y}", (x, y + WIN_H / 2, FACADE_Z + 0.0), "+z")
# entrance bay: a projecting portal, glass double door, canopy, lit sign
box("portal", (5.0, 8.2, 0.8), (0, 4.1, FACADE_Z + 0.4), FAC, bevel=0.03, step=1.0)
box("portal_frame", (3.2, 3.6, 0.2), (0, 2.7, FACADE_Z + 0.85), TRIM, bevel=0.02, step=0.6)
plane("portal_door_glass", 2.6, 3.0, (0, 2.6, FACADE_Z + 0.96), WIN_MATS[0], facing="z")
box("portal_door_mull", (0.06, 3.0, 0.06), (0, 2.6, FACADE_Z + 0.98), FRAME, bevel=0, step=0)
for dx in (-0.65, 0.65):
    box(f"portal_handle_{dx}", (0.03, 0.6, 0.04), (dx * 0.25, 2.3, FACADE_Z + 1.0), M("brass"), bevel=0, step=0)
box("canopy", (4.4, 0.18, 1.8), (0, 4.75, FACADE_Z + 1.5), ROOF, bevel=0.02, step=0.6)
for dx in (-1.9, 1.9):
    poly_tube(f"canopy_rod_{dx}", [(dx, 4.84, FACADE_Z + 2.3), (dx, 6.3, FACADE_Z + 0.85)], 0.02, IRON)
cyl("canopy_light", 0.25, 0.04, (0, 4.64, FACADE_Z + 1.6), M("lamp_glass_noshadow"), seg=16, bevel=0)
box("sign_board", (3.4, 0.7, 0.12), (0, 6.6, FACADE_Z + 0.86), M("navy_dk", rough=0.4), bevel=0.02, step=0)
text("sign_text", "LAB CLUB", 0.42, (0, 6.6, FACADE_Z + 0.93), M("sign_noshadow", color="#ffe0a0", emit="#ffcf7a", emit_strength=4.0), extrude=0.02)
window("portal_win", (0, 9.1, FACADE_Z + 0.8), "+z", w=2.4, h=1.6)
# entrance steps (plaza edge z -44.2 up to the portal at z -45.8)
for k in range(4):
    zf, zb = PZ_N - k * 0.4, FACADE_Z + 0.8
    box(f"step_{k}", (6.0 - k * 0.3, 0.15, zf - zb), (0, 0.075 + k * 0.15, (zf + zb) / 2), FAC_DK, bevel=0.01, step=0.8)
# observatory dome on the roof (science silhouette against the sky)
cyl("dome_drum", 2.0, 1.4, (0, FH + 1.3, FACADE_Z - 2.0), FAC_DK, seg=32, bevel=0.02)
S.sphere("dome", 2.0, (0, FH + 2.0, FACADE_Z - 2.0), M("copper", rough=0.5, metal=0.5), seg=32, scale=(1, 0.9, 1))
box("dome_slit", (0.5, 2.0, 0.2), (0, FH + 2.9, FACADE_Z - 0.18), M("win_cool_noshadow"), bevel=0, step=0, rot=(-35, 0, 0))
# roof clutter: vents, an antenna mast with a red beacon
for x in (-9.0, -6.5, 6.0, 9.5):
    box(f"vent_{x}", (1.0, 0.6, 1.0), (x, FH + 0.6, FACADE_Z - 2.0), M("iron"), bevel=0.02, step=0)
poly_tube("mast", [(10.8, FH + 0.4, FACADE_Z - 1.0), (10.8, FH + 4.2, FACADE_Z - 1.0)], 0.04, IRON)
sphere("beacon", 0.08, (10.8, FH + 4.3, FACADE_Z - 1.0), M("beacon_noshadow", color="#ff5a4a", emit="#ff3b30", emit_strength=5.0), seg=10)

# side wings: two storeys of offices facing the courtyard (behind the hedges), x = ±WING_X
WH = 7.8
for sgn in (-1, 1):
    zc = (FACADE_Z + WING_Z1) / 2; L = WING_Z1 - FACADE_Z
    box(f"wing_{sgn}", (2.0, WH, L), (sgn * (WING_X + 1.0), WH / 2, zc), FAC, bevel=0.02, step=1.2)
    box(f"wing_plinth_{sgn}", (2.1, 0.8, L), (sgn * (WING_X + 1.0) - sgn * 0.05, 0.4, zc), FAC_DK, bevel=0.02, step=1.2)
    box(f"wing_band_{sgn}", (2.12, 0.16, L), (sgn * (WING_X + 1.0) - sgn * 0.06, 3.85, zc), TRIM, bevel=0.01, step=1.2)
    box(f"wing_cornice_{sgn}", (2.4, 0.3, L + 0.3), (sgn * (WING_X + 1.0), WH + 0.1, zc), TRIM, bevel=0.02, step=1.2)
    box(f"wing_roof_{sgn}", (2.6, 0.12, L + 0.4), (sgn * (WING_X + 1.0), WH + 0.3, zc), ROOF, bevel=0.01, step=1.2)
    box(f"wing_end_{sgn}", (2.2, WH + 0.4, 0.3), (sgn * (WING_X + 1.0), (WH + 0.4) / 2, WING_Z1 + 0.15), FAC_DK, bevel=0.02, step=1.0)
    face = "-x" if sgn > 0 else "+x"
    for k, z in enumerate(np.arange(FACADE_Z + 2.4, WING_Z1 - 1.0, 2.6)):
        for y in FLOORS[:2]:
            window(f"ww_{sgn}_{k}_{y}", (sgn * WING_X, y + WIN_H / 2, z), face)
    # a lit arcade passage at the wing's open end
    box(f"wing_lamp_{sgn}", (0.1, 0.3, 0.3), (sgn * WING_X - sgn * 0.05, 3.2, WING_Z1 + 0.6), M("lamp_glass_noshadow"), bevel=0, step=0)
# beyond the open south end: dark tree line silhouettes (low detail, fogged)
for k in range(10):
    x = -16 + k * 3.6 + R.uniform(-0.6, 0.6)
    if abs(x) < 3.5: continue
    sphere(f"far_tree_{k}", R.uniform(1.6, 2.4), (x, R.uniform(2.4, 3.4), R.uniform(17, 20)), M("hedge_dk", rough=0.95), seg=12, scale=(1, 1.2, 0.8))

# text is the triangle hog: low curve resolution everywhere
for ob in S.STATE["col"].objects:
    if ob.type == 'FONT':
        ob.data.resolution_u = 3
        ob.data.bevel_resolution = 0

tris = S.finish(ao_tint="#1a2140", ao_floor=0.45, samples=24, ao_distance=1.2)
assert tris < 300_000, f"over budget: {tris} tris"
