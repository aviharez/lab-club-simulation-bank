// Screen geometry for the 1080x1920 Math Race layout.
// Safe area: key content stays below y=150 and above y=1620 (bottom 300px reserved for UI).
import type { RaceTimeline } from "./sim.ts";

export const W = 1080;
export const H = 1920;
export const SAFE_TOP = 150;
export const SAFE_BOTTOM = 1620;

export const HEADER = { top: 160, height: 250 };
export const MASCOT = { feetY: 790, scale: 0.38 };
export const ROUND_PILL = { cy: 640 };

const LANE_W = 450;
const LANE_GAP = 60;
const LANE_X0 = (W - (2 * LANE_W + LANE_GAP)) / 2;

export const LANE = {
  width: LANE_W,
  top: 800,
  bottom: 1420,
  startZone: 92,
  finishZone: 58,
  wallGap: 8,
  x: (lane: 0 | 1) => LANE_X0 + lane * (LANE_W + LANE_GAP),
  cx: (lane: 0 | 1) => LANE_X0 + lane * (LANE_W + LANE_GAP) + LANE_W / 2,
};

export const PROGRESS = { top: 1440, height: 36 };
export const CAPTION = { top: 1500, height: 110 };

export const wallsTop = () => LANE.top + LANE.startZone;
export const wallsBottom = () => LANE.bottom - LANE.finishZone;

export const wallRect = (count: number, i: number) => {
  const total = wallsBottom() - wallsTop();
  const h = (total - (count - 1) * LANE.wallGap) / count;
  const y = wallsTop() + i * (h + LANE.wallGap);
  return { y, h };
};

/** Top edge of the first unbroken wall (where a ball stops). */
export const frontY = (tl: RaceTimeline, damage: number) => {
  const count = tl.cum.length;
  const i = tl.cum.findIndex((c) => damage < c);
  if (i === -1) return LANE.bottom - LANE.finishZone / 2;
  return wallRect(count, i).y;
};

/** Continuous "drill" depth: moves through each wall in proportion to the damage inside it. */
export const drillY = (tl: RaceTimeline, damage: number) => {
  const count = tl.cum.length;
  const i = tl.cum.findIndex((c) => damage < c);
  if (i === -1) return LANE.bottom - LANE.finishZone / 2;
  const prev = i === 0 ? 0 : tl.cum[i - 1];
  const { y, h } = wallRect(count, i);
  return y + (h * (damage - prev)) / (tl.cum[i] - prev);
};
