// Geometry, palette and camera presets for the reusable 3D lab set. 1 world unit = 1 metre; mascots are ~1 unit tall.
import * as THREE from "three";

export const MASCOT_COLORS = {
  zuzu: "#f2bf3b",
  anna: "#f27096",
  lumi: "#80adf2",
  miyu: "#6e4a8f",
} as const;

export const PASTEL = {
  wall: "#fbf6ee",
  wallTrim: "#efe4d4",
  floor: "#f4ede3",
  metal: "#d9d4ce",
  metalDark: "#b9b2aa",
  ink: "#3a2c24",
  mint: "#bfe6d4",
  leaf: "#8cc79a",
  leafDark: "#6fae82",
  pot: "#f3c1a8",
};

export const CHAMBER = {
  /** inner height of the glass, floor to cap */
  innerHeight: 4.5,
  radius: 0.6,
  spacing: 1.45,
  /** chamber floor (pedestal top) */
  floorY: 0.12,
  /** height ruler range (m) */
  rulerMax: 4,
};

/** Chamber centre x for index 0..3 (left → right). */
export const chamberX = (i: number, count = 4) => (i - (count - 1) / 2) * CHAMBER.spacing;
export const CHAMBER_LABEL_Y = CHAMBER.floorY + CHAMBER.innerHeight + 0.55;

// ---------------------------------------------------------------- camera

export type CamState = { pos: [number, number, number]; target: [number, number, number]; fov: number };

export const CAMERAS = {
  /** establishing: all four chambers, labels to floor, straight on */
  wide: { pos: [0, 4.2, 25.5], target: [0, 2.34, 0], fov: 26 } as CamState,
  /** 3/4 isometric-ish view over all chambers, from the front right and above */
  iso: { pos: [11.5, 9.5, 19.5], target: [0.2, 1.75, 0], fov: 25 } as CamState,
  /** control panel close-up (Lumi at the console) */
  panel: { pos: [1.55, 1.75, 7.9], target: [3.3, 1.0, 1.45], fov: 30 } as CamState,
};

/** Close-up on one chamber, framing a mascot whose feet are at height `y`. */
export const closeUp = (i: number, y = CHAMBER.floorY, dist = 7.5): CamState => {
  const x = chamberX(i);
  return { pos: [x + 0.35, y + 1.25, dist], target: [x, y + 0.55, 0], fov: 24 };
};

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
