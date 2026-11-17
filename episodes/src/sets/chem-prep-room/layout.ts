// Layout numbers of the chem-prep-room set (plain .ts so node scripts / reports can import it).
// Shared with assets/sets/chem-prep-room/build_chem_prep_room.py (three.js coordinates, metres).
import type { Vec3 } from "../../kit/env";

export const SLOTS = 12;
/** Beaker slot spacing along a bench (centre to centre). */
export const SLOT = 0.17;

export const CHEM_PREP = {
  room: { x: [-3.2, 3.2] as const, z: [-3.7, 3.4] as const, h: 3.2 },
  bench: { length: 2.4, depth: 0.46, top: 0.4 },
  /** bench centre lines (the beakers stand on them) */
  benchZ: { anna: 0.0, lumi: -2.1 },
  /** the mascot works behind her bench (between the benches for Anna, in front of the shelves for Lumi) */
  workZ: { anna: -0.47, lumi: -2.57 },
  /** the referee (left end) and the finish (right end), between the benches */
  referee: [-1.36, 0, -1.15] as Vec3,
  finish: [1.36, 0, -1.15] as Vec3,
  windows: { x: -3.2, z: [-2.1, 0.1], y: [0.85, 2.75] as const, w: 1.25 },
  /** pendant bulbs (practicals) */
  pendants: [
    [-1.45, 2.32, -2.1],
    [1.45, 2.32, -2.1],
  ] as Vec3[],
  /** the burner flame on the side counter */
  flame: [2.85, 0.565, -2.6] as Vec3,
  /** direction toward the key light: the window light from the left, ~21° up */
  sunDir: [-0.93, 0.37, 0.02] as Vec3,
};

/** World x of slot k (0 = left end). */
export const slotX = (k: number) => (k - (SLOTS - 1) / 2) * SLOT;

/** Beaker geometry and the liquid level of value v (1..12): equal steps, so the level IS the value. */
export const BEAKER = { r: 0.058, h: 0.22, base: 0.01, level0: 0.0, step: 0.0158 } as const;
export const liquidHeight = (v: number) => BEAKER.level0 + v * BEAKER.step;
