// DATA FIRST: every number the episode shows comes from a pure, seeded function in this file.
// The report prints these values and checks them against the numbers in the episode prompt.
// (Template example: each mascot "guesses" a number from a seeded draw. Replace with the episode's formula
// or simulation.)
import { seeded } from "../kit/random.ts";

export const SEED = 1;

/** Cast in screen order, left → right. */
export const ORDER = ["miyu", "anna", "lumi", "zuzu"] as const;
export type Member = (typeof ORDER)[number];

/** The one rounding rule for on-screen numbers in this episode. */
export const fmt = (x: number) => x.toFixed(1);

export const guesses = (): Record<Member, number> => {
  const r = seeded(SEED);
  return Object.fromEntries(ORDER.map((m) => [m, 1 + r() * 9])) as Record<
    Member,
    number
  >;
};
