// DATA FIRST (EP04 "Three Doors"): every number the episode shows comes from this seeded simulation.
// The report (npm run report:three-doors) prints it and checks it against the episode prompt.
//
// Monty Hall, played for real:
//   1. the trophy is behind a uniformly random door (the other two hide rubber ducks)
//   2. the player picks a uniformly random door
//   3. the host (Lumi) opens a door that is neither the player's pick nor the trophy
//      (if the player picked the trophy, Lumi chooses between the two ducks at random)
//   4. Anna always STAYS with her pick; Miyu always SWITCHES to the last closed door
// Each player plays ROUNDS rounds from her own seeded stream. Round 1 of each stream is the slow round shown in full.
import { seeded } from "../kit/random.ts";

/** Cast in screen order, left → right (Zuzu on the side, Anna + Miyu at the doors, Lumi at her host podium). */
export const ORDER = ["zuzu", "anna", "miyu", "lumi"] as const;
export type Member = (typeof ORDER)[number];

export const ROUNDS = 1000;
export const DOORS = [0, 1, 2] as const;
export type Door = 0 | 1 | 2;

export type Strategy = "stay" | "switch";
export type Player = "anna" | "miyu";
export const PLAYERS: Player[] = ["anna", "miyu"];
export const STRATEGY: Record<Player, Strategy> = { anna: "stay", miyu: "switch" };

/** One seed per player's stream (chosen once, never tuned to the counts; see SEED_NOTE). */
export const SEEDS: Record<Player, number> = { anna: 4004, miyu: 4005 };
export const SEED_NOTE = "fixed seeds 4004 (Anna) and 4005 (Miyu); round 1 of each stream is the slow round on screen";

export type Round = {
  /** 1-based round number */
  n: number;
  prize: Door;
  pick: Door;
  /** the door Lumi opens: never the pick, never the prize */
  opened: Door;
  /** the door the player ends on */
  final: Door;
  win: boolean;
};

const door = (r: () => number) => Math.min(2, Math.floor(r() * 3)) as Door;
const other = (a: Door, b: Door) => (3 - a - b) as Door;

/** Play one round with a given strategy (three draws per round: prize, pick, host's coin). */
const playRound = (r: () => number, n: number, strategy: Strategy): Round => {
  const prize = door(r);
  const pick = door(r);
  const coin = r();
  let opened: Door;
  if (pick === prize) {
    // two ducks to choose from: Lumi picks either with equal chance
    const ducks = DOORS.filter((d) => d !== pick) as Door[];
    opened = ducks[coin < 0.5 ? 0 : 1];
  } else opened = other(pick, prize);
  const final = strategy === "stay" ? pick : other(pick, opened);
  return { n, prize, pick, opened, final, win: final === prize };
};

/** Play all ROUNDS rounds of a player from her seed (pure, uncached). */
export const simulate = (p: Player): Round[] => {
  const r = seeded(SEEDS[p]);
  return Array.from({ length: ROUNDS }, (_, i) => playRound(r, i + 1, STRATEGY[p]));
};
const cache = new Map<Player, Round[]>();
/** All ROUNDS rounds of a player (cached simulate()). */
export const rounds = (p: Player): Round[] => {
  const hit = cache.get(p);
  if (hit) return hit;
  const out = simulate(p);
  cache.set(p, out);
  return out;
};

/** Wins after the first n rounds (n = 0..ROUNDS). */
const winsCache = new Map<Player, number[]>();
const cumulative = (p: Player) => {
  const hit = winsCache.get(p);
  if (hit) return hit;
  const c = [0];
  for (const rd of rounds(p)) c.push(c[c.length - 1] + (rd.win ? 1 : 0));
  winsCache.set(p, c);
  return c;
};
export const winsAfter = (p: Player, n: number) => cumulative(p)[Math.max(0, Math.min(ROUNDS, Math.floor(n)))];
/** Win rate (0..1) after n ≥ 1 rounds. */
export const rateAfter = (p: Player, n: number) => {
  const k = Math.max(1, Math.min(ROUNDS, Math.floor(n)));
  return winsAfter(p, k) / k;
};
export const totalWins = (p: Player) => winsAfter(p, ROUNDS);

/** The one rounding rule for on-screen rates in this episode (percent, one decimal). */
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
/** Expected win rates (exact): stay wins iff the first pick was right. */
export const EXPECTED: Record<Strategy, number> = { stay: 1 / 3, switch: 2 / 3 };

/** Door labels on the set: 1, 2, 3. */
export const doorLabel = (d: Door) => String(d + 1);
