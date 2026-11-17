// What the machine shows at frame f: every ball's position (computed path or its stack slot), the highlighted
// trails, the ball counter, the bell-curve overlay and the path fans of the twist. Pure functions of the frame
// (plain .ts so the report checks exactly what the picture draws).
import { ARCADE, ballPath, overlayHeight, PATH_SEGMENTS, stackHeight, stackPos } from "../sets/probability-arcade/layout.ts";
import { balls, BET, choose, counts, normalCount, ROWS } from "./data.ts";
import { ANNA_BALL, BEAT, CURVE, FLIGHTS, HIGHLIGHT, landedAt, PATHS, SLOW_BALLS } from "./timeline.ts";

type V3 = [number, number, number];
const M = ARCADE.machine;

export type BallState = { pos: V3; hi?: number; tint?: { color: string; k: number }; glow?: number };
export type TrailState = { points: V3[]; progress: number; color: string; opacity: number; width?: number };

/** Path progress u ∈ [0, PATH_SEGMENTS] of ball i at frame f (null before it leaves the neck). */
export const progressOf = (i: number, f: number): number | null => {
  const F = FLIGHTS()[i];
  if (f < F.launch) return null;
  return Math.min(PATH_SEGMENTS, ((f - F.launch) / F.dur) * PATH_SEGMENTS);
};

const fadeAfter = (f: number, at: number, len: number) => Math.max(0, Math.min(1, 1 - (f - at) / len));

/** Every ball drawn at frame f (in pour order; a ball is drawn once it leaves the funnel neck). */
export const ballsAt = (f: number): BallState[] => {
  const all = balls();
  const F = FLIGHTS();
  const out: BallState[] = [];
  for (let i = 0; i < all.length; i++) {
    if (F[i].launch > f) break; // launches are in pour order
    const b = all[i];
    const slot = stackPos(b.bin, b.slot);
    const landed = f >= F[i].land;
    const pos = landed ? slot : ballPath(b.steps, slot, progressOf(i, f)!);
    const s: BallState = { pos };
    if (i < SLOW_BALLS) {
      s.hi = landed ? fadeAfter(f, F[i].land, HIGHLIGHT.fade) : 1;
      if (landed) s.glow = fadeAfter(f, F[i].land, 8);
    }
    if (i === ANNA_BALL) {
      s.tint = { color: HIGHLIGHT.annaColor, k: 1 };
      if (landed) s.glow = fadeAfter(f, F[i].land, 12);
    }
    out.push(s);
  }
  return out;
};

const SAMPLES = 90;
const pathPoints = (steps: readonly (0 | 1)[], end: V3, n = SAMPLES): V3[] => Array.from({ length: n }, (_, j) => ballPath(steps, end, (PATH_SEGMENTS * j) / (n - 1)));
const trailCache = new Map<number, V3[]>();
const trailOf = (i: number) => {
  if (!trailCache.has(i)) {
    const b = balls()[i];
    trailCache.set(i, pathPoints(b.steps, stackPos(b.bin, b.slot)));
  }
  return trailCache.get(i)!;
};

/** Glowing trails: each slow ball draws its path while it falls, then fades; Anna's lone ball gets a pink one. */
export const trailsAt = (f: number): TrailState[] => {
  const F = FLIGHTS();
  const out: TrailState[] = [];
  for (let i = 0; i < SLOW_BALLS; i++) {
    const u = progressOf(i, f);
    if (u === null) continue;
    const op = 0.85 * fadeAfter(f, F[i].land, HIGHLIGHT.fade);
    if (op > 0) out.push({ points: trailOf(i), progress: u / PATH_SEGMENTS, color: HIGHLIGHT.slowColor, opacity: op });
  }
  const u = progressOf(ANNA_BALL, f);
  if (u !== null && f < BEAT.vs) out.push({ points: trailOf(ANNA_BALL), progress: u / PATH_SEGMENTS, color: HIGHLIGHT.annaColor, opacity: 0.95, width: 0.008 });
  return out;
};

/** The counter on the machine: balls landed. */
export const counterAt = (f: number) => landedAt(f);

// ---------------------------------------------------------------- the twist: bell curve + paths

/** The bell curve over the bins: the normal curve N(6, √3) × 1,000 balls on the stacks' height scale. */
export const CURVE_POINTS: V3[] = Array.from({ length: 131 }, (_, j) => {
  const x = -0.5 + (13 * j) / 130; // bin units, -0.5 .. 12.5
  return [(x - ROWS / 2) * M.pitch, M.binY0 + overlayHeight(normalCount(x)), M.glassZ + 0.012];
});
/** 0..1 drawn share of the curve at f (it stays up through the paths beat). */
export const curveAt = (f: number) => (f < CURVE.from || f >= BEAT.results ? 0 : Math.min(1, (f - CURVE.from) / (CURVE.to - CURVE.from)));

/** All step sequences with k rights out of ROWS (C(12, k) of them). */
export const pathsInto = (k: number): (0 | 1)[][] => {
  const out: (0 | 1)[][] = [];
  const rec = (pre: (0 | 1)[], r: number) => {
    if (pre.length === ROWS) {
      if (r === k) out.push(pre);
      return;
    }
    const left = ROWS - pre.length;
    if (r + left > k) rec([...pre, 0], r);
    if (r < k) rec([...pre, 1], r + 1);
  };
  rec([], 0);
  return out;
};

const topOfStack = (k: number): V3 => [M.binX(k), M.binY0 + Math.max(stackHeight(counts()[k]) - M.ballR, M.ballR), M.ballZ];
/** Anna's only path: 12 lefts into bin 0 (drawn as a pink trail). */
export const ANNA_PATH: V3[] = pathPoints(pathsInto(BET.anna)[0], topOfStack(BET.anna), 120);
let fan: V3[][] | undefined;
/** Every path into Zuzu's centre bin (924 of them), drawn at once as additive lines. */
export const zuzuFan = (): V3[][] => (fan ??= pathsInto(BET.zuzu).map((s) => pathPoints(s, topOfStack(BET.zuzu), 60)));
export const FAN_SIZE = choose(ROWS, BET.zuzu);

export const pathsAt = (f: number) => ({
  anna: f < PATHS.anna || f >= BEAT.results ? 0 : Math.min(1, (f - PATHS.anna) / PATHS.annaLen),
  fan: f < PATHS.fan || f >= BEAT.results ? 0 : Math.min(1, (f - PATHS.fan) / PATHS.fanLen),
});
