// Big 3-2-1-GO numbers. Each step pops in and fades; the step marked `go` is yellow, tilted and lives longer.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, pop } from "../motion";
import { DUR, FONT, INK } from "../theme";

export type CountdownStep = { n: string; at: number; go?: boolean };

export const Countdown: React.FC<{
  steps: CountdownStep[];
  /** frames outside [from, to] draw nothing */
  from: number;
  to: number;
  top?: number;
}> = ({ steps, from, to, top = 520 }) => {
  const f = useCurrentFrame();
  const cur = [...steps].reverse().find((c) => f >= c.at);
  if (!cur || f > to || f < from) return null;
  const age = f - cur.at;
  const isGo = !!cur.go;
  const life = isGo ? 24 : 18;
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: isGo ? 190 : 300,
          lineHeight: 1,
          color: isGo ? "#ffd86b" : "#ffffff",
          WebkitTextStroke: `10px ${INK}`,
          paintOrder: "stroke fill",
          textShadow: `0 12px 0 ${INK}`,
          scale: interpolate(
            age,
            [0, DUR.standard, life - 4, life],
            [0.35, 1, 1, 0.75],
            { ...clamp, easing: pop },
          ),
          rotate: isGo
            ? `${interpolate(age, [0, DUR.standard], [-8, -3], clamp)}deg`
            : "0deg",
          opacity: interpolate(
            age,
            [0, 3, life - 4, life],
            [0, 1, 1, 0],
            clamp,
          ),
        }}
      >
        {cur.n}
      </div>
    </AbsoluteFill>
  );
};
