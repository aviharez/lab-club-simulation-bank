// "Lab Club Reading Atrium" — two-storey atrium in late-afternoon sun (EP03).
// Palette: warm cream plaster, honey wood, sage green plants, soft terracotta (+ brass trims).
// Light story: a low golden sun from behind-left shines through the window wall (key with shadows: window-shaped
// sun patches on the floor, warm rim on the mascots), a soft cream front fill keeps the faces bright, warm bounce
// from the floor, pendant lamps + sconces as practicals, golden haze with god rays and dust.
import type { LookPreset } from "../../kit/env";

export const SUNLIT_ATRIUM_LOOK: LookPreset = {
  name: "sunlit-atrium",
  background: "#e9d6b6",
  toneMapping: "aces",
  exposure: 1.0,
  fog: { color: "#ecd5b0", density: 0.014 },
  lights: {
    hemisphere: { sky: "#fff1dc", ground: "#b98a5a", intensity: 0.75 },
    ambient: { color: "#fff0dd", intensity: 0.22 },
    key: {
      // the sun: light travels along SUNLIT_ATRIUM.sunDir; keep both in sync
      position: [-6.4, 6.8, -12.0],
      color: "#ffd59a",
      intensity: 3.4,
      shadow: { mapSize: 4096, radius: 6, area: [-9, 9, 9, -9], far: 40, bias: -0.0003, normalBias: 0.02 },
    },
    fill: [
      { position: [3, 4, 10], color: "#fff3e4", intensity: 0.85 },
      { position: [-6, 2, 6], color: "#f6e3c9", intensity: 0.3 },
    ],
    rim: [{ position: [4, 6, -6], color: "#ffe1b0", intensity: 0.6 }],
  },
  post: {
    ao: { radius: 0.45, intensity: 1.1, color: "#5a3e2a", falloff: 0.6 },
    bloom: { threshold: 0.86, intensity: 0.55, radius: 0.65, smoothing: 0.2 },
    grade: { lift: [0.012, 0.006, 0.0], gamma: [0.99, 1, 1.02], gain: [1.02, 1.0, 0.97], contrast: 0.16, saturation: 0.94 },
    vignette: { offset: 0.3, darkness: 0.36 },
  },
  contactShadows: { position: [1.0, 0.012, 0.5], scale: [8, 6], opacity: 0.38, blur: 2.4, far: 1.2, color: "#4a3020" },
};
