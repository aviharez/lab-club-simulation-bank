// Beat sheet + per-frame acting for "Same Jump, Different Planets".
// Pure functions of the frame number: the 3D scene, the 2D overlays and the report script all read this.
import { airtime, heightAt, PLANETS, timeToPeak, V0_LABEL, type PlanetId } from "./physics.ts";

export const FPS = 30;
/** The jump phase plays at 1/SLOWMO speed. */
export const SLOWMO = 2;

export const BEAT = {
  hook: 0,
  setup: 90, // 3 s
  countdown: 270, // 9 s
  takeoff: 330, // 11 s — every mascot leaves the floor on this frame
  results: 620,
  reveal: 870,
  cta: 1080,
  end: 1200, // 40 s
} as const;

export const DURATION = BEAT.end;

/** Screen frames per simulated second while slow-mo is on. */
const SIM_FPS = FPS * SLOWMO;

/** Simulated (physics) seconds since takeoff at screen frame f. */
export const simTime = (f: number) => (f - BEAT.takeoff) / SIM_FPS;

export const planet = (id: PlanetId) => PLANETS.find((p) => p.id === id)!;

/** Screen frame at which a planet's mascot lands. */
export const landFrame = (id: PlanetId) => BEAT.takeoff + airtime(planet(id).g) * SIM_FPS;
/** Screen frame at which a planet's mascot reaches its apex. */
export const peakFrame = (id: PlanetId) => BEAT.takeoff + timeToPeak(planet(id).g) * SIM_FPS;

/** Slow-mo stays on until the last (Moon) landing has settled. */
export const SLOWMO_END = Math.ceil(landFrame("moon")) + 14;

/**
 * World clock in seconds: what every clip, loop and ambient wobble is driven by.
 * Runs at 1x, then at 1/SLOWMO between takeoff and SLOWMO_END, then 1x again, so the
 * whole world (not just the jumpers) is honestly slowed down.
 */
export const worldTime = (f: number) => {
  if (f <= BEAT.takeoff) return f / FPS;
  if (f <= SLOWMO_END) return BEAT.takeoff / FPS + (f - BEAT.takeoff) / SIM_FPS;
  return BEAT.takeoff / FPS + (SLOWMO_END - BEAT.takeoff) / SIM_FPS + (f - SLOWMO_END) / FPS;
};
/** World seconds elapsed between screen frames a and f. */
export const worldSince = (f: number, a: number) => worldTime(f) - worldTime(a);


/** Frame on which Miyu (Moon) touches down: the end of the waiting gag. */
export const MOON_DOWN = Math.round(landFrame("moon"));
/** The twist lands here: everyone else is down and Miyu is still floating. */
export const TWIST_AT = Math.round(landFrame("mars")) + 6;
/** Miyu dozes off at the top of her jump, where she is barely moving. */
export const MIYU_SLEEP_AT = Math.round(peakFrame("moon")) + 2;
/** She lands still asleep; Anna gets her "Haa?!" in before Miyu finally wakes. */
export const MIYU_WAKE = MOON_DOWN + 40;
/** Lumi raises her finger a beat before the glint, the reveal card follows. */
export const LUMI_POINT_AT = BEAT.reveal + 4;
export const REVEAL_CARD = { at: BEAT.reveal + 30, lands: BEAT.reveal + 40 };

/** Feet height (m) of a planet's mascot at screen frame f, straight from the physics. */
export const jumpHeightAt = (id: PlanetId, f: number) => heightAt(planet(id).g, simTime(f));

// ---------------------------------------------------------------- acting

export type Symbol = "sweat" | "exclaim" | "sparkle" | "zzz" | "spiral";

export type ActorState = {
  clip: string;
  time: number;
  /** optional crossfade source: blends from this pose into `clip` */
  from?: { clip: string; time: number; weight: number };
  expression: string;
  /** feet position in world space */
  pos: [number, number, number];
  yaw: number;
  /** squash & stretch: [xz, y] */
  squash: [number, number];
  symbols: { kind: Symbol; from: number }[];
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** Crossfade helper: blend weight of the outgoing clip, `len` frames after `at`. */
const fadeOut = (f: number, at: number, len = 8) => 1 - smooth((f - at) / len);

/** Stretch on takeoff, squash on landing (code-side, layered on top of the clips). */
const squashStretch = (f: number, land: number, heavy = 1): [number, number] => {
  const sTake = Math.max(0, 1 - (f - BEAT.takeoff) / 8); // stretch decays over 8 screen frames
  const k = f >= BEAT.takeoff ? sTake * 0.14 : 0;
  const lt = f - land;
  const sq = lt >= 0 && lt < 14 ? Math.sin((lt / 14) * Math.PI) * 0.12 * heavy * Math.exp(-lt / 10) : 0;
  return [1 - k * 0.45 + sq * 0.6, 1 + k - sq];
};

const idleAt = (f: number, offset: number) => ({ clip: "idle", time: worldTime(f) + offset });

/** Takeoff / air / landing clips shared by everyone during the countdown and jump. */
const crouchStart = BEAT.takeoff - 14;
const preJump = (f: number, offset: number): Pick<ActorState, "clip" | "time" | "from"> => {
  if (f < crouchStart) return idleAt(f, offset);
  // crouch: 0.4 s clip slowed so the anticipation reads, held at its deepest point until takeoff
  const t = Math.min(0.4, ((f - crouchStart) / 14) * 0.4);
  return { clip: "jump_crouch", time: t, from: f < crouchStart + 5 ? { ...idleAt(f, offset), weight: fadeOut(f, crouchStart, 5) } : undefined };
};

export const TUBE_FLOOR_Y = 0.12;

type Ctx = { x: number };

const zuzu = (f: number, { x }: Ctx): ActorState => {
  const land = landFrame("jupiter");
  const base: ActorState = { clip: "idle", time: 0, expression: "neutral", pos: [x, TUBE_FLOOR_Y, 0], yaw: 0, squash: [1, 1], symbols: [] };
  if (f < BEAT.takeoff) return { ...base, ...preJump(f, 3.1), expression: f > BEAT.countdown + 14 ? "squint" : "neutral" };
  const y = TUBE_FLOOR_Y + jumpHeightAt("jupiter", f);
  const symbols: ActorState["symbols"] = [{ kind: "sweat", from: Math.round(land + 4) }];
  if (f < land) return { ...base, clip: "jump_air", time: worldSince(f, BEAT.takeoff), pos: [x, y, 0], squash: squashStretch(f, land, 1.6), expression: "shocked" };
  const sq = squashStretch(f, land, 1.8);
  const dizzyAt = land + 62;
  if (f < dizzyAt) return { ...base, clip: "land_squash", time: worldSince(f, land), squash: sq, expression: "dizzy", symbols };
  if (f >= BEAT.cta + 6)
    return { ...base, clip: "cheer", time: worldSince(f, BEAT.cta + 6), from: { clip: "dizzy", time: worldSince(f, dizzyAt), weight: fadeOut(f, BEAT.cta + 6, 10) }, expression: "happy" };
  return {
    ...base,
    clip: "dizzy",
    time: worldSince(f, dizzyAt),
    from: f < dizzyAt + 10 ? { clip: "land_squash", time: 1, weight: fadeOut(f, dizzyAt, 10) } : undefined,
    expression: "dizzy",
    symbols: f < BEAT.results ? [...symbols, { kind: "spiral", from: Math.round(dizzyAt) }] : symbols,
  };
};

const anna = (f: number, { x }: Ctx): ActorState => {
  const land = landFrame("mars");
  const peak = peakFrame("mars");
  const base: ActorState = { clip: "idle", time: 0, expression: "neutral", pos: [x, TUBE_FLOOR_Y, 0], yaw: 0, squash: [1, 1], symbols: [] };
  if (f < BEAT.takeoff) return { ...base, ...preJump(f, 7.4), expression: f > BEAT.countdown ? "smug" : "neutral" };
  const y = TUBE_FLOOR_Y + jumpHeightAt("mars", f);
  const sparkle = { kind: "sparkle" as const, from: Math.round(peak - 6) };
  if (f < land)
    return { ...base, clip: "jump_air", time: worldSince(f, BEAT.takeoff), pos: [x, y, 0], squash: squashStretch(f, land), expression: f > peak - 14 ? "smug" : "happy", symbols: f > peak - 6 ? [sparkle] : [] };
  const tapAt = land + 16;
  if (f < tapAt) return { ...base, clip: "jump_land", time: worldSince(f, land), squash: squashStretch(f, land), expression: "smug", symbols: [sparkle] };
  if (f >= BEAT.cta + 10)
    return { ...base, clip: "cheer", time: worldSince(f, BEAT.cta + 10), from: { clip: "foot_tap", time: worldSince(f, tapAt), weight: fadeOut(f, BEAT.cta + 10, 10) }, expression: "happy" };
  // waiting gag: taps her foot, smug at first, then annoyed while Miyu is still up
  const moonDown = MOON_DOWN;
  // one long annoyed glance at the floating Miyu, then a real double-take when she finally lands (still asleep)
  const annoyed = f >= tapAt + 60 && f < tapAt + 100;
  const shocked = f >= moonDown + 2 && f < moonDown + 40;
  return {
    ...base,
    clip: f < BEAT.results ? "foot_tap" : "idle",
    time: f < BEAT.results ? worldSince(f, tapAt) : worldTime(f) + 7.4,
    from: f < tapAt + 8 ? { clip: "jump_land", time: 0.43, weight: fadeOut(f, tapAt, 8) } : f >= BEAT.results && f < BEAT.results + 10 ? { clip: "foot_tap", time: worldSince(f, tapAt), weight: fadeOut(f, BEAT.results, 10) } : undefined,
    expression: shocked ? "shocked" : annoyed ? "squint" : "smug",
    symbols: f < moonDown ? [] : f < moonDown + 40 ? [{ kind: "exclaim", from: moonDown + 2 }] : [],
  };
};

/** Lumi: control panel → walks into the Earth tube → control-group jump → reveal with glint. */
export const LUMI_PANEL_SPOT: [number, number, number] = [2.9, 0, 1.75];
/** Lumi faces 3/4 to camera, turned toward the console on her left (screen right). */
export const LUMI_PANEL_YAW = -0.15;
export const LUMI_WALK = { start: 190, end: 250 };

const lumi = (f: number, { x }: Ctx): ActorState => {
  const land = landFrame("earth");
  const base: ActorState = { clip: "idle", time: worldTime(f), expression: "neutral", pos: [x, TUBE_FLOOR_Y, 0], yaw: 0, squash: [1, 1], symbols: [] };
  // hook: in the tube, idling
  if (f < BEAT.setup) return { ...base, ...idleAt(f, 0) };
  // setup: at the control panel, pointing at the screen
  if (f < LUMI_WALK.start)
    return {
      ...base,
      clip: "point",
      time: worldSince(f, BEAT.setup + 4),
      from: f < BEAT.setup + 12 ? { ...idleAt(f, 0), weight: fadeOut(f, BEAT.setup + 4, 8) } : undefined,
      pos: LUMI_PANEL_SPOT,
      yaw: LUMI_PANEL_YAW,
      expression: f > BEAT.setup + 40 ? "happy" : "neutral",
      symbols: f > BEAT.setup + 40 ? [{ kind: "exclaim", from: BEAT.setup + 40 }] : [],
    };
  if (f < LUMI_WALK.end) return { ...base, ...walkIntoTube(f, x), expression: "happy" };
  if (f < BEAT.takeoff) {
    // turn around inside the tube to face the camera, then crouch with everyone
    const turn = smooth((f - LUMI_WALK.end) / 12);
    const pj = preJump(f, 0);
    return { ...base, ...pj, yaw: -Math.PI * (1 - turn), expression: "neutral", from: f < LUMI_WALK.end + 6 ? { clip: "run", time: worldTime(f), weight: fadeOut(f, LUMI_WALK.end, 6) } : pj.from };
  }
  const y = TUBE_FLOOR_Y + jumpHeightAt("earth", f);
  if (f < land) return { ...base, clip: "jump_air", time: worldSince(f, BEAT.takeoff), pos: [x, y, 0], squash: squashStretch(f, land), expression: "neutral" };
  const happy = land + 6;
  if (f < LUMI_POINT_AT)
    return {
      ...base,
      clip: f < land + 30 ? "jump_land" : "idle",
      time: f < land + 30 ? worldSince(f, land) : worldTime(f),
      from: f >= land + 30 && f < land + 38 ? { clip: "jump_land", time: 0.43, weight: fadeOut(f, land + 30, 8) } : undefined,
      squash: squashStretch(f, land),
      // eyes closed, thinking it over ("Uun...") right before she explains
      expression: f < happy ? "neutral" : f >= BEAT.reveal - 28 ? "squint" : "happy",
    };
  // reveal: knowing point + glint; CTA: cheer
  if (f < BEAT.cta + 4)
    return { ...base, clip: "point", time: worldSince(f, LUMI_POINT_AT), from: f < LUMI_POINT_AT + 8 ? { ...idleAt(f, 0), weight: fadeOut(f, LUMI_POINT_AT, 8) } : undefined, expression: f > BEAT.reveal + 22 ? "glint" : "happy" };
  return { ...base, clip: "cheer", time: worldSince(f, BEAT.cta + 4), from: f < BEAT.cta + 14 ? { clip: "point", time: 4.6, weight: fadeOut(f, BEAT.cta + 4, 10) } : undefined, expression: "happy" };
};

/** Lumi's path from the panel into the Earth tube: run across the floor, hop up through the open door. */
const walkIntoTube = (f: number, tubeX: number): Pick<ActorState, "clip" | "time" | "pos" | "yaw" | "from"> => {
  const door: [number, number] = [tubeX, 0.95];
  const a = LUMI_PANEL_SPOT;
  const seg1 = Math.hypot(door[0] - a[0], door[1] - a[2]);
  const seg2 = 0.95;
  const total = seg1 + seg2;
  const u = clamp01((f - LUMI_WALK.start) / (LUMI_WALK.end - LUMI_WALK.start));
  // ease in/out on distance: anticipation at the start, settle at the end
  const e = u < 0.15 ? (u / 0.15) ** 2 * 0.075 : u > 0.85 ? 1 - ((1 - u) / 0.15) ** 2 * 0.075 : 0.075 + ((u - 0.15) / 0.7) * 0.85;
  const d = e * total;
  let px: number, pz: number;
  if (d < seg1) {
    const k = d / seg1;
    px = a[0] + (door[0] - a[0]) * k;
    pz = a[2] + (door[1] - a[2]) * k;
  } else {
    const k = (d - seg1) / seg2;
    px = tubeX;
    pz = door[1] * (1 - k);
  }
  // first frames: turn from the panel toward the tube; last segment: turn to face into the tube (yaw π = back to camera)
  const yaw0 = LUMI_PANEL_YAW;
  const yawRun = Math.atan2(door[0] - a[0], door[1] - a[2]); // ≈ -1.9: heading left and back
  const turnIn = smooth((f - LUMI_WALK.start) / 8);
  // unwrap so the turn from yawRun to "into the tube" takes the short way round (-π, not +π)
  const yawNow = d < seg1 ? yaw0 + (yawRun - yaw0) * turnIn : yawRun + (-Math.PI - yawRun) * smooth((d - seg1) / 0.35);
  // step up onto the tube floor during the last 0.35 m, with a little hop arc
  const step = clamp01((d - (total - 0.6)) / 0.35);
  const py = TUBE_FLOOR_Y * smooth(step) + Math.sin(step * Math.PI) * 0.12;
  return {
    clip: "run",
    time: worldTime(f),
    from: f < LUMI_WALK.start + 6 ? { clip: "point", time: worldSince(f, BEAT.setup + 4), weight: fadeOut(f, LUMI_WALK.start, 6) } : undefined,
    pos: [px, py, pz],
    yaw: yawNow,
  };
};

const miyu = (f: number, { x }: Ctx): ActorState => {
  const land = landFrame("moon");
  const base: ActorState = { clip: "idle", time: 0, expression: "neutral", pos: [x, TUBE_FLOOR_Y, 0], yaw: 0, squash: [1, 1], symbols: [] };
  if (f < BEAT.takeoff) return { ...base, ...preJump(f, 11.2), expression: f > BEAT.countdown ? "happy" : "neutral" };
  const y = TUBE_FLOOR_Y + jumpHeightAt("moon", f);
  const sleepAt = MIYU_SLEEP_AT; // drifts up, runs out of speed at the top → dozes off
  const zzz = { kind: "zzz" as const, from: sleepAt + 10 };
  if (f < land) {
    if (f < sleepAt) return { ...base, clip: "jump_air", time: worldSince(f, BEAT.takeoff), pos: [x, y, 0], squash: squashStretch(f, land), expression: "happy" };
    return {
      ...base,
      clip: "float_sleep",
      time: worldSince(f, sleepAt),
      from: f < sleepAt + 14 ? { clip: "jump_air", time: worldSince(f, BEAT.takeoff), weight: fadeOut(f, sleepAt, 14) } : undefined,
      pos: [x, y, 0],
      expression: f < sleepAt + 8 ? "happy" : "squint",
      symbols: [zzz],
    };
  }
  // soft landing, still asleep on her feet, then wakes up shocked
  const wake = MIYU_WAKE;
  if (f < BEAT.cta + 2) {
    const after = f >= BEAT.results;
    return {
      ...base,
      clip: after ? "idle" : "jump_land",
      time: after ? worldTime(f) + 11.2 : worldSince(f, land),
      from: f < land + 6 ? { clip: "float_sleep", time: worldSince(f, sleepAt), weight: fadeOut(f, land, 6) } : after && f < BEAT.results + 10 ? { clip: "jump_land", time: 0.43, weight: fadeOut(f, BEAT.results, 10) } : undefined,
      squash: squashStretch(f, land, 0.5),
      expression: f < wake ? "squint" : f < BEAT.results + 20 ? "shocked" : "happy",
      symbols: f < wake ? [zzz] : f < wake + 50 ? [{ kind: "exclaim", from: wake }] : [],
    };
  }
  return { ...base, clip: "cheer", time: worldSince(f, BEAT.cta + 2), from: f < BEAT.cta + 12 ? { clip: "idle", time: worldTime(f) + 11.2, weight: fadeOut(f, BEAT.cta + 2, 10) } : undefined, expression: "happy" };
};

export const ACTING: Record<PlanetId, (f: number, ctx: Ctx) => ActorState> = { moon: miyu, mars: anna, earth: lumi, jupiter: zuzu };

// ---------------------------------------------------------------- captions

export type Caption = { from: number; to: number; text: string; sticker?: { text: string; at: number } };

export const CAPTIONS: Caption[] = [
  { from: 4, to: BEAT.setup, text: "Same jump. 4 planets. Who goes highest?", sticker: { text: "Guess first!", at: 36 } },
  { from: BEAT.setup, to: 176, text: "Step 1: lock the jump speed" },
  { from: 176, to: BEAT.countdown, text: "Lumi is the control group." },
  { from: BEAT.countdown, to: BEAT.takeoff, text: "Same crouch. Same push." },
  { from: BEAT.takeoff, to: TWIST_AT, text: "GO!" },
  { from: TWIST_AT, to: MOON_DOWN, text: "Miyu is… still floating?" },
  { from: MOON_DOWN, to: BEAT.results, text: "Touchdown. Finally." },
  { from: BEAT.results, to: BEAT.reveal, text: "Results: same push, 4 heights" },
  { from: BEAT.reveal, to: BEAT.cta, text: "The secret is gravity" },
  { from: BEAT.cta, to: BEAT.end, text: "Same jump, different planets" },
];

export const COUNTDOWN = [
  { n: "3", at: BEAT.countdown + 6 },
  { n: "2", at: BEAT.countdown + 24 },
  { n: "1", at: BEAT.countdown + 42 },
  { n: "JUMP!", at: BEAT.takeoff },
];

/** Results pop worst → best so #1 lands last. */
export const RESULT_POPS = [0, 1, 2, 3].map((i) => BEAT.results + 34 + i * 30);

export const CONSOLE_TEXT = { at: BEAT.setup + 14, line1: `Jump speed: ${V0_LABEL} m/s`, line2: "same for everyone" };
export const DOOR = { earthOpen: 160, earthClose: LUMI_WALK.end + 8 };


