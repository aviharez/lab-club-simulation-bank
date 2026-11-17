// Beat sheet + per-frame acting for EP02 "Feather vs Hammer".
// Pure functions of the frame: the 3D scene, the 2D overlays, sound.ts and the report all read this file,
// so picture, sound and report can never drift apart. Every drop time comes from data.ts.
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { fmt, H, heightAt, landTime, type Medium, type Member, type ObjectId } from "./data.ts";

export const FPS = 30;
/** The vacuum drop plays at 1/SLOWMO speed (labelled on screen). The air drop is real time. */
export const SLOWMO = 2;

export const BEAT = {
  hook: 0,
  bets: 90, // 3 s
  countdown: 200,
  dropAir: 260, // both released in AIR (real time)
  twist: 560, // Lumi starts the pump: "Now remove the air"
  dropVac: 730, // both released in VACUUM (2x slow-mo)
  results: 880,
  reveal: 980,
  cta: 1140,
  end: 1230, // 41 s
} as const;
export const DURATION = BEAT.end;

// ---------------------------------------------------------------- drops (straight from data.ts)

const DROP: Record<Medium, number> = { air: BEAT.dropAir, vacuum: BEAT.dropVac };
/** screen frames per simulated second in each round */
const RATE: Record<Medium, number> = { air: FPS, vacuum: FPS * SLOWMO };

/** Simulated seconds since release at screen frame f (negative before the release). */
export const simTime = (m: Medium, f: number) => (f - DROP[m]) / RATE[m];
/** Screen frame (fractional) on which an object touches the tube floor. */
export const landFrame = (o: ObjectId, m: Medium) => DROP[m] + landTime(o, m) * RATE[m];
/** First whole frame showing the object on the floor (where the clank / reactions sync). */
export const landOn = (o: ObjectId, m: Medium) => Math.ceil(landFrame(o, m) - 1e-9);
/** Height above the tube floor (m) at screen frame f: H before the release, 0 after landing. */
export const dropHeight = (o: ObjectId, m: Medium, f: number) => (f <= DROP[m] ? H : heightAt(o, m, simTime(m, f)));
/** Stopwatch reading (s) for one object: counts while it falls, stops exactly on its landing time. */
export const timerValue = (o: ObjectId, m: Medium, f: number) => Math.min(landTime(o, m), Math.max(0, simTime(m, f)));

export const HAMMER_AIR = landOn("hammer", "air");
export const FEATHER_AIR = landOn("feather", "air");
/** Both land on this frame in the vacuum (checked by the report). */
export const VAC_LAND = landOn("hammer", "vacuum");

/** Slow-mo lasts from the vacuum release until the landing has settled. */
export const SLOWMO_FROM = BEAT.dropVac;
export const SLOWMO_TO = VAC_LAND + 24;

/** World clock (s): drives every clip and ambient wobble. Slowed down with the picture during the slow-mo. */
export const worldTime = (f: number) => {
  if (f <= SLOWMO_FROM) return f / FPS;
  if (f <= SLOWMO_TO) return SLOWMO_FROM / FPS + (f - SLOWMO_FROM) / RATE.vacuum;
  return SLOWMO_FROM / FPS + (SLOWMO_TO - SLOWMO_FROM) / RATE.vacuum + (f - SLOWMO_TO) / FPS;
};
export const worldSince = (f: number, a: number) => worldTime(f) - worldTime(a);

// ---------------------------------------------------------------- the pump (twist)

export const PUMP = { press: BEAT.twist, on: BEAT.twist + 2, off: BEAT.twist + 120 };
const PUMP_TAU = 24; // frames, exponential pump-down
/** VACUUM column pressure in atm: 1 until the pump starts, pumps down and reads exactly 0 when it stops. */
export const vacPressure = (f: number) => {
  if (f <= PUMP.on) return 1;
  if (f >= PUMP.off) return 0;
  const end = Math.exp(-(PUMP.off - PUMP.on) / PUMP_TAU);
  return (Math.exp(-(f - PUMP.on) / PUMP_TAU) - end) / (1 - end);
};
export const pumpRunning = (f: number) => {
  const up = Math.min(1, Math.max(0, (f - PUMP.on) / 6));
  const down = Math.min(1, Math.max(0, (PUMP.off + 10 - f) / 10));
  return Math.min(up, down);
};

// ---------------------------------------------------------------- staging (shared with Scene3D / camera)

export const STAGE = {
  columnX: { air: -0.9, vacuum: 0.9 } as Record<Medium, number>,
  floorY: 0.3,
  deckY: 2.77,
  deckZ: 0,
  side: 0.74,
  /** walk-around lane behind the columns (clear of the deck holes) */
  backLane: -0.95,
  bench: [-2.0, 0, 2.15] as [number, number, number],
  lumi: [1.5, 0, 2.35] as [number, number, number],
};
/** Who holds what: Anna the hammer on the left of the glass, Zuzu the feather on the right. */
export const HOLDER: Record<ObjectId, "anna" | "zuzu"> = { hammer: "anna", feather: "zuzu" };
const SIDE_SIGN = { anna: -1, zuzu: 1 } as const;
/** 3/4 turn toward the glass (0 = facing the camera, + turns toward +x). */
const HOLD_YAW = { anna: 1.1, zuzu: -1.1 } as const;
export const deckSpot = (who: "anna" | "zuzu", m: Medium): [number, number, number] => [
  STAGE.columnX[m] + SIDE_SIGN[who] * STAGE.side,
  STAGE.deckY,
  STAGE.deckZ,
];

/** hold_drop grip (measured on the rig): ~0.53 m up, 0.22 m forward, 0.10 m to the actor's right. */
const GRIP = { up: 0.53, fwd: 0.22, right: 0.104 };
const gripAt = (p: [number, number, number], yaw: number): [number, number, number] => [
  p[0] + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw),
  p[1] + GRIP.up,
  p[2] + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw),
];
/** Angle (0 = front, +π/2 = right) of the glove port each holder reaches through. */
export const portAngle = (who: "anna" | "zuzu", m: Medium) => {
  const g = gripAt(deckSpot(who, m), HOLD_YAW[who]);
  return Math.atan2(g[0] - STAGE.columnX[m], g[2]);
};
/** Release point inside the glass: 0.3 m from the axis toward the port, exactly H above the tube floor. */
export const releasePoint = (o: ObjectId, m: Medium): [number, number, number] => {
  const a = portAngle(HOLDER[o], m);
  return [STAGE.columnX[m] + Math.sin(a) * 0.3, STAGE.floorY + H, Math.cos(a) * 0.3];
};
/** Where each prop waits before it is picked up: on the release ledge at the back of its column. */
export const ledgePoint = (o: ObjectId, m: Medium): [number, number, number] => [
  STAGE.columnX[m] + (o === "hammer" ? -0.14 : 0.14),
  STAGE.floorY + H + 0.03,
  -0.33,
];

/** Pick-up (hold_drop 0 → 0.75 s, real time) and release (clip frame 27 = 0.9 s) per round. */
export const RAISE: Record<Medium, number> = { air: 8, vacuum: 698 };
const RAISE_LEN = 0.75 * FPS;
const RELEASE_T = 0.9;

/** Prop state for the 3D scene: position, and whether it is still in the hand. */
export const propAt = (o: ObjectId, m: Medium, f: number) => {
  const rel = releasePoint(o, m);
  const ledge = ledgePoint(o, m);
  const k = smooth((f - RAISE[m] - 4) / (RAISE_LEN - 6));
  if (f <= DROP[m]) {
    const p: [number, number, number] = [ledge[0] + (rel[0] - ledge[0]) * k, ledge[1] + (rel[1] - ledge[1]) * k + Math.sin(k * Math.PI) * 0.05, ledge[2] + (rel[2] - ledge[2]) * k];
    return { pos: p, falling: false, t: 0 };
  }
  const y = STAGE.floorY + dropHeight(o, m, f);
  return { pos: [rel[0], y, rel[2]] as [number, number, number], falling: true, t: simTime(m, f) };
};

// ---------------------------------------------------------------- acting

export type Symbol = SymbolKind;
export type ActorState = {
  clip: string;
  time: number;
  from?: { clip: string; time: number; weight: number };
  expression: string;
  pos: [number, number, number];
  yaw: number;
  symbols: { kind: Symbol; from: number }[];
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
function smooth(x: number) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}
const fadeOut = (f: number, at: number, len = 8) => 1 - smooth((f - at) / len);
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};

const IDLE_OFFSET: Record<Member, number> = { miyu: 11.2, anna: 7.4, lumi: 0, zuzu: 3.1 };
const idle = (m: Member, f: number) => ({ clip: "idle", time: worldTime(f) + IDLE_OFFSET[m] });

/** hold_drop for one round: pick up, hold at 0.75 s, play on so the release (0.9 s) lands on the drop frame. */
const HOLD_T = 0.75;
const holdClip = (m: Medium, f: number) => {
  const resume = DROP[m] - (RELEASE_T - HOLD_T) * FPS;
  if (f < RAISE[m] + RAISE_LEN) return Math.max(0, (f - RAISE[m]) / FPS);
  if (f < resume) return HOLD_T;
  if (f <= DROP[m]) return RELEASE_T - (DROP[m] - f) / FPS;
  return Math.min(1.5, RELEASE_T + worldSince(f, DROP[m]));
};
/** Frame the hold_drop clip runs out after a release. */
const holdEnd = (m: Medium) => {
  for (let f = DROP[m]; f < DURATION; f++) if (holdClip(m, f) >= 1.5) return f;
  return DURATION;
};

/** The walk from the AIR column to the VACUUM column: back lane behind the glass, then forward to the new spot. */
export const WALK = { start: 578, end: 694 };
/** walk clip: 0.412 m/s at 1x; it is played faster so the feet match the path speed (no sliding) */
const WALK_SPEED = 0.412;
const walkAt = (who: "anna" | "zuzu", f: number): Pick<ActorState, "clip" | "time" | "pos" | "yaw" | "from"> => {
  const a = deckSpot(who, "air");
  const b = deckSpot(who, "vacuum");
  const z = STAGE.backLane;
  const pts: [number, number][] = [
    [a[0], a[2]],
    [a[0], z],
    [b[0], z],
    [b[0], b[2]],
  ];
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((s, x) => s + x, 0);
  const frames = WALK.end - WALK.start;
  // ease in/out over the first/last 10 % so the steps start and stop
  const u = clamp01((f - WALK.start) / frames);
  const e = u < 0.1 ? (u / 0.1) ** 2 * 0.05 : u > 0.9 ? 1 - ((1 - u) / 0.1) ** 2 * 0.05 : 0.05 + ((u - 0.1) / 0.8) * 0.9;
  let d = e * total;
  let i = 0;
  while (i < segs.length - 1 && d > segs[i]) d -= segs[i++];
  const k = Math.min(1, d / segs[i]);
  const p0 = pts[i];
  const p1 = pts[i + 1];
  const heading = (j: number) => Math.atan2(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]);
  // turn into each corner over its last 0.25 m
  let yaw = heading(i);
  if (i < segs.length - 1) yaw = lerpAngle(heading(i), heading(i + 1), smooth((d - (segs[i] - 0.25)) / 0.5));
  if (i > 0 && d < 0.25) yaw = lerpAngle(heading(i - 1), heading(i), smooth((d + 0.25) / 0.5));
  if (u < 0.1) yaw = lerpAngle(HOLD_YAW[who], yaw, smooth(u / 0.1));
  // clip time from distance walked: stride matches the ground speed
  const walked = e * total;
  return {
    clip: "walk",
    time: walked / WALK_SPEED,
    from: f < WALK.start + 8 ? { ...idle(who, f), weight: fadeOut(f, WALK.start, 8) } : undefined,
    pos: [p0[0] + (p1[0] - p0[0]) * k, STAGE.deckY, p0[1] + (p1[1] - p0[1]) * k],
    yaw,
  };
};
/** walk clip rate actually used (report) */
export const walkRate = () => {
  const a = deckSpot("anna", "air");
  const b = deckSpot("anna", "vacuum");
  const total = 2 * Math.abs(STAGE.backLane - a[2]) + Math.abs(b[0] - a[0]);
  return total / ((WALK.end - WALK.start) / FPS) / WALK_SPEED;
};

/** Anna: hammer, smug and sure the heavy one wins. */
export const ANNA = {
  bet: BEAT.bets + 6,
  tap: HAMMER_AIR + 22,
  annoyed: HAMMER_AIR + 125,
  gloat: FEATHER_AIR + 4,
  shocked: VAC_LAND + 3,
  cheer: BEAT.cta + 8,
};
const anna = (f: number): ActorState => {
  const air = deckSpot("anna", "air");
  const vac = deckSpot("anna", "vacuum");
  const base: ActorState = { ...idle("anna", f), expression: "neutral", pos: air, yaw: HOLD_YAW.anna, symbols: [] };
  const betSym = { kind: "sparkle" as const, from: ANNA.bet };
  if (f < holdEnd("air"))
    return {
      ...base,
      clip: "hold_drop",
      time: holdClip("air", f),
      from: f < RAISE.air ? { ...idle("anna", f), weight: 1 } : undefined,
      expression: f >= ANNA.bet ? "smug" : "neutral",
      symbols: f >= ANNA.bet && f < BEAT.countdown ? [betSym] : [],
    };
  if (f < ANNA.tap)
    return {
      ...base,
      from: f < holdEnd("air") + 8 ? { clip: "hold_drop", time: 1.5, weight: fadeOut(f, holdEnd("air")) } : undefined,
      expression: f >= HAMMER_AIR ? "smug" : "neutral",
      symbols: f >= HAMMER_AIR ? [{ kind: "sparkle", from: HAMMER_AIR + 2 }] : [],
    };
  if (f < ANNA.gloat) {
    // waiting for the feather: turns to camera and taps her foot
    const turn = smooth((f - ANNA.tap) / 10);
    return {
      ...base,
      clip: "foot_tap",
      time: worldSince(f, ANNA.tap),
      from: f < ANNA.tap + 8 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.tap) } : undefined,
      yaw: HOLD_YAW.anna * (1 - turn) + 0.35 * turn,
      expression: f >= ANNA.annoyed ? "squint" : "smug",
      symbols: f >= ANNA.annoyed ? [{ kind: "anger", from: ANNA.annoyed }] : [],
    };
  }
  if (f < WALK.start)
    return {
      ...base,
      from: f < ANNA.gloat + 8 ? { clip: "foot_tap", time: worldSince(f, ANNA.tap), weight: fadeOut(f, ANNA.gloat) } : undefined,
      yaw: 0.35 + (HOLD_YAW.anna - 0.35) * smooth((f - (WALK.start - 14)) / 14),
      expression: "smug",
      symbols: [{ kind: "sparkle", from: ANNA.gloat }],
    };
  if (f < WALK.end) return { ...base, ...walkAt("anna", f), expression: "smug" };
  // vacuum round
  const settle = smooth((f - WALK.end) / 6);
  const vacPos = vac;
  if (f < holdEnd("vacuum"))
    return {
      ...base,
      clip: f < RAISE.vacuum ? "idle" : "hold_drop",
      time: f < RAISE.vacuum ? worldTime(f) + IDLE_OFFSET.anna : holdClip("vacuum", f),
      from:
        f < WALK.end + 8
          ? { clip: "walk", time: walkAt("anna", WALK.end).time, weight: fadeOut(f, WALK.end) }
          : f >= RAISE.vacuum && f < RAISE.vacuum + 4
            ? { ...idle("anna", f), weight: fadeOut(f, RAISE.vacuum, 4) }
            : undefined,
      pos: vacPos,
      yaw: lerpAngle(0, HOLD_YAW.anna, settle),
      expression: f >= ANNA.shocked ? "shocked" : "smug",
      symbols: f >= ANNA.shocked ? [{ kind: "exclaim", from: ANNA.shocked }] : [],
    };
  if (f < ANNA.cheer) {
    const turn = smooth((f - (VAC_LAND + 30)) / 12);
    return {
      ...base,
      from: f < holdEnd("vacuum") + 8 ? { clip: "hold_drop", time: 1.5, weight: fadeOut(f, holdEnd("vacuum")) } : undefined,
      pos: vacPos,
      yaw: HOLD_YAW.anna * (1 - turn) + 0.35 * turn,
      expression: f < ANNA.shocked ? "smug" : f < BEAT.results ? "shocked" : "neutral",
      symbols: f >= ANNA.shocked && f < BEAT.results - 20 ? [{ kind: "exclaim", from: ANNA.shocked }, { kind: "sweat", from: ANNA.shocked + 20 }] : [],
    };
  }
  return {
    ...base,
    clip: "cheer",
    time: worldSince(f, ANNA.cheer),
    from: f < ANNA.cheer + 10 ? { ...idle("anna", f), weight: fadeOut(f, ANNA.cheer, 10) } : undefined,
    pos: vacPos,
    yaw: 0.35,
    expression: "happy",
  };
};

/** Zuzu: feather, bets they land together; cries while it floats, cheers in the vacuum. */
export const ZUZU = {
  bet: 150,
  shocked: HAMMER_AIR + 2,
  sad: HAMMER_AIR + 34,
  crying: HAMMER_AIR + 60,
  cheer: VAC_LAND + 4,
  ctaCheer: BEAT.cta + 4,
};
const zuzu = (f: number): ActorState => {
  const air = deckSpot("zuzu", "air");
  const vac = deckSpot("zuzu", "vacuum");
  const base: ActorState = { ...idle("zuzu", f), expression: "neutral", pos: air, yaw: HOLD_YAW.zuzu, symbols: [] };
  if (f < holdEnd("air"))
    return {
      ...base,
      clip: "hold_drop",
      time: holdClip("air", f),
      from: f < RAISE.air ? { ...idle("zuzu", f), weight: 1 } : undefined,
      expression: f >= ZUZU.bet ? "happy" : "neutral",
      symbols: f >= ZUZU.bet && f < BEAT.countdown ? [{ kind: "exclaim", from: ZUZU.bet }] : [],
    };
  if (f < ZUZU.sad)
    return {
      ...base,
      from: f < holdEnd("air") + 8 ? { clip: "hold_drop", time: 1.5, weight: fadeOut(f, holdEnd("air")) } : undefined,
      expression: f >= ZUZU.shocked ? "shocked" : "happy",
      symbols: f >= ZUZU.shocked ? [{ kind: "sweat", from: ZUZU.shocked }] : [],
    };
  if (f < WALK.start) {
    const turn = smooth((f - ZUZU.sad) / 10);
    const back = smooth((f - (WALK.start - 14)) / 14);
    return {
      ...base,
      clip: "sad",
      time: worldSince(f, ZUZU.sad),
      from: f < ZUZU.sad + 10 ? { ...idle("zuzu", f), weight: fadeOut(f, ZUZU.sad, 10) } : undefined,
      yaw: lerpAngle(lerpAngle(HOLD_YAW.zuzu, -0.35, turn), HOLD_YAW.zuzu, back),
      expression: f >= ZUZU.crying && f < BEAT.twist ? "crying" : "neutral",
      symbols: f >= BEAT.twist + 6 ? [{ kind: "question", from: BEAT.twist + 6 }] : [],
    };
  }
  if (f < WALK.end) return { ...base, ...walkAt("zuzu", f), from: f < WALK.start + 8 ? { clip: "sad", time: worldSince(f, ZUZU.sad), weight: fadeOut(f, WALK.start) } : undefined, expression: "neutral" };
  const settle = smooth((f - WALK.end) / 6);
  if (f < ZUZU.cheer)
    return {
      ...base,
      clip: f < RAISE.vacuum ? "idle" : "hold_drop",
      time: f < RAISE.vacuum ? worldTime(f) + IDLE_OFFSET.zuzu : holdClip("vacuum", f),
      from:
        f < WALK.end + 8
          ? { clip: "walk", time: walkAt("zuzu", WALK.end).time, weight: fadeOut(f, WALK.end) }
          : f >= RAISE.vacuum && f < RAISE.vacuum + 4
            ? { ...idle("zuzu", f), weight: fadeOut(f, RAISE.vacuum, 4) }
            : undefined,
      pos: vac,
      yaw: lerpAngle(0, HOLD_YAW.zuzu, settle),
      expression: "squint",
    };
  const turn = smooth((f - ZUZU.cheer) / 10);
  if (f < BEAT.results + 40)
    return {
      ...base,
      clip: "cheer",
      time: worldSince(f, ZUZU.cheer),
      from: f < ZUZU.cheer + 8 ? { clip: "hold_drop", time: holdClip("vacuum", f), weight: fadeOut(f, ZUZU.cheer) } : undefined,
      pos: vac,
      yaw: lerpAngle(HOLD_YAW.zuzu, -0.35, turn),
      expression: "happy",
      symbols: [{ kind: "sparkle", from: ZUZU.cheer + 2 }],
    };
  if (f < ZUZU.ctaCheer)
    return {
      ...base,
      from: f < BEAT.results + 50 ? { clip: "cheer", time: worldSince(f, ZUZU.cheer), weight: fadeOut(f, BEAT.results + 40, 10) } : undefined,
      pos: vac,
      yaw: -0.35,
      expression: "happy",
    };
  return {
    ...base,
    clip: "cheer",
    time: worldSince(f, ZUZU.ctaCheer),
    from: f < ZUZU.ctaCheer + 10 ? { ...idle("zuzu", f), weight: fadeOut(f, ZUZU.ctaCheer, 10) } : undefined,
    pos: vac,
    yaw: -0.35,
    expression: "happy",
  };
};

/** Lumi: runs the pump from the control panel, then delivers the reveal. */
export const LUMI = {
  idea: BEAT.twist - 40,
  point: BEAT.twist - 14,
  pointBack: BEAT.reveal + 4,
  glint: BEAT.reveal + 24,
  cheer: BEAT.cta + 12,
};
const LUMI_YAW = 0.45;
const LUMI_PRESS_YAW = -0.15;
const lumi = (f: number): ActorState => {
  const base: ActorState = { ...idle("lumi", f), expression: "neutral", pos: STAGE.lumi, yaw: LUMI_YAW, symbols: [] };
  if (f < LUMI.idea) return { ...base, expression: f > HAMMER_AIR + 30 && f < FEATHER_AIR ? "squint" : "neutral" };
  if (f < LUMI.point) return { ...base, expression: "happy", symbols: [{ kind: "exclaim", from: LUMI.idea }] };
  const pressEnd = PUMP.off + 10;
  if (f < pressEnd) {
    const turn = smooth((f - LUMI.point) / 10) * (1 - smooth((f - (pressEnd - 14)) / 14));
    return {
      ...base,
      clip: "point",
      time: worldSince(f, LUMI.point),
      from: f < LUMI.point + 8 ? { ...idle("lumi", f), weight: fadeOut(f, LUMI.point) } : undefined,
      yaw: lerpAngle(LUMI_YAW, LUMI_PRESS_YAW, turn),
      expression: "happy",
    };
  }
  if (f < LUMI.pointBack)
    return {
      ...base,
      from: f < pressEnd + 8 ? { clip: "point", time: worldSince(f, LUMI.point), weight: fadeOut(f, pressEnd) } : undefined,
      expression: f >= VAC_LAND + 2 ? "happy" : "neutral",
    };
  if (f < LUMI.cheer)
    return {
      ...base,
      clip: "point",
      time: worldSince(f, LUMI.pointBack),
      from: f < LUMI.pointBack + 8 ? { ...idle("lumi", f), weight: fadeOut(f, LUMI.pointBack) } : undefined,
      yaw: 0,
      expression: f >= LUMI.glint ? "glint" : "happy",
    };
  return {
    ...base,
    clip: "cheer",
    time: worldSince(f, LUMI.cheer),
    from: f < LUMI.cheer + 10 ? { clip: "point", time: 4.6, weight: fadeOut(f, LUMI.cheer, 10) } : undefined,
    yaw: 0.2,
    expression: "happy",
  };
};

/** Miyu: watches from the bench, falls asleep, wakes up for the vacuum result. */
/** `napShot`: the one cut-in on Miyu while she sleeps (camera.ts). Her snore is only heard there. */
export const MIYU = { doze: 118, wake: VAC_LAND + 82, stand: BEAT.cta + 2, napShot: [440, 476] as [number, number] };
const SIT_T = 2.2;
const MIYU_SEAT: [number, number, number] = [STAGE.bench[0] + 0.2, 0, STAGE.bench[2] - 0.1];
const miyu = (f: number): ActorState => {
  const base: ActorState = { clip: "sit", time: SIT_T, expression: "neutral", pos: MIYU_SEAT, yaw: 0.25, symbols: [] };
  if (f < MIYU.doze) return base;
  if (f < MIYU.wake) return { ...base, expression: "squint", symbols: [{ kind: "zzz", from: MIYU.doze + 6 }] };
  if (f < MIYU.stand)
    return {
      ...base,
      expression: f < MIYU.wake + 40 ? "shocked" : "happy",
      symbols: f < MIYU.wake + 40 ? [{ kind: "exclaim", from: MIYU.wake }] : [],
    };
  // CTA: hops up off the bench and cheers
  const up = smooth((f - MIYU.stand) / 10);
  return {
    ...base,
    clip: "cheer",
    time: worldSince(f, MIYU.stand),
    from: f < MIYU.stand + 10 ? { clip: "sit", time: SIT_T, weight: fadeOut(f, MIYU.stand, 10) } : undefined,
    pos: [MIYU_SEAT[0], 0, MIYU_SEAT[2] + 0.3 * up],
    expression: "happy",
  };
};

const BY: Record<Member, (f: number) => ActorState> = { anna, zuzu, lumi, miyu };
export const ACTING = (m: Member, f: number): ActorState => BY[m](f);

// ---------------------------------------------------------------- overlays timing

export const COUNTDOWN = [
  { n: "3", at: BEAT.countdown + 6 },
  { n: "2", at: BEAT.countdown + 24 },
  { n: "1", at: BEAT.countdown + 42 },
  { n: "DROP!", at: BEAT.dropAir, go: true },
];
export const BADGES = {
  drag: { from: BEAT.countdown, to: BEAT.twist },
  slowmo: { from: SLOWMO_FROM, to: SLOWMO_TO },
};
/** Result cards pop one per drop, in the order they happened. */
export const RESULT_POPS = [0, 1, 2, 3].map((i) => BEAT.results + 16 + i * 12);
/** cards leave one by one just before the reveal */
export const RESULT_OUTS = [0, 1, 2, 3].map((i) => BEAT.reveal - (3 - i) * 3);
/** kit ResultCards counts its number up over frames 2..20 after the pop */
export const RESULT_COUNT_END = 20;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };

const t = (o: ObjectId, m: Medium) => fmt(landTime(o, m));
export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.bets, text: "Hammer or feather: which lands first?", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.bets, to: 150, text: "Anna: “The heavy one wins!”" },
  { from: 150, to: BEAT.countdown, text: "Zuzu: “They land together!”" },
  { from: BEAT.countdown, to: HAMMER_AIR + 16, text: `Both from ${H} m, in normal air` },
  { from: HAMMER_AIR + 16, to: FEATHER_AIR, text: "The feather is… still falling" },
  { from: FEATHER_AIR, to: BEAT.twist, text: `Air: hammer ${t("hammer", "air")} s, feather ${t("feather", "air")} s` },
  { from: BEAT.twist, to: WALK.end, text: "Now remove the air", sticker: { text: "Twist!", at: BEAT.twist + 12 } },
  { from: WALK.end, to: VAC_LAND, text: `Same ${H} m drop. No air.` },
  { from: VAC_LAND, to: BEAT.results, text: "SAME FRAME!", variant: "big" },
  { from: BEAT.results, to: BEAT.reveal, text: `4 drops from ${H} m` },
  { from: BEAT.reveal, to: BEAT.cta, text: "Is heavier faster?" },
  { from: BEAT.cta, to: BEAT.end, text: "Feather vs Hammer" },
];
