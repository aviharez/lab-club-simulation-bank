// DATA for EP07 "Sorting Race". Pure, seeded functions only: every number the episode shows comes from here, and the
// report (npm run report:sorting-race) prints it and checks it.
//
// 12 beakers, liquid levels 1..12 (1 = shortest). Both benches start from the SAME seeded shuffle.
//   Anna: bubble sort, the textbook version: each pass compares neighbours left → right and swaps them if the left one is
//         taller; the last unsorted slot is then final, so the next pass is one shorter; stop after a pass with no swaps.
//   Lumi: quick sort, Lomuto partition, pivot = the LAST beaker of the range; ranges are sorted left first, then right.
//         Each partition of a range of size m costs m − 1 comparisons (every other beaker vs the pivot).
// Only real swaps are counted and shown: Lomuto's "swap a beaker with itself" (i = j) moves nothing, so it costs nothing
// (the report prints how many were skipped).
// The race is fair: every comparison costs COST.compare and every swap COST.swap race-seconds, for both mascots, on the
// same clock. Nothing else costs time.
import { seeded } from "../kit/random.ts";

export const N = 12;
export const SHUFFLE_SEED = 190;

/** Cast in screen order (left → right in the wide shot). */
export const ORDER = ["miyu", "anna", "lumi", "zuzu"] as const;
export type Member = (typeof ORDER)[number];
export type Algo = "anna" | "lumi";
export const ALGOS: Algo[] = ["anna", "lumi"];
export const ALGO_NAME: Record<Algo, string> = { anna: "bubble sort", lumi: "quick sort" };

/** Race-seconds per operation (same for both mascots). */
export const COST = { compare: 0.5, swap: 1.0 } as const;

/** Fisher-Yates with the series' seeded generator. Values 1..n. */
export const shuffled = (n = N, seed = SHUFFLE_SEED): number[] => {
  const r = seeded(seed);
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const START = shuffled();

// ---------------------------------------------------------------- the operations

export type Op = {
  kind: "compare" | "swap";
  /** slot indices (0 = left end of the bench). compare: i < j. swap: the two slots that trade beakers */
  i: number;
  j: number;
  /** compare only: the answer ("left is taller" for bubble, "beaker < pivot" for quick) */
  yes?: boolean;
  /** quick sort only: the range being partitioned and its pivot slot (= hi) */
  range?: [number, number];
  pivot?: number;
  /** bubble only: the pass (1-based) */
  pass?: number;
  /** slots whose beaker is in its final place once this op is done */
  lock?: number[];
};

const lockAfter = (ops: Op[], slots: number[]) => {
  if (!slots.length) return;
  const last = ops[ops.length - 1];
  last.lock = [...(last.lock ?? []), ...slots];
};

/** Bubble sort with the early exit. Returns every op in order. */
export const bubbleOps = (start: number[] = START): Op[] => {
  const a = [...start];
  const ops: Op[] = [];
  for (let end = a.length - 1, pass = 1; end > 0; end--, pass++) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
      const yes = a[j] > a[j + 1];
      ops.push({ kind: "compare", i: j, j: j + 1, yes, pass });
      if (yes) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        ops.push({ kind: "swap", i: j, j: j + 1, pass });
        swapped = true;
      }
    }
    if (!swapped) {
      // nothing moved: every slot up to `end` is already in order
      lockAfter(ops, Array.from({ length: end + 1 }, (_, k) => k));
      return ops;
    }
    lockAfter(ops, end === 1 ? [1, 0] : [end]);
  }
  return ops;
};

/** Quick sort (Lomuto, pivot = last). `selfSwaps` counts the i = j swaps that move nothing (skipped). */
export const quickRun = (start: number[] = START) => {
  const a = [...start];
  const ops: Op[] = [];
  let selfSwaps = 0;
  const pending: number[] = []; // single-slot ranges are final as soon as they appear
  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      pending.push(lo);
      if (ops.length) lockAfter(ops, pending.splice(0));
      return;
    }
    const p = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      const yes = a[j] < p;
      ops.push({ kind: "compare", i: j, j: hi, yes, range: [lo, hi], pivot: hi });
      if (yes) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          ops.push({ kind: "swap", i, j, range: [lo, hi], pivot: hi });
        } else selfSwaps++;
      }
    }
    const at = i + 1;
    if (at !== hi) {
      [a[at], a[hi]] = [a[hi], a[at]];
      ops.push({ kind: "swap", i: at, j: hi, range: [lo, hi], pivot: hi });
    } else selfSwaps++;
    lockAfter(ops, [at]);
    sort(lo, at - 1);
    sort(at + 1, hi);
  };
  sort(0, a.length - 1);
  return { ops, selfSwaps, sorted: a };
};
export const quickOps = (start: number[] = START) => quickRun(start).ops;

/** Apply ops to an arrangement (swaps only change it). */
export const apply = (start: number[], ops: Op[]) => {
  const a = [...start];
  for (const o of ops) if (o.kind === "swap") [a[o.i], a[o.j]] = [a[o.j], a[o.i]];
  return a;
};

// ---------------------------------------------------------------- the race clock (race-seconds)

export type Race = {
  algo: Algo;
  ops: Op[];
  /** start time of op k (race-s); t[ops.length] = finish */
  t: number[];
  /** arrangement BEFORE op k (value per slot); orders[ops.length] = sorted */
  orders: number[][];
  /** comparisons / swaps completed after op k (cumulative, k = 0..ops.length) */
  compares: number[];
  swaps: number[];
  /** locked slots after op k */
  locked: Set<number>[];
  finish: number;
};

const buildRace = (algo: Algo, ops: Op[]): Race => {
  const t = [0];
  const orders = [[...START]];
  const compares = [0];
  const swaps = [0];
  const locked = [new Set<number>()];
  ops.forEach((o, k) => {
    t.push(t[k] + COST[o.kind]);
    const a = [...orders[k]];
    if (o.kind === "swap") [a[o.i], a[o.j]] = [a[o.j], a[o.i]];
    orders.push(a);
    compares.push(compares[k] + (o.kind === "compare" ? 1 : 0));
    swaps.push(swaps[k] + (o.kind === "swap" ? 1 : 0));
    locked.push(new Set([...locked[k], ...(o.lock ?? [])]));
  });
  return { algo, ops, t, orders, compares, swaps, locked, finish: t[ops.length] };
};

const cache: Partial<Record<Algo, Race>> = {};
export const race = (algo: Algo): Race => (cache[algo] ??= buildRace(algo, algo === "anna" ? bubbleOps() : quickOps()));

/** Index of the op running at race time τ (ops.length once finished) and its progress u in [0, 1). */
export const opAt = (r: Race, tau: number): { k: number; u: number } => {
  if (tau >= r.finish) return { k: r.ops.length, u: 0 };
  if (tau <= 0) return { k: 0, u: 0 };
  let lo = 0;
  let hi = r.ops.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (r.t[mid] <= tau) lo = mid;
    else hi = mid - 1;
  }
  return { k: lo, u: (tau - r.t[lo]) / (r.t[lo + 1] - r.t[lo]) };
};

/** Counters at race time τ: an operation counts once it is complete. */
export const countsAt = (algo: Algo, tau: number) => {
  const r = race(algo);
  const { k } = opAt(r, tau);
  return { compares: r.compares[k], swaps: r.swaps[k], done: tau >= r.finish };
};

/** Totals (the result cards, the report). */
export const TOTAL = (algo: Algo) => {
  const r = race(algo);
  return { compares: r.compares[r.ops.length], swaps: r.swaps[r.ops.length], time: r.finish };
};

// ---------------------------------------------------------------- growth for big n (the reveal)

const EULER_GAMMA = 0.5772156649015329;
/** Harmonic number H_n: exact sum up to 1000, asymptotic series above (next term 1/(120 n⁴) < 1e-13 there), so the
 *  live growth chart can evaluate it every frame. */
export const harmonic = (n: number) => {
  if (n <= 1000) {
    let s = 0;
    for (let k = n; k >= 1; k--) s += 1 / k;
    return s;
  }
  return Math.log(n) + EULER_GAMMA + 1 / (2 * n) - 1 / (12 * n * n);
};
/** Bubble sort, comparisons without the early exit: (n−1) + (n−2) + … + 1 = n(n−1)/2. (With the early exit on a random
 *  order it is only a little less; the report measures it.) */
export const bubbleCompares = (n: number) => (n * (n - 1)) / 2;
/** Quick sort (Lomuto, m − 1 comparisons per partition), average over random orders: C(n) = 2(n+1)H_n − 4n.
 *  (Solution of C(n) = n − 1 + (2/n) Σ C(k); about 1.39 n log₂ n for large n.) */
export const quickCompares = (n: number) => 2 * (n + 1) * harmonic(n) - 4 * n;
export const nLog2n = (n: number) => n * Math.log2(n);
export const BIG_N = 1_000_000;

/** "about …" in words, 2 significant figures: 4.99999e11 → "500 billion", 2.479e7 → "25 million". */
export const about = (x: number) => {
  const units: [number, string][] = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  for (const [u, w] of units) if (x >= u) return `${Number((x / u).toPrecision(2))} ${w}`;
  return String(Number(x.toPrecision(2)));
};

/** The one rounding rule for race times on screen: 1 decimal, seconds. */
export const secs = (x: number) => `${x.toFixed(1)} s`;
