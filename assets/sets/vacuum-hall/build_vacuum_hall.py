"""Vacuum test hall (EP02 "Feather vs Hammer"): procedural build -> vacuum-hall.blend + .glb
Usage: blender -b --factory-startup --python assets/sets/vacuum-hall/build_vacuum_hall.py [-- --no-bake]

Concept: "Lab Club Test Hall 2", a tall, clean industrial hall in the lab building, used for vacuum drop tests.
Cool daylight falls from a row of high clerestory windows through soft haze. Hero set piece: twin glass vacuum
columns (live in React: src/sets/lab/props/VacuumColumn) on a hazard-striped stage, with a steel mezzanine behind them
from which the drop is made, hoses and cable trays feeding them. Palette: white panels, steel grey, cool cyan accents,
small warning-yellow stripes.

Layout (three.js metres, shared with episodes/src/sets/vacuum-hall/VacuumHall.tsx):
  columns at x = -0.9 (AIR) and +0.9 (VACUUM), z = 0, pedestal top 0.30, glass radius 0.5, glass top 4.0;
  mezzanine deck top y = 2.77 (hand at hold_drop ~0.53 m -> release point 3.30 = 3 m above the tube floor),
  deck z -1.45..0.3 with round cut-outs for the columns (the cast stands beside the glass at z ~0), x -2.6..2.6,
  stairs down on the left; Miyu's bench front-left; console + pump front-right
  (live in React). Keep the floor x -3..3, z -0.8..2.6 clear for the cast and the walk.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_shared"))
import set_lib as S
from set_lib import M, box, cyl, sphere, torus, plane, tube, poly_tube, text, image, fill, paint
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    "wall": "#dfe3e7", "wall_lt": "#e9ecef", "wall_dk": "#c9cfd5", "wains": "#9aa4ad", "trim": "#f7f8f9",
    "steel": "#a3acb4", "steel_lt": "#c5ccd2", "steel_dk": "#56606a", "iron": "#30363d", "galv": "#b9c0c6",
    "cyan": "#3cc8dc", "cyan_dk": "#1f8fa3", "hazard": "#f2c230", "black": "#25292e",
    "floor_a": "#c8ccd0", "floor_b": "#c2c6cb", "floor_c": "#cdd1d4", "seam": "#9aa0a6",
    "rubber": "#2c3136", "cable": "#30353b", "cable_c": "#2f8fa0", "cable_y": "#c9a23a",
    "wood": "#b08a62", "cushion": "#5f8796", "paper": "#f4f6f8", "glass_win": "#dff2ff",
}
S.begin("vacuum-hall", HERE, PAL)
R = S.R

BACK, W2, WALL_H = -4.2, 8.0, 13.0
COL_X = (-0.9, 0.9)
DECK_Y, DECK_Z0, DECK_Z1, DECK_X = 2.77, -1.45, 0.3, 2.6
CAT_Y = 5.6                                        # back catwalk


def hazard_strip(name, x0, x1, y, z, depth=0.08, h=0.006, n=None, axis="x", vertical=False, w=0.16):
    """Alternating yellow/black blocks along x (or z) - the warning stripes."""
    L = abs(x1 - x0); n = n or max(2, int(L / w))
    for k in range(n):
        c = x0 + (k + 0.5) * (x1 - x0) / n
        mat = M("hazard", rough=0.55) if k % 2 == 0 else M("black", rough=0.6)
        if vertical:
            box(f"{name}_{k}", (0.012, L / n, depth), (z, c, y), mat, bevel=0, step=0)
        elif axis == "x":
            box(f"{name}_{k}", (L / n, h, depth), (c, y, z), mat, bevel=0, step=0)
        else:
            box(f"{name}_{k}", (depth, h, L / n), (z, y, c), mat, bevel=0, step=0)


# ----------------------------------------------------------------------------- floor: sealed concrete slabs
box("floor_base", (2 * W2, 0.05, 16.0), (0, -0.065, BACK + 8.0), M("seam", rough=0.9), bevel=0, step=0.8)
T = 1.0
for i in range(int(2 * W2 / T)):
    x = -W2 + T / 2 + i * T
    for j in range(int(12.0 / T)):
        z = BACK + T / 2 + j * T
        box(f"slab_{i}_{j}", (T - 0.01, 0.04, T - 0.01), (x, -0.02 + R.uniform(-0.0015, 0.0015), z),
            M(R.choice(["floor_a", "floor_b", "floor_c", "floor_a"]), rough=R.choice([0.55, 0.62, 0.7])), bevel=0.004, step=0.34, segments=1)
# column stage: a raised steel plinth with a hazard border, round drains, bolt rows
box("stage", (4.0, 0.06, 2.0), (0, 0.03, 0.15), M("steel", rough=0.45, metal=0.65), bevel=0.012, step=0.3)
hazard_strip("stage_haz_f", -2.0, 2.0, 0.062, 1.08, depth=0.12)
hazard_strip("stage_haz_b", -2.0, 2.0, 0.062, -0.78, depth=0.12)
for k in range(9):
    box(f"stage_seam_{k}", (0.01, 0.004, 1.9), (-2.0 + 0.4 * (k + 1), 0.062, 0.15), M("steel_dk", rough=0.5, metal=0.6), bevel=0, step=0)
for k in range(16):
    for z in (-0.68, 0.98):
        cyl(f"stage_bolt_{k}_{z}", 0.014, 0.01, (-1.9 + k * 0.253, 0.064, z), M("steel_dk", rough=0.4, metal=0.8), seg=8, bevel=0)
# walkway lines on the floor + a painted "keep clear" box in front of the stage
for z in (2.95, 3.05):
    box(f"lane_{z}", (12.0, 0.004, 0.05), (0, 0.002, z), M("hazard"), bevel=0, step=0)
for k, (x, z) in enumerate(((-4.6, 1.6), (4.4, 2.6), (-1.5, 4.6), (2.8, -2.6))):
    box(f"drain_{k}", (0.6, 0.012, 0.6), (x, 0.004, z), M("steel_dk", rough=0.5, metal=0.6), bevel=0.004, step=0)
    for j in range(8):
        box(f"drain_slot_{k}_{j}", (0.52, 0.004, 0.022), (x, 0.011, z - 0.24 + j * 0.068), M("iron"), bevel=0, step=0)

# ----------------------------------------------------------------------------- back wall: white panels, clerestory windows
box("wall_back", (2 * W2, WALL_H, 0.3), (0, WALL_H / 2, BACK - 0.15), M("wall_dk", rough=0.9), bevel=0, step=0.5)
WIN_Y0, WIN_Y1 = 6.8, 9.8
WIN_X = [-6.0, -4.0, -2.0, 0.0, 2.0, 4.0, 6.0]
for i in range(10):
    for j in range(5):
        x = -W2 + 0.8 + i * 1.6; y = 1.55 + j * 1.05
        box(f"wpanel_{i}_{j}", (1.56, 1.01, 0.04), (x, y + 0.5, BACK + 0.02), M("wall" if (i + j) % 3 else "wall_lt", rough=R.choice([0.8, 0.86])), bevel=0.01, step=0.4, segments=1)
        for sx in (-0.7, 0.7):
            cyl(f"wfix_{i}_{j}_{sx}", 0.012, 0.01, (x + sx, y + 0.92, BACK + 0.045), M("steel_dk"), seg=6, axis="z", bevel=0)
for i in range(10):                                 # upper band between the panel field and the windows
    box(f"wpanel_up_{i}", (1.56, 0.5, 0.04), (-W2 + 0.8 + i * 1.6, 6.5, BACK + 0.02), M("wall_lt", rough=0.85), bevel=0.01, step=0.4, segments=1)
# wainscot: grey steel kick panels, cyan accent band, white trims
for i in range(int(2 * W2 / 0.8)):
    box(f"wains_{i}", (0.79, 1.35, 0.05), (-W2 + 0.4 + i * 0.8, 0.7, BACK + 0.025), M("wains", rough=0.5, metal=0.25), bevel=0.008, step=0.35, segments=1)
box("cyan_band", (2 * W2, 0.09, 0.03), (0, 1.43, BACK + 0.06), M("cyan", rough=0.4), bevel=0.006, step=0)
box("chair_rail", (2 * W2, 0.06, 0.06), (0, 1.51, BACK + 0.05), M("trim", rough=0.45), bevel=0.01)
box("baseboard", (2 * W2, 0.12, 0.05), (0, 0.06, BACK + 0.07), M("iron", rough=0.5), bevel=0.008)
# steel pilasters (structure) with base plates
for x in (-7.0, -3.0, 3.0, 7.0):
    box(f"pil_{x}", (0.34, WALL_H, 0.22), (x, WALL_H / 2, BACK + 0.11), M("steel_lt", rough=0.45, metal=0.5), bevel=0.02, step=0.6)
    box(f"pil_flange_{x}", (0.42, WALL_H, 0.04), (x, WALL_H / 2, BACK + 0.23), M("steel", rough=0.45, metal=0.55), bevel=0.01, step=0.6)
    box(f"pil_base_{x}", (0.6, 0.05, 0.45), (x, 0.025, BACK + 0.24), M("steel_dk", rough=0.5, metal=0.6), bevel=0.01, step=0)
    hazard_strip(f"pil_haz_{x}", 0.0, 1.0, x, BACK + 0.36, depth=0.42, n=6, vertical=True)

# clerestory: deep window bays with mullions, sills and glowing panes (emissive, no shadows)
box("win_lintel", (2 * W2, 0.35, 0.36), (0, WIN_Y1 + 0.3, BACK + 0.18), M("wall", rough=0.85), bevel=0.015, step=0.5)
box("win_sill", (2 * W2, 0.12, 0.42), (0, WIN_Y0 - 0.08, BACK + 0.21), M("trim", rough=0.5), bevel=0.012, step=0.5)
for k, x in enumerate(WIN_X):
    plane(f"win_pane_{k}_noshadow", 1.5, WIN_Y1 - WIN_Y0, (x, (WIN_Y0 + WIN_Y1) / 2, BACK + 0.02),
          M("win_glass", color="#dff2ff", rough=0.3, emit="#e4f4ff", emit_strength=2.6), keep=False)
    for dx in (-0.78, 0.78):
        box(f"win_jamb_{k}_{dx}", (0.1, WIN_Y1 - WIN_Y0, 0.3), (x + dx, (WIN_Y0 + WIN_Y1) / 2, BACK + 0.15), M("steel_lt", rough=0.4, metal=0.5), bevel=0.01, step=0.6)
    box(f"win_mull_v_{k}", (0.05, WIN_Y1 - WIN_Y0, 0.08), (x, (WIN_Y0 + WIN_Y1) / 2, BACK + 0.06), M("steel_dk", rough=0.4, metal=0.6), bevel=0.006, step=0.6)
    for j in range(1, 4):
        box(f"win_mull_h_{k}_{j}", (1.5, 0.045, 0.08), (x, WIN_Y0 + j * (WIN_Y1 - WIN_Y0) / 4, BACK + 0.06), M("steel_dk"), bevel=0.006, step=0)
# wall between the windows
for k in range(len(WIN_X) + 1):
    x0 = -W2 if k == 0 else WIN_X[k - 1] + 0.83
    x1 = W2 if k == len(WIN_X) else WIN_X[k] - 0.83
    if x1 - x0 > 0.02:
        box(f"win_pier_{k}", (x1 - x0, WIN_Y1 - WIN_Y0, 0.3), ((x0 + x1) / 2, (WIN_Y0 + WIN_Y1) / 2, BACK + 0.15), M("wall", rough=0.85), bevel=0.01, step=0.6)
box("wall_top", (2 * W2, WALL_H - WIN_Y1 - 0.5, 0.1), (0, (WALL_H + WIN_Y1 + 0.5) / 2, BACK + 0.05), M("wall_dk", rough=0.9), bevel=0, step=0.8)
# roof trusses (dark silhouettes against the high wall)
for z in (-3.0, 0.0, 3.0):
    box(f"truss_chord_{z}", (2 * W2, 0.18, 0.14), (0, 11.6, z), M("steel_dk", rough=0.5, metal=0.6), bevel=0.01, step=0.8)
    box(f"truss_top_{z}", (2 * W2, 0.14, 0.14), (0, 12.6, z), M("steel_dk"), bevel=0.01, step=0.8)
    for k in range(16):
        x = -W2 + 0.5 + k * 1.0
        poly_tube(f"truss_lace_{z}_{k}", [(x, 11.6, z), (x + 0.5 * (1 if k % 2 else -1), 12.6, z)], 0.03, M("steel_dk"))

# ----------------------------------------------------------------------------- side walls (partially visible in 3/4 shots)
for sgn in (-1, 1):
    x = sgn * W2
    box(f"wall_side_{sgn}", (0.3, WALL_H, 12.0), (x + sgn * 0.15, WALL_H / 2, BACK + 6.0), M("wall_dk", rough=0.9), bevel=0, step=0.6)
    for j in range(7):
        for i in range(5):
            box(f"spanel_{sgn}_{j}_{i}", (0.04, 1.01, 1.56), (x - sgn * 0.02, 2.05 + i * 1.05, BACK + 0.8 + j * 1.6), M("wall", rough=0.86), bevel=0.01, step=0.4, segments=1)
    for j in range(15):
        box(f"swains_{sgn}_{j}", (0.05, 1.35, 0.79), (x - sgn * 0.025, 0.7, BACK + 0.4 + j * 0.8), M("wains", rough=0.5, metal=0.25), bevel=0.008, step=0.35, segments=1)
    box(f"scyan_{sgn}", (0.03, 0.09, 12.0), (x - sgn * 0.06, 1.43, BACK + 6.0), M("cyan"), bevel=0.006, step=0)
# big ventilation duct along the right wall, a roller door on the left wall
for k in range(6):
    cyl(f"duct_{k}", 0.42, 1.9, (W2 - 0.6, 8.4, BACK + 1.0 + k * 1.95), M("galv", rough=0.35, metal=0.8), seg=32, axis="z", bevel=0.01)
    torus(f"duct_ring_{k}", 0.43, 0.03, (W2 - 0.6, 8.4, BACK + 0.05 + k * 1.95), M("steel"), seg=32, minor=6, facing="z")
for k in range(3):
    poly_tube(f"duct_hanger_{k}", [(W2 - 0.6, 8.85, BACK + 2 + k * 3.5), (W2 - 0.6, 11.6, BACK + 2 + k * 3.5)], 0.015, M("steel_dk"))
for k in range(22):
    box(f"door_slat_{k}", (0.06, 0.16, 3.2), (-W2 + 0.07, 0.1 + k * 0.17, 2.0), M("steel_lt", rough=0.45, metal=0.5), bevel=0.01, step=0.6, segments=1)
for z in (0.35, 3.65):
    box(f"door_rail_{z}", (0.12, 3.9, 0.1), (-W2 + 0.08, 1.95, z), M("steel_dk"), bevel=0.01, step=0.6)
hazard_strip("door_haz", 0.4, 3.6, 0.003, -W2 + 0.5, depth=0.16, axis="z")

# ----------------------------------------------------------------------------- back catwalk, pipes, cable trays
box("cat_deck", (2 * W2 - 0.4, 0.06, 1.0), (0, CAT_Y, BACK + 0.55), M("galv", rough=0.45, metal=0.7), bevel=0.01, step=0.5)
box("cat_toe", (2 * W2 - 0.4, 0.12, 0.02), (0, CAT_Y + 0.09, BACK + 1.04), M("hazard", rough=0.55), bevel=0.004, step=0.5)
for k in range(14):
    x = -W2 + 0.6 + k * 1.15
    cyl(f"cat_post_{k}", 0.022, 1.05, (x, CAT_Y + 0.55, BACK + 1.02), M("steel", rough=0.4, metal=0.7), seg=8, bevel=0)
    poly_tube(f"cat_brace_{k}", [(x, CAT_Y - 0.02, BACK + 1.0), (x, CAT_Y - 0.9, BACK + 0.05)], 0.025, M("steel_dk"))
for y in (CAT_Y + 0.55, CAT_Y + 1.06):
    cyl(f"cat_rail_{y}", 0.025, 2 * W2 - 0.4, (0, y, BACK + 1.02), M("steel", rough=0.4, metal=0.7), seg=10, axis="x", bevel=0)
for k in range(30):                                       # grating bars seen from below
    box(f"cat_bar_{k}", (0.02, 0.05, 0.98), (-W2 + 0.4 + k * 0.52, CAT_Y - 0.05, BACK + 0.55), M("steel_dk"), bevel=0, step=0)
# pipe runs: three insulated/steel pipes with flanges, a cyan "vacuum line", drops to the floor
PIPES = [(4.45, 0.11, "steel_lt", BACK + 0.35), (4.85, 0.075, "cyan_dk", BACK + 0.32), (5.15, 0.06, "steel", BACK + 0.3)]
for k, (y, r_, mat, z) in enumerate(PIPES):
    cyl(f"pipe_{k}", r_, 2 * W2 - 0.2, (0, y, z), M(mat, rough=0.35, metal=0.6 if mat != "cyan_dk" else 0.2), seg=20, axis="x", bevel=0)
    for j in range(9):
        cyl(f"flange_{k}_{j}", r_ * 1.45, 0.05, (-7.0 + j * 1.75, y, z), M("steel_dk", rough=0.4, metal=0.7), seg=20, axis="x", bevel=0.005)
    for j in range(5):
        box(f"pipe_clamp_{k}_{j}", (0.05, 0.05, abs(z - BACK)), (-6.0 + j * 3.0, y, (z + BACK) / 2), M("steel_dk"), bevel=0, step=0)
for x, y, r_ in ((-5.6, 4.45, 0.11), (5.4, 4.85, 0.075)):
    cyl(f"pipe_drop_{x}", r_, y, (x, y / 2, BACK + 0.35), M("steel_lt", rough=0.35, metal=0.6), seg=20, bevel=0)
    torus(f"valve_{x}", 0.2, 0.025, (x, 1.7, BACK + 0.62), M("cyan", rough=0.45), seg=32, minor=8, facing="z")
    for j in range(4):
        a = j / 4 * math.pi
        box(f"valve_spoke_{x}_{j}", (0.38, 0.025, 0.025), (x, 1.7, BACK + 0.62), M("steel_dk"), bevel=0, step=0, rot=(0, 0, math.degrees(a)))
    cyl(f"valve_stem_{x}", 0.03, 0.27, (x, 1.7, BACK + 0.48), M("steel_dk"), seg=10, axis="z", bevel=0)
# ladder cable trays high on the back wall, cable bundles in them, and two trays crossing to the columns
def tray(name, pts, w=0.4):
    for a, b in zip(pts, pts[1:]):
        a_, b_ = np.array(a), np.array(b); m_ = (a_ + b_) / 2; L = np.linalg.norm(b_ - a_)
        horiz = abs(b_[1] - a_[1]) < 1e-6
        if horiz and abs(b_[2] - a_[2]) < 1e-6:     # along x
            for s in (-1, 1):
                box(f"{name}_rail_{a}_{s}", (L, 0.08, 0.02), (m_[0], m_[1] + 0.04, m_[2] + s * w / 2), M("galv", rough=0.4, metal=0.7), bevel=0.003, step=0.6)
            for k in range(int(L / 0.3)):
                box(f"{name}_rung_{a}_{k}", (0.025, 0.015, w), (min(a_[0], b_[0]) + 0.15 + k * 0.3, m_[1], m_[2]), M("galv"), bevel=0, step=0)
        elif horiz:                                 # along z
            for s in (-1, 1):
                box(f"{name}_rail_{a}_{s}", (0.02, 0.08, L), (m_[0] + s * w / 2, m_[1] + 0.04, m_[2]), M("galv", rough=0.4, metal=0.7), bevel=0.003, step=0.6)
            for k in range(int(L / 0.3)):
                box(f"{name}_rung_{a}_{k}", (w, 0.015, 0.025), (m_[0], m_[1], min(a_[2], b_[2]) + 0.15 + k * 0.3), M("galv"), bevel=0, step=0)
tray("tray_back", [(-7.8, 6.45, BACK + 0.4), (7.8, 6.45, BACK + 0.4)])
for k in range(6):
    zz = BACK + 0.28 + k * 0.05
    poly_tube(f"tray_back_cable_{k}", [(-7.8, 6.5 + (k % 2) * 0.03, zz), (7.8, 6.5 + (k % 2) * 0.03, zz)], 0.018,
              M(["cable", "cable_c", "cable", "cable_y", "cable", "cable"][k], rough=0.6))
for x in COL_X:
    tray(f"tray_col_{x}", [(x, 6.45, BACK + 0.6), (x, 6.45, -0.4)], w=0.3)
    poly_tube(f"tray_hanger_{x}", [(x - 0.15, 6.45, -1.0), (x - 0.15, 11.6, -1.0)], 0.012, M("steel_dk"))
    poly_tube(f"tray_hanger2_{x}", [(x + 0.15, 6.45, -1.0), (x + 0.15, 11.6, -1.0)], 0.012, M("steel_dk"))
    # the column's signal cables drop from the tray to its top cap (cap at y ~4.35)
    for k, dx in enumerate((-0.06, 0.0, 0.06)):
        tube(f"col_cable_{x}_{k}", [(x + dx, 6.47, -0.35 + k * 0.02), (x + dx * 2, 5.6, -0.15), (x + dx, 4.45, -0.02)], 0.016,
             M(["cable", "cable_c", "cable_y"][k], rough=0.6))
# overhead crane beam with a parked hoist (background silhouette)
box("crane_beam", (2 * W2 - 0.4, 0.42, 0.24), (0, 10.6, -1.8), M("hazard", rough=0.5), bevel=0.02, step=0.8)
box("crane_beam_web", (2 * W2 - 0.4, 0.06, 0.36), (0, 10.36, -1.8), M("steel_dk"), bevel=0.01, step=0.8)
box("hoist", (0.5, 0.45, 0.4), (-4.6, 10.05, -1.8), M("steel_dk", rough=0.45, metal=0.5), bevel=0.03, step=0)
poly_tube("hoist_chain", [(-4.6, 9.8, -1.8), (-4.6, 7.4, -1.8)], 0.012, M("iron", rough=0.4, metal=0.8))
torus("hoist_hook", 0.1, 0.022, (-4.6, 7.3, -1.8), M("hazard"), seg=24, minor=6, facing="z")
# high bay lamps (practicals, cool white) hanging between trusses
LAMPS = [(-4.5, 8.9, 1.2), (0.0, 8.9, 1.2), (4.5, 8.9, 1.2)]
for k, (x, y, z) in enumerate(LAMPS):
    poly_tube(f"lamp_cord_{k}", [(x, 11.6, z), (x, y + 0.25, z)], 0.01, M("cable"))
    S.cone_shell(f"lamp_hood_{k}", 0.38, 0.12, 0.28, (x, y + 0.1, z), M("steel_lt", rough=0.35, metal=0.6))
    cyl(f"lamp_lens_{k}_noshadow", 0.33, 0.02, (x, y - 0.04, z), M("lamp_lens", color="#eaf7ff", emit="#eaf7ff", emit_strength=3.0), seg=24, bevel=0, keep=True)

# ----------------------------------------------------------------------------- mezzanine (the drop platform)
# The deck wraps around the columns: the glass passes through round cut-outs, so the cast stands BESIDE the glass
# (not behind it) and reaches in through the side glove ports.
DZ = (DECK_Z0 + DECK_Z1) / 2; DD = DECK_Z1 - DECK_Z0
HOLE = 0.6
def front_spans(z):
    """x spans of the deck's front edge at depth z, skipping the column holes."""
    half = math.sqrt(max(0.0, HOLE ** 2 - z ** 2)) if abs(z) < HOLE else 0.0
    edges = [-DECK_X]
    for x in COL_X: edges += [x - half, x + half]
    edges.append(DECK_X)
    return [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]
# grating texture: dark grid on galvanised steel
grate = image("grate", 512, 512, lambda u, v: (lambda o: (paint(o, ((u * 32) % 1 < 0.16) | ((v * 32) % 1 < 0.16), "#5b646c"), o)[1])(fill(u, "#b4bcc3")))
deck = box("deck_plate", (2 * DECK_X, 0.05, DD), (0, DECK_Y - 0.025, DZ), M("deck_grate", rough=0.5, metal=0.5, image=grate), bevel=0, step=0.3)
for k, x in enumerate(COL_X):
    S.boolean_cut(deck, cyl(f"cut_hole_{k}", HOLE, 0.4, (x, DECK_Y, 0.0), None, seg=48, bevel=0))
    torus(f"hole_collar_{k}", HOLE + 0.02, 0.03, (x, DECK_Y + 0.005, 0.0), M("hazard", rough=0.55), seg=56, minor=6, facing="y")
for k, (x0, x1) in enumerate(front_spans(DECK_Z1)):
    if x1 - x0 < 0.05: continue
    m_ = (x0 + x1) / 2
    box(f"deck_fascia_{k}", (x1 - x0, 0.2, 0.06), (m_, DECK_Y - 0.12, DECK_Z1 - 0.02), M("steel_lt", rough=0.4, metal=0.5), bevel=0.01, step=0.4)
    hazard_strip(f"deck_haz_{k}", x0, x1, DECK_Y - 0.08, DECK_Z1 + 0.012, depth=0.012, h=0.07, w=0.14)
    box(f"deck_led_{k}_noshadow", (x1 - x0 - 0.06, 0.025, 0.02), (m_, DECK_Y - 0.2, DECK_Z1 + 0.015), M("led_cyan", color="#7ff0ff", emit="#58e6ff", emit_strength=4.0), bevel=0, step=0, keep=True)
    box(f"deck_beam_front_{k}", (x1 - x0, 0.22, 0.1), (m_, DECK_Y - 0.16, DECK_Z1 - 0.1), M("steel_dk", rough=0.45, metal=0.6), bevel=0.01, step=0.4)
for k in range(13):                                       # joists: only where they clear the holes
    x = -DECK_X + 0.1 + k * 0.415
    if min(abs(x - c) for c in COL_X) < HOLE + 0.05:
        z0, z1 = DECK_Z0 + 0.02, -HOLE - 0.03
    else:
        z0, z1 = DECK_Z0 + 0.02, DECK_Z1 - 0.12
    box(f"deck_joist_{k}", (0.06, 0.16, z1 - z0), (x, DECK_Y - 0.13, (z0 + z1) / 2), M("steel_dk", rough=0.45, metal=0.6), bevel=0.004, step=0)
box("deck_beam_back", (2 * DECK_X, 0.22, 0.12), (0, DECK_Y - 0.16, DECK_Z0 + 0.06), M("steel_dk"), bevel=0.01, step=0.4)
for x in (-DECK_X + 0.1, 0.0, DECK_X - 0.1):
    for z in (DECK_Z0 + 0.08, DECK_Z1 - 0.1):
        if x == 0.0 and z > -1.0: continue                # keep the gap between the columns clear
        box(f"deck_post_{x}_{z}", (0.12, DECK_Y - 0.05, 0.12), (x, (DECK_Y - 0.05) / 2, z), M("steel_lt", rough=0.4, metal=0.5), bevel=0.012, step=0.5)
        box(f"deck_post_foot_{x}_{z}", (0.24, 0.02, 0.24), (x, 0.01, z), M("steel_dk"), bevel=0.004, step=0)
for x0, x1 in ((-DECK_X + 0.1, -1.6), (1.6, DECK_X - 0.1)):
    poly_tube(f"deck_xbrace_{x0}", [(x0, 0.3, DECK_Z0 + 0.08), (x1, DECK_Y - 0.3, DECK_Z0 + 0.08)], 0.03, M("steel_dk"))
    poly_tube(f"deck_xbrace2_{x0}", [(x1, 0.3, DECK_Z0 + 0.08), (x0, DECK_Y - 0.3, DECK_Z0 + 0.08)], 0.03, M("steel_dk"))
# railing on the back and the right side (the front stays open: the cast reaches into the columns)
RAIL = M("rail", color="#d9dee2", rough=0.35, metal=0.6)
for k in range(9):
    x = -DECK_X + 0.08 + k * (2 * DECK_X - 0.16) / 8
    cyl(f"drail_post_{k}", 0.022, 1.0, (x, DECK_Y + 0.5, DECK_Z0 + 0.05), RAIL, seg=8, bevel=0)
for y in (DECK_Y + 0.5, DECK_Y + 1.0):
    cyl(f"drail_{y}", 0.024, 2 * DECK_X, (0, y, DECK_Z0 + 0.05), RAIL, seg=10, axis="x", bevel=0)
    cyl(f"drail_r_{y}", 0.024, DD, (DECK_X - 0.05, y, DZ), RAIL, seg=10, axis="z", bevel=0)
cyl("drail_r_post", 0.022, 1.0, (DECK_X - 0.05, DECK_Y + 0.5, DECK_Z1 - 0.05), RAIL, seg=8, bevel=0)
box("deck_kick", (2 * DECK_X, 0.1, 0.015), (0, DECK_Y + 0.05, DECK_Z0 + 0.03), M("hazard"), bevel=0.003, step=0.5)
for k, (x0, x1) in enumerate(front_spans(DECK_Z1)):          # low yellow toe board on the open front
    if x1 - x0 > 0.05:
        box(f"deck_toe_{k}", (x1 - x0, 0.06, 0.015), ((x0 + x1) / 2, DECK_Y + 0.03, DECK_Z1 - 0.01), M("hazard"), bevel=0.003, step=0.5)
# drop-port consoles on the deck behind each column: small panel with status lamps
for k, x in enumerate(COL_X):
    box(f"dp_stand_{k}", (0.05, 0.85, 0.05), (x, DECK_Y + 0.425, DECK_Z0 + 0.3), M("steel_dk"), bevel=0.006, step=0)
    box(f"dp_box_{k}", (0.24, 0.18, 0.1), (x, DECK_Y + 0.92, DECK_Z0 + 0.3), M("steel_lt", rough=0.4, metal=0.4), bevel=0.012, step=0, rot=(-15, 0, 0))
    sphere(f"dp_lamp_{k}_noshadow", 0.028, (x - 0.05, DECK_Y + 0.96, DECK_Z0 + 0.36), M("lamp_g", color="#7cffb0", emit="#59f59b", emit_strength=3.0), seg=12, keep=True)
    sphere(f"dp_lamp2_{k}_noshadow", 0.028, (x + 0.05, DECK_Y + 0.96, DECK_Z0 + 0.36), M("lamp_c", color="#8af2ff", emit="#58e6ff", emit_strength=3.0), seg=12, keep=True)
# stairs down to the floor on the left
N = 13; RISE = DECK_Y / N; RUN = 0.26
SX0 = -DECK_X
for k in range(N):
    x = SX0 - RUN * (k + 0.5); y = DECK_Y - RISE * (k + 1) + 0.02
    box(f"step_{k}", (RUN + 0.02, 0.04, 0.82), (x, y, DZ), M("deck_grate"), bevel=0.004, step=0)
    box(f"step_nose_{k}", (0.04, 0.042, 0.82), (x + RUN / 2 - 0.02, y + 0.001, DZ), M("hazard"), bevel=0.003, step=0)
for s in (-1, 1):
    z = DZ + s * 0.43
    poly_tube(f"stringer_{s}", [(SX0, DECK_Y - 0.05, z), (SX0 - RUN * N, 0.02, z)], 0.05, M("steel_dk"))
    poly_tube(f"handrail_{s}", [(SX0, DECK_Y + 0.95, z), (SX0 - RUN * N, 0.95, z)], 0.024, RAIL)
    for k in range(0, N + 1, 4):
        x = SX0 - RUN * k; y = DECK_Y - RISE * k
        cyl(f"stair_post_{s}_{k}", 0.02, 0.95, (x, y + 0.47, z), RAIL, seg=8, bevel=0)

# ----------------------------------------------------------------------------- hero dressing around the columns
# service boxes + pressure transducer at each column base, a hose loop from each base to the back wall manifold
for k, x in enumerate(COL_X):
    box(f"svc_box_{k}", (0.3, 0.42, 0.22), (x + (-0.82 if k == 0 else 0.82), 0.27, -0.45), M("steel_lt", rough=0.4, metal=0.4), bevel=0.02, step=0)
    box(f"svc_label_{k}", (0.2, 0.08, 0.005), (x + (-0.82 if k == 0 else 0.82), 0.38, -0.337), M("cyan"), bevel=0, step=0)
    tube(f"svc_conduit_{k}", [(x + (-0.82 if k == 0 else 0.82), 0.48, -0.45), (x + (-0.82 if k == 0 else 0.82), 1.0, -0.9),
                              (x + (-0.82 if k == 0 else 0.82), 1.2, BACK + 0.4), ], 0.03, M("cable"))
# manifold on the back wall behind the stage, joined to the cyan vacuum line
box("manifold", (1.4, 0.5, 0.25), (0, 1.0, BACK + 0.2), M("steel", rough=0.35, metal=0.7), bevel=0.02, step=0)
for k in range(4):
    cyl(f"manifold_port_{k}", 0.045, 0.12, (-0.5 + k * 0.33, 1.0, BACK + 0.38), M("steel_dk"), seg=14, axis="z", bevel=0.005)
poly_tube("manifold_riser", [(0.55, 1.25, BACK + 0.2), (0.55, 4.85, BACK + 0.32)], 0.06, M("cyan_dk", rough=0.4))

# ----------------------------------------------------------------------------- back corners: gas cylinders, cabinets, bench
for k in range(7):                                      # cylinder rack, back left
    x = -6.6 + k * 0.34
    cyl(f"gas_{k}", 0.13, 1.45, (x, 0.75, BACK + 0.45), M("gas", color="#b7c0c7", rough=0.35, metal=0.4), seg=20, bevel=0.02)
    sphere(f"gas_top_{k}", 0.13, (x, 1.47, BACK + 0.45), M("gas"), seg=16, scale=(1, 0.5, 1))
    cyl(f"gas_cap_{k}", 0.06, 0.12, (x, 1.6, BACK + 0.45), M("cyan" if k % 3 else "hazard", rough=0.45), seg=14, bevel=0.006)
for y in (0.7, 1.25):
    box(f"gas_chain_{y}", (2.5, 0.03, 0.03), (-5.6, y, BACK + 0.62), M("iron"), bevel=0, step=0)
box("gas_sign", (0.6, 0.35, 0.01), (-5.6, 2.15, BACK + 0.05), M("hazard"), bevel=0.003, step=0)
text("gas_sign_t", "GAS", 0.14, (-5.6, 2.14, BACK + 0.07), M("black"), extrude=0.003)
for k in range(4):                                      # electrical cabinets, back right
    x = 4.0 + k * 0.82
    box(f"cab_{k}", (0.78, 2.1, 0.55), (x, 1.05, BACK + 0.32), M("cab", color="#dfe3e7", rough=0.45, metal=0.2), bevel=0.02, step=0.4)
    box(f"cab_door_line_{k}", (0.006, 1.9, 0.006), (x, 1.05, BACK + 0.6), M("steel_dk"), bevel=0, step=0)
    for j in range(5):
        box(f"cab_vent_{k}_{j}", (0.3, 0.02, 0.006), (x - 0.18, 0.3 + j * 0.05, BACK + 0.6), M("steel_dk"), bevel=0, step=0)
    box(f"cab_handle_{k}", (0.03, 0.18, 0.03), (x + 0.04, 1.1, BACK + 0.62), M("iron"), bevel=0.004, step=0)
    plane(f"cab_leds_{k}_noshadow", 0.18, 0.05, (x - 0.2, 1.85, BACK + 0.6), M("led_cyan"), keep=False)
    box(f"cab_tag_{k}", (0.2, 0.1, 0.004), (x - 0.2, 1.62, BACK + 0.6), M("hazard" if k == 2 else "paper"), bevel=0, step=0)
cyl("cab_conduit", 0.05, 4.3, (5.25, 4.25, BACK + 0.15), M("galv"), seg=12, bevel=0)
# workbench with a toolbox and a coil of hose, back right (midground)
WB = (5.4, -1.6)
box("wb_top", (1.8, 0.06, 0.7), (WB[0], 0.9, WB[1]), M("wood", rough=0.55), bevel=0.012, step=0.3)
for dx in (-0.85, 0.85):
    for dz in (-0.3, 0.3):
        box(f"wb_leg_{dx}_{dz}", (0.05, 0.87, 0.05), (WB[0] + dx, 0.435, WB[1] + dz), M("steel_dk"), bevel=0.006, step=0)
box("wb_shelf", (1.75, 0.03, 0.62), (WB[0], 0.25, WB[1]), M("steel_lt", rough=0.45, metal=0.4), bevel=0.006, step=0)
box("toolbox", (0.5, 0.24, 0.26), (WB[0] - 0.4, 1.05, WB[1]), M("cyan", rough=0.45), bevel=0.02, step=0)
box("toolbox_lid", (0.52, 0.04, 0.28), (WB[0] - 0.4, 1.19, WB[1]), M("cyan_dk", rough=0.45), bevel=0.01, step=0)
torus("hose_coil", 0.22, 0.03, (WB[0] + 0.4, 0.96, WB[1]), M("rubber", rough=0.6), seg=32, minor=8, facing="y")
torus("hose_coil2", 0.17, 0.03, (WB[0] + 0.4, 1.02, WB[1]), M("rubber"), seg=32, minor=8, facing="y")
box("pegboard", (1.8, 1.0, 0.03), (WB[0], 1.75, BACK + 0.06), M("paper", rough=0.8), bevel=0.006, step=0)
for k in range(8):
    box(f"peg_tool_{k}", (0.04, R.uniform(0.18, 0.35), 0.02), (WB[0] - 0.75 + k * 0.21, 1.78, BACK + 0.09), M(R.choice(["steel_dk", "cyan", "hazard", "steel"])), bevel=0.004, step=0)
# wall posters (original): a falling-objects diagram and a "pressure" chart
def poster_img(name, fn): return image(name, 256, 360, fn)
def _p1(u, v):
    o = fill(u, "#f4f6f8"); paint(o, v > 0.86, "#3cc8dc")
    for cx in (0.3, 0.7):
        paint(o, (np.abs(u - cx) < 0.012) & (v > 0.12) & (v < 0.8), "#56606a")
        for j in range(5):
            cy = 0.75 - j * 0.14 * (1 if cx < 0.5 else 0.25) - (0 if cx < 0.5 else j * 0.1)
            paint(o, (u - cx) ** 2 + ((v - cy) * 0.7) ** 2 < 0.0012, "#f2c230")
    paint(o, (v < 0.12) & (v > 0.1), "#56606a")
    return o
def _p2(u, v):
    o = fill(u, "#eef1f3"); paint(o, v > 0.86, "#25292e")
    curve = 0.75 * np.exp(-3 * u) + 0.08
    paint(o, (np.abs(v - curve) < 0.012) & (u > 0.08) & (u < 0.92), "#3cc8dc")
    paint(o, ((u - 0.08) < 0.008) & (u > 0.07) & (v < 0.84) & (v > 0.06), "#56606a")
    paint(o, (np.abs(v - 0.06) < 0.004) & (u > 0.07) & (u < 0.94), "#56606a")
    return o
for k, (fn, x) in enumerate(((_p1, -2.2), (_p2, 2.25))):
    plane(f"poster_{k}", 0.62, 0.86, (x, 2.0, BACK + 0.06), M(f"poster_{k}", rough=0.8, image=poster_img(f"poster_img_{k}", fn)))
text("sign_hall", "TEST HALL 2", 0.36, (-4.9, 3.6, BACK + 0.06), M("steel_dk", rough=0.5), extrude=0.02)
text("sign_hall_sub", "VACUUM  ·  DROP  ·  PRESSURE", 0.13, (-4.9, 3.25, BACK + 0.06), M("cyan_dk", rough=0.5), extrude=0.01)
# low pressure warning decal next to the manifold
box("warn_plate", (0.5, 0.32, 0.008), (1.15, 1.05, BACK + 0.05), M("hazard"), bevel=0.003, step=0)
text("warn_t", "LOW P", 0.11, (1.15, 1.05, BACK + 0.06), M("black"), extrude=0.003)

# ----------------------------------------------------------------------------- floor props: Miyu's bench, crates, cart
BX, BZ = -2.0, 2.15                               # Miyu's bench (low seat for the chibi sit clip)
box("bench_seat", (1.0, 0.05, 0.38), (BX, 0.205, BZ), M("wood", rough=0.55), bevel=0.012, step=0.25)
box("bench_cushion", (0.5, 0.04, 0.32), (BX + 0.2, 0.25, BZ), M("cushion", rough=0.85), bevel=0.018, step=0)
for dx in (-0.42, 0.42):
    box(f"bench_leg_{dx}", (0.06, 0.18, 0.32), (BX + dx, 0.09, BZ), M("steel_dk"), bevel=0.006, step=0)
box("bench_mug", (0.07, 0.09, 0.07), (BX - 0.35, 0.275, BZ + 0.05), M("cyan", rough=0.4), bevel=0.02, step=0)
# crates + pallet (left, midground) and a cart (right, behind the console)
box("pallet", (1.1, 0.12, 0.9), (-4.5, 0.06, -0.4), M("wood", rough=0.7), bevel=0.008, step=0.3)
box("crate_1", (0.7, 0.55, 0.6), (-4.65, 0.4, -0.45), M("crate", color="#c7cdd3", rough=0.6), bevel=0.02, step=0.3)
box("crate_2", (0.45, 0.4, 0.45), (-4.2, 0.32, -0.3), M("cyan", rough=0.5), bevel=0.02, step=0)
box("crate_2b", (0.4, 0.3, 0.4), (-4.6, 0.82, -0.45), M("crate"), bevel=0.02, step=0, rot_y=14)
hazard_strip("crate_haz", -4.95, -4.35, 0.5, -0.14, depth=0.008, h=0.05, w=0.1)
CX, CZ = 4.3, 0.6
box("cart_top", (0.9, 0.05, 0.55), (CX, 0.85, CZ), M("steel", rough=0.42, metal=0.7), bevel=0.01, step=0)
box("cart_shelf", (0.9, 0.04, 0.55), (CX, 0.3, CZ), M("steel", rough=0.42, metal=0.7), bevel=0.01, step=0)
for dx in (-1, 1):
    for dz in (-1, 1):
        cyl(f"cart_post_{dx}_{dz}", 0.018, 0.82, (CX + dx * 0.42, 0.46, CZ + dz * 0.25), M("steel_dk"), seg=10, bevel=0)
        cyl(f"cart_wheel_{dx}_{dz}", 0.045, 0.03, (CX + dx * 0.4, 0.045, CZ + dz * 0.23), M("rubber", rough=0.6), seg=12, axis="x", bevel=0)
for k in range(3):                                      # spare glass bell jars on the cart
    cyl(f"jar_{k}", 0.1, 0.22, (CX - 0.28 + k * 0.28, 0.99, CZ), M("jar", color="#d8f3f7", rough=0.1, alpha=0.45), seg=20, bevel=0)
    cyl(f"jar_lid_{k}", 0.105, 0.03, (CX - 0.28 + k * 0.28, 1.11, CZ), M("steel_lt", rough=0.3, metal=0.8), seg=20, bevel=0.004)

# ----------------------------------------------------------------------------- foreground: railing with a gauge board
FZ = 4.3
def _gauge(u, v):
    x = u - 0.5; y = v - 0.5; r = np.hypot(x, y); a = np.arctan2(y, x)
    o = fill(u, "#25292e"); paint(o, r < 0.46, "#f6f8f9")
    ang = (a + 2 * np.pi) % (2 * np.pi)
    ticks = (np.abs(((ang - 1.25 * np.pi) * 20 / np.pi) % 1 - 0.5) > 0.44) & (r > 0.36) & (r < 0.43)
    sweep = ~((ang > 1.25 * np.pi) & (ang < 1.75 * np.pi))
    paint(o, ticks & sweep, "#25292e")
    paint(o, (r > 0.36) & (r < 0.43) & (ang > 1.75 * np.pi) & (ang < 1.95 * np.pi), "#3cc8dc")
    paint(o, (np.abs(x * np.cos(0.6) - y * np.sin(0.6)) < 0.012) & (x * np.sin(0.6) + y * np.cos(0.6) > -0.02) & (r < 0.34), "#d9453a")
    paint(o, r < 0.035, "#25292e")
    return o
GAUGE = image("gauge_face", 256, 256, _gauge)
for seg_, (x0, x1) in enumerate(((-3.6, -1.1), (1.3, 3.8))):
    for k in range(4):
        x = x0 + k * (x1 - x0) / 3
        cyl(f"fg_post_{seg_}_{k}", 0.03, 1.1, (x, 0.55, FZ), RAIL, seg=10, bevel=0)
        cyl(f"fg_foot_{seg_}_{k}", 0.08, 0.02, (x, 0.01, FZ), M("steel_dk"), seg=12, bevel=0)
    for y in (0.55, 1.1):
        cyl(f"fg_rail_{seg_}_{y}", 0.032, x1 - x0, ((x0 + x1) / 2, y, FZ), RAIL, seg=12, axis="x", bevel=0)
    box(f"fg_kick_{seg_}", (x1 - x0, 0.1, 0.012), ((x0 + x1) / 2, 0.06, FZ), M("hazard"), bevel=0.003, step=0)
# gauge board on the left section: two dials, a valve, a pipe stub
box("fg_board", (0.62, 0.42, 0.04), (-2.3, 0.86, FZ + 0.06), M("steel_lt", rough=0.4, metal=0.5), bevel=0.012, step=0)
for k, dx in enumerate((-0.15, 0.15)):
    cyl(f"fg_gauge_rim_{k}", 0.12, 0.05, (-2.3 + dx, 0.88, FZ + 0.1), M("steel", rough=0.3, metal=0.8), seg=32, axis="z", bevel=0.008)
    plane(f"fg_gauge_face_{k}", 0.2, 0.2, (-2.3 + dx, 0.88, FZ + 0.127), M("gauge_face", rough=0.4, image=GAUGE))
torus("fg_valve", 0.07, 0.014, (-2.3, 0.7, FZ + 0.11), M("cyan"), seg=24, minor=6, facing="z")
poly_tube("fg_pipe", [(-2.3, 0.66, FZ + 0.08), (-2.3, 0.0, FZ + 0.08)], 0.025, M("steel_lt", rough=0.35, metal=0.6))

tris = S.finish(ao_tint="#7f8fa0")
assert tris < 300_000, f"over budget: {tris} tris"
