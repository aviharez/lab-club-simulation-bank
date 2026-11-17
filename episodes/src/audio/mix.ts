// Cue model + mix maths shared by every episode. Pure data, no Remotion imports:
// the soundtrack component and the report script read exactly the same numbers.
import type { AudioRef, Layer } from "./library.ts";

export type Cue = {
  /** composition frame the cue starts on */
  at: number;
  layer: Layer;
  file: AudioRef;
  /** mix volume 0..1 before the master headroom (music: see `curve`) */
  volume: number;
  label: string;
  rate?: number;
  /** seconds into the file to start from (slices, bar-aligned loop entries) */
  offset?: number;
  /** frames to play; default: until the file ends */
  len?: number;
  /** fade lengths in frames (default: none in, 2 out when `len` cuts the file short) */
  fadeIn?: number;
  fadeOut?: number;
  /** sfx: "key" (default) is a sync hit, "ambient" sits under everything but music */
  tier?: "key" | "ambient";
  /** music ducks by this many dB (negative) while the cue plays; voices always duck */
  duck?: number;
  /** frames the duck lasts (default: the cue's length) */
  duckLen?: number;
  /** music only: how much of the ducking this cue takes (1 = all, 0.4 = stingers that must still land) */
  duckScale?: number;
  /** music only: [frame, volume] keyframes in composition frames, linear between, before ducking */
  curve?: [number, number][];
  /** voices */
  character?: string;
  reaction?: string;
  /** voices in the same group may overlap each other (group moments like the CTA cheer) */
  group?: string;
};

/** Whole-mix gain applied in the soundtrack so stacked cues cannot clip before mastering (-4.4 dB). */
export const HEADROOM = 0.6;

/**
 * The library masters music to -20 LUFS and voices to -16 LUFS (targets_lufs in the audio manifest). The music bus
 * is trimmed up by that difference, so "music at 20%" means 20% of voice level, not 20% of an already quieter file.
 */
export const MUSIC_TRIM = 10 ** (4 / 20);

/** Voice bus: every voice cue plays at this share of its cue volume (55 %, -5.2 dB) so they sit lower against the music and SFX. */
export const VOICE_BUS = 0.55;

/** Music ducking: depth under a full-level voice, and ramp lengths in frames. */
export const DUCK = { voiceDb: -7, softVoiceDb: -3, attack: 5, release: 6 };

const dbToGain = (db: number) => 10 ** (db / 20);

/** Frames a cue is audible for. */
export const cueFrames = (c: Cue, fps: number) => c.len ?? Math.ceil(((c.file.duration - (c.offset ?? 0)) / (c.rate ?? 1)) * fps);

const lerpCurve = (curve: [number, number][], f: number) => {
  if (f <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [f1, v1] = curve[i];
    if (f <= f1) {
      const [f0, v0] = curve[i - 1];
      return f1 === f0 ? v1 : v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
    }
  }
  return curve[curve.length - 1][1];
};

export type DuckWindow = { from: number; to: number; db: number; label: string };

/** Every stretch of the timeline the music has to get out of the way for. */
export const duckWindows = (cues: Cue[], fps: number, extra: DuckWindow[] = []): DuckWindow[] => [
  ...extra,
  ...cues.flatMap((c): DuckWindow[] => {
    const db = c.duck ?? (c.layer === "voice" ? (c.volume < 0.6 ? DUCK.softVoiceDb : DUCK.voiceDb) : 0);
    return db < 0 ? [{ from: c.at, to: c.at + (c.duckLen ?? cueFrames(c, fps)), db, label: c.label }] : [];
  }),
];

/** Per-frame music gain (linear): deepest active duck wins, with smooth attack/release ramps. */
export const duckEnvelope = (duration: number, windows: DuckWindow[]): number[] => {
  const smooth = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };
  return Array.from({ length: duration }, (_, f) => {
    let db = 0;
    for (const w of windows) {
      const k = f < w.from ? smooth((f - (w.from - DUCK.attack)) / DUCK.attack) : f <= w.to ? 1 : 1 - smooth((f - w.to) / DUCK.release);
      db = Math.min(db, w.db * k);
    }
    return dbToGain(db);
  });
};

/** Volume of a cue at composition frame f (before HEADROOM). `duck` is the envelope from duckEnvelope(). */
export const cueVolumeAt = (c: Cue, f: number, fps: number, duck: number[]) => {
  const local = f - c.at;
  const len = cueFrames(c, fps);
  if (local < 0 || local >= len) return 0;
  if (c.layer === "music") return MUSIC_TRIM * (c.curve ? lerpCurve(c.curve, f) : c.volume) * (duck[Math.min(duck.length - 1, Math.max(0, f))] ?? 1) ** (c.duckScale ?? 1);
  const fadeOut = c.fadeOut ?? (c.len ? 2 : 0);
  const a = c.fadeIn ? Math.min(1, (local + 1) / c.fadeIn) : 1;
  const b = fadeOut ? Math.min(1, (len - local) / fadeOut) : 1;
  return (c.layer === "voice" ? VOICE_BUS : 1) * c.volume * a * b;
};

/** What an episode's sound.ts `soundtrack()` returns: read by the kit's <Soundtrack> and by the report. */
export type SoundtrackData = { cues: Cue[]; /** per-frame music gain from ducking (linear) */ duck: number[]; ducks: DuckWindow[]; voiceLog: string[] };
