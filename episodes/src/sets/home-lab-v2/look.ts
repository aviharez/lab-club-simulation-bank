// "Lab Club HQ" — attic lab at golden hour. Palette: honey wood, sage-teal, cream plaster, coral + lavender accents.
// Light story: low warm sun through the back-left window (key, long shadows toward the camera, visible shaft),
// cool sky fill from the front, lavender rim from the right, warm pendant practicals + a teal orb glow.
import type { LookPreset } from "../../kit/env";

export const HOME_LAB_V2_LOOK: LookPreset = {
  name: "home-lab-v2",
  background: "#2d2433",
  toneMapping: "aces",
  exposure: 1.05,
  fog: { color: "#e8cfb4", density: 0.018 },
  lights: {
    hemisphere: { sky: "#fff1de", ground: "#b98a5e", intensity: 0.9 },
    ambient: { color: "#f4e7ff", intensity: 0.25 },
    key: {
      position: [-5.5, 6.5, -11],
      color: "#ffc58a",
      intensity: 3.2,
      shadow: { mapSize: 2048, radius: 10, area: [-7, 7, 7, -5], far: 30, bias: -0.0004, normalBias: 0.03 },
    },
    fill: [{ position: [2, 3.5, 10], color: "#cfe0ff", intensity: 0.85 }],
    rim: [
      { position: [7, 4, -3], color: "#c9b2ff", intensity: 1.5 },
      { position: [-6, 3, -2], color: "#ffd2a0", intensity: 0.7 },
    ],
  },
  post: {
    ao: { radius: 0.45, intensity: 1.6, color: "#3b2a3f", falloff: 0.6 },
    bloom: { threshold: 0.82, intensity: 0.7, radius: 0.7, smoothing: 0.2 },
    grade: { lift: [0.012, 0.004, 0.02], gamma: [1, 1, 1.02], gain: [1.03, 1.0, 0.96], contrast: 0.12, saturation: 1.02 },
    vignette: { offset: 0.32, darkness: 0.42 },
  },
  contactShadows: { position: [0, 0.004, 0.6], scale: [8, 8], opacity: 0.45, blur: 2.4, far: 1.4, color: "#3b2a2a" },
};
