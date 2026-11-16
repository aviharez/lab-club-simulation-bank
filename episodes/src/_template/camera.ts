// Camera as a pure function of the frame (shared by the 3D rig and the 2D billboards).
import type { CamState } from "../sets/lab/layout";

const TARGET_Z = 0.6;

/** Slow push-in on the line-up; mascots stay >= 1/5 of the frame height. */
export const camAt = (f: number): CamState => {
  const t = Math.min(1, f / 150);
  return { pos: [0, 1.1, 9.6 - 0.6 * t], target: [0, 0.62, TARGET_Z], fov: 30 };
};
