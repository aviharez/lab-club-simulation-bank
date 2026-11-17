"""Sunlit atrium (EP03 "Drop vs Throw"): procedural build -> sunlit-atrium.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/sunlit-atrium/build_sunlit_atrium.py [-- --no-bake]

Concept: "Lab Club Reading Atrium", a two-storey lab atrium with a honey-wood mezzanine balcony. Late-afternoon sun
pours through the tall window wall at the back (the React key light shines through the window openings, so the floor
gets real window-shaped sun patches; god rays + dust are live in React). Palette: warm cream plaster, honey wood,
sage green plants, soft terracotta accents (+ brass trims).
Hero piece: the balcony with its wooden railing and the open launch gap, and the long floor measuring tape with big
markings that runs from the launch edge across the floor into a giant tape-measure case. A height staff beside the
gap marks 0-2 m.
Depth: hanging plants + big potted plants in the foreground, balcony in the midground, the window wall and the
two-storey bookshelves behind.

Layout (three.js metres, shared with episodes/src/sets/sunlit-atrium/SunlitAtrium.tsx):
  launch edge = release plumb line x = 0 (the tape's "0"); deck top y = 1.55 (hold_drop grip 0.53 + ball radius 0.075 -> ball bottom 2.00), deck lip x = -0.08,
  deck x -3.2..-0.08, z -4.0..1.4; launch gap in the front railing z -0.95..0.95;
  lanes: Zuzu (drop) z = +0.45, Anna (throw) z = -0.45; Anna's step top y = 1.72 (throw hand 0.365 at release -> ball bottom ~2.00);
  release height 2.00; tape along the throw lane z = -0.45, x 0..3.4 (+ short tape on Zuzu's lane);
  floor kept clear for the cast: x 0..4, z -1..3 (Miyu ~ (1.1, 1.4), Lumi ~ (2.9, 1.5)).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "cream": "#f0e4cf", "cream_lt": "#f6eddf", "cream_dk": "#e0cfb2", "plaster_shadow": "#d8c4a4",
    "honey": "#dcaa6c", "honey_lt": "#e6bd85", "honey_dk": "#b9844e", "walnut": "#8a5e3a",
    "sage": "#8fa77e", "sage_dk": "#5f7a55", "sage_lt": "#aec29b", "leaf_a": "#6f8d5e", "leaf_b": "#86a06f", "leaf_c": "#5a7650",
    "terra": "#c8714f", "terra_dk": "#a5553a", "terra_lt": "#dc9273",
    "brass": "#c9a45c", "paper": "#f7f0e3", "ink": "#4a3b30", "iron": "#4b4038",
    "b_blue": "#7f95a3", "b_plum": "#8a6a74", "b_mustard": "#d2a94e", "b_brown": "#8d6a4a", "b_olive": "#8a8a5a",
}
S.begin("sunlit-atrium", HERE, PAL)
R = S.R

# ---- layout (keep in sync with SunlitAtrium.tsx)
BACK, LEFT, RIGHT, FRONT = -4.0, -3.2, 4.8, 7.0
CEIL = 5.0
DECK_Y, LIP_X, DECK_Z0, DECK_Z1 = 1.55, -0.08, BACK, 1.4
GAP = (-0.95, 0.95)
LANE_ZUZU, LANE_ANNA = 0.45, -0.45
STEP_TOP = 1.631
RAIL_H = 0.55
WIN_X = [-2.0, -0.2, 1.6, 3.4]
WIN_W, WIN_Y0, WIN_Y1, WIN_TRANSOM = 1.3, 0.55, 4.3, 2.75


# ----------------------------------------------------------------------------- generated textures (original art)
def _noise(u, v, s, seed):
    rr = np.random.RandomState(seed); g = rr.rand(s + 1, s + 1)
    x = u * s; y = v * s; i = np.floor(x).astype(int); j = np.floor(y).astype(int); fx = x - i; fy = y - j
    i = np.clip(i, 0, s - 1); j = np.clip(j, 0, s - 1)
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = g[j, i]; b = g[j, i + 1]; c = g[j + 1, i]; d = g[j + 1, i + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def wood_img(name, base, dark, seed, w=512, h=128):
    def fn(u, v):
        o = fill(u, base)
        grain = np.sin((v * 22 + _noise(u, v, 6, seed) * 5 + _noise(u, v, 24, seed + 1) * 0.8) * math.pi)
        k = np.clip((grain + 1) / 2, 0, 1) ** 3 * 0.35 + _noise(u, v, 40, seed + 2) * 0.12
        o[..., :3] = o[..., :3] * (1 - k[..., None]) + S.C(dark)[:3] * k[..., None]
        return o
    return image(name, w, h, fn)


def plaster_img(name, base, seed):
    def fn(u, v):
        o = fill(u, base)
        k = (_noise(u, v, 8, seed) - 0.5) * 0.06 + (_noise(u, v, 48, seed + 3) - 0.5) * 0.04
        o[..., :3] = np.clip(o[..., :3] * (1 + k[..., None]), 0, 1)
        return o
    return image(name, 256, 256, fn)


WOOD = [wood_img(f"wood_{i}", b, d, 11 + i) for i, (b, d) in enumerate((("#e2b47a", "#b98552"), ("#e8bf88", "#c08c58"), ("#d9a96e", "#ae7b4a"), ("#e5ba80", "#b8854f")))]
PLASTER = plaster_img("plaster", "#f0e4cf", 5)


def wood(i, rough=0.6):
    return M(f"wood_{i}", rough=rough, image=WOOD[i % 4])


# ----------------------------------------------------------------------------- floor: honey-wood plank boards
box("floor_base", (RIGHT - LEFT + 0.4, 0.05, FRONT - BACK + 0.4), ((LEFT + RIGHT) / 2, -0.045, (BACK + FRONT) / 2), M("walnut", rough=0.9), bevel=0, step=1.0)
BW = 0.22
z = BACK
row = 0
while z < FRONT - 1e-6:
    x = LEFT - R.uniform(0.0, 1.2)
    while x < RIGHT:
        L = R.uniform(1.4, 2.6)
        x0, x1 = max(x, LEFT), min(x + L, RIGHT)
        if x1 - x0 > 0.15:
            box(f"board_{row}_{x:.2f}", (x1 - x0 - 0.008, 0.03, BW - 0.008), ((x0 + x1) / 2, -0.015 + R.uniform(-0.001, 0.001), z + BW / 2),
                wood(R.randrange(4), rough=R.choice([0.5, 0.58, 0.66])), bevel=0.003, step=0.6, segments=1)
        x += L
    z += BW; row += 1

# rug (fabric) in front of the tape, where Miyu and Lumi stand
def _rug(u, v):
    o = fill(u, "#c8714f")
    paint(o, (u > 0.05) & (u < 0.95) & (v > 0.07) & (v < 0.93), "#e8d6b8")
    paint(o, (u > 0.09) & (u < 0.91) & (v > 0.13) & (v < 0.87), "#d98a66")
    paint(o, (u > 0.12) & (u < 0.88) & (v > 0.18) & (v < 0.82), "#efe2c9")
    d = np.abs(((u - 0.5) * 2.2) % 0.4 - 0.2) + np.abs(((v - 0.5) * 1.6) % 0.4 - 0.2)
    paint(o, (d < 0.06) & (u > 0.14) & (u < 0.86) & (v > 0.2) & (v < 0.8), "#8fa77e")
    paint(o, (d < 0.025) & (u > 0.14) & (u < 0.86) & (v > 0.2) & (v < 0.8), "#c8714f")
    k = (_noise(u, v, 90, 4) - 0.5) * 0.08
    o[..., :3] = np.clip(o[..., :3] * (1 + k[..., None]), 0, 1)
    return o
RUG = image("rug", 512, 384, _rug)
plane("rug", 3.4, 2.2, (2.35, 0.004, 2.25), M("rug", rough=0.95, image=RUG), facing="y")
box("rug_edge", (3.42, 0.006, 2.22), (2.35, 0.001, 2.25), M("terra_dk", rough=0.95), bevel=0, step=0.5)

# ----------------------------------------------------------------------------- back wall: tall window wall
WALL_T = 0.3
WZ = BACK - WALL_T / 2
edges = [LEFT]
for x in WIN_X: edges += [x - WIN_W / 2, x + WIN_W / 2]
edges.append(RIGHT)
WALL = M("plaster", rough=0.9, image=PLASTER)
def _garden(u, v):
    # garden view through each window: warm late-afternoon sky, hazy sage trees, a hedge line
    o = fill(u, "#fff3dc")
    sky = np.clip(v, 0, 1)
    o[..., :3] = S.C("#ffe6bf")[:3] * (1 - sky[..., None]) + S.C("#fff6e8")[:3] * sky[..., None]
    trees = 0.32 + 0.12 * np.sin(u * 21) + 0.07 * np.sin(u * 53 + 1.3) + 0.05 * _noise(u, v, 30, 21)
    paint(o, v < trees, "#d9dcb0", 0.85)
    paint(o, v < trees - 0.08, "#c9d0a0", 0.6)
    paint(o, v < 0.12 + 0.02 * np.sin(u * 80), "#bfc794", 0.9)
    return o
GARDEN = image("garden", 256, 512, _garden)
for k in range(0, len(edges), 2):
    x0, x1 = edges[k], edges[k + 1]
    if x1 - x0 > 0.01:
        box(f"wall_pier_{k}", (x1 - x0, CEIL, WALL_T), ((x0 + x1) / 2, CEIL / 2, WZ), WALL, bevel=0.01, step=0.4)
for k, x in enumerate(WIN_X):
    box(f"wall_under_{k}", (WIN_W, WIN_Y0, WALL_T), (x, WIN_Y0 / 2, WZ), WALL, bevel=0.01, step=0.4)
    box(f"wall_over_{k}", (WIN_W, CEIL - WIN_Y1, WALL_T), (x, (CEIL + WIN_Y1) / 2, WZ), WALL, bevel=0.01, step=0.4)
    # deep honey-wood window frame, mullions and transom (they cast the window shadows on the floor)
    WF = M("honey_dk", rough=0.55)
    for dx in (-1, 1):
        box(f"win_jamb_{k}_{dx}", (0.08, WIN_Y1 - WIN_Y0, WALL_T + 0.04), (x + dx * (WIN_W / 2 - 0.04), (WIN_Y0 + WIN_Y1) / 2, WZ), WF, bevel=0.008, step=0.5)
    box(f"win_head_{k}", (WIN_W, 0.08, WALL_T + 0.04), (x, WIN_Y1 - 0.04, WZ), WF, bevel=0.008, step=0.5)
    box(f"win_sill_{k}", (WIN_W + 0.16, 0.06, WALL_T + 0.2), (x, WIN_Y0 + 0.03, WZ + 0.08), M("honey", rough=0.5), bevel=0.01, step=0.5)
    box(f"win_mull_v_{k}", (0.045, WIN_Y1 - WIN_Y0, 0.06), (x, (WIN_Y0 + WIN_Y1) / 2, WZ - 0.05), WF, bevel=0.005, step=0.6)
    box(f"win_transom_{k}", (WIN_W, 0.07, 0.07), (x, WIN_TRANSOM, WZ - 0.05), WF, bevel=0.005, step=0)
    for j in range(1, 4):
        box(f"win_mull_h_{k}_{j}", (WIN_W, 0.03, 0.05), (x, WIN_Y0 + j * (WIN_TRANSOM - WIN_Y0) / 4, WZ - 0.05), WF, bevel=0, step=0)
    for j in range(1, 3):
        box(f"win_mull_hu_{k}_{j}", (WIN_W, 0.03, 0.05), (x, WIN_TRANSOM + j * (WIN_Y1 - WIN_TRANSOM) / 3, WZ - 0.05), WF, bevel=0, step=0)
    # panes: warm sky glow, never cast shadows (material name carries _noshadow through the join)
    plane(f"win_pane_{k}", WIN_W - 0.1, WIN_Y1 - WIN_Y0 - 0.1, (x, (WIN_Y0 + WIN_Y1) / 2, WZ - 0.1),
          M("win_glass_noshadow", rough=0.3, image=GARDEN, emit="#ffffff", emit_image=True, emit_strength=1.25))
# outside: a soft garden hedge + trees silhouette beyond the glass (low contrast, sage)
box("outside_hedge_noshadow", (RIGHT - LEFT + 4, 1.3, 0.3), (0.8, 0.65, BACK - 2.0), M("hedge_noshadow", color="#c8cfa4", rough=0.9, emit="#d7d9ac", emit_strength=0.9), bevel=0, step=0)
for k in range(8):
    sphere(f"outside_tree_{k}_noshadow", R.uniform(0.8, 1.3), (-3.5 + k * 1.3, R.uniform(2.6, 3.6), BACK - 2.6 - R.uniform(0, 0.6)),
           M("tree_noshadow", color="#d9dcae", rough=0.9, emit="#e7e3b5", emit_strength=0.8), seg=12, scale=(1, 1.15, 0.6))
# wainscot band (honey-wood panels) + terracotta baseboard on all walls
def wainscot_x(name, x0, x1, zf):
    n = max(1, int((x1 - x0) / 0.6))
    for i in range(n):
        a = x0 + (i + 0.5) * (x1 - x0) / n
        box(f"{name}_{i}", ((x1 - x0) / n - 0.02, 0.48, 0.03), (a, 0.32, zf), wood(i, 0.55), bevel=0.008, step=0.3, segments=1)
    box(f"{name}_cap", (x1 - x0, 0.04, 0.05), ((x0 + x1) / 2, 0.58, zf + 0.01), M("honey_dk", rough=0.5), bevel=0.008)
    box(f"{name}_base", (x1 - x0, 0.08, 0.04), ((x0 + x1) / 2, 0.04, zf + 0.02), M("terra", rough=0.6), bevel=0.006)
for k, x in enumerate(WIN_X):
    wainscot_x(f"wains_back_{k}", x - WIN_W / 2, x + WIN_W / 2, BACK + 0.015)

# ----------------------------------------------------------------------------- side walls
for sgn, X in ((-1, LEFT), (1, RIGHT)):
    box(f"wall_side_{sgn}", (WALL_T, CEIL, FRONT - BACK), (X + sgn * WALL_T / 2, CEIL / 2, (BACK + FRONT) / 2), WALL, bevel=0, step=0.5)
    box(f"side_base_{sgn}", (0.04, 0.08, FRONT - BACK), (X - sgn * 0.02, 0.04, (BACK + FRONT) / 2), M("terra"), bevel=0.006, step=0.6)
    box(f"side_crown_{sgn}", (0.08, 0.1, FRONT - BACK), (X - sgn * 0.04, CEIL - 0.05, (BACK + FRONT) / 2), M("cream_lt", rough=0.6), bevel=0.01, step=0.6)
box("back_crown", (RIGHT - LEFT, 0.1, 0.08), ((LEFT + RIGHT) / 2, CEIL - 0.05, BACK + 0.04), M("cream_lt"), bevel=0.01, step=0.6)

# ----------------------------------------------------------------------------- ceiling with honey beams
box("ceiling", (RIGHT - LEFT, 0.1, FRONT - BACK), ((LEFT + RIGHT) / 2, CEIL + 0.05, (BACK + FRONT) / 2), M("cream_dk", rough=0.9), bevel=0, step=0.8)
for k in range(8):
    zb = BACK + 0.5 + k * 1.3
    box(f"beam_{k}", (RIGHT - LEFT, 0.22, 0.16), ((LEFT + RIGHT) / 2, CEIL - 0.11, zb), wood(k, 0.6), bevel=0.012, step=0.6)
box("beam_ridge", (0.2, 0.18, FRONT - BACK), (0.8, CEIL - 0.31, (BACK + FRONT) / 2), wood(2), bevel=0.012, step=0.6)


# ----------------------------------------------------------------------------- bookshelves (generic, along x or z)
BOOKS = ["terra", "sage", "cream_dk", "b_mustard", "b_blue", "b_plum", "b_brown", "b_olive", "terra_lt", "sage_dk", "paper"]


def shelf_unit(name, axis, a0, a1, y0, y1, wall, inward, depth=0.34, shelves=5, books=True):
    """Bookshelf against a wall. axis 'x': books run along x, wall at z=wall, inward = +1 (toward +z).
    axis 'z': books run along z, wall at x=wall, inward = +1 (toward +x)."""
    def B(nm, along, h, d, ac, y, dc, mat, bevel=0.006, step=0.4, rot=0.0):
        if axis == "x": return box(nm, (along, h, d), (ac, y, dc), mat, bevel=bevel, step=step, rot_y=rot)
        return box(nm, (d, h, along), (dc, y, ac), mat, bevel=bevel, step=step, rot_y=rot)
    mid_d = wall + inward * depth / 2
    W = a1 - a0
    carcass = M("honey_dk", rough=0.55)
    B(f"{name}_back", W, y1 - y0, 0.02, (a0 + a1) / 2, (y0 + y1) / 2, wall + inward * 0.01, M("cream_dk", rough=0.85), bevel=0, step=0.5)
    n_bays = max(1, int(W / 0.9))
    for i in range(n_bays + 1):
        a = a0 + i * W / n_bays
        B(f"{name}_side_{i}", 0.04, y1 - y0, depth, a, (y0 + y1) / 2, mid_d, carcass, step=0.5)
    sh_h = (y1 - y0) / shelves
    for j in range(shelves + 1):
        B(f"{name}_shelf_{j}", W + 0.04, 0.035, depth, (a0 + a1) / 2, y0 + j * sh_h, mid_d, wood(j, 0.55), bevel=0.005, step=0.5)
    B(f"{name}_crown", W + 0.1, 0.06, depth + 0.05, (a0 + a1) / 2, y1 + 0.03, wall + inward * (depth + 0.05) / 2, M("honey", rough=0.5), bevel=0.01, step=0.5)
    if not books: return
    for i in range(n_bays):
        b0, b1 = a0 + i * W / n_bays + 0.03, a0 + (i + 1) * W / n_bays - 0.03
        for j in range(shelves):
            base = y0 + j * sh_h + 0.018
            a = b0
            gap_at = R.uniform(b0, b1) if R.random() < 0.5 else None
            while a < b1 - 0.03:
                if gap_at is not None and abs(a - gap_at) < 0.12:
                    # a small plant pot or a lean on some shelves
                    if R.random() < 0.4 and sh_h > 0.25:
                        pc = a + 0.07
                        if axis == "x": cyl(f"{name}_pot_{i}_{j}", 0.05, 0.08, (pc, base + 0.04, mid_d), M("terra", rough=0.7), seg=12, r2=0.06, bevel=0.004)
                        else: cyl(f"{name}_pot_{i}_{j}", 0.05, 0.08, (mid_d, base + 0.04, pc), M("terra", rough=0.7), seg=12, r2=0.06, bevel=0.004)
                        for q in range(5):
                            p = (pc, base + 0.12, mid_d) if axis == "x" else (mid_d, base + 0.12, pc)
                            lf = sphere(f"{name}_pl_{i}_{j}_{q}", 0.05, (p[0] + R.uniform(-0.04, 0.04), p[1] + R.uniform(-0.01, 0.04), p[2] + R.uniform(-0.04, 0.04)),
                                        M(R.choice(["leaf_a", "leaf_b", "leaf_c"]), rough=0.6), seg=8, scale=(1, 0.3, 0.6))
                            lf.rotation_euler = (R.uniform(-0.5, 0.5), R.uniform(-0.5, 0.5), R.uniform(0, 6.28))
                    a += 0.18; gap_at = None; continue
                t = R.uniform(0.025, 0.055); hh = min(sh_h - 0.05, R.uniform(0.15, 0.27)); dd = R.uniform(0.17, 0.24)
                lean = R.random() < 0.06
                B(f"{name}_bk_{i}_{j}_{a:.3f}", t, hh, dd, a + t / 2, base + hh / 2, wall + inward * (0.03 + dd / 2), M(R.choice(BOOKS), rough=R.choice([0.6, 0.7, 0.8])),
                  bevel=0, step=0, rot=(R.uniform(-12, 12) if lean else 0))
                a += t + 0.003
    return


# two-storey bookshelf on the right wall with a rolling brass ladder
shelf_unit("shelfR", "z", -3.7, 2.2, 0.0, 4.3, RIGHT, -1, depth=0.38, shelves=10)
LAD_Z = -0.1
cyl("lad_rail", 0.018, 5.9, (RIGHT - 0.44, 4.38, -0.75), M("brass", rough=0.3, metal=0.9), seg=10, axis="z", bevel=0)
for dz in (-0.22, 0.22):
    poly_tube(f"lad_side_{dz}", [(RIGHT - 0.46, 4.36, LAD_Z + dz), (RIGHT - 1.4, 0.03, LAD_Z + dz)], 0.022, M("honey_dk", rough=0.5))
for k in range(12):
    t = (k + 0.5) / 12
    poly_tube(f"lad_rung_{k}", [(RIGHT - 0.46 - 0.94 * t, 4.36 - 4.33 * t, LAD_Z - 0.22), (RIGHT - 0.46 - 0.94 * t, 4.36 - 4.33 * t, LAD_Z + 0.22)], 0.014, M("honey", rough=0.5))
for dz in (-0.22, 0.22):
    torus(f"lad_hook_{dz}", 0.035, 0.008, (RIGHT - 0.44, 4.36, LAD_Z + dz), M("brass"), seg=16, minor=6, facing="z")
    cyl(f"lad_wheel_{dz}", 0.03, 0.02, (RIGHT - 1.4, 0.03, LAD_Z + dz), M("iron", rough=0.4, metal=0.7), seg=12, axis="z", bevel=0)
# low shelves under the windows on the open side of the back wall
for k, x in enumerate(WIN_X[2:]):
    shelf_unit(f"shelfW_{k}", "x", x - WIN_W / 2 + 0.05, x + WIN_W / 2 - 0.05, 0.0, 0.52, BACK, 1, depth=0.3, shelves=2)

# ----------------------------------------------------------------------------- the balcony (mezzanine)
DZ = (DECK_Z0 + DECK_Z1) / 2; DD = DECK_Z1 - DECK_Z0
DX0, DX1 = LEFT, LIP_X
# deck: honey boards on top, cream plaster soffit below, honey fascia with a terracotta trim at the lip
for k in range(int(DD / 0.2)):
    zz = DECK_Z0 + 0.1 + k * 0.2
    box(f"deck_board_{k}", (DX1 - DX0, 0.03, 0.195), ((DX0 + DX1) / 2, DECK_Y - 0.015, zz), wood(k, 0.55), bevel=0.003, step=0.6, segments=1)
box("deck_slab", (DX1 - DX0, 0.16, DD), ((DX0 + DX1) / 2, DECK_Y - 0.11, DZ), M("cream_dk", rough=0.9), bevel=0.01, step=0.5)
box("deck_fascia", (0.06, 0.22, DD), (LIP_X - 0.03, DECK_Y - 0.11, DZ), M("honey", rough=0.5), bevel=0.01, step=0.4)
box("deck_fascia_trim", (0.012, 0.05, DD), (LIP_X - 0.004, DECK_Y - 0.06, DZ), M("terra", rough=0.55), bevel=0.003, step=0.6)
box("deck_fascia_side", (DX1 - DX0, 0.22, 0.06), ((DX0 + DX1) / 2, DECK_Y - 0.11, DECK_Z1 - 0.03), M("honey", rough=0.5), bevel=0.01, step=0.4)
box("deck_fascia_side_trim", (DX1 - DX0, 0.05, 0.012), ((DX0 + DX1) / 2, DECK_Y - 0.06, DECK_Z1 - 0.004), M("terra"), bevel=0.003, step=0.6)
# soffit beams + posts (posts keep clear of the launch gap so the drop line stays open)
for k in range(6):
    xb = DX0 + 0.3 + k * (DX1 - DX0 - 0.5) / 5
    box(f"deck_joist_{k}", (0.1, 0.16, DD - 0.1), (xb, DECK_Y - 0.27, DZ), wood(k, 0.6), bevel=0.01, step=0.5)
box("deck_beam_front", (0.16, 0.22, DD), (LIP_X - 0.16, DECK_Y - 0.3, DZ), wood(1, 0.55), bevel=0.012, step=0.5)
for zp in (-3.1, -1.6, 1.25):
    box(f"deck_post_{zp}", (0.16, DECK_Y - 0.41, 0.16), (LIP_X - 0.16, (DECK_Y - 0.41) / 2, zp), wood(3, 0.55), bevel=0.015, step=0.4)
    box(f"deck_post_base_{zp}", (0.22, 0.08, 0.22), (LIP_X - 0.16, 0.04, zp), M("terra", rough=0.6), bevel=0.008, step=0)
    for s_ in (-1, 1):
        poly_tube(f"deck_brace_{zp}_{s_}", [(LIP_X - 0.16, DECK_Y - 0.7, zp), (LIP_X - 0.16, DECK_Y - 0.42, zp + s_ * 0.32)], 0.03, M("honey_dk"))

# wooden railing: newel posts, round top rail, square balusters; launch gap open between the gap newels
RAILW = M("honey_lt", rough=0.45)
def railing_z(name, xr, z0, z1):
    n = max(1, int((z1 - z0) / 0.12))
    for i in range(n + 1):
        zz = z0 + i * (z1 - z0) / n
        box(f"{name}_bal_{i}", (0.028, RAIL_H - 0.06, 0.028), (xr, DECK_Y + (RAIL_H - 0.06) / 2, zz), RAILW, bevel=0.004, step=0)
    cyl(f"{name}_top", 0.032, z1 - z0 + 0.08, (xr, DECK_Y + RAIL_H - 0.02, (z0 + z1) / 2), M("honey", rough=0.4), seg=12, axis="z", bevel=0)
    box(f"{name}_bot", (0.05, 0.04, z1 - z0), (xr, DECK_Y + 0.04, (z0 + z1) / 2), RAILW, bevel=0.005, step=0.5)
def railing_x(name, zr, x0, x1):
    n = max(1, int((x1 - x0) / 0.12))
    for i in range(n + 1):
        xx = x0 + i * (x1 - x0) / n
        box(f"{name}_bal_{i}", (0.028, RAIL_H - 0.06, 0.028), (xx, DECK_Y + (RAIL_H - 0.06) / 2, zr), RAILW, bevel=0.004, step=0)
    cyl(f"{name}_top", 0.032, x1 - x0 + 0.08, ((x0 + x1) / 2, DECK_Y + RAIL_H - 0.02, zr), M("honey", rough=0.4), seg=12, axis="x", bevel=0)
    box(f"{name}_bot", (x1 - x0, 0.04, 0.05), ((x0 + x1) / 2, DECK_Y + 0.04, zr), RAILW, bevel=0.005, step=0.5)
RX = LIP_X - 0.07
railing_z("rail_back", RX, DECK_Z0 + 0.1, GAP[0])
railing_z("rail_front", RX, GAP[1], DECK_Z1 - 0.07)
railing_x("rail_side", DECK_Z1 - 0.07, DX0 + 1.1, RX)          # leaves the stair opening at the left wall
NEWEL = M("honey_dk", rough=0.5)
for zn in (GAP[0], GAP[1], DECK_Z1 - 0.07, DECK_Z0 + 0.1):
    box(f"newel_{zn}", (0.09, RAIL_H + 0.08, 0.09), (RX, DECK_Y + (RAIL_H + 0.08) / 2, zn), NEWEL, bevel=0.012, step=0)
    sphere(f"newel_cap_{zn}", 0.055, (RX, DECK_Y + RAIL_H + 0.11, zn), M("brass", rough=0.3, metal=0.9), seg=14)
box("newel_side", (0.09, RAIL_H + 0.08, 0.09), (DX0 + 1.1, DECK_Y + (RAIL_H + 0.08) / 2, DECK_Z1 - 0.07), NEWEL, bevel=0.012, step=0)
sphere("newel_side_cap", 0.055, (DX0 + 1.1, DECK_Y + RAIL_H + 0.11, DECK_Z1 - 0.07), M("brass"), seg=14)
# the open gate: a short railing panel swung back against the deck, a chain hook, a terracotta lip strip
GZ = GAP[0] + 0.02
for i in range(5):
    box(f"gate_bal_{i}", (0.026, RAIL_H - 0.12, 0.026), (RX - 0.1 - i * 0.12, DECK_Y + (RAIL_H - 0.04) / 2, GZ + 0.05), RAILW, bevel=0.004, step=0)
for yy in (DECK_Y + 0.08, DECK_Y + RAIL_H - 0.08):
    box(f"gate_rail_{yy:.2f}", (0.56, 0.035, 0.04), (RX - 0.34, yy, GZ + 0.05), M("honey", rough=0.45), bevel=0.005, step=0)
box("lip_strip", (0.06, 0.008, GAP[1] - GAP[0]), (LIP_X - 0.03, DECK_Y + 0.004, 0), M("terra", rough=0.55), bevel=0.002, step=0)
for zz in (LANE_ZUZU, LANE_ANNA):
    box(f"lane_mark_{zz}", (0.3, 0.004, 0.05), (LIP_X - 0.2, DECK_Y + 0.002, zz), M("cream_lt", rough=0.6), bevel=0, step=0)
# Anna's step (wooden step stool) on the throw lane: top at STEP_TOP
box("step_top", (0.44, 0.04, 0.5), (-0.3, STEP_TOP - 0.02, LANE_ANNA), wood(0, 0.5), bevel=0.01, step=0)
for dx in (-0.18, 0.18):
    box(f"step_leg_{dx}", (0.05, STEP_TOP - DECK_Y - 0.04, 0.46), (-0.3 + dx, DECK_Y + (STEP_TOP - DECK_Y - 0.04) / 2, LANE_ANNA), wood(1, 0.55), bevel=0.006, step=0)
box("step_label", (0.003, 0.05, 0.16), (-0.081, STEP_TOP - 0.075, LANE_ANNA), M("terra"), bevel=0, step=0)

# stairs from the balcony's front side down toward the camera along the left wall
N = 9; RISE = DECK_Y / N; RUN = 0.27
SX = DX0 + 0.5
for k in range(N):
    zz = DECK_Z1 + RUN * (k + 0.5); yy = DECK_Y - RISE * (k + 1)
    box(f"stair_{k}", (0.86, 0.045, RUN + 0.02), (SX, yy + 0.0225, zz), wood(k, 0.5), bevel=0.006, step=0)
    box(f"stair_riser_{k}", (0.86, RISE, 0.02), (SX, yy + RISE / 2, zz - RUN / 2), M("cream_lt", rough=0.7), bevel=0, step=0)
poly_tube("stair_string", [(SX + 0.45, DECK_Y - 0.05, DECK_Z1), (SX + 0.45, -0.02, DECK_Z1 + RUN * N)], 0.045, M("honey_dk"))
poly_tube("stair_hand", [(SX + 0.45, DECK_Y + RAIL_H, DECK_Z1 - 0.07), (SX + 0.45, RAIL_H + 0.05, DECK_Z1 + RUN * N)], 0.026, M("honey", rough=0.4))
for k in range(0, N + 1, 2):
    zz = DECK_Z1 + RUN * k; yy = DECK_Y - RISE * k
    box(f"stair_bal_{k}", (0.028, RAIL_H, 0.028), (SX + 0.45, yy + RAIL_H / 2, zz), RAILW, bevel=0.004, step=0)

# under the balcony: a reading nook + lab corner along the left wall
shelf_unit("shelfU", "z", -3.6, 1.0, 0.0, 1.22, LEFT, 1, depth=0.34, shelves=3)
# a lab table with flasks and a microscope-ish lamp, a terracotta armchair
LT = (-1.1, -2.2)
box("labtable_top", (0.9, 0.05, 1.5), (LT[0], 0.72, LT[1]), wood(2, 0.5), bevel=0.01, step=0.3)
for dx in (-0.4, 0.4):
    for dz in (-0.68, 0.68):
        box(f"labtable_leg_{dx}_{dz}", (0.05, 0.7, 0.05), (LT[0] + dx, 0.35, LT[1] + dz), M("honey_dk"), bevel=0.006, step=0)
GLASS = M("flask_glass", color="#e9f2ea", rough=0.08, alpha=0.4)
for k, (dx, dz, r_, h_) in enumerate(((0.1, -0.5, 0.07, 0.18), (-0.15, -0.25, 0.05, 0.24), (0.15, 0.1, 0.08, 0.14), (-0.1, 0.45, 0.06, 0.2))):
    cyl(f"flask_{k}", r_, h_, (LT[0] + dx, 0.745 + h_ / 2, LT[1] + dz), GLASS, seg=16, r2=r_ * 0.45, bevel=0)
    cyl(f"flask_liquid_{k}", r_ * 0.8, h_ * 0.35, (LT[0] + dx, 0.745 + h_ * 0.18, LT[1] + dz), M(["sage", "terra_lt", "b_mustard", "sage_lt"][k], rough=0.3), seg=16, r2=r_ * 0.65, bevel=0)
box("lab_book", (0.22, 0.04, 0.3), (LT[0] + 0.22, 0.765, LT[1] + 0.35), M("b_blue"), bevel=0.004, step=0, rot_y=12)
CH = (-2.4, 0.2)
box("chair_seat", (0.7, 0.18, 0.62), (CH[0], 0.3, CH[1]), M("terra", rough=0.9), bevel=0.06, step=0)
box("chair_back", (0.16, 0.5, 0.62), (CH[0] - 0.3, 0.6, CH[1]), M("terra", rough=0.9), bevel=0.06, step=0)
for dz in (-0.33, 0.33):
    box(f"chair_arm_{dz}", (0.66, 0.26, 0.1), (CH[0], 0.48, CH[1] + dz), M("terra_dk", rough=0.85), bevel=0.04, step=0)
box("chair_cushion", (0.28, 0.24, 0.3), (CH[0] - 0.12, 0.52, CH[1] + 0.1), M("sage", rough=0.9), bevel=0.08, step=0, rot_y=18)
for dx in (-0.28, 0.28):
    for dz in (-0.25, 0.25):
        cyl(f"chair_foot_{dx}_{dz}", 0.025, 0.2, (CH[0] + dx, 0.1, CH[1] + dz), M("honey_dk"), seg=8, bevel=0)
# warm wall sconces under the balcony (practicals)
for k, zz in enumerate((-2.6, -0.2)):
    box(f"sconce_plate_{k}", (0.03, 0.14, 0.1), (LEFT + 0.015, 1.05, zz), M("brass", rough=0.3, metal=0.9), bevel=0.006, step=0)
    sphere(f"sconce_globe_{k}_noshadow", 0.075, (LEFT + 0.12, 1.08, zz), M("lamp_warm", color="#fff2d8", emit="#ffd9a0", emit_strength=4.0), seg=16, keep=True)

# on the balcony: shelves on the left wall, a chalkboard with a parabola, a desk lamp, potted plants
shelf_unit("shelfB", "z", -3.6, -1.2, DECK_Y, DECK_Y + 2.0, LEFT, 1, depth=0.3, shelves=5)
def _chalk(u, v):
    o = fill(u, "#5f6f5a")
    k = (_noise(u, v, 30, 9) - 0.5) * 0.08
    o[..., :3] = np.clip(o[..., :3] * (1 + k[..., None]), 0, 1)
    # two paths from the same height: a straight drop and a parabola, dots at equal heights joined by dashes
    x0, y0 = 0.16, 0.84
    for j in range(7):
        t = j / 6
        yy = y0 - 0.7 * t * t
        paint(o, (u - x0) ** 2 + ((v - yy) * 0.6) ** 2 < 0.0007, "#f2c94c")
        xx = x0 + 0.7 * t
        paint(o, (u - xx) ** 2 + ((v - yy) * 0.6) ** 2 < 0.0007, "#f0a3b5")
        paint(o, (np.abs(v - yy) < 0.004) & (u > x0) & (u < xx) & (((u * 60) % 1) < 0.5), "#efe9dc")
    paint(o, (np.abs(v - 0.1) < 0.006) & (u > 0.06) & (u < 0.94), "#efe9dc")
    paint(o, (u < 0.025) | (u > 0.975) | (v < 0.035) | (v > 0.965), "#a86f38")
    return o
plane("chalkboard", 1.4, 0.95, (LEFT + 0.03, DECK_Y + 1.3, -0.25), M("chalk", rough=0.85, image=image("chalk_img", 512, 360, _chalk)), facing="x")
box("chalk_tray", (0.06, 0.03, 1.4), (LEFT + 0.05, DECK_Y + 0.8, -0.25), M("honey_dk"), bevel=0.004, step=0)
box("desk", (0.6, 0.04, 1.0), (LEFT + 0.32, DECK_Y + 0.6, 0.95), wood(1, 0.5), bevel=0.008, step=0)
for dz in (-0.45, 0.45):
    box(f"desk_leg_{dz}", (0.56, 0.58, 0.04), (LEFT + 0.32, DECK_Y + 0.29, 0.95 + dz), M("honey_dk"), bevel=0.006, step=0)
cyl("desklamp_base", 0.07, 0.025, (LEFT + 0.3, DECK_Y + 0.635, 1.25), M("brass", rough=0.3, metal=0.9), seg=16, bevel=0.004)
poly_tube("desklamp_arm", [(LEFT + 0.3, DECK_Y + 0.64, 1.25), (LEFT + 0.36, DECK_Y + 0.95, 1.15), (LEFT + 0.5, DECK_Y + 1.02, 1.0)], 0.012, M("brass"))
S.cone_shell("desklamp_shade", 0.1, 0.04, 0.12, (LEFT + 0.52, DECK_Y + 0.98, 0.98), M("terra", rough=0.6))
sphere("desklamp_bulb_noshadow", 0.035, (LEFT + 0.52, DECK_Y + 0.93, 0.98), M("lamp_warm"), seg=12, keep=True)
for k in range(4):
    box(f"desk_book_{k}", (0.22, 0.035, 0.3), (LEFT + 0.3, DECK_Y + 0.64 + k * 0.036, 0.72), M(R.choice(BOOKS)), bevel=0.004, step=0, rot_y=R.uniform(-15, 15))


# ----------------------------------------------------------------------------- plants (sage foliage, terracotta pots)
LEAVES = ["leaf_a", "leaf_b", "leaf_c", "sage", "sage_dk"]


def leaf(name, at, size, flat=0.25):
    lf = sphere(name, size, at, M(R.choice(LEAVES), rough=R.choice([0.55, 0.65])), seg=8, scale=(1, flat, 0.55))
    lf.rotation_euler = (R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.6), R.uniform(0, 6.283))
    return lf


def pot(name, at, r, h, color="terra"):
    cyl(f"{name}_pot", r, h, (at[0], at[1] + h / 2, at[2]), M(color, rough=0.75), seg=24, r2=r * 1.18, bevel=0.01)
    torus(f"{name}_rim", r * 1.18, 0.02, (at[0], at[1] + h, at[2]), M(color, rough=0.75), seg=24, minor=6, facing="y")
    cyl(f"{name}_soil", r * 1.12, 0.02, (at[0], at[1] + h - 0.03, at[2]), M("walnut", rough=0.95), seg=20, bevel=0)


def bush(name, at, height, spread, n):
    """Upright potted plant: stems fanning out of the pot, leaves clustered at their tips."""
    for k in range(n):
        a = R.uniform(0, 6.283); r_ = R.uniform(0.2, 1.0) * spread; hh = height * R.uniform(0.55, 1.0)
        tip = (at[0] + math.cos(a) * r_, at[1] + hh, at[2] + math.sin(a) * r_)
        tube(f"{name}_stem_{k}", [at, (at[0] + math.cos(a) * r_ * 0.3, at[1] + hh * 0.6, at[2] + math.sin(a) * r_ * 0.3), tip], 0.01, M("sage_dk", rough=0.7), res=4)
        for q in range(3):
            leaf(f"{name}_leaf_{k}_{q}", (tip[0] + R.uniform(-0.08, 0.08), tip[1] + R.uniform(-0.1, 0.06), tip[2] + R.uniform(-0.08, 0.08)), R.uniform(0.09, 0.16))


def hanging(name, at, drop, vines=6, pot_r=0.16):
    """Hanging planter: macramé cords to the ceiling, a terracotta pot, trailing vines with small leaves."""
    x, y, z = at
    for k in range(3):
        a = k / 3 * 6.283
        poly_tube(f"{name}_cord_{k}", [(x + math.cos(a) * pot_r, y + 0.1, z + math.sin(a) * pot_r), (x, CEIL - 0.22, z)], 0.006, M("cream_lt", rough=0.9))
    sphere(f"{name}_pot", pot_r, (x, y, z), M("terra", rough=0.75), seg=20, scale=(1, 0.75, 1))
    torus(f"{name}_ring", pot_r * 0.95, 0.014, (x, y + 0.1, z), M("terra_dk"), seg=24, minor=6, facing="y")
    for q in range(6):
        leaf(f"{name}_top_{q}", (x + R.uniform(-0.12, 0.12), y + 0.14 + R.uniform(0, 0.08), z + R.uniform(-0.12, 0.12)), R.uniform(0.07, 0.11))
    for k in range(vines):
        a = R.uniform(0, 6.283); L = drop * R.uniform(0.5, 1.0)
        p0 = (x + math.cos(a) * pot_r * 0.9, y + 0.06, z + math.sin(a) * pot_r * 0.9)
        pts = [p0]
        for j in range(1, 5):
            t = j / 4
            pts.append((p0[0] + math.cos(a) * 0.12 * t + R.uniform(-0.04, 0.04), p0[1] - L * t, p0[2] + math.sin(a) * 0.12 * t + R.uniform(-0.04, 0.04)))
        tube(f"{name}_vine_{k}", pts, 0.006, M("sage_dk"), res=5)
        for j in range(int(L / 0.09)):
            t = (j + 0.5) / int(L / 0.09); seg_ = min(3, int(t * 4)); f_ = t * 4 - seg_
            p = [pts[seg_][i] * (1 - f_) + pts[seg_ + 1][i] * f_ for i in range(3)]
            leaf(f"{name}_vl_{k}_{j}", (p[0] + R.uniform(-0.03, 0.03), p[1], p[2] + R.uniform(-0.03, 0.03)), R.uniform(0.04, 0.065), flat=0.3)


# foreground: hanging planters (top of frame) and two big floor plants framing the shot
hanging("hangA", (-1.2, 3.35, 4.2), 1.0, vines=8)
hanging("hangB", (2.9, 3.6, 4.6), 0.9, vines=7)
hanging("hangC", (0.9, 3.9, 2.2), 0.7, vines=6, pot_r=0.13)
pot("fgL", (-2.2, 0, 3.6), 0.3, 0.55)
bush("fgL", (-2.2, 0.55, 3.6), 1.5, 0.6, 14)
pot("fgR", (4.1, 0, 3.4), 0.26, 0.5, color="cream_dk")
bush("fgR", (4.1, 0.5, 3.4), 1.25, 0.45, 11)
# midground / background plants: on the balcony, by the windows, under the stairs
pot("balA", (-2.6, DECK_Y, -3.4), 0.2, 0.36)
bush("balA", (-2.6, DECK_Y + 0.36, -3.4), 0.9, 0.35, 9)
pot("winA", (2.5, 0, -3.5), 0.2, 0.38, color="terra_lt")
bush("winA", (2.5, 0.38, -3.5), 1.4, 0.38, 10)
pot("winB", (0.7, 0, -3.55), 0.16, 0.3)
bush("winB", (0.7, 0.3, -3.55), 0.8, 0.3, 7)
hanging("hangD", (1.6, 3.3, -3.4), 0.8, vines=6, pot_r=0.13)
pot("railpot", (-1.4, DECK_Y, 1.25), 0.13, 0.24)
bush("railpot", (-1.4, DECK_Y + 0.24, 1.25), 0.55, 0.22, 6)
# trailing ivy draped over the balcony's front railing (back section)
for k in range(4):
    z0 = DECK_Z0 + 0.5 + k * 0.7
    pts = [(RX, DECK_Y + RAIL_H, z0), (RX + 0.03, DECK_Y + 0.2, z0 + 0.12), (RX + 0.06, DECK_Y - 0.25 - R.uniform(0, 0.25), z0 + 0.05)]
    tube(f"ivy_{k}", pts, 0.006, M("sage_dk"), res=5)
    for j in range(9):
        t = j / 8
        leaf(f"ivy_leaf_{k}_{j}", (RX + 0.04 * t, DECK_Y + RAIL_H - (RAIL_H + 0.4) * t, z0 + R.uniform(-0.05, 0.12)), R.uniform(0.04, 0.06), flat=0.3)

# ----------------------------------------------------------------------------- pendant lamps (practicals)
LAMPS = [(1.1, 3.55, -1.4), (3.0, 3.75, 0.2), (-1.6, 2.95, -1.0)]
for k, (x, y, z) in enumerate(LAMPS):
    top = CEIL - 0.22 if x > LIP_X else DECK_Y - 0.19 + 2.2   # the third hangs over the balcony
    poly_tube(f"lamp_cord_{k}", [(x, CEIL - 0.22, z), (x, y + 0.2, z)], 0.006, M("iron"))
    cyl(f"lamp_cap_{k}", 0.04, 0.06, (x, y + 0.18, z), M("brass", rough=0.3, metal=0.9), seg=14, bevel=0.004)
    S.cone_shell(f"lamp_shade_{k}", 0.2, 0.05, 0.16, (x, y + 0.08, z), M("brass", rough=0.3, metal=0.9), seg=28)
    sphere(f"lamp_bulb_{k}_noshadow", 0.075, (x, y - 0.01, z), M("lamp_warm"), seg=16, keep=True)

# ----------------------------------------------------------------------------- posters (original) on the right wall gap
def _poster_leaf(u, v):
    o = fill(u, "#f6eddf"); paint(o, v > 0.88, "#8fa77e")
    d = ((u - 0.5) / 0.28) ** 2 + ((v - 0.5) / 0.34) ** 2
    paint(o, d < 1, "#aec29b"); paint(o, (np.abs(u - 0.5) < 0.008) & (d < 1), "#5f7a55")
    for j in range(5):
        yy = 0.3 + j * 0.09
        paint(o, (np.abs((v - yy) - np.abs(u - 0.5) * 0.6) < 0.006) & (d < 1), "#5f7a55")
    paint(o, (v < 0.12) & (v > 0.09) & (u > 0.2) & (u < 0.8), "#c8714f")
    return o
def _poster_g(u, v):
    o = fill(u, "#efe2c9"); paint(o, v > 0.88, "#c8714f")
    for j in range(6):
        yy = 0.8 - 0.65 * (j / 5) ** 2
        paint(o, (u - 0.5) ** 2 + ((v - yy) * 0.7) ** 2 < 0.0011, "#c8714f")
    paint(o, (np.abs(u - 0.5) < 0.004) & (v < 0.84) & (v > 0.1) & (((v * 40) % 1) < 0.5), "#4a3b30")
    paint(o, (v < 0.1) & (v > 0.08) & (u > 0.15) & (u < 0.85), "#4a3b30")
    return o
for k, (fn, zz) in enumerate(((_poster_leaf, 3.0), (_poster_g, 4.2))):
    box(f"poster_frame_{k}", (0.03, 0.92, 0.68), (RIGHT - 0.015, 2.0, zz), M("honey_dk"), bevel=0.006, step=0)
    plane(f"poster_{k}", 0.6, 0.84, (RIGHT - 0.035, 2.0, zz), M(f"poster_{k}", rough=0.8, image=image(f"poster_img_{k}", 256, 360, fn)), facing="-x")
# wall clock above the chalkboard side (round, brass)
cyl("clock_body", 0.22, 0.05, (RIGHT - 0.03, 3.7, 3.6), M("cream_lt", rough=0.5), seg=32, axis="x", bevel=0.01)
torus("clock_rim", 0.22, 0.02, (RIGHT - 0.05, 3.7, 3.6), M("brass", rough=0.3, metal=0.9), seg=32, minor=6, facing="x")

# ----------------------------------------------------------------------------- hero: floor measuring tape + height staff
TAPE_X0, TAPE_X1, TAPE_W = -0.06, 3.42, 0.4
def _tape(u, v):
    L = TAPE_X1 - TAPE_X0
    xm = TAPE_X0 + u * L
    o = fill(u, "#f6e7b8")
    paint(o, (v < 0.05) | (v > 0.95), "#c8714f")
    cm = np.abs(((xm + 1e-6) * 100) - np.round(xm * 100))
    paint(o, (cm < 0.09) & (v > 0.05) & (v < 0.2), "#4a3b30")                                  # 1 cm
    dm = np.abs((xm * 10) - np.round(xm * 10))
    paint(o, (dm < 0.035) & (v > 0.05) & (v < 0.38), "#4a3b30")                                 # 10 cm
    half = np.abs((xm * 2) - np.round(xm * 2))
    paint(o, (half < 0.012) & (v > 0.05) & (v < 0.95), "#c8714f")                               # every 0.5 m
    paint(o, (np.abs(xm) < 0.012) & (v > 0.0) & (v < 1.0), "#a5553a")                           # the 0 line
    return o
TAPE_IMG = image("tape_img", 2048, 128, _tape)
plane("tape_anna", TAPE_X1 - TAPE_X0, TAPE_W, ((TAPE_X0 + TAPE_X1) / 2, 0.006, LANE_ANNA), M("tape", rough=0.5, image=TAPE_IMG), facing="y")
box("tape_anna_back", (TAPE_X1 - TAPE_X0, 0.004, TAPE_W + 0.01), ((TAPE_X0 + TAPE_X1) / 2, 0.002, LANE_ANNA), M("terra_dk", rough=0.6), bevel=0, step=0.6)
# short tape on Zuzu's lane (only the first 0.6 m) + a bold zero bar across both lanes at the launch line
ZX1 = 0.62
plane("tape_zuzu", ZX1 - TAPE_X0, TAPE_W, ((TAPE_X0 + ZX1) / 2, 0.006, LANE_ZUZU), M("tape_short", rough=0.5,
      image=image("tape_short_img", 512, 128, lambda u, v: _tape(u * (ZX1 - TAPE_X0) / (TAPE_X1 - TAPE_X0), v))), facing="y")
box("tape_zuzu_back", (ZX1 - TAPE_X0, 0.004, TAPE_W + 0.01), ((TAPE_X0 + ZX1) / 2, 0.002, LANE_ZUZU), M("terra_dk"), bevel=0, step=0)
box("zero_bar", (0.035, 0.008, 1.5), (0.0, 0.008, 0.0), M("terra_dk"), bevel=0.002, step=0.5)
# big numbers on the tape (flat), every 0.5 m
NUM = M("ink", rough=0.6)
for k in range(7):
    xm = k * 0.5
    label = ("0" if k == 0 else (f"{xm:g}")) + (" m" if k in (2, 4, 6) else "")
    ob = text(f"tape_num_{k}", label, 0.15, (xm + (0.07 if k == 0 else 0.0) + (0.06 if " m" in label else 0.0), 0.009, LANE_ANNA + 0.05), NUM, extrude=0.0015)
    ob.rotation_euler = (0, 0, 0)
ob = text("tape_num_z0", "0", 0.15, (0.07, 0.009, LANE_ZUZU + 0.05), NUM, extrude=0.0015); ob.rotation_euler = (0, 0, 0)
# the giant tape-measure case the tape runs out of (terracotta shell, brass hub, cream belt clip)
CX = TAPE_X1 + 0.2
cyl("tcase_body", 0.22, 0.26, (CX, 0.23, LANE_ANNA), M("terra", rough=0.45), seg=36, axis="z", bevel=0.03)
for s_ in (-1, 1):
    cyl(f"tcase_hub_{s_}", 0.08, 0.02, (CX, 0.23, LANE_ANNA + s_ * 0.13), M("brass", rough=0.3, metal=0.9), seg=24, axis="z", bevel=0.004)
    torus(f"tcase_ring_{s_}", 0.17, 0.012, (CX, 0.23, LANE_ANNA + s_ * 0.132), M("cream_lt", rough=0.5), seg=32, minor=6, facing="z")
box("tcase_mouth", (0.08, 0.05, TAPE_W + 0.04), (CX - 0.19, 0.04, LANE_ANNA), M("terra_dk", rough=0.5), bevel=0.01, step=0)
box("tcase_lock", (0.07, 0.08, 0.06), (CX - 0.08, 0.46, LANE_ANNA), M("cream_lt", rough=0.5), bevel=0.015, step=0)
box("tape_hook", (0.04, 0.05, TAPE_W), (TAPE_X0 - 0.01, 0.025, LANE_ANNA), M("brass", rough=0.3, metal=0.9), bevel=0.004, step=0)
# height staff beside the launch gap: honey wood, 0-2 m, terracotta arrow at 2 m (the release height)
HS_Z = GAP[0] - 0.14
def _staff(u, v):
    hm = v * 2.15
    o = fill(u, "#f6e7b8")
    dm = np.abs(hm * 10 - np.round(hm * 10))
    paint(o, (dm < 0.04) & (u < 0.45), "#4a3b30")
    half = np.abs(hm * 2 - np.round(hm * 2))
    paint(o, (half < 0.01) & (u < 0.8), "#c8714f")
    paint(o, (np.abs(hm - 2.0) < 0.012), "#a5553a")
    return o
box("staff_post", (0.07, 2.18, 0.12), (-0.02, 1.09, HS_Z), wood(0, 0.5), bevel=0.008, step=0.3)
plane("staff_face", 0.1, 2.15, (0.016, 1.075, HS_Z), M("staff", rough=0.5, image=image("staff_img", 64, 1024, _staff)), facing="x")
for k, hm in enumerate((0.5, 1.0, 1.5, 2.0)):
    ob = text(f"staff_num_{k}", f"{hm:g} m" if hm in (1.0, 2.0) else f"{hm:g}", 0.075 if hm != 2.0 else 0.1,
              (0.022, hm + 0.06, HS_Z + 0.03), M("ink") if hm != 2.0 else M("terra_dk"), extrude=0.002)
    ob.rotation_euler = (math.radians(90), 0, math.radians(90))
box("staff_foot", (0.2, 0.03, 0.22), (-0.02, 0.015, HS_Z), M("terra", rough=0.6), bevel=0.006, step=0)
# small sign on the fascia under the gap
box("gap_sign", (0.012, 0.14, 0.5), (LIP_X + 0.003, DECK_Y - 0.36, 0), M("cream_lt", rough=0.6), bevel=0.003, step=0)
ob = text("gap_sign_t", "LAUNCH EDGE", 0.05, (LIP_X + 0.012, DECK_Y - 0.365, 0), M("terra_dk"), extrude=0.002)
ob.rotation_euler = (math.radians(90), 0, math.radians(90))

# ----------------------------------------------------------------------------- floor clutter (kept out of the cast's area)
# a basket of spare balls under the balcony, a stack of floor cushions, a watering can
cyl("basket", 0.24, 0.26, (-0.8, 0.13, 1.0), M("honey_lt", rough=0.85), seg=24, r2=0.28, bevel=0.01)
for k in range(5):
    a = k / 5 * 6.283
    sphere(f"basket_ball_{k}", 0.065, (-0.8 + math.cos(a) * 0.12, 0.29, 1.0 + math.sin(a) * 0.12), M(["terra_lt", "sage_lt", "b_mustard"][k % 3], rough=0.5), seg=14)
for k in range(3):
    box(f"cushion_{k}", (0.55, 0.1, 0.55), (-1.7, 0.05 + k * 0.1, -0.4), M(["sage", "terra_lt", "cream_dk"][k], rough=0.95), bevel=0.04, step=0, rot_y=k * 11)
cyl("wcan", 0.09, 0.2, (3.7, 0.1, -2.9), M("sage_dk", rough=0.4, metal=0.3), seg=18, bevel=0.01)
poly_tube("wcan_spout", [(3.78, 0.1, -2.9), (3.95, 0.26, -2.9)], 0.015, M("sage_dk"))

tris = S.finish(ao_tint="#9a7a5c", ao_floor=0.5)
assert tris < 300_000, f"over budget: {tris} tris"
