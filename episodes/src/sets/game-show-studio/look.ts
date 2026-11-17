// "Lab Club Prize Studio": a TV game-show studio built inside the lab (EP04).
// Palette: deep purple, gold, warm white bulbs, a touch of magenta.
// Light story: a dark stage. A soft warm-white key from the front-top keeps the faces bright; magenta + violet rims from
// behind separate the mascots from the dark set; moving spotlights on the truss cut through light haze; marquee bulbs,
// the scoreboard and a dim LED wall are the practicals; the glossy stage floor reflects all of them.
import type { LookPreset } from "../../kit/env";

export const GAME_SHOW_LOOK: LookPreset = {
  name: "game-show-studio",
  background: "#120a1f",
  toneMapping: "aces",
  exposure: 1.05,
  fog: { color: "#26163c", density: 0.018 },
  lights: {
    hemisphere: { sky: "#c9b8ff", ground: "#2b1a3a", intensity: 0.42 },
    ambient: { color: "#e8dcff", intensity: 0.12 },
    key: {
      position: [2.2, 7.5, 9.5],
      color: "#fff0dc",
      intensity: 2.3,
      shadow: { mapSize: 4096, radius: 8, area: [-9, 11, 7, -5], far: 40, bias: -0.0003, normalBias: 0.02 },
    },
    fill: [
      { position: [-6, 3, 7], color: "#bfb0ff", intensity: 0.45 },
      { position: [6, 2, 8], color: "#ffe0f0", intensity: 0.25 },
    ],
    rim: [
      { position: [-4, 5, -5], color: "#ff5fb4", intensity: 1.5 },
      { position: [5, 6, -4], color: "#9d80ff", intensity: 1.2 },
    ],
  },
  post: {
    ao: { radius: 0.45, intensity: 1.1, color: "#1c1030", falloff: 0.6 },
    bloom: { threshold: 0.78, intensity: 0.95, radius: 0.7, smoothing: 0.25 },
    grade: { lift: [0.01, 0.0, 0.022], gamma: [1, 1.01, 0.98], gain: [1.03, 1.0, 1.0], contrast: 0.18, saturation: 1.04 },
    vignette: { offset: 0.28, darkness: 0.5 },
  },
  contactShadows: { position: [0, 0.308, -0.4], scale: [7.2, 4.8], opacity: 0.45, blur: 2.4, far: 1.2, color: "#0d0618" },
};
