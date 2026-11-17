// Typed access to the approved audio library (audio/final, mirrored to public/audio/lib by `npm run sync-audio`).
// Unknown names are a TypeScript error, and throw at runtime (so the report fails too).
// Pure data: no Remotion imports, so report scripts can use it under plain Node.
import { MUSIC, SFX, VOICES } from "./library.generated.ts";

/** Folder under public/ that holds the mirrored library. */
export const LIB_DIR = "audio/lib";

export type Layer = "voice" | "sfx" | "music";

export type AudioRef = {
  layer: Layer;
  /** short id for cue sheets, e.g. "zuzu/fall", "ui/pop", "main_theme_loop" */
  id: string;
  /** path under public/, pass to staticFile() */
  path: string;
  /** seconds */
  duration: number;
  lufs: number;
  loop: boolean;
  /** voices: who is speaking */
  character?: Character;
  /** voices: what she says (the plain line, without the audio tag) */
  text?: string;
  /** music loops */
  bpm?: number;
  bars?: number;
};

export type Character = keyof typeof VOICES;
export type Reaction<C extends Character = Character> = keyof (typeof VOICES)[C] & string;
export type SfxCategory = keyof typeof SFX;
export type SfxName<K extends SfxCategory> = keyof (typeof SFX)[K] & string;
export type MusicName = keyof typeof MUSIC;

type Entry = { path: string; duration: number; lufs: number; loop: boolean; text?: string; bpm?: number; bars?: number };

const ref = (layer: Layer, id: string, e: Entry | undefined, extra: Partial<AudioRef> = {}): AudioRef => {
  if (!e) throw new Error(`audio library: unknown ${layer} "${id}" (not in audio_manifest.json; run npm run sync-audio?)`);
  return { layer, id, path: `${LIB_DIR}/${e.path}`, duration: e.duration, lufs: e.lufs, loop: e.loop, text: e.text, bpm: e.bpm, bars: e.bars, ...extra };
};

export const voice = <C extends Character>(character: C, reaction: Reaction<C>): AudioRef =>
  ref("voice", `${character}/${reaction}`, (VOICES[character] as Record<string, Entry> | undefined)?.[reaction], { character });

export const sfx = <K extends SfxCategory>(category: K, name: SfxName<K>): AudioRef =>
  ref("sfx", `${category}/${name}`, (SFX[category] as Record<string, Entry> | undefined)?.[name]);

export const music = (name: MusicName): AudioRef => ref("music", name, (MUSIC as Record<string, Entry>)[name]);

/** Length of one 4/4 bar of a music loop, in (fractional) frames. */
export const barFrames = (m: AudioRef, fps: number) => {
  if (!m.bpm) throw new Error(`audio library: "${m.id}" has no bpm, it is not a bar-aligned loop`);
  return (240 / m.bpm) * fps;
};

/**
 * Where the payoff hit sits inside each stinger, in seconds from the file start (measured from the waveform:
 * the last/loudest onset). Stingers build up to this point, so place them with `at = hitFrame - hit * fps`.
 */
export const STINGER_HIT: Partial<Record<MusicName, number>> = {
  stinger_twist: 3.45,
  stinger_win: 5.8,
};

/** Every file in the library (for existence checks). */
export const allAudio = (): AudioRef[] => [
  ...(Object.keys(VOICES) as Character[]).flatMap((c) => (Object.keys(VOICES[c]) as Reaction<typeof c>[]).map((r) => voice(c, r))),
  ...(Object.keys(SFX) as SfxCategory[]).flatMap((k) => (Object.keys(SFX[k]) as SfxName<typeof k>[]).map((n) => sfx(k, n))),
  ...(Object.keys(MUSIC) as MusicName[]).map(music),
];
