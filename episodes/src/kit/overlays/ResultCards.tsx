// Ranked result cards. Each item pops in at `popAt` (pop the worst first so #1 lands last), counts its big
// number up to the exact final value, and leaves at `outAt`. Positions come from the episode (usually a
// projected 3D anchor above the mascot).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { countUp } from "../CountUp";
import { clamp, exitE, pop } from "../motion";
import { DUR, FONT, INK, INK_SOFT, PAPER } from "../theme";

export type ResultItem = {
  key: string;
  /** 1 = winner (slightly bigger) */
  rank: number;
  name: string;
  /** second line under the name (e.g. the planet / condition) */
  sub?: string;
  color: string;
  /** counted-up headline number */
  value?: { to: number; format: (x: number) => string; unit?: string };
  /** small lines under the number, already formatted */
  lines?: string[];
  x: number;
  y: number;
  /** resting tilt in degrees */
  tilt?: number;
  popAt: number;
  outAt: number;
};

export const ResultCards: React.FC<{ items: ResultItem[]; width?: number }> = ({
  items,
  width = 232,
}) => {
  const f = useCurrentFrame();
  return (
    <>
      {items.map((it) => {
        const age = f - it.popAt;
        if (age < 0) return null;
        const first = it.rank === 1;
        const out = it.outAt;
        return (
          <div
            key={it.key}
            style={{
              position: "absolute",
              left: it.x,
              top: it.y,
              width,
              translate: "-50% -50%",
              scale: `${interpolate(age, [0, DUR.standard], [0.3, first ? 1.08 : 1], { ...clamp, easing: pop }) * interpolate(f, [out, out + 8], [1, 0.4], { ...clamp, easing: exitE })}`,
              rotate: `${interpolate(age, [0, DUR.standard], [-10, it.tilt ?? 0], { ...clamp, easing: pop })}deg`,
              opacity: interpolate(
                f,
                [it.popAt, it.popAt + 3, out, out + 8],
                [0, 1, 1, 0],
                clamp,
              ),
              fontFamily: FONT,
              color: INK,
            }}
          >
            <div
              style={{
                background: PAPER,
                border: `5px solid ${INK}`,
                boxShadow: `0 8px 0 ${INK}`,
                borderRadius: 30,
                padding: "40px 10px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -38,
                  left: "50%",
                  translate: "-50% 0",
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  background: it.color,
                  border: `5px solid ${INK}`,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                #{it.rank}
              </div>
              <div style={{ fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>
                {it.name}
              </div>
              {it.sub ? (
                <div style={{ fontWeight: 600, fontSize: 22, color: INK_SOFT }}>
                  {it.sub}
                </div>
              ) : null}
              {it.value ? (
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 54,
                    lineHeight: 1.15,
                    color: it.color,
                    fontVariantNumeric: "tabular-nums",
                    WebkitTextStroke: `1.5px ${INK}`,
                  }}
                >
                  {it.value.format(countUp(age, [2, 20], it.value.to))}
                  {it.value.unit ? (
                    <span style={{ fontSize: 30 }}> {it.value.unit}</span>
                  ) : null}
                </div>
              ) : null}
              {(it.lines ?? []).map((l) => (
                <div
                  key={l}
                  style={{
                    fontWeight: 600,
                    fontSize: 24,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};
