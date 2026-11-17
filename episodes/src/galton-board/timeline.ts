// Beat sheet, pour schedule and per-frame acting for EP05 "Galton Board".
// Pure functions of the frame: Scene3D, the overlays, sound.ts and the report all read this file, so picture,
// sound and report can never drift apart. Every ball's path, bin and stacking slot comes from data.ts (seeded pour);
// this file only decides WHEN each ball leaves the funnel neck and how fast it is shown (slow-mo, then fast-forward).
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { ARCADE } from "../sets/probability-arcade/layout.ts";
import { ASIDE } from "../sets/probability-arcade/boardShots.ts";
import { BALLS, balls, BET, BINS, choose, counts, int, ROWS, type Member } from "./data.ts";

export const FPS = 30;

type V3 = [number, number, number];
const A = ARCADE;

// ---------------------------------------------------------------- the pour schedule (continuous frames)

/** Slow-mo: ball 1 alone, then balls 2..10 one after another. Fast-forward: balls 11..1,000, accelerating. */
export const POUR = {
  /** ball 1 leaves the funnel neck */
  first: 240,
  firstDur: 60,
  /** balls 2..10 */
  slowFrom: 262,
  slowGap: 13,
  slowDur: 46,
  /** ball 10 lands here; the fast-forward starts */
  fast: 412,
  /** the last ball lands here (counter = 1,000) */
  end: 712,
  /** landing times grow like x^(1/ACCEL) of the share x of the fast balls: slow at first, then faster */
  accel: 2.2,
  /** flight time of a fast ball shrinks from durA to durB frames as the time-lapse speeds up */
  durA: 44,
  durB: 26,
} as const;
export const SLOW_BALLS = 10;

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export type Flight = { launch: number; land: number; dur: number; slow: boolean };
const flightOf = (i: number): Flight => {
  const P = POUR;
  if (i === 0) return { launch: P.first, land: P.first + P.firstDur, dur: P.firstDur, slow: true };
  if (i < SLOW_BALLS) {
    const launch = P.slowFrom + (i - 1) * P.slowGap;
    return { launch, land: launch + P.slowDur, dur: P.slowDur, slow: true };
  }
  const x = (i - SLOW_BALLS + 1) / (BALLS - SLOW_BALLS);
  const land = P.fast + (P.end - P.fast) * x ** (1 / P.accel);
  const dur = P.durA + (P.durB - P.durA) * smooth((land - P.fast) / (P.end - P.fast));
  return { launch: land - dur, land, dur, slow: false };
};
let flights: Flight[] | undefined;
/** Every ball's launch / landing frame (continuous), in pour order. */
export const FLIGHTS = (): Flight[] => (flights ??= Array.from({ length: BALLS }, (_, i) => flightOf(i)));

/** Balls landed by frame f (the counter, the histogram and the stacks all use this: a ball counts once it lands). */
export const landedAt = (f: number) => {
  const F = FLIGHTS();
  let lo = 0;
  let hi = F.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (F[m].land <= f) lo = m + 1;
    else hi = m;
  }
  return lo;
};

/** The lone ball that reaches Anna's bin (the first ball of the pour with bin BET.anna). */
export const ANNA_BALL = balls().findIndex((b) => b.bin === BET.anna);
export const ANNA_LAND = Math.ceil(FLIGHTS()[ANNA_BALL].land);
export const ANNA_LAUNCH = Math.floor(FLIGHTS()[ANNA_BALL].launch);

// ---------------------------------------------------------------- beats

const L = ANNA_LAND;
export const BEAT = {
  hook: 0,
  bets: 90, // Anna bets on bin 0
  zuzuBet: 158, // Zuzu bets on the centre bin
  pour: 205, // Miyu tips the scoop into the funnel
  slow: 238, // first 10 balls, slow-mo
  fast: POUR.fast, // fast-forward pour
  annaBall: L - 34, // the lone ball heads for bin 0 (highlighted)
  grow: L + 40, // the middle keeps growing
  vs: L + 72, // bin 0 vs bin 6
  twist: POUR.end + 56, // the bell curve
  paths: POUR.end + 140, // 1 path vs 924 paths
  results: POUR.end + 236,
  reveal: POUR.end + 356,
  cta: POUR.end + 506,
  end: POUR.end + 606,
} as const;
export const DURATION = BEAT.end;

// ---------------------------------------------------------------- staging

const MIYU_POS: V3 = [0.74, A.platform.pos[1], -0.95];
const MIYU_YAW = -1.05;
const MARK = A.marks;
/** results: Anna and Zuzu side by side in front of the machine */
const RESULT_SPOT: Record<"anna" | "zuzu", V3> = { anna: [-0.45, 0, 0.5], zuzu: [0.45, 0, 0.5] };
/** reveal: Lumi centre front */
export const REVEAL_SPOT: V3 = [0.0, 0, 0.62];
/** CTA: the whole cast in a line in front of the machine */
export const CTA_SPOT: Record<Member, V3> = { zuzu: [-0.93, 0, 0.78], anna: [-0.31, 0, 0.64], miyu: [0.31, 0, 0.64], lumi: [0.93, 0, 0.78] };
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};
/** the point clip raises the arm ~1.4 s in: start 1 s into the clip */
const POINT_T0 = 1.0;

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

/** hold: freeze the clip at t0 (a held pose) */
type Seg = { at: number; clip: string; expr: string; sym?: SymbolKind[]; pos: V3; yaw: number; cut?: boolean; t0?: number; hold?: boolean };

const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const BLEND = 8;
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
    from: prev && k < 1 && prev.clip !== s.clip ? { clip: prev.clip, time: clipTime(m, prev, f), weight: 1 - k } : undefined,
    expression: s.expr,
    pos: s.pos,
    yaw: prev ? lerpAngle(prev.yaw, s.yaw, smooth((f - s.at) / 10)) : s.yaw,
    symbols,
  };
};

/** the floor cast faces the camera side, a little toward the machine */
const FRONT = { anna: 0.35, lumi: -0.25, zuzu: -0.35 };
/** beside the machine (board shots): turned toward the board */
const SIDE_YAW = { anna: 0.55, lumi: -0.7, zuzu: -0.55 };

// the camera stays on the board from the first ball to the results: the reactions are played at the results
export const ANNA = { bet: BEAT.bets + 2, shocked: BEAT.results, cry: BEAT.results + 20, cheer: BEAT.cta + 8 };
export const ZUZU = { bet: BEAT.zuzuBet + 12, cheer: BEAT.results, cta: BEAT.cta + 4 };
/** hold_drop releases the prop at frame 27 of the clip */
export const HOLD_DROP_RELEASE = 27;
export const MIYU = { drop: BEAT.pour + 3, release: BEAT.pour + 3 + HOLD_DROP_RELEASE, cheer: BEAT.cta + 2 };
export const LUMI = { hook: 24, write: BEAT.slow + 20, point: BEAT.reveal + 4, glint: BEAT.reveal + 24, cheer: BEAT.cta + 12 };

const annaSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: MARK.anna, yaw: FRONT.anna },
  // the bets are played to camera: the bin and its tag sit behind them in the close-up
  { at: ANNA.bet, clip: "point", expr: "smug", sym: ["sparkle"], pos: MARK.anna, yaw: -0.2, t0: POINT_T0 },
  { at: ANNA.bet + 46, clip: "idle", expr: "smug", sym: ["sparkle"], pos: MARK.anna, yaw: FRONT.anna },
  // beside the machine for the pour
  { at: BEAT.slow, clip: "idle", expr: "smug", pos: ASIDE.anna, yaw: SIDE_YAW.anna, cut: true },
  { at: BEAT.fast + 30, clip: "foot_tap", expr: "squint", pos: ASIDE.anna, yaw: SIDE_YAW.anna },
  // results: shocked at 1 ball vs a tower, then crying
  { at: ANNA.shocked, clip: "idle", expr: "shocked", sym: ["exclaim"], pos: RESULT_SPOT.anna, yaw: 0.2, cut: true },
  { at: ANNA.cry, clip: "sad", expr: "crying", sym: ["sweat"], pos: RESULT_SPOT.anna, yaw: 0.2 },
  { at: BEAT.reveal, clip: "idle", expr: "shocked", pos: ASIDE.anna, yaw: 0.35, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.anna, yaw: 0.1, cut: true },
  { at: ANNA.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.anna, yaw: 0.1 },
];

const zuzuSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "happy", pos: MARK.zuzu, yaw: FRONT.zuzu },
  { at: ZUZU.bet, clip: "point", expr: "happy", sym: ["sparkle"], pos: MARK.zuzu, yaw: 0.25, t0: POINT_T0 },
  { at: ZUZU.bet + 44, clip: "idle", expr: "happy", pos: MARK.zuzu, yaw: FRONT.zuzu },
  { at: BEAT.slow, clip: "idle", expr: "neutral", pos: ASIDE.zuzu, yaw: SIDE_YAW.zuzu, cut: true },
  { at: ZUZU.cheer, clip: "cheer", expr: "happy", sym: ["sparkle"], pos: RESULT_SPOT.zuzu, yaw: -0.2, cut: true },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: ASIDE.zuzu, yaw: -0.35, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.zuzu, yaw: 0.3, cut: true },
  { at: ZUZU.cta, clip: "cheer", expr: "happy", pos: CTA_SPOT.zuzu, yaw: 0.3 },
];

const miyuSegs: Seg[] = [
  // on her walkway, scoop in hand: the hold_drop clip's first pose holds it out
  { at: 0, clip: "hold_drop", expr: "squint", pos: MIYU_POS, yaw: MIYU_YAW, t0: 0, hold: true },
  { at: MIYU.drop, clip: "hold_drop", expr: "neutral", pos: MIYU_POS, yaw: MIYU_YAW, cut: true },
  { at: MIYU.release + 20, clip: "idle", expr: "neutral", pos: MIYU_POS, yaw: MIYU_YAW },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.miyu, yaw: -0.1, cut: true },
  { at: MIYU.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.miyu, yaw: -0.1 },
];

const lumiSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: MARK.lumi, yaw: FRONT.lumi },
  { at: LUMI.hook, clip: "point", expr: "happy", pos: MARK.lumi, yaw: -0.55, t0: 0.4 },
  { at: LUMI.hook + 56, clip: "idle", expr: "happy", pos: MARK.lumi, yaw: FRONT.lumi },
  { at: BEAT.slow, clip: "idle", expr: "neutral", pos: ASIDE.lumi, yaw: SIDE_YAW.lumi, cut: true },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: REVEAL_SPOT, yaw: -0.1, cut: true },
  { at: LUMI.point, clip: "point", expr: "happy", pos: REVEAL_SPOT, yaw: -0.35 },
  { at: LUMI.glint, clip: "point", expr: "glint", pos: REVEAL_SPOT, yaw: -0.35, t0: (LUMI.glint - LUMI.point) / FPS },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.lumi, yaw: -0.3, cut: true },
  { at: LUMI.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.lumi, yaw: -0.3 },
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

// ---------------------------------------------------------------- Miyu's scoop

/** hold_drop grip (measured on the rig, EP02): 0.53 m up, 0.22 m forward, 0.104 m to the actor's right */
const GRIP = { up: 0.53, fwd: 0.22, right: 0.104 };
const gripAt = (p: V3, yaw: number): V3 => [p[0] + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw), p[1] + GRIP.up, p[2] + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw)];
/** where the empty scoop rests after the pour: hooked on the funnel mouth, tipped in */
const SCOOP_REST: V3 = [0.33, A.machine.funnel.mouthY + 0.02, A.machine.glassZ - 0.02];
/** Scoop pose at f: in Miyu's hand, tipped into the funnel at the release, then left on the funnel rim (until the CTA). */
export const scoopAt = (f: number): { pos: V3; yaw: number; tilt: number; full: number } | null => {
  if (f >= BEAT.cta) return null;
  const hand = gripAt(MIYU_POS, MIYU_YAW);
  // the scoop's open end (its local +x) points the way Miyu faces
  const k = smooth((f - MIYU.release + 4) / 12);
  const pos: V3 = [hand[0] + (SCOOP_REST[0] - hand[0]) * k, hand[1] + (SCOOP_REST[1] - hand[1]) * k, hand[2] + (SCOOP_REST[2] - hand[2]) * k];
  return { pos, yaw: MIYU_YAW - Math.PI / 2, tilt: 0.2 + 1.1 * k, full: 1 - smooth((f - MIYU.release) / 10) };
};

// ---------------------------------------------------------------- overlays timing

/** The bottom notebook panel (live histogram vs the curve): the fast pour and the twist. */
export const CHART = { from: BEAT.fast - 4, to: BEAT.paths - 8 } as const;
/** The bell curve draws left → right (3D overlay and panel together). */
export const CURVE = { from: BEAT.twist + 14, to: BEAT.twist + 54 } as const;
/** The paths beat: Anna's single path, then all 924 paths into the centre bin. */
export const PATHS = { anna: BEAT.paths + 6, annaLen: 30, fan: BEAT.paths + 50, fanLen: 34 } as const;
export const RESULT_POPS = [BEAT.results + 18, BEAT.results + 34];
export const RESULT_OUTS = [BEAT.reveal - 16, BEAT.reveal - 13];
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };
export const BADGES = {
  slow: { from: BEAT.slow + 4, to: BEAT.fast - 2 },
  coin: { from: BEAT.slow + 10, to: BEAT.fast - 2 },
  fast: { from: BEAT.fast + 4, to: POUR.end },
  normal: { from: CURVE.from + 10, to: BEAT.paths - 6 },
};

// ---------------------------------------------------------------- captions (every number from data.ts)

const C = counts();
const first10 = balls().slice(0, SLOW_BALLS).map((b) => b.bin);
const distinct = new Set(first10).size;
const total = int(BALLS);
export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.bets, text: `${total} balls. Which bin wins?`, variant: "hook", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.bets, to: BEAT.zuzuBet, speaker: "anna", text: `Nobody picks bin ${BET.anna}. Mine!` },
  { from: BEAT.zuzuBet, to: BEAT.pour, speaker: "zuzu", text: `The middle, bin ${BET.zuzu}!` },
  { from: BEAT.pour, to: BEAT.slow + 12, text: "Miyu pours from the top" },
  { from: BEAT.slow + 12, to: POUR.first + POUR.firstDur + 4, text: `${ROWS} pegs: left or right, 50/50` },
  { from: POUR.first + POUR.firstDur + 4, to: BEAT.fast, text: `${SLOW_BALLS} balls, already ${distinct} bins` },
  { from: BEAT.fast, to: BEAT.annaBall, text: `Now all ${total}!` },
  { from: BEAT.annaBall, to: BEAT.grow - 14, text: `Ball #${ANNA_BALL + 1} lands in bin ${BET.anna}!` },
  { from: BEAT.grow - 14, to: BEAT.vs, text: "The middle keeps growing…" },
  { from: BEAT.vs, to: BEAT.twist, text: `Bin ${BET.anna}: ${C[BET.anna]} ${C[BET.anna] === 1 ? "ball" : "balls"} · bin ${BET.zuzu}: ${C[BET.zuzu]}` },
  { from: BEAT.twist, to: BEAT.paths, text: "The bins draw a bell curve", sticker: { text: "Twist!", at: BEAT.twist + 12, top: 330 } },
  { from: BEAT.paths, to: PATHS.fan - 4, text: `Bin ${BET.anna}: only ${choose(ROWS, BET.anna)} path (${ROWS} lefts)` },
  { from: PATHS.fan - 4, to: BEAT.results, text: `Bin ${BET.zuzu}: ${int(choose(ROWS, BET.zuzu))} different paths!` },
  { from: BEAT.results, to: BEAT.reveal, text: `Anna ${C[BET.anna]} · Zuzu ${C[BET.zuzu]}` },
  { from: BEAT.reveal, to: BEAT.cta, text: "Why a bell curve?" },
  { from: BEAT.cta, to: BEAT.end, text: "New pour, new counts. Same bell." },
];

/** The highlighted trails: the 10 slow balls (teal) and Anna's lone ball (pink). */
export const HIGHLIGHT = { slowColor: "#3fe6d6", annaColor: "#ff8fc6", fade: 26 } as const;
export const BIN_COUNT = BINS;
