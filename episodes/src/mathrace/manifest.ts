// Typed access to mascots/manifest.json (synced into public/mascots by `npm run sync-mascots`).
import { staticFile } from "remotion";
import manifest from "../../public/mascots/manifest.json";

export type CharacterInfo = {
  name: string;
  signature_color: string;
  sprite_pattern: string;
  sprite_size: [number, number];
  feet_baseline_y: number;
  bbox: [number, number, number, number];
  face_center_x: number;
  face_center_y: number;
  eye_left: [number, number];
  eye_right: [number, number];
  mouth: [number, number];
  expressions: string[];
  poses: string[];
};

export const character = (name: string): CharacterInfo => {
  const c = (manifest.characters as unknown as Record<string, CharacterInfo>)[name];
  if (!c) throw new Error(`Unknown mascot "${name}" in manifest.json`);
  return c;
};

export const spriteSrc = (name: string, pose: string, expression: string) => {
  const c = character(name);
  if (!c.expressions.includes(expression)) throw new Error(`${name} has no expression ${expression}`);
  const rel = c.sprite_pattern.replace("{pose}", pose).replace("{expression}", expression);
  return staticFile(`mascots/${rel}`);
};

export const laneColor = (name: string) => character(name).signature_color;

/** Mix a hex color with white (t=0 → color, t=1 → white). */
export const tint = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${ch.join(",")})`;
};

/** Mix a hex color with black (t=0 → color, t=1 → black). */
export const shade = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - t)));
  return `rgb(${ch.join(",")})`;
};
