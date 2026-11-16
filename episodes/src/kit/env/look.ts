// Per-set look preset: everything that defines how a set is lit and graded, as plain data.
// A set exports one LookPreset; <SetStage look={...}> turns it into lights, fog and the post chain.
// Environment quality bar (CLAUDE.md): key + fill + rim, practicals in frame, soft shadows, haze where it fits,
// and a background slightly lower in contrast/saturation than the mascots (rim lights separate them).

export type Vec3 = [number, number, number];

export type LightSpec = { position: Vec3; color: string; intensity: number };

export type ShadowSpec = {
  mapSize?: number;
  /** PCF blur radius (soft shadows) */
  radius?: number;
  bias?: number;
  normalBias?: number;
  /** orthographic shadow camera: [left, right, top, bottom] */
  area?: [number, number, number, number];
  far?: number;
};

export type GradeSettings = {
  /** shadows offset per channel (0 = none), e.g. [0.01, 0, 0.025] for cool shadows */
  lift?: Vec3;
  /** midtones power per channel (1 = none) */
  gamma?: Vec3;
  /** highlights multiplier per channel (1 = none) */
  gain?: Vec3;
  /** S-curve amount 0..1 (0 = linear) */
  contrast?: number;
  /** 1 = unchanged */
  saturation?: number;
};

export type LookPreset = {
  name: string;
  background: string;
  toneMapping: "aces" | "neutral" | "agx";
  /** pre-tonemap exposure multiplier (1 = none) */
  exposure: number;
  /** exponential haze (density per metre) or linear fog */
  fog?: { color: string; density: number } | { color: string; near: number; far: number };
  lights: {
    hemisphere?: { sky: string; ground: string; intensity: number };
    ambient?: { color: string; intensity: number };
    key: LightSpec & { shadow?: ShadowSpec };
    fill?: LightSpec[];
    rim?: LightSpec[];
  };
  post: {
    ao?: { radius: number; intensity: number; color: string; falloff?: number } | false;
    bloom?: { threshold: number; intensity: number; radius?: number; smoothing?: number } | false;
    grade?: GradeSettings | false;
    vignette?: { offset: number; darkness: number } | false;
  };
  contactShadows?: { position: Vec3; scale: [number, number]; opacity: number; blur: number; far: number; color: string } | false;
};

/** Shallow-merge helper for per-episode tweaks of a set's look: tweakLook(LOOK, { exposure: 1.1 }). */
export const tweakLook = (base: LookPreset, over: Partial<LookPreset>): LookPreset => ({
  ...base,
  ...over,
  lights: { ...base.lights, ...(over.lights ?? {}) },
  post: { ...base.post, ...(over.post ?? {}) },
});
