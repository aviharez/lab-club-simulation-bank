// Beat sheet, race clock, beaker motion and per-frame acting for EP07 "Sorting Race".
// Pure functions of the frame: Scene3D, the overlays, sound.ts and the report all read this file, so picture, sound
// and report can never drift apart. Every beaker position comes from data.ts (the real operation lists); this file
// only maps race-seconds to frames: 1x, then 4x, then 8x, the SAME mapping for both benches (the race stays fair).
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { BEAKER, CHEM_PREP, slotX, SLOTS } from "../sets/chem-prep-room/layout.ts";
import { about, ALGOS, BIG_N, bubbleCompares, N, opAt, quickCompares, race, secs, START, TOTAL, type Algo, type Member } from "./data.ts";

export const FPS = 30;
type V3 = [number, number, number];

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const prog = (f: number, a: number, b: number) => Math.min(1, Math.max(0, (f - a) / (b - a)));

// ---------------------------------------------------------------- the race clock

/** The race starts at RACE_START. Race-seconds → screen: 1x for the first 6 s, 4x until 18 s, then 8x. */
export const RACE_START = 242;
export const SPEEDS = [
  { from: 0, x: 1 },
  { from: 6, x: 4 },
  { from: 18, x: 8 },
] as const;

/** Screen frame (fractional) at race time τ. */
export const frameOf = (tau: number) => {
  let f = RACE_START;
  for (let i = 0; i < SPEEDS.length; i++) {
    const a = SPEEDS[i].from;
    const b = i + 1 < SPEEDS.length ? SPEEDS[i + 1].from : Infinity;
    if (tau <= a) break;
    f += ((Math.min(tau, b) - a) * FPS) / SPEEDS[i].x;
  }
  return f;
};
/** Race time τ at screen frame f (0 before the start). */
export const tauAt = (f: number) => {
  if (f <= RACE_START) return 0;
  for (let i = SPEEDS.length - 1; i >= 0; i--) {
    const f0 = frameOf(SPEEDS[i].from);
    if (f >= f0) return SPEEDS[i].from + ((f - f0) * SPEEDS[i].x) / FPS;
  }
  return 0;
};
/** Playback speed at frame f (the badge). */
export const speedAt = (f: number) => {
  const t = tauAt(f);
  let x: number = SPEEDS[0].x;
  for (const s of SPEEDS) if (t >= s.from) x = s.x;
  return x;
};

/** Frame at which each mascot's last operation completes (fractional) and the first whole frame showing it. */
export const DONE_AT = { anna: frameOf(TOTAL("anna").time), lumi: frameOf(TOTAL("lumi").time) } as const;
export const DONE = { anna: Math.ceil(DONE_AT.anna), lumi: Math.ceil(DONE_AT.lumi) } as const;
/** Race time shown on Miyu's stopwatch and the panel: runs until the last racer is done. */
export const clockAt = (f: number) => Math.min(tauAt(f), TOTAL("anna").time);

// ---------------------------------------------------------------- beats

export const BEAT = {
  hook: 0,
  annaBet: 96,
  lumiBet: 166,
  go: RACE_START - 6,
  race: RACE_START,
  x4: Math.round(frameOf(SPEEDS[1].from)),
  x8: Math.round(frameOf(SPEEDS[2].from)),
  lumiDone: DONE.lumi,
  annaDone: DONE.anna,
  results: DONE.anna + 40,
  twist: DONE.anna + 154,
  reveal: DONE.anna + 284,
  cta: DONE.anna + 544,
  end: DONE.anna + 664,
} as const;
export const DURATION = BEAT.end;

// ---------------------------------------------------------------- beakers

export type BeakerDraw = { value: number; pos: V3; ring: { color: string; intensity: number } | null; locked: number };
export const RING = { anna: "#ff7fa6", lumi: "#6aa8ff", pivot: "#f2bf3b" } as const;
const LIFT = 0.27; // the carried beaker goes over the row (beakers are 0.22 tall)
const BEHIND = 0.13; // the other one slides along behind the row (toward the mascot)
/** a highlight lingers this many frames after its operation (so the fast part still reads) */
const RING_FADE = 5;

/** The 12 beakers of one bench at frame f: the arrangement before the running op, the swap animated over its op. */
export const beakersAt = (algo: Algo, f: number): BeakerDraw[] => {
  const r = race(algo);
  const z0 = CHEM_PREP.benchZ[algo];
  const y0 = CHEM_PREP.bench.top;
  const tau = tauAt(f);
  const { k, u } = f <= RACE_START ? { k: 0, u: 0 } : opAt(r, tau);
  const order = r.orders[k];
  const op = k < r.ops.length ? r.ops[k] : undefined;
  const pos: V3[] = order.map((_, s) => [slotX(s), y0, z0]);
  if (op && op.kind === "swap" && f > RACE_START) {
    const e = smooth(u);
    const arc = Math.sin(Math.PI * e);
    const xi = slotX(op.i);
    const xj = slotX(op.j);
    // the taller beaker of the pair is carried over, the shorter one slides behind
    const overI = order[op.i] > order[op.j];
    pos[op.i] = [xi + (xj - xi) * e, y0 + (overI ? LIFT * arc : 0), z0 - (overI ? 0 : BEHIND * arc)];
    pos[op.j] = [xj + (xi - xj) * e, y0 + (overI ? 0 : LIFT * arc), z0 - (overI ? BEHIND * arc : 0)];
  }
  // highlights: the running op and the last few, fading
  const ring: (BeakerDraw["ring"] | null)[] = Array(SLOTS).fill(null);
  const put = (s: number, color: string, intensity: number) => {
    if (intensity <= 0.01) return;
    if (!ring[s] || ring[s]!.intensity < intensity) ring[s] = { color, intensity };
  };
  if (f > RACE_START && k < r.ops.length) {
    for (let d = 3; d >= 0; d--) {
      const kk = k - d;
      if (kk < 0) continue;
      const o = r.ops[kk];
      const end = frameOf(r.t[kk + 1]);
      const intensity = d === 0 ? 1 : Math.max(0, 1 - (f - end) / RING_FADE);
      const c = RING[algo];
      if (algo === "lumi" && o.kind === "compare") put(o.i, c, intensity);
      else {
        put(o.i, c, intensity);
        put(o.j, c, intensity);
      }
    }
    if (algo === "lumi" && op?.pivot !== undefined) put(op.pivot, RING.pivot, 1);
  }
  // the slot index of each drawn beaker is where it stands in `order`; a swap leaves the pair in their old slots
  const locked = r.locked[k];
  return order.map((value, s) => ({ value, pos: pos[s], ring: ring[s] ?? null, locked: locked.has(s) ? 1 : 0 }));
};

/** Lumi's current partition range [lo, hi] (null outside the race). */
export const rangeAt = (f: number): [number, number] | null => {
  if (f <= RACE_START) return null;
  const r = race("lumi");
  const { k } = opAt(r, tauAt(f));
  return k < r.ops.length ? (r.ops[k].range ?? null) : null;
};

/** Counters (complete operations) at frame f. */
export const countsAtFrame = (algo: Algo, f: number) => {
  const r = race(algo);
  const { k } = opAt(r, tauAt(f));
  return { compares: r.compares[k], swaps: r.swaps[k], done: f >= DONE_AT[algo] };
};

// ---------------------------------------------------------------- staging

const W = CHEM_PREP.workZ;
/** results / CTA: the cast in a line in front of Anna's bench */
export const LINE: Record<Member, V3> = { miyu: [-0.76, 0, 0.64], anna: [-0.26, 0, 0.7], lumi: [0.26, 0, 0.7], zuzu: [0.76, 0, 0.64] };
/** twist + reveal: Lumi between the benches, the sorted row behind her; the others at the bench ends */
export const REVEAL_SPOT: V3 = [0.15, 0, -1.0];
const ASIDE: Record<Member, V3> = { miyu: [-1.36, 0, -1.3], anna: [-0.85, 0, -1.35], zuzu: [1.36, 0, -1.3], lumi: REVEAL_SPOT };

/** Where a racer wants to stand during op k: Anna at the pair, Lumi at the beaker she checks / the pair she swaps. */
const opX = (algo: Algo, k: number) => {
  const r = race(algo);
  const o = r.ops[Math.min(k, r.ops.length - 1)];
  if (algo === "lumi" && o.kind === "compare") return slotX(o.i);
  return (slotX(o.i) + slotX(o.j)) / 2;
};
export const START_X: Record<Algo, number> = { anna: opX("anna", 0), lumi: opX("lumi", 0) };

/** The racer's x follows its operations with a smooth, speed-capped follow (precomputed frame by frame: pure data). */
const MAX_STEP = 0.05; // m/frame
const FOLLOW = 0.3;
type Track = { x: number[]; clip: string[]; switchAt: number[]; prevClip: string[]; v: number[] };
const HOLD = 9; // a clip holds at least this many frames (no flicker in the fast part)
const tracks: Partial<Record<Algo, Track>> = {};
const track = (algo: Algo): Track => {
  if (tracks[algo]) return tracks[algo]!;
  const r = race(algo);
  const n = DONE[algo] + 2 - RACE_START;
  const x: number[] = [];
  const v: number[] = [];
  const clip: string[] = [];
  const switchAt: number[] = [];
  const prevClip: string[] = [];
  let cx = START_X[algo];
  let cur = "compare";
  let at = RACE_START;
  let prev = "idle";
  for (let i = 0; i < n; i++) {
    const f = RACE_START + i;
    const { k } = opAt(r, tauAt(f));
    const kk = Math.min(k, r.ops.length - 1);
    const target = opX(algo, kk);
    const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, (target - cx) * FOLLOW));
    cx += step;
    x.push(cx);
    v.push(step);
    const want = k < r.ops.length && r.ops[k].kind === "swap" ? "carry" : "compare";
    if (want !== cur && f - at >= HOLD) {
      prev = cur;
      cur = want;
      at = f;
    }
    clip.push(cur);
    switchAt.push(at);
    prevClip.push(prev);
  }
  return (tracks[algo] = { x, clip, switchAt, prevClip, v });
};
/** Racer x at frame f (clamped to the race track). */
export const racerX = (algo: Algo, f: number) => {
  const t = track(algo);
  if (f <= RACE_START) return START_X[algo];
  return t.x[Math.min(t.x.length - 1, Math.floor(f) - RACE_START)];
};

/** Acting clock: real time at 1x, double time in the fast part (limbs stay readable). */
const actT = (f: number) => (f < BEAT.x4 ? Math.max(0, f - RACE_START) : BEAT.x4 - RACE_START + 2 * (f - BEAT.x4)) / FPS;

// ---------------------------------------------------------------- acting

export type ActorState = {
  clip: string;
  time: number;
  from?: { clip: string; time: number; weight: number };
  expression: string;
  pos: V3;
  yaw: number;
  symbols: { kind: SymbolKind; from: number }[];
};

type Seg = { at: number; clip: string; expr: string; sym?: SymbolKind[]; pos: V3 | ((f: number) => V3); yaw: number | ((f: number) => number); cut?: boolean; t0?: number; hold?: boolean };
const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const BLEND = 8;
const val = <T,>(x: T | ((f: number) => T), f: number): T => (typeof x === "function" ? (x as (f: number) => T)(f) : x);
const clipTime = (m: Member, s: Seg, f: number) => (s.hold ? (s.t0 ?? 0) : s.clip === "idle" ? f / FPS + IDLE_OFFSET[m] : (f - s.at) / FPS + (s.t0 ?? 0));

const play = (m: Member, segs: Seg[]) => (f: number): ActorState => {
  let i = 0;
  while (i + 1 < segs.length && segs[i + 1].at <= f) i++;
  const s = segs[i];
  const prev = i > 0 && !s.cut ? segs[i - 1] : undefined;
  const k = prev ? smooth((f - s.at) / BLEND) : 1;
  const symbols = (s.sym ?? []).map((kind) => {
    let j = i;
    while (j > 0 && !segs[j].cut && segs[j - 1].sym?.includes(kind)) j--;
    return { kind, from: segs[j].at + 2 };
  });
  return {
    clip: s.clip,
    time: clipTime(m, s, f),
    from: prev && k < 1 ? { clip: prev.clip, time: clipTime(m, prev, f), weight: 1 - k } : undefined,
    expression: s.expr,
    pos: val(s.pos, f),
    yaw: prev ? val(prev.yaw, f) + (val(s.yaw, f) - val(prev.yaw, f)) * smooth((f - s.at) / 10) : val(s.yaw, f),
    symbols,
  };
};

/** Racing: position, clip (compare / carry, held ≥ HOLD frames, blended) from the precomputed track. */
const racing = (algo: Algo, f: number, expr: string, symbols: ActorState["symbols"]): ActorState => {
  const t = track(algo);
  const i = Math.min(t.x.length - 1, Math.max(0, Math.floor(f) - RACE_START));
  const clip = t.clip[i];
  const w = smooth((f - t.switchAt[i]) / 6);
  const time = actT(f) + (algo === "lumi" ? 1.1 : 0);
  // a slight turn toward where she is heading (keeps the face to camera)
  const yaw = Math.max(-0.55, Math.min(0.55, t.v[i] * 14));
  return {
    clip,
    time,
    from: w < 1 && t.switchAt[i] > RACE_START ? { clip: t.prevClip[i], time, weight: 1 - w } : undefined,
    expression: expr,
    pos: [racerX(algo, f), 0, W[algo]],
    yaw,
    symbols,
  };
};

export const ANNA = { bet: BEAT.annaBet + 4, annoyed: BEAT.x8 - 42, shocked: BEAT.lumiDone + 2, squint: BEAT.lumiDone + 34, crying: BEAT.lumiDone + 80, sad: BEAT.annaDone, cheer: BEAT.cta + 8 };
export const LUMI = { bet: BEAT.lumiBet + 10, cheer: BEAT.lumiDone, point: BEAT.reveal + 4, glint: BEAT.reveal + 24, ctaCheer: BEAT.cta + 12 };
export const ZUZU = { wave: BEAT.lumiDone + 2, cheer: BEAT.cta + 4 };
export const MIYU = { click: BEAT.go, happy: BEAT.lumiDone + 6, cheer: BEAT.cta + 2 };

const annaRaceExpr = (f: number): { expr: string; sym: SymbolKind[]; symFrom: number } => {
  if (f >= ANNA.crying) return { expr: "crying", sym: ["sweat"], symFrom: ANNA.crying + 2 };
  if (f >= ANNA.squint) return { expr: "squint", sym: ["sweat"], symFrom: ANNA.squint + 2 };
  if (f >= ANNA.shocked) return { expr: "shocked", sym: ["exclaim"], symFrom: ANNA.shocked + 2 };
  if (f >= ANNA.annoyed) return { expr: "squint", sym: [], symFrom: 0 };
  return { expr: "smug", sym: [], symFrom: 0 };
};

const annaStart: V3 = [START_X.anna, 0, W.anna];
const lumiStart: V3 = [START_X.lumi, 0, W.lumi];

const annaSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "smug", pos: annaStart, yaw: 0 },
  { at: ANNA.bet, clip: "point", expr: "smug", sym: ["sparkle"], pos: annaStart, yaw: 0.25, t0: 1.0 },
  { at: BEAT.lumiBet, clip: "idle", expr: "smug", pos: annaStart, yaw: 0, cut: true },
  // (the race itself is driven by `racing`)
  { at: BEAT.annaDone, clip: "sad", expr: "crying", sym: ["sweat"], pos: (f) => [racerX("anna", f), 0, W.anna], yaw: 0 },
  { at: BEAT.results, clip: "sad", expr: "crying", sym: ["sweat"], pos: LINE.anna, yaw: 0.15, cut: true },
  { at: BEAT.results + 60, clip: "idle", expr: "squint", pos: LINE.anna, yaw: 0.15 },
  { at: BEAT.twist, clip: "idle", expr: "squint", pos: ASIDE.anna, yaw: 0.35, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.anna, yaw: 0.1, cut: true },
  { at: ANNA.cheer, clip: "cheer", expr: "happy", pos: LINE.anna, yaw: 0.1 },
];

const lumiSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: lumiStart, yaw: 0 },
  { at: LUMI.bet, clip: "compare", expr: "neutral", pos: lumiStart, yaw: 0, t0: 0.4 },
  { at: BEAT.go, clip: "idle", expr: "neutral", pos: lumiStart, yaw: 0, cut: true },
  { at: LUMI.cheer, clip: "cheer", expr: "happy", sym: ["sparkle"], pos: (f) => [racerX("lumi", f), 0, W.lumi], yaw: 0 },
  { at: LUMI.cheer + 150, clip: "idle", expr: "happy", pos: (f) => [racerX("lumi", f), 0, W.lumi], yaw: 0 },
  { at: BEAT.results, clip: "idle", expr: "happy", pos: LINE.lumi, yaw: -0.15, cut: true },
  { at: BEAT.twist, clip: "compare", expr: "neutral", pos: REVEAL_SPOT, yaw: -0.05, cut: true, t0: 0.3 },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: REVEAL_SPOT, yaw: -0.1, cut: true },
  { at: LUMI.point, clip: "point", expr: "happy", pos: REVEAL_SPOT, yaw: -0.3 },
  { at: LUMI.glint, clip: "point", expr: "glint", pos: REVEAL_SPOT, yaw: -0.3, t0: (LUMI.glint - LUMI.point) / FPS },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.lumi, yaw: -0.15, cut: true },
  { at: LUMI.ctaCheer, clip: "cheer", expr: "happy", pos: LINE.lumi, yaw: -0.15 },
];

const REF = CHEM_PREP.referee;
const FIN = CHEM_PREP.finish;
const miyuSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "squint", pos: REF, yaw: 0.7 },
  { at: MIYU.happy, clip: "idle", expr: "happy", pos: REF, yaw: 0.7 },
  { at: BEAT.annaDone, clip: "idle", expr: "neutral", pos: REF, yaw: 0.7 },
  { at: BEAT.results, clip: "idle", expr: "neutral", pos: LINE.miyu, yaw: 0.25, cut: true },
  { at: BEAT.twist, clip: "idle", expr: "squint", pos: ASIDE.miyu, yaw: 0.5, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.miyu, yaw: 0.25, cut: true },
  { at: MIYU.cheer, clip: "cheer", expr: "happy", pos: LINE.miyu, yaw: 0.25 },
];
const zuzuSegs: Seg[] = [
  { at: 0, clip: "hold_sign", expr: "happy", pos: FIN, yaw: -0.7 },
  { at: ZUZU.wave, clip: "hold_sign", expr: "happy", sym: ["sparkle"], pos: FIN, yaw: -0.55 },
  { at: BEAT.annaDone, clip: "hold_sign", expr: "neutral", pos: FIN, yaw: -0.7 },
  { at: BEAT.results, clip: "hold_sign", expr: "happy", pos: LINE.zuzu, yaw: -0.2, cut: true },
  { at: BEAT.twist, clip: "idle", expr: "happy", pos: ASIDE.zuzu, yaw: -0.5, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.zuzu, yaw: -0.2, cut: true },
  { at: ZUZU.cheer, clip: "cheer", expr: "happy", pos: LINE.zuzu, yaw: -0.2 },
];

const BY: Record<Member, (f: number) => ActorState> = {
  anna: play("anna", annaSegs),
  lumi: play("lumi", lumiSegs),
  miyu: play("miyu", miyuSegs),
  zuzu: play("zuzu", zuzuSegs),
};

export const ACTING = (m: Member, f: number): ActorState => {
  if (m === "anna" && f >= BEAT.race && f < BEAT.annaDone) {
    const e = annaRaceExpr(f);
    return racing("anna", f, e.expr, e.sym.map((kind) => ({ kind, from: e.symFrom })));
  }
  if (m === "lumi" && f >= BEAT.race && f < BEAT.lumiDone) return racing("lumi", f, "neutral", []);
  return BY[m](f);
};

/** Zuzu waves the flag harder once Lumi is through (the hold_sign loop runs faster). */
export const flagWave = (f: number) => (f < ZUZU.wave ? f / FPS : ZUZU.wave / FPS + ((f - ZUZU.wave) / FPS) * 2);
/** The flag is in Zuzu's hands from the start until the twist (she hands it over for the reveal). */
export const flagVisible = (f: number) => f < BEAT.twist;
/** The stopwatch is in Miyu's hand from the start until the twist. */
export const stopwatchVisible = (f: number) => f < BEAT.twist;

/** World clock (s) for the set's flame, caustics and dust. */
export const worldTime = (f: number) => f / FPS;

// ---------------------------------------------------------------- the twist: n grows to a million

export const GROWTH = { from: BEAT.twist + 20, to: BEAT.twist + 86 } as const;
/** log10 n on the growth chart at frame f: 12 → 1,000,000. */
export const growthLog = (f: number) => Math.log10(N) + (Math.log10(BIG_N) - Math.log10(N)) * smooth(prog(f, GROWTH.from, GROWTH.to));

// ---------------------------------------------------------------- overlays timing

export const PANEL_RACE = { from: BEAT.race - 10, to: BEAT.results - 10 } as const;
export const PANEL_GROWTH = { from: BEAT.twist + 4, to: BEAT.cta - 14 } as const;
export const RESULT_POPS = [BEAT.results + 14, BEAT.results + 30];
export const RESULT_OUTS = [BEAT.twist - 14, BEAT.twist - 12];
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };
export const BADGES = {
  rule: { from: BEAT.race + 4, to: BEAT.x4 },
  x4: { from: BEAT.x4, to: BEAT.x8 },
  x8: { from: BEAT.x8, to: BEAT.annaDone + 10 },
  avg: { from: BEAT.twist + 50, to: BEAT.reveal },
};
export const TAGS = { counters: { from: BEAT.race - 4, to: BEAT.results - 10 } } as const;

// ---------------------------------------------------------------- captions (every number from data.ts)

const T = { anna: TOTAL("anna"), lumi: TOTAL("lumi") };
export const RATIO = T.anna.time / T.lumi.time;
export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.annaBet, text: `Sort ${N} beakers, shortest to tallest. Who finishes first?`, variant: "hook", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.annaBet, to: BEAT.lumiBet, speaker: "anna", text: "I check every pair. Can't lose!" },
  { from: BEAT.lumiBet, to: BEAT.go, speaker: "lumi", text: "Pick a pivot. Split. Repeat." },
  { from: BEAT.go, to: BEAT.race + 30, text: "GO!", variant: "big" },
  { from: BEAT.race + 30, to: BEAT.x4, text: "Same beakers, same clock" },
  { from: BEAT.x4, to: BEAT.x8 - 6, text: "Anna swaps neighbours, pass after pass" },
  { from: BEAT.x8 - 6, to: BEAT.lumiDone, text: "Lumi splits around a pivot" },
  { from: BEAT.lumiDone, to: BEAT.annaDone, text: `Lumi: done in ${secs(T.lumi.time)}!` },
  { from: BEAT.annaDone, to: BEAT.results + 12, text: `Anna: done in ${secs(T.anna.time)}` },
  { from: BEAT.results + 12, to: BEAT.twist, text: `Quick sort: ${RATIO.toFixed(1)}x faster here` },
  { from: BEAT.twist, to: GROWTH.to - 4, text: `What if there were ${BIG_N.toLocaleString("en-US")} beakers?`, sticker: { text: "Twist!", at: BEAT.twist + 12, top: 330 } },
  { from: GROWTH.to - 4, to: BEAT.reveal, text: `${about(bubbleCompares(BIG_N))} vs ${about(quickCompares(BIG_N))}` },
  { from: BEAT.reveal, to: BEAT.cta, text: "n² vs n log n" },
  { from: BEAT.cta, to: BEAT.end, text: "Your turn: pick the next race!" },
];

/** sanity for the report: both lists end sorted and every beaker is one of the START values */
export const SORTED_END = (algo: Algo) => race(algo).orders[race(algo).ops.length];
export const BEAKER_TOP = CHEM_PREP.bench.top + BEAKER.h;
export const START_ORDER = START;
export const RACERS = ALGOS;
