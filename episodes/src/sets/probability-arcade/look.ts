// "The Probability Arcade": a cozy retro arcade room after closing time (EP05).
// Palette: dark walnut wood, polished brass, warm amber, small teal neon accents.
// Light story: a dim warm room. A soft warm key from the front-top keeps the faces bright; pools of light fall from
// brass pendant lamps (spots + haze cones, React); the neon signs, the crest bulbs and the cabinet screens are the
// practicals; an amber rim and a teal rim from behind separate the mascots from the dark walnut; bloom on the brass.
import type { LookPreset } from "../../kit/env";

export const ARCADE_LOOK: LookPreset = {
  name: "probability-arcade",
  background: "#0e0805",
  toneMapping: "aces",
  exposure: 1.05,
  fog: { color: "#24160d", density: 0.03 },
  lights: {
    hemisphere: { sky: "#ffdcb0", ground: "#2a160c", intensity: 0.32 },
    ambient: { color: "#ffe6c8", intensity: 0.08 },
    key: {
      position: [1.6, 7.2, 8.5],
      color: "#ffe4c0",
      intensity: 2.0,
      shadow: { mapSize: 4096, radius: 8, area: [-7, 7, 6.5, -5], far: 40, bias: -0.0003, normalBias: 0.02 },
    },
    fill: [
      { position: [-6, 3, 6], color: "#86e0d6", intensity: 0.32 },
      { position: [6, 2.5, 7], color: "#ffc890", intensity: 0.28 },
    ],
    rim: [
      { position: [-3.5, 5, -4], color: "#ffaa55", intensity: 1.4 },
      { position: [4, 5, -4], color: "#4fd8cc", intensity: 0.9 },
    ],
  },
  post: {
    ao: { radius: 0.4, intensity: 1.1, color: "#140a05", falloff: 0.6 },
    bloom: { threshold: 0.72, intensity: 1.0, radius: 0.72, smoothing: 0.25 },
    grade: { lift: [0.012, 0.006, 0.0], gamma: [0.99, 1.0, 1.02], gain: [1.04, 1.0, 0.97], contrast: 0.16, saturation: 1.03 },
    vignette: { offset: 0.3, darkness: 0.55 },
  },
  contactShadows: { position: [0, 0.008, 0.6], scale: [6, 4.5], opacity: 0.5, blur: 2.4, far: 1.2, color: "#0a0503" },
};
