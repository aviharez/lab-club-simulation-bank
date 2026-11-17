// Camera choreography for EP02: one pure function frame → CamState, shared by the 3D rig and the 2D overlays.
// Wide shots show the whole 3 m drop (the objects are the subject); cut-ins keep every mascot readable at the
// beats where she reacts (deck close-ups, Lumi at the pump, Miyu on the bench).
import { Easing } from "remotion";
import { mixCam, type CamState } from "../kit/camera";
import type { Medium } from "./data";
import { BEAT, FEATHER_AIR, HAMMER_AIR, MIYU, propAt, STAGE, VAC_LAND, WALK } from "./timeline";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});

const X = STAGE.columnX;
/** both columns, labels readable */
export const WIDE: CamState = { pos: [0, 2.6, 11.6], target: [0, 2.2, 0], fov: 36 };
/** close on the two droppers at one column (each mascot ≈ 1/4 of the frame) */
export const DECK = (m: Medium): CamState => ({ pos: [X[m], 3.55, 4.9], target: [X[m], 3.12, 0], fov: 40 });
/** the whole 3 m drop, tube floor clear of the bottom chart panel */
export const TUBE = (m: Medium): CamState => ({ pos: [X[m] + 0.35, 2.15, 12.2], target: [X[m], 1.86, 0], fov: 32 });
/** Lumi, the console and the pump gauge */
export const PUMP_SHOT: CamState = { pos: [0.45, 1.6, 4.2], target: [1.95, 0.85, 1.4], fov: 46 };
/** Miyu on her bench */
export const MIYU_SHOT: CamState = { pos: [-0.45, 0.95, 3.95], target: [-1.85, 0.32, 2.05], fov: 46 };
/** reveal: Lumi low in frame, room for the card above (camera inside the foreground railing) */
export const REVEAL: CamState = { pos: [1.35, 0.95, 4.15], target: [1.5, 0.72, 2.35], fov: 58 };
/** CTA: the two droppers cheering at the VACUUM column, card above */
export const CTA: CamState = { pos: [0.9, 3.5, 6.0], target: [0.9, 3.0, 0], fov: 40 };

/** Follow the air feather down; the target never drops so low that the tube floor hides behind the chart. */
const follow = (f: number): CamState => {
  const lag = 8;
  const y = 0.5 * propAt("feather", "air", f).pos[1] + 0.5 * propAt("feather", "air", f - lag).pos[1];
  const ty = Math.max(1.3, y + 0.15);
  return { pos: [X.air + 0.25, ty + 0.35, 6.4], target: [X.air + 0.05, ty, 0], fov: 34 };
};

export const CUTS = {
  hammerCut: HAMMER_AIR + 8,
  followIn: HAMMER_AIR + 46,
  miyuNap: MIYU.napShot[0],
  napBack: MIYU.napShot[1],
  gloat: FEATHER_AIR + 18,
  pump: BEAT.twist - 44,
  pumpOut: WALK.end - 64,
  deckVac: WALK.end + 4,
  tubeVac: BEAT.dropVac - 8,
  react: VAC_LAND + 22,
  miyuWake: MIYU.wake - 4,
} as const;

export const camAt = (f: number): CamState => {
  const C = CUTS;
  // 1. hook: push from both columns into the droppers at the AIR column
  if (f < BEAT.bets) return mixCam(WIDE, DECK("air"), seg(f, 0, 80, out));
  // 2. bets: drift toward Anna, then Zuzu
  if (f < BEAT.countdown) {
    const toAnna = nudge(DECK("air"), [-0.28, 0, -0.3], seg(f, BEAT.bets, BEAT.bets + 30));
    return nudge(toAnna, [0.56, 0, 0], seg(f, 136, 160));
  }
  // 3. countdown: pull back to the whole drop
  const deckEnd = nudge(nudge(DECK("air"), [-0.28, 0, -0.3]), [0.56, 0, 0]);
  if (f < C.hammerCut) return mixCam(deckEnd, TUBE("air"), seg(f, BEAT.countdown, BEAT.countdown + 40));
  // 4. hammer is down: cut to Anna's smug face + Zuzu's shock
  if (f < C.followIn) return nudge(DECK("air"), [0, 0, 0.25], seg(f, C.hammerCut, C.followIn, out));
  // 5. follow the feather; Miyu naps; back to the feather for its landing
  if (f < C.miyuNap) return mixCam(nudge(DECK("air"), [0, 0, 0.25]), follow(f), seg(f, C.followIn, C.followIn + 30));
  if (f < C.napBack) return nudge(MIYU_SHOT, [0.03, 0, -0.15], seg(f, C.miyuNap, C.napBack));
  if (f < C.gloat) return follow(f);
  // 6. feather is down: Anna gloats, Zuzu cries
  if (f < C.pump) return mixCam(follow(C.gloat), DECK("air"), seg(f, C.gloat, C.gloat + 20));
  // 7. twist: Lumi starts the pump, the gauge falls to 0; pull out to see the walk end at the VACUUM column
  if (f < C.pumpOut) return nudge(PUMP_SHOT, [0.1, 0, -0.25], seg(f, C.pump, C.pumpOut));
  if (f < C.deckVac) return mixCam(nudge(PUMP_SHOT, [0.1, 0, -0.25]), WIDE, seg(f, C.pumpOut, C.pumpOut + 40));
  // 8. vacuum: pick up, then the whole drop in slow-mo
  if (f < C.tubeVac) return nudge(DECK("vacuum"), [0, 0, -0.2], seg(f, C.deckVac, C.tubeVac));
  if (f < C.react) return nudge(TUBE("vacuum"), [0, 0, -0.5], seg(f, C.tubeVac, VAC_LAND, out));
  // 9. reactions: Anna shocked + Zuzu cheering, then Miyu wakes
  if (f < C.miyuWake) return nudge(DECK("vacuum"), [0, 0, -0.2], seg(f, C.react, C.miyuWake));
  if (f < BEAT.results) return nudge(MIYU_SHOT, [0, 0, -0.15], seg(f, C.miyuWake, BEAT.results, out));
  // 10. results over both columns
  if (f < BEAT.reveal) return nudge(WIDE, [0, 0, -0.4], seg(f, BEAT.results, BEAT.reveal));
  // 11. reveal: dolly to Lumi; CTA: pull back to everyone
  if (f < BEAT.cta) return mixCam(nudge(WIDE, [0, 0, -0.4]), REVEAL, seg(f, BEAT.reveal, BEAT.reveal + 34));
  return mixCam(REVEAL, CTA, seg(f, BEAT.cta, BEAT.cta + 36));
};
