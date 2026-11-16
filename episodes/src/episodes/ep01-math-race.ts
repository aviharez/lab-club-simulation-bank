// Episode 1 — Math Race: 2ⁿ vs n³.
// Everything episode-specific lives here; the simulation and components are shared.
import type { Episode } from "../mathrace/episode.ts";

export const ep01: Episode = {
  id: "ep01",
  race: {
    seed: 20261116,
    fps: 30,
    walls: [100, 250, 500, 1000, 2000, 4000, 8150],
    maxVisibleBalls: 300,
    maxRounds: 30,
    introSeconds: 4,
    // slow start, fast middle, slow drama at rounds 10-13
    roundSeconds: [2.4, 2.1, 1.8, 1.5, 1.3, 1.2, 1.2, 1.3, 1.6, 2.6, 3.0, 3.4, 3.6],
    celebrateSeconds: 3.5,
    endingSeconds: 7.5,
    transitionFrames: 36,
    lanes: [
      {
        character: "anna",
        displayName: "Anna",
        tagline: "many balls",
        rule: { label: "n³", power: (n) => n ** 3, balls: (n) => n ** 3 },
        ballRadius: () => 7,
      },
      {
        character: "zuzu",
        displayName: "Zuzu",
        tagline: "one ball, doubles",
        rule: { label: "2ⁿ", power: (n) => 2 ** n, balls: () => 1 },
        // grows with log(power): r = 10 + 5.6·log2(power)  → 16px at n=1, 83px at n=13
        ballRadius: (power) => 10 + 5.6 * Math.log2(power),
      },
    ],
  },
  hookTitle: "Math race: 2ⁿ vs n³",
  expressions: [
    { lane: 0, trigger: { type: "start" }, pose: "idle", expression: "01_neutral" },
    { lane: 1, trigger: { type: "start" }, pose: "idle", expression: "01_neutral" },
    { lane: 0, trigger: { type: "round", n: 3, at: "end" }, pose: "idle", expression: "03_smug", symbol: "sparkle" },
    { lane: 1, trigger: { type: "round", n: 4, at: "start" }, pose: "idle", expression: "06_crying", symbol: "sweat" },
    { lane: 1, trigger: { type: "round", n: 10, at: "start" }, pose: "idle", expression: "04_shocked", symbol: "exclaim" },
    { lane: 1, trigger: { type: "overtake" }, pose: "idle", expression: "02_happy", symbol: "sparkle" },
    { lane: 0, trigger: { type: "overtake" }, pose: "idle", expression: "04_shocked", symbol: "exclaim" },
    { lane: 1, trigger: { type: "finish" }, pose: "happy", expression: "02_happy", symbol: "sparkle" },
    { lane: 0, trigger: { type: "finish" }, pose: "panic", expression: "05_dizzy", symbol: "spiral" },
  ],
  captions: [
    { trigger: { type: "start" }, text: "Guess first! Who breaks through?" },
    { trigger: { type: "round", n: 3, at: "start" }, text: "n³ is way ahead...", accentLane: 0 },
    { trigger: { type: "round", n: 10, at: "start" }, text: "Wait... 2ⁿ is doubling!", accentLane: 1 },
    { trigger: { type: "overtake" }, text: "OVERTAKE!", accentLane: 1 },
    { trigger: { type: "finish" }, text: "Zuzu wins!", accentLane: 1 },
  ],
  ending: {
    character: "lumi",
    pose: "idle",
    expression: "08_glint",
    headline: "Exponential beats polynomial — always, eventually.",
    subline: (tl) => `2ⁿ passes n³ at n = ${tl.permanentCrossover}`,
    cta: "Who should race next? Comment below!",
  },
  audio: {
    music: null, // e.g. "audio/music.mp3"
    musicVolume: 0.35,
    sfx: { hit: null, crack: null, whoosh: null, win: null }, // e.g. hit: "audio/hit.wav"
  },
  expect: { winner: 1, overtakeRound: 12, finishRound: 13, crossover: 10 },
};
