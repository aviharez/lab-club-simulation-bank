// Beat sheet + per-frame acting for EP03 "Drop vs Throw".
// Pure functions of the frame: the 3D scene, the 2D overlays, sound.ts and the report all read this file,
// so picture, sound and report can never drift apart. Every ball position and time comes from data.ts.
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { SUNLIT_ATRIUM } from "../sets/sunlit-atrium/layout.ts";
import { BALL_OWNER, BALL_R, ballAt, fmt, ghostTimes, H, landDistance, landTime, launchSpeed as launchSpeedOf, SLOWMO, VX, type BallId, type Member } from "./data.ts";

export const FPS = 30;
export { SLOWMO };

export const BEAT = {
  hook: 0,
  bets: 90, // 3 s
  miyu: 196, // cut-in: Miyu has the stopwatch
  countdown: 220,
  release: 280, // both balls leave the hands on this frame (4x slow-mo from here)
  watch: 392, // Miyu's stopwatch close-up
  doubt: 470, // Anna doubles down: hers flew farther, so it must have been slower
  hint: 545, // Lumi: watch it from the side
  twist: 610, // side-view replay with ghosts (~50 %)
  react: 780,
  results: 870,
  reveal: 970,
  cta: 1110,
  end: 1210, // 40.3 s
} as const;
export const DURATION = BEAT.end;

// ---------------------------------------------------------------- the drop (straight from data.ts)

const RATE = FPS * SLOWMO; // screen frames per real second during the slow-mo
const T = landTime("dropped");
/** Real seconds since the release at (live) frame f; negative before. */
export const simTime = (f: number) => (f - BEAT.release) / RATE;
/** Fractional frame on which both balls touch the floor (same closed form for both). */
export const landFrame = (b: BallId) => BEAT.release + landTime(b) * RATE;
/** First whole frame showing a ball on the floor (bounce SFX, reactions). */
export const landOn = (b: BallId) => Math.ceil(landFrame(b) - 1e-9);
export const LAND = landOn("dropped");

/** Slow-mo from just before the release (the swing plays slowed too) until the landing has settled. */
export const SLOWMO_FROM = BEAT.release - 16;
export const SLOWMO_TO = LAND + 24;

/** World clock (s) of the live action: drives clips, dust, rays. Slowed down with the picture during the slow-mo. */
const liveWorld = (f: number) => {
  if (f <= SLOWMO_FROM) return f / FPS;
  if (f <= SLOWMO_TO) return SLOWMO_FROM / FPS + (f - SLOWMO_FROM) / RATE;
  return SLOWMO_FROM / FPS + (SLOWMO_TO - SLOWMO_FROM) / RATE + (f - SLOWMO_TO) / FPS;
};

// ---------------------------------------------------------------- the replay (twist)

/** The side-view replay re-runs the same frames: frame f shows live frame f - SHIFT (same 4x slow-mo). */
export const REPLAY = { cut: BEAT.twist, release: BEAT.twist + 34, until: BEAT.react } as const;
export const REPLAY_SHIFT = REPLAY.release - BEAT.release;
export const inReplay = (f: number) => f >= REPLAY.cut && f < REPLAY.until;
/** The live frame a picture frame shows (the replay maps back onto the drop). */
export const sceneFrame = (f: number) => (inReplay(f) ? f - REPLAY_SHIFT : f);
export const worldTime = (f: number) => liveWorld(sceneFrame(f));
const worldSince = (f: number, a: number) => liveWorld(f) - liveWorld(a);
/** Real seconds since the release in the replay (negative before its release). */
export const replayTime = (f: number) => (f - REPLAY.release) / RATE;
export const REPLAY_LAND = REPLAY.release + Math.ceil(T * RATE - 1e-9);

/** Ghost copies: one per ghost time, appearing when the replay passes it, gone at the reveal. */
export const ghostFrame = (t: number) => Math.ceil(REPLAY.release + t * RATE - 1e-9);
export const GHOSTS = ghostTimes("dropped").map((t) => ({ t, at: ghostFrame(t) }));
/** Ghosts + same-height lines are shown in the replay and again on the results shot (not in the reaction close-ups). */
export const GHOST_WINDOWS: [number, number][] = [
  [REPLAY.release, BEAT.react],
  [BEAT.results, BEAT.reveal],
];

// ---------------------------------------------------------------- staging (shared with Scene3D / camera)

const A = SUNLIT_ATRIUM;
type V3 = [number, number, number];

/** Release point of each ball (ball centre): on the edge plumb line, lowest point exactly H above the floor. */
export const RELEASE_POINT: Record<BallId, V3> = {
  dropped: [A.edgeX, H + BALL_R, A.lane.zuzu],
  thrown: [A.edgeX, H + BALL_R, A.lane.anna],
};
/** Both face the throw direction (+x), turned a little toward the camera; turned further toward it for the bets. */
const YAW = Math.PI / 2 - 0.3;
/** Anna turns a little past +x so her short swing still reaches the edge plumb line from her step (her swing still points along the lane). */
const ANNA_YAW = Math.PI / 2 + 0.3;
const FACE = 0.55;

// Right-hand paths measured on the rigs (bone tail, metres at scale 1, in the actor's frame: fwd, right, up),
// plus the palm offset where the ball sits.
type Grip = { fwd: number; right: number; up: number };
const PALM: Grip = { fwd: 0.025, right: 0.02, up: 0.005 };
const THROW_STEP = 1 / 48;
const HOLD_STEP = 1 / 12;
/** throw clip, sampled every 1/48 s (the swing is fast: 3.4 m/s at its peak) */
const THROW_HAND: [number, number, number][] = [
  [0.0203, 0.2496, 0.3718], [0.0169, 0.2492, 0.3705], [0.0132, 0.2489, 0.3692], [0.0092, 0.2486, 0.3681], [0.0044, 0.2482, 0.3670],
  [-0.0006, 0.2478, 0.3659], [-0.0064, 0.2470, 0.3649], [-0.0128, 0.2460, 0.3638], [-0.0197, 0.2445, 0.3628], [-0.0272, 0.2424, 0.3620],
  [-0.0351, 0.2399, 0.3617], [-0.0434, 0.2367, 0.3620], [-0.0517, 0.2324, 0.3626], [-0.0596, 0.2269, 0.3634], [-0.0664, 0.2203, 0.3641],
  [-0.0714, 0.2126, 0.3646], [-0.0751, 0.2046, 0.3654], [-0.0752, 0.1954, 0.3654], [-0.0741, 0.1857, 0.3657], [-0.0711, 0.1753, 0.3660],
  [-0.0669, 0.1631, 0.3662], [-0.0620, 0.1509, 0.3672], [-0.0576, 0.1380, 0.3688], [-0.0547, 0.1260, 0.3712], [-0.0524, 0.1143, 0.3740],
  [-0.0538, 0.1035, 0.3751], [-0.0555, 0.0926, 0.3748], [-0.0581, 0.0814, 0.3724], [-0.0596, 0.0713, 0.3682], [-0.0591, 0.0634, 0.3640],
  [-0.0557, 0.0638, 0.3611], [-0.0495, 0.0768, 0.3610], [-0.0384, 0.0973, 0.3637], [-0.0274, 0.1311, 0.3740], [-0.0075, 0.1549, 0.3841],
  [0.0206, 0.1688, 0.3942], [0.0634, 0.1606, 0.3925], [0.0641, 0.1341, 0.3910], [0.0421, 0.1065, 0.3960], [0.0234, 0.0987, 0.4090],
  [0.0091, 0.0904, 0.4218], [0.0207, 0.1445, 0.4408], [0.0650, 0.1735, 0.4394], [0.1324, 0.1627, 0.4231], [0.1406, 0.1494, 0.4081],
  [0.1359, 0.1410, 0.3936],
];
/** hold_drop clip, sampled every 1/12 s */
const HOLD_HAND: [number, number, number][] = [
  [0.031, 0.203, 0.398], [0.057, 0.183, 0.418], [0.115, 0.138, 0.463], [0.17, 0.096, 0.506], [0.194, 0.08, 0.524],
  [0.194, 0.076, 0.521], [0.194, 0.074, 0.52],
];
const IDLE_HAND: Record<Member, [number, number, number]> = {
  anna: [0.05, 0.226, 0.39],
  zuzu: [0.035, 0.18, 0.377],
  miyu: [0.03, 0.181, 0.375],
  lumi: [0.03, 0.18, 0.38],
};
const sampleHand = (tab: [number, number, number][], step: number, t: number): Grip => {
  const u = Math.min(tab.length - 1, Math.max(0, t / step));
  const i = Math.min(tab.length - 2, Math.floor(u));
  const k = u - i;
  const a = tab[i];
  const b = tab[i + 1];
  return { fwd: a[0] + (b[0] - a[0]) * k + PALM.fwd, right: a[1] + (b[1] - a[1]) * k + PALM.right, up: a[2] + (b[2] - a[2]) * k + PALM.up };
};
/** throw: the ball leaves the hand at the peak of the swing (0.874 s: the hand moves forward at ~2.6 m/s, matching the
 * 3 m/s launch, pointing along the lane); hold_drop: the hand opens at clip frame 27 (0.9 s) and is at rest there (a true drop from rest). */
export const THROW_RELEASE_T = 0.874;
export const HOLD_RELEASE_T = 0.9;
const HOLD_T = 0.75;
const handGrip = (m: Member, clip: string, t: number): Grip => {
  if (clip === "throw") return sampleHand(THROW_HAND, THROW_STEP, t);
  if (clip === "hold_drop") return sampleHand(HOLD_HAND, HOLD_STEP, t);
  const h = IDLE_HAND[m];
  return { fwd: h[0] + PALM.fwd, right: h[1] + PALM.right, up: h[2] + PALM.up };
};
const gripAt = (p: V3, yaw: number, g: Grip): V3 => [
  p[0] + g.fwd * Math.sin(yaw) - g.right * Math.cos(yaw),
  p[1] + g.up,
  p[2] + g.fwd * Math.cos(yaw) + g.right * Math.sin(yaw),
];
const feetFor = (target: V3, yaw: number, g: Grip, floorY: number): V3 => {
  const o = gripAt([0, 0, 0], yaw, g);
  return [target[0] - o[0], floorY, target[2] - o[2]];
};

export const SPOT: Record<Member, V3> = {
  zuzu: feetFor(RELEASE_POINT.dropped, YAW, handGrip("zuzu", "hold_drop", HOLD_RELEASE_T), A.deckY),
  anna: feetFor(RELEASE_POINT.thrown, ANNA_YAW, handGrip("anna", "throw", THROW_RELEASE_T), A.stepTop),
  miyu: [2.6, 0, 1.6],
  lumi: [3.15, 0, 2.35],
};
/** Where the measured grip puts each ball on the release instant (the set is built so this is the release point). */
export const releaseGrip = (b: BallId): V3 =>
  b === "thrown" ? gripAt(SPOT.anna, ANNA_YAW, handGrip("anna", "throw", THROW_RELEASE_T)) : gripAt(SPOT.zuzu, YAW, handGrip("zuzu", "hold_drop", HOLD_RELEASE_T));
/** World velocity of the gripping hand at the release (m/s, real time; central difference on the clip). */
export const releaseHandVelocity = (b: BallId): V3 => {
  const [pos, yaw, clip, t] = b === "thrown" ? [SPOT.anna, ANNA_YAW, "throw", THROW_RELEASE_T] as const : [SPOT.zuzu, YAW, "hold_drop", HOLD_RELEASE_T] as const;
  const m = BALL_OWNER[b];
  const h = 1 / 240;
  const a = gripAt(pos, yaw, handGrip(m, clip, t - h));
  const c = gripAt(pos, yaw, handGrip(m, clip, t + h));
  return [(c[0] - a[0]) / (2 * h), (c[1] - a[1]) / (2 * h), (c[2] - a[2]) / (2 * h)];
};
const MIYU_YAW = -0.6;
const LUMI_YAW = -0.58;

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

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const fadeOut = (f: number, at: number, len = 8) => 1 - smooth((f - at) / len);
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};

const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const idle = (m: Member, f: number) => ({ clip: "idle", time: liveWorld(f) + IDLE_OFFSET[m] });

/** Anna: throws the pink ball; bets the dropped one lands first. */
export const ANNA = {
  bet: BEAT.bets + 6,
  turn: BEAT.countdown + 2,
  throwAt: 0, // set below: the frame the throw clip starts
  shocked: LAND + 3,
  puzzled: LAND + 70,
  doubt: BEAT.doubt + 4,
  react: BEAT.react + 2,
  cheer: BEAT.cta + 8,
};
/** Clip times run on the world clock, so the swing before the release is slowed down with the ball after it. */
const throwTime = (f: number) => Math.min(2.2, THROW_RELEASE_T + worldSince(f, BEAT.release));
ANNA.throwAt = (() => {
  let f = BEAT.release;
  while (throwTime(f - 1) >= 0) f--;
  return f;
})();
const THROW_END = (() => {
  for (let f = BEAT.release; f < DURATION; f++) if (throwTime(f) >= 2.2) return f;
  return DURATION;
})();
const anna = (f: number): ActorState => {
  const yaw = lerpAngle(lerpAngle(FACE, ANNA_YAW, smooth((f - ANNA.turn) / 14)), FACE, smooth((f - ANNA.puzzled) / 16));
  const base: ActorState = { ...idle("anna", f), expression: "neutral", pos: SPOT.anna, yaw, symbols: [] };
  if (f < ANNA.throwAt)
    return {
      ...base,
      expression: f >= ANNA.bet ? "smug" : "neutral",
      symbols: f >= ANNA.bet && f < BEAT.countdown ? [{ kind: "sparkle", from: ANNA.bet }] : [],
    };
  if (f < THROW_END)
    return {
      ...base,
      clip: "throw",
      time: throwTime(f),
      from: f < ANNA.throwAt + 6 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.throwAt, 6) } : undefined,
      expression: f >= ANNA.shocked ? "shocked" : "smug",
      symbols: f >= ANNA.shocked ? [{ kind: "exclaim", from: ANNA.shocked }] : [],
    };
  // (the replay shows live frames from before the doubt, so this never plays inside it)
  if (f >= ANNA.doubt && f < BEAT.react)
    return {
      ...base,
      clip: "foot_tap",
      time: liveWorld(f) - liveWorld(ANNA.doubt),
      from: f < ANNA.doubt + 10 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.doubt, 10) } : undefined,
      expression: "smug",
      symbols: [{ kind: "sparkle", from: ANNA.doubt + 4 }],
    };
  if (f < BEAT.react) {
    const shocked = f < ANNA.puzzled;
    return {
      ...base,
      from: f < THROW_END + 8 ? { clip: "throw", time: 2.2, weight: fadeOut(f, THROW_END) } : undefined,
      expression: shocked ? "shocked" : "squint",
      symbols: shocked ? [{ kind: "exclaim", from: ANNA.shocked }, { kind: "sweat", from: ANNA.shocked + 20 }] : [{ kind: "question", from: ANNA.puzzled + 4 }],
    };
  }
  if (f < BEAT.results)
    return {
      ...base,
      clip: "sad",
      time: liveWorld(f) - liveWorld(ANNA.react),
      from: f < ANNA.react + 10 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.react, 10) } : undefined,
      expression: "shocked",
      symbols: [{ kind: "exclaim", from: ANNA.react }, { kind: "sweat", from: ANNA.react + 14 }],
    };
  if (f < ANNA.cheer)
    return { ...base, from: f < BEAT.results + 10 ? { clip: "sad", time: liveWorld(f) - liveWorld(ANNA.react), weight: fadeOut(f, BEAT.results, 10) } : undefined };
  return {
    ...base,
    clip: "cheer",
    time: liveWorld(f) - liveWorld(ANNA.cheer),
    from: f < ANNA.cheer + 10 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.cheer, 10) } : undefined,
    expression: "happy",
  };
};

/** Zuzu: drops the yellow ball; bets they land together. */
export const ZUZU = {
  bet: 150,
  turn: BEAT.countdown,
  raise: BEAT.countdown + 6,
  effort: BEAT.release - 16,
  right: LAND + 6,
  calm: LAND + 60,
  react: BEAT.react + 4,
  ctaCheer: BEAT.cta + 4,
};
const RAISE_LEN = HOLD_T * FPS;
const holdTime = (f: number) => {
  if (f < ZUZU.raise + RAISE_LEN) return Math.max(0, (f - ZUZU.raise) / FPS);
  // holds the ball out, then opens the hand on the world clock (slowed with the picture around the release)
  return Math.min(1.5, Math.max(HOLD_T, HOLD_RELEASE_T + worldSince(f, BEAT.release)));
};
const HOLD_END = (() => {
  for (let f = BEAT.release; f < DURATION; f++) if (holdTime(f) >= 1.5) return f;
  return DURATION;
})();
const zuzu = (f: number): ActorState => {
  const yaw = lerpAngle(lerpAngle(FACE, YAW, smooth((f - ZUZU.turn) / 14)), FACE, smooth((f - ZUZU.calm) / 16));
  const base: ActorState = { ...idle("zuzu", f), expression: "neutral", pos: SPOT.zuzu, yaw, symbols: [] };
  if (f < ZUZU.raise)
    return {
      ...base,
      expression: f >= ZUZU.bet ? "happy" : "neutral",
      symbols: f >= ZUZU.bet && f < BEAT.countdown ? [{ kind: "exclaim", from: ZUZU.bet }] : [],
    };
  if (f < HOLD_END)
    return {
      ...base,
      clip: "hold_drop",
      time: holdTime(f),
      from: f < ZUZU.raise + 6 ? { ...idle("zuzu", f), weight: fadeOut(f, ZUZU.raise, 6) } : undefined,
      expression: f >= ZUZU.right ? "happy" : f >= ZUZU.effort ? "squint" : "happy",
      symbols: f >= ZUZU.right ? [{ kind: "sparkle", from: ZUZU.right }] : f >= ZUZU.effort && f < BEAT.release + 4 ? [{ kind: "sweat", from: ZUZU.effort }] : [],
    };
  if (f < BEAT.react)
    return {
      ...base,
      from: f < HOLD_END + 8 ? { clip: "hold_drop", time: 1.5, weight: fadeOut(f, HOLD_END) } : undefined,
      expression: f < ZUZU.calm ? "happy" : "neutral",
      symbols: f < ZUZU.calm ? [{ kind: "sparkle", from: ZUZU.right }] : [],
    };
  if (f < BEAT.results + 30)
    return {
      ...base,
      clip: "cheer",
      time: liveWorld(f) - liveWorld(ZUZU.react),
      from: f < ZUZU.react + 8 ? { ...idle("zuzu", f), weight: fadeOut(f, ZUZU.react) } : undefined,
      expression: f >= ZUZU.react ? "happy" : "neutral",
      symbols: [{ kind: "sparkle", from: ZUZU.react + 2 }],
    };
  if (f < ZUZU.ctaCheer)
    return {
      ...base,
      from: f < BEAT.results + 40 ? { clip: "cheer", time: liveWorld(f) - liveWorld(ZUZU.react), weight: fadeOut(f, BEAT.results + 30, 10) } : undefined,
      expression: "happy",
    };
  return {
    ...base,
    clip: "cheer",
    time: liveWorld(f) - liveWorld(ZUZU.ctaCheer),
    from: f < ZUZU.ctaCheer + 10 ? { ...idle("zuzu", f), weight: fadeOut(f, ZUZU.ctaCheer, 10) } : undefined,
    expression: "happy",
  };
};

/** Miyu: on the floor with the stopwatch; smug when the others catch up. */
export const MIYU = { focus: BEAT.countdown + 30, done: LAND + 8, smug: BEAT.react + 50, cheer: BEAT.cta + 2 };
const miyu = (f: number): ActorState => {
  const base: ActorState = { ...idle("miyu", f), expression: "neutral", pos: SPOT.miyu, yaw: MIYU_YAW, symbols: [] };
  if (f < MIYU.focus) return base;
  if (f < MIYU.done) return { ...base, expression: "squint" };
  if (f < MIYU.smug) return { ...base, expression: "happy" };
  if (f < MIYU.cheer) return { ...base, expression: f < BEAT.results + 40 ? "smug" : "happy", symbols: f < BEAT.results + 40 ? [{ kind: "sparkle", from: MIYU.smug + 2 }] : [] };
  return {
    ...base,
    clip: "cheer",
    time: liveWorld(f) - liveWorld(MIYU.cheer),
    from: f < MIYU.cheer + 10 ? { ...idle("miyu", f), weight: fadeOut(f, MIYU.cheer, 10) } : undefined,
    expression: "happy",
  };
};

/** Lumi: watches, then delivers the reveal. */
export const LUMI = { hint: BEAT.hint + 4, hintEnd: BEAT.twist, point: BEAT.reveal + 4, glint: BEAT.reveal + 24, cheer: BEAT.cta + 12 };
const lumi = (f: number): ActorState => {
  const base: ActorState = { ...idle("lumi", f), expression: "neutral", pos: SPOT.lumi, yaw: LUMI_YAW, symbols: [] };
  if (f >= LUMI.hint && f < LUMI.hintEnd + 10)
    return {
      ...base,
      clip: f < LUMI.hintEnd ? "point" : "idle",
      time: f < LUMI.hintEnd ? liveWorld(f) - liveWorld(LUMI.hint) : idle("lumi", f).time,
      from:
        f < LUMI.hint + 8
          ? { ...idle("lumi", f), weight: fadeOut(f, LUMI.hint) }
          : f >= LUMI.hintEnd
            ? { clip: "point", time: liveWorld(LUMI.hintEnd) - liveWorld(LUMI.hint), weight: fadeOut(f, LUMI.hintEnd, 10) }
            : undefined,
      expression: "happy",
      symbols: [{ kind: "sparkle", from: LUMI.hint + 6 }],
    };
  if (f < LUMI.point) return { ...base, expression: f >= LAND && f < BEAT.results ? "happy" : "neutral" };
  if (f < LUMI.cheer)
    return {
      ...base,
      clip: "point",
      time: liveWorld(f) - liveWorld(LUMI.point),
      from: f < LUMI.point + 8 ? { ...idle("lumi", f), weight: fadeOut(f, LUMI.point) } : undefined,
      expression: f >= LUMI.glint ? "glint" : "happy",
    };
  return {
    ...base,
    clip: "cheer",
    time: liveWorld(f) - liveWorld(LUMI.cheer),
    from: f < LUMI.cheer + 10 ? { clip: "point", time: liveWorld(LUMI.cheer) - liveWorld(LUMI.point), weight: fadeOut(f, LUMI.cheer, 10) } : undefined,
    expression: "happy",
  };
};

const BY: Record<Member, (f: number) => ActorState> = { anna, zuzu, lumi, miyu };
/** Acting at picture frame f (the replay shows the live acting again). */
export const ACTING = (m: Member, f: number): ActorState => BY[m](sceneFrame(f));

// ---------------------------------------------------------------- balls

/** Decorative bounce after the landing (starts on the landing frame at 0; the physics ends at the touch-down). */
const bounce = (s: number) => {
  let h = 0.22;
  let len = 0.42;
  let t = s;
  for (let i = 0; i < 5; i++) {
    if (t < len) return 4 * h * (t / len) * (1 - t / len);
    t -= len;
    h *= 0.35;
    len *= 0.6;
  }
  return 0;
};

/** Decorative after the landing too: the thrown ball keeps some of its sideways speed and rolls to a stop
 * (friction), so it does not stop dead on its landing mark. The landing ghost keeps marking the measured 1.92 m. */
const ROLL_KEEP = 0.3;
const ROLL_STOP = 0.9;
const rollOn = (b: BallId, s: number) => {
  const v = launchSpeedOf(b) * ROLL_KEEP;
  const u = Math.min(s, ROLL_STOP);
  return v * u - (v / (2 * ROLL_STOP)) * u * u;
};

export type BallState = { pos: V3; phase: "hand" | "flight" | "floor"; t: number; spin: number };
/** Ball at live frame f: in the hand (measured grip), in flight (data), or on the floor (+ decorative bounce). */
const liveBall = (b: BallId, f: number): BallState => {
  const rel = RELEASE_POINT[b];
  if (f < BEAT.release) {
    const m = BALL_OWNER[b];
    const st = BY[m](f);
    const g = handGrip(m, st.clip, st.time);
    let p = gripAt(st.pos, st.yaw, g);
    if (st.from) {
      const q = gripAt(st.pos, st.yaw, handGrip(m, st.from.clip, st.from.time));
      const w = st.from.weight;
      p = [p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w, p[2] + (q[2] - p[2]) * w];
    }
    // the measured grip at the release instant is within millimetres of the release point; close that gap smoothly
    const r = releaseGrip(b);
    const k = smooth((f - (BEAT.release - 30)) / 30);
    return { pos: [p[0] + (rel[0] - r[0]) * k, p[1] + (rel[1] - r[1]) * k, p[2] + (rel[2] - r[2]) * k], phase: "hand", t: 0, spin: 0 };
  }
  const t = simTime(f);
  const s = ballAt(b, t);
  const landed = f >= landOn(b);
  const since = landed ? worldSince(f, landOn(b)) : 0;
  const hop = landed ? bounce(since) : 0;
  const carry = landed ? rollOn(b, since) : 0;
  return {
    pos: [rel[0] + s.x + carry, BALL_R + s.y + hop, rel[2]],
    phase: landed ? "floor" : "flight",
    t: Math.min(t, landTime(b)),
    spin: b === "thrown" ? -((s.x + carry) / BALL_R) * 0.5 : 0,
  };
};
export const ballState = (b: BallId, f: number) => liveBall(b, sceneFrame(f));

/** Stopwatch reading (s): counts real time from the release, stops exactly on the landing time. */
export const timerValue = (f: number) => Math.min(T, Math.max(0, simTime(sceneFrame(f))));
/** Horizontal distance of the thrown ball from the edge (m), live. */
export const distanceValue = (f: number) => ballAt("thrown", Math.max(0, simTime(sceneFrame(f)))).x;

// ---------------------------------------------------------------- overlays timing

export const COUNTDOWN = [
  { n: "3", at: BEAT.countdown + 6 },
  { n: "2", at: BEAT.countdown + 24 },
  { n: "1", at: BEAT.countdown + 42 },
  { n: "GO!", at: BEAT.release, go: true },
];
export const BADGES = {
  drag: { from: BEAT.countdown, to: BEAT.reveal - 10 },
  slowmo: { from: SLOWMO_FROM - 4, to: SLOWMO_TO },
  replaySlowmo: { from: SLOWMO_FROM + REPLAY_SHIFT - 4, to: REPLAY_LAND + 24 },
  replay: { from: REPLAY.cut + 6, to: REPLAY.until - 10 },
};
/** Stopwatch pills (2D) during the drop and Miyu's close-up. */
export const TIMERS = { from: BEAT.countdown + 30, to: BEAT.doubt - 6 };
/** Chart panel: in during the replay and the results (out for the reaction close-ups and the reveal). */
export const CHART_WINDOWS: [number, number][] = [
  [REPLAY.cut + 20, BEAT.react - 8],
  [BEAT.results + 4, BEAT.reveal - 4],
];
export const RESULT_POPS = [0, 1].map((i) => BEAT.results + 16 + i * 14);
export const RESULT_OUTS = [0, 1].map((i) => BEAT.reveal - (1 - i) * 3 - 2);
/** kit ResultCards counts its number up over frames 2..20 after the pop */
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };

export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.bets, text: "Drop it or throw it: which lands first?", variant: "hook", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.bets, to: ZUZU.bet, speaker: "anna", text: "The dropped one lands first!" },
  { from: ZUZU.bet, to: BEAT.miyu, speaker: "zuzu", text: "No way, same time!" },
  { from: BEAT.miyu, to: BEAT.countdown + 24, text: "Miyu times both balls" },
  { from: BEAT.countdown + 24, to: LAND, text: `Both from ${H} m · thrown at ${VX} m/s` },
  { from: LAND, to: BEAT.watch, text: "SAME FRAME!", variant: "big" },
  { from: BEAT.watch, to: BEAT.doubt, text: `Both: ${fmt(T)} s` },
  { from: BEAT.doubt, to: BEAT.hint, speaker: "anna", text: "Farther means slower!" },
  { from: BEAT.hint, to: BEAT.twist, speaker: "lumi", text: "Watch it from the side." },
  { from: BEAT.twist, to: REPLAY_LAND, text: "Replay from the side", sticker: { text: "Twist!", at: BEAT.twist + 12 } },
  { from: REPLAY_LAND, to: BEAT.react, text: "Same height at every moment!" },
  { from: BEAT.react, to: BEAT.results, speaker: "anna", text: "Same height… the whole way?!" },
  { from: BEAT.results, to: BEAT.reveal, text: `Same ${fmt(T)} s · ${fmt(landDistance("thrown"))} m apart` },
  { from: BEAT.reveal, to: BEAT.cta, text: "Why the same time?" },
  { from: BEAT.cta, to: BEAT.end, text: "Drop vs Throw" },
];
