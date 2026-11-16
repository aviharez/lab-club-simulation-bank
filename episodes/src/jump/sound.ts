// Sound cue sheet (pure data): every cue derives from the same timeline functions as the picture.
import { BEAT, CONSOLE_TEXT, COUNTDOWN, DOOR, FPS, LUMI_WALK, landFrame, peakFrame, RESULT_POPS, SLOWMO_END, worldSince } from "./timeline.ts";

export type Cue = { at: number; name: string; volume?: number; rate?: number; /** frames to keep (with a short fade-out) */ len?: number; label: string };

/** Foot contacts measured from the GLB clips (clip frames @30fps): lumi "run" loop 19 f → steps at 7, 17; anna "foot_tap" loop 89 f → toe taps at 22, 36, 66, 80. */
const RUN_LOOP = 19;
const RUN_CONTACTS = [7, 17];
const TAP_LOOP = 89;
const TAP_CONTACTS = [22, 36, 66, 80];

/** Frames where a looping clip driven by `clipFrame(f)` passes one of its contact frames. */
const contactFrames = (from: number, to: number, clipFrame: (f: number) => number, loop: number, contacts: number[]) => {
  const out: number[] = [];
  for (let f = Math.ceil(from) + 1; f < to; f++) {
    const a = clipFrame(f - 1);
    const b = clipFrame(f);
    for (const c of contacts) {
      // count every crossing of c (+ k·loop) inside (a, b]
      for (let k = Math.floor((a - c) / loop) + 1; c + k * loop <= b; k++) if (c + k * loop > a) out.push(f);
    }
  }
  return out;
};

const r = Math.round;

export const soundCues = (): Cue[] => {
  const cues: Cue[] = [
    { at: 4, name: "ui_pop", volume: 0.7, label: "hook caption pops" },
    { at: 36, name: "sticker_slap", volume: 0.75, label: "Guess first! sticker" },
    { at: BEAT.setup - 2, name: "whoosh", volume: 0.55, label: "cut to control panel" },
    { at: CONSOLE_TEXT.at, name: "console_beeps", volume: 0.3, len: 70, label: "screen types the speed" },
    { at: BEAT.setup + 40, name: "ding_idea", volume: 0.6, label: "Lumi !" },
    { at: DOOR.earthOpen, name: "door_hiss", volume: 0.4, len: 40, label: "Earth door opens" },
    { at: DOOR.earthClose, name: "door_hiss", volume: 0.35, rate: 1.15, len: 36, label: "Earth door closes" },
    ...COUNTDOWN.slice(0, 3).map((c) => ({ at: c.at, name: "countdown_beep", volume: 0.8, label: `countdown ${c.n}` })),
    { at: BEAT.takeoff, name: "go_beep", volume: 0.75, label: "GO" },
    { at: BEAT.takeoff, name: "jump_boing", volume: 0.65, label: "all four take off" },
    { at: BEAT.takeoff + 2, name: "slowmo_in", volume: 0.45, label: "2x slow-mo kicks in" },
    { at: r(landFrame("jupiter")), name: "heavy_thud", volume: 0.95, label: "Zuzu lands (heavy)" },
    { at: r(landFrame("earth")), name: "land_pat", volume: 0.8, label: "Lumi lands" },
    { at: r(peakFrame("mars")) - 6, name: "sparkle", volume: 0.5, label: "Anna smug sparkle" },
    { at: r(landFrame("mars")), name: "land_pat", volume: 0.6, rate: 1.1, label: "Anna lands" },
    { at: r(landFrame("jupiter")) + 62, name: "birds_dizzy", volume: 0.22, len: BEAT.results + 40 - (r(landFrame("jupiter")) + 62), label: "Zuzu dizzy birds (loop)" },
    { at: r(landFrame("moon")), name: "soft_land", volume: 0.55, label: "Miyu lands softly" },
    { at: r(landFrame("moon")) + 10, name: "gasp", volume: 0.7, label: "Miyu wakes" },
    { at: r(landFrame("moon")) + 12, name: "exclaim_pop", volume: 0.55, label: "Miyu ! pop" },
    { at: SLOWMO_END - 4, name: "whoosh", volume: 0.4, rate: 1.2, label: "slow-mo ends" },
    ...RESULT_POPS.map((at, i) => ({ at, name: "result_pop", volume: 0.6 + i * 0.08, label: `result card #${4 - i}` })),
    { at: BEAT.reveal - 2, name: "whoosh", volume: 0.45, label: "dolly to Lumi" },
    { at: BEAT.reveal + 22, name: "glint", volume: 0.6, label: "glasses glint" },
    { at: BEAT.reveal + 30, name: "card_whoosh", volume: 0.5, label: "reveal card" },
    { at: BEAT.cta + 6, name: "cheer", volume: 0.35, label: "CTA cheer" },
    { at: BEAT.cta + 10, name: "ui_pop", volume: 0.7, label: "CTA card pops" },
  ];
  // MAX marker ticks at each analytic peak
  for (const id of ["jupiter", "earth", "mars", "moon"] as const) cues.push({ at: r(peakFrame(id)), name: "max_tick", volume: 0.55, label: `${id} MAX marker` });
  // Miyu's snores while she floats asleep
  for (let k = BEAT.takeoff + 58; k < landFrame("moon") - 30; k += 60) cues.push({ at: k, name: "snore_breath", volume: 0.5, rate: 0.8, label: "Miyu snore" });
  // Lumi's run: one soft tap per foot contact (run clip time = composition time before takeoff)
  contactFrames(LUMI_WALK.start + 4, LUMI_WALK.end - 4, (f) => f, RUN_LOOP, RUN_CONTACTS).forEach((at, i) =>
    cues.push({ at, name: "tap", volume: 0.45 + (i % 2) * 0.1, rate: 0.9 + (i % 2) * 0.12, label: "Lumi footstep" }),
  );
  // Anna's impatient foot taps, slowed with the world clock
  const tapAt = landFrame("mars") + 16;
  contactFrames(tapAt + 6, BEAT.results, (f) => worldSince(f, tapAt) * FPS, TAP_LOOP, TAP_CONTACTS).forEach((at) =>
    cues.push({ at, name: "tap", volume: 0.5, rate: 1.0, label: "Anna foot tap" }),
  );
  return cues.sort((a, b) => a.at - b.at);
};

