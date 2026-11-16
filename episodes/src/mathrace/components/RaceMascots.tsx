import React from "react";
import { useCurrentFrame } from "remotion";
import { activeCue, useRace } from "../context.tsx";
import { LANE, MASCOT } from "../layout.ts";
import { Mascot } from "./Mascot.tsx";

/** One <Mascot> per lane; pose/expression/symbol follow the episode's expression cues. */
export const RaceMascots: React.FC = () => {
  const frame = useCurrentFrame();
  const { ep, tl } = useRace();
  return (
    <>
      {([0, 1] as const).map((lane) => {
        const cues = ep.expressions.filter((c) => c.lane === lane);
        const a = activeCue(tl, cues, frame);
        const cue = a?.cue ?? cues[0];
        return (
          <Mascot
            key={lane}
            name={ep.race.lanes[lane].character}
            pose={cue.pose}
            expression={cue.expression}
            symbol={cue.symbol}
            changeFrame={a && a.from > 0 ? a.from : 6 + lane * 4}
            enterFrame={6 + lane * 4}
            x={LANE.cx(lane)}
            feetY={MASCOT.feetY}
            scale={MASCOT.scale}
            preload={cues.map((c) => ({ pose: c.pose, expression: c.expression }))}
          />
        );
      })}
    </>
  );
};
