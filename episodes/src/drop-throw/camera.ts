// Camera choreography for EP03: one pure function frame → CamState, shared by the 3D rig and the 2D overlays.
// The drop and the replay are wide (the balls are the subject); close-ups keep every mascot readable at her beats
// (balcony for Anna + Zuzu, Miyu with her stopwatch, Lumi for the reveal).
import { Easing } from "remotion";
import { type CamState } from "../kit/camera";
import { BEAT, LAND, MIYU, REPLAY, SPOT } from "./timeline";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});

/** hook: Anna + Zuzu with their balls at the balcony edge, the atrium behind */
export const HOOK: CamState = { pos: [2.4, 2.5, 4.4], target: [-0.1, 1.95, -0.1], fov: 40 };
/** Anna + Zuzu on the balcony (each ≈ 1/3 of the frame) */
export const BALCONY: CamState = { pos: [1.45, 2.45, 2.35], target: [-0.25, 2.0, 0], fov: 38 };
/** countdown + release: both girls large, both hands and the first part of both paths in frame */
export const RELEASE: CamState = { pos: [1.2, 2.25, 2.6], target: [-0.05, 1.95, -0.05], fov: 42 };
/** the whole drop: release point, both lanes, the tape past the landing, floor clear of the stopwatch pills */
export const DROP: CamState = { pos: [0.6, 2.0, 6.8], target: [0.68, 0.95, -0.2], fov: 44 };
/** side view for the replay: square on to the throw plane, floor clear of the chart panel */
export const SIDE: CamState = { pos: [0.85, 1.0, 8.0], target: [0.85, 0.9, 0], fov: 44 };
/** Miyu and her stopwatch, the landed balls behind her */
const m = SPOT.miyu;
export const MIYU_SHOT: CamState = { pos: [m[0] - 0.95, 0.78, m[2] + 1.45], target: [m[0] - 0.05, 0.6, m[2]], fov: 40 };
/** results: down on the floor tape and both landing spots */
export const RESULTS: CamState = { pos: [1.15, 2.7, 5.0], target: [1.0, 0.35, -0.4], fov: 46 };
/** reveal: Lumi alone, low in frame, room for the card above (Miyu just off the left edge) */
const l = SPOT.lumi;
export const REVEAL: CamState = { pos: [l[0] - 1.15, 0.95, l[2] + 1.75], target: [l[0], 0.9, l[2]], fov: 48 };
/** Lumi's hint before the replay: Lumi alone, a little wider than the reveal */
export const HINT: CamState = { pos: [l[0] - 1.25, 1.05, l[2] + 1.95], target: [l[0], 0.85, l[2]], fov: 46 };
/** CTA: everyone */
export const CTA: CamState = { pos: [4.3, 1.85, 7.2], target: [1.4, 1.4, 0.2], fov: 48 };

export const CUTS = {
  balcony: BEAT.bets,
  miyu: BEAT.miyu,
  release: BEAT.countdown,
  drop: BEAT.release + 18,
  landClose: LAND + 12,
  watch: BEAT.watch,
  doubt: BEAT.doubt,
  hint: BEAT.hint,
  side: REPLAY.cut,
  react: BEAT.react,
  miyuSmug: MIYU.smug - 4,
  results: BEAT.results,
  reveal: BEAT.reveal,
  cta: BEAT.cta,
} as const;

export const camAt = (f: number): CamState => {
  const C = CUTS;
  // 1. hook: push into the atrium
  if (f < C.balcony) return nudge(HOOK, [-0.25, 0, -0.45], seg(f, 0, C.balcony, out));
  // 2. bets: Anna, then Zuzu
  if (f < C.miyu) {
    const toAnna = nudge(BALCONY, [-0.1, 0.05, -0.35], seg(f, C.balcony, C.balcony + 30));
    return nudge(toAnna, [0.05, -0.05, 0.3], seg(f, 140, 165));
  }
  // 3. Miyu has the stopwatch
  if (f < C.release) return nudge(MIYU_SHOT, [0.05, 0, -0.25], seg(f, C.miyu, C.release));
  // 4. countdown + release close on the balcony, then wide for the fall (slow push during the slow-mo)
  if (f < C.drop) return nudge(RELEASE, [-0.05, 0, -0.2], seg(f, C.release, C.drop));
  if (f < C.landClose) return nudge(DROP, [0, 0, -0.3], seg(f, C.drop, C.landClose));
  // 5. landed: the balcony reacts
  if (f < C.watch) return nudge(BALCONY, [0, 0, -0.2], seg(f, C.landClose, C.watch, out));
  // 6. Miyu's stopwatch
  if (f < C.doubt) return nudge(MIYU_SHOT, [0.08, 0.02, -0.35], seg(f, C.watch, C.doubt));
  // 6b. Anna doubles down on the balcony, then Lumi suggests the side view
  if (f < C.hint) return nudge(BALCONY, [-0.1, 0.03, -0.3], seg(f, C.doubt, C.hint, out));
  if (f < C.side) return nudge(HINT, [0.05, 0, -0.25], seg(f, C.hint, C.side));
  // 7. twist: side-view replay, ghosts and same-height lines
  if (f < C.react) return nudge(SIDE, [0, 0, -0.2], seg(f, C.side, C.react));
  // 8. reactions: balcony, then Miyu
  if (f < C.miyuSmug) return nudge(BALCONY, [0, 0, -0.25], seg(f, C.react, C.miyuSmug, out));
  if (f < C.results) return nudge(MIYU_SHOT, [0.05, 0, -0.2], seg(f, C.miyuSmug, C.results));
  // 9. results on the tape
  if (f < C.reveal) return nudge(RESULTS, [0, -0.1, -0.3], seg(f, C.results, C.reveal));
  // 10. reveal: dolly in to Lumi
  if (f < C.cta) return nudge(REVEAL, [0.1, 0, -0.25], seg(f, C.reveal, C.reveal + 60, out));
  // 11. CTA
  return nudge(CTA, [-0.1, 0, -0.3], seg(f, C.cta, BEAT.end));
};
