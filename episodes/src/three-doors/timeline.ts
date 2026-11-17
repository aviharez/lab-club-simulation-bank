// Beat sheet + per-frame acting for EP04 "Three Doors".
// Pure functions of the frame: Scene3D, the overlays, sound.ts and the report all read this file, so picture,
// sound and report can never drift apart. Every door, prize and count comes from data.ts (seeded Monty Hall).
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { GAME_SHOW } from "../sets/game-show-studio/layout.ts";
import { doorLabel, pct, rateAfter, ROUNDS, rounds, totalWins, winsAfter, type Door, type Member, type Player, type Round } from "./data.ts";

export const FPS = 30;

export const BEAT = {
  hook: 0,
  bets: 90,
  anna: 165, // slow round 1: Anna stays
  miyu: 420, // slow round 2: Miyu switches
  luck: 622, // "Just luck!"
  twist: 672, // Lumi: "Let's play 1,000 times."
  montage: 732, // split montage, rounds 2..1000
  results: 1037,
  reveal: 1152,
  cta: 1302,
  end: 1402, // 46.7 s
} as const;
export const DURATION = BEAT.end;

const G = GAME_SHOW;
type V3 = [number, number, number];
const Y = G.stageY;

// ---------------------------------------------------------------- the two slow rounds (round 1 of each stream)

export const SLOW: Record<Player, Round> = { anna: rounds("anna")[0], miyu: rounds("miyu")[0] };
/** Frames of each slow round: pick (point + glow), Lumi opens a duck door, the question, the decision, the final door. */
export const ROUND_AT: Record<Player, { pick: number; host: number; ask: number; decide: number; open: number; rest?: number }> = {
  anna: { pick: BEAT.anna + 14, host: BEAT.anna + 86, ask: BEAT.anna + 112, decide: BEAT.anna + 138, open: BEAT.anna + 176, rest: BEAT.anna + 214 },
  miyu: { pick: BEAT.miyu + 12, host: BEAT.miyu + 50, ask: BEAT.miyu + 70, decide: BEAT.miyu + 88, open: BEAT.miyu + 126 },
};
/** doors swing open over this many frames */
export const OPEN_LEN = 14;

const ramp = (f: number, at: number, len = OPEN_LEN) => {
  const t = Math.min(1, Math.max(0, (f - at) / len));
  return t * t * (3 - 2 * t);
};

export type DoorsState = { open: [number, number, number]; glow: [number, number, number]; prizes: ["trophy" | "duck", "trophy" | "duck", "trophy" | "duck"]; shine: number; player: Player | null };

const prizesOf = (r: Round) => [0, 1, 2].map((d) => (d === r.prize ? "trophy" : "duck")) as DoorsState["prizes"];

/** The main doors at frame f (closed and reset between rounds, on a cut). */
export const doorsAt = (f: number): DoorsState => {
  const closed: DoorsState = { open: [0, 0, 0], glow: [0, 0, 0], prizes: prizesOf(SLOW.anna), shine: 0, player: null };
  const p: Player | null = f >= BEAT.anna && f < BEAT.miyu ? "anna" : f >= BEAT.miyu && f < BEAT.twist ? "miyu" : null;
  if (!p) return closed;
  const r = SLOW[p];
  const at = ROUND_AT[p];
  const open: [number, number, number] = [0, 0, 0];
  const glow: [number, number, number] = [0, 0, 0];
  open[r.opened] = ramp(f, at.host);
  open[r.final] = Math.max(open[r.final], ramp(f, at.open));
  if (at.rest !== undefined) open[r.prize] = Math.max(open[r.prize], ramp(f, at.rest));
  // the pick glows; on a switch the glow moves to the final door at the decision
  const chosen = f >= at.decide ? r.final : r.pick;
  if (f >= at.pick + 8) glow[chosen] = Math.min(1, (f - at.pick - 8) / 6) * (f >= at.open + OPEN_LEN ? 0.4 : 1);
  const shine = r.win ? ramp(f, at.open + 6, 10) : 0;
  return { open, glow, prizes: prizesOf(r), shine, player: p };
};

// ---------------------------------------------------------------- the montage: rounds 2..1000, accelerating

export const MONTAGE = { from: BEAT.montage + 10, to: BEAT.results - 26 } as const;
const ACCEL = 1.45;
/** Continuous round counter: 1 (the slow round) at MONTAGE.from, exactly ROUNDS at MONTAGE.to. */
export const roundsX = (f: number) => {
  if (f <= MONTAGE.from) return 1;
  if (f >= MONTAGE.to) return ROUNDS;
  const u = (f - MONTAGE.from) / (MONTAGE.to - MONTAGE.from);
  return Math.min(ROUNDS, ROUNDS ** (u ** ACCEL));
};
/** Completed rounds shown at frame f (integer; before the montage only the slow round). */
export const played = (f: number) => (f < BEAT.montage ? 1 : Math.floor(roundsX(f) + 1e-9));
/** Rounds a player has finished at frame f: her slow round counts once its door is open; then the montage. */
export const playedBy = (p: Player, f: number) => (f >= BEAT.montage ? played(f) : f >= (p === "anna" ? ANNA.duck : MIYU.win) ? 1 : 0);
/** Scoreboard + counters at frame f (every number on screen comes from here). */
export const scoreAt = (p: Player, f: number) => {
  const n = playedBy(p, f);
  return { n, wins: winsAfter(p, n), rate: n ? rateAfter(p, n) : 0 };
};
/** Rounds per frame at f (for the strobe threshold and the tick SFX). */
export const roundRate = (f: number) => roundsX(f + 0.5) - roundsX(f - 0.5);
/** Slower than this many rounds per frame, each mini round is acted out (pick, Lumi opens, final door). */
export const ACTED_RATE = 1 / 9;

/** Mini stage k (0 = STAY / Anna, 1 = SWITCH / Miyu) at frame f: door open amounts + prizes from a real round. */
export const miniAt = (k: 0 | 1, f: number): { open: [number, number, number]; prizes: DoorsState["prizes"]; round: Round } => {
  const p: Player = k === 0 ? "anna" : "miyu";
  const rs = rounds(p);
  const x = roundsX(f);
  if (f < MONTAGE.from) {
    // waiting: the slow round's result on show
    const r = rs[0];
    const open: [number, number, number] = [0, 0, 0];
    open[r.opened] = 0.9;
    open[r.final] = 0.9;
    return { open, prizes: prizesOf(r), round: r };
  }
  if (x >= ROUNDS) {
    const r = rs[ROUNDS - 1];
    const open: [number, number, number] = [0, 0, 0];
    open[r.opened] = 0.9;
    open[r.final] = 0.9;
    return { open, prizes: prizesOf(r), round: r };
  }
  if (roundRate(f) < ACTED_RATE) {
    // acting out round floor(x)+1: pick → Lumi opens a duck → final door opens
    const r = rs[Math.floor(x)];
    const ph = x - Math.floor(x);
    const open: [number, number, number] = [0, 0, 0];
    const s = (a: number, b: number) => Math.min(1, Math.max(0, (ph - a) / (b - a)));
    open[r.opened] = 0.9 * s(0.2, 0.42);
    open[r.final] = Math.max(open[r.final], 0.9 * s(0.5, 0.72));
    // close everything in the last bit so the next round starts closed
    const close = 1 - s(0.9, 1);
    return { open: open.map((v) => v * close) as [number, number, number], prizes: prizesOf(r), round: r };
  }
  // fast: show the last finished round's result (held 2 frames so it reads as rounds, not noise)
  const ff = f - (f % 2);
  const r = rs[Math.max(0, Math.floor(roundsX(ff)) - 1)];
  const open: [number, number, number] = [0, 0, 0];
  open[r.opened] = 0.9;
  open[r.final] = 0.9;
  return { open, prizes: prizesOf(r), round: r };
};

// ---------------------------------------------------------------- staging

export const MARK: V3 = [G.playerMark[0], Y, G.playerMark[2]];
const LEFT: V3 = [-1.15, Y, 0.8];
const RIGHT: V3 = [1.15, Y, 0.8];
const MINI_SPOT: Record<Player, V3> = {
  anna: [G.mini.centers[0][0], G.mini.top, G.mini.centers[0][2] + 0.45],
  miyu: [G.mini.centers[1][0], G.mini.top, G.mini.centers[1][2] + 0.45],
};
const RESULT_SPOT: Record<Player, V3> = { anna: [-0.5, Y, 0.55], miyu: [0.5, Y, 0.55] };
/** CTA: the whole cast in one line in front of the doors */
export const CTA_SPOT: Record<Member, V3> = { zuzu: [-0.92, Y, 0.95], anna: [-0.31, Y, 0.8], miyu: [0.31, Y, 0.8], lumi: [0.92, Y, 0.95] };
export const LUMI_SPOT: V3 = [G.podium.pos[0] - 0.35, Y, G.podium.pos[2] - 0.25];
export const ZUZU_SPOT: V3 = [G.zuzuSpot[0], Y, G.zuzuSpot[2]];
/** yaw (0 = facing +z) from a to b on the floor */
const yawTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
const doorPoint = (d: Door): V3 => [G.doorX[d], Y, G.doorZ];
/** the point clip raises the arm 1.4-1.9 s in: door pointing starts 1 s into the clip */
const POINT_T0 = 1.0;
/** pointing at a door: turned part of the way only, so the face stays to camera (the arm still points at it) */
const pointYaw = (from: V3, d: Door, front: number) => lerpAngle(front, yawTo(from, doorPoint(d)), 0.35);

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

type Seg = { at: number; clip: string; expr: string; sym?: SymbolKind[]; pos: V3; yaw: number; cut?: boolean; t0?: number };

const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const BLEND = 8;
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
const clipTime = (m: Member, s: Seg, f: number) => (s.clip === "idle" ? f / FPS + IDLE_OFFSET[m] : (f - s.at) / FPS + (s.t0 ?? 0));

const play = (m: Member, segs: Seg[]) => (f: number): ActorState => {
  let i = 0;
  while (i + 1 < segs.length && segs[i + 1].at <= f) i++;
  const s = segs[i];
  const prev = i > 0 && !s.cut ? segs[i - 1] : undefined;
  const k = prev ? smooth((f - s.at) / BLEND) : 1;
  // a symbol keeps the frame it first appeared on while consecutive segments keep showing it
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

const A = ROUND_AT.anna;
const M = ROUND_AT.miyu;
/** facing the main camera side (front, a little right: the 3/4 door shots look from there) */
const FRONT = 0.35;
const MONTAGE_LEN = MONTAGE.to - MONTAGE.from;
export const ANNA = {
  bet: BEAT.bets + 8,
  pick: A.pick,
  decide: A.decide,
  duck: A.open + 10,
  fret: MONTAGE.from + Math.round(MONTAGE_LEN * 0.42),
  cry: MONTAGE.from + Math.round(MONTAGE_LEN * 0.8),
  cheer: BEAT.cta + 8,
};
export const MIYU = { bet: BEAT.bets + 40, pick: M.pick, decide: M.decide, win: M.open + 10, calm: MONTAGE.from, smile: MONTAGE.to - 6, cheer: BEAT.cta + 2 };
export const LUMI = { hook: 20, hostA: A.host - 10, askA: A.ask, hostM: M.host - 10, sign: BEAT.twist + 4, point: BEAT.reveal + 4, glint: BEAT.reveal + 24, cheer: BEAT.cta + 12 };
export const ZUZU = { cheer: M.open + 46, sign: M.open + 108, cta: BEAT.cta + 4 };

const annaSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: MARK, yaw: FRONT },
  { at: ANNA.bet, clip: "idle", expr: "smug", sym: ["sparkle"], pos: MARK, yaw: FRONT },
  { at: BEAT.anna, clip: "idle", expr: "happy", pos: MARK, yaw: FRONT, cut: true },
  { at: A.pick, clip: "point", expr: "smug", pos: MARK, yaw: pointYaw(MARK, SLOW.anna.pick, FRONT), t0: POINT_T0 },
  { at: A.pick + 42, clip: "idle", expr: "smug", pos: MARK, yaw: FRONT },
  { at: A.host + 16, clip: "idle", expr: "happy", pos: MARK, yaw: FRONT },
  { at: A.decide, clip: "foot_tap", expr: "smug", sym: ["sparkle"], pos: MARK, yaw: FRONT },
  { at: A.open - 6, clip: "idle", expr: "smug", pos: MARK, yaw: FRONT },
  { at: ANNA.duck, clip: "idle", expr: "shocked", sym: ["exclaim"], pos: MARK, yaw: FRONT },
  { at: (A.rest ?? 0) + 14, clip: "idle", expr: "shocked", sym: ["exclaim", "sweat"], pos: MARK, yaw: FRONT },
  // Miyu's round: Anna watches from the left
  { at: BEAT.miyu, clip: "idle", expr: "squint", pos: LEFT, yaw: 0.25, cut: true },
  { at: MIYU.win + 4, clip: "idle", expr: "shocked", sym: ["exclaim"], pos: LEFT, yaw: 0.25 },
  { at: BEAT.luck, clip: "foot_tap", expr: "squint", sym: ["anger"], pos: LEFT, yaw: 0.4 },
  { at: BEAT.twist, clip: "idle", expr: "shocked", pos: LEFT, yaw: 0.4 },
  // the montage: STAY stage
  { at: BEAT.montage, clip: "idle", expr: "smug", pos: MINI_SPOT.anna, yaw: -0.35, cut: true },
  { at: ANNA.fret, clip: "foot_tap", expr: "squint", sym: ["anger"], pos: MINI_SPOT.anna, yaw: -0.35 },
  { at: ANNA.cry, clip: "sad", expr: "crying", sym: ["sweat"], pos: MINI_SPOT.anna, yaw: -0.35 },
  { at: BEAT.results, clip: "sad", expr: "crying", sym: ["sweat"], pos: RESULT_SPOT.anna, yaw: 0.2, cut: true, t0: 0.6 },
  { at: BEAT.reveal, clip: "idle", expr: "shocked", pos: LEFT, yaw: 0.25, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.anna, yaw: 0.1, cut: true },
  { at: ANNA.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.anna, yaw: 0.1 },
];

const miyuSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: RIGHT, yaw: -0.3 },
  { at: MIYU.bet, clip: "idle", expr: "squint", sym: ["zzz"], pos: RIGHT, yaw: -0.3 },
  { at: BEAT.anna, clip: "idle", expr: "squint", pos: RIGHT, yaw: -0.3, cut: true },
  // her round
  { at: BEAT.miyu, clip: "idle", expr: "squint", pos: MARK, yaw: FRONT, cut: true },
  { at: M.pick, clip: "point", expr: "neutral", pos: MARK, yaw: pointYaw(MARK, SLOW.miyu.pick, FRONT), t0: POINT_T0 },
  { at: M.pick + 34, clip: "idle", expr: "squint", pos: MARK, yaw: FRONT },
  // the switch is played to the close-up (face to camera): the glow jumps to the new door behind her
  { at: M.decide, clip: "idle", expr: "squint", sym: ["sparkle"], pos: MARK, yaw: FRONT - 0.15 },
  { at: MIYU.win, clip: "idle", expr: "happy", sym: ["sparkle"], pos: MARK, yaw: FRONT },
  { at: BEAT.luck, clip: "idle", expr: "squint", sym: ["zzz"], pos: MARK, yaw: -0.2 },
  // the montage: SWITCH stage, calm the whole way
  { at: BEAT.montage, clip: "idle", expr: "squint", pos: MINI_SPOT.miyu, yaw: -0.45, cut: true },
  { at: MIYU.smile, clip: "idle", expr: "happy", sym: ["sparkle"], pos: MINI_SPOT.miyu, yaw: -0.45 },
  { at: BEAT.results, clip: "idle", expr: "happy", sym: ["sparkle"], pos: RESULT_SPOT.miyu, yaw: -0.2, cut: true },
  { at: BEAT.reveal, clip: "idle", expr: "happy", pos: RIGHT, yaw: -0.3, cut: true },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.miyu, yaw: -0.1, cut: true },
  { at: MIYU.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.miyu, yaw: -0.1 },
];

const LUMI_YAW = -0.75;
const lumiSegs: Seg[] = [
  { at: 0, clip: "idle", expr: "neutral", pos: LUMI_SPOT, yaw: LUMI_YAW },
  { at: LUMI.hook, clip: "point", expr: "happy", pos: LUMI_SPOT, yaw: -1.1 },
  { at: LUMI.hook + 60, clip: "idle", expr: "happy", pos: LUMI_SPOT, yaw: LUMI_YAW },
  { at: LUMI.hostA, clip: "point", expr: "happy", pos: LUMI_SPOT, yaw: pointYaw(LUMI_SPOT, SLOW.anna.opened, LUMI_YAW), t0: POINT_T0 },
  { at: LUMI.askA, clip: "idle", expr: "squint", sym: ["question"], pos: LUMI_SPOT, yaw: LUMI_YAW },
  { at: A.decide + 10, clip: "idle", expr: "neutral", pos: LUMI_SPOT, yaw: LUMI_YAW },
  { at: LUMI.hostM, clip: "point", expr: "happy", pos: LUMI_SPOT, yaw: pointYaw(LUMI_SPOT, SLOW.miyu.opened, LUMI_YAW), t0: POINT_T0 },
  { at: LUMI.hostM + 40, clip: "idle", expr: "neutral", pos: LUMI_SPOT, yaw: LUMI_YAW },
  { at: LUMI.sign, clip: "hold_sign", expr: "happy", sym: ["sparkle"], pos: LUMI_SPOT, yaw: -0.45 },
  { at: BEAT.montage, clip: "idle", expr: "neutral", pos: LUMI_SPOT, yaw: LUMI_YAW, cut: true },
  { at: LUMI.point, clip: "point", expr: "happy", pos: LUMI_SPOT, yaw: -0.45 },
  { at: LUMI.glint, clip: "point", expr: "glint", pos: LUMI_SPOT, yaw: -0.45, t0: (LUMI.glint - LUMI.point) / FPS },
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.lumi, yaw: -0.3, cut: true },
  { at: LUMI.cheer, clip: "cheer", expr: "happy", pos: CTA_SPOT.lumi, yaw: -0.3 },
];

const zuzuSegs: Seg[] = [
  { at: 0, clip: "hold_sign", expr: "happy", pos: ZUZU_SPOT, yaw: 0.45 },
  // her moment keeps the sign up: the sign sits at a fixed grip and cannot follow cheering arms
  { at: ZUZU.cheer, clip: "hold_sign", expr: "happy", sym: ["sparkle"], pos: ZUZU_SPOT, yaw: 0.35 },
  { at: ZUZU.sign, clip: "hold_sign", expr: "happy", pos: ZUZU_SPOT, yaw: 0.45 },
  // the CTA: sign down, into the line, cheer
  { at: BEAT.cta, clip: "idle", expr: "happy", pos: CTA_SPOT.zuzu, yaw: 0.3, cut: true },
  { at: ZUZU.cta, clip: "cheer", expr: "happy", pos: CTA_SPOT.zuzu, yaw: 0.3 },
];

const BY: Record<Member, (f: number) => ActorState> = {
  anna: play("anna", annaSegs),
  miyu: play("miyu", miyuSegs),
  lumi: play("lumi", lumiSegs),
  zuzu: play("zuzu", zuzuSegs),
};
export const ACTING = (m: Member, f: number): ActorState => BY[m](f);

/** World clock (s) for the set's bulbs, spots, LED wall and haze. */
export const worldTime = (f: number) => f / FPS;

// ---------------------------------------------------------------- signs (both on two sticks between the hands)

/** hold_sign hands measured on the rigs (tail of L_Hand / R_Hand, metres, actor frame): mid-point + gap */
export const SIGN_GRIP: Record<"zuzu" | "lumi", { fwd: number; right: number; up: number; gap: number }> = {
  zuzu: { fwd: 0.033, right: -0.009, up: 0.615, gap: 0.475 },
  lumi: { fwd: 0.059, right: -0.006, up: 0.591, gap: 0.47 },
};
export const gripAt = (p: V3, yaw: number, g: { fwd: number; right: number; up: number }): V3 => [
  p[0] + g.fwd * Math.sin(yaw) - g.right * Math.cos(yaw),
  p[1] + g.up,
  p[2] + g.fwd * Math.cos(yaw) + g.right * Math.sin(yaw),
];
/** Sign scale 0..1: up while the clip is hold_sign (pops in/out over the clip crossfade). */
export const signScale = (m: "zuzu" | "lumi", f: number) => {
  const s = ACTING(m, f);
  if (s.clip === "hold_sign") return s.from ? 1 - s.from.weight : 1;
  return s.from?.clip === "hold_sign" ? s.from.weight : 0;
};

// ---------------------------------------------------------------- overlays timing

export const CHART = { from: BEAT.montage + 4, to: BEAT.results - 6 } as const;
export const COUNTERS = { from: BEAT.montage + 8, to: BEAT.results - 4 } as const;
export const RESULT_POPS = [BEAT.results + 18, BEAT.results + 34];
export const RESULT_OUTS = [BEAT.reveal - 16, BEAT.reveal - 13];
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };
/** Badges: the montage speed note and the simplification label */
export const BADGES = { fast: { from: BEAT.montage + 14, to: MONTAGE.to }, rules: { from: BEAT.anna + 4, to: BEAT.twist - 4 } };

const n1000 = ROUNDS.toLocaleString("en-US");
export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.bets, text: "One door hides a trophy. Stay or switch?", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.bets, to: MIYU.bet, text: "Anna: “I always STAY!”" },
  { from: MIYU.bet, to: BEAT.anna, text: "Miyu: “I'll switch…”" },
  { from: BEAT.anna, to: A.host - 4, text: `Round 1 · Anna picks door ${doorLabel(SLOW.anna.pick)}` },
  { from: A.host - 4, to: A.ask, text: `Lumi opens door ${doorLabel(SLOW.anna.opened)}: a duck!` },
  { from: A.ask, to: A.decide, text: "Lumi: “Stay or switch?”" },
  { from: A.decide, to: ANNA.duck, text: `Anna stays on door ${doorLabel(SLOW.anna.final)}` },
  { from: ANNA.duck, to: BEAT.miyu, text: `Duck! The trophy was behind door ${doorLabel(SLOW.anna.prize)}`, variant: undefined },
  { from: BEAT.miyu, to: M.host - 4, text: `Round 1 · Miyu picks door ${doorLabel(SLOW.miyu.pick)}` },
  { from: M.host - 4, to: M.decide, text: `Lumi opens door ${doorLabel(SLOW.miyu.opened)}: a duck!` },
  { from: M.decide, to: MIYU.win, text: `Miyu switches to door ${doorLabel(SLOW.miyu.final)}` },
  { from: MIYU.win, to: BEAT.luck, text: "TROPHY!", variant: "big" },
  { from: BEAT.luck, to: BEAT.twist, text: "Anna: “That was just luck!”" },
  { from: BEAT.twist, to: BEAT.montage + 30, text: `Lumi: “Let's play ${n1000} times.”`, sticker: { text: "Twist!", at: BEAT.twist + 12 } },
  { from: BEAT.montage + 30, to: BEAT.results, text: `Stay vs switch · ${n1000} rounds each` },
  { from: BEAT.results, to: BEAT.reveal, text: `Stay ${pct(totalWins("anna") / ROUNDS)} · Switch ${pct(totalWins("miyu") / ROUNDS)}` },
  { from: BEAT.reveal, to: BEAT.cta, text: "Why does switching win?" },
  { from: BEAT.cta, to: BEAT.end, text: "Three Doors" },
];
