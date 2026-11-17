// Camera choreography for EP07: one pure function frame → CamState, shared by the 3D rig, the 2D overlays and the
// report. The bets get close-ups at each bench; the whole race is one wide shot of both benches (the apparatus stays
// on screen from GO to the last swap, no cutaways); results, twist, reveal and CTA move in front of / between the benches.
import { Easing } from "remotion";
import { mixCam, type CamState } from "../kit/camera.ts";
import { CHEM_PREP } from "../sets/chem-prep-room/layout.ts";
import { BEAT, REVEAL_SPOT, START_X } from "./timeline.ts";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});
const W = CHEM_PREP.workZ;

/** hook: low along Anna's unsorted row, then up and back to the race view */
export const ROW_LOW: CamState = { pos: [0.95, 0.62, 1.05], target: [-0.35, 0.5, -0.25], fov: 40 };
/** the race: both benches, all four mascots, the bottom left free for the panel */
export const RACE: CamState = { pos: [0, 3.45, 5.3], target: [0, 0.38, -1.45], fov: 42 };
/** Anna's bet: at her bench, the unsorted row in front of her */
export const ANNA_BET: CamState = { pos: [START_X.anna + 0.15, 0.95, 1.35], target: [START_X.anna, 0.66, W.anna], fov: 40 };
/** Lumi's bet: from between the benches, her row in front of her */
export const LUMI_BET: CamState = { pos: [START_X.lumi + 0.2, 0.95, -0.75], target: [START_X.lumi, 0.66, W.lumi], fov: 40 };
/** results: the four in a line in front of Anna's bench, the cards above */
export const RESULTS: CamState = { pos: [0, 1.0, 4.3], target: [0, 1.12, 0.7], fov: 46 };
/** twist + reveal: Lumi between the benches, Anna's sorted row in the foreground, her own behind */
export const TWIST: CamState = { pos: [REVEAL_SPOT[0] + 0.1, 1.55, 2.7], target: [REVEAL_SPOT[0], 0.72, REVEAL_SPOT[2] - 0.3], fov: 40 };
export const REVEAL: CamState = { pos: [REVEAL_SPOT[0] + 0.2, 1.62, 1.85], target: [REVEAL_SPOT[0], 0.88, REVEAL_SPOT[2]], fov: 44 };
/** CTA: the whole cast under the CTA card */
export const CTA: CamState = { pos: [0.05, 1.15, 4.6], target: [0, 1.35, 0.7], fov: 46 };

export const CUTS = {
  annaBet: BEAT.annaBet,
  lumiBet: BEAT.lumiBet,
  go: BEAT.go,
  results: BEAT.results,
  twist: BEAT.twist,
  reveal: BEAT.reveal,
  cta: BEAT.cta,
} as const;

export const camAt = (f: number): CamState => {
  const C = CUTS;
  if (f < C.annaBet) return mixCam(ROW_LOW, RACE, seg(f, 14, C.annaBet - 4));
  if (f < C.lumiBet) return nudge(ANNA_BET, [0, 0, -0.18], seg(f, C.annaBet, C.lumiBet));
  if (f < C.go) return nudge(LUMI_BET, [0, 0, -0.15], seg(f, C.lumiBet, C.go));
  if (f < C.results) {
    // a slow drift in, then (Lumi done) toward Anna's bench for the last swaps
    const a = nudge(RACE, [0, -0.25, -0.35], seg(f, C.go, BEAT.lumiDone));
    return nudge(a, [-0.05, -0.15, -0.25], seg(f, BEAT.lumiDone + 10, BEAT.annaDone + 10));
  }
  if (f < C.twist) return nudge(RESULTS, [0, 0, -0.25], seg(f, C.results, C.twist));
  if (f < C.reveal) return nudge(TWIST, [0, 0, -0.2], seg(f, C.twist, C.reveal));
  if (f < C.cta) return nudge(REVEAL, [0.06, 0, -0.18], seg(f, C.reveal, C.reveal + 60, out));
  return nudge(CTA, [0, 0, -0.2], seg(f, C.cta, BEAT.end));
};
