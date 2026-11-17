// Soundtrack cue sheet for EP04 "Three Doors" (pure data).
// Every cue derives from the same timeline functions as the picture; every file comes from the approved library.
// The Soundtrack component and the report both read `soundtrack()`.
import { barFrames, music, sfx, STINGER_HIT } from "../audio/library.ts";
import { duckEnvelope, duckWindows, type Cue, type SoundtrackData } from "../audio/mix.ts";
import { buildVoiceCues, type ActingSample, type CastVoices } from "../audio/voiceCues.ts";
import { ROUNDS, type Member, type Player } from "./data.ts";
import {
  ACTED_RATE,
  ACTING,
  ANNA,
  BEAT,
  DURATION,
  FPS,
  LUMI,
  MIYU,
  played,
  RESULT_POPS,
  REVEAL_CARD,
  ROUND_AT,
  roundRate,
  roundsX,
  SLOW,
  ZUZU,
} from "./timeline.ts";

/** Frames the same voice reaction must wait before it may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
const VOICE_LEVEL = 0.85;
export const CTA_GROUP = "cta";
/** Music level range (share of full scale, before ducking): 15-25 %. */
export const MUSIC_RANGE = [0.15, 0.25] as const;
/** Round counts where the montage ticks (sparse: one tick per milestone, not per round). */
export const TICK_AT = [10, 25, 50, 100, 250, 500, 750, ROUNDS];

const r = Math.round;

const sampleOf =
  (m: Member) =>
  (f: number): ActingSample => {
    const s = ACTING(m, f);
    return { clip: s.clip, expression: s.expression, symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind) };
  };

/** First frame on which at least n rounds are played. */
export const frameOfRound = (n: number) => {
  for (let f = BEAT.montage; f < DURATION; f++) if (played(f) >= n) return f;
  return DURATION;
};

// ---------------------------------------------------------------- sfx

const sfxCues = (): Cue[] => {
  const key = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ at: r(at), layer: "sfx", tier: "key", file, volume, label, ...more });
  const amb = (at: number, file: Cue["file"], volume: number, label: string, more: Partial<Cue> = {}): Cue => ({ ...key(at, file, volume, label, more), tier: "ambient" });
  const cues: Cue[] = [key(36, sfx("ui", "result_stamp"), 0.5, "Guess first! sticker")];
  // the two slow rounds: pick (button), Lumi's duck door, the final door (+ Anna's trophy door afterwards)
  for (const p of ["anna", "miyu"] as Player[]) {
    const at = ROUND_AT[p];
    const rd = SLOW[p];
    cues.push(
      key(at.pick + 8, sfx("lab", "button_press"), 0.55, `${p} picks door ${rd.pick + 1}`),
      key(at.host, sfx("lab", "door_open"), 0.75, `Lumi opens door ${rd.opened + 1} (duck)`),
      key(at.host + 9, sfx("ui", "pop"), 0.5, "duck on the pedestal"),
      key(at.open, sfx("lab", "door_open"), 0.85, `final door ${rd.final + 1} opens`),
    );
    if (rd.final !== rd.pick) cues.push(key(at.decide + 4, sfx("ui", "swish"), 0.5, `${p} switches to door ${rd.final + 1}`));
  }
  cues.push(
    key(ROUND_AT.anna.open + 6, sfx("ui", "fail_trombone_short"), 0.7, "Anna: duck!", { duck: -6, duckLen: 40 }),
    key(ROUND_AT.anna.rest!, sfx("lab", "door_open"), 0.6, `door ${SLOW.anna.prize + 1} shows where the trophy was`),
    key(ROUND_AT.anna.rest! + 10, sfx("ui", "sparkle_chime"), 0.45, "the trophy was there"),
    key(ROUND_AT.miyu.open + 6, sfx("ui", "win_fanfare_short"), 0.8, "Miyu: trophy!", { duck: -6, duckLen: 45 }),
    key(BEAT.twist + 12, sfx("ui", "result_stamp"), 0.5, "Twist! sticker"),
    key(BEAT.montage - 10, sfx("ui", "transition_whoosh"), 0.5, "into the montage"),
  );
  // the montage: the first rounds are acted out (one soft door per round and stage); then sparse milestone ticks
  for (let n = 2; n <= ROUNDS; n++) {
    const f0 = frameOfRound(n - 1);
    if (roundRate(f0) >= ACTED_RATE) break;
    // the final door opens at phase 0.5 of the round being acted
    let f = f0;
    while (f < DURATION && roundsX(f) < n - 1 + 0.5) f++;
    cues.push(amb(f, sfx("lab", "door_open"), 0.32, `montage round ${n}: final doors open`, { rate: 1.1 }));
  }
  for (const n of TICK_AT) cues.push(amb(frameOfRound(n), sfx("ui", "counter_tick"), n === ROUNDS ? 0.6 : 0.4, `counter: round ${n}`, { len: 9, fadeOut: 3 }));
  cues.push(
    ...RESULT_POPS.flatMap((at, i) => [key(at, sfx("ui", "card_flip"), 0.6, `result card ${i + 1} flips in`), key(at + 8, sfx("ui", "result_stamp"), 0.7, `result card ${i + 1} stamp`)]),
    key(LUMI.glint, sfx("ui", "glint_shine"), 0.6, "glasses glint"),
    key(REVEAL_CARD.lands, sfx("ui", "reveal_ding"), 0.7, "reveal card lands", { duck: -6, duckLen: 45 }),
  );
  return cues;
};

// ---------------------------------------------------------------- voices (driven by the acting)

const cheer = { on: { clip: "cheer" }, window: [BEAT.cta, DURATION] as [number, number], priority: 50, group: CTA_GROUP, once: true, volume: 0.45 } as const;
const A = ROUND_AT.anna;

const VOICES: CastVoices = {
  anna: {
    sample: sampleOf("anna"),
    rules: [
      { reaction: "confident", on: { symbol: "sparkle" }, window: [ANNA.bet - 2, BEAT.anna], label: "Anna bets: always stay", priority: 70, once: true },
      { reaction: "smug", on: { symbol: "sparkle" }, window: [A.decide - 2, A.open], label: "Anna stays (smug)", priority: 70, once: true },
      { reaction: "shocked", on: { expression: "shocked" }, window: [ANNA.duck - 2, ANNA.duck + 40], label: "Anna: a duck?!", priority: 90, once: true },
      { reaction: "crying", on: { expression: "crying" }, window: [ANNA.cry - 2, BEAT.results], label: "Anna cries (stay keeps losing)", priority: 85, once: true },
      { reaction: "cheer", label: "Anna cheers", ...cheer },
    ],
  },
  miyu: {
    sample: sampleOf("miyu"),
    rules: [
      { reaction: "sleepy", on: { symbol: "zzz" }, window: [MIYU.bet - 2, BEAT.anna], label: "Miyu bets: switch (sleepy)", priority: 70, once: true },
      { reaction: "happy", on: { expression: "happy" }, window: [MIYU.win - 2, MIYU.win + 40], label: "Miyu wins the trophy", priority: 90, once: true },
      { reaction: "cheer", label: "Miyu cheers", ...cheer },
    ],
  },
  zuzu: {
    sample: sampleOf("zuzu"),
    rules: [
      { reaction: "cheer", on: { symbol: "sparkle" }, window: [ZUZU.cheer - 2, ZUZU.sign], label: "Zuzu cheers for Miyu", priority: 60, once: true, maxShift: 20 },
      { reaction: "cheer", label: "Zuzu cheers", ...cheer },
    ],
  },
  lumi: {
    sample: sampleOf("lumi"),
    rules: [
      { reaction: "thinking", on: { symbol: "question" }, window: [LUMI.askA - 2, A.decide], label: "Lumi: stay or switch?", priority: 80, once: true },
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
  const win = music("stinger_win");
  const calm = music("reveal_calm_bed");
  const track = (at: number, file: Cue["file"], label: string, curve: [number, number][], offset = 0): Cue => {
    const start = r(at);
    const end = curve[curve.length - 1][0];
    return { at: start, layer: "music", file, volume: Math.max(...curve.map((k) => k[1])), label, offset, len: end - start, curve, duckScale: file.loop ? 1 : 0.4 };
  };
  const jingleEnd = r(jingle.duration * FPS);
  const mainAt = jingleEnd - 12;
  // the theme carries the slow rounds and leaves on a bar line just after the twist
  const mBar = barFrames(main, FPS);
  const mainOut = r(mainAt + Math.ceil((BEAT.twist + 20 - mainAt) / mBar) * mBar);
  // the fast loop starts on the montage cut and leaves on its last bar line before the scoreboard hit
  const fBar = barFrames(fast, FPS);
  const fastAt = BEAT.montage - 6;
  const fastOut = r(fastAt + Math.floor((BEAT.results - 8 - fastAt) / fBar) * fBar);
  // stinger_win: skip most of its intro, land the hit on the final scoreboard (results cut)
  const winFrom = 4.2;
  const winAt = r(BEAT.results - (STINGER_HIT.stinger_win! - winFrom) * FPS);
  const winEnd = winAt + r((win.duration - winFrom) * FPS);
  const calmAt = winEnd - 24;
  const mainReturn = (8 * 240) / main.bpm!;
  return [
    track(0, jingle, "intro jingle under the hook", [
      [0, 0.25],
      [jingleEnd, 0.25],
    ]),
    track(mainAt, main, "main theme: bets + slow rounds", [
      [mainAt, 0],
      [mainAt + 18, 0.2],
      [mainOut - 14, 0.2],
      [mainOut, 0],
    ]),
    track(fastAt, fast, "montage loop: 1,000 rounds", [
      [fastAt, 0],
      [fastAt + 8, 0.24],
      [fastOut - 10, 0.24],
      [fastOut, 0],
    ]),
    track(
      winAt,
      win,
      `win stinger (hit @${BEAT.results}: final scoreboard)`,
      [
        [winAt, 0],
        [winAt + 8, 0.25],
        [winEnd, 0.25],
      ],
      winFrom,
    ),
    track(calmAt, calm, "calm bed: results, Lumi's reveal", [
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

