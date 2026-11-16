// Pure projectile physics for "Same Jump, Different Planets". No React, no randomness.
// Every number shown on screen (heights, airtimes, live readouts, chart curves) comes from here.

/**
 * Takeoff speed, identical for every mascot (m/s). Shown on screen rounded to 3.13 m/s.
 * 3.133 is inside the band (3.131–3.135) where h = v²/2g and T = 2v/g round to the brief's table
 * for all four planets (Moon 3.03 m / 3.87 s …); exactly 3.130 would give Moon 3.02 m / 3.86 s.
 */
export const V0 = 3.133;
/** Takeoff speed as displayed. */
export const V0_LABEL = V0.toFixed(2);

/** The one rounding rule for every on-screen number: 2 decimals (m for heights, s for airtimes). */
export const fmt2 = (x: number) => x.toFixed(2);

export type PlanetId = "moon" | "mars" | "earth" | "jupiter";

export type Planet = {
  id: PlanetId;
  name: string;
  /** surface gravity, m/s² */
  g: number;
  mascot: "miyu" | "anna" | "lumi" | "zuzu";
};

/** Left-to-right order of the gravity chambers. */
export const PLANETS: Planet[] = [
  { id: "moon", name: "Moon", g: 1.62, mascot: "miyu" },
  { id: "mars", name: "Mars", g: 3.71, mascot: "anna" },
  { id: "earth", name: "Earth", g: 9.81, mascot: "lumi" },
  { id: "jupiter", name: "Jupiter", g: 24.79, mascot: "zuzu" },
];

/** Apex height h = v² / (2g), metres. */
export const peakHeight = (g: number, v = V0) => (v * v) / (2 * g);
/** Time in the air T = 2v / g, seconds. */
export const airtime = (g: number, v = V0) => (2 * v) / g;
/** Time to apex v / g, seconds. */
export const timeToPeak = (g: number, v = V0) => v / g;

/** Feet height above the floor t seconds after takeoff (0 before takeoff and after landing). */
export const heightAt = (g: number, t: number, v = V0) => {
  if (t <= 0) return 0;
  if (t >= airtime(g, v)) return 0;
  return v * t - 0.5 * g * t * t;
};

/** Vertical velocity (m/s, + = up) while airborne. */
export const velocityAt = (g: number, t: number, v = V0) => (t <= 0 || t >= airtime(g, v) ? 0 : v - g * t);

export type PhysicsRow = { planet: string; mascot: string; g: number; height: number; airtime: number; tPeak: number };

export const physicsTable = (): PhysicsRow[] =>
  PLANETS.map((p) => ({
    planet: p.name,
    mascot: p.mascot,
    g: p.g,
    height: peakHeight(p.g),
    airtime: airtime(p.g),
    tPeak: timeToPeak(p.g),
  }));

/** Planets ranked by jump height, highest first. */
export const ranked = () => [...PLANETS].sort((a, b) => peakHeight(b.g) - peakHeight(a.g));
