"""Game-show studio (EP04 "Three Doors"): procedural build -> game-show-studio.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/game-show-studio/build_game_show_studio.py [-- --no-bake]

Concept: "Lab Club Prize Studio", a TV game-show studio built inside the lab, in the dark between takes when the
show lights come up. Palette: deep purple, gold, warm white bulbs, a touch of magenta (+ black stage steel).
Light story (React): a dark stage, moving spotlights on the truss cutting through light haze, marquee bulbs around the
doors, the glowing scoreboard and a dim LED wall behind; glossy stage floor reflections (ReflectiveFloor).
Hero piece: three big pastel doors numbered 1-3 in gold marquee frames, a prize alcove behind each, the scoreboard
above. Depth: audience-row silhouettes + studio camera rigs in the foreground, the stage in the midground, the LED wall
and drapes behind. Stage right: two side-by-side mini stages ("STAY" / "SWITCH") for the 1,000-round montage.

This GLB holds the static set. Live in React (episodes/src/sets/game-show-studio): door leaves (they swing open),
marquee bulbs (chase), LED wall content, scoreboard screen, moving heads + beams, prizes, Zuzu's sign, tally lights.
Layout numbers: episodes/src/sets/game-show-studio/layout.ts (keep in sync).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint
import bmesh
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "floor": "#2b2140", "stage_side": "#3a2462", "stage_dk": "#24163e", "wall": "#4b2b7c", "wall_dk": "#38205e",
    "wall_lt": "#5c3a92", "velvet": "#a8326f", "velvet_dk": "#7d2253", "curtain": "#3c1f5c", "curtain_dk": "#2a1544",
    "gold": "#d8a84a", "gold_dk": "#a87a2c", "gold_lt": "#f0cf7a", "black": "#16121c", "steel": "#8f8c9c",
    "seat": "#4a1f4a", "crowd": "#1e1529", "crowd_b": "#271c35", "cam": "#46434f", "cam_dk": "#2b2931", "rubber": "#1b1a1f",
    "cream": "#efe4d0", "magenta": "#e0479a", "ink": "#2a1d3d",
}
S.begin("game-show-studio", HERE, PAL)
R = S.R

# ---- layout (keep in sync with layout.ts)
LEFT, RIGHT, BACK, FRONT = -7.2, 10.6, -4.6, 8.5
LED_Z, LED_X, LED_Y = -4.4, (-6.4, 9.6), (0.2, 5.4)
STAGE_Y, STAGE_X, STAGE_Z = 0.3, (-3.5, 3.5), (-2.75, 1.9)
DOOR_X, DOOR_Z, DOOR_W, DOOR_H = (-1.62, 0.0, 1.62), -1.8, 1.0, 1.9
FRAME_W, FRAME_H = DOOR_W + 0.42, DOOR_H + 0.38
ALCOVE = 0.95
PED_Z, PED_TOP = -2.32, STAGE_Y + 0.42
SB_POS, SB_SIZE = (0, 3.42, -1.86), (3.5, 1.0)
PODIUM, PODIUM_ROT = (2.85, STAGE_Y, 0.55), -0.65
MINI_C, MINI_R, MINI_TOP = [(5.3, 0.18, -1.55), (7.1, 0.18, -1.55)], 0.86, 0.18
MINI_DW, MINI_DH, MINI_GAP, MINI_DZ = 0.34, 0.62, 0.44, -0.38
TRUSS_Y = 4.7
AUD_Z = (4.3, 5.1, 5.9)
CAMS = [((-3.9, 0, 3.3), 0.5), ((4.4, 0, 3.5), -0.45)]
WALL_T = 0.12


# ----------------------------------------------------------------------------- generated textures (original art)
def _noise(u, v, s, seed):
    rr = np.random.RandomState(seed); g = rr.rand(s + 1, s + 1)
    x = u * s; y = v * s; i = np.floor(x).astype(int); j = np.floor(y).astype(int); fx = x - i; fy = y - j
    i = np.clip(i, 0, s - 1); j = np.clip(j, 0, s - 1)
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = g[j, i]; b = g[j, i + 1]; c = g[j + 1, i]; d = g[j + 1, i + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def uv_scale(ob, su, sv):
    for l in ob.data.uv_layers[0].data: l.uv = (l.uv[0] * su, l.uv[1] * sv)


def _floor_tile(u, v):  # one 1 m vinyl tile, repeated: seams, faint scuffs
    o = fill(u, "#2b2140")
    k = (_noise(u, v, 6, 3) - 0.5) * 0.10 + (_noise(u, v, 40, 4) - 0.5) * 0.05
    o[..., :3] = np.clip(o[..., :3] * (1 + k[..., None]), 0, 1)
    seam = (u < 0.006) | (u > 0.994) | (v < 0.006) | (v > 0.994)
    paint(o, seam, "#1a1328")
    return o
FLOOR_IMG = image("floor_tile", 256, 256, _floor_tile)


def _velvet(u, v):  # wall upholstery: diamond tufting
    o = fill(u, "#4b2b7c")
    d = np.abs(((u * 6) % 1) - 0.5) + np.abs(((v * 8) % 1) - 0.5)
    k = np.clip(1 - d * 1.6, 0, 1) ** 2 * 0.22
    o[..., :3] = o[..., :3] * (1 + k[..., None])
    paint(o, d > 0.96, "#2c1748")
    k2 = (_noise(u, v, 30, 9) - 0.5) * 0.06
    o[..., :3] = np.clip(o[..., :3] * (1 + k2[..., None]), 0, 1)
    return o
VELVET_IMG = image("velvet_tuft", 256, 256, _velvet)


def _alcove(u, v):  # alcove back: magenta velvet with a soft star burst
    o = fill(u, "#7d2253")
    r = np.hypot(u - 0.5, (v - 0.45) * 1.3)
    a = np.arctan2(v - 0.45, u - 0.5)
    rays = (np.cos(a * 12) * 0.5 + 0.5) * np.clip(1 - r * 1.6, 0, 1)
    o[..., :3] = o[..., :3] + (S.C("#e0479a")[:3] - o[..., :3]) * (rays[..., None] * 0.55 + np.clip(0.5 - r, 0, 1)[..., None] * 0.6)
    return o
ALCOVE_IMG = image("alcove_back", 256, 256, _alcove)


def _star_decal(u, v):  # gold star player mark on a dark disc (alpha-less: dark ring blends into the stage)
    o = fill(u, "#2b1a48")
    x = (u - 0.5) * 2; y = (v - 0.5) * 2
    r = np.hypot(x, y); a = np.arctan2(y, x) + math.pi / 2
    star = r < (0.42 + 0.38 * (np.cos(5 * a) * 0.5 + 0.5) ** 2.5)
    paint(o, r < 0.98, "#3a2462"); paint(o, (r > 0.86) & (r < 0.94), "#d8a84a"); paint(o, star, "#f0cf7a")
    return o
STAR_IMG = image("star_decal", 256, 256, _star_decal)


# ----------------------------------------------------------------------------- helpers
def drape(name, a, b, y0, y1, mat, pleat=0.22, amp=0.07, step_v=0.4):
    """Pleated curtain hanging along the floor line a -> b (three (x, z)), from y0 to y1."""
    ax, az = a; bx, bz = b
    L = math.hypot(bx - ax, bz - az); tx, tz = (bx - ax) / L, (bz - az) / L; nx, nz = -tz, tx
    nu = max(8, int(L / pleat * 4)); nv = max(2, int((y1 - y0) / step_v))
    bm = S._bm(); uv = bm.loops.layers.uv.active
    vs = []
    for j in range(nv + 1):
        row = []
        y = y0 + (y1 - y0) * j / nv
        for i in range(nu + 1):
            s = L * i / nu
            off = amp * math.sin(s / pleat * 2 * math.pi) * (0.75 + 0.25 * (1 - j / nv))
            row.append(bm.verts.new(S.P(ax + tx * s + nx * off, y, az + tz * s + nz * off)))
        vs.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            for l, (uu, vv) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uv].uv = (uu / nu, vv / nv)
    ob = S._obj(name, bm, mat)
    sol = ob.modifiers.new("Solid", 'SOLIDIFY'); sol.thickness = 0.02
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def wall_with_openings(name, x0, x1, y0, y1, zf, t, openings, ybase, mat, bevel=0.01):
    """Wall from x0..x1, y0..y1, front face at zf, thickness t, with rectangular openings (cx, w, h) from ybase up."""
    xs = sorted([(cx - w / 2, cx + w / 2) for cx, w, h in openings])
    top = max(h for _, _, h in openings) + ybase
    cur = x0
    for k, (a, b) in enumerate(xs):
        if a - cur > 1e-3: box(f"{name}_p{k}", (a - cur, top - y0, t), ((a + cur) / 2, (top + y0) / 2, zf - t / 2), mat, bevel=bevel, step=0.3)
        cur = b
    if x1 - cur > 1e-3: box(f"{name}_pE", (x1 - cur, top - y0, t), ((x1 + cur) / 2, (top + y0) / 2, zf - t / 2), mat, bevel=bevel, step=0.3)
    box(f"{name}_hdr", (x1 - x0, y1 - top, t), ((x0 + x1) / 2, (top + y1) / 2, zf - t / 2), mat, bevel=bevel, step=0.3)


def gold_frame(name, cx, cy0, w, h, z, prof=0.12, depth=0.08, mat=None, top_extra=0.0):
    """Three-sided frame (left, right, top) around an opening of w x h standing on cy0."""
    mat = mat or M("gold", rough=0.28, metal=0.9)
    box(f"{name}_l", (prof, h + prof, depth), (cx - w / 2 - prof / 2, cy0 + (h + prof) / 2, z), mat, bevel=0.012, step=0.3)
    box(f"{name}_r", (prof, h + prof, depth), (cx + w / 2 + prof / 2, cy0 + (h + prof) / 2, z), mat, bevel=0.012, step=0.3)
    box(f"{name}_t", (w + 2 * prof, prof + top_extra, depth), (cx, cy0 + h + (prof + top_extra) / 2, z), mat, bevel=0.012, step=0.3)


GOLD = M("gold", rough=0.28, metal=0.9)
GOLD_DK = M("gold_dk", rough=0.4, metal=0.85)
GOLD_LT = M("gold_lt", rough=0.25, metal=0.9)
BLACK = M("black", rough=0.55)
STEEL = M("steel", rough=0.35, metal=0.8)

# ----------------------------------------------------------------------------- studio floor (dark vinyl tiles)
fl = plane("floor", RIGHT - LEFT, FRONT - BACK, ((LEFT + RIGHT) / 2, 0.0, (BACK + FRONT) / 2), M("floor", rough=0.38, image=FLOOR_IMG), facing="y")
uv_scale(fl, RIGHT - LEFT, FRONT - BACK)
bm = bmesh.new(); bm.from_mesh(fl.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=24, use_grid_fill=True); bm.to_mesh(fl.data); bm.free()
# gold inlay arcs on the floor in front of the stage (a show "runway" fan)
for k, rr in enumerate((2.9, 3.5, 4.1)):
    pts = [(math.sin(a) * rr, 0.004, STAGE_Z[1] - 0.6 + math.cos(a) * rr * 0.55) for a in np.linspace(-1.0, 1.0, 16)]
    poly_tube(f"inlay_{k}", pts, 0.012, GOLD_DK)

# ----------------------------------------------------------------------------- main stage (glossy top is React's ReflectiveFloor)
SX0, SX1 = STAGE_X; SZ0, SZ1 = STAGE_Z
box("stage_body", (SX1 - SX0, STAGE_Y - 0.02, SZ1 - SZ0), ((SX0 + SX1) / 2, (STAGE_Y - 0.02) / 2, (SZ0 + SZ1) / 2), M("stage_dk", rough=0.6), bevel=0.02, step=0.5)
box("stage_top", (SX1 - SX0, 0.02, SZ1 - SZ0), ((SX0 + SX1) / 2, STAGE_Y - 0.01, (SZ0 + SZ1) / 2), M("stage_side", rough=0.3), bevel=0.0, step=0.5)
# front fascia: purple panels between gold bands, the bulb row (React) runs along its middle
box("fascia", (SX1 - SX0 + 0.04, STAGE_Y - 0.06, 0.04), ((SX0 + SX1) / 2, (STAGE_Y - 0.06) / 2 + 0.02, SZ1 + 0.02), M("stage_side", rough=0.5), bevel=0.006, step=0.4)
for y in (0.035, STAGE_Y - 0.025):
    box(f"fascia_gold_{y:.2f}", (SX1 - SX0 + 0.06, 0.025, 0.05), ((SX0 + SX1) / 2, y, SZ1 + 0.03), GOLD, bevel=0.006, step=0.8)
for sx in (SX0, SX1):  # side fascias
    box(f"fascia_side_{sx}", (0.04, STAGE_Y - 0.06, SZ1 - SZ0), (sx + (0.02 if sx > 0 else -0.02), (STAGE_Y - 0.06) / 2 + 0.02, (SZ0 + SZ1) / 2), M("stage_side"), bevel=0.006, step=0.4)
    box(f"fascia_side_gold_{sx}", (0.05, 0.025, SZ1 - SZ0), (sx + (0.025 if sx > 0 else -0.025), STAGE_Y - 0.025, (SZ0 + SZ1) / 2), GOLD, bevel=0.006, step=0.8)
# stage edge nosing (gold) on top
box("stage_nose", (SX1 - SX0 + 0.06, 0.018, 0.06), ((SX0 + SX1) / 2, STAGE_Y + 0.004, SZ1 + 0.0), GOLD_LT, bevel=0.006, step=0.8)
# steps down the front centre
for k, (dz, h) in enumerate(((0.42, 0.2), (0.84, 0.1))):
    box(f"step_{k}", (2.2 - k * 0.3, h, 0.42), (0, h / 2, SZ1 + dz - 0.21 + 0.02), M("stage_side", rough=0.45), bevel=0.012, step=0.4)
    box(f"step_nose_{k}", (2.2 - k * 0.3, 0.014, 0.04), (0, h + 0.003, SZ1 + dz - 0.0), GOLD, bevel=0.004, step=0.8)
# player mark (gold star) + Zuzu's fan spot
# (player mark + fan mark: crisp star discs drawn in React)
# floor monitors (wedges) at the stage front edge, facing the performers
for x in (-2.4, 2.4):
    ob = box(f"wedge_{x}", (0.5, 0.24, 0.34), (x, STAGE_Y + 0.12, SZ1 - 0.3), M("cam_dk", rough=0.6), bevel=0.03, step=0, rot=(-22, 180, 0))
    box(f"wedge_grill_{x}", (0.42, 0.18, 0.01), (x, STAGE_Y + 0.13, SZ1 - 0.46), M("rubber", rough=0.9), bevel=0.004, step=0, rot=(-22, 0, 0))

# ----------------------------------------------------------------------------- the door wall, marquee frames, alcoves
WX0, WX1, WY1 = -2.78, 2.78, 3.0
wall_with_openings("doorwall", WX0, WX1, STAGE_Y, WY1, DOOR_Z, WALL_T, [(x, DOOR_W, DOOR_H) for x in DOOR_X], STAGE_Y,
                   M("velvet_wall", rough=0.85, image=VELVET_IMG))
def tiled_panel(name, x0, x1, y0, y1, z, mat, tile=0.5):
    ob = plane(name, x1 - x0, y1 - y0, ((x0 + x1) / 2, (y0 + y1) / 2, z), mat, facing="z")
    uv_scale(ob, (x1 - x0) / tile, (y1 - y0) / tile)
    return ob
TUFT = M("velvet_tuft", rough=0.85, image=VELVET_IMG)
edges = [WX0] + [v for x in DOOR_X for v in (x - DOOR_W / 2 - 0.21, x + DOOR_W / 2 + 0.21)] + [WX1]
for k in range(0, len(edges), 2):
    if edges[k + 1] - edges[k] > 0.05: tiled_panel(f"tuft_{k}", edges[k], edges[k + 1], STAGE_Y, STAGE_Y + DOOR_H + 0.2, DOOR_Z + 0.002, TUFT)
tiled_panel("tuft_hdr", WX0, WX1, STAGE_Y + DOOR_H + 0.2, WY1, DOOR_Z + 0.002, TUFT)
for i, x in enumerate(DOOR_X):
    # marquee frame: gold profile with a darker inner lip; bulbs (React) sit on its centre line
    gold_frame(f"frame{i}", x, STAGE_Y, DOOR_W + 0.06, DOOR_H + 0.03, DOOR_Z + 0.05, prof=0.18, depth=0.1)
    gold_frame(f"lip{i}", x, STAGE_Y, DOOR_W, DOOR_H, DOOR_Z + 0.02, prof=0.035, depth=0.12, mat=GOLD_DK)
    # crest above each door: a round gold plate for the big number (React draws the number + bulbs around it)
    cyl(f"crest{i}", 0.2, 0.06, (x, STAGE_Y + FRAME_H + 0.12, DOOR_Z + 0.07), GOLD, seg=36, axis="z", bevel=0.01)
    cyl(f"crest_face{i}", 0.16, 0.02, (x, STAGE_Y + FRAME_H + 0.12, DOOR_Z + 0.105), M("wall_dk", rough=0.5), seg=36, axis="z", bevel=0.004)
    # plinth blocks at the frame feet
    for s_ in (-1, 1):
        box(f"plinth{i}{s_}", (0.24, 0.16, 0.16), (x + s_ * (DOOR_W / 2 + 0.12), STAGE_Y + 0.08, DOOR_Z + 0.07), GOLD_DK, bevel=0.012, step=0)
    # alcove (prize booth) behind the door
    az0, az1 = DOOR_Z - WALL_T, DOOR_Z - WALL_T - ALCOVE
    alc = M("alcove", rough=0.9, image=ALCOVE_IMG)
    plane(f"alc_back{i}", DOOR_W + 0.2, DOOR_H, (x, STAGE_Y + DOOR_H / 2, az1), alc, facing="z")
    vel = M("velvet_dk", rough=0.92)
    for s_ in (-1, 1):
        box(f"alc_side{i}{s_}", (0.04, DOOR_H, ALCOVE), (x + s_ * (DOOR_W / 2 + 0.12), STAGE_Y + DOOR_H / 2, (az0 + az1) / 2), vel, bevel=0, step=0.3)
    box(f"alc_ceil{i}", (DOOR_W + 0.28, 0.04, ALCOVE), (x, STAGE_Y + DOOR_H + 0.02, (az0 + az1) / 2), vel, bevel=0, step=0.3)
    box(f"alc_floor{i}", (DOOR_W + 0.24, 0.01, ALCOVE), (x, STAGE_Y + 0.005, (az0 + az1) / 2), M("velvet", rough=0.95), bevel=0, step=0.3)
    # prize pedestal: gold-rimmed drum
    cyl(f"ped{i}", 0.24, PED_TOP - STAGE_Y - 0.03, (x, (PED_TOP + STAGE_Y - 0.03) / 2, PED_Z), M("cream", rough=0.45), seg=32, bevel=0.01)
    cyl(f"ped_cap{i}", 0.27, 0.03, (x, PED_TOP - 0.015, PED_Z), GOLD, seg=32, bevel=0.008)
    cyl(f"ped_base{i}", 0.28, 0.04, (x, STAGE_Y + 0.02, PED_Z), GOLD_DK, seg=32, bevel=0.008)
# pilasters between the doors: gold-capped columns
for x in (-2.55, -0.81, 0.81, 2.55):
    box(f"pil_{x}", (0.16, WY1 - STAGE_Y, 0.08), (x, (WY1 + STAGE_Y) / 2, DOOR_Z + 0.04), M("wall_lt", rough=0.6), bevel=0.012, step=0.3)
    box(f"pil_cap_{x}", (0.22, 0.08, 0.12), (x, WY1 - 0.04, DOOR_Z + 0.06), GOLD, bevel=0.01, step=0)
    box(f"pil_base_{x}", (0.22, 0.12, 0.12), (x, STAGE_Y + 0.06, DOOR_Z + 0.06), GOLD, bevel=0.01, step=0)
# cornice + the wall's back (so it reads solid from the side)
box("cornice", (WX1 - WX0 + 0.2, 0.08, 0.2), (0, WY1 + 0.04, DOOR_Z - 0.02), GOLD, bevel=0.015, step=0.5)
box("doorwall_back", (WX1 - WX0, WY1 - STAGE_Y, 0.04), (0, (WY1 + STAGE_Y) / 2, DOOR_Z - WALL_T - ALCOVE - 0.03), M("wall_dk"), bevel=0, step=0.5)
for s_ in (-1, 1):
    box(f"doorwall_end{s_}", (0.04, WY1 - STAGE_Y, ALCOVE + WALL_T), (s_ * WX1, (WY1 + STAGE_Y) / 2, DOOR_Z - (ALCOVE + WALL_T) / 2), M("wall_dk"), bevel=0, step=0.5)

# ----------------------------------------------------------------------------- scoreboard housing (screen is React)
sx, sy, sz = SB_POS; sw, sh = SB_SIZE
box("sb_back", (sw + 0.3, sh + 0.3, 0.14), (sx, sy, sz - 0.08), BLACK, bevel=0.02, step=0.4)
gold_frame("sb_frame", sx, sy - sh / 2 - 0.1, sw + 0.08, sh + 0.08, sz + 0.0, prof=0.1, depth=0.06)
box("sb_frame_b", (sw + 0.28, 0.1, 0.06), (sx, sy - sh / 2 - 0.09, sz), GOLD, bevel=0.012, step=0.3)
for s_ in (-1, 1):  # hanging rods to the truss + side "wings"
    poly_tube(f"sb_rod{s_}", [(s_ * (sw / 2 - 0.2), sy + sh / 2 + 0.15, sz - 0.08), (s_ * (sw / 2 - 0.2), TRUSS_Y - 0.1, sz - 0.08)], 0.012, STEEL)
    box(f"sb_wing{s_}", (0.3, 0.6, 0.05), (s_ * (sw / 2 + 0.3), sy, sz - 0.02), GOLD_DK, bevel=0.02, step=0, rot=(0, 0, s_ * 12))

# ----------------------------------------------------------------------------- host podium (Lumi)
px, py, pz = PODIUM
pod = M("wall_lt", rough=0.5)
box("pod_body", (0.62, 0.55, 0.42), (px, py + 0.3, pz), pod, bevel=0.03, step=0, rot_y=math.degrees(PODIUM_ROT))
box("pod_top", (0.72, 0.05, 0.5), (px, py + 0.6, pz), GOLD, bevel=0.015, step=0, rot_y=math.degrees(PODIUM_ROT))
box("pod_foot", (0.7, 0.06, 0.48), (px, py + 0.03, pz), GOLD_DK, bevel=0.015, step=0, rot_y=math.degrees(PODIUM_ROT))
fx, fz = px + math.sin(PODIUM_ROT) * 0.215, pz + math.cos(PODIUM_ROT) * 0.215
ob = text("pod_host", "HOST", 0.11, (fx, py + 0.36, fz), GOLD_LT, extrude=0.01); ob.rotation_euler.z = PODIUM_ROT
cyl("pod_btn", 0.06, 0.03, (px - 0.1, py + 0.64, pz), M("magenta", rough=0.3, emit="#e0479a", emit_strength=1.5), seg=20, bevel=0.006)
cyl("pod_btn_ring", 0.075, 0.015, (px - 0.1, py + 0.628, pz), GOLD, seg=20, bevel=0.004)

# ----------------------------------------------------------------------------- mini stages (montage): STAY / SWITCH
for k, (mx, my, mz) in enumerate(MINI_C):
    cyl(f"mini_riser{k}", MINI_R, MINI_TOP, (mx, MINI_TOP / 2, mz), M("stage_side", rough=0.3), seg=48, bevel=0.015)
    torus(f"mini_rim{k}", MINI_R + 0.005, 0.02, (mx, MINI_TOP - 0.01, mz), GOLD, seg=64, minor=8, facing="y")
    torus(f"mini_rim_lo{k}", MINI_R + 0.005, 0.015, (mx, 0.03, mz), GOLD_DK, seg=64, minor=6, facing="y")
    bz = mz + MINI_DZ
    bw, bh = 1.5, 1.25
    xs = [mx + (j - 1) * MINI_GAP for j in range(3)]
    wall_with_openings(f"mini_wall{k}", mx - bw / 2, mx + bw / 2, MINI_TOP, MINI_TOP + bh, bz, 0.08, [(x, MINI_DW, MINI_DH) for x in xs], MINI_TOP,
                       M("velvet_wall"), bevel=0.008)
    for j, x in enumerate(xs):
        gold_frame(f"mini_frame{k}{j}", x, MINI_TOP, MINI_DW + 0.02, MINI_DH + 0.01, bz + 0.03, prof=0.05, depth=0.05)
        plane(f"mini_alc{k}{j}", MINI_DW, MINI_DH, (x, MINI_TOP + MINI_DH / 2, bz - 0.26), M("alcove"), facing="z")
        for s_ in (-1, 1):
            box(f"mini_alc_s{k}{j}{s_}", (0.02, MINI_DH, 0.18), (x + s_ * (MINI_DW / 2 + 0.01), MINI_TOP + MINI_DH / 2, bz - 0.17), M("velvet_dk"), bevel=0, step=0)
        box(f"mini_alc_c{k}{j}", (MINI_DW + 0.04, 0.02, 0.18), (x, MINI_TOP + MINI_DH + 0.01, bz - 0.17), M("velvet_dk"), bevel=0, step=0)
    medges = [mx - bw / 2] + [v for x in xs for v in (x - MINI_DW / 2 - 0.06, x + MINI_DW / 2 + 0.06)] + [mx + bw / 2]
    for q in range(0, len(medges), 2):
        if medges[q + 1] - medges[q] > 0.03: tiled_panel(f"mtuft_{k}{q}", medges[q], medges[q + 1], MINI_TOP, MINI_TOP + MINI_DH + 0.08, bz + 0.002, TUFT, tile=0.3)
    tiled_panel(f"mtuft_hdr{k}", mx - bw / 2, mx + bw / 2, MINI_TOP + MINI_DH + 0.08, MINI_TOP + bh, bz + 0.002, TUFT, tile=0.3)
    box(f"mini_back{k}", (bw, bh, 0.03), (mx, MINI_TOP + bh / 2, bz - 0.28), M("wall_dk"), bevel=0, step=0.4)
    box(f"mini_cornice{k}", (bw + 0.1, 0.06, 0.14), (mx, MINI_TOP + bh + 0.03, bz - 0.02), GOLD, bevel=0.01, step=0.4)
    # name plate: STAY / SWITCH in gold on a dark plate with a gold rim
    box(f"mini_plate{k}", (0.95, 0.24, 0.05), (mx, MINI_TOP + bh + 0.22, bz), M("ink", rough=0.4), bevel=0.02, step=0)
    gold_frame(f"mini_plate_rim{k}", mx, MINI_TOP + bh + 0.1, 0.95, 0.24, bz + 0.005, prof=0.03, depth=0.06)
    box(f"mini_plate_rim_b{k}", (1.01, 0.03, 0.06), (mx, MINI_TOP + bh + 0.085, bz + 0.005), GOLD, bevel=0.005, step=0)
    text(f"mini_label{k}", ("STAY", "SWITCH")[k], 0.15, (mx, MINI_TOP + bh + 0.215, bz + 0.03), GOLD_LT, extrude=0.012)

# ----------------------------------------------------------------------------- LED wall frame (content is React) + drapes
lx0, lx1 = LED_X; ly0, ly1 = LED_Y
box("led_back", (lx1 - lx0 + 0.3, ly1 - ly0 + 0.3, 0.12), ((lx0 + lx1) / 2, (ly0 + ly1) / 2, LED_Z - 0.1), BLACK, bevel=0.0, step=1.0)
box("led_base", (lx1 - lx0 + 0.3, ly0 + 0.02, 0.4), ((lx0 + lx1) / 2, (ly0 + 0.02) / 2, LED_Z + 0.05), M("cam_dk", rough=0.6), bevel=0.01, step=1.0)
for x in np.arange(lx0, lx1 + 0.01, 2.0):  # cabinet seams
    box(f"led_seam_{x:.1f}", (0.02, ly1 - ly0, 0.03), (x, (ly0 + ly1) / 2, LED_Z + 0.03), BLACK, bevel=0, step=0)
# side drapes + a swagged border on top (pleated velvet)
drape("drape_l", (LEFT + 0.4, -4.3), (LEFT + 0.4, 3.0), 0, 6.0, M("curtain", rough=0.9))
drape("drape_r", (RIGHT - 0.4, 3.0), (RIGHT - 0.4, -4.3), 0, 6.0, M("curtain"))
drape("border", (LEFT + 0.4, -3.9), (RIGHT - 0.4, -3.9), 5.0, 6.2, M("curtain_dk", rough=0.9), pleat=0.3, amp=0.06)
# proscenium legs: separate the main stage from the montage corner
drape("leg_l", (-4.55, -3.6), (-4.55, -2.3), 0, 5.2, M("curtain"), pleat=0.18, amp=0.05)
drape("leg_r", (3.98, -3.75), (3.98, -2.45), 0, 5.2, M("curtain"), pleat=0.18, amp=0.05)
for x in (-4.55, 3.98):  # gold tie-backs
    torus(f"tie_{x}", 0.09, 0.02, (x, 1.1, -2.95), GOLD, seg=24, minor=6, facing="x")

# ----------------------------------------------------------------------------- truss (box truss, two runs + towers)
def truss_run(name, a, b, size=0.3, r=0.022, lace=0.5):
    (ax, ay, az), (bx, by, bz) = a, b
    L = math.dist(a, b); n = max(1, int(L / lace))
    d = ((bx - ax) / L, (by - ay) / L, (bz - az) / L)
    # local frame: d, u, w (u = up unless the run is vertical)
    up = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    w = (d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0])
    wl = math.hypot(*w); w = tuple(c / wl for c in w)
    u = (w[1] * d[2] - w[2] * d[1], w[2] * d[0] - w[0] * d[2], w[0] * d[1] - w[1] * d[0])
    hs = size / 2
    corners = [(su * hs, sw * hs) for su, sw in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
    P_ = lambda t, cu, cw: (ax + d[0] * t + u[0] * cu + w[0] * cw, ay + d[1] * t + u[1] * cu + w[1] * cw, az + d[2] * t + u[2] * cu + w[2] * cw)
    for k, (cu, cw) in enumerate(corners):
        poly_tube(f"{name}_c{k}", [P_(0, cu, cw), P_(L, cu, cw)], r, STEEL)
    for k in range(4):
        cu0, cw0 = corners[k]; cu1, cw1 = corners[(k + 1) % 4]
        pts = []
        for j in range(n + 1):
            t = L * j / n
            pts.append(P_(t, cu0, cw0) if j % 2 == 0 else P_(t, cu1, cw1))
        poly_tube(f"{name}_z{k}", pts, r * 0.55, STEEL)
truss_run("truss_f", (-5.0, TRUSS_Y, 0.9), (8.6, TRUSS_Y, 0.9))
truss_run("truss_b", (-5.0, TRUSS_Y, -0.9), (8.6, TRUSS_Y, -0.9))
for x in (-5.0, 8.6):
    truss_run(f"tower_{x}", (x, 0.0, 0.9), (x, TRUSS_Y - 0.15, 0.9))
    truss_run(f"tower_b_{x}", (x, 0.0, -0.9), (x, TRUSS_Y - 0.15, -0.9))
    truss_run(f"truss_x_{x}", (x, TRUSS_Y, -0.9), (x, TRUSS_Y, 0.9))
    box(f"tower_foot_{x}", (0.6, 0.04, 2.4), (x, 0.02, 0), BLACK, bevel=0.01, step=0)
# moving-head clamps (heads are React)
for (hx, hy, hz) in ((-3.2, 4.55, 0.9), (-1.1, 4.55, 0.9), (1.1, 4.55, 0.9), (3.2, 4.55, 0.9), (6.3, 4.55, 0.4)):
    box(f"clamp_{hx}", (0.08, 0.1, 0.08), (hx, TRUSS_Y - 0.17, 0.9 if hz > 0.5 else -0.9), BLACK, bevel=0.01, step=0)
# "ON AIR" light box on the left tower (original sign)
box("onair_box", (0.8, 0.28, 0.1), (-5.0, 3.6, 1.12), BLACK, bevel=0.02, step=0)
plane("onair_face_noshadow", 0.72, 0.2, (-5.0, 3.6, 1.175), M("onair", color="#ff4a6a", rough=0.4, emit="#ff4a6a", emit_strength=2.2), facing="z")
text("onair_txt_noshadow", "ON AIR", 0.13, (-5.0, 3.6, 1.185), M("cream_emit", color="#fff2e0", emit="#fff2e0", emit_strength=2.5), extrude=0.004)

# ----------------------------------------------------------------------------- foreground: audience rows (faceless silhouettes)
SEAT = M("seat", rough=0.9)
for row, z in enumerate(AUD_Z):
    ry = row * 0.24
    box(f"riser{row}", (15.8, ry + 0.02, 0.8), (1.6, (ry + 0.02) / 2, z + 0.1), M("stage_dk", rough=0.7), bevel=0.01, step=1.0)
    box(f"riser_gold{row}", (15.8, 0.02, 0.03), (1.6, ry + 0.01, z - 0.3), GOLD_DK, bevel=0, step=2.0)
    x = -6.2 + (row % 2) * 0.31
    while x < 9.4:
        if abs(x - 0.3) > 0.55:  # an aisle on the centre line for the wide camera
            box(f"seat_{row}_{x:.2f}", (0.5, 0.48, 0.08), (x, ry + 0.42, z + 0.32), SEAT, bevel=0.03, step=0)
            box(f"seat_b_{row}_{x:.2f}", (0.5, 0.08, 0.42), (x, ry + 0.24, z + 0.1), SEAT, bevel=0.025, step=0)
            if R.random() < 0.78:
                hh = R.uniform(0.0, 0.1)
                c = M("crowd") if R.random() < 0.6 else M("crowd_b", rough=0.95)
                sphere(f"torso_{row}_{x:.2f}", 0.2, (x + R.uniform(-0.04, 0.04), ry + 0.62 + hh, z + 0.15), c, seg=12, scale=(1.0, 1.25, 0.7))
                sphere(f"head_{row}_{x:.2f}", 0.12, (x + R.uniform(-0.05, 0.05), ry + 0.93 + hh, z + 0.13), c, seg=12)
                if R.random() < 0.12:  # a raised arm
                    poly_tube(f"arm_{row}_{x:.2f}", [(x + 0.15, ry + 0.75 + hh, z + 0.15), (x + 0.24, ry + 1.15 + hh, z + 0.1)], 0.045, c)
        x += 0.62

# ----------------------------------------------------------------------------- foreground: studio camera rigs on pedestals
CAM = M("cam", rough=0.45, metal=0.3); CAM_DK = M("cam_dk", rough=0.5, metal=0.3); RUB = M("rubber", rough=0.85)
for k, ((cx, _, cz), ry) in enumerate(CAMS):
    yawd = math.degrees(ry)
    fx, fz = math.sin(ry), math.cos(ry)          # forward (toward the stage is -z: the rig faces -fwd)
    cyl(f"ped_ring{k}", 0.42, 0.06, (cx, 0.12, cz), CAM_DK, seg=32, bevel=0.01)
    for j in range(3):
        a = j / 3 * 6.283 + 0.4
        cyl(f"ped_wheel{k}{j}", 0.07, 0.06, (cx + math.cos(a) * 0.4, 0.07, cz + math.sin(a) * 0.4), RUB, seg=16, axis="x")
    cyl(f"ped_col{k}", 0.07, 1.0, (cx, 0.65, cz), STEEL, seg=20, bevel=0.005)
    cyl(f"ped_col_lo{k}", 0.11, 0.35, (cx, 0.32, cz), CAM_DK, seg=20, bevel=0.01)
    torus(f"ped_wheel_steer{k}", 0.3, 0.018, (cx, 1.05, cz), STEEL, seg=36, minor=6, facing="y")
    # head: body, lens toward the stage, viewfinder hood at the back, pan bars
    by_ = 1.32
    box(f"cam_body{k}", (0.34, 0.32, 0.6), (cx, by_, cz), CAM, bevel=0.03, step=0, rot_y=yawd)
    lx, lz = cx - fx * 0.42, cz - fz * 0.42
    cyl(f"cam_lens{k}", 0.1, 0.32, (lx, by_ - 0.02, lz), CAM_DK, seg=24, bevel=0.01, axis="z").rotation_euler.z = ry
    cyl(f"cam_hood{k}", 0.13, 0.12, (cx - fx * 0.62, by_ - 0.02, cz - fz * 0.62), RUB, seg=24, r2=0.15, bevel=0.005, axis="z").rotation_euler.z = ry
    box(f"cam_vf{k}", (0.3, 0.22, 0.12), (cx + fx * 0.34, by_ + 0.12, cz + fz * 0.34), CAM_DK, bevel=0.02, step=0, rot_y=yawd)
    for s_ in (-1, 1):
        rx, rz = cx + fx * 0.5 + math.cos(ry) * s_ * 0.22, cz + fz * 0.5 - math.sin(ry) * s_ * 0.22
        poly_tube(f"cam_bar{k}{s_}", [(cx + math.cos(ry) * s_ * 0.12, by_ - 0.1, cz - math.sin(ry) * s_ * 0.12), (rx, by_ - 0.2, rz)], 0.018, STEEL)
    text(f"cam_num{k}", str(k + 1), 0.12, (cx + math.cos(ry) * 0.175, by_ + 0.02, cz - math.sin(ry) * 0.175), M("cream", rough=0.5), extrude=0.005).rotation_euler.z = ry + math.pi / 2
    # cable snaking off toward the wings
    tube(f"cam_cable{k}", [(cx, 0.08, cz), (cx + 0.6 * (1 if cx > 0 else -1), 0.015, cz + 0.4), (cx + 1.4 * (1 if cx > 0 else -1), 0.015, cz - 0.3), (cx + 2.6 * (1 if cx > 0 else -1), 0.015, cz + 0.2)], 0.018, RUB)

# ----------------------------------------------------------------------------- side dressing
# prop cart stage left: spare rubber ducks + a gold star sign (original)
box("cart_top", (0.9, 0.05, 0.5), (-5.6, 0.75, -1.4), STEEL, bevel=0.01, step=0)
box("cart_shelf", (0.9, 0.04, 0.5), (-5.6, 0.25, -1.4), STEEL, bevel=0.01, step=0)
for sx_ in (-0.42, 0.42):
    for sz_ in (-0.22, 0.22):
        cyl(f"cart_leg{sx_}{sz_}", 0.015, 0.75, (-5.6 + sx_, 0.4, -1.4 + sz_), STEEL, seg=8, bevel=0)
        cyl(f"cart_wheel{sx_}{sz_}", 0.035, 0.03, (-5.6 + sx_, 0.035, -1.4 + sz_), RUB, seg=12, axis="z", bevel=0)
DUCK = M("duck", color="#ffd34d", rough=0.35); BEAK = M("beak", color="#ff8a3d", rough=0.4)
for j, (dx, dz) in enumerate(((-0.25, -0.1), (0.0, 0.08), (0.24, -0.06), (-0.1, -0.05), (0.15, 0.1))):
    y0 = 0.81 if j < 3 else 0.29
    sphere(f"sduck_b{j}", 0.08, (-5.6 + dx, y0, -1.4 + dz), DUCK, seg=14, scale=(1.25, 0.85, 1.0))
    sphere(f"sduck_h{j}", 0.052, (-5.6 + dx + 0.06, y0 + 0.08, -1.4 + dz), DUCK, seg=12)
    sphere(f"sduck_k{j}", 0.025, (-5.6 + dx + 0.11, y0 + 0.07, -1.4 + dz), BEAK, seg=8, scale=(1.4, 0.6, 1.0))
# road cases stacked in the right wing
for j, (x, y, z, w, h, d) in enumerate(((9.2, 0.3, 2.0, 1.0, 0.6, 0.7), (9.25, 0.85, 2.05, 0.8, 0.5, 0.6), (8.3, 0.25, 2.6, 0.7, 0.5, 0.6))):
    box(f"case{j}", (w, h, d), (x, y, z), M("black"), bevel=0.03, step=0)
    for s_ in (-1, 1):
        box(f"case_edge{j}{s_}", (w + 0.01, 0.03, d + 0.01), (x, y + s_ * (h / 2 - 0.02), z), STEEL, bevel=0.005, step=0)
# confetti cannons at the stage corners
for x in (-3.25, 3.25):
    cyl(f"cannon{x}", 0.09, 0.4, (x, STAGE_Y + 0.22, SZ1 - 0.2), GOLD_DK, seg=20, bevel=0.01).rotation_euler.x = math.radians(20)
    cyl(f"cannon_base{x}", 0.14, 0.06, (x, STAGE_Y + 0.03, SZ1 - 0.2), BLACK, seg=20, bevel=0.01)

tris = S.finish(ao_tint="#3a2552", ao_floor=0.45, samples=32)
assert tris < 300_000, f"over budget: {tris} tris"
