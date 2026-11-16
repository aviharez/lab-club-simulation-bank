// Lab Club house style for every episode: Fredoka, ink/paper colours, safe areas, motion personality.
// Shared by the 2D overlays (src/kit) and the canvas textures of the 3D sets.
import { loadFont } from "@remotion/google-fonts/Fredoka";

export const fredoka = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});
export const FONT = fredoka.fontFamily;

export const INK = "#3a2c24";
export const INK_SOFT = "#7a6a5c";
export const PAPER = "#fffaf2";

export const SAFE = { top: 150, bottom: 1620, side: 40 };

/** Motion personality: Playful. One signature pop easing, one smooth move, three durations (frames @30fps). */
export const EASE = {
  pop: [0.175, 0.885, 0.32, 1.275] as const, // ease-out-back
  move: [0.2, 0, 0, 1] as const,
  exit: [0.3, 0, 1, 1] as const,
};
export const DUR = { quick: 7, standard: 11, slow: 20 };
