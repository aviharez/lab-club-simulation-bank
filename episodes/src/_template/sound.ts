// Soundtrack plan (pure data): music plan, SFX cues and voice rules, all derived from timeline.ts and using
// only library names (src/audio/library.ts). <Soundtrack> plays it, the report prints and checks it.
import { music, sfx } from "../audio/library.ts";
import {
  duckEnvelope,
  duckWindows,
  type Cue,
  type SoundtrackData,
} from "../audio/mix.ts";
import { buildVoiceCues, type CastVoices } from "../audio/voiceCues.ts";
import { ACTING, ANNA_SMUG_AT, BEAT, DURATION, FPS } from "./timeline.ts";

/** Frames before the same reaction may play again (~1.5 s). */
export const VOICE_COOLDOWN = 45;
/** Music level range (share of full scale, before ducking): 15-25 %. */
export const MUSIC_RANGE = [0.15, 0.25] as const;

const sample = (m: Parameters<typeof ACTING>[0]) => (f: number) => {
  const s = ACTING(m, f);
  return {
    clip: s.clip,
    expression: s.expression,
    symbols: s.symbols.filter((x) => f >= x.from).map((x) => x.kind),
  };
};

// voices follow the acting: the rule fires on the frame its trigger starts matching
const VOICES: CastVoices = {
  anna: {
    sample: sample("anna"),
    rules: [
      {
        reaction: "smug",
        on: { expression: "smug" },
        label: "Anna is sure she wins",
        priority: 50,
        once: true,
      },
    ],
  },
};

const sfxCues = (): Cue[] => {
  const key = (
    at: number,
    file: Cue["file"],
    volume: number,
    label: string,
  ): Cue => ({
    at: Math.round(at),
    layer: "sfx",
    tier: "key",
    file,
    volume,
    label,
  });
  return [
    key(4, sfx("ui", "pop"), 0.85, "hook caption pops"),
    key(ANNA_SMUG_AT, sfx("ui", "sparkle_chime"), 0.5, "Anna smug sparkle"),
  ];
};

const musicCues = (): Cue[] => {
  const theme = music("main_theme_loop");
  const curve: [number, number][] = [
    [0, 0],
    [12, 0.25],
    [BEAT.end - 20, 0.25],
    [BEAT.end, 0],
  ];
  return [
    {
      at: 0,
      layer: "music",
      file: theme,
      volume: 0.25,
      label: "main theme under the hook",
      len: BEAT.end,
      curve,
      duckScale: 1,
    },
  ];
};

let cached: SoundtrackData | undefined;

export const soundtrack = (): SoundtrackData => {
  if (cached) return cached;
  const voices = buildVoiceCues(VOICES, {
    duration: DURATION,
    fps: FPS,
    cooldown: VOICE_COOLDOWN,
    volume: 0.85,
  });
  const cues = [...voices.cues, ...sfxCues(), ...musicCues()].sort(
    (a, b) => a.at - b.at,
  );
  const ducks = duckWindows(cues, FPS);
  cached = {
    cues,
    duck: duckEnvelope(DURATION, ducks),
    ducks,
    voiceLog: voices.log,
  };
  return cached;
};
