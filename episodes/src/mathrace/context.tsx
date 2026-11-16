import React, { createContext, useContext } from "react";
import type { Episode } from "./episode.ts";
import { resolveTrigger, simulateRace, type RaceTimeline, type Trigger } from "./sim.ts";

// The simulation runs once per episode and is cached; components only read from it.
const cache = new Map<string, RaceTimeline>();
export const getTimeline = (ep: Episode) => {
  let tl = cache.get(ep.id);
  if (!tl) {
    tl = simulateRace(ep.race);
    cache.set(ep.id, tl);
  }
  return tl;
};

type RaceCtx = { ep: Episode; tl: RaceTimeline };
const Ctx = createContext<RaceCtx | null>(null);

export const RaceProvider: React.FC<{ ep: Episode; children: React.ReactNode }> = ({ ep, children }) => (
  <Ctx.Provider value={{ ep, tl: getTimeline(ep) }}>{children}</Ctx.Provider>
);

export const useRace = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRace() outside <RaceProvider>");
  return v;
};

/** Given cues with triggers, return the active cue at `frame` and the frame it started. */
export const activeCue = <T extends { trigger: Trigger }>(tl: RaceTimeline, cues: T[], frame: number) => {
  let best: { cue: T; from: number; index: number } | null = null;
  cues.forEach((cue, index) => {
    const from = resolveTrigger(tl, cue.trigger);
    if (from <= frame && (!best || from >= best.from)) best = { cue, from, index };
  });
  return best as { cue: T; from: number; index: number } | null;
};

/** All cues resolved to frames, sorted, with the frame the next one starts. */
export const cueSpans = <T extends { trigger: Trigger }>(tl: RaceTimeline, cues: T[], end: number) => {
  const sorted = cues
    .map((cue) => ({ cue, from: resolveTrigger(tl, cue.trigger) }))
    .filter((c) => Number.isFinite(c.from))
    .sort((a, b) => a.from - b.from);
  return sorted.map((c, i) => ({ ...c, to: i + 1 < sorted.length ? sorted[i + 1].from : end }));
};
