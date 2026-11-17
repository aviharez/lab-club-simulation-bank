// Soundtrack cue sheet for EP07 "Sorting Race" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved library.
// Kept deliberately quiet: 6 single voice reactions (≥ 2.5 s apart) plus the CTA group cheer; one glass clink per
// comparison and one slide per swap at 1x, thinned out in the fast part (a clink at most every 10 / 16 frames per bench).
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type SoundtrackData } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import { ALGOS, race, type Member } from "./data.ts";
import { ACTING, ANNA, BEAT, DONE_AT, DURATION, FPS, frameOf, LUMI, REVEAL_CARD, RESULT_POPS, speedAt } from "./timeline.ts";

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
/** Fewest frames between two operation sounds of one bench, by playback speed. */
export const OP_SFX_GAP: Record<number, number> = { 1: 0, 4: 10, 8: 16 };

const r = Math.round;

const sampleOf =
  (m: Member) =>
  (f: number): ActingSample => {
    const s = ACTING(m, f);
    return { clip: s.clip, expression: s.expression, symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind) };
  };

// ---------------------------------------------------------------- sfx

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const stamp = sfx("ui", "result_stamp");
  const tick = sfx("ui", "counter_tick");
  const watch = sfx("ui", "stopwatch_tick");
  const whoosh = sfx("ui", "transition_whoosh");
  const clink = sfx("lab", "glass_clink");
  const slide = sfx("lab", "beaker_slide");
  const steps = sfx("body", "footsteps_tile");
  const cues: Cue[] = [
    key(36, stamp, 0.38, "Guess first! sticker"),
    key(BEAT.go, sfx("ui", "go_whistle"), 0.42, "GO whistle"),
    key(BEAT.go + 4, watch, 0.4, "Miyu starts the stopwatch", { len: 10 }),
    key(BEAT.x4, whoosh, 0.36, "4x SPEED badge", { len: 26, fadeOut: 8 }),
    key(BEAT.x8, whoosh, 0.36, "8x SPEED badge", { len: 26, fadeOut: 8, rate: 1.1 }),
  ];
  // one sound per operation, thinned out in the fast part (per bench)
  for (const a of ALGOS) {
    const R = race(a);
    const pitch = a === "anna" ? 0.94 : 1.07;
    const name = a === "anna" ? "Anna" : "Lumi";
    let last = -Infinity;
    let c = 0;
    R.ops.forEach((o, k) => {
      const at = frameOf(R.t[k]);
      if (o.kind === "compare") c++;
      const gap = OP_SFX_GAP[speedAt(at + 0.01)];
      if (at - last >= gap) {
        last = at;
        if (o.kind === "compare") cues.push(amb(at, clink, 0.3, `${name}: compare ${c} (${speedAt(at + 0.01)}x)`, { rate: pitch * (c % 2 ? 1 : 1.04) }));
        else {
          const len = r(frameOf(R.t[k + 1]) - at);
          cues.push(key(at, slide, 0.3, `${name}: swap (${speedAt(at + 0.01)}x)`, { rate: pitch, len: Math.max(8, Math.min(len + 4, r(slide.duration * FPS))), fadeOut: 4 }));
          if (speedAt(at + 0.01) === 1) cues.push(amb(at, steps, 0.15, `${name} carries a beaker`, { len, fadeOut: 6, rate: pitch }));
        }
      }
    });
    // a soft tick every 10 comparisons
    for (let n = 10; n <= R.compares[R.ops.length]; n += 10) {
      const k = R.compares.findIndex((x) => x >= n);
      cues.push(key(frameOf(R.t[k]), tick, 0.24, `${name}: ${n} comparisons`, { len: 8, rate: pitch * (0.9 + n / 200) }));
    }
  }
  cues.push(
    key(DONE_AT.lumi, watch, 0.42, "Miyu clicks: Lumi done", { len: 10 }),
    key(DONE_AT.anna, watch, 0.42, "Miyu clicks: Anna done", { len: 10 }),
    key(BEAT.twist + 12, stamp, 0.38, "Twist! sticker"),
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
      { reaction: "confident", on: { clip: "point" }, window: [BEAT.annaBet, BEAT.lumiBet], label: "Anna bets: can't lose", priority: 80, once: true },
      { reaction: "annoyed", on: { expression: "squint" }, window: [ANNA.annoyed - 2, BEAT.lumiDone], label: "Anna: Lumi is pulling ahead", priority: 70, once: true },
      { reaction: "crying", on: { expression: "crying" }, window: [BEAT.lumiDone, BEAT.results], label: "Anna, still swapping", priority: 80, once: true },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  lumi: {
    sample: sampleOf("lumi"),
    rules: [
      { reaction: "thinking", on: { clip: "compare" }, window: [BEAT.lumiBet, BEAT.go], label: "Lumi plans: pivot, split", priority: 75, once: true },
      { reaction: "cheer", on: { clip: "cheer" }, window: [BEAT.lumiDone, BEAT.results], label: "Lumi done first", priority: 85, once: true },
      { reaction: "explain_start", on: { clip: "point" }, window: [BEAT.reveal, BEAT.cta], label: "Lumi starts the reveal", priority: 85, once: true },
      { reaction: "cheer", label: "Lumi cheers", ...cheer },
    ],
  },
  zuzu: { sample: sampleOf("zuzu"), rules: [{ reaction: "cheer", label: "Zuzu cheers", ...cheer }] },
  miyu: { sample: sampleOf("miyu"), rules: [{ reaction: "cheer", label: "Miyu cheers", ...cheer }] },
};

// ---------------------------------------------------------------- music

const musicCues = (): Cue[] => {
  const jingle = music("intro_jingle");
  const main = music("main_theme_loop");
  const fast = music("montage_fast_loop");
  const win = music("stinger_win");
  const fail = music("stinger_fail");
  const calm = music("reveal_calm_bed");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };
  const jingleEnd = r(jingle.duration * FPS);
  const mainAt = jingleEnd - 12;
  // the theme carries the bets, leaving on a bar line just after the race starts
  const mBar = barFrames(main, FPS);
  const mainOut = r(mainAt + Math.ceil((BEAT.race + 10 - mainAt) / mBar) * mBar);
  // the montage loop runs the race, leaving on the bar line nearest Anna's finish
  const fBar = barFrames(fast, FPS);
  const fastAt = BEAT.race - 8;
  const fastOut = r(fastAt + Math.round((BEAT.annaDone + 6 - fastAt) / fBar) * fBar);
  // the win stinger's hit lands on Lumi's finish (its build-up trimmed to 1.2 s)
  const winFrom = STINGER_HIT.stinger_win! - 1.2;
  const winAt = r(DONE_AT.lumi - 1.2 * FPS);
  const winEnd = winAt + r((win.duration - winFrom) * FPS);
  // the fail stinger, short: only its first 2.6 s, from Anna's finish
  const failAt = BEAT.annaDone;
  const failEnd = failAt + r(2.6 * FPS);
  const calmAt = BEAT.results - 6;
  const mainReturn = (8 * 240) / main.bpm!;
  return [
    track(0, jingle, "intro jingle under the hook", [
      [0, 0.25],
      [jingleEnd, 0.25],
    ]),
    track(mainAt, main, "main theme: the rules and the bets", [
      [mainAt, 0],
      [mainAt + 18, 0.2],
      [mainOut - 14, 0.2],
      [mainOut, 0],
    ]),
    track(fastAt, fast, "montage loop: the race (1x → 4x → 8x)", [
      [fastAt, 0],
      [fastAt + 10, 0.2],
      [BEAT.x8, 0.24],
      [winAt, 0.24],
      [winAt + 8, 0.15],
      [winEnd, 0.17],
      [fastOut - 12, 0.17],
      [fastOut, 0],
    ]),
    track(
      winAt,
      win,
      `win stinger (hit @${r(DONE_AT.lumi)}: Lumi done)`,
      [
        [winAt, 0],
        [winAt + 6, 0.25],
        [winEnd, 0.25],
      ],
      winFrom,
    ),
    track(failAt, fail, "fail stinger, short: Anna done", [
      [failAt, 0.22],
      [failEnd - 20, 0.22],
      [failEnd, 0],
    ]),
    track(calmAt, calm, "calm bed: results, twist, Lumi's reveal", [
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
