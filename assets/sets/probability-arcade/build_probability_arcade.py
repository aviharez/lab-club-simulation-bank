"""Probability arcade (EP05 "Galton Board"): procedural build -> probability-arcade.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/probability-arcade/build_probability_arcade.py [-- --no-bake]

Concept: "The Probability Arcade", a cozy retro arcade room after closing time. Palette: dark walnut wood, polished
brass, warm amber, small teal neon accents. Light story (React): a dim warm room, pools of light under brass pendant
lamps, neon signs and cabinet screens as practicals, bloom on the brass. Hero piece: a giant brass-and-glass Galton
machine (12 rows of pegs, 13 labelled bins, a funnel on top, ornate walnut frame with a sunburst crest) with a walkway on
its top rail for Miyu. Depth: arcade cabinets on the foreground edges, the machine midground, a wall of framed
probability posters (all original art) and neon signs behind, more cabinets along the side walls.

This GLB holds the static set. Live in React (episodes/src/sets/probability-arcade): the glass front, the balls
(instanced), the ball counter display, bet tags on the bins, cabinet screen flicker, pendant spot lights + haze.
Layout numbers: episodes/src/sets/probability-arcade/layout.ts (keep in sync).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint, cone_shell
import bmesh
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "walnut": "#5a3620", "walnut_dk": "#3a2214", "walnut_lt": "#7a4a2a", "board": "#3b2416",
    "brass": "#c9a04a", "brass_dk": "#8f6a2c", "brass_lt": "#e6c57a",
    "wall": "#3a2419", "ceil": "#22150f", "beam": "#2e1c12", "black": "#15100d", "felt": "#1d3a37",
    "cream": "#e8d8b8", "ink": "#2a1a10", "amber": "#ffb347", "teal": "#2fd3c4", "rubber": "#1b1613",
    "cab_side": "#4a2c1a", "glass_case": "#cfe7e2",
}
S.begin("probability-arcade", HERE, PAL)
R = S.R

# ---- layout (keep in sync with layout.ts)
LEFT, RIGHT, BACK, FRONT, CEIL = -6.5, 6.5, -4.4, 7.5, 5.6
ROWS, PITCH, ROW_DY = 12, 0.17, 0.147
BIN_Y0, BIN_H, PEG_Y_LAST = 0.7, 1.0, 1.85
GLASS_Z, BALL_R = -1.0, 0.013
BACK_Z = GLASS_Z - 2.6 * BALL_R
PEG_R = 0.012
HALF_W = (ROWS + 1) / 2 * PITCH
FRAME_HALF = HALF_W + 0.2
TOP_Y = 3.62
FUN_MOUTH_Y, FUN_MOUTH_H, FUN_NECK_Y, FUN_NECK_H = 4.02, 0.36, 3.6, 0.035
CREST_Y = 4.75
CASE_BACK, BEZEL_Z = GLASS_Z - 0.38, GLASS_Z + 0.05
PLINTH_Y, LABEL_Y = 0.62, 0.5
DIV = 0.008
PLAT_POS, PLAT_SIZE = (0.86, 3.64, -1.02), (0.86, 0.62)
PENDANTS = [(-1.9, 4.0, 0.9), (1.9, 4.0, 0.9), (-4.3, 3.6, -2.2), (4.3, 3.6, -2.2)]
CAB_FG = [((-1.02, 0, 5.0), 0.85), ((1.05, 0, 5.15), -0.85)]
CAB_SIDE = [((-5.7, 0, -2.6), math.pi / 2), ((-5.7, 0, -1.4), math.pi / 2), ((-5.7, 0, -0.2), math.pi / 2), ((5.7, 0, -0.4), -math.pi / 2)]
peg_y = lambda i: PEG_Y_LAST + (ROWS - 1 - i) * ROW_DY
peg_x = lambda i, j: (j - i / 2) * PITCH
bin_x = lambda k: (k - ROWS / 2) * PITCH


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


def uv_scale(ob, su, sv):
    for l in ob.data.uv_layers[0].data: l.uv = (l.uv[0] * su, l.uv[1] * sv)


def _planks(u, v):  # 1 m tile: 8 walnut strips, staggered butt joints, per-plank tone, grain along u
    o = fill(u, "#4a2c19")
    row = np.floor(v * 8).astype(int)
    off = (row * 0.37) % 1.0
    uu = (u + off) % 1.0
    seg = np.floor(uu * 2).astype(int)
    rr = np.random.RandomState(11); tone = rr.uniform(-0.18, 0.14, (8, 2))
    shade(o, tone[row % 8, seg])
    grain = np.sin((v * 8 % 1) * 40 + _noise(uu, v, 12, 5) * 18) * 0.06 + (_noise(u * 0.2, v, 60, 6) - 0.5) * 0.08
    shade(o, grain)
    seam = ((v * 8) % 1 < 0.025) | ((uu * 2) % 1 < 0.006)
    paint(o, seam, "#1e120a")
    return o
PLANK_IMG = image("walnut_planks", 512, 512, _planks)


def _wallpaper(u, v):  # 0.5 m tile: dark warm stripes, a small brass diamond motif
    o = fill(u, "#3a2419")
    stripe = (np.abs(((u * 4) % 1) - 0.5) < 0.18)
    paint(o, stripe, "#33200f", 0.55)
    d = np.abs(((u * 4) % 1) - 0.5) + np.abs(((v * 4) % 1) - 0.5)
    paint(o, (d < 0.14) & (d > 0.09), "#6b4d2a", 0.8)
    paint(o, d < 0.04, "#7a5a32", 0.8)
    shade(o, (_noise(u, v, 20, 9) - 0.5) * 0.08)
    return o
WALLPAPER_IMG = image("wallpaper", 256, 256, _wallpaper)


def _rug(u, v):  # rug: amber + brass border bands, deep burgundy field, teal diamond medallions
    o = fill(u, "#4a1d18")
    x = np.minimum(u, 1 - u) * 4.2; y = np.minimum(v, 1 - v) * 3.0   # metres from the edge
    e = np.minimum(x, y)
    paint(o, e < 0.06, "#2a1410"); paint(o, (e > 0.08) & (e < 0.16), "#c98a3a"); paint(o, (e > 0.2) & (e < 0.24), "#7a5a32")
    paint(o, (e > 0.28) & (e < 0.31), "#1f5a55")
    inner = e > 0.36
    cx = (u - 0.5) * 4.2; cy = (v - 0.5) * 3.0
    dd = np.abs(((cx / 0.6) % 1) - 0.5) + np.abs(((cy / 0.6) % 1) - 0.5)
    paint(o, inner & (dd < 0.2), "#5e2620")
    paint(o, inner & (dd < 0.1), "#1f5a55", 0.8)
    m = np.abs(cx) / 1.0 + np.abs(cy) / 0.7
    paint(o, inner & (m < 1.0) & (m > 0.9), "#c98a3a"); paint(o, inner & (m < 0.6), "#2a1410", 0.6)
    paint(o, inner & (m < 0.42), "#1f5a55"); paint(o, inner & (m < 0.2), "#c98a3a")
    shade(o, (_noise(u, v, 90, 12) - 0.5) * 0.18)
    return o
RUG_IMG = image("rug", 1024, 732, _rug)


def _sunburst(u, v):  # crest disc: amber rays on dark walnut
    o = fill(u, "#3b2416")
    x = u - 0.5; y = v - 0.5; r = np.hypot(x, y); a = np.arctan2(y, x)
    rays = (np.cos(a * 16) > 0.2) & (r < 0.48) & (r > 0.1)
    paint(o, rays, "#8f6a2c", 0.9)
    paint(o, (r < 0.1), "#c9a04a")
    paint(o, (r > 0.455) & (r < 0.48), "#c9a04a")
    return o
SUN_IMG = image("sunburst", 512, 512, _sunburst)


def _board(u, v):  # back board: walnut with faint engraved guide lines
    o = fill(u, "#3b2416")
    shade(o, np.sin(u * 300 + _noise(u, v, 30, 21) * 25) * 0.05 + (_noise(u, v, 8, 22) - 0.5) * 0.12)
    return o
BOARD_IMG = image("board", 512, 1024, _board)


# posters: vintage prints, cream paper, brown ink, muted amber + teal (kept lower in contrast than the mascots)
PAPER, PINK, PAMB, PTEAL = "#d9c7a2", "#3a2618", "#c98a3a", "#3f8f86"
def _paper(u, v, seed):
    o = fill(u, PAPER); shade(o, (_noise(u, v, 14, seed) - 0.5) * 0.12 - np.clip(0.06 - np.minimum.reduce([u, 1 - u, v, 1 - v]), 0, 1) * 2.0)
    b = np.minimum.reduce([u, 1 - u, v, 1 - v]); paint(o, (b > 0.035) & (b < 0.045), PINK)
    return o
def _disc(u, v, cx, cy, r, asp=0.78): return np.hypot((u - cx) * asp, v - cy) < r

def _p_coin(u, v):
    o = _paper(u, v, 31)
    paint(o, _disc(u, v, 0.5, 0.56, 0.3), PAMB); paint(o, _disc(u, v, 0.5, 0.56, 0.26), "#e0b060")
    half = u > 0.5
    paint(o, _disc(u, v, 0.5, 0.56, 0.26) & half, PTEAL, 0.85)
    paint(o, _disc(u, v, 0.5, 0.56, 0.08) & ~half, PINK); paint(o, (np.abs(u - 0.5) < 0.006) & _disc(u, v, 0.5, 0.56, 0.3), PINK)
    for k in range(5): paint(o, (np.abs(v - 0.16 - k * 0.025) < 0.006) & (np.abs(u - 0.5) < 0.3 - k * 0.04), PINK, 0.7)
    return o

def _p_dice(u, v):
    o = _paper(u, v, 32)
    for (cx, cy, rot, pips, col) in ((0.36, 0.6, 0.3, 5, PAMB), (0.64, 0.42, -0.25, 3, PTEAL)):
        x = (u - cx) * 0.78; y = v - cy
        xr = x * math.cos(rot) - y * math.sin(rot); yr = x * math.sin(rot) + y * math.cos(rot)
        sq = (np.abs(xr) < 0.15) & (np.abs(yr) < 0.15)
        paint(o, (np.abs(xr) < 0.165) & (np.abs(yr) < 0.165), PINK); paint(o, sq, col)
        spots = {5: [(-1, -1), (1, 1), (-1, 1), (1, -1), (0, 0)], 3: [(-1, -1), (0, 0), (1, 1)]}[pips]
        for (a, b) in spots: paint(o, np.hypot(xr - a * 0.08, yr - b * 0.08) < 0.03, "#f2e6cc")
    return o

def _p_pascal(u, v):
    o = _paper(u, v, 33)
    for n in range(7):
        for k in range(n + 1):
            c = math.comb(n, k); r = 0.012 + 0.004 * math.sqrt(c)
            x = 0.5 + (k - n / 2) * 0.12; y = 0.84 - n * 0.1
            paint(o, _disc(u, v, x, y, r), PTEAL if c % 2 else PAMB)
    return o

def _p_walk(u, v):
    o = _paper(u, v, 34)
    rr = np.random.RandomState(35)
    for col, seed in ((PAMB, 1), (PTEAL, 2), (PINK, 3)):
        r2 = np.random.RandomState(seed + 40); y = 0.5; x = 0.1
        for _ in range(28):
            nx = x + 0.028; ny = y + (0.035 if r2.rand() < 0.5 else -0.035)
            t = np.clip(((u - x) * (nx - x) + (v - y) * (ny - y)) / ((nx - x) ** 2 + (ny - y) ** 2), 0, 1)
            d = np.hypot((u - (x + t * (nx - x))) * 0.78, v - (y + t * (ny - y)))
            paint(o, d < 0.006, col); x, y = nx, ny
    paint(o, (np.abs(v - 0.5) < 0.002) & (u > 0.08) & (u < 0.92), PINK, 0.5)
    return o

def _p_spinner(u, v):
    o = _paper(u, v, 36)
    x = (u - 0.5) * 0.78; y = v - 0.55; r = np.hypot(x, y); a = (np.arctan2(y, x) + math.pi) / (2 * math.pi)
    seg = np.floor(a * 8).astype(int)
    for s, col in enumerate((PAMB, PTEAL, "#e8d3a6", PAMB, PTEAL, "#e8d3a6", PAMB, PTEAL)):
        paint(o, (r < 0.28) & (seg == s), col)
    paint(o, (r > 0.28) & (r < 0.3), PINK)
    tt = np.clip((x * 0.6 + y * 0.8) / 0.22, 0, 1); d = np.hypot(x - tt * 0.6 * 0.22, y - tt * 0.8 * 0.22)
    paint(o, (d < 0.012 * (1.6 - tt)), PINK); paint(o, r < 0.03, PINK)
    return o

def _p_lotto(u, v):
    o = _paper(u, v, 37)
    paint(o, _disc(u, v, 0.5, 0.58, 0.3), "#cdb88f"); paint(o, _disc(u, v, 0.5, 0.58, 0.29) & ~_disc(u, v, 0.5, 0.58, 0.28), PINK)
    rr = np.random.RandomState(38)
    for k in range(13):
        a = rr.rand() * 6.283; d = math.sqrt(rr.rand()) * 0.22
        paint(o, _disc(u, v, 0.5 + math.cos(a) * d / 0.78, 0.58 + math.sin(a) * d, 0.035), (PAMB, PTEAL, "#f0e2c4")[k % 3])
    paint(o, (np.abs(u - 0.5) < 0.04) & (v < 0.3) & (v > 0.2), PINK)
    return o

POSTERS = [("coin", _p_coin, "HEADS OR TAILS"), ("dice", _p_dice, "ROLL TWO"), ("pascal", _p_pascal, "PASCAL"),
           ("walk", _p_walk, "RANDOM WALK"), ("spinner", _p_spinner, "SPIN IT"), ("lotto", _p_lotto, "LUCKY DRAW")]
POSTER_IMG = {k: image(f"poster_{k}", 256, 328, fn) for k, fn, _ in POSTERS}


def _screen(kind):  # cabinet screens (emissive): original pixel-art style games
    def fn(u, v):
        o = fill(u, "#06110f")
        if kind == 0:   # falling dots game
            gx = np.floor(u * 24); gy = np.floor(v * 32)
            h = (np.sin(gx * 12.9898 + gy * 78.233) * 43758.5) % 1
            paint(o, (h > 0.93) & (((u * 24) % 1) < 0.7) & (((v * 32) % 1) < 0.7), "#2fd3c4")
            paint(o, (v < 0.12) & (np.abs(((u * 6) % 1) - 0.5) < 0.4), "#c98a3a")
        elif kind == 1:  # coin tower bars
            for k in range(7):
                hh = 0.2 + 0.6 * abs(math.sin(k * 1.7 + 0.4))
                paint(o, (np.abs(u - (0.12 + k * 0.127)) < 0.045) & (v < hh) & (v > 0.08) & (((v * 30) % 1) > 0.25), "#ffb347")
            paint(o, (v > 0.88) & (u < 0.5), "#2fd3c4")
        else:            # dice board
            for (cx, cy) in ((0.3, 0.6), (0.7, 0.4)):
                paint(o, (np.abs(u - cx) < 0.15) & (np.abs(v - cy) < 0.11), "#2fd3c4")
                paint(o, (np.abs(u - cx) < 0.13) & (np.abs(v - cy) < 0.09), "#06110f")
                for a, b in ((-1, -1), (0, 0), (1, 1)): paint(o, np.hypot((u - cx - a * 0.06), (v - cy - b * 0.045) * 1.3) < 0.02, "#ffb347")
        shade(o, np.where(((v * 120) % 1) < 0.3, -0.25, 0.0))   # scanlines
        return o
    return image(f"screen{kind}", 192, 256, fn)
SCREENS = [_screen(k) for k in range(3)]


def _marquee(kind):
    def fn(u, v):
        o = fill(u, "#2a1608")
        x = u - 0.5; y = v - 0.5
        paint(o, np.abs(y) < 0.36, ("#c9741f", "#1f6f68", "#8a3a1a")[kind])
        rays = (np.cos(np.arctan2(y, x * 0.3) * 10) > 0.6) & (np.abs(y) < 0.36)
        paint(o, rays, "#e0a050", 0.35)
        paint(o, (np.abs(np.abs(y) - 0.4) < 0.025), "#e6c57a")
        return o
    return image(f"marquee{kind}", 256, 64, fn)
MARQUEES = [_marquee(k) for k in range(3)]


# ----------------------------------------------------------------------------- materials
WAL = M("walnut", rough=0.42, image=None); WAL_DK = M("walnut_dk", rough=0.5); WAL_LT = M("walnut_lt", rough=0.4)
BRASS = M("brass", rough=0.24, metal=0.95); BRASS_DK = M("brass_dk", rough=0.38, metal=0.9); BRASS_LT = M("brass_lt", rough=0.18, metal=0.95)
BLACK = M("black", rough=0.6); RUB = M("rubber", rough=0.85); CREAM = M("cream", rough=0.6)
BULB = M("bulb_noshadow", color="#ffd9a0", rough=0.4, emit="#ffc070", emit_strength=6.0)
AMBER_EMIT = M("amber_noshadow", color="#ffb347", rough=0.4, emit="#ffa030", emit_strength=4.0)
TEAL_NEON = M("neon_teal_noshadow", color="#5ff0e0", rough=0.3, emit="#2fd3c4", emit_strength=7.0)
AMBER_NEON = M("neon_amber_noshadow", color="#ffd090", rough=0.3, emit="#ffa040", emit_strength=6.0)


def local(c, yaw, lx, ly, lz):
    """Local cabinet coords (faces +z) -> world, for a feet centre c and yaw (radians, three convention)."""
    return (c[0] + lx * math.cos(yaw) + lz * math.sin(yaw), c[1] + ly, c[2] - lx * math.sin(yaw) + lz * math.cos(yaw))


def tiled(name, w, h, at, mat, tile, facing="z"):
    ob = plane(name, w, h, at, mat, facing=facing); uv_scale(ob, w / tile, h / tile)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=max(2, int(max(w, h) / 0.4)), use_grid_fill=True); bm.to_mesh(ob.data); bm.free()
    return ob


# ----------------------------------------------------------------------------- floor, rug, ceiling
fl = plane("floor", RIGHT - LEFT, FRONT - BACK, ((LEFT + RIGHT) / 2, 0.0, (BACK + FRONT) / 2), M("planks", rough=0.36, image=PLANK_IMG), facing="y")
uv_scale(fl, RIGHT - LEFT, FRONT - BACK)
bm = bmesh.new(); bm.from_mesh(fl.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=30, use_grid_fill=True); bm.to_mesh(fl.data); bm.free()
rug = plane("rug", 4.2, 3.0, (0, 0.006, 0.95), M("rug", rough=0.95, image=RUG_IMG), facing="y")
bm = bmesh.new(); bm.from_mesh(rug.data); bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=10, use_grid_fill=True); bm.to_mesh(rug.data); bm.free()
plane("ceiling_noshadow", RIGHT - LEFT, FRONT - BACK, ((LEFT + RIGHT) / 2, CEIL, (BACK + FRONT) / 2), M("ceil_noshadow", color="#22150f", rough=0.8), facing="y").rotation_euler.x = math.pi
for x in np.arange(LEFT + 0.75, RIGHT, 1.5):
    box(f"beam_{x:.1f}_noshadow", (0.22, 0.26, FRONT - BACK), (x, CEIL - 0.13, (BACK + FRONT) / 2), M("beam_noshadow", color="#2e1c12", rough=0.7), bevel=0.02, step=0.6)

# ----------------------------------------------------------------------------- walls: walnut wainscot, brass rail, wallpaper
WAIN = 1.15
def wall_run(name, a, b, along):
    """A wall face from a to b (x for back wall, z for side walls). along: 'x' (back wall, faces +z) or 'zl' / 'zr'."""
    L = b - a; mid = (a + b) / 2
    if along == "x":
        at = lambda u, y, d: (u, y, BACK + d); sz = lambda w, h, t: (w, h, t); face = "z"
    else:
        s_ = 1 if along == "zl" else -1; X = LEFT if along == "zl" else RIGHT
        at = lambda u, y, d: (X + s_ * d, y, u); sz = lambda w, h, t: (t, h, w); face = "x" if along == "zl" else "-x"
    tiled(f"{name}_paper", L, CEIL - WAIN, at(mid, (CEIL + WAIN) / 2, 0.005), M("wallpaper", rough=0.85, image=WALLPAPER_IMG), 0.5, facing=face)
    box(f"{name}_wain", sz(L, WAIN, 0.04), at(mid, WAIN / 2, 0.02), WAL_DK, bevel=0.0, step=0.4)
    n = max(1, int(L / 0.85))
    for k in range(n):
        u = a + (k + 0.5) * L / n
        box(f"{name}_pnl{k}", sz(L / n - 0.16, WAIN - 0.36, 0.025), at(u, WAIN / 2 + 0.03, 0.05), WAL, bevel=0.012, step=0.3)
        box(f"{name}_pnlin{k}", sz(L / n - 0.3, WAIN - 0.5, 0.02), at(u, WAIN / 2 + 0.03, 0.07), WAL_LT, bevel=0.01, step=0.3)
    box(f"{name}_rail", sz(L, 0.05, 0.06), at(mid, WAIN, 0.05), BRASS_DK, bevel=0.01, step=0.8)
    box(f"{name}_base", sz(L, 0.14, 0.05), at(mid, 0.07, 0.045), BLACK, bevel=0.008, step=0.8)
    box(f"{name}_crown", sz(L, 0.14, 0.1), at(mid, CEIL - 0.07, 0.05), WAL_DK, bevel=0.015, step=0.8)
    box(f"{name}_crown_b", sz(L, 0.025, 0.11), at(mid, CEIL - 0.15, 0.055), BRASS_DK, bevel=0.005, step=0.8)
wall_run("bw", LEFT, RIGHT, "x")
wall_run("lw", BACK, FRONT, "zl")
wall_run("rw", BACK, FRONT, "zr")

# ----------------------------------------------------------------------------- posters (back wall), plaques, sconces
PW, PH = 0.82, 1.05
for k, ((key, _, title), x) in enumerate(zip(POSTERS, (-4.6, -3.3, -2.0, 2.0, 3.3, 4.6))):
    y = 2.25; z = BACK + 0.04
    box(f"pframe{k}", (PW + 0.12, PH + 0.12, 0.05), (x, y, z), WAL_DK, bevel=0.015, step=0)
    box(f"pframe_in{k}", (PW + 0.04, PH + 0.04, 0.055), (x, y, z + 0.005), BRASS_DK, bevel=0.006, step=0)
    plane(f"poster{k}", PW, PH, (x, y, z + 0.035), M(f"poster_{key}", rough=0.75, image=POSTER_IMG[key]), facing="z")
    box(f"pplaque{k}", (0.62, 0.11, 0.02), (x, y - PH / 2 - 0.17, z + 0.01), BRASS, bevel=0.006, step=0)
    text(f"ptitle{k}", title, 0.055, (x, y - PH / 2 - 0.17, z + 0.025), M("ink", rough=0.5), extrude=0.003)
for x in (-3.95, -2.65, 2.65, 3.95, -5.4, 5.4):  # brass sconces between the posters (amber practicals)
    y = 2.55
    box(f"sconce_plate{x}", (0.12, 0.2, 0.02), (x, y, BACK + 0.02), BRASS_DK, bevel=0.006, step=0)
    poly_tube(f"sconce_arm{x}", [(x, y - 0.03, BACK + 0.03), (x, y + 0.02, BACK + 0.16)], 0.01, BRASS)
    cone_shell(f"sconce_shade{x}", 0.07, 0.04, 0.12, (x, y + 0.09, BACK + 0.16), M("amber_glass_noshadow", color="#ffcf8a", rough=0.5, emit="#ff9a40", emit_strength=2.2), seg=20, thickness=0.004)
    sphere(f"sconce_bulb{x}_noshadow", 0.025, (x, y + 0.07, BACK + 0.16), BULB, seg=10)

# ----------------------------------------------------------------------------- neon signs (practicals)
def neon_board(name, x, y, w, h):
    box(f"{name}_board", (w, h, 0.03), (x, y, BACK + 0.06), M("felt", rough=0.8), bevel=0.01, step=0)
    box(f"{name}_trim", (w + 0.04, h + 0.04, 0.02), (x, y, BACK + 0.045), BRASS_DK, bevel=0.006, step=0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(f"{name}_stand{sx}{sy}", 0.012, 0.05, (x + sx * (w / 2 - 0.06), y + sy * (h / 2 - 0.06), BACK + 0.09), BRASS, seg=8, axis="z", bevel=0)
neon_board("neonL", -2.75, 3.9, 2.3, 0.95)
ob = text("neon_arcade_noshadow", "ARCADE", 0.42, (-2.75, 3.82, BACK + 0.1), TEAL_NEON, extrude=0.012); ob.data.bevel_depth = 0.008
text("neon_prob_noshadow", "PROBABILITY", 0.16, (-2.75, 4.17, BACK + 0.1), AMBER_NEON, extrude=0.008)
poly_tube("neon_under_noshadow", [(-3.7, 3.58, BACK + 0.1), (-1.8, 3.58, BACK + 0.1)], 0.012, AMBER_NEON)
neon_board("neonR", 2.75, 3.9, 2.0, 0.95)
text("neon_5050_noshadow", "50 / 50", 0.36, (2.75, 3.85, BACK + 0.1), AMBER_NEON, extrude=0.012).data.bevel_depth = 0.007
# a teal neon coin ring beside it
torus("neon_coin_noshadow", 0.18, 0.012, (3.5, 4.12, BACK + 0.11), TEAL_NEON, seg=40, minor=8, facing="z")
torus("neon_coin2_noshadow", 0.18, 0.012, (2.0, 4.12, BACK + 0.11), TEAL_NEON, seg=40, minor=8, facing="z")

# ----------------------------------------------------------------------------- pendant lamps (bulbs; spots are React)
for k, (x, y, z) in enumerate(PENDANTS):
    poly_tube(f"pend_cord{k}", [(x, CEIL - 0.02, z), (x, y + 0.2, z)], 0.008, RUB)
    cyl(f"pend_cap{k}", 0.05, 0.06, (x, y + 0.2, z), BRASS, seg=16, bevel=0.005)
    cone_shell(f"pend_shade{k}", 0.3, 0.05, 0.24, (x, y + 0.07, z), BRASS, seg=40, thickness=0.006)
    torus(f"pend_rim{k}", 0.3, 0.008, (x, y - 0.05, z), BRASS_LT, seg=40, minor=6, facing="y")
    sphere(f"pend_bulb{k}_noshadow", 0.06, (x, y - 0.02, z), BULB, seg=14)
    cyl(f"ceil_rose{k}", 0.08, 0.03, (x, CEIL - 0.015, z), BRASS_DK, seg=16, bevel=0.005)

# ----------------------------------------------------------------------------- arcade cabinets (original designs)
GAME_NAMES = ["BOUNCE!", "COIN RUSH", "DICE DASH"]
def cabinet(name, c, yaw, kind, side_trim=True):
    yd = math.degrees(yaw)
    L = lambda lx, ly, lz: local(c, yaw, lx, ly, lz)
    W, D, H = 0.72, 0.74, 1.86
    side = M("cab_side", rough=0.45)
    for s_ in (-1, 1):  # side panels with a brass edge band
        box(f"{name}_side{s_}", (0.04, H, D), L(s_ * (W / 2 - 0.02), H / 2, 0), side, bevel=0.012, step=0.4, rot_y=yd)
        box(f"{name}_sband{s_}", (0.045, 0.04, D - 0.04), L(s_ * (W / 2 - 0.02), 0.95, 0), BRASS, bevel=0.006, step=0, rot_y=yd)
        box(f"{name}_sedge{s_}", (0.05, H - 0.1, 0.03), L(s_ * (W / 2 - 0.02), H / 2, D / 2 - 0.01), BRASS_DK, bevel=0.006, step=0, rot_y=yd)
    box(f"{name}_back", (W - 0.06, H - 0.1, 0.03), L(0, H / 2, -D / 2 + 0.02), side, bevel=0.0, step=0.5, rot_y=yd)
    box(f"{name}_kick", (W - 0.06, 0.9, 0.04), L(0, 0.45, D / 2 - 0.08), WAL, bevel=0.01, step=0.3, rot_y=yd)
    box(f"{name}_coindoor", (0.3, 0.32, 0.02), L(0, 0.48, D / 2 - 0.055), BRASS_DK, bevel=0.006, step=0, rot_y=yd)
    for s_ in (-1, 1):
        box(f"{name}_slot{s_}_noshadow", (0.04, 0.07, 0.01), L(s_ * 0.07, 0.55, D / 2 - 0.043), AMBER_EMIT, bevel=0, step=0, rot_y=yd)
    box(f"{name}_toe", (W, 0.06, D), L(0, 0.03, 0), BLACK, bevel=0.008, step=0, rot_y=yd)
    # control panel (tilted toward the player), joystick + buttons
    box(f"{name}_cpanel", (W - 0.06, 0.06, 0.3), L(0, 0.95, D / 2 + 0.02), BLACK, bevel=0.01, step=0, rot=(12, yd, 0))
    cyl(f"{name}_stick", 0.01, 0.1, L(-0.14, 1.02, D / 2 + 0.03), BRASS_LT, seg=8, bevel=0)
    sphere(f"{name}_knob", 0.028, L(-0.14, 1.08, D / 2 + 0.03), M("knob_amber", color="#e0702a", rough=0.3), seg=12)
    for j, lx in enumerate((0.04, 0.13, 0.22)):
        cyl(f"{name}_btn{j}", 0.025, 0.02, L(lx, 0.99, D / 2 + 0.03 - j % 2 * 0.04), M("btn_teal", color="#2fd3c4", rough=0.3, emit="#2fd3c4", emit_strength=0.6) if j != 1 else M("btn_amber", color="#ffb347", rough=0.3, emit="#ffa030", emit_strength=0.6), seg=14, bevel=0.004)
    # screen: bezel + emissive screen (tilted back)
    box(f"{name}_bezel", (W - 0.06, 0.56, 0.05), L(0, 1.32, D / 2 - 0.12), BLACK, bevel=0.012, step=0, rot=(-14, yd, 0))
    ob = plane(f"{name}_screen_noshadow", 0.5, 0.42, L(0, 1.32, D / 2 - 0.09), M(f"screen{kind}_noshadow", color="#ffffff", rough=0.2, image=SCREENS[kind], emit="#ffffff", emit_strength=1.6, emit_image=True), facing="z")
    ob.rotation_euler = (math.radians(90 - 14), 0, yaw)
    # marquee
    box(f"{name}_mq_box", (W - 0.04, 0.2, 0.24), L(0, H - 0.12, D / 2 - 0.16), side, bevel=0.012, step=0, rot_y=yd)
    ob = plane(f"{name}_mq_noshadow", W - 0.1, 0.15, L(0, H - 0.12, D / 2 - 0.035), M(f"marquee{kind}_noshadow", color="#ffffff", rough=0.4, image=MARQUEES[kind], emit="#ffffff", emit_strength=1.4, emit_image=True), facing="z")
    ob.rotation_euler.z = yaw
    t = text(f"{name}_mq_txt_noshadow", GAME_NAMES[kind], 0.06, L(0, H - 0.12, D / 2 - 0.03), M("mq_text_noshadow", color="#fff2d8", emit="#fff2d8", emit_strength=3.0), extrude=0.004)
    t.rotation_euler.z = yaw
    box(f"{name}_cap", (W + 0.02, 0.04, D + 0.02), L(0, H + 0.02, -0.02), BRASS_DK, bevel=0.01, step=0, rot_y=yd)
for k, (c, yaw) in enumerate(CAB_FG): cabinet(f"cabF{k}", c, yaw, k % 3)
for k, (c, yaw) in enumerate(CAB_SIDE): cabinet(f"cabS{k}", c, yaw, (k + 2) % 3)

# ----------------------------------------------------------------------------- side dressing: prize case, stools, change machine
# glass prize case stage right, back corner
px, pz = 4.6, -3.7
box("pcase_base", (1.6, 0.8, 0.6), (px, 0.4, pz), WAL, bevel=0.015, step=0.3)
box("pcase_top", (1.66, 0.04, 0.66), (px, 0.82, pz), BRASS_DK, bevel=0.008, step=0)
box("pcase_glass_noshadow", (1.56, 1.0, 0.56), (px, 1.34, pz), M("glass_case", rough=0.05, alpha=0.18), bevel=0.0, step=0)
for sh in (1.15, 1.5):
    box(f"pcase_shelf{sh}", (1.5, 0.02, 0.5), (px, sh, pz), M("glass_case"), bevel=0, step=0)
box("pcase_cap", (1.66, 0.05, 0.66), (px, 1.86, pz), WAL_DK, bevel=0.01, step=0)
for k in range(9):  # prize balls + plush cubes on the shelves
    sh = (0.84, 1.16, 1.51)[k % 3]; xx = px - 0.6 + (k // 3) * 0.55 + (k % 3) * 0.08
    if k % 2: sphere(f"prize{k}", 0.08, (xx, sh + 0.08, pz + 0.05), M(("prize_a", "prize_b", "prize_c")[k % 3], color=("#e0702a", "#2fa89c", "#e6c57a")[k % 3], rough=0.5), seg=14)
    else: box(f"prize{k}", (0.14, 0.14, 0.14), (xx, sh + 0.07, pz + 0.03), M(("prize_a", "prize_b", "prize_c")[k % 3], color=("#e0702a", "#2fa89c", "#e6c57a")[k % 3]), bevel=0.03, step=0)
text("pcase_sign", "PRIZES", 0.09, (px, 0.55, pz + 0.31), BRASS_LT, extrude=0.006)
# bar stools by the side cabinets
for k, z in enumerate((-2.0, -0.8, 0.4)):
    x = -5.0
    cyl(f"stool_seat{k}", 0.18, 0.06, (x, 0.68, z), M("felt", rough=0.8), seg=24, bevel=0.015)
    cyl(f"stool_post{k}", 0.025, 0.65, (x, 0.34, z), BRASS, seg=12, bevel=0)
    torus(f"stool_ring{k}", 0.15, 0.01, (x, 0.25, z), BRASS, seg=24, minor=6, facing="y")
    cyl(f"stool_foot{k}", 0.17, 0.02, (x, 0.01, z), BRASS_DK, seg=24, bevel=0.004)
# change machine stage left back corner
box("change_body", (0.6, 1.5, 0.45), (-4.7, 0.75, -3.95), WAL, bevel=0.02, step=0.3)
box("change_face", (0.48, 0.9, 0.02), (-4.7, 1.0, -3.715), BRASS_DK, bevel=0.008, step=0)
box("change_window_noshadow", (0.32, 0.12, 0.01), (-4.7, 1.25, -3.70), AMBER_EMIT, bevel=0, step=0)
text("change_txt", "CHANGE", 0.06, (-4.7, 1.1, -3.70), M("ink", rough=0.5), extrude=0.003)
box("change_tray", (0.24, 0.06, 0.08), (-4.7, 0.62, -3.68), BRASS, bevel=0.008, step=0)
# pipes along the ceiling (brass conduit)
tube("conduit_noshadow", [(LEFT + 0.2, CEIL - 0.35, BACK + 0.25), (0, CEIL - 0.35, BACK + 0.25), (RIGHT - 0.2, CEIL - 0.35, BACK + 0.25)], 0.025, BRASS_DK)

# ----------------------------------------------------------------------------- THE GALTON MACHINE
mz0, mz1 = CASE_BACK, BEZEL_Z + 0.03          # case depth range (z)
mzc, mzd = (mz0 + mz1) / 2, mz1 - mz0
# plinth: walnut, brass bands, raised panels, brass ball feet
box("m_plinth", (2 * FRAME_HALF + 0.1, PLINTH_Y - 0.08, mzd + 0.1), (0, (PLINTH_Y - 0.08) / 2 + 0.08, mzc), WAL, bevel=0.02, step=0.3)
box("m_plinth_top", (2 * FRAME_HALF + 0.16, 0.05, mzd + 0.16), (0, PLINTH_Y - 0.025, mzc), BRASS, bevel=0.01, step=0.4)
box("m_plinth_band", (2 * FRAME_HALF + 0.12, 0.03, mzd + 0.12), (0, 0.14, mzc), BRASS_DK, bevel=0.006, step=0.4)
for s_ in (-1, 1):
    for zz in (mz0 - 0.02, mz1 + 0.02):
        sphere(f"m_foot{s_}{zz:.2f}", 0.06, (s_ * (FRAME_HALF - 0.02), 0.05, zz), BRASS, seg=16)
for s_ in (-1, 1):
    box(f"m_pnl{s_}", (FRAME_HALF - 0.25, PLINTH_Y - 0.32, 0.02), (s_ * (FRAME_HALF / 2 + 0.05), 0.33, mz1 + 0.06), WAL_LT, bevel=0.01, step=0.3)
# bin label plaques (0..12) along the plinth front
for k in range(ROWS + 1):
    box(f"m_plaque{k}", (0.14, 0.11, 0.012), (bin_x(k), LABEL_Y, mz1 + 0.075), M("plaque", color="#f0d48a", rough=0.3, metal=0.6), bevel=0.004, step=0)
    text(f"m_plaque_txt{k}", str(k), 0.085, (bin_x(k), LABEL_Y - 0.004, mz1 + 0.083), M("ink", rough=0.5), extrude=0.004)
# bin floor + back board
box("m_binfloor", (2 * HALF_W, BIN_Y0 - PLINTH_Y, GLASS_Z - BACK_Z + 0.02), (0, (BIN_Y0 + PLINTH_Y) / 2, (GLASS_Z + BACK_Z) / 2), BRASS_DK, bevel=0.004, step=0)
bb = plane("m_board", 2 * HALF_W, TOP_Y - BIN_Y0, (0, (TOP_Y + BIN_Y0) / 2, BACK_Z), M("board", rough=0.5, image=BOARD_IMG), facing="z")
bm = bmesh.new(); bm.from_mesh(bb.data); bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=10, use_grid_fill=True); bm.to_mesh(bb.data); bm.free()
box("m_board_back", (2 * FRAME_HALF, TOP_Y - PLINTH_Y + 0.1, BACK_Z - mz0), (0, (TOP_Y + PLINTH_Y) / 2, (BACK_Z + mz0) / 2), WAL_DK, bevel=0.0, step=0.4)
# bin dividers (thin brass), outer walls (thicker walnut)
for k in range(ROWS + 2):
    x = (k - (ROWS + 1) / 2) * PITCH
    outer = k in (0, ROWS + 1)
    t_ = 0.03 if outer else DIV
    hh = (TOP_Y - BIN_Y0) if outer else BIN_H
    xx = x - (t_ / 2 if k == 0 else -t_ / 2 if outer else 0)
    box(f"m_div{k}", (t_, hh, GLASS_Z - BACK_Z), (xx, BIN_Y0 + hh / 2, (GLASS_Z + BACK_Z) / 2), WAL_DK if outer else BRASS, bevel=0.002 if not outer else 0.004, step=0 if not outer else 0.3)
    if not outer:
        sphere(f"m_divcap{k}", 0.008, (x, BIN_Y0 + BIN_H, (GLASS_Z + BACK_Z) / 2), BRASS_LT, seg=10)
# pegs: brass pins from the board to the glass, with a small washer on the board
for i in range(ROWS):
    for j in range(i + 1):
        x, y = peg_x(i, j), peg_y(i)
        cyl(f"m_peg{i}_{j}", PEG_R, GLASS_Z - BACK_Z, (x, y, (GLASS_Z + BACK_Z) / 2), BRASS_LT, seg=14, axis="z", bevel=0.002)
        cyl(f"m_washer{i}_{j}", PEG_R * 1.8, 0.004, (x, y, BACK_Z + 0.002), BRASS_DK, seg=14, axis="z", bevel=0)
# funnel: two slanted brass plates, side cheeks, the neck
for s_ in (-1, 1):
    x0, y0, x1, y1 = s_ * FUN_MOUTH_H, FUN_MOUTH_Y, s_ * FUN_NECK_H, FUN_NECK_Y
    L_ = math.hypot(x1 - x0, y1 - y0); ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    box(f"m_funnel{s_}", (L_ + 0.02, 0.012, GLASS_Z - BACK_Z + 0.03), ((x0 + x1) / 2, (y0 + y1) / 2, (GLASS_Z + BACK_Z) / 2), BRASS, bevel=0.003, step=0, rot=(0, 0, ang))
    box(f"m_funnel_rim{s_}", (0.05, 0.03, GLASS_Z - BACK_Z + 0.06), (x0, y0 + 0.01, (GLASS_Z + BACK_Z) / 2), BRASS_LT, bevel=0.006, step=0)
box("m_funnel_back", (2 * FUN_MOUTH_H + 0.1, FUN_MOUTH_Y - FUN_NECK_Y + 0.06, 0.02), (0, (FUN_MOUTH_Y + FUN_NECK_Y) / 2, BACK_Z - 0.01), WAL_DK, bevel=0.004, step=0)
# top rail (walkway support) either side of the funnel neck
for s_ in (-1, 1):
    a, b = s_ * 0.06, s_ * FRAME_HALF
    box(f"m_toprail{s_}", (abs(b - a), 0.1, mzd), ((a + b) / 2, TOP_Y + 0.05, mzc), WAL, bevel=0.012, step=0.3)
    box(f"m_toprail_b{s_}", (abs(b - a), 0.025, mzd + 0.02), ((a + b) / 2, TOP_Y - 0.0125, mzc), BRASS, bevel=0.004, step=0.4)
# side columns: walnut pilasters, brass flutes + capitals + bases
for s_ in (-1, 1):
    cx = s_ * (HALF_W + 0.1)
    box(f"m_col{s_}", (0.2, TOP_Y - PLINTH_Y, mzd), (cx, (TOP_Y + PLINTH_Y) / 2, mzc), WAL, bevel=0.015, step=0.3)
    for f_ in (-0.05, 0.0, 0.05):
        box(f"m_flute{s_}{f_}", (0.012, TOP_Y - PLINTH_Y - 0.5, 0.01), (cx + f_, (TOP_Y + PLINTH_Y) / 2, mz1 + 0.004), BRASS_DK, bevel=0.003, step=0)
    box(f"m_cap{s_}", (0.26, 0.09, mzd + 0.06), (cx, TOP_Y - 0.08, mzc), BRASS, bevel=0.012, step=0)
    box(f"m_base{s_}", (0.26, 0.1, mzd + 0.06), (cx, PLINTH_Y + 0.05, mzc), BRASS, bevel=0.012, step=0)
    # brass rivets down the bezel
    for y in np.arange(PLINTH_Y + 0.3, TOP_Y - 0.2, 0.25):
        sphere(f"m_rivet{s_}{y:.2f}", 0.009, (s_ * (HALF_W + 0.012), y, BEZEL_Z + 0.005), BRASS_LT, seg=8)
# brass bezel around the glass
for s_ in (-1, 1):
    box(f"m_bezel_s{s_}", (0.03, TOP_Y - BIN_Y0, 0.012), (s_ * (HALF_W + 0.015), (TOP_Y + BIN_Y0) / 2, BEZEL_Z), BRASS_LT, bevel=0.004, step=0)
box("m_bezel_b", (2 * HALF_W + 0.06, 0.03, 0.012), (0, BIN_Y0 - 0.01, BEZEL_Z), BRASS_LT, bevel=0.004, step=0)
# crest: walnut arch backplate, sunburst disc, brass rings, nameplate, finial (bulbs are emissive)
CR_C = (0, TOP_Y + 0.55, mz0 + 0.06); CR_R = 0.68
box("m_crest_base", (2 * FRAME_HALF - 0.3, 0.55, 0.06), (0, TOP_Y + 0.37, mz0 + 0.04), WAL, bevel=0.015, step=0.3)
cyl("m_crest_disc", CR_R, 0.06, (CR_C[0], CR_C[1], CR_C[2] - 0.02), WAL, seg=56, axis="z", bevel=0.012)
cyl("m_crest_sun", CR_R - 0.08, 0.01, (CR_C[0], CR_C[1], CR_C[2] + 0.015), M("sunburst", rough=0.5, image=SUN_IMG), seg=56, axis="z", bevel=0)
torus("m_crest_ring", CR_R - 0.02, 0.018, (CR_C[0], CR_C[1], CR_C[2] + 0.02), BRASS, seg=64, minor=8, facing="z")
torus("m_crest_ring2", CR_R - 0.1, 0.008, (CR_C[0], CR_C[1], CR_C[2] + 0.022), BRASS_LT, seg=64, minor=6, facing="z")
for k in range(15):  # bulb arc on the crest (upper half)
    a = math.pi * k / 14
    sphere(f"m_cbulb{k}_noshadow", 0.022, (CR_C[0] + math.cos(a) * (CR_R + 0.04), CR_C[1] + math.sin(a) * (CR_R + 0.04), CR_C[2] + 0.03), BULB, seg=10)
box("m_nameplate", (1.3, 0.16, 0.03), (0, TOP_Y + 0.25, mz0 + 0.09), BRASS, bevel=0.01, step=0)
text("m_name", "PROBABILITY ENGINE", 0.075, (0, TOP_Y + 0.25, mz0 + 0.108), M("ink", rough=0.5), extrude=0.004)
sphere("m_finial", 0.05, (0, CR_C[1] + CR_R + 0.08, CR_C[2]), BRASS_LT, seg=16)
cyl("m_finial_spike", 0.012, 0.16, (0, CR_C[1] + CR_R + 0.18, CR_C[2]), BRASS_LT, seg=10, r2=0.002, bevel=0)
for s_ in (-1, 1):  # scroll volutes at the shoulders
    torus(f"m_volute{s_}", 0.1, 0.022, (s_ * (FRAME_HALF - 0.12), TOP_Y + 0.2, mz0 + 0.06), BRASS, seg=32, minor=8, facing="z")
    sphere(f"m_volute_c{s_}", 0.03, (s_ * (FRAME_HALF - 0.12), TOP_Y + 0.2, mz0 + 0.07), BRASS_LT, seg=12)
# left shoulder: counter housing (the digits are React) + gauge
CX = -0.86
box("m_counter_box", (0.6, 0.26, 0.22), (CX, TOP_Y + 0.23, -1.02), WAL_DK, bevel=0.02, step=0)
box("m_counter_bezel", (0.54, 0.18, 0.02), (CX, TOP_Y + 0.23, -0.905), BRASS, bevel=0.006, step=0)
box("m_counter_win", (0.48, 0.13, 0.01), (CX, TOP_Y + 0.23, -0.898), BLACK, bevel=0, step=0)
cyl("m_gauge", 0.07, 0.04, (CX - 0.4, TOP_Y + 0.2, -0.98), BRASS, seg=24, axis="z", bevel=0.006)
cyl("m_gauge_face", 0.058, 0.01, (CX - 0.4, TOP_Y + 0.2, -0.955), CREAM, seg=24, axis="z", bevel=0)
# Miyu's walkway: walnut deck on the right half of the rail, brass railing at the back + side, a ladder down the side
px_, py_, pz_ = PLAT_POS; pw, pd = PLAT_SIZE
box("m_deck", (pw, 0.04, pd), (px_, py_ - 0.02, pz_), WAL_LT, bevel=0.008, step=0.2)
for k in range(5):
    box(f"m_deck_slat{k}", (pw - 0.02, 0.005, 0.004), (px_, py_ + 0.001, pz_ - pd / 2 + (k + 1) * pd / 6), WAL_DK, bevel=0, step=0)
RX0, RX1, RZ0, RZ1 = px_ - pw / 2 + 0.03, px_ + pw / 2 - 0.02, pz_ - pd / 2 + 0.02, pz_ + pd / 2 - 0.02
for (x, z) in ((RX0, RZ0), (px_, RZ0), (RX1, RZ0), (RX1, (RZ0 + RZ1) / 2), (RX1, RZ1)):
    cyl(f"m_post{x:.2f}{z:.2f}", 0.012, 0.55, (x, py_ + 0.275, z), BRASS, seg=10, bevel=0)
    sphere(f"m_post_ball{x:.2f}{z:.2f}", 0.02, (x, py_ + 0.56, z), BRASS_LT, seg=10)
poly_tube("m_handrail", [(RX0, py_ + 0.55, RZ0), (RX1, py_ + 0.55, RZ0), (RX1, py_ + 0.55, RZ1)], 0.012, BRASS)
poly_tube("m_midrail", [(RX0, py_ + 0.28, RZ0), (RX1, py_ + 0.28, RZ0), (RX1, py_ + 0.28, RZ1)], 0.007, BRASS_DK)
LX = FRAME_HALF + 0.1
for z in (-0.82, -1.22):
    poly_tube(f"m_ladder_rail{z}", [(LX, 0.0, z), (LX, py_ + 0.5, z)], 0.014, BRASS)
for y in np.arange(0.3, py_, 0.3):
    poly_tube(f"m_rung{y:.1f}", [(LX, y, -0.82), (LX, y, -1.22)], 0.01, BRASS_DK)
for zz in (-0.82, -1.22):
    poly_tube(f"m_ladder_stay{zz}", [(LX, py_ - 0.4, zz), (FRAME_HALF, py_ - 0.4, zz)], 0.008, BRASS_DK)

# text is the triangle hog: low curve resolution everywhere (the neon keeps a rounder tube)
for ob in S.STATE["col"].objects:
    if ob.type == 'FONT':
        neon = ob.name.startswith("neon")
        ob.data.resolution_u = 3 if neon else 2
        ob.data.bevel_resolution = 2 if neon else 0

tris = S.finish(ao_tint="#3a2418", ao_floor=0.45, samples=32)
assert tris < 300_000, f"over budget: {tris} tris"
