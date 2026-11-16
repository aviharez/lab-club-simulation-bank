// "Lab Club Gravity Hall" — observatory hall turned gravity test bay, at dusk (EP01).
// Palette: cream plaster, dusty slate-blue panels, dark steel, brass, coral accent; mascot colours only as glow strips.
// Light story: soft warm-white key from the front-top (faces stay bright), cool dusk light through the oculus (rim +
// shaft), warm tungsten practicals (pendants, neon sign, spot housings, desk lamp), cyan screens on the mission wall.
import type { LookPreset } from "../../kit/env";

export const GRAVITY_LAB_LOOK: LookPreset = {
  name: "gravity-lab",
  background: "#2a2f4a",
  toneMapping: "aces",
  exposure: 1.0,
  fog: { color: "#6f6a8c", density: 0.0055 },
  lights: {
    hemisphere: { sky: "#e6e8ff", ground: "#8f7f78", intensity: 0.6 },
    ambient: { color: "#f1ecff", intensity: 0.18 },
    key: {
      position: [4, 11, 9],
      color: "#fff2e2",
      intensity: 2.4,
      shadow: { mapSize: 2048, radius: 12, area: [-9, 9, 9, -4], far: 40, bias: -0.0004, normalBias: 0.025 },
    },
    fill: [
      { position: [-7, 3, 8], color: "#c9d6ff", intensity: 0.55 },
      { position: [0, 2, 10], color: "#ffe6c8", intensity: 0.25 },
    ],
    rim: [
      { position: [-5, 6, -4], color: "#aebcff", intensity: 1.2 },
      { position: [6, 5, -3], color: "#ffc6a8", intensity: 0.8 },
    ],
  },
  post: {
    ao: { radius: 0.5, intensity: 1.3, color: "#3a3550", falloff: 0.6 },
    bloom: { threshold: 0.86, intensity: 0.55, radius: 0.65, smoothing: 0.2 },
    grade: { lift: [0.004, 0.006, 0.02], gamma: [1, 1, 1], gain: [1.02, 1.0, 0.98], contrast: 0.16, saturation: 1.06 },
    vignette: { offset: 0.3, darkness: 0.38 },
  },
  // above the steel deck (top at y 0.014) so the chamber pedestals and Lumi's run still get contact shadows
  contactShadows: { position: [0, 0.016, 1.2], scale: [16, 7], opacity: 0.45, blur: 2.6, far: 1.4, color: "#2e2638" },
};
