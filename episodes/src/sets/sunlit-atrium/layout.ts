// Layout numbers of the sunlit-atrium set (plain .ts so node scripts / reports can import it).
import type { Vec3 } from "../../kit/env";

/** Layout numbers shared with the Blender build script (three.js coordinates, metres). */
export const SUNLIT_ATRIUM = {
  backZ: -4.0,
  ceilY: 5.0,
  /** release plumb line: the floor tape's 0 */
  edgeX: 0,
  /** balcony deck top + its front lip */
  deckY: 1.55,
  lipX: -0.08,
  /** lanes: Zuzu drops on the front lane, Anna throws on the back lane (standing on her step) */
  lane: { zuzu: 0.45, anna: -0.45 },
  stepTop: 1.631,
  /** release height of the balls' lowest point (= data H) */
  releaseY: 2.0,
  /** floor tape on Anna's lane, x range */
  tape: [-0.06, 3.42] as const,
  windows: [-2.0, -0.2, 1.6, 3.4],
  windowY: [0.55, 4.3] as const,
  /** the sun: a low late-afternoon sun from behind-left (direction the light travels) */
  sunDir: [0.42, -0.445, 0.79] as Vec3,
  lamps: [
    [1.1, 3.55, -1.4],
    [3.0, 3.75, 0.2],
    [-1.6, 2.95, -1.0],
  ] as Vec3[],
  sconces: [
    [-3.08, 1.08, -2.6],
    [-3.08, 1.08, -0.2],
  ] as Vec3[],
  deskLamp: [-2.68, 2.48, 0.98] as Vec3,
};
