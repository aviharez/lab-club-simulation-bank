// Soundtrack cue sheet for EP06 "Zuzu's Dizzy Walk" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved library.
// Voices are kept sparse on purpose (6 single reactions, ≥ 2.5 s apart, plus the CTA group cheer); the brief's voice
// list is a menu: Miyu's sleepy and Lumi's thinking are left out.
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type SoundtrackData } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import { STEPS, type Member } from "./data.ts";
import { ACTING, ANNA, BEAT, DURATION, FPS, GHOST_POP, LUMI, REVEAL_CARD, RESULT_POPS, runStepEnd, TAPE, WALK, walkStepEnd, ZUZU } from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
/** Minimum distance between two single voices (2.5 s; the CTA group cheer is exempt). */
export const VOICE_MIN_GAP = 75;
/** At most this many single voices (the CTA cheer excepted). */
export const VOICE_MAX = 6;
const VOICE_LEVEL = 0.85;
export const CTA_GROUP = "cta";
/** Music level range (share of full scale, before ducking): 15-25 %. */
export const MUSIC_RANGE = [0.15, 0.25] as const;

const r = Math.round;

const sampleOf =
  (m: Member) =>
  (f: number): ActingSample => {
    const s = ACTING(m, f);
    return { clip: s.clip, expression: s.expression, symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind) };
  };

// ---------------------------------------------------------------- sfx

/** The footstep beds speed up with the time-lapse (rate 1.0 → 1.6 over the walk). */
const stepRate = (f: number) => 1 + 0.6 * Math.min(1, Math.max(0, (f - BEAT.walk) / (BEAT.walkEnd - BEAT.walk)));

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const swish = sfx("ui", "swish");
  const stamp = sfx("ui", "result_stamp");
  const tick = sfx("ui", "counter_tick");
  const cues: Cue[] = [
    key(36, stamp, 0.38, "Guess first! sticker"),
    ...ANNA.push.map((at, i) => key(at + 8, swish, 0.42, `Anna spins Zuzu (push ${i + 1})`, { rate: 0.95 + 0.06 * i })),
    key(BEAT.spinEnd, sfx("body", "tumble_cartoon"), 0.5, "Zuzu staggers out of the spin"),
    key(BEAT.spinEnd + 4, sfx("ui", "dizzy_twinkle"), 0.4, "dizzy stars"),
    key(ZUZU.oops - 2, sfx("body", "tumble_cartoon"), 0.36, "step 2: Zuzu stumbles straight back"),
  ];
  // the walk: two footstep beds (Zuzu, Lumi a little higher and offset), speeding up with the time-lapse
  const steps = sfx("body", "footsteps_tile");
  for (const [who, off, vol, pitch] of [
    ["Zuzu", 0, 0.34, 1],
    ["Lumi", 6, 0.26, 1.12],
  ] as const) {
    let n = 1;
    for (let at = BEAT.walk + off; at < BEAT.walkEnd - 4; n++) {
      const rate = stepRate(at) * pitch;
      const len = Math.min(r((steps.duration / rate) * FPS) - 4, BEAT.walkEnd + 2 - at);
      cues.push(amb(at, steps, vol, `${who}'s footsteps ${n} (x${rate.toFixed(2)})`, { rate, len, fadeIn: 3, fadeOut: 6 }));
      at += len - 4;
    }
  }
  // the dizzy twinkle loops softly under the walk
  const tw = sfx("ui", "dizzy_twinkle");
  for (let at = BEAT.walk + 10, n = 1; at < BEAT.walkEnd - 10; at += 32, n++) cues.push(amb(at, tw, 0.14, `dizzy twinkle ${n}`, { rate: n % 2 ? 1 : 1.06 }));
  // a counter tick every 10 steps (walk and ghost run)
  for (let k = 10; k <= STEPS; k += 10) {
    cues.push(key(walkStepEnd(k), tick, 0.3, `walk: step ${k}`, { len: 8, rate: 0.9 + 0.02 * (k / 10) }));
    cues.push(key(runStepEnd(k), tick, 0.3, `ghosts: step ${k}`, { len: 8, rate: 0.9 + 0.02 * (k / 10) }));
  }
  cues.push(
    key(TAPE.lumi.from, swish, 0.4, "Lumi's tape unrolls"),
    key(TAPE.zuzu.from, swish, 0.36, "Zuzu's tape unrolls", { rate: 1.1 }),
    key(TAPE.cu.from, swish, 0.42, "the tape reaches Zuzu"),
    key(BEAT.twist + 12, stamp, 0.38, "Twist! sticker"),
    key(GHOST_POP.from, swish, 0.45, "50 ghosts pop up", { rate: 0.9 }),
    ...RESULT_POPS.map((at, i) => key(at + 8, stamp, 0.42, `result card ${i + 1} stamp`)),
    key(LUMI.glint, sfx("ui", "glint_shine"), 0.6, "glasses glint"),
    key(REVEAL_CARD.lands, sfx("ui", "reveal_ding"), 0.5, "reveal card lands", { duck: -6, duckLen: 45 }),
  );
  return cues;
};

// ---------------------------------------------------------------- voices (driven by the acting; sparse)

const cheer = { on: { clip: "cheer" }, window: [BEAT.cta, DURATION] as [number, number], priority: 50, group: CTA_GROUP, once: true, volume: 0.45 } as const;

const VOICES: CastVoices = {
  anna: {
    sample: sampleOf("anna"),
    rules: [
      { reaction: "smug_laugh", on: { clip: "push_hands" }, window: [BEAT.spin, BEAT.spinEnd], label: "Anna laughs, spinning Zuzu", priority: 70, once: true },
      { reaction: "shocked", on: { expression: "shocked" }, window: [BEAT.results, BEAT.reveal], label: "Anna: 7.2 tiles?!", priority: 85, once: true },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  zuzu: {
    sample: sampleOf("zuzu"),
    rules: [
      { reaction: "dizzy", on: { expression: "dizzy" }, window: [BEAT.spinEnd - 2, BEAT.go], label: "Zuzu, dizzy after the spin", priority: 75, once: true },
      { reaction: "oops", on: { symbol: "sweat" }, window: [BEAT.walk, BEAT.walkEnd], label: "Zuzu's step 2 undoes step 1", priority: 70, once: true },
      { reaction: "shocked", on: { expression: "shocked" }, window: [BEAT.tape, BEAT.twist], label: "Zuzu sees her distance", priority: 80, once: true },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  miyu: {
    sample: sampleOf("miyu"),
    rules: [{ reaction: "cheer", label: "Miyu cheers", ...cheer }],
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
  const jingle = music("intro_jingle");
  const main = music("main_theme_loop");
  const fast = music("montage_fast_loop");
  const twist = music("stinger_twist");
  const calm = music("reveal_calm_bed");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };
  const jingleEnd = r(jingle.duration * FPS);
  const mainAt = jingleEnd - 12;
  // the theme carries the bets, leaving on a bar line just after the walk starts
  const mBar = barFrames(main, FPS);
  const mainOut = r(mainAt + Math.ceil((WALK.start + 10 - mainAt) / mBar) * mBar);
  // the montage loop runs the walk and the measuring, leaving on its last bar line before the twist stinger
  const fBar = barFrames(fast, FPS);
  const fastAt = WALK.start - 8;
  const twistFrom = 2.2;
  const twistAt = r(BEAT.twist - (STINGER_HIT.stinger_twist! - twistFrom) * FPS);
  const fastOut = r(fastAt + Math.floor((twistAt + 10 - fastAt) / fBar) * fBar);
  const twistEnd = twistAt + r((twist.duration - twistFrom) * FPS);
  const calmAt = twistEnd - 24;
  const mainReturn = (8 * 240) / main.bpm!;
  return [
    track(0, jingle, "intro jingle under the hook", [
      [0, 0.25],
      [jingleEnd, 0.25],
    ]),
    track(mainAt, main, "main theme: the spin and the bets", [
      [mainAt, 0],
      [mainAt + 18, 0.2],
      [mainOut - 14, 0.2],
      [mainOut, 0],
    ]),
    track(fastAt, fast, "montage loop: the 100-step walk + measuring", [
      [fastAt, 0],
      [fastAt + 10, 0.22],
      [BEAT.walkEnd, 0.24],
      [BEAT.tape, 0.17],
      [fastOut - 10, 0.17],
      [fastOut, 0],
    ]),
    track(
      twistAt,
      twist,
      `twist stinger (hit @${BEAT.twist}: 50 Zuzus)`,
      [
        [twistAt, 0],
        [twistAt + 6, 0.25],
        [twistEnd, 0.25],
      ],
      twistFrom,
    ),
    track(calmAt, calm, "calm bed: ghost run, results, Lumi's reveal", [
      [calmAt, 0],
      [calmAt + 24, 0.18],
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
  const ducks = duckWindows(cues, FPS, []);
  cached = { cues, duck: duckEnvelope(DURATION, ducks), ducks, voiceLog: voices.log };
  return cached;
};
