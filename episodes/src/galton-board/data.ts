// DATA FIRST (EP05 "Galton Board"): every number the episode shows comes from this seeded simulation.
// The report (npm run report:galton-board) prints it and checks it against the episode prompt.
//
// The board: ROWS rows of pegs, BINS = ROWS + 1 bins. Each ball hits one peg per row and goes left or right with
// p = 0.5 (one seeded draw per peg). Its bin is the number of rights (0 = far left .. 12 = far right).
// Balls do not collide: each one follows its own coin-flip path (labelled on screen), the picture animates exactly
// these paths (smooth arcs between pegs, no free physics) and stacks every ball into its bin in landing order.
import { seeded } from "../kit/random.ts";

/** Cast in screen order, left → right (Anna at the far-left bin, Lumi with her clipboard, Zuzu at the centre bin,
 * Miyu up on the pouring platform). */
export const ORDER = ["anna", "lumi", "zuzu", "miyu"] as const;
export type Member = (typeof ORDER)[number];

export const BALLS = 1000;
export const ROWS = 12;
export const BINS = ROWS + 1;
/** chance of bouncing right at each peg */
export const P_RIGHT = 0.5;

/** One fixed seed for the whole pour (chosen once, never tuned to the counts; see SEED_NOTE). */
export const SEED = 5005;
export const SEED_NOTE = "fixed seed 5005 (one draw per peg, 12 per ball, balls in pour order)";

/** The bets: Anna takes the far-left bin ("nobody picks it, so it's mine"), Zuzu the centre bin. */
export const BET = { anna: 0, zuzu: 6 } as const;

export type Ball = {
  /** 0-based pour order */
  i: number;
  /** ROWS bounces: 0 = left, 1 = right */
  steps: (0 | 1)[];
  /** landing bin = number of rights */
  bin: number;
  /** stacking slot inside its bin = how many earlier balls landed there */
  slot: number;
};

/** Pour all BALLS balls (pure, uncached). */
export const simulate = (): Ball[] => {
  const r = seeded(SEED);
  const filled = new Array<number>(BINS).fill(0);
  return Array.from({ length: BALLS }, (_, i) => {
    const steps = Array.from({ length: ROWS }, () => (r() < P_RIGHT ? 1 : 0)) as (0 | 1)[];
    const bin = steps.reduce<number>((s, x) => s + x, 0);
    const slot = filled[bin]++;
    return { i, steps, bin, slot };
  });
};
let cache: Ball[] | undefined;
/** All balls in pour order (cached simulate()). */
export const balls = (): Ball[] => (cache ??= simulate());

/** Count per bin after the first n balls have landed (n = 0..BALLS). */
const cumCache: number[][] = [];
const cumulative = () => {
  if (cumCache.length) return cumCache;
  let row = new Array<number>(BINS).fill(0);
  cumCache.push(row);
  for (const b of balls()) {
    row = row.slice();
    row[b.bin]++;
    cumCache.push(row);
  }
  return cumCache;
};
export const countsAfter = (n: number): number[] => cumulative()[Math.max(0, Math.min(BALLS, Math.floor(n)))];
/** Final counts per bin (ACTUAL, shown on screen). */
export const counts = () => countsAfter(BALLS);

/** Binomial coefficient C(n, k) (exact for n ≤ 12). */
export const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let j = 1; j <= k; j++) c = (c * (n - k + j)) / j;
  return Math.round(c);
};
/** Theory: P(bin k) = C(12, k) / 2^12. */
export const theoryP = (k: number) => choose(ROWS, k) / 2 ** ROWS;
/** Theory: expected balls in bin k after n balls. */
export const theoryCount = (k: number, n = BALLS) => n * theoryP(k);

/** Normal approximation the bell-curve overlay draws: mean 6, sd sqrt(12 · 0.5 · 0.5) = sqrt 3, scaled to n balls
 * per bin (a smooth curve through the binomial bars). */
export const MEAN = ROWS * P_RIGHT;
export const SD = Math.sqrt(ROWS * P_RIGHT * (1 - P_RIGHT));
export const normalCount = (x: number, n = BALLS) => (n / (SD * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - MEAN) ** 2) / (2 * SD * SD));

/** The rounding rules for on-screen numbers in this episode. */
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
export const int = (x: number) => Math.round(x).toLocaleString("en-US");
/** "1 in 4,096" style odds. */
export const odds = (p: number) => `1 in ${Math.round(1 / p).toLocaleString("en-US")}`;
