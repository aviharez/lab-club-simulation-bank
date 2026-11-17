// Camera choreography for EP06: one pure function frame → CamState, shared by the 3D rig, the 2D overlays and the
// report. The walk is filmed from behind the start (Zuzu always in frame, Lumi striding away up the plaza), the
// measurement from a drone (Lumi's 100-tile line next to Zuzu's scribble), the ghost run from high above the ring.
// Reactions and the reveal get close-ups (each mascot ≥ 1/5 frame).
import { Easing } from "remotion";
import { mixCam, type CamState } from "../kit/camera.ts";
import { BEAT, FOG_SCALE, MIYU_MEASURE, REVEAL_SPOT, WALK, ZUZU_END } from "./timeline.ts";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});

/** hook: close on the start ring, Anna spinning Zuzu */
export const SPIN: CamState = { pos: [0.3, 1.05, 2.75], target: [-0.18, 0.58, 0.05], fov: 40 };
/** Anna's bet: Anna pointing up the plaza, dizzy Zuzu beside her */
export const ANNA_BET: CamState = { pos: [-0.15, 0.95, 2.3], target: [-0.32, 0.62, 0.05], fov: 40 };
/** Miyu's bet: Miyu sleepy-eyed, Lumi ready on her lane behind */
export const MIYU_BET: CamState = { pos: [1.85, 0.95, 2.6], target: [1.2, 0.62, 0.25], fov: 40 };
/** the first steps: low behind-right, both walkers big */
export const WALK_LOW: CamState = { pos: [1.7, 1.55, 3.9], target: [0.25, 0.5, -0.7], fov: 44 };
/** the time-lapse: high behind the start, Zuzu's whole scribble in frame, Lumi heading for the lab */
export const WALK_HIGH: CamState = { pos: [0.5, 7.4, 9.6], target: [0.1, 0.0, -0.1], fov: 46 };
/** the drone: the whole lane (Lumi at tile 100) and Zuzu's scribble near the start */
export const DRONE: CamState = { pos: [0.2, 85, -15.0], target: [0.2, 0, -17.8], fov: 50 };
/** Miyu's tape to Zuzu, low from the camera side */
/** Miyu's tape to Zuzu: from beyond Zuzu, looking back along the tape to Miyu on the start ring (portrait-friendly) */
const U = (() => {
  const d = Math.hypot(ZUZU_END[0] - MIYU_MEASURE[0], ZUZU_END[2] - MIYU_MEASURE[2]);
  return [(ZUZU_END[0] - MIYU_MEASURE[0]) / d, (ZUZU_END[2] - MIYU_MEASURE[2]) / d];
})();
export const TAPE_CU: CamState = {
  pos: [ZUZU_END[0] + U[0] * 1.9 + U[1] * 0.7, 1.05, ZUZU_END[2] + U[1] * 1.9 - U[0] * 0.7],
  target: [ZUZU_END[0] * 0.45 + MIYU_MEASURE[0] * 0.55, 0.5, ZUZU_END[2] * 0.45 + MIYU_MEASURE[2] * 0.55],
  fov: 44,
};
/** the ghost run: high above the start ring, the √n ring in the middle */
export const OVERHEAD: CamState = { pos: [0.0, 23.5, 5.6], target: [0.0, 0, 2.7], fov: 58 };
/** results: the four in a line, the cards above */
export const RESULTS: CamState = { pos: [0, 1.05, 5.9], target: [0, 1.2, 0.9], fov: 46 };
/** reveal: Lumi low in frame, room for the card above */
export const REVEAL: CamState = { pos: [REVEAL_SPOT[0] + 0.25, 1.15, REVEAL_SPOT[2] + 2.75], target: [REVEAL_SPOT[0], 1.0, REVEAL_SPOT[2]], fov: 48 };
/** CTA: the whole cast under the CTA card */
export const CTA: CamState = { pos: [0.1, 1.25, 6.1], target: [0, 1.5, 0.9], fov: 46 };

export const CUTS = {
  bets: BEAT.bets,
  miyuBet: BEAT.miyuBet,
  go: BEAT.go,
  drone: BEAT.drone,
  tape: BEAT.tape,
  twist: BEAT.twist,
  results: BEAT.results,
  reveal: BEAT.reveal,
  cta: BEAT.cta,
} as const;

/** the low walk shot cranes up to the high one over the slow steps */
const CRANE = { from: WALK.start + 40, to: WALK.start + 160 };

export const camAt = (f: number): CamState => {
  const C = CUTS;
  if (f < C.bets) return nudge(SPIN, [0, 0, -0.35], seg(f, 0, C.bets));
  if (f < C.miyuBet) return nudge(ANNA_BET, [0.05, 0, -0.2], seg(f, C.bets, C.miyuBet));
  if (f < C.go) return nudge(MIYU_BET, [-0.05, 0, -0.2], seg(f, C.miyuBet, C.go));
  if (f < C.drone) {
    const base = mixCam(WALK_LOW, WALK_HIGH, seg(f, CRANE.from, CRANE.to));
    return nudge(base, [0, 0.3, 0.3], seg(f, CRANE.to, C.drone));
  }
  if (f < C.tape) return nudge(DRONE, [0, 8, 0], 1 - seg(f, C.drone, C.drone + 70, out));
  if (f < C.twist) return nudge(TAPE_CU, [0.08, 0, -0.3], seg(f, C.tape, C.twist));
  if (f < C.results) return nudge(OVERHEAD, [0, 3, 1], 1 - seg(f, C.twist, C.twist + 60, out));
  if (f < C.reveal) return nudge(RESULTS, [0, 0, -0.3], seg(f, C.results, C.reveal));
  if (f < C.cta) return nudge(REVEAL, [0.08, 0, -0.25], seg(f, C.reveal, C.reveal + 60, out));
  return nudge(CTA, [0, 0, -0.2], seg(f, C.cta, BEAT.end));
};

/** Fog thins in the high shots (the scene sits inside FogExp2; a 40 m camera would see only haze). */
export const fogAt = (f: number) => {
  const C = CUTS;
  if (f >= C.drone && f < C.tape) return FOG_SCALE.drone;
  if (f >= C.twist && f < C.results) return FOG_SCALE.overhead;
  if (f >= C.go && f < C.drone) return 1 + (FOG_SCALE.high - 1) * seg(f, CRANE.from, CRANE.to);
  return FOG_SCALE.ground;
};
