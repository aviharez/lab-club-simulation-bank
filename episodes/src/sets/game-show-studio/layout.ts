// Layout numbers of the game-show-studio set (plain .ts so node scripts / reports can import it).
// Shared with assets/sets/game-show-studio/build_game_show_studio.py (three.js coordinates, metres). Keep both in sync.
import type { Vec3 } from "../../kit/env";

const DOOR_W = 1.0;
const DOOR_H = 1.9;
const STAGE_Y = 0.3;

export const GAME_SHOW = {
  /** LED wall plane (z) and extent */
  ledZ: -4.4,
  ledX: [-6.4, 9.6] as const,
  ledY: [0.2, 5.4] as const,
  /** main stage: raised platform, glossy top */
  stageY: STAGE_Y,
  stageX: [-3.5, 3.5] as const,
  stageZ: [-2.75, 1.9] as const,
  /** the three big doors: centres (x), door plane (z), opening size, hinge on the left (-x) edge */
  doorX: [-1.62, 0, 1.62] as const,
  doorZ: -1.8,
  doorW: DOOR_W,
  doorH: DOOR_H,
  /** marquee frame around each door (outer size, bulb rows) */
  frameW: DOOR_W + 0.42,
  frameH: DOOR_H + 0.38,
  /** alcove behind each door: prize pedestal (top centre) */
  alcoveDepth: 0.95,
  pedestal: { z: -2.32, top: STAGE_Y + 0.42 },
  /** pastel door leaves, numbered 1-3 */
  doorColors: ["#f6b6cb", "#a9e3cf", "#b9c9f7"] as const,
  /** scoreboard screen above the doors (centre, size) */
  scoreboard: { pos: [0, 3.42, -1.86] as Vec3, size: [3.5, 1.0] as [number, number] },
  /** player mark (gold star) in front of the doors; Lumi's host podium; Zuzu's side spot */
  playerMark: [0, STAGE_Y, 0.35] as Vec3,
  podium: { pos: [2.85, STAGE_Y, 0.55] as Vec3, rotY: -0.65, top: STAGE_Y + 0.62 },
  zuzuSpot: [-2.75, STAGE_Y, 0.95] as Vec3,
  /** montage: two mini stages side by side (stage right), each with three mini doors */
  mini: {
    centers: [
      [5.3, 0.18, -1.55],
      [7.1, 0.18, -1.55],
    ] as Vec3[],
    radius: 0.86,
    top: 0.18,
    doorW: 0.34,
    doorH: 0.62,
    doorGap: 0.44,
    /** door plane z offset from the mini stage centre */
    doorDz: -0.38,
    labels: ["STAY", "SWITCH"] as const,
  },
  /** overhead truss (y) and the moving heads hanging from it */
  trussY: 4.7,
  heads: [
    [-3.2, 4.55, 0.9],
    [-1.1, 4.55, 0.9],
    [1.1, 4.55, 0.9],
    [3.2, 4.55, 0.9],
    [6.3, 4.55, 0.4],
  ] as Vec3[],
  /** foreground: audience rows + camera rigs */
  audienceZ: [4.3, 5.1, 5.9] as const,
  cameras: [
    { pos: [-3.9, 0, 3.3] as Vec3, rotY: 0.5 },
    { pos: [4.4, 0, 3.5] as Vec3, rotY: -0.45 },
  ],
};
