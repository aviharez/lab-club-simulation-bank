// Count-ups that always land EXACTLY on the final value (Series rule 3): the last frame returns `to` itself,
// not an interpolated float that rounds differently.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp } from "./motion";

export type CountUpOptions = { from?: number; easing?: (t: number) => number };

/** Value of a count-up at frame `f`, running over [start, end]. Returns exactly `to` from `end` on. */
export const countUp = (
  f: number,
  [start, end]: [number, number],
  to: number,
  { from = 0, easing = Easing.out(Easing.cubic) }: CountUpOptions = {},
) =>
  f >= end
    ? to
    : interpolate(f, [start, end], [from, to], { ...clamp, easing });

/** Text node of a count-up (use inside your own styled element). `format` is the episode's rounding rule. */
export const CountUp: React.FC<{
  to: number;
  start: number;
  end: number;
  format: (x: number) => string;
  from?: number;
  easing?: (t: number) => number;
  frame?: number;
}> = ({ to, start, end, format, from, easing, frame }) => {
  const current = useCurrentFrame();
  return (
    <>{format(countUp(frame ?? current, [start, end], to, { from, easing }))}</>
  );
};
