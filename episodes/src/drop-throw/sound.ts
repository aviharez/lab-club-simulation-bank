// Soundtrack cue sheet for EP03 "Drop vs Throw" (pure data).
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
  FPS,
  GHOSTS,
  LAND,
  landOn,
  LUMI,
  MIYU,
  REPLAY,
  REPLAY_LAND,
  RESULT_POPS,
  REVEAL_CARD,
  SLOWMO_FROM,
  ZUZU,
} from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
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

/** ui/stopwatch_tick holds four ticks: this is the first one. */
const ONE_TICK = 0.2;

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const cues: Cue[] = [
    key(36, sfx("ui", "result_stamp"), 0.8, "Guess first! sticker"),
    ...COUNTDOWN.slice(0, 3).map((c) => key(c.at, sfx("ui", "countdown_beep"), 0.5, `countdown ${c.n}`)),
    key(SLOWMO_FROM - 6, sfx("ui", "transition_whoosh"), 0.45, "slow-mo in"),
    key(BEAT.release, sfx("ui", "go_whistle"), 0.6, "GO! both balls released"),
    // both balls touch the floor on the same frame: one bounce each, the thrown one a touch higher in pitch
    key(landOn("dropped"), sfx("objects", "ball_bounce"), 0.9, "dropped ball lands", { duck: -7, duckLen: 14, rate: 0.92 }),
    key(landOn("thrown"), sfx("objects", "ball_bounce"), 0.75, "thrown ball lands (same frame)", { rate: 1.06 }),
    key(LAND + 2, sfx("ui", "stopwatch_tick"), 0.6, "stopwatch stops", { len: Math.ceil(ONE_TICK * FPS), fadeOut: 2 }),
    key(BEAT.watch + 6, sfx("ui", "stopwatch_tick"), 0.5, "stopwatch close-up", { len: Math.ceil(ONE_TICK * FPS), fadeOut: 2 }),
    // replay: one swish per ghost pair, rising in pitch; the bounce again on the replay landing
    ...GHOSTS.map((g, i) => key(g.at, sfx("ui", "swish"), 0.35 + 0.02 * i, `ghost ${i + 1} (t = ${g.t.toFixed(2)} s)`, { rate: 2 ** (i / 12) })),
    key(REPLAY_LAND, sfx("objects", "ball_bounce"), 0.55, "replay: both land again", { rate: 0.98 }),
    // results, reveal
    ...RESULT_POPS.map((at, i) => key(at + 8, sfx("ui", "result_stamp"), 0.7, `result card ${i + 1} stamp`)),
    key(LUMI.glint, sfx("ui", "glint_shine"), 0.6, "glasses glint"),
    key(REVEAL_CARD.lands, sfx("ui", "reveal_ding"), 0.7, "reveal card lands", { duck: -6, duckLen: 45 }),
  ];
  // stopwatch running: a tick every 0.16 s of real time (0.64 s at 4x) while both balls fall
  for (let f = BEAT.release + 2; f < LAND - 4; f += 0.16 * FPS * 4) cues.push(amb(f, sfx("ui", "stopwatch_tick"), 0.28, "stopwatch running", { len: Math.ceil(ONE_TICK * FPS), fadeOut: 2 }));
  return cues;
};

// ---------------------------------------------------------------- voices (driven by the acting)

const cheer = { on: { clip: "cheer" }, window: [BEAT.cta, DURATION] as [number, number], priority: 50, group: CTA_GROUP, once: true, volume: 0.45 } as const;

const VOICES: CastVoices = {
  anna: {
    sample: sampleOf("anna"),
    rules: [
      { reaction: "confident", on: { symbol: "sparkle" }, window: [ANNA.bet - 2, BEAT.countdown], label: "Anna bets: the dropped one first", priority: 60, once: true },
      { reaction: "shocked", on: { expression: "shocked" }, window: [LAND - 2, LAND + 60], label: "Anna: same landing?!", priority: 90, once: true },
      { reaction: "smug", on: { expression: "smug" }, window: [ANNA.doubt - 2, BEAT.hint], label: "Anna: mine must be slower", priority: 70, once: true },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  zuzu: {
    sample: sampleOf("zuzu"),
    rules: [
      { reaction: "effort", on: { symbol: "sweat" }, window: [ZUZU.effort - 2, BEAT.release + 4], label: "Zuzu releases (effort)", priority: 70, once: true, maxShift: 6 },
      { reaction: "happy", on: { expression: "happy" }, window: [ZUZU.react - 2, BEAT.results], label: "Zuzu was right", priority: 80, once: true },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  miyu: {
    sample: sampleOf("miyu"),
    rules: [
      { reaction: "smug_laugh", on: { expression: "smug" }, window: [MIYU.smug - 2, BEAT.results + 10], label: "Miyu: fufu…", priority: 80, once: true },
      { reaction: "cheer", label: "Miyu cheers", ...cheer },
    ],
  },
  lumi: {
    sample: sampleOf("lumi"),
    rules: [
      { reaction: "thinking", on: { clip: "point" }, window: [BEAT.hint, BEAT.twist], label: "Lumi: watch from the side", priority: 75, once: true },
      { reaction: "explain_start", on: { clip: "point" }, window: [BEAT.reveal, BEAT.cta], label: "Lumi starts the reveal", priority: 85, once: true },
      { reaction: "cheer", label: "Lumi cheers", ...cheer },
    ],
  },
};

// ---------------------------------------------------------------- music

const musicCues = (): Cue[] => {
  const jingle = music("intro_jingle");
  const main = music("main_theme_loop");
  const tension = music("buildup_tension_loop");
  const calm = music("reveal_calm_bed");
  const twist = music("stinger_twist");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };
  const jingleEnd = r(jingle.duration * FPS);
  // the theme takes over under the end of the jingle and plays the bets
  const mainAt = jingleEnd - 12;
  // stinger_twist: skip its long intro, keep the pickup, land the hit on the replay cut
  const twistFrom = 2.1;
  const twistAt = r(REPLAY.cut - (STINGER_HIT.stinger_twist! - twistFrom) * FPS);
  const twistEnd = twistAt + r((twist.duration - twistFrom) * FPS);
  const tBar = barFrames(tension, FPS);
  // the tension loop leaves on its first bar line after the twist pickup has started
  const tensionOut = r(BEAT.countdown + Math.ceil((twistAt - BEAT.countdown) / tBar) * tBar);
  // the calm bed comes in under the end of the stinger and carries the replay, results and reveal
  const calmAt = twistEnd - 24;
  const mainReturn = (8 * 240) / main.bpm!;
  return [
    track(0, jingle, "intro jingle under the hook", [
      [0, 0.25],
      [jingleEnd, 0.25],
    ]),
    track(mainAt, main, "main theme: bets", [
      [mainAt, 0],
      [mainAt + 18, 0.22],
      [BEAT.countdown - 4, 0.22],
      [BEAT.countdown + 10, 0],
    ]),
    track(BEAT.countdown, tension, "tension loop: countdown, release, slow-mo", [
      [BEAT.countdown, 0.22],
      [BEAT.release, 0.22],
      [BEAT.release + 20, 0.18],
      [tensionOut - 12, 0.18],
      [tensionOut, 0],
    ]),
    track(
      twistAt,
      twist,
      `twist stinger (hit @${REPLAY.cut}: side-view replay)`,
      [
        [twistAt, 0],
        [twistAt + 6, 0.25],
        [twistEnd, 0.25],
      ],
      twistFrom,
    ),
    track(calmAt, calm, "calm bed: replay, results, Lumi's reveal", [
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
  const ducks = duckWindows(cues, FPS, [{ from: COUNTDOWN[0].at, to: BEAT.release + 12, db: -6, label: "countdown" }]);
  cached = { cues, duck: duckEnvelope(DURATION, ducks), ducks, voiceLog: voices.log };
  return cached;
};
