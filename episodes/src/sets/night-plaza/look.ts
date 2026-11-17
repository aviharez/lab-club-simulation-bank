// "Lab Club Courtyard at night" (EP06).
// Palette: deep navy, cool moonlight blue, warm lamp orange, yellow glowing trails.
// Light story: a cool moon high behind-left is the key (long soft shadows toward the camera, a blue rim on the
// mascots); a soft cool front fill keeps the bodies readable (faces are always bright); the iron street lamps throw
// warm pools on the stone (point lights + floor glow decals, React); the lab's lit windows, the LAB CLUB sign and the
// glowing start ring are the practicals; a light navy fog fades the far facade.
import type { LookPreset } from "../../kit/env";

export const NIGHT_PLAZA_LOOK: LookPreset = {
  name: "night-plaza",
  background: "#0b1124",
  toneMapping: "aces",
  exposure: 1.08,
  fog: { color: "#121a36", density: 0.017 },
  lights: {
    hemisphere: { sky: "#7f9fe0", ground: "#1a1f33", intensity: 0.55 },
    ambient: { color: "#9fb4e8", intensity: 0.12 },
    key: {
      // the moon: light travels against NIGHT_PLAZA.moonDir; keep both in sync
      position: [-16.8, 21.2, -29.6],
      color: "#b9ccff",
      intensity: 1.9,
      shadow: { mapSize: 4096, radius: 7, area: [-26, 26, 34, -34], far: 90, bias: -0.0004, normalBias: 0.03 },
    },
    fill: [
      { position: [2, 5, 14], color: "#a9bdf0", intensity: 0.75 },
      { position: [-8, 2.5, 6], color: "#ffbf80", intensity: 0.18 },
    ],
    rim: [
      { position: [10, 6, -10], color: "#ffb36a", intensity: 0.55 },
      { position: [-8, 7, -12], color: "#8fb0ff", intensity: 0.7 },
    ],
  },
  post: {
    ao: { radius: 0.5, intensity: 1.0, color: "#05081a", falloff: 0.6 },
    bloom: { threshold: 0.7, intensity: 0.95, radius: 0.72, smoothing: 0.25 },
    grade: { lift: [0.004, 0.008, 0.02], gamma: [1.0, 1.0, 0.98], gain: [1.03, 1.0, 0.98], contrast: 0.14, saturation: 1.0 },
    vignette: { offset: 0.3, darkness: 0.5 },
  },
  contactShadows: { position: [0, 0.01, 0], scale: [8, 8], opacity: 0.45, blur: 2.4, far: 1.2, color: "#03050f" },
};
