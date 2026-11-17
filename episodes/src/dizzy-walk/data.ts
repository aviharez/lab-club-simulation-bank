// DATA FIRST (EP06 "Zuzu's Dizzy Walk"): every number the episode shows comes from these seeded walks.
// The report (npm run report:dizzy-walk) prints them and checks them against the episode prompt.
//
// The walk: a 2D lattice random walk on the plaza tiles. Each step moves exactly one tile east, north, west or south
// with probability 1/4 each (one seeded draw per step). Zuzu walks one seeded walk; the 50 "ghost Zuzus" of the twist
// each walk their own seed. Lumi walks 100 tiles straight north. Distances are straight-line (Euclidean) distances
// from the start tile centre, in tiles. Theory: every step is an independent unit vector with zero mean, so
// E[R²] = n exactly and the RMS distance after n steps is √n (10 tiles after 100 steps).
import { seeded } from "../kit/random.ts";

/** Cast in screen order, left → right, at the start marker. */
export const ORDER = ["miyu", "anna", "zuzu", "lumi"] as const;
export type Member = (typeof ORDER)[number];

export const STEPS = 100;
export const GHOSTS = 50;

/** Seeds are fixed once and never tuned to the outcome. */
export const ZUZU_SEED = 6006;
/** ghost k walks seed GHOST_SEED0 + k (k = 0..49) */
export const GHOST_SEED0 = 6100;
export const SEED_NOTE = `Zuzu seed ${ZUZU_SEED}; ghosts seeds ${GHOST_SEED0}..${GHOST_SEED0 + GHOSTS - 1} (one draw per step)`;

/** Tile coordinates: x = east (+x on screen right), y = north (away from the camera, three.js −z). */
export type Tile = [number, number];
/** E, N, W, S */
export const DIRS: Tile[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
export const DIR_NAMES = ["E", "N", "W", "S"] as const;

export type Walk = {
  seed: number;
  /** direction index per step (0..3), STEPS entries */
  dirs: number[];
  /** tile after n steps, n = 0..STEPS (pos[0] = start) */
  pos: Tile[];
};

/** One lattice walk (pure). */
export const walk = (seed: number, steps = STEPS): Walk => {
  const r = seeded(seed);
  const dirs = Array.from({ length: steps }, () => Math.floor(r() * 4));
  const pos: Tile[] = [[0, 0]];
  for (const d of dirs) {
    const [x, y] = pos[pos.length - 1];
    pos.push([x + DIRS[d][0], y + DIRS[d][1]]);
  }
  return { seed, dirs, pos };
};

let zuzuCache: Walk | undefined;
let ghostCache: Walk[] | undefined;
export const zuzu = (): Walk => (zuzuCache ??= walk(ZUZU_SEED));
export const ghosts = (): Walk[] => (ghostCache ??= Array.from({ length: GHOSTS }, (_, k) => walk(GHOST_SEED0 + k)));

/** Lumi walks her own lane, tile column LUMI_LANE (two tiles east of the start, so she never shares a tile with
 * Zuzu), from her start line (LUMI_LANE, 0) straight north, one tile per step. */
export const LUMI_LANE = 2;
export const LUMI_START: Tile = [LUMI_LANE, 0];
export const lumiAt = (n: number): Tile => [LUMI_LANE, n];
/** Lumi's distance from her own start after n steps (exactly n). */
export const lumiDist = (n: number) => dist([lumiAt(n)[0] - LUMI_START[0], lumiAt(n)[1] - LUMI_START[1]]);

/** Straight-line distance from the start (tiles). */
export const dist = (p: Tile) => Math.hypot(p[0], p[1]);
/** Squared distance (an integer on the lattice). */
export const dist2 = (p: Tile) => p[0] * p[0] + p[1] * p[1];

/** Zuzu's distance after n steps. */
export const zuzuDist = (n: number) => dist(zuzu().pos[n]);
/** The ghosts' RMS distance after n steps: √(mean of R²) over the 50 walks. */
export const ghostRms = (n: number) => Math.sqrt(ghosts().reduce((s, g) => s + dist2(g.pos[n]), 0) / GHOSTS);
/** The ghosts' plain mean distance after n steps (report only: theory ≈ √(πn/4)). */
export const ghostMean = (n: number) => ghosts().reduce((s, g) => s + dist(g.pos[n]), 0) / GHOSTS;
/** Theory: RMS distance √n. */
export const theoryRms = (n: number) => Math.sqrt(n);

/** Final values (shown on screen). */
export const FINAL = {
  lumi: () => lumiDist(STEPS),
  zuzu: () => zuzuDist(STEPS),
  ghosts: () => ghostRms(STEPS),
  theory: theoryRms(STEPS),
};

/** Steps where Zuzu turns straight back onto the tile she just left (the "oops" moments). */
export const reversals = (w: Walk = zuzu()) => w.dirs.flatMap((d, i) => (i > 0 && (d + 2) % 4 === w.dirs[i - 1] ? [i + 1] : []));

/** Ghosts inside the √n circle after n steps (report + badge). */
export const insideCircle = (n: number) => ghosts().filter((g) => dist(g.pos[n]) <= theoryRms(n) + 1e-9).length;

/** The rounding rules for on-screen numbers in this episode: distances in tiles, 1 decimal. */
export const tiles = (x: number) => x.toFixed(1);
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

/** Tile position along a walk at a fractional step s (straight between tile centres, one tile per step). */
export const tileAt = (pos: Tile[], s: number): [number, number] => {
  const c = Math.max(0, Math.min(pos.length - 1, s));
  const k = Math.min(pos.length - 2, Math.floor(c));
  const u = c - k;
  return [pos[k][0] + (pos[k + 1][0] - pos[k][0]) * u, pos[k][1] + (pos[k + 1][1] - pos[k][1]) * u];
};
/** A per-step series drawn as straight lines between the whole steps (the panel's curves). */
export const between = (fn: (n: number) => number, s: number) => {
  const c = Math.max(0, Math.min(STEPS, s));
  const k = Math.min(STEPS - 1, Math.floor(c));
  return fn(k) + (fn(k + 1) - fn(k)) * (c - k);
};
