// Beats, acting and captions as pure functions of the frame. The 3D scene, the overlays, sound.ts and the
// report all read this file, so picture, sound and report can never drift apart.
import type { SymbolKind } from "../components/MangaSymbol.tsx";
import type { Caption } from "../kit/overlays/CaptionPills.tsx";
import { ORDER, type Member } from "./data.ts";

export const FPS = 30;

export const BEAT = {
  hook: 0,
  end: 150, // 5 s template; real episodes are 35-50 s (hook, setup, experiment, twist, results, reveal, CTA)
} as const;
export const DURATION = BEAT.end;

export type ActorState = {
  clip: string;
  /** seconds into the clip */
  time: number;
  expression: string;
  /** feet position in world space (metres) */
  pos: [number, number, number];
  yaw: number;
  symbols: { kind: SymbolKind; from: number }[];
};

/** Feet x of each mascot (screen order). */
export const SPOT_X = (i: number) => (i - (ORDER.length - 1) / 2) * 0.6;
export const FLOOR_Z = 0.6;

/** Different idle offsets so the four don't breathe in sync. */
const IDLE_OFFSET: Record<Member, number> = {
  miyu: 11.2,
  anna: 7.4,
  lumi: 0,
  zuzu: 3.1,
};

/** Anna gets smug a second in: drives the template's one voice rule and one SFX. */
export const ANNA_SMUG_AT = 60;

export const ACTING = (m: Member, f: number): ActorState => {
  const i = ORDER.indexOf(m);
  const base: ActorState = {
    clip: "idle",
    time: f / FPS + IDLE_OFFSET[m],
    expression: "neutral",
    pos: [SPOT_X(i), 0, FLOOR_Z],
    yaw: 0,
    symbols: [],
  };
  if (m === "anna" && f >= ANNA_SMUG_AT)
    return {
      ...base,
      expression: "smug",
      symbols: [{ kind: "sparkle", from: ANNA_SMUG_AT }],
    };
  if (m === "miyu" && f >= 90)
    return {
      ...base,
      expression: "squint",
      symbols: [{ kind: "zzz", from: 90 }],
    };
  return base;
};

export const CAPTIONS: Caption[] = [
  {
    from: 4,
    to: BEAT.end,
    text: "Template: who guesses best?",
    sticker: { text: "Guess first!", at: 36 },
  },
];
