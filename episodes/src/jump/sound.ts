// Soundtrack cue sheet for "Same Jump, Different Planets" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved
// library (src/audio/library.ts). The Soundtrack component and the report both read `soundtrack()`.
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type DuckWindow } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import { PLANETS } from "./physics.ts";
import {
  ACTING,
  BEAT,
  CONSOLE_TEXT,
  COUNTDOWN,
  DOOR,
  DURATION,
  FPS,
  LUMI_WALK,
  MOON_DOWN,
  MIYU_WAKE,
  RESULT_POPS,
  REVEAL_CARD,
  SLOWMO_END,
  TWIST_AT,
  landFrame,
  peakFrame,
  worldSince,
} from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again. */
export const VOICE_COOLDOWN = 45;
/** Voice bus level: on top of the mix, with room left so the loudest beats do not tower over the quiet ones. */
const VOICE_LEVEL = 0.85;
/** Voices in this group are the one allowed overlap (staggered 3-6 frames). */
export const CTA_GROUP = "cta";

const r = Math.round;

// ---------------------------------------------------------------- sfx

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

/** Single steps inside body/footsteps_tile (seconds, measured onsets): the file is a 4-step walk. */
const STEP_SLICES = [0.5, 1.08, 1.6];
/** ui/transition_whoosh is a riser: its peak sits this many seconds in, so it starts early and lands on the cut. */
const RISER_PEAK = 1.12;
/** ui/stopwatch_tick holds four ticks: this is the first one. */
const ONE_TICK = 0.2;
/** ui/counter_tick is a rattle of ticks: this is the first one. */
const ONE_COUNT = 0.085;

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const zuzuLand = r(landFrame("jupiter"));
  const dizzyAt = firstFrame("jupiter", (s) => s.clip === "dizzy");
  const sweatAt = firstFrame("jupiter", (s) => s.symbols.includes("sweat"));
  const sparkleAt = firstFrame("mars", (s) => s.symbols.includes("sparkle"));
  const lumiIdea = firstFrame("earth", (s) => s.symbols.includes("exclaim"));
  const annaGasp = firstFrame("mars", (s) => s.symbols.includes("exclaim"));
  const glintAt = firstFrame("earth", (s) => s.expression === "glint");

  const cues: Cue[] = [
    key(4, sfx("ui", "pop"), 0.85, "hook caption pops"),
    key(36, sfx("ui", "result_stamp"), 0.8, "Guess first! sticker"),
    key(BEAT.setup - 2, sfx("ui", "whoosh"), 0.55, "cut to control panel"),
    key(CONSOLE_TEXT.at - 8, sfx("lab", "button_press"), 0.5, "Lumi presses the console"),
    amb(CONSOLE_TEXT.at, sfx("ui", "counter_tick"), 0.35, "screen types the speed", { len: 15 }),
    amb(CONSOLE_TEXT.at + 24, sfx("ui", "counter_tick"), 0.35, "screen types line 2", { len: 15, rate: 1.08 }),
    key(lumiIdea, sfx("ui", "exclaim_sting"), 0.6, "Lumi !"),
    key(DOOR.earthOpen, sfx("lab", "door_open"), 0.42, "Earth door opens"),
    key(DOOR.earthClose, sfx("lab", "door_open"), 0.35, "Earth door closes", { rate: 0.85 }),
    ...COUNTDOWN.slice(0, 3).map((c) => key(c.at, sfx("ui", "countdown_beep"), 0.5, `countdown ${c.n}`)),
    // riser under the countdown: starts early so its peak lands exactly on the takeoff
    key(BEAT.takeoff - RISER_PEAK * FPS, sfx("ui", "transition_whoosh"), 0.35, "riser into the 2x slow-mo"),
    key(BEAT.takeoff, sfx("ui", "go_whistle"), 0.45, "GO"),
    key(BEAT.takeoff, sfx("body", "jump_boing"), 0.6, "all four take off"),
    key(zuzuLand, sfx("body", "heavy_thud"), 0.95, "Zuzu lands (heavy)", { duck: -7, duckLen: 14 }),
    key(sweatAt, sfx("ui", "sweat_plip"), 0.5, "Zuzu sweat drop"),
    key(zuzuLand + 6, sfx("body", "butt_bump"), 0.6, "Zuzu squashes down"),
    key(landFrame("earth"), sfx("body", "soft_land"), 0.8, "Lumi lands"),
    key(sparkleAt, sfx("ui", "sparkle_chime"), 0.5, "Anna smug sparkle"),
    key(landFrame("mars"), sfx("body", "soft_land"), 0.65, "Anna lands", { rate: 1.1 }),
    key(MOON_DOWN, sfx("body", "soft_land"), 0.45, "Miyu lands softly", { rate: 0.85 }),
    key(annaGasp, sfx("ui", "exclaim_sting"), 0.45, "Anna !"),
    key(MIYU_WAKE, sfx("ui", "exclaim_sting"), 0.55, "Miyu ! (wakes)", { rate: 1.1 }),
    key(SLOWMO_END - 4, sfx("ui", "whoosh"), 0.4, "slow-mo ends", { rate: 1.2 }),
    // result cards pop worst → best, pitching up; the winner gets the stamp and the fanfare
    ...RESULT_POPS.map((at, i) => key(at, sfx("ui", "pop"), 0.75 + i * 0.05, `result card #${4 - i}`, { rate: 2 ** ((i * 2) / 12) })),
    key(RESULT_POPS[3], sfx("ui", "result_stamp"), 0.85, "#1 stamp"),
    key(RESULT_POPS[3], sfx("ui", "win_fanfare_short"), 0.5, "#1 fanfare"),
    key(BEAT.reveal - 2, sfx("ui", "whoosh"), 0.45, "dolly to Lumi"),
    key(glintAt, sfx("ui", "glint_shine"), 0.6, "glasses glint"),
    key(REVEAL_CARD.at, sfx("ui", "swish"), 0.5, "reveal card flies in"),
    key(REVEAL_CARD.lands, sfx("ui", "reveal_ding"), 0.7, "reveal card lands", { duck: -6, duckLen: 45 }),
    key(BEAT.cta + 10, sfx("ui", "pop"), 0.7, "CTA card pops"),
  ];
  // MAX marker tick at each analytic peak
  for (const p of PLANETS) cues.push(key(peakFrame(p.id), sfx("ui", "counter_tick"), 0.6, `${p.id} MAX marker`, { len: Math.ceil(ONE_COUNT * FPS), fadeOut: 1 }));
  // Zuzu's dizzy twinkle circles her head for as long as the spiral is drawn
  for (let f = dizzyAt, i = 0; f < BEAT.results; f += 40, i++) cues.push(amb(f, sfx("ui", "dizzy_twinkle"), 0.2, "Zuzu dizzy twinkle (loop)", { rate: i % 2 ? 1.06 : 1 }));
  // stopwatch under Miyu's long float: one tick per 0.5 s of simulated time
  for (let f = TWIST_AT + 8, i = 0; f < MOON_DOWN - 6; f += 30, i++)
    cues.push(amb(f, sfx("ui", "stopwatch_tick"), 0.3, "stopwatch (Miyu still floating)", { len: Math.ceil(ONE_TICK * FPS), fadeOut: 2, rate: i % 2 ? 0.94 : 1 }));
  // Lumi's run: one step per foot contact (run clip time = composition time before takeoff)
  contactFrames(LUMI_WALK.start + 4, LUMI_WALK.end - 4, (f) => f, RUN_LOOP, RUN_CONTACTS).forEach((at, i) =>
    cues.push(key(at, sfx("body", "footsteps_tile"), 0.5 + (i % 2) * 0.1, "Lumi footstep", { offset: STEP_SLICES[i % 2], len: 6, fadeOut: 2, rate: 0.95 + (i % 2) * 0.1 })),
  );
  // Anna's impatient toe taps, slowed with the world clock
  const tapAt = landFrame("mars") + 16;
  contactFrames(tapAt + 6, BEAT.results, (f) => worldSince(f, tapAt) * FPS, TAP_LOOP, TAP_CONTACTS).forEach((at, i) =>
    cues.push(key(at, sfx("body", "footsteps_tile"), 0.45, "Anna foot tap", { offset: STEP_SLICES[2], len: 4, fadeOut: 2, rate: 1.2 + (i % 2) * 0.1 })),
  );
  return cues;
};

// ---------------------------------------------------------------- voices (driven by the acting)

const sampleOf =
  (id: (typeof PLANETS)[number]["id"]) =>
  (f: number): ActingSample => {
    const s = ACTING[id](f, { x: 0 });
    return { clip: s.clip, expression: s.expression, symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind) };
  };

/** First frame at which a planet's mascot satisfies `test` (sfx that follow the acting use this). */
function firstFrame(id: (typeof PLANETS)[number]["id"], test: (s: ActingSample) => boolean) {
  const sample = sampleOf(id);
  for (let f = 0; f < DURATION; f++) if (test(sample(f))) return f;
  throw new Error(`sound: ${id} never reaches the acting state a cue is waiting for`);
}

// four voices at once: each one sits lower so the group is as loud as a single voice elsewhere
const cheer = { on: { clip: "cheer" }, priority: 50, group: CTA_GROUP, once: true, volume: 0.45 } as const;

const VOICES: CastVoices = {
  zuzu: {
    sample: sampleOf("jupiter"),
    rules: [
      { reaction: "effort", on: { expression: "squint" }, label: "Zuzu braces for the jump", priority: 50, once: true },
      { reaction: "fall", on: { clip: "jump_air" }, label: "Zuzu is yanked back down", priority: 90 },
      { reaction: "fall", on: { clip: "land_squash" }, label: "Zuzu lands", priority: 85 },
      { reaction: "dizzy", on: { clip: "dizzy" }, label: "Zuzu sees stars", priority: 65, once: true },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  anna: {
    sample: sampleOf("mars"),
    rules: [
      { reaction: "smug", on: { expression: "smug" }, label: "Anna is sure she wins", priority: 55, once: true },
      // "Oh... hohoho!": the file has a 0.6 s breath after "Oh", so only the laugh itself is used
      { reaction: "smug_laugh", on: { clip: "jump_air", expression: "smug" }, label: "Anna gloats at her peak", priority: 70, slice: [0.85, 2.2] },
      { reaction: "annoyed", on: { clip: "foot_tap", expression: "squint" }, label: "Anna is tired of waiting", priority: 60, once: true },
      { reaction: "shocked", on: { expression: "shocked" }, label: "Anna: she slept through it?!", priority: 80 },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  lumi: {
    sample: sampleOf("earth"),
    rules: [
      { reaction: "small_gasp", on: { symbol: "exclaim" }, label: "Lumi has the idea", priority: 60 },
      { reaction: "thinking", on: { expression: "squint" }, label: "Lumi thinks it over", priority: 60 },
      { reaction: "explain_start", on: { clip: "point" }, window: [BEAT.results, BEAT.cta], label: "Lumi starts the reveal", priority: 85 },
      { reaction: "cheer", label: "Lumi cheers", ...cheer },
    ],
  },
  miyu: {
    sample: sampleOf("moon"),
    rules: [
      { reaction: "happy", on: { clip: "jump_air" }, label: "Miyu enjoys the lift-off", priority: 40 },
      // the yawn's last 0.2 s is only breath
      { reaction: "yawn", on: { clip: "float_sleep" }, label: "Miyu dozes off at the top", priority: 75, slice: [0, 0.85] },
      // "Suu... supii...": one breath per ~2 s, in then out (the file opens with 1 s of quiet breath, skipped)
      { reaction: "snore", on: { expression: "squint", symbol: "zzz" }, label: "Miyu snores", priority: 10, volume: 0.5, slices: [[1.08, 2.08], [2.3, 3.27]], repeat: { every: 60, minLen: 24 } },
      { reaction: "shocked", on: { expression: "shocked" }, label: "Miyu wakes up", priority: 90 },
      { reaction: "giggle", label: "Miyu giggles", ...cheer },
    ],
  },
};

// ---------------------------------------------------------------- music

/** Music level range for the whole episode (share of full scale, before ducking). */
export const MUSIC_RANGE = [0.15, 0.25] as const;

const musicCues = (): Cue[] => {
  const main = music("main_theme_loop");
  const tension = music("buildup_tension_loop");
  const calm = music("reveal_calm_bed");
  const twist = music("stinger_twist");
  const win = music("stinger_win");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    // stingers are punctuation: they dip only slightly under a voice so their hit still lands
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };

  // Loops change on their bar lines. The theme is started so that its 5th bar line falls on the countdown,
  // where the tension loop takes over from its own bar 1.
  const mainAt = BEAT.countdown - 4 * barFrames(main, FPS);
  // stinger_win builds for 5.8 s: it is started early so the final chord lands on the #1 card
  const winHit = RESULT_POPS[3];
  const winAt = r(winHit - STINGER_HIT.stinger_win! * FPS);
  // the tension loop leaves on its first bar line after the win build-up has started
  const tBar = barFrames(tension, FPS);
  const tensionOut = r(BEAT.countdown + Math.ceil((winAt - BEAT.countdown) / tBar) * tBar);
  // stinger_twist: skip its long intro, keep a 3-note pickup, land the hit on the twist caption
  const twistFrom = 2.1;
  const twistAt = r(TWIST_AT - (STINGER_HIT.stinger_twist! - twistFrom) * FPS);
  // the calm bed plays exactly 5 bars and hands back to the theme on the CTA
  const calmAt = BEAT.cta - 5 * barFrames(calm, FPS);
  // the theme returns from bar 9 (full arrangement) for the CTA
  const mainReturn = (8 * 240) / main.bpm!;

  return [
    track(0, music("intro_jingle"), "intro jingle under the hook", [
      [0, 0.25],
      [60, 0.25],
    ]),
    track(mainAt, main, "main theme: hook + setup", [
      [r(mainAt), 0],
      [r(mainAt) + 18, 0.25],
      [BEAT.countdown - 4, 0.25],
      [BEAT.countdown + 10, 0],
    ]),
    track(BEAT.countdown, tension, "tension loop: countdown, jump, waiting gag (low in slow-mo)", [
      [BEAT.countdown, 0.25],
      [BEAT.takeoff, 0.25],
      [BEAT.takeoff + 12, 0.15],
      [winAt, 0.15],
      [tensionOut, 0],
    ]),
    track(
      twistAt,
      twist,
      `twist stinger (hit @${TWIST_AT}: Miyu is still floating)`,
      [
        [twistAt, 0],
        [twistAt + 6, 0.25],
        [twistAt + r((twist.duration - twistFrom) * FPS), 0.25],
      ],
      twistFrom,
    ),
    track(winAt, win, `win stinger (builds through the cards, final chord @${winHit} = #1 card)`, [
      [winAt, 0],
      [winAt + 12, 0.2],
      [RESULT_POPS[0], 0.25],
      [winAt + r(win.duration * FPS), 0.25],
    ]),
    track(calmAt, calm, "calm bed under the results hold + Lumi's reveal", [
      [r(calmAt), 0],
      [r(calmAt) + 24, 0.22],
      [BEAT.cta - 6, 0.22],
      [BEAT.cta + 8, 0],
    ]),
    track(
      BEAT.cta,
      main,
      "main theme returns for the CTA, fades out",
      [
        [BEAT.cta, 0],
        [BEAT.cta + 3, 0.25],
        [BEAT.end - 30, 0.25],
        [BEAT.end, 0],
      ],
      mainReturn,
    ),
  ];
};

// ---------------------------------------------------------------- the whole soundtrack

export type Soundtrack = { cues: Cue[]; /** per-frame music gain from ducking (linear) */ duck: number[]; ducks: DuckWindow[]; voiceLog: string[] };

let cached: Soundtrack | undefined;

export const soundtrack = (): Soundtrack => {
  if (cached) return cached;
  const voices = buildVoiceCues(VOICES, { duration: DURATION, fps: FPS, cooldown: VOICE_COOLDOWN, volume: VOICE_LEVEL });
  const cues = [...voices.cues, ...sfxCues(), ...musicCues()].sort((a, b) => a.at - b.at);
  const ducks = duckWindows(cues, FPS, [
    // the countdown is one phrase: the music stays down from "3" until the jump has left the floor
    { from: COUNTDOWN[0].at, to: BEAT.takeoff + 16, db: -6, label: "countdown" },
  ]);
  cached = { cues, duck: duckEnvelope(DURATION, ducks), ducks, voiceLog: voices.log };
  return cached;
};
