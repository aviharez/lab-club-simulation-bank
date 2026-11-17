// Layout numbers of the probability-arcade set (plain .ts so node scripts / reports can import it).
// Shared with assets/sets/probability-arcade/build_probability_arcade.py (three.js coordinates, metres). Keep both in sync.
//
// The Galton machine: ROWS rows of brass pegs on a triangular grid (pitch PITCH across, ROW_DY down), 13 bins below.
// Row i (0 = top) has i + 1 pegs at x = (j - i / 2) · PITCH. A ball with r rights after row i sits above x = (r - i/2) · PITCH,
// so after 12 rows bin k (0..12) is centred at x = (k - 6) · PITCH. Balls run in one layer between the back board and
// the glass (z = ballZ).
import type { Vec3 } from "../../kit/env";

const ROWS = 12;
const PITCH = 0.17;
const ROW_DY = 0.147;
const BIN_Y0 = 0.7;
const BIN_H = 1.0;
const PEG_Y_LAST = 1.85;
const GLASS_Z = -1.0;
const BALL_R = 0.013;

export const ARCADE = {
  /** room box */
  room: { left: -6.5, right: 6.5, back: -4.4, front: 7.5, ceil: 5.6 },
  /** the machine (centre x = 0) */
  machine: {
    rows: ROWS,
    bins: ROWS + 1,
    pitch: PITCH,
    rowDy: ROW_DY,
    /** front glass plane (z); the back board sits 2.6 ball radii behind it */
    glassZ: GLASS_Z,
    backZ: GLASS_Z - 2.6 * BALL_R,
    ballZ: GLASS_Z - 1.3 * BALL_R,
    ballR: BALL_R,
    pegR: 0.012,
    /** y of peg row i */
    pegY: (i: number) => PEG_Y_LAST + (ROWS - 1 - i) * ROW_DY,
    pegX: (i: number, j: number) => (j - i / 2) * PITCH,
    /** bins: floor, wall height, centre x of bin k, divider thickness */
    binY0: BIN_Y0,
    binH: BIN_H,
    binX: (k: number) => (k - ROWS / 2) * PITCH,
    divider: 0.008,
    /** inner half-width of the board (outer bin walls) */
    halfW: ((ROWS + 1) / 2) * PITCH,
    /** funnel: mouth (top) and neck (bottom) half-widths and heights; the neck releases balls at x = 0 */
    funnel: { mouthY: 4.02, mouthHalf: 0.36, neckY: 3.6, neckHalf: 0.035 },
    /** top rail of the frame (the walkway Miyu stands on sits on it) */
    topY: 3.62,
    /** ornate frame: outer half-width, top of the crest, plinth height */
    frameHalf: ((ROWS + 1) / 2) * PITCH + 0.2,
    crestY: 4.75,
    /** cabinet depth: back face (z) and the brass bezel in front of the glass */
    caseBack: GLASS_Z - 0.38,
    bezelZ: GLASS_Z + 0.05,
    plinthY: 0.62,
    /** bin label plaques (y) */
    labelY: 0.5,
  },
  /** Miyu's walkway on the top rail, stage right of the funnel (centre of the deck at feet height; size x, z) */
  platform: { pos: [0.86, 3.64, -1.02] as Vec3, size: [0.86, 0.62] as [number, number] },
  /** the cast's floor marks in front of the machine */
  marks: {
    anna: [-0.8, 0, 0.3] as Vec3,
    lumi: [-0.2, 0, 0.72] as Vec3,
    zuzu: [0.62, 0, 0.3] as Vec3,
  },
  /** pendant lamps (bulb positions) */
  pendants: [
    [-1.9, 4.0, 0.9],
    [1.9, 4.0, 0.9],
    [-4.3, 3.6, -2.2],
    [4.3, 3.6, -2.2],
  ] as Vec3[],
  /** foreground arcade cabinets in the aisle near the wide camera: they frame its bottom corners (feet centre, yaw) */
  cabinetsFG: [
    { pos: [-1.02, 0, 5.0] as Vec3, rotY: 0.85 },
    { pos: [1.05, 0, 5.15] as Vec3, rotY: -0.85 },
  ],
  /** midground cabinets along the side walls */
  cabinetsSide: [
    { pos: [-5.7, 0, -2.6] as Vec3, rotY: Math.PI / 2 },
    { pos: [-5.7, 0, -1.4] as Vec3, rotY: Math.PI / 2 },
    { pos: [-5.7, 0, -0.2] as Vec3, rotY: Math.PI / 2 },
    { pos: [5.7, 0, -0.4] as Vec3, rotY: -Math.PI / 2 },
  ],
};

/** Bet tags hang from a brass hook under the bin's number plaque (clip point y, z in front of the plinth panels, scale). */
export const TAG = { clipY: ARCADE.machine.labelY - 0.07, z: ARCADE.machine.bezelZ + 0.12, scale: 1.45, /** card bottom below the clip at scale 1 */ drop: 0.185 };

/** Bins hold balls in a hex stack: rows of 6 and 5 alternating (11 per row pair). */
export const STACK = { wide: 6, narrow: 5, rowH: 2 * BALL_R * 0.866 };

/** Centre of the ball in bin k, stacking slot s (0 = first to land). */
export const stackPos = (k: number, s: number): Vec3 => {
  const M = ARCADE.machine;
  const pair = Math.floor(s / 11);
  const q = s % 11;
  const wide = q < STACK.wide;
  const row = pair * 2 + (wide ? 0 : 1);
  const col = wide ? q : q - STACK.wide;
  const n = wide ? STACK.wide : STACK.narrow;
  // fill each row from the middle outward so a half-filled top row looks heaped, not left-aligned
  const order = [2, 3, 1, 4, 0, 5].filter((c) => c < n);
  const c = order[col];
  return [M.binX(k) + (c - (n - 1) / 2) * 2 * BALL_R * 1.02, M.binY0 + BALL_R + row * STACK.rowH, M.ballZ];
};
/** Stack height in metres for n balls (top of the highest ball). */
export const stackHeight = (n: number) => (n <= 0 ? 0 : stackPos(0, n - 1)[1] + BALL_R - ARCADE.machine.binY0);
/** Height per ball, averaged (the bell-curve overlay maps expected counts with this). */
export const HEIGHT_PER_BALL = STACK.rowH / 5.5;

/** Where a ball touches the top of peg row i after r rights. */
export const contactPoint = (i: number, r: number): Vec3 => {
  const M = ARCADE.machine;
  return [(r - i / 2) * M.pitch, M.pegY(i) + M.pegR + M.ballR, M.ballZ];
};

/** Number of path segments: neck → row 0, row 0 → row 1 … row 10 → row 11, row 11 → its stack slot. */
export const PATH_SEGMENTS = ARCADE.machine.rows + 1;

/** Share of the last segment spent hopping off the bottom peg to the bin centre (the rest is the fall into the bin). */
export const LAST_HOP = 0.3;

/**
 * A ball's position along its computed path, u ∈ [0, PATH_SEGMENTS] (no free physics: the steps come from the data).
 * Segment 0 drops from the funnel neck onto the top peg; segments 1..11 are hops from peg to peg (constant sideways
 * speed, a small bounce-up then fall: a parabola through both contacts). The last segment hops off the bottom peg to
 * the centre of its bin (like any other bounce, so it clears the peg and the divider under it), then falls, drifting to
 * its stacking column in the upper part of the fall so it never crosses the balls already stacked.
 */
export const ballPath = (steps: readonly (0 | 1)[], slot: Vec3, u: number): Vec3 => {
  const M = ARCADE.machine;
  const s = Math.max(0, Math.min(PATH_SEGMENTS, u));
  const seg = Math.min(PATH_SEGMENTS - 1, Math.floor(s));
  const t = s - seg;
  if (seg === 0) {
    const c = contactPoint(0, 0);
    const y0 = M.funnel.neckY;
    return [0, y0 + (c[1] - y0) * t * t, M.ballZ];
  }
  let r = 0;
  for (let i = 0; i < seg - 1; i++) r += steps[i];
  const a = contactPoint(seg - 1, r);
  const hopTo = (b: Vec3, tt: number, hop: number): Vec3 => {
    const dy = b[1] - a[1];
    return [a[0] + (b[0] - a[0]) * tt, a[1] + hop * tt + (dy - hop) * tt * tt, M.ballZ];
  };
  if (seg < PATH_SEGMENTS - 1) return hopTo(contactPoint(seg, r + steps[seg - 1]), t, 0.05);
  // last segment: hop to the bin centre one row below the last peg, then fall to the slot
  const k = r + steps[seg - 1];
  const w: Vec3 = [M.binX(k), contactPoint(seg - 1, 0)[1] - M.rowDy, M.ballZ];
  if (t <= LAST_HOP) return hopTo(w, t / LAST_HOP, 0.05);
  const f = (t - LAST_HOP) / (1 - LAST_HOP);
  const drift = Math.min(1, f / 0.6);
  const e = drift * drift * (3 - 2 * drift);
  return [w[0] + (slot[0] - w[0]) * e, w[1] + (slot[1] - w[1]) * f * f, M.ballZ];
};

/**
 * Height of the bell-curve overlay over the bins for an expected count n, on the same scale as the ball stacks:
 * a stack of n balls fills n/5.5 rows on average, plus one ball diameter less one row step (the bottom and top half-balls).
 * Real stacks are whole balls, so they differ from this by less than one row.
 */
export const overlayHeight = (n: number) => (n <= 0 ? 0 : n * HEIGHT_PER_BALL + 2 * BALL_R - STACK.rowH);
