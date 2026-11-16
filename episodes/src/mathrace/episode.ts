// Episode = race rules (simulated) + presentation cues (captions, expressions, texts, audio).
// A new Math Race episode only needs a new file in src/episodes/ that exports an Episode.
import type { RaceConfig, RaceTimeline, SfxType, Trigger } from "./sim.ts";

export type SymbolKind = "sweat" | "exclaim" | "sparkle" | "spiral" | "none";
export type Pose = "idle" | "happy" | "panic";

export type ExpressionCue = {
  lane: 0 | 1;
  trigger: Trigger;
  pose: Pose;
  expression: string;
  symbol?: SymbolKind;
};

export type CaptionCue = {
  trigger: Trigger;
  text: string;
  /** Highlight with this lane's color. */
  accentLane?: 0 | 1;
};

export type Episode = {
  id: string;
  race: RaceConfig;
  hookTitle: string;
  expressions: ExpressionCue[];
  captions: CaptionCue[];
  ending: {
    character: string;
    pose: Pose;
    expression: string;
    headline: string;
    subline: (tl: RaceTimeline) => string;
    cta: string;
  };
  audio: {
    /** Path under public/, e.g. "audio/music.mp3". null = placeholder, nothing plays. */
    music: string | null;
    musicVolume: number;
    sfx: Record<SfxType, string | null>;
  };
  /** Checked by `npm run report`; the video never reads these. */
  expect?: {
    winner: 0 | 1;
    overtakeRound: number;
    finishRound: number;
    crossover: number;
  };
};
