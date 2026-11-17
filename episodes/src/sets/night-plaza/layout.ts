// Layout numbers of the night-plaza set (plain .ts so node scripts / reports can import it).
// Shared with assets/sets/night-plaza/build_night_plaza.py (three.js coordinates, metres).
import type { Vec3 } from "../../kit/env";

/** One tile = one step. Tile (i, j): i = east (+x), j = north (−z). The start tile (0, 0) is centred on the origin. */
export const TILE = 0.4;

export const NIGHT_PLAZA = {
  tile: TILE,
  /** paved area */
  paved: { x: [-10.2, 10.2] as const, z: [-44.2, 10.2] as const },
  facadeZ: -46.6,
  wingX: 13.4,
  wingZ1: -12.0,
  hedgeX: 10.75,
  lampX: 10.0,
  lampH: 3.4,
  lampZ: [8.0, 2.0, -4.0, -10.0, -16.0, -22.0, -28.0, -34.0, -40.0],
  /** foreground lamps (camera side) */
  fgLamps: [
    [-2.6, 3.55, 11.4],
    [2.6, 3.55, 11.4],
  ] as Vec3[],
  /** the brass distance plates beside Lumi's lane (tile column i = 1) every 10 tiles */
  plates: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  /** the moon light: direction toward the key light (behind-left of the courtyard, ~32° up) */
  moonDir: [-0.42, 0.53, -0.74] as Vec3,
  /** where the moon disc sits in the sky: the same bearing, drawn lower (~17° up) so it shows in the wide shots */
  moonDisc: [-0.36, 0.3, -0.88] as Vec3,
  /** the entrance canopy light and the LAB CLUB sign */
  canopy: [0, 4.6, -45.0] as Vec3,
};

/** World position of a tile centre (floor level y). */
export const tileWorld = (i: number, j: number, y = 0): Vec3 => [i * TILE, y, -j * TILE];

/** Lamp head positions (both hedges + the foreground pair). */
export const lampHeads = (): Vec3[] => [
  ...NIGHT_PLAZA.lampZ.flatMap((z): Vec3[] => [
    [-NIGHT_PLAZA.lampX, NIGHT_PLAZA.lampH - 0.05, z],
    [NIGHT_PLAZA.lampX, NIGHT_PLAZA.lampH - 0.05, z],
  ]),
  ...NIGHT_PLAZA.fgLamps,
];
