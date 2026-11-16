// Camera choreography for the episode: one pure function frame → CamState, shared by the 3D rig and 2D overlays.
import { Easing } from "remotion";
import { CAMERAS, closeUp, mixCam, type CamState } from "../sets/lab/layout";
import { BEAT, jumpHeightAt, peakFrame } from "./timeline";

// Signature easings (motion-design "Playful" personality, camera stays smooth: no overshoot on camera)
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);

const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));

const shift = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t * 0.3, c.target[1] + d[1] * t * 0.3, c.target[2]],
});

const WIDE = CAMERAS.wide;
/** Reveal framing: Lumi low in frame, room for the card above. */
const REVEAL: CamState = (() => {
  const x = closeUp(2).target[0];
  return { pos: [x + 0.3, 1.18, 4.8], target: [x, 0.92, 0], fov: 30 };
})();

/** Follow Miyu (Moon chamber) as she rises. The target tracks her height, softened so the camera lags a little. */
const followMiyu = (f: number): CamState => {
  const lag = 6;
  const y = 0.5 * jumpHeightAt("moon", f) + 0.5 * jumpHeightAt("moon", f - lag);
  const c = closeUp(0, 0.12 + y, 9.2);
  return { ...c, fov: 27 };
};

export const FOLLOW = { in: [BEAT.takeoff + 46, BEAT.takeoff + 96], out: [Math.round(peakFrame("moon")) + 26, Math.round(peakFrame("moon")) + 86] } as const;

export const camAt = (f: number): CamState => {
  // 1. hook: slow push-in on the wide
  if (f < BEAT.setup) return mixCam(shift(WIDE, [0, 0.4, 3]), WIDE, seg(f, 0, BEAT.setup, out));
  // 2. setup: cut to the console, gentle drift; then crane up to the 3/4 view while Lumi runs to the Earth tube
  if (f < 186) return shift(CAMERAS.panel, [-0.25, 0.05, 0.2], seg(f, BEAT.setup, 186, inOut));
  if (f < 262) return mixCam(shift(CAMERAS.panel, [-0.25, 0.05, 0.2]), CAMERAS.iso, seg(f, 186, 246));
  // 3. countdown: settle into the wide, tiny push-in for tension
  if (f < BEAT.takeoff) return mixCam(CAMERAS.iso, shift(WIDE, [0, 0, 0.6]), seg(f, 262, 304));
  // 4. jump: wide → follow Miyu up → back to wide
  const wideJ = shift(WIDE, [0, 0, 0.6]);
  if (f < FOLLOW.in[0]) return wideJ;
  if (f < FOLLOW.out[0]) return mixCam(wideJ, followMiyu(f), seg(f, FOLLOW.in[0], FOLLOW.in[1]));
  if (f < FOLLOW.out[1]) return mixCam(followMiyu(f), wideJ, seg(f, FOLLOW.out[0], FOLLOW.out[1]));
  // 5-6. waiting gag + results on the wide
  if (f < BEAT.reveal) return mixCam(wideJ, WIDE, seg(f, BEAT.results - 20, BEAT.results + 20));
  // 7. reveal: dolly into Lumi, then pull back out for the CTA
  if (f < BEAT.cta) return mixCam(WIDE, REVEAL, seg(f, BEAT.reveal, BEAT.reveal + 34));
  return mixCam(REVEAL, shift(WIDE, [0, 0.3, 1.2]), seg(f, BEAT.cta, BEAT.cta + 36));
};
