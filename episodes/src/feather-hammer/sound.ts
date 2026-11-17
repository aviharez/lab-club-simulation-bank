// Soundtrack cue sheet for EP02 "Feather vs Hammer" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved library.
// The Soundtrack component and the report both read `soundtrack()`.
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type SoundtrackData } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import type { Member } from "./data.ts";
import {
  ACTING,
  ANNA,
  BEAT,
  COUNTDOWN,
  DURATION,
  FEATHER_AIR,
  FPS,
  HAMMER_AIR,
  LUMI,
  MIYU,
  PUMP,
  RESULT_POPS,
  REVEAL_CARD,
  SLOWMO_TO,
  VAC_LAND,
  WALK,
  ZUZU,
} from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
const VOICE_LEVEL = 0.85;
export const CTA_GROUP = "cta";
/** Music level range (share of full scale, before ducking): 15-25 %. */
export const MUSIC_RANGE = [0.15, 0.25] as const;

const r = Math.round;

// ---------------------------------------------------------------- acting samples

const sampleOf =
  (m: Member) =>
  (f: number): ActingSample => {
    const s = ACTING(m, f);
    return { clip: s.clip, expression: s.expression, symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind) };
  };

/** Footsteps: the walk clip (2.333 s loop) holds four foot contacts, evenly spaced. */
const WALK_LOOP = 2.333;
const WALK_CONTACTS = 4;
const walkSteps = () => {
  const out: number[] = [];
  const s = sampleOf("anna");
  let prev = -1;
  for (let f = WALK.start; f < WALK.end; f++) {
    const st = ACTING("anna", f);
    if (s(f).clip !== "walk") continue;
    const n = Math.floor(st.time / (WALK_LOOP / WALK_CONTACTS));
    if (prev >= 0 && n > prev) out.push(f);
    prev = n;
  }
  return out;
};

// ---------------------------------------------------------------- sfx

/** Single steps inside body/footsteps_tile (seconds, measured onsets). */
const STEP_SLICES = [0.5, 1.08, 1.6];
/** ui/stopwatch_tick holds four ticks: this is the first one. */
const ONE_TICK = 0.2;

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const pumpLen = PUMP.off - PUMP.on;
  const pumpFile = sfx("lab", "pump_running");
  const pumpOne = Math.floor(pumpFile.duration * FPS) - 6;

  const cues: Cue[] = [
    key(4, sfx("ui", "pop"), 0.85, "hook caption pops"),
    key(36, sfx("ui", "result_stamp"), 0.8, "Guess first! sticker"),
    key(ANNA.bet, sfx("ui", "sparkle_chime"), 0.45, "Anna's bet sparkle"),
    key(150, sfx("ui", "exclaim_sting"), 0.45, "Zuzu's bet !"),
    ...COUNTDOWN.slice(0, 3).map((c) => key(c.at, sfx("ui", "countdown_beep"), 0.5, `countdown ${c.n}`)),
    // AIR round
    key(HAMMER_AIR, sfx("objects", "hammer_clank"), 0.95, "hammer hits the AIR floor", { duck: -7, duckLen: 12 }),
    key(HAMMER_AIR + 2, sfx("ui", "sparkle_chime"), 0.5, "Anna smug sparkle"),
    key(ZUZU.shocked + 2, sfx("ui", "sweat_plip"), 0.5, "Zuzu sweat drop"),
    key(FEATHER_AIR, sfx("objects", "feather_flutter"), 0.45, "feather settles on the AIR floor", { len: 14, fadeOut: 6 }),
    key(FEATHER_AIR + 2, sfx("ui", "pop"), 0.6, "feather timer stops"),
    key(LUMI.idea, sfx("ui", "exclaim_sting"), 0.55, "Lumi has an idea"),
    // twist: pump
    key(PUMP.press, sfx("lab", "button_press"), 0.7, "Lumi presses PUMP"),
    key(PUMP.on, sfx("lab", "vacuum_hiss"), 0.6, "air rushes out of the VACUUM column"),
    amb(PUMP.on, pumpFile, 0.45, "pump running", { len: Math.min(pumpLen, pumpOne), fadeIn: 4 }),
    amb(PUMP.on + pumpOne - 4, pumpFile, 0.45, "pump running (2nd pass)", { len: pumpLen - pumpOne + 4 + 8, fadeIn: 4, fadeOut: 10 }),
    key(PUMP.off - 6, sfx("lab", "vacuum_hiss"), 0.3, "last of the air, gauge at 0", { rate: 1.25, len: 20, fadeOut: 8 }),
    // VACUUM round (2x slow-mo; SFX keep their pitch, the clank is slowed a touch)
    key(VAC_LAND, sfx("objects", "hammer_clank"), 1, "hammer + feather hit the VACUUM floor together", { duck: -8, duckLen: 16, rate: 0.85 }),
    key(ANNA.shocked, sfx("ui", "exclaim_sting"), 0.5, "Anna !"),
    key(ZUZU.cheer + 2, sfx("ui", "sparkle_chime"), 0.5, "Zuzu cheer sparkle"),
    key(MIYU.wake, sfx("ui", "exclaim_sting"), 0.55, "Miyu wakes !", { rate: 1.1 }),
    key(SLOWMO_TO - 4, sfx("ui", "whoosh"), 0.4, "slow-mo ends", { rate: 1.2 }),
    // results, reveal, CTA
    ...RESULT_POPS.map((at, i) => key(at, sfx("ui", "pop"), 0.7 + i * 0.04, `result card ${i + 1}`, { rate: 2 ** ((i * 2) / 12) })),
    ...RESULT_POPS.map((at, i) => key(at + 8, sfx("ui", "result_stamp"), 0.7, `result card ${i + 1} stamp`)),
    key(BEAT.reveal - 2, sfx("ui", "whoosh"), 0.45, "dolly to Lumi"),
    key(LUMI.glint, sfx("ui", "glint_shine"), 0.6, "glasses glint"),
    key(REVEAL_CARD.at, sfx("ui", "swish"), 0.5, "reveal card flies in"),
    key(REVEAL_CARD.lands, sfx("ui", "reveal_ding"), 0.7, "reveal card lands", { duck: -6, duckLen: 45 }),
    key(BEAT.cta + 10, sfx("ui", "pop"), 0.7, "CTA card pops"),
  ];
  // feather flutter under the slow float (ambient), one flutter every ~1.2 s
  for (let f = BEAT.dropAir + 4, i = 0; f < FEATHER_AIR - 20; f += 36, i++)
    cues.push(amb(f, sfx("objects", "feather_flutter"), 0.22, "feather flutter (air)", { rate: i % 2 ? 0.94 : 1.04, fadeOut: 4 }));
  cues.push(amb(BEAT.dropVac + 2, sfx("objects", "feather_flutter"), 0.18, "feather flutter (vacuum, brief)", { len: 20, fadeOut: 8, rate: 0.9 }));
  // stopwatch: one tick per real second while the AIR feather is still falling
  for (let f = BEAT.dropAir + FPS; f < FEATHER_AIR - 4; f += FPS)
    cues.push(amb(f, sfx("ui", "stopwatch_tick"), 0.32, "stopwatch (feather still falling)", { len: Math.ceil(ONE_TICK * FPS), fadeOut: 2 }));
  // the walk to the VACUUM column (Anna and Zuzu step in sync: same path length)
  walkSteps().forEach((at, i) => cues.push(key(at, sfx("body", "footsteps_tile"), 0.42 + (i % 2) * 0.08, "Anna + Zuzu footsteps", { offset: STEP_SLICES[i % 3], len: 6, fadeOut: 2, rate: 1.05 + (i % 2) * 0.08 })));
  return cues;
};

// ---------------------------------------------------------------- voices (driven by the acting)

const cheer = { on: { clip: "cheer" }, window: [BEAT.cta, DURATION] as [number, number], priority: 50, group: CTA_GROUP, once: true, volume: 0.45 } as const;

const VOICES: CastVoices = {
  anna: {
    sample: sampleOf("anna"),
    rules: [
      { reaction: "smug", on: { symbol: "sparkle" }, window: [ANNA.bet - 2, BEAT.countdown], label: "Anna bets on the hammer", priority: 55, once: true },
      { reaction: "smug", on: { symbol: "sparkle" }, window: [HAMMER_AIR - 2, HAMMER_AIR + 40], label: "Anna: the hammer is down", priority: 70, once: true },
      // "Hmph! Ugh!": only the "Ugh!" (0.8-1.6 s); she already said "Hmph!" twice, and the whole file would cover Miyu's on-camera snore
      { reaction: "annoyed", on: { clip: "foot_tap", expression: "squint" }, label: "Anna is tired of waiting", priority: 60, once: true, slice: [0.8, 1.6] },
      { reaction: "shocked", on: { expression: "shocked" }, label: "Anna: same frame?!", priority: 85, once: true, maxShift: 45 },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  zuzu: {
    sample: sampleOf("zuzu"),
    rules: [
      { reaction: "happy", on: { symbol: "exclaim" }, window: [ZUZU.bet - 2, BEAT.countdown], label: "Zuzu bets: together!", priority: 50, once: true },
      { reaction: "crying", on: { expression: "crying" }, label: "Zuzu: the feather is so slow", priority: 65, once: true },
      { reaction: "cheer", on: { clip: "cheer" }, window: [VAC_LAND - 4, BEAT.results], label: "Zuzu was right!", priority: 90, once: true },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  miyu: {
    // her snore follows the camera: "on_camera" marks the cut-in on her nap (off screen, nobody hears her)
    sample: (f) => {
      const st = sampleOf("miyu")(f);
      return f >= MIYU.napShot[0] && f < MIYU.napShot[1] ? { ...st, symbols: [...st.symbols, "on_camera"] } : st;
    },
    rules: [
      // "Hnnn... pshhh...": only while the camera is on her napping (off screen, nobody hears her)
      { reaction: "snore", on: { expression: "squint", symbol: "on_camera" }, label: "Miyu snores (on camera)", priority: 10, volume: 0.3, slices: [[0.2, 1.95], [2.7, 4.45]], repeat: { every: 75, minLen: 24 } },
      { reaction: "shocked", on: { expression: "shocked" }, label: "Miyu wakes up", priority: 90, once: true },
      { reaction: "cheer", label: "Miyu cheers", ...cheer },
    ],
  },
  lumi: {
    sample: sampleOf("lumi"),
    rules: [
      { reaction: "explain_start", on: { clip: "point" }, window: [BEAT.reveal, BEAT.cta], label: "Lumi starts the reveal", priority: 85, once: true },
      { reaction: "cheer", label: "Lumi cheers", ...cheer },
    ],
  },
};

// ---------------------------------------------------------------- music

const musicCues = (): Cue[] => {
  const main = music("main_theme_loop");
  const tension = music("buildup_tension_loop");
  const calm = music("reveal_calm_bed");
  const twist = music("stinger_twist");
  const win = music("stinger_win");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };
  // the theme starts two bars before the countdown, where the tension loop takes over on its bar 1
  const mainAt = r(BEAT.countdown - 2 * barFrames(main, FPS));
  // stinger_twist: skip its long intro, keep the pickup, land the hit on the pump press
  const twistFrom = 2.1;
  const twistAt = r(PUMP.press - (STINGER_HIT.stinger_twist! - twistFrom) * FPS);
  const tBar = barFrames(tension, FPS);
  // the tension loop leaves on its first bar line after the twist pickup has started
  const tensionOut = r(BEAT.countdown + Math.ceil((twistAt - BEAT.countdown) / tBar) * tBar);
  // stinger_win builds for 5.8 s: started early so its final chord lands on the same-frame landing
  const winAt = r(VAC_LAND - STINGER_HIT.stinger_win! * FPS);
  const winEnd = winAt + r(win.duration * FPS);
  // the calm bed plays four bars and hands back to the theme on the CTA
  const calmAt = r(BEAT.cta - 4 * barFrames(calm, FPS));
  const mainReturn = (8 * 240) / main.bpm!;
  return [
    track(0, music("intro_jingle"), "intro jingle under the hook", [
      [0, 0.25],
      [r(music("intro_jingle").duration * FPS), 0.25],
    ]),
    track(mainAt, main, "main theme: hook + bets", [
      [mainAt, 0],
      [mainAt + 18, 0.22],
      [BEAT.countdown - 4, 0.22],
      [BEAT.countdown + 10, 0],
    ]),
    track(BEAT.countdown, tension, "tension loop: countdown + waiting for the feather", [
      [BEAT.countdown, 0.22],
      [BEAT.dropAir, 0.22],
      [BEAT.dropAir + 20, 0.18],
      [tensionOut - 12, 0.18],
      [tensionOut, 0],
    ]),
    track(
      twistAt,
      twist,
      `twist stinger (hit @${PUMP.press}: Lumi presses PUMP)`,
      [
        [twistAt, 0],
        [twistAt + 6, 0.25],
        [twistAt + r((twist.duration - twistFrom) * FPS), 0.25],
      ],
      twistFrom,
    ),
    track(winAt, win, `win stinger (final chord @${VAC_LAND}: same-frame landing)`, [
      [winAt, 0],
      [winAt + 20, 0.18],
      [VAC_LAND - 2, 0.25],
      [winEnd, 0.25],
    ]),
    track(calmAt, calm, "calm bed under the results + Lumi's reveal", [
      [calmAt, 0],
      [calmAt + 24, 0.2],
      [BEAT.cta - 6, 0.2],
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

let cached: SoundtrackData | undefined;

export const soundtrack = (): SoundtrackData => {
  if (cached) return cached;
  const voices = buildVoiceCues(VOICES, { duration: DURATION, fps: FPS, cooldown: VOICE_COOLDOWN, volume: VOICE_LEVEL });
  const cues = [...voices.cues, ...sfxCues(), ...musicCues()].sort((a, b) => a.at - b.at);
  const ducks = duckWindows(cues, FPS, [{ from: COUNTDOWN[0].at, to: BEAT.dropAir + 12, db: -6, label: "countdown" }]);
  cached = { cues, duck: duckEnvelope(DURATION, ducks), ducks, voiceLog: voices.log };
  return cached;
};
