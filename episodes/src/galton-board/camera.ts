// Camera choreography for EP05: one pure function frame → CamState, shared by the 3D rig, the 2D overlays and the
// report. Board shots are fitted to the board (fitCam: the region sits fully inside the free screen area, straight on);
// the floor cast stands ASIDE in them, so nothing covers the board. Reactions get close-ups (each mascot ≥ 1/5 frame).
import { Easing } from "remotion";
import { mixCam, type CamState } from "../kit/camera.ts";
import { ABOVE_PANEL, fitCam, REGIONS, UNDER_CAPTION, type Area, type Region } from "../sets/probability-arcade/boardShots.ts";
import { BEAT, PATHS, REVEAL_SPOT } from "./timeline.ts";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});
/** a slow push-in along the view axis for a board shot (ends on the fitted framing, so the fit check holds at its end) */
const pushIn = (c: CamState, dist: number, t: number): CamState => nudge(c, [0, 0, dist * (1 - t)]);


/** hook opens on the "PROBABILITY ARCADE" neon (fully in frame), then glides to the wide shot */
export const NEON: CamState = { pos: [-1.7, 3.35, 5.9], target: [-2.7, 3.8, -4.3], fov: 30 };
export const NEON_GLIDE = 46;
/** hook: the arcade from the aisle, the cabinets framing the machine */
export const WIDE: CamState = { pos: [0, 2.55, 7.9], target: [0, 2.25, -1.2], fov: 40 };
/** Anna on her mark pointing at the far-left bin */
export const ANNA_BET: CamState = { pos: [-1.45, 1.0, 2.55], target: [-1.02, 0.8, 0.0], fov: 40 };
/** Zuzu on her mark pointing at the centre bin */
export const ZUZU_BET: CamState = { pos: [1.15, 1.0, 2.5], target: [0.45, 0.8, 0.1], fov: 40 };
/** Miyu on her walkway at the funnel */
export const MIYU_CU: CamState = { pos: [-0.55, 4.55, 1.7], target: [0.3, 3.95, -1.0], fov: 44 };
/** results: Anna and Zuzu side by side, low, the cards above */
export const RESULTS: CamState = { pos: [0, 0.95, 3.0], target: [0, 1.05, 0.4], fov: 46 };
/** reveal: Lumi low in frame, room for the card above */
export const REVEAL: CamState = { pos: [REVEAL_SPOT[0] + 0.35, 1.2, REVEAL_SPOT[2] + 1.85], target: [REVEAL_SPOT[0], 1.15, REVEAL_SPOT[2]], fov: 48 };
/** CTA: the whole cast in a line under the CTA card */
export const CTA: CamState = { pos: [0.3, 1.35, 5.4], target: [0, 1.55, 0.6], fov: 46 };

/** The board shots of the episode: region + free screen area (the report checks fit and occlusion for each). */
export const BOARD_SHOTS: Record<string, { region: Region; area: Area }> = {
  /** the first balls: the whole board under the caption */
  slow: { region: REGIONS.board, area: UNDER_CAPTION },
  /** the fast pour: bins + lower pegs above the notebook panel */
  pour: { region: REGIONS.pour, area: ABOVE_PANEL },
  /** bin 0 vs bin 6 */
  vs: { region: REGIONS.annaVsZuzu, area: ABOVE_PANEL },
  /** the bell curve over all bins */
  bins: { region: REGIONS.bins, area: ABOVE_PANEL },
  /** 1 path vs 924 paths: the whole board, panel gone */
  paths: { region: REGIONS.board, area: UNDER_CAPTION },
};
const FIT = Object.fromEntries(Object.entries(BOARD_SHOTS).map(([k, v]) => [k, fitCam(v.region, 40, 1, v.area)])) as Record<keyof typeof BOARD_SHOTS, CamState>;
export const BOARD_CAM = FIT;

export const CUTS = {
  bets: BEAT.bets,
  zuzuBet: BEAT.zuzuBet,
  pour: BEAT.pour,
  slow: BEAT.slow,
  pour2: BEAT.fast,
  vs: BEAT.vs,
  twist: BEAT.twist,
  paths: BEAT.paths,
  results: BEAT.results,
  reveal: BEAT.reveal,
  cta: BEAT.cta,
} as const;

/** Frames where the camera is a board shot, and which one (the report checks these). */
export const boardShotAt = (f: number): keyof typeof BOARD_SHOTS | null => {
  const C = CUTS;
  if (f >= C.slow && f < C.pour2) return "slow";
  // from the first ball to the results the camera never leaves the board
  if (f >= C.pour2 && f < C.vs) return "pour";
  if (f >= C.vs && f < C.twist) return "vs";
  if (f >= C.twist && f < C.paths) return "bins";
  if (f >= C.paths && f < C.results) return "paths";
  return null;
};

export const camAt = (f: number): CamState => {
  const C = CUTS;
  if (f < NEON_GLIDE) return mixCam(NEON, WIDE, seg(f, 0, NEON_GLIDE));
  if (f < C.bets) return nudge(WIDE, [0, -0.25, -1.0], seg(f, NEON_GLIDE, C.bets, out));
  if (f < C.zuzuBet) return nudge(ANNA_BET, [0.05, 0, -0.25], seg(f, C.bets, C.zuzuBet));
  if (f < C.pour) return nudge(ZUZU_BET, [-0.05, 0, -0.25], seg(f, C.zuzuBet, C.pour));
  if (f < C.slow) return nudge(MIYU_CU, [0.05, -0.05, -0.2], seg(f, C.pour, C.slow));
  // board shots: a gentle push-in that settles on the fitted framing
  if (f < C.pour2) return pushIn(FIT.slow, 0.35, seg(f, C.slow, C.slow + 60, out));
  if (f < C.vs) return pushIn(FIT.pour, 0.4, seg(f, C.pour2, C.vs));
  if (f < C.twist) return pushIn(FIT.vs, 0.25, seg(f, C.vs, C.twist, out));
  if (f < C.paths) return pushIn(FIT.bins, 0.3, seg(f, C.twist, C.twist + 30, out));
  if (f < C.results) return pushIn(FIT.paths, 0.3, seg(f, C.paths, PATHS.anna + 10, out));
  if (f < C.reveal) return nudge(RESULTS, [0, 0, -0.25], seg(f, C.results, C.reveal));
  if (f < C.cta) return nudge(REVEAL, [0.08, 0, -0.25], seg(f, C.reveal, C.reveal + 60, out));
  return nudge(CTA, [0, 0, -0.2], seg(f, C.cta, BEAT.end));
};

