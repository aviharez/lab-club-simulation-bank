"""Gravity lab ("Lab Club Gravity Hall", EP01 "Same Jump, Different Planets"): procedural build -> gravity-lab.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/gravity-lab/build_gravity_lab.py [-- --no-bake]

Concept: an old observatory hall converted into the club's gravity test bay, at dusk. A round oculus in the back wall
shows the twilight sky (sky, stars and a ringed planet are added live by the React wrapper). Hero set piece: a steel
gantry that frames the four gravity chambers (the chambers themselves stay live in React: doors, markers, labels),
with spot housings, a "GRAVITY LAB" neon sign, conduits and generator cabinets behind each chamber.
Palette: warm cream plaster, dusty slate-blue panels, dark steel, brass, one coral accent; the mascots' four colours
only as small glow strips. Light story: cool dusk light through the oculus, warm tungsten practicals inside.

Layout is fixed by EP01 (src/jump, src/sets/lab/layout.ts): chambers at x = ±0.725, ±2.175, z = 0 (pedestal radius
0.78, glass to y 4.84, labels to y 5.75); console at (3.75, 0, 1.6); Lumi runs from (2.9, 1.75) to (0.725, 0.95):
keep the floor x -0.2..3.4, z 0.6..2.2 clear. Wide camera at (0, 4.2, 25.5) fov 26 sees x ±3.5 at the chambers.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint, cone_shell, boolean_cut
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "plaster": "#d8cdbf", "plaster_dk": "#c9bdae", "panel": "#7c919c", "panel_dk": "#62777f", "trim": "#eee5d7",
    "steel": "#a7adb5", "steel_dk": "#4b525d", "iron": "#3a3f48", "brass": "#c9a24a", "copper": "#b86e45",
    "coral": "#e07f6a", "hazard": "#e8b844", "wood": "#a97b52", "wood_lt": "#c99a68", "tile_a": "#8f8b9c",
    "tile_b": "#878396", "tile_c": "#9894a3", "grout": "#5d5868", "rubber": "#33302f", "paper": "#f4ecdf",
    "leaf": "#6fae82", "leaf_dk": "#4f8f66", "pot": "#d98c6c", "cable": "#3c3838", "chalk": "#2c3e4a",
    "book_1": "#e07f6a", "book_2": "#7f9fc0", "book_3": "#e3be62", "book_4": "#9c88bf", "book_5": "#88b9a8",
}
S.begin("gravity-lab", HERE, PAL)
R = S.R

BACK, W2, WALL_H = -2.6, 9.0, 12.0
CH_X = [-2.175, -0.725, 0.725, 2.175]
ACCENT = ["#6e4a8f", "#f27096", "#80adf2", "#f2bf3b"]
OC = dict(x=0.0, y=7.25, r=1.3)                      # oculus
GZ = -0.95                                           # gantry plane
GX = 3.35                                            # gantry column x

# ----------------------------------------------------------------------------- floor: concrete tiles + steel deck
box("floor_base", (2 * W2, 0.05, 18.0), (0, -0.065, BACK + 9.0), M("grout", rough=0.9), bevel=0, step=0.6)
T = 0.6
for i in range(int(14.4 / T)):
    x = -7.2 + T / 2 + i * T
    for j in range(int(15.6 / T)):
        z = BACK + T / 2 + j * T
        if abs(x) < 3.25 and -0.95 < z < 0.95: continue          # under the deck
        box(f"tile_{i}_{j}", (T - 0.008, 0.04, T - 0.008), (x, -0.02 + R.uniform(-0.001, 0.001), z),
            M(R.choice(["tile_a", "tile_b", "tile_c", "tile_a"]), rough=0.72), bevel=0.005, step=0.3, segments=1)
# steel deck plate under the chambers: tread panels, bolts, hazard edge at the front
box("deck", (6.5, 0.04, 1.9), (0, -0.012, 0), M("steel", rough=0.42, metal=0.7), bevel=0.01, step=0.3)
for k in range(8):
    box(f"deck_seam_{k}", (0.012, 0.004, 1.86), (-3.25 + 0.8125 * (k + 0.5), 0.009, 0), M("steel_dk", rough=0.5, metal=0.6), bevel=0, step=0)
for k in range(32):
    x = -3.2 + k * 0.2 + 0.1
    box(f"haz_{k}", (0.19, 0.006, 0.1), (x, 0.011, 0.9), M("hazard" if k % 2 else "iron", rough=0.55), bevel=0, step=0)
for k in range(14):
    for z in (-0.88, 0.78):
        cyl(f"deck_bolt_{k}_{z}", 0.016, 0.01, (-3.15 + k * 0.485, 0.012, z), M("steel_dk", rough=0.4, metal=0.8), seg=8, bevel=0)

# painted floor markings: walkway lines, launch arcs in front of each chamber, vent grates (flat decals, no collisions)
for z in (2.45, 2.55):
    box(f"lane_{z}", (13.0, 0.004, 0.05), (0, 0.002, z), M("lane", color="#d9b24a", rough=0.6), bevel=0, step=0)
for k, x in enumerate(CH_X):
    box(f"arc_{k}", (0.9, 0.004, 0.06), (x, 0.002, 1.25), M(f"arc_{k}", color=ACCENT[k], rough=0.6), bevel=0, step=0)
for k, (x, z) in enumerate(((-4.6, 2.0), (4.6, 3.2), (-1.6, 3.6))):
    box(f"vent_{k}", (0.8, 0.012, 0.5), (x, 0.004, z), M("steel_dk", rough=0.5, metal=0.6), bevel=0.004, step=0)
    for j in range(7):
        box(f"vent_slot_{k}_{j}", (0.7, 0.004, 0.025), (x, 0.011, z - 0.18 + j * 0.06), M("iron"), bevel=0, step=0)
# floor emblem in front of the chambers: painted orbit rings + four planet dots in the mascot colours
for k, (r_, hx) in enumerate(((1.55, "#c9a24a"), (1.15, "#d8cdbf"), (0.75, "#c9a24a"))):
    torus(f"emblem_ring_{k}", r_, 0.03, (0, 0.0, 3.9), M(f"emblem_{k}", color=hx, rough=0.6), seg=96, minor=4, facing="y").scale = (1, 1, 0.12)
for k in range(4):
    a = k / 4 * math.tau + 0.6; r_ = (0.75, 1.15, 1.55, 1.15)[k]
    cyl(f"emblem_dot_{k}", 0.09, 0.006, (math.cos(a) * r_, 0.003, 3.9 + math.sin(a) * r_), M(f"arc_{k}"), seg=20, bevel=0)
cyl("emblem_sun", 0.22, 0.006, (0, 0.003, 3.9), M("hazard"), seg=32, bevel=0)
# ----------------------------------------------------------------------------- back wall with the oculus
wall = box("wall_back", (2 * W2, WALL_H, 0.3), (0, WALL_H / 2, BACK - 0.15), M("plaster", rough=0.92), bevel=0, step=0.3)
boolean_cut(wall, cyl("cut_oculus", OC["r"], 1.0, (OC["x"], OC["y"], BACK - 0.15), None, seg=64, axis="z", bevel=0))
# inset panels on the upper wall (skip the oculus surround)
for i in range(12):
    for j in range(8):
        x = -W2 + 0.75 + i * 1.5; y = 1.95 + j * 1.3
        if math.hypot(x - OC["x"], y - OC["y"]) < OC["r"] + 1.0: continue
        box(f"wpanel_{i}_{j}", (1.36, 1.16, 0.035), (x, y, BACK + 0.018), M("plaster_dk", rough=0.9), bevel=0.012, step=0.4)
# wainscot: slate-blue boards, chair rail, baseboard
for i in range(int(2 * W2 / 0.3)):
    box(f"wains_{i}", (0.285, 1.2, 0.04), (-W2 + 0.15 + i * 0.3, 0.62, BACK + 0.02), M("panel", rough=0.6), bevel=0.008, step=0.3, segments=1)
box("chair_rail", (2 * W2, 0.07, 0.07), (0, 1.27, BACK + 0.04), M("trim", rough=0.5), bevel=0.012)
box("baseboard", (2 * W2, 0.16, 0.05), (0, 0.08, BACK + 0.045), M("panel_dk", rough=0.55), bevel=0.008)
# cornice band + steel ring beam line at gantry height
box("band_mid", (2 * W2, 0.12, 0.08), (0, 5.15, BACK + 0.04), M("trim", rough=0.5), bevel=0.012)
# observatory ribs: steel pilasters with rivets
for x in (-7.8, -5.4, 5.4, 7.8):
    box(f"rib_{x}", (0.28, WALL_H, 0.16), (x, WALL_H / 2, BACK + 0.08), M("steel_dk", rough=0.5, metal=0.6), bevel=0.015, step=0.5)
    for k in range(18):
        sphere(f"rivet_{x}_{k}", 0.018, (x + (0.09 if k % 2 else -0.09), 0.4 + k * 0.62, BACK + 0.165), M("steel", rough=0.4, metal=0.8), seg=8)

# oculus: deep brass-and-steel ring, spokes, inner ring, keystones
torus("oc_ring", OC["r"] + 0.06, 0.12, (OC["x"], OC["y"], BACK + 0.02), M("steel_dk", rough=0.45, metal=0.7), seg=72, minor=14)
torus("oc_ring_brass", OC["r"] - 0.04, 0.045, (OC["x"], OC["y"], BACK + 0.06), M("brass", rough=0.3, metal=1.0), seg=72, minor=10)
torus("oc_inner", 0.34, 0.035, (OC["x"], OC["y"], BACK - 0.12), M("brass", rough=0.3, metal=1.0), seg=40, minor=8)
cyl("oc_hub", 0.12, 0.08, (OC["x"], OC["y"], BACK - 0.12), M("steel_dk", rough=0.4, metal=0.7), seg=24, axis="z", bevel=0.01)
for k in range(8):
    a = k / 8 * math.tau
    r0, r1 = 0.36, OC["r"] - 0.02; rm = (r0 + r1) / 2
    box(f"oc_spoke_{k}", (0.04, r1 - r0, 0.05), (OC["x"] + math.sin(a) * rm, OC["y"] + math.cos(a) * rm, BACK - 0.12),
        M("steel_dk"), bevel=0.006, step=0, rot=(0, 0, -math.degrees(a)))
for k in range(12):
    a = k / 12 * math.tau
    box(f"oc_key_{k}", (0.18, 0.26, 0.06), (OC["x"] + math.sin(a) * (OC["r"] + 0.3), OC["y"] + math.cos(a) * (OC["r"] + 0.3), BACK + 0.03),
        M("trim", rough=0.5), bevel=0.012, step=0, rot=(0, 0, -math.degrees(a)))

# ----------------------------------------------------------------------------- HERO: gantry framing the chambers
def truss(name, a, b, w=0.34):
    """Square lattice truss from a to b (axis-aligned along x or y), 4 chords + zig-zag lacing on the front/back faces."""
    a = np.array(a, float); b = np.array(b, float); L = np.linalg.norm(b - a); d = (b - a) / L
    up = np.array([0, 0, 1.0]); side = np.cross(d, up) if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
    side /= np.linalg.norm(side); third = np.cross(d, side)
    offs = [(side * sx + third * sy) * w / 2 for sx in (-1, 1) for sy in (-1, 1)]
    for k, o in enumerate(offs):
        poly_tube(f"{name}_chord_{k}", [tuple(a + o), tuple(b + o)], 0.028, M("steel_dk", rough=0.45, metal=0.7))
    n = max(2, int(L / w))
    for face in ((0, 1), (2, 3), (0, 2), (1, 3)):
        pts = [tuple(a + d * L * k / n + offs[face[k % 2]]) for k in range(n + 1)]
        poly_tube(f"{name}_lace_{face}", pts, 0.012, M("steel_dk"))
    return d

GY = 6.15
for sx in (-1, 1):
    truss(f"col_{sx}", (sx * GX, 0.0, GZ), (sx * GX, GY + 0.17, GZ))
    box(f"col_foot_{sx}", (0.6, 0.08, 0.6), (sx * GX, 0.04, GZ), M("steel", rough=0.42, metal=0.7), bevel=0.012, step=0)
    for dx in (-1, 1):
        for dz in (-1, 1):
            cyl(f"col_bolt_{sx}_{dx}_{dz}", 0.022, 0.03, (sx * GX + dx * 0.23, 0.09, GZ + dz * 0.23), M("brass", rough=0.3, metal=1.0), seg=8, bevel=0)
truss("header", (-GX, GY, GZ), (GX, GY, GZ))
# sign on the header: backplate + neon letters (practical)
box("sign_plate", (2.5, 0.5, 0.05), (0, GY, GZ + 0.22), M("iron", rough=0.5, metal=0.3), bevel=0.02, step=0)
box("sign_trim", (2.58, 0.58, 0.03), (0, GY, GZ + 0.2), M("brass", rough=0.3, metal=1.0), bevel=0.01, step=0)
text("neon_noshadow", "GRAVITY LAB", 0.3, (0, GY - 0.01, GZ + 0.26), M("neon", color="#ffe8c2", rough=0.4, emit="#ffc777", emit_strength=5.0), extrude=0.012, keep=True)
# spot housings above each chamber (practicals), cable down the header
for k, x in enumerate(CH_X):
    cyl(f"spot_yoke_{k}", 0.02, 0.22, (x, GY - 0.28, GZ + 0.05), M("steel_dk"), seg=8, bevel=0)
    cyl(f"spot_can_{k}", 0.14, 0.32, (x, GY - 0.48, GZ + 0.22), M("iron", rough=0.45, metal=0.4), seg=24, axis="z", bevel=0.01)
    torus(f"spot_rim_{k}", 0.14, 0.018, (x, GY - 0.48, GZ + 0.38), M("brass", rough=0.3, metal=1.0), seg=24, minor=8)
    ln = cyl("spot_lens_noshadow" if k == 0 else f"spot_lens_{k}", 0.12, 0.01, (x, GY - 0.48, GZ + 0.385),
             M("lens", color="#fff3da", rough=0.2, emit="#ffe2b0", emit_strength=6.0), seg=24, axis="z", bevel=0, keep=True)
    if k: ln["join_into"] = "spot_lens_noshadow"
poly_tube("header_cable", [(-GX + 0.3, GY - 0.2, GZ + 0.18), (GX - 0.3, GY - 0.2, GZ + 0.18)], 0.02, M("cable", rough=0.6))

# generator cabinets behind each chamber (glow strip in the chamber's colour), conduits up to the chamber caps
for k, x in enumerate(CH_X):
    z = -1.95
    box(f"gen_{k}", (1.05, 3.4, 0.6), (x, 1.7, z), M("steel_dk", rough=0.48, metal=0.5), bevel=0.03, step=0.35)
    for j in range(6):
        box(f"gen_fin_{k}_{j}", (0.9, 0.035, 0.05), (x, 0.4 + j * 0.12, z + 0.31), M("iron", rough=0.5, metal=0.4), bevel=0.006, step=0)
    box(f"glow_strip_{k}_noshadow", (0.08, 2.4, 0.02), (x - 0.38, 2.15, z + 0.31), M(f"glow_{k}", color=ACCENT[k], rough=0.4, emit=ACCENT[k], emit_strength=3.0), bevel=0, step=0, keep=True)
    for j in range(3):
        cyl(f"gen_gauge_{k}_{j}", 0.07, 0.03, (x + 0.12 + j * 0.0, 2.9 - j * 0.32, z + 0.31), M("paper", rough=0.5), seg=20, axis="z", bevel=0.004)
        torus(f"gen_gauge_rim_{k}_{j}", 0.072, 0.012, (x + 0.12, 2.9 - j * 0.32, z + 0.33), M("brass", rough=0.3, metal=1.0), seg=20, minor=6)
    tube(f"conduit_{k}", [(x + 0.15, 4.75, -0.2), (x + 0.15, 5.05, -0.75), (x + 0.15, 4.4, -1.4), (x + 0.15, 3.4, -1.75)], 0.06, M("copper", rough=0.35, metal=1.0))
    tube(f"conduit_b_{k}", [(x - 0.2, 4.7, -0.3), (x - 0.25, 4.85, -0.8), (x - 0.25, 3.6, -1.7)], 0.035, M("rubber", rough=0.6))
    poly_tube(f"floor_cable_{k}", [(x + 0.5, 0.02, -0.55), (x + 0.6, 0.02, -1.2), (x + 0.4, 0.05, -1.62), (x + 0.4, 0.3, -1.66)], 0.02, M("cable", rough=0.6))

# ----------------------------------------------------------------------------- right: mission wall (screens, racks, desk)
def scr(seed, kind):
    def f(u, v):
        o = fill(u, "#0d2230"); rr = __import__("random").Random(seed)
        if kind == "orbit":
            for k, r_ in enumerate((0.16, 0.26, 0.36)):
                e = ((u - 0.5) / r_) ** 2 + ((v - 0.5) / (r_ * 1.5)) ** 2
                paint(o, np.abs(e - 1) < 0.05, ["#7fd8f0", "#f0b37f", "#c9a8ff"][k], 0.85)
            paint(o, (u - 0.5) ** 2 + ((v - 0.5) * 0.65) ** 2 < 0.04 ** 2, "#ffd98a")
        elif kind == "arc":
            for k in range(4):
                gk = [0.3, 0.55, 1.0, 1.9][k]
                y = 0.12 + (u * 4 * (1 - u)) * 0.8 / gk
                paint(o, (np.abs(v - y) < 0.012) & (y < 0.98), ["#c9a8ff", "#ff9bb7", "#9cc8ff", "#ffd56b"][k], 0.9)
            paint(o, np.abs(v - 0.12) < 0.005, "#5f8fa0")
        elif kind == "radar":
            d = np.hypot(u - 0.5, (v - 0.5) * 0.7)
            for r_ in (0.12, 0.24, 0.36): paint(o, np.abs(d - r_) < 0.004, "#2f6f6a")
            ang = np.arctan2(v - 0.5, u - 0.5)
            paint(o, (d < 0.38) & (np.abs(ang - 0.7) < 0.25), "#7ff0c8", 0.35)
            for _ in range(5):
                cx, cy = rr.uniform(0.3, 0.7), rr.uniform(0.3, 0.7); paint(o, np.hypot(u - cx, (v - cy) * 0.7) < 0.012, "#7ff0c8")
        else:  # bars / wave
            y = 0.5 + 0.25 * np.sin(u * math.pi * (3 + seed)) * np.exp(-u)
            paint(o, np.abs(v - y) < 0.018, "#7ff0c8")
            for k in range(8):
                h = rr.uniform(0.1, 0.35); paint(o, (np.abs(u - (0.1 + k * 0.11)) < 0.03) & (v < 0.08 + h) & (v > 0.06), "#2f8f86")
        paint(o, (u < 0.015) | (u > 0.985) | (v < 0.02) | (v > 0.98), "#2a5566")
        return o
    return f

MX = 5.35
box("screen_frame", (2.9, 1.42, 0.08), (MX, 2.55, BACK + 0.05), M("iron", rough=0.5, metal=0.3), bevel=0.02, step=0)
for k, (dx, dy, kind) in enumerate(((-0.95, 0.33, "orbit"), (0.0, 0.33, "arc"), (0.95, 0.33, "radar"), (-0.95, -0.33, "wave"), (0.0, -0.33, "radar"), (0.95, -0.33, "orbit"))):
    img = image(f"screen_{k}", 512, 320, scr(k, kind))
    plane(f"screen_{k}_noshadow", 0.86, 0.58, (MX + dx, 2.55 + dy, BACK + 0.092), M(f"screen_{k}", rough=0.3, emit="#ffffff", emit_strength=1.3, image=img, emit_image=True), keep=True)
# low desk under the screens with clutter
box("desk_top", (3.0, 0.06, 0.7), (MX, 0.9, BACK + 0.4), M("wood_lt", rough=0.55), bevel=0.012)
box("desk_body", (2.9, 0.86, 0.6), (MX, 0.44, BACK + 0.35), M("panel_dk", rough=0.55), bevel=0.015)
for k in range(5):
    box(f"desk_drawer_{k}", (0.52, 0.34, 0.02), (MX - 1.16 + k * 0.58, 0.55, BACK + 0.66), M("panel", rough=0.5), bevel=0.006, step=0)
    box(f"desk_handle_{k}", (0.18, 0.025, 0.03), (MX - 1.16 + k * 0.58, 0.64, BACK + 0.68), M("brass", rough=0.3, metal=1.0), bevel=0.004, step=0)
sphere("desk_globe", 0.17, (MX + 1.1, 1.2, BACK + 0.4), M("globe", color="#7fa7c9", rough=0.5), seg=24)
torus("desk_globe_ring", 0.2, 0.01, (MX + 1.1, 1.2, BACK + 0.4), M("brass", rough=0.3, metal=1.0), seg=32, minor=6, facing="x")
cyl("desk_globe_stand", 0.08, 0.12, (MX + 1.1, 0.99, BACK + 0.4), M("wood", rough=0.6), seg=16, r2=0.05)
cyl("mug", 0.045, 0.1, (MX - 0.6, 0.98, BACK + 0.5), M("coral", rough=0.45), seg=16)
for b in range(3):
    box(f"desk_book_{b}", (0.32, 0.04, 0.24), (MX - 1.1, 0.955 + b * 0.042, BACK + 0.42), M(f"book_{b + 1}", rough=0.75), bevel=0.003, step=0, rot_y=8 * (b - 1))
box("desk_lamp_base", (0.16, 0.03, 0.16), (MX + 0.4, 0.95, BACK + 0.35), M("iron"), bevel=0.006, step=0)
poly_tube("desk_lamp_arm", [(MX + 0.4, 0.96, BACK + 0.35), (MX + 0.32, 1.32, BACK + 0.4), (MX + 0.5, 1.48, BACK + 0.5)], 0.012, M("iron"))
cone_shell("desk_lamp_hood", 0.08, 0.03, 0.12, (MX + 0.52, 1.44, BACK + 0.52), M("coral", rough=0.45))
sphere("desk_lamp_bulb_noshadow", 0.03, (MX + 0.53, 1.39, BACK + 0.53), M("bulb", color="#fff4dc", rough=0.3, emit="#ffd9a0", emit_strength=8.0), seg=12, keep=True)
# server racks with LED rows (one emissive node for all LEDs)
for k, x in enumerate((7.05, 7.75)):
    box(f"rack_{k}", (0.64, 2.3, 0.7), (x, 1.15, BACK + 0.4), M("iron", rough=0.5, metal=0.4), bevel=0.02, step=0.35)
    for j in range(9):
        box(f"rack_unit_{k}_{j}", (0.56, 0.2, 0.02), (x, 0.3 + j * 0.23, BACK + 0.76), M("steel_dk", rough=0.45, metal=0.5), bevel=0.004, step=0)
        for l in range(3):
            if R.random() < 0.7:
                b = box(f"rack_led_{k}_{j}_{l}", (0.025, 0.025, 0.01), (x + 0.16 + l * 0.04, 0.33 + j * 0.23, BACK + 0.775),
                        M("led", color="#bfffe6", rough=0.3, emit="#7ff0c8", emit_strength=6.0), bevel=0, step=0, keep=True)
                b["join_into"] = "rack_leds_noshadow"
box("rack_leds_noshadow", (0.025, 0.025, 0.01), (7.05 + 0.16, 0.33, BACK + 0.775), M("led"), bevel=0, step=0, keep=True)
# cable tray along the wall over the racks + trunk to the console
box("tray", (5.0, 0.08, 0.3), (5.6, 3.65, BACK + 0.2), M("steel", rough=0.45, metal=0.7), bevel=0.006, step=0.4)
for k in range(6):
    box(f"tray_bracket_{k}", (0.04, 0.2, 0.3), (3.3 + k * 0.92, 3.55, BACK + 0.18), M("steel_dk"), bevel=0.004, step=0)
for k in range(4):
    tube(f"tray_cable_{k}", [(3.1 + k * 0.4, 3.7, BACK + 0.15 + k * 0.05), (8.0, 3.7, BACK + 0.15 + k * 0.05)], 0.025, M(["rubber", "coral", "cable", "rubber"][k], rough=0.6))
poly_tube("console_trunk", [(3.55, 0.025, 1.2), (3.45, 0.025, 0.5), (3.45, 0.025, -0.9), (3.6, 0.03, BACK + 0.4), (3.6, 0.6, BACK + 0.05)], 0.035, M("rubber", rough=0.6))
poly_tube("console_trunk_2", [(3.65, 0.02, 1.15), (3.55, 0.02, 0.4), (3.56, 0.02, -0.9), (3.72, 0.025, BACK + 0.35), (3.72, 0.55, BACK + 0.05)], 0.022, M("coral", rough=0.55))
# wall poster (original art): planet sizes
def poster_planets(u, v):
    o = fill(u, "#2f3a57")
    rr = __import__("random").Random(3)
    for _ in range(70):
        cx, cy = rr.random(), rr.random(); paint(o, (u - cx) ** 2 + ((v - cy) * 1.4) ** 2 < 0.0045 ** 2 * 4, "#fff6e0")
    for cx, cy, r_, hx in ((0.2, 0.55, 0.05, "#d8d4e0"), (0.38, 0.55, 0.07, "#e0896d"), (0.6, 0.55, 0.1, "#7fa7c9"), (0.82, 0.55, 0.16, "#e3be62")):
        paint(o, (u - cx) ** 2 + ((v - cy) * 1.4) ** 2 < r_ * r_, hx)
    paint(o, (v < 0.14) & (v > 0.09) & (np.abs(u - 0.5) < 0.34), "#f4ecdf", 0.9)
    paint(o, (v > 0.95) | (v < 0.03) | (u < 0.03) | (u > 0.97), "#e3be62")
    return o
img = image("poster_planets", 640, 420, poster_planets)
plane("poster_planets", 1.4, 0.92, (MX, 4.45, BACK + 0.02), M("poster_planets", rough=0.7, image=img))

# ----------------------------------------------------------------------------- left: observatory bench, orrery, chalkboard
BX = -5.25
box("bench_top", (2.6, 0.07, 0.8), (BX, 0.92, BACK + 0.45), M("wood_lt", rough=0.55), bevel=0.012)
box("bench_body", (2.5, 0.86, 0.72), (BX, 0.45, BACK + 0.42), M("panel", rough=0.55), bevel=0.012)
for k in range(4):
    box(f"bench_door_{k}", (0.56, 0.66, 0.02), (BX - 0.93 + k * 0.62, 0.45, BACK + 0.79), M("panel_dk", rough=0.5), bevel=0.006, step=0)
    cyl(f"bench_knob_{k}", 0.022, 0.03, (BX - 0.72 + k * 0.62, 0.62, BACK + 0.81), M("brass", rough=0.3, metal=1.0), seg=12, axis="z", bevel=0)
# orrery: brass base + sun (practical) + 4 named arms (origin at the centre, spun by the wrapper)
OX, OY, OZ = BX + 0.55, 0.96, BACK + 0.5
cyl("orr_base", 0.16, 0.06, (OX, OY + 0.03, OZ), M("wood", rough=0.55), seg=24, bevel=0.008)
cyl("orr_post", 0.015, 0.36, (OX, OY + 0.24, OZ), M("brass", rough=0.3, metal=1.0), seg=12, bevel=0)
sphere("orr_sun_noshadow", 0.07, (OX, OY + 0.44, OZ), M("sun", color="#ffe2a8", rough=0.3, emit="#ffc46b", emit_strength=6.0), seg=20, keep=True)
for k, (L, pr, hx, y) in enumerate(((0.16, 0.022, "#d8d4e0", 0.42), (0.24, 0.028, "#e0896d", 0.4), (0.33, 0.032, "#7fa7c9", 0.38), (0.44, 0.05, "#e3be62", 0.36))):
    arm = box(f"orrery_arm_{k}", (L, 0.008, 0.008), (OX, OY + y, OZ), M("brass"), bevel=0, step=0, keep=True)
    for vv in arm.data.vertices: vv.co.x += L / 2
    p_ = sphere(f"orr_planet_{k}", pr, (OX + L, OY + y + 0.0, OZ), M(f"planet_{k}", color=hx, rough=0.5), seg=16, keep=True)
    p_["join_into"] = f"orrery_arm_{k}"
    if k == 3:
        r_ = torus(f"orr_ring_{k}", 0.075, 0.006, (OX + L, OY + y, OZ), M("brass"), seg=24, minor=4, facing="y", keep=True); r_["join_into"] = f"orrery_arm_{k}"
# bench clutter: flasks with glowing liquid, books, a brass telescope eyepiece box
for k, (x, col, glow) in enumerate(((BX - 0.95, "#7ff0c8", 2.4), (BX - 0.7, "#ff9ab8", 2.0))):
    cyl(f"flask_base_{k}", 0.09, 0.16, (x, 1.04, BACK + 0.45), M(f"flaskglass", color="#e9f6f1", rough=0.06, alpha=0.3), seg=20, r2=0.04, bevel=0)
    cyl(f"flask_neck_{k}", 0.028, 0.14, (x, 1.19, BACK + 0.45), M("flaskglass"), seg=12, bevel=0)
    cyl(f"flask_liquid_{k}_noshadow", 0.075, 0.09, (x, 1.005, BACK + 0.45), M(f"liquid_{k}", color=col, rough=0.2, emit=col, emit_strength=glow), seg=20, r2=0.05, bevel=0, keep=True)
for b in range(5):
    h = 0.22 + 0.03 * (b % 3)
    box(f"bench_book_{b}", (0.045, h, 0.2), (BX - 0.25 + b * 0.05, 0.955 + h / 2, BACK + 0.3), M(f"book_{b % 5 + 1}", rough=0.75), bevel=0.003, step=0, segments=1)
box("star_chart_roll", (0.5, 0.06, 0.06), (BX + 0.1, 0.99, BACK + 0.65), M("paper", rough=0.7), bevel=0.02, step=0, rot_y=10)
# chalkboard (original sketches: jump arcs under different gravity, orbits; no numbers)
def chalk(u, v):
    o = fill(u, PAL["chalk"]); W = "#e9efe9"
    x, y = u * 1.7, v * 1.0
    for k, gk in enumerate((0.35, 0.6, 1.0, 2.0)):
        yy = 0.12 + (x / 0.9) * (2 - x / 0.9) * 0.75 / gk
        paint(o, (np.abs(y - yy) < 0.01) & (x < 1.8 * 0.9 / 1.0) & (yy > 0.11), ["#d9c6ff", "#ffb3c6", "#bcd6ff", "#ffe08a"][k], 0.8)
    paint(o, (np.abs(y - 0.11) < 0.006) & (x > 0.05) & (x < 1.65), W, 0.7)
    for k in range(3):
        e = ((x - 1.35) / (0.12 + 0.07 * k)) ** 2 + ((y - 0.75) / (0.07 + 0.04 * k)) ** 2
        paint(o, np.abs(e - 1) < 0.07, W, 0.55)
    paint(o, (x - 1.35) ** 2 + (y - 0.75) ** 2 < 0.02 ** 2, "#ffe08a", 0.9)
    for row in range(3):
        for k in range(4):
            x0 = 0.1 + k * 0.12 + 0.02 * row
            paint(o, (np.abs(y - (0.93 - row * 0.07)) < 0.01) & (x > x0) & (x < x0 + 0.07), W, 0.6)
    return o
img = image("chalkboard", 1024, 600, chalk)
box("chalk_frame", (2.2, 1.36, 0.06), (BX, 2.35, BACK + 0.03), M("wood", rough=0.55), bevel=0.012, step=0.2)
plane("chalk_surface", 2.06, 1.22, (BX, 2.35, BACK + 0.062), M("chalkboard", rough=0.85, image=img))
box("chalk_tray", (1.8, 0.03, 0.08), (BX, 1.66, BACK + 0.09), M("wood", rough=0.55), bevel=0.006, step=0)
# shelves above with jars
for k, y in enumerate((3.45, 4.05)):
    box(f"shelf_{k}", (2.2, 0.045, 0.3), (BX, y, BACK + 0.17), M("wood_lt", rough=0.55), bevel=0.006)
    for j in range(2):
        box(f"shelf_bracket_{k}_{j}", (0.03, 0.16, 0.22), (BX - 0.95 + j * 1.9, y - 0.1, BACK + 0.13), M("brass", rough=0.35, metal=1.0), bevel=0.004, step=0)
    x = BX - 1.0
    while x < BX + 0.95:
        if R.random() < 0.6:
            r_ = R.uniform(0.05, 0.075); h = R.uniform(0.14, 0.26)
            cyl(f"jar_{k}_{x:.2f}", r_, h, (x + r_, y + 0.02 + h / 2, BACK + 0.17), M(f"jar_{R.randint(0, 2)}", color=R.choice(["#bfe6d4", "#f6c9b8", "#d9cdf0"]), rough=0.12, alpha=0.6), seg=16, bevel=0)
            cyl(f"jar_lid_{k}_{x:.2f}", r_ * 0.9, 0.025, (x + r_, y + 0.035 + h, BACK + 0.17), M(R.choice(["coral", "brass", "panel_dk"]), rough=0.4), seg=16, bevel=0)
            x += 2 * r_ + 0.04
        else:
            for b in range(R.randint(3, 6)):
                h = R.uniform(0.2, 0.28)
                box(f"book_{k}_{x:.2f}_{b}", (0.036, h, 0.2), (x + 0.02, y + 0.02 + h / 2, BACK + 0.15), M(f"book_{R.randint(1, 5)}", rough=0.75), bevel=0.003, step=0, segments=1)
                x += 0.042
            x += 0.05
# tall bookcase at the far left
for k in range(2):
    box(f"case_side_{k}", (0.04, 3.0, 0.4), (-7.95 + k * 1.3, 1.5, BACK + 0.22), M("wood", rough=0.6), bevel=0.008, step=0.3)
box("case_back", (1.34, 3.0, 0.03), (-7.3, 1.5, BACK + 0.03), M("wood", rough=0.6), bevel=0, step=0.3)
for k in range(6):
    y = 0.05 + k * 0.58
    box(f"case_shelf_{k}", (1.28, 0.035, 0.38), (-7.3, y, BACK + 0.22), M("wood", rough=0.6), bevel=0.005, step=0.3)
    if k == 5: break
    x = -7.9
    while x < -6.72:
        h = R.uniform(0.28, 0.44); th = R.uniform(0.035, 0.06)
        box(f"case_book_{k}_{x:.2f}", (th, h, 0.26), (x + th / 2, y + 0.02 + h / 2, BACK + 0.22), M(f"book_{R.randint(1, 5)}", rough=0.75), bevel=0.003, step=0, segments=1)
        x += th + 0.005

# brass telescope on a tripod, aimed at the oculus (midground left)
TX, TZ = -4.15, 0.55
for k in range(3):
    a = k / 3 * math.tau + 0.4
    poly_tube(f"tel_leg_{k}", [(TX, 1.25, TZ), (TX + math.cos(a) * 0.5, 0.0, TZ + math.sin(a) * 0.5)], 0.022, M("wood", rough=0.55))
cyl("tel_mount", 0.07, 0.12, (TX, 1.3, TZ), M("brass", rough=0.3, metal=1.0), seg=16, bevel=0.006)
tel = cyl("tel_tube", 0.085, 1.5, (TX + 0.35, 1.72, TZ - 0.25), M("brass"), seg=32, r2=0.065, bevel=0.006)
tel.rotation_euler = (math.radians(-28), math.radians(-25), math.radians(-35))
torus("tel_band", 0.09, 0.015, (TX + 0.05, 1.47, TZ - 0.03), M("steel_dk"), seg=24, minor=6, facing="y")

# ----------------------------------------------------------------------------- pendant lamps (practicals) over the side areas
for k, (x, z, drop) in enumerate(((-5.0, 0.2, 4.6), (5.1, 0.2, 4.4))):
    poly_tube(f"pendant_cord_{k}", [(x, WALL_H, z), (x, 4.0 + (5.0 - drop), z)], 0.01, M("cable", rough=0.6))
    hood = cone_shell(f"pendant_hood_{k}", 0.42, 0.07, 0.3, (x, 4.0 + (5.0 - drop) - 0.15, z), M("pendant_enamel", color="#5f7f86", rough=0.4))
    sphere(f"pendant_bulb_{k}_noshadow", 0.08, (x, 4.0 + (5.0 - drop) - 0.25, z), M("bulb"), seg=20, keep=True)

# ----------------------------------------------------------------------------- foreground framing + floor dressing
# left: tool cart with a big planet model; right: crates with a coiled cable
FX = -3.2; FZ = 4.4
box("cart_top", (0.9, 0.05, 0.55), (FX, 0.82, FZ), M("steel", rough=0.42, metal=0.7), bevel=0.01, step=0)
box("cart_shelf", (0.9, 0.04, 0.55), (FX, 0.3, FZ), M("steel", rough=0.42, metal=0.7), bevel=0.01, step=0)
for dx in (-1, 1):
    for dz in (-1, 1):
        cyl(f"cart_post_{dx}_{dz}", 0.018, 0.8, (FX + dx * 0.42, 0.45, FZ + dz * 0.25), M("steel_dk"), seg=10, bevel=0)
        cyl(f"cart_wheel_{dx}_{dz}", 0.045, 0.03, (FX + dx * 0.4, 0.045, FZ + dz * 0.23), M("rubber", rough=0.6), seg=12, axis="x", bevel=0)
sphere("cart_planet", 0.3, (FX, 1.15, FZ), M("cart_planet", color="#d79a6a", rough=0.6), seg=32)
torus("cart_planet_ring", 0.45, 0.025, (FX, 1.15, FZ), M("trim", rough=0.5), seg=48, minor=6, facing="y").rotation_euler = (math.radians(14), math.radians(-8), 0)
for k in range(3):
    box(f"cart_box_{k}", (0.22, 0.14, 0.18), (FX - 0.25 + k * 0.25, 0.39, FZ), M(["coral", "panel", "hazard"][k], rough=0.6), bevel=0.01, step=0)
CXF, CZF = 4.75, 4.2
box("crate_a", (0.7, 0.6, 0.6), (CXF, 0.3, CZF), M("wood", rough=0.7), bevel=0.015, step=0.2)
box("crate_b", (0.55, 0.45, 0.5), (CXF + 0.1, 0.825, CZF - 0.02), M("wood_lt", rough=0.7), bevel=0.012, step=0.2, rot_y=12)
for k in range(3):
    box(f"crate_slat_{k}", (0.72, 0.05, 0.62), (CXF, 0.08 + k * 0.22, CZF), M("panel_dk", rough=0.6), bevel=0.006, step=0)
torus("coil", 0.22, 0.04, (CXF - 0.6, 0.05, CZF + 0.3), M("coral", rough=0.55), seg=32, minor=8, facing="y")
torus("coil_2", 0.16, 0.035, (CXF - 0.6, 0.12, CZF + 0.3), M("coral"), seg=32, minor=8, facing="y")
# plants (soften the steel)
def plant(name, at, s=1.0, pot="pot"):
    x, _, z = at
    cyl(f"{name}_pot", 0.26 * s, 0.5 * s, (x, 0.25 * s, z), M(pot, rough=0.65), seg=28, r2=0.2 * s, bevel=0.012)
    for j in range(9):
        a = j / 9 * math.tau + 0.3; h = (0.7 + (j % 3) * 0.25) * s; rr_ = (0.1 + (j % 2) * 0.12) * s
        poly_tube(f"{name}_stem_{j}", [(x, 0.5 * s, z), (x + math.cos(a) * rr_, 0.5 * s + h * 0.85, z + math.sin(a) * rr_)], 0.011, M("leaf_dk", rough=0.6))
        lf = sphere(f"{name}_leaf_{j}", 0.18 * s, (x + math.cos(a) * (rr_ + 0.1 * s), 0.5 * s + h, z + math.sin(a) * (rr_ + 0.1 * s)), M("leaf" if j % 2 else "leaf_dk", rough=0.55), seg=14, scale=(1.0, 0.18, 0.62))
        lf.rotation_euler = (math.radians(20 * math.sin(a)), math.radians(15), -a)
plant("plant_r", (8.3, 0, BACK + 0.6), 1.3)
plant("plant_l", (-6.3, 0, BACK + 1.25), 1.1, pot="panel")
plant("plant_m", (4.1, 0, -1.7), 0.9)

tris = S.finish(ao_tint="#7c7f9e")
assert tris < 300_000, f"over budget: {tris} tris"
