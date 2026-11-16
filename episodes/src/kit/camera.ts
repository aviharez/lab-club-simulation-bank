// Camera model shared by every set: a CamState is pure data (position, target, fov), so the 3D rig and the 2D
// overlays (billboards, labels) compute the same projection from the same frame.
import * as THREE from "three";

export type CamState = { pos: [number, number, number]; target: [number, number, number]; fov: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];

/** Blend two camera states (t in 0..1, already eased by the caller). */
export const mixCam = (a: CamState, b: CamState, t: number): CamState => ({
  pos: lerp3(a.pos, b.pos, t),
  target: lerp3(a.target, b.target, t),
  fov: lerp(a.fov, b.fov, t),
});

/** A THREE camera configured from a CamState (used both by the 3D rig and the 2D overlays). */
export const toThreeCamera = (c: CamState, aspect: number, cam = new THREE.PerspectiveCamera()) => {
  cam.fov = c.fov;
  cam.aspect = aspect;
  cam.near = 0.1;
  cam.far = 120;
  cam.position.set(...c.pos);
  cam.lookAt(...c.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return cam;
};

const scratch = new THREE.PerspectiveCamera();
const v = new THREE.Vector3();

/** Project a world point to screen pixels for the given camera. `visible` is false behind the camera. */
export const project = (c: CamState, p: [number, number, number], width: number, height: number) => {
  toThreeCamera(c, width / height, scratch);
  v.set(...p).project(scratch);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 && v.z > -1 };
};
