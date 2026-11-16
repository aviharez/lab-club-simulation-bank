// Interpolation helpers built on the house motion personality (src/kit/theme EASE/DUR).
import { Easing } from "remotion";
import { EASE } from "./theme";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
/** Signature pop: ease-out-back. */
export const pop = Easing.bezier(...EASE.pop);
/** Smooth move, no overshoot. */
export const move = Easing.bezier(...EASE.move);
/** Exits accelerate away. */
export const exitE = Easing.bezier(...EASE.exit);
