// Camera choreography for EP04: one pure function frame → CamState, shared by the 3D rig and the 2D overlays.
// Door beats use a low 3/4 angle so all three doors read and the player stays large in front of them; every
// reaction gets a close-up (each mascot ≥ 1/5 of the frame at her beats). The montage watches the mini stages.
import { Easing } from "remotion";
import { type CamState } from "../kit/camera";
import { ANNA, BEAT, LUMI_SPOT, ROUND_AT, ZUZU } from "./timeline";

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.2, 0, 0, 1);
const seg = (f: number, a: number, b: number, ease = inOut) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const nudge = (c: CamState, d: [number, number, number], t = 1): CamState => ({
  ...c,
  pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t],
  target: [c.target[0] + d[0] * t, c.target[1] + d[1] * t, c.target[2] + d[2] * t],
});

const l = LUMI_SPOT;
/** hook: the whole studio from the audience */
export const HOOK: CamState = { pos: [0.1, 3.5, 10.6], target: [0.1, 1.3, -1.2], fov: 54 };
/** bets: Anna on the mark, Miyu beside her */
export const BETS: CamState = { pos: [0.85, 1.2, 3.95], target: [0.6, 0.88, 0.5], fov: 44 };
/** the rounds: low 3/4 from front-right, all three doors behind the player */
export const DOORS: CamState = { pos: [1.55, 1.3, 4.7], target: [0.25, 1.12, -1.5], fov: 54 };
/** Lumi at her host podium */
export const LUMI_SHOT: CamState = { pos: [l[0] - 1.2, 1.15, l[2] + 2.0], target: [l[0], 0.95, l[2]], fov: 40 };
/** the player on the mark, close */
export const PLAYER_CU: CamState = { pos: [0.6, 1.0, 2.15], target: [0.0, 0.85, 0.3], fov: 40 };
/** Zuzu cheering on her side spot */
export const ZUZU_SHOT: CamState = { pos: [-2.1, 1.2, 3.55], target: [-2.75, 1.1, 0.95], fov: 44 };
/** "just luck": Anna (left) and Miyu (mark) */
export const LUCK: CamState = { pos: [-0.75, 1.2, 4.1], target: [-0.6, 0.88, 0.55], fov: 46 };
/** twist: Lumi with the 1,000 sign */
export const TWIST: CamState = { pos: [l[0] - 1.1, 1.3, l[2] + 2.35], target: [l[0], 1.1, l[2]], fov: 44 };
/** montage: both mini stages */
export const MINI: CamState = { pos: [6.2, 1.75, 4.1], target: [6.2, 0.85, -1.2], fov: 52 };
/** Anna on the STAY stage, close */
export const ANNA_MINI: CamState = { pos: [5.75, 0.8, 0.9], target: [5.3, 0.45, -1.1], fov: 40 };
/** results: Anna and Miyu side by side */
export const RESULTS: CamState = { pos: [0, 1.2, 3.75], target: [0, 1.1, 0.4], fov: 50 };
/** reveal: Lumi low in frame, room for the card above */
export const REVEAL: CamState = { pos: [l[0] - 1.15, 1.2, l[2] + 1.8], target: [l[0], 1.15, l[2]], fov: 48 };
/** CTA: the whole cast in a line, low in frame under the CTA card */
export const CTA: CamState = { pos: [0.45, 1.3, 6.2], target: [0.02, 1.5, 0.8], fov: 46 };

const A = ROUND_AT.anna;
const M = ROUND_AT.miyu;
export const CUTS = {
  bets: BEAT.bets,
  annaDoors: BEAT.anna,
  lumiA: A.host - 24,
  doorsA: A.host - 2,
  askA: A.ask,
  annaCU: A.decide,
  openA: A.open - 8,
  shockA: (A.rest ?? 0) + 19,
  miyuDoors: BEAT.miyu,
  lumiM: M.host - 22,
  doorsM: M.host - 2,
  miyuCU: M.decide,
  openM: M.open - 8,
  zuzu: ZUZU.cheer,
  luck: BEAT.luck,
  twist: BEAT.twist,
  montage: BEAT.montage,
  annaMini: ANNA.cry - 10,
  miniEnd: ANNA.cry + 40,
  results: BEAT.results,
  reveal: BEAT.reveal,
  cta: BEAT.cta,
} as const;

export const camAt = (f: number): CamState => {
  const C = CUTS;
  if (f < C.bets) return nudge(HOOK, [0, -0.5, -2.0], seg(f, 0, C.bets, out));
  if (f < C.annaDoors) return nudge(BETS, [-0.05, 0, -0.3], seg(f, C.bets, C.annaDoors));
  // Anna's round
  if (f < C.lumiA) return nudge(DOORS, [-0.1, 0, -0.35], seg(f, C.annaDoors, C.lumiA));
  if (f < C.doorsA) return nudge(LUMI_SHOT, [0.05, 0, -0.2], seg(f, C.lumiA, C.doorsA));
  if (f < C.askA) return nudge(DOORS, [-0.1, 0, -0.25], seg(f, C.doorsA, C.askA));
  if (f < C.annaCU) return nudge(LUMI_SHOT, [0.08, 0, -0.3], seg(f, C.askA, C.annaCU));
  if (f < C.openA) return nudge(PLAYER_CU, [0, 0, -0.2], seg(f, C.annaCU, C.openA));
  if (f < C.shockA) return nudge(DOORS, [-0.05, 0, -0.4], seg(f, C.openA, C.shockA));
  if (f < C.miyuDoors) return nudge(PLAYER_CU, [0, 0, -0.25], seg(f, C.shockA, C.miyuDoors, out));
  // Miyu's round
  if (f < C.lumiM) return nudge(DOORS, [-0.1, 0, -0.3], seg(f, C.miyuDoors, C.lumiM));
  if (f < C.doorsM) return nudge(LUMI_SHOT, [0.05, 0, -0.2], seg(f, C.lumiM, C.doorsM));
  if (f < C.miyuCU) return nudge(DOORS, [-0.1, 0, -0.3], seg(f, C.doorsM, C.miyuCU));
  if (f < C.openM) return nudge(PLAYER_CU, [0, 0, -0.2], seg(f, C.miyuCU, C.openM));
  if (f < C.zuzu) return nudge(DOORS, [-0.05, 0, -0.35], seg(f, C.openM, C.zuzu));
  if (f < C.luck) return nudge(ZUZU_SHOT, [0, 0, -0.2], seg(f, C.zuzu, C.luck));
  if (f < C.twist) return nudge(LUCK, [0, 0, -0.25], seg(f, C.luck, C.twist));
  // twist: Lumi's sign
  if (f < C.montage) return nudge(TWIST, [0.1, 0, -0.35], seg(f, C.twist, C.montage, out));
  // montage
  if (f < C.annaMini) return nudge(MINI, [0, -0.1, -0.6], seg(f, C.montage, C.annaMini));
  if (f < C.miniEnd) return nudge(ANNA_MINI, [0, 0, -0.2], seg(f, C.annaMini, C.miniEnd));
  if (f < C.results) return nudge(MINI, [0, 0, -0.3], seg(f, C.miniEnd, C.results));
  if (f < C.reveal) return nudge(RESULTS, [0, 0, -0.3], seg(f, C.results, C.reveal));
  if (f < C.cta) return nudge(REVEAL, [0.1, 0, -0.25], seg(f, C.reveal, C.reveal + 60, out));
  return nudge(CTA, [0, 0, -0.2], seg(f, C.cta, BEAT.end));
};
