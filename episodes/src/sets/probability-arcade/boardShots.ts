// Board shots: cameras that frame a region of the Galton board inside the safe areas, plus an occlusion test so no
// actor covers the board in those shots (the board comes first; mascots may leave the frame).
// Plain .ts (no React) so the episode report can check every board shot of the timeline.
import { project, type CamState } from "../../kit/camera.ts";
import { ARCADE, TAG } from "./layout.ts";

type V3 = [number, number, number];
const M = ARCADE.machine;

/** A rectangle on the glass plane (world x / y, metres). */
export type Region = { x0: number; x1: number; y0: number; y1: number };

/** lowest point of a bet tag (the regions include the tags) */
const TAG_BOTTOM = TAG.clipY - TAG.drop * TAG.scale - 0.02;

const binsRegion = (k0: number, k1: number): Region => ({
  x0: M.binX(k0) - M.pitch / 2 - 0.03,
  x1: M.binX(k1) + M.pitch / 2 + 0.03,
  y0: TAG_BOTTOM, // the bin number plaques and the bet tags under them
  y1: M.binY0 + M.binH + 0.06, // the bin walls
});

export const REGIONS = {
  /** the whole board: funnel neck, all pegs, all bins and their numbers */
  board: { x0: -M.halfW - 0.05, x1: M.halfW + 0.05, y0: TAG_BOTTOM, y1: M.funnel.neckY + 0.12 } as Region,
  /** the lower board during the pour: all bins (numbers + tags) and the last 7 peg rows */
  pour: { x0: -M.halfW - 0.05, x1: M.halfW + 0.05, y0: TAG_BOTTOM, y1: M.pegY(5) + 0.1 } as Region,
  /** all 13 bins with numbers and bet tags */
  bins: binsRegion(0, 12),
  /** bins 0..6: Anna's far-left bin next to Zuzu's centre bin */
  annaVsZuzu: binsRegion(0, 6),
  /** the pegs (for the first slow balls) */
  pegs: { x0: -M.halfW - 0.05, x1: M.halfW + 0.05, y0: M.pegY(11) - 0.08, y1: M.funnel.neckY + 0.12 } as Region,
};

/** Screen layout (px, 1080×1920): safe areas top 150 / bottom 300 (CLAUDE.md), side margin. */
export const SCREEN = { w: 1080, h: 1920, top: 150, bottom: 300, side: 36 };
/** Free area for a board shot: px from the top / bottom edge the region must stay clear of. */
export type Area = { top: number; bottom: number };
/** under the caption pill (it ends at y 270) */
export const UNDER_CAPTION: Area = { top: 290, bottom: SCREEN.bottom };
/** under the caption pill and above the bottom notebook panel (it starts at y 1322) */
export const ABOVE_PANEL: Area = { top: 290, bottom: SCREEN.h - 1306 };

/**
 * Straight-on camera that fits `r` inside the safe area (the limiting side touches the margin, the other is centred).
 * `fill` < 1 leaves extra room. Straight-on keeps the bins' heights comparable across the frame (no keystone).
 */
export const fitCam = (r: Region, fov = 40, fill = 1, area: Area = SCREEN): CamState => {
  const S = { ...SCREEN, top: area.top, bottom: area.bottom };
  const usableH = (S.h - S.top - S.bottom) / S.h;
  const usableW = (S.w - 2 * S.side) / S.w;
  const aspect = S.w / S.h;
  const H = Math.max((r.y1 - r.y0) / usableH, (r.x1 - r.x0) / usableW / aspect) / fill;
  const dist = H / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
  const cx = (r.x0 + r.x1) / 2;
  // the safe area's centre is above the frame centre: shift the frame down so the region sits in it
  const safeMidPx = (S.top + (S.h - S.bottom)) / 2;
  const cy = (r.y0 + r.y1) / 2 - ((S.h / 2 - safeMidPx) / S.h) * H;
  return { pos: [cx, cy, M.glassZ + dist], target: [cx, cy, M.glassZ], fov };
};

type Rect = { x0: number; x1: number; y0: number; y1: number };
const screenRect = (cam: CamState, pts: V3[]): Rect => {
  const p = pts.map((q) => project(cam, q, SCREEN.w, SCREEN.h));
  return { x0: Math.min(...p.map((q) => q.x)), x1: Math.max(...p.map((q) => q.x)), y0: Math.min(...p.map((q) => q.y)), y1: Math.max(...p.map((q) => q.y)) };
};
const regionCorners = (r: Region): V3[] => [
  [r.x0, r.y0, M.glassZ],
  [r.x1, r.y0, M.glassZ],
  [r.x0, r.y1, M.glassZ],
  [r.x1, r.y1, M.glassZ],
];

/** Where the region lands on screen, and whether it sits fully inside the safe area. */
export const regionOnScreen = (cam: CamState, r: Region, area: Area = SCREEN) => {
  const s = screenRect(cam, regionCorners(r));
  const S = { ...SCREEN, top: area.top, bottom: area.bottom };
  const inside = s.x0 >= S.side - 1 && s.x1 <= S.w - S.side + 1 && s.y0 >= S.top - 1 && s.y1 <= S.h - S.bottom + 1;
  return { rect: s, inside };
};

/** Mascot bounding box at scale 1 (~1.05 m tall chibi + hair/ears), feet at `pos`. */
const ACTOR_BOX = { halfW: 0.32, h: 1.12, halfD: 0.28 };

/** Actors whose on-screen box overlaps the region while standing in front of the board. */
export const occluders = (cam: CamState, r: Region, actors: { name: string; pos: V3; scale?: number }[]) => {
  const reg = screenRect(cam, regionCorners(r));
  return actors.filter((a) => {
    const s = a.scale ?? 1;
    if (a.pos[2] - ACTOR_BOX.halfD * s <= M.bezelZ) return false; // behind the glass plane: cannot cover it
    const pts: V3[] = [];
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) for (const y of [0, ACTOR_BOX.h * s]) pts.push([a.pos[0] + dx * ACTOR_BOX.halfW * s, a.pos[1] + y, a.pos[2] + dz * ACTOR_BOX.halfD * s]);
    const b = screenRect(cam, pts);
    return b.x1 > reg.x0 && b.x0 < reg.x1 && b.y1 > reg.y0 && b.y0 < reg.y1;
  }).map((a) => a.name);
};

/** Where the floor cast stands during board shots: beside the machine, clear of the board. */
export const ASIDE: Record<"anna" | "lumi" | "zuzu", V3> = {
  anna: [-1.6, 0, -0.35],
  zuzu: [1.6, 0, -0.35],
  lumi: [2.05, 0, 0.35],
};
