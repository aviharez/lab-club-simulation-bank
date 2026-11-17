// "Lab Club Test Hall 2" — tall, clean industrial vacuum test hall in daylight (EP02).
// Palette: white panels, steel grey, cool cyan accents, small warning-yellow stripes.
// Light story: cool daylight from the high clerestory windows (rim + visible shafts through soft haze), a soft white
// key from the front-top so the faces stay bright, cyan practicals on the columns + deck, cool high-bay lamps.
import type { LookPreset } from "../../kit/env";

export const VACUUM_HALL_LOOK: LookPreset = {
  name: "vacuum-hall",
  background: "#c9d3da",
  toneMapping: "aces",
  exposure: 0.95,
  fog: { color: "#d3dee6", density: 0.009 },
  lights: {
    hemisphere: { sky: "#eef6ff", ground: "#8f9aa4", intensity: 0.6 },
    ambient: { color: "#eef4ff", intensity: 0.2 },
    key: {
      position: [3.5, 10, 9],
      color: "#fbfdff",
      intensity: 2.3,
      shadow: { mapSize: 2048, radius: 12, area: [-8, 8, 9, -4], far: 40, bias: -0.0004, normalBias: 0.025 },
    },
    fill: [
      { position: [-7, 3, 8], color: "#d7e9ff", intensity: 0.5 },
      { position: [0, 2, 10], color: "#fff6ec", intensity: 0.25 },
    ],
    rim: [
      { position: [-3, 9, -5], color: "#cfe8ff", intensity: 1.4 },
      { position: [5, 7, -4], color: "#a8ecff", intensity: 0.9 },
    ],
  },
  post: {
    ao: { radius: 0.5, intensity: 1.2, color: "#3a4656", falloff: 0.6 },
    bloom: { threshold: 0.88, intensity: 0.5, radius: 0.6, smoothing: 0.2 },
    grade: { lift: [0.0, 0.006, 0.014], gamma: [1, 1, 0.99], gain: [0.99, 1.0, 1.02], contrast: 0.2, saturation: 1.06 },
    vignette: { offset: 0.3, darkness: 0.34 },
  },
  contactShadows: { position: [0, 0.07, 1.0], scale: [12, 8], opacity: 0.4, blur: 2.6, far: 1.4, color: "#2e3a46" },
};
