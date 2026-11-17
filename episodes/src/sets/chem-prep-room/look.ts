// "Chemistry prep room" (EP07): a warm, well-used school prep room, late morning.
// Palette: warm oak, cream glazed tiles, copper; the liquids are the only saturated colours.
// Light story: soft window light from the left is the key (it comes in through the two window openings: window-shaped
// patches on the floor and the benches, soft shadows to the right); a warm cream fill from the camera side keeps the
// faces bright; a rim from behind-right separates the mascots from the shelves and lights the glass edges; practicals:
// the glowing windows, four copper pendant lamps, the burner flame. A thin warm haze and dust motes in the window light.
import type { LookPreset } from "../../kit/env";

export const CHEM_PREP_LOOK: LookPreset = {
  name: "chem-prep-room",
  background: "#e8d8bc",
  toneMapping: "aces",
  exposure: 1.02,
  fog: { color: "#eadabd", density: 0.02 },
  lights: {
    hemisphere: { sky: "#fff3e0", ground: "#b48a5e", intensity: 0.5 },
    ambient: { color: "#fff0dc", intensity: 0.12 },
    key: {
      // the window light: travels against CHEM_PREP.sunDir; keep both in sync
      position: [-11.2, 4.45, 0.24],
      color: "#fff0d6",
      intensity: 4.2,
      shadow: { mapSize: 4096, radius: 8, area: [-6, 6, 6, -6], far: 30, bias: -0.0003, normalBias: 0.02 },
    },
    fill: [
      { position: [1.5, 3.5, 8], color: "#ffe9cc", intensity: 0.7 },
      { position: [5, 2, 2], color: "#f3dcc0", intensity: 0.25 },
    ],
    rim: [
      { position: [3.5, 4.0, -7], color: "#ffd9a8", intensity: 0.85 },
      { position: [-2.5, 3.0, -7], color: "#e6eeff", intensity: 0.35 },
    ],
  },
  post: {
    ao: { radius: 0.4, intensity: 1.0, color: "#5a3a22", falloff: 0.6 },
    bloom: { threshold: 0.82, intensity: 0.6, radius: 0.65, smoothing: 0.22 },
    grade: { lift: [0.012, 0.006, 0.0], gamma: [0.99, 1.0, 1.02], gain: [1.02, 1.0, 0.97], contrast: 0.15, saturation: 0.95 },
    vignette: { offset: 0.3, darkness: 0.38 },
  },
  contactShadows: false,
};
