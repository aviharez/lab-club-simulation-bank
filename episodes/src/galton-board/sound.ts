// Soundtrack cue sheet for EP05 "Galton Board" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved library.
// Voices are kept sparse on purpose (4 single reactions, ≥ 2.5 s apart, plus the CTA group cheer).
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type SoundtrackData } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import { balls, BET, BINS, type Member } from "./data.ts";
import { ACTING, ANNA, ANNA_LAND, BEAT, CURVE, DURATION, FLIGHTS, FPS, LUMI, MIYU, PATHS, POUR, REVEAL_CARD, RESULT_POPS, SLOW_BALLS, ZUZU } from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
/** Minimum distance between two single voices (2.5 s; the CTA group cheer is exempt). */
export const VOICE_MIN_GAP = 75;
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

/** Pitch of a ball sound by bin (outer bins a little lower, centre higher: a gentle pitched spread). */
const binRate = (k: number) => 0.88 + 0.02 * k;

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const F = FLIGHTS();
  const B = balls();
  const bounce = sfx("objects", "ball_bounce");
  const cues: Cue[] = [key(36, sfx("ui", "result_stamp"), 0.38, "Guess first! sticker")];
  cues.push(key(MIYU.release, sfx("objects", "marbles_scatter_hit"), 0.6, "Miyu tips the scoop into the funnel"));
  // ball 1: a soft pitched tick on each of its 12 pegs (the first tap of the file); the other slow balls: one tap on landing
  const PEG_TAP = { len: 4, fadeOut: 2 };
  for (let row = 0; row < 12; row++) {
    const at = F[0].launch + ((row + 1) / 13) * F[0].dur;
    cues.push(amb(at, bounce, 0.34, `ball 1 hits peg row ${row + 1}`, { ...PEG_TAP, rate: 1.25 - 0.02 * row }));
  }
  for (let i = 0; i < SLOW_BALLS; i++) cues.push(key(F[i].land, bounce, 0.42, `ball ${i + 1} lands in bin ${B[i].bin}`, { ...PEG_TAP, len: 5, rate: binRate(B[i].bin) }));
  // the fast pour: overlapping rolling beds (the file is not a loop: 1.9 s takes, each crossfading into the next)
  const roll = sfx("objects", "marbles_rolling");
  const rollLen = r(roll.duration * FPS) - 8;
  for (let at = POUR.fast - 4, n = 0; at < POUR.end; at += rollLen - 12, n++) {
    const vol = 0.36 + 0.26 * Math.min(1, (at - POUR.fast) / (POUR.end - POUR.fast));
    cues.push(amb(at, roll, vol, `pour bed ${n + 1}`, { len: Math.min(rollLen, POUR.end + 14 - at), fadeIn: 8, fadeOut: 12 }));
  }
  cues.push(
    amb(POUR.fast + 2, sfx("objects", "marbles_scatter_hit"), 0.4, "the flow starts"),
    key(ANNA_LAND, bounce, 0.42, `ball #${balls().findIndex((b) => b.bin === BET.anna) + 1} lands in bin ${BET.anna}`, { ...PEG_TAP, len: 6, rate: binRate(BET.anna) }),
    key(ANNA_LAND + 3, sfx("ui", "sparkle_chime"), 0.36, "Anna's bin lights up"),
    amb(POUR.end - 6, sfx("objects", "marbles_scatter_hit"), 0.45, "the last balls settle"),
    key(BEAT.twist + 12, sfx("ui", "result_stamp"), 0.38, "Twist! sticker"),
    key(CURVE.to - 4, sfx("ui", "sparkle_chime"), 0.45, "the bell curve is drawn"),
    key(PATHS.fan + 4, sfx("ui", "sparkle_chime"), 0.5, "924 paths light up"),
    ...RESULT_POPS.map((at, i) => key(at + 8, sfx("ui", "result_stamp"), 0.42, `result card ${i + 1} stamp`)),
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
      { reaction: "confident", on: { symbol: "sparkle" }, window: [ANNA.bet - 2, BEAT.zuzuBet], label: `Anna bets on bin ${BET.anna}`, priority: 70, once: true },
      { reaction: "crying", on: { expression: "crying" }, window: [ANNA.cry - 2, BEAT.reveal], label: "Anna cries (1 ball vs a tower)", priority: 85, once: true },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  zuzu: {
    sample: sampleOf("zuzu"),
    rules: [
      { reaction: "happy", on: { clip: "point" }, window: [ZUZU.bet - 2, BEAT.pour], label: `Zuzu bets on bin ${BET.zuzu}`, priority: 70, once: true },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  miyu: {
    sample: sampleOf("miyu"),
    rules: [
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
  // the theme carries the bets and the slow balls, leaving on a bar line just after the fast-forward starts
  const mBar = barFrames(main, FPS);
  const mainOut = r(mainAt + Math.ceil((POUR.fast + 10 - mainAt) / mBar) * mBar);
  // the fast loop starts with the fast-forward and leaves on its last bar line before the twist stinger
  const fBar = barFrames(fast, FPS);
  const fastAt = POUR.fast - 8;
  // stinger_twist: skip most of its intro, land its hit on the twist
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
    track(mainAt, main, "main theme: bets + the first 10 balls", [
      [mainAt, 0],
      [mainAt + 18, 0.2],
      [mainOut - 14, 0.2],
      [mainOut, 0],
    ]),
    track(fastAt, fast, `montage loop: the pour of ${balls().length.toLocaleString("en-US")}`, [
      [fastAt, 0],
      [fastAt + 10, 0.22],
      [fastOut - 10, 0.24],
      [fastOut, 0],
    ]),
    track(
      twistAt,
      twist,
      `twist stinger (hit @${BEAT.twist}: the bell curve)`,
      [
        [twistAt, 0],
        [twistAt + 6, 0.25],
        [twistEnd, 0.25],
      ],
      twistFrom,
    ),
    track(calmAt, calm, "calm bed: bell curve, paths, results, Lumi's reveal", [
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

export const BIN_PITCH = Array.from({ length: BINS }, (_, k) => binRate(k));
