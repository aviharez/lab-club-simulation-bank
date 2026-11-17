// Beat sheet, step schedules and per-frame acting for EP06 "Zuzu's Dizzy Walk".
// Pure functions of the frame: Scene3D, the overlays, sound.ts and the report all read this file, so picture, sound
// and report can never drift apart. Every tile a walker stands on comes from data.ts (seeded walks); this file only
// decides WHEN each step happens (a time-lapse: the first 10 steps ~2.4x real time, then accelerating).
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { TILE } from "../sets/night-plaza/layout.ts";
import { DIRS, FINAL, GHOSTS, ghostRms, LUMI_START, lumiAt, reversals, STEPS, tileAt, tiles, zuzu, type Member, type Tile } from "./data.ts";

export const FPS = 30;
type V3 = [number, number, number];

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};

/** Tile (i, j) (fractional) → world metres on the floor. */
export const world = (t: [number, number] | Tile, y = 0): V3 => [t[0] * TILE, y, -t[1] * TILE];
/** Actor yaw that faces along a tile direction (yaw 0 faces +z = south, toward the camera side). */
export const yawOf = (d: Tile) => Math.atan2(d[0], -d[1]);

// ---------------------------------------------------------------- step schedules (continuous frames)

/** Walk: steps 1..10 take SLOW_DUR frames each, steps 11..100 land at a time-lapse that speeds up. */
export const WALK = { start: 222, slowSteps: 10, slowDur: 14, fastDur: 220, accel: 1.6 } as const;
/** the frame step k (0..100) is complete; stepEnd(0) = the walk starts */
export const walkStepEnd = (k: number) => {
  const W = WALK;
  if (k <= W.slowSteps) return W.start + W.slowDur * k;
  return W.start + W.slowSteps * W.slowDur + W.fastDur * ((k - W.slowSteps) / (STEPS - W.slowSteps)) ** (1 / W.accel);
};
export const WALK_END = Math.ceil(walkStepEnd(STEPS));

/** Ghost run (the twist): 50 walks at once, 100 steps in RUN.dur frames, a little slower at first. */
export const RUN = { start: 830, dur: 180, accel: 1.3 } as const;
export const runStepEnd = (k: number) => RUN.start + RUN.dur * (k / STEPS) ** (1 / RUN.accel);
export const RUN_END = Math.ceil(runStepEnd(STEPS));

/** Continuous step progress s(f) in [0, 100] for a schedule. */
const progressOf = (end: (k: number) => number, f: number) => {
  if (f <= end(0)) return 0;
  if (f >= end(STEPS)) return STEPS;
  let k = 0;
  while (k < STEPS && end(k + 1) <= f) k++;
  return k + (f - end(k)) / (end(k + 1) - end(k));
};
/** Walk progress (Zuzu and Lumi step together). */
export const walkAt = (f: number) => progressOf(walkStepEnd, f);
/** Ghost-run progress (all 50 ghosts step together). */
export const runAt = (f: number) => progressOf(runStepEnd, f);
/** Whole steps done (the counters): a step counts once it is complete. */
export const done = (s: number) => Math.floor(s + 1e-9);

/** Real time per step at walking pace (0.4 m at Zuzu's 0.361 m/s) and the time-lapse factor of each step. */
export const WALK_SPEED = { zuzu: 0.361, lumi: 0.371 } as const; // mascots/manifest.json speed_units_per_s (height 1.0)
export const realStepS = TILE / WALK_SPEED.zuzu;
export const speedUp = (k: number) => (realStepS * FPS) / (walkStepEnd(k) - walkStepEnd(k - 1));

// ---------------------------------------------------------------- beats

export const BEAT = {
  hook: 0,
  spin: 6, // Anna spins Zuzu on the start ring
  spinEnd: 84,
  bets: 96, // Anna bets far
  miyuBet: 156, // Miyu bets close
  go: 216,
  walk: WALK.start,
  walkEnd: WALK_END, // 100 steps each
  drone: WALK_END, // drone view: Lumi's line vs Zuzu's scribble, Miyu's tapes
  tape: 676, // close: Miyu's tape on Zuzu
  twist: 800, // "What if 50 Zuzus tried?"
  run: RUN.start,
  runEnd: RUN_END,
  results: 1068,
  reveal: 1182,
  cta: 1320,
  end: 1410,
} as const;
export const DURATION = BEAT.end;

/** Measuring: both tapes unroll in the drone shot; the close-up reads Zuzu's. */
export const TAPE = {
  lumi: { from: BEAT.drone + 12, to: BEAT.drone + 50 },
  zuzu: { from: BEAT.drone + 34, to: BEAT.drone + 52 },
  cu: { from: BEAT.tape + 8, to: BEAT.tape + 30 },
  /** the tag with the measured value pops when the tape reaches its end */
} as const;
/** Lumi's tape lies beside her trail (parallel, same length), so the glowing line stays visible. */
export const LUMI_TAPE_OFFSET = 0.26;

const prog = (f: number, a: number, b: number) => Math.min(1, Math.max(0, (f - a) / (b - a)));

/** Tapes on the floor at f: in the drone shot wide (readable from 40 m), in the close-up the real 7 cm. */
export const tapesAt = (f: number): { from: V3; to: V3; progress: number; width: number }[] => {
  if (f >= BEAT.drone && f < BEAT.tape) {
    const o = LUMI_TAPE_OFFSET;
    const ls = world(LUMI_START);
    const le = world(lumiAt(STEPS));
    return [
      { from: [ls[0] + o, 0, ls[2]], to: [le[0] + o, 0, le[2]], progress: prog(f, TAPE.lumi.from, TAPE.lumi.to), width: 0.3 },
      { from: [0, 0, 0], to: ZUZU_END, progress: prog(f, TAPE.zuzu.from, TAPE.zuzu.to), width: 0.3 },
    ];
  }
  if (f >= BEAT.tape && f < BEAT.twist) return [{ from: [0, 0, 0], to: ZUZU_END, progress: prog(f, TAPE.cu.from, TAPE.cu.to), width: 0.07 }];
  return [];
};

// ---------------------------------------------------------------- staging

const ZUZU_PATH = () => zuzu().pos;
export const ZUZU_END: V3 = world(zuzu().pos[STEPS]);
export const LUMI_END: V3 = world(lumiAt(STEPS));
/** the spin: Anna beside Zuzu on the start ring */
const SPIN_ANNA: V3 = [-0.56, 0, 0.12];
const MIYU_HOOK: V3 = [1.5, 0, 0.55];
/** watchers during the walk: off every tile Zuzu visits (the report checks the clearance) */
export const WATCH: Record<"anna" | "miyu", V3> = { anna: [-2.55, 0, 1.75], miyu: [2.45, 0, 1.55] };
/** Miyu with the tape case on the start ring, measuring to Zuzu */
export const MIYU_MEASURE: V3 = [0.32, 0, -0.22];
/** results / CTA: the cast in a line in front of the start ring (Lumi walked back) */
export const LINE: Record<Member, V3> = { miyu: [-0.86, 0, 0.95], anna: [-0.29, 0, 1.02], zuzu: [0.29, 0, 1.02], lumi: [0.86, 0, 0.95] };
/** reveal: Lumi centre front, the others aside */
export const REVEAL_SPOT: V3 = [0, 0, 1.35];
const ASIDE: Record<Member, V3> = { miyu: [-1.6, 0, 0.6], anna: [-0.95, 0, 0.45], zuzu: [0.95, 0, 0.45], lumi: REVEAL_SPOT };

const toward = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);

// ---------------------------------------------------------------- acting (segments: clip + face + symbols + spot)

export type ActorState = {
  clip: string;
  time: number;
  from?: { clip: string; time: number; weight: number };
  expression: string;
  pos: V3;
  yaw: number;
  symbols: { kind: SymbolKind; from: number }[];
};

type Fn<T> = T | ((f: number) => T);
const val = <T,>(x: Fn<T>, f: number): T => (typeof x === "function" ? (x as (f: number) => T)(f) : x);
/** hold: freeze the clip at t0; clipT: the clip time comes from a function (walking: from the distance walked) */
type Seg = { at: number; clip: string; expr: string; sym?: SymbolKind[]; pos: Fn<V3>; yaw: Fn<number>; cut?: boolean; t0?: number; hold?: boolean; clipT?: (f: number) => number };

const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const BLEND = 8;
const clipTime = (m: Member, s: Seg, f: number) =>
  s.clipT ? s.clipT(f) : s.hold ? (s.t0 ?? 0) : s.clip === "idle" ? f / FPS + IDLE_OFFSET[m] : (f - s.at) / FPS + (s.t0 ?? 0);

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
    yaw: prev ? lerpAngle(val(prev.yaw, f), val(s.yaw, f), smooth((f - s.at) / 10)) : val(s.yaw, f),
    symbols,
  };
};

// ---- the walkers

/** Zuzu's position on the floor at frame f (tile centres, straight between them). */
export const zuzuPos = (f: number): V3 => world(tileAt(ZUZU_PATH(), walkAt(f)));
export const lumiPos = (f: number): V3 => world(tileAt([LUMI_START, lumiAt(STEPS)], walkAt(f) / STEPS));
/** Zuzu faces the tile she is stepping to (turning in the first 35 % of a step), with a dizzy wobble on top. */
export const zuzuYaw = (f: number) => {
  const s = walkAt(f);
  const w = zuzu();
  const k = Math.min(STEPS - 1, Math.floor(s));
  const cur = yawOf(DIRS[w.dirs[k]]);
  const prev = k > 0 ? yawOf(DIRS[w.dirs[k - 1]]) : Math.PI;
  return lerpAngle(prev, cur, smooth((s - k) / 0.35)) + 0.22 * Math.sin(f * 0.43) * (s < STEPS ? 1 : 0);
};
/** the walk clip advances with the distance walked, so the feet stay planted at any time-lapse speed */
const walkClip = (m: "zuzu" | "lumi") => (f: number) => (walkAt(f) * TILE) / WALK_SPEED[m] + (m === "zuzu" ? 0.2 : 0.9);

/** Step 2 is Zuzu's first turn straight back (data: reversals()); she notices. */
export const OOPS_STEP = reversals()[0];
export const ZUZU = { spin: BEAT.spin, dizzy: BEAT.spinEnd, oops: Math.round(walkStepEnd(OOPS_STEP - 1)) + 2, shocked: BEAT.tape + 34 };
export const ANNA = { push: [BEAT.spin, BEAT.spin + 24, BEAT.spin + 48], bet: BEAT.bets + 2, shocked: BEAT.results + 4, sad: BEAT.results + 44, cheer: BEAT.cta + 8 };
export const MIYU = { bet: BEAT.miyuBet + 2, measure: BEAT.tape, happy: BEAT.results + 24, cheer: BEAT.cta + 2 };
export const LUMI = { point: BEAT.reveal + 4, glint: BEAT.reveal + 24, cheer: BEAT.cta + 12 };

/** Zuzu spins 3 full turns on the ring (yaw from the camera side, eased in and out). */
const SPIN_TURNS = 3;
const spinYaw = (f: number) => 0.2 + 2 * Math.PI * SPIN_TURNS * smooth((f - BEAT.spin) / (BEAT.spinEnd - BEAT.spin));

const zuzuSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "happy", pos: [0, 0, 0], yaw: spinYaw },
  { at: ZUZU.dizzy, clip: "dizzy", expr: "dizzy", sym: ["spiral"], pos: [0, 0, 0], yaw: (f) => 0.2 + 0.25 * Math.sin(f * 0.2) },
  // GO: she faces her first step, then walks (the time-lapse clock drives the clip)
  { at: BEAT.go, clip: "dizzy", expr: "dizzy", sym: ["spiral"], pos: [0, 0, 0], yaw: zuzuYaw, cut: true, t0: 1.2 },
  { at: BEAT.walk, clip: "walk", expr: "dizzy", sym: ["spiral"], pos: zuzuPos, yaw: zuzuYaw, clipT: walkClip("zuzu") },
  { at: ZUZU.oops, clip: "walk", expr: "dizzy", sym: ["spiral", "sweat"], pos: zuzuPos, yaw: zuzuYaw, clipT: walkClip("zuzu") },
  { at: ZUZU.oops + 26, clip: "walk", expr: "dizzy", sym: ["spiral"], pos: zuzuPos, yaw: zuzuYaw, clipT: walkClip("zuzu") },
  // done: she stops on her last tile and turns to the camera side, still dizzy
  { at: BEAT.walkEnd, clip: "dizzy", expr: "dizzy", sym: ["spiral"], pos: ZUZU_END, yaw: 0.35 },
  // the close-up looks back along the tape from beyond her: she faces that camera
  { at: BEAT.tape, clip: "dizzy", expr: "dizzy", sym: ["spiral"], pos: ZUZU_END, yaw: -0.28, cut: true },
  { at: ZUZU.shocked, clip: "idle", expr: "shocked", sym: [], pos: ZUZU_END, yaw: -0.28 },
  { at: BEAT.twist, clip: "idle", expr: "squint", pos: ZUZU_END, yaw: 0.2, cut: true },
  { at: BEAT.results, clip: "dizzy", expr: "dizzy", sym: ["spiral"], pos: LINE.zuzu, yaw: -0.15, cut: true },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: ASIDE.zuzu, yaw: -0.4, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.zuzu, yaw: -0.1, cut: true },
  { at: BEAT.cta + 4, clip: "cheer", expr: "happy", pos: LINE.zuzu, yaw: -0.1 },
];

const lumiSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: lumiPos, yaw: -0.3 },
  { at: BEAT.go, clip: "idle", expr: "neutral", pos: lumiPos, yaw: Math.PI, cut: true },
  { at: BEAT.walk, clip: "walk", expr: "neutral", pos: lumiPos, yaw: Math.PI, clipT: walkClip("lumi") },
  // at tile 100 she turns round and waits by the brass medallion
  { at: BEAT.walkEnd, clip: "idle", expr: "neutral", pos: LUMI_END, yaw: 0 },
  { at: BEAT.results, clip: "idle", expr: "neutral", pos: LINE.lumi, yaw: -0.25, cut: true },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: REVEAL_SPOT, yaw: -0.1, cut: true },
  { at: LUMI.point, clip: "point", expr: "happy", pos: REVEAL_SPOT, yaw: -0.35 },
  { at: LUMI.glint, clip: "point", expr: "glint", pos: REVEAL_SPOT, yaw: -0.35, t0: (LUMI.glint - LUMI.point) / FPS },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.lumi, yaw: -0.3, cut: true },
  { at: LUMI.cheer, clip: "cheer", expr: "happy", pos: LINE.lumi, yaw: -0.3 },
];

const annaSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "smug", pos: SPIN_ANNA, yaw: Math.PI / 2 },
  ...ANNA.push.map((at): Seg => ({ at, clip: "push_hands", expr: "smug", pos: SPIN_ANNA, yaw: Math.PI / 2 })),
  { at: BEAT.spinEnd, clip: "idle", expr: "smug", pos: SPIN_ANNA, yaw: 0.9 },
  // the bet: pointing up the plaza (far!)
  { at: ANNA.bet, clip: "point", expr: "smug", sym: ["sparkle"], pos: SPIN_ANNA, yaw: 0.55, t0: 1.0 },
  { at: ANNA.bet + 50, clip: "idle", expr: "smug", sym: ["sparkle"], pos: SPIN_ANNA, yaw: 0.6 },
  { at: BEAT.go, clip: "idle", expr: "smug", pos: WATCH.anna, yaw: 2.4, cut: true },
  { at: BEAT.walk + 200, clip: "foot_tap", expr: "squint", pos: WATCH.anna, yaw: 2.4 },
  { at: BEAT.twist, clip: "idle", expr: "squint", pos: WATCH.anna, yaw: 2.2, cut: true },
  // results: shocked, then sulking
  { at: ANNA.shocked, clip: "idle", expr: "shocked", sym: ["exclaim"], pos: LINE.anna, yaw: 0.15, cut: true },
  { at: ANNA.sad, clip: "sad", expr: "crying", sym: ["sweat"], pos: LINE.anna, yaw: 0.15 },
  { at: BEAT.reveal, clip: "idle", expr: "shocked", pos: ASIDE.anna, yaw: 0.4, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.anna, yaw: 0.1, cut: true },
  { at: ANNA.cheer, clip: "cheer", expr: "happy", pos: LINE.anna, yaw: 0.1 },
];

const miyuSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "squint", pos: MIYU_HOOK, yaw: -0.5 },
  { at: MIYU.bet, clip: "idle", expr: "squint", pos: MIYU_HOOK, yaw: -0.25 },
  { at: BEAT.go, clip: "idle", expr: "squint", pos: WATCH.miyu, yaw: -2.4, cut: true },
  // measuring: tape case on the ring, pointing along the tape to Zuzu
  { at: BEAT.drone, clip: "idle", expr: "squint", pos: MIYU_MEASURE, yaw: toward(MIYU_MEASURE, ZUZU_END), cut: true },
  { at: MIYU.measure, clip: "point", expr: "squint", pos: MIYU_MEASURE, yaw: toward(MIYU_MEASURE, ZUZU_END), cut: true, t0: 1.0 },
  { at: BEAT.twist, clip: "idle", expr: "squint", pos: WATCH.miyu, yaw: -2.2, cut: true },
  { at: BEAT.results, clip: "idle", expr: "neutral", pos: LINE.miyu, yaw: 0.25, cut: true },
  { at: MIYU.happy, clip: "idle", expr: "happy", sym: ["sparkle"], pos: LINE.miyu, yaw: 0.25 },
  { at: BEAT.reveal, clip: "idle", expr: "neutral", pos: ASIDE.miyu, yaw: 0.45, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: LINE.miyu, yaw: 0.3, cut: true },
  { at: MIYU.cheer, clip: "cheer", expr: "happy", pos: LINE.miyu, yaw: 0.3 },
];

const BY: Record<Member, (f: number) => ActorState> = {
  anna: play("anna", annaSegs),
  miyu: play("miyu", miyuSegs),
  lumi: play("lumi", lumiSegs),
  zuzu: play("zuzu", zuzuSegs),
};
export const ACTING = (m: Member, f: number): ActorState => BY[m](f);

/** World clock (s) for the set's flicker, haze and dust. */
export const worldTime = (f: number) => f / FPS;

// ---------------------------------------------------------------- what the floor shows

/** Trails drawn up to s steps; Zuzu's dims during the ghost run so the cloud reads first. */
export const trailState = (f: number) => {
  const s = walkAt(f);
  const dim = f >= BEAT.twist && f < BEAT.results ? 0.4 : 1;
  return { s, zuzuOpacity: 0.85 * dim, lumiOpacity: 0.6 * dim, show: f >= BEAT.walk };
};

/** Ghost k pops in at the start ring (staggered), then walks; a little hop on every step. */
export const GHOST_POP = { from: BEAT.twist + 6, stagger: 0.3, len: 8 } as const;
export const ghostScale = (k: number, f: number) => {
  const x = Math.min(1, Math.max(0, (f - GHOST_POP.from - k * GHOST_POP.stagger) / GHOST_POP.len));
  if (x <= 0) return 0;
  // ease-out-back pop
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
export const ghostsVisible = (f: number) => f >= GHOST_POP.from && f < BEAT.results;

/** The √n ring grows with the ghosts' step count (radius √s tiles). */
export const ringRadiusTiles = (f: number) => (f < RUN.start || f >= BEAT.results ? 0 : Math.sqrt(runAt(f)));

// ---------------------------------------------------------------- camera-dependent look

/** Fog density scale (the high shots look through much less air). */
export const FOG_SCALE = { ground: 1, high: 0.55, drone: 0.12, overhead: 0.3 } as const;

// ---------------------------------------------------------------- overlays timing

/** Notebook panel A (walk: Lumi vs Zuzu, 0-100 tiles) and B (ghost run: RMS vs √n, 0-15 tiles). */
export const PANEL_A = { from: BEAT.walk - 6, to: BEAT.walkEnd + 34 } as const;
export const PANEL_B = { from: RUN.start - 18, to: BEAT.results - 8 } as const;
export const RESULT_POPS = [BEAT.results + 16, BEAT.results + 30, BEAT.results + 44];
export const RESULT_OUTS = [BEAT.reveal - 16, BEAT.reveal - 14, BEAT.reveal - 12];
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };
export const BADGES = {
  fast: { from: BEAT.walk + 4, to: BEAT.walkEnd - 2 },
  rule: { from: BEAT.walk + 10, to: BEAT.walk + 150 },
  line: { from: BEAT.drone + 6, to: BEAT.twist - 4 },
  run: { from: RUN.start + 2, to: RUN_END },
};
/** Distance tags in the world (tape ends, the ring). */
export const TAGS = {
  lumi: { from: TAPE.lumi.to, to: BEAT.tape },
  zuzuDrone: { from: TAPE.zuzu.to, to: BEAT.tape },
  zuzuCu: { from: TAPE.cu.to, to: BEAT.twist },
  ring: { from: RUN.start + 10, to: BEAT.results },
} as const;

// ---------------------------------------------------------------- captions (every number from data.ts)

const REV = reversals().length;
export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.bets, text: `${STEPS} dizzy steps. How far does Zuzu get?`, variant: "hook", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.bets, to: BEAT.miyuBet, speaker: "anna", text: "She'll zoom off. 50 tiles, easy!" },
  { from: BEAT.miyuBet, to: BEAT.go, speaker: "miyu", text: "…she'll end up close." },
  { from: BEAT.go, to: BEAT.walk + 26, text: "GO!", variant: "big" },
  { from: BEAT.walk + 26, to: BEAT.walk + 150, text: "Each step: 1 tile N, E, S or W" },
  { from: BEAT.walk + 150, to: BEAT.walkEnd, text: `Lumi: ${STEPS} steps, all north` },
  { from: BEAT.walkEnd, to: BEAT.tape, text: `${STEPS} steps each. Miyu measures!` },
  { from: BEAT.tape, to: BEAT.tape + 64, text: `Lumi: ${FINAL.lumi()} tiles · Zuzu: ${tiles(FINAL.zuzu())}` },
  { from: BEAT.tape + 64, to: BEAT.twist, text: `${REV} of her steps undid the one before` },
  { from: BEAT.twist, to: RUN.start + 50, text: `What if ${GHOSTS} Zuzus tried?`, sticker: { text: "Twist!", at: BEAT.twist + 12, top: 330 } },
  { from: RUN.start + 50, to: RUN_END, text: "Each ghost: its own random steps" },
  // the final number only once the last ghost has taken its 100th step
  { from: RUN_END, to: BEAT.results, text: `Typical distance (RMS): ${tiles(ghostRms(STEPS))} tiles` },
  { from: BEAT.results, to: BEAT.reveal, text: "Straight vs random" },
  { from: BEAT.reveal, to: BEAT.cta, text: "Why only about 10?" },
  { from: BEAT.cta, to: BEAT.end, text: "New spin, new walk. Still about √n." },
];
