// Closing call-to-action card (a question for the comments). Put it in a <Sequence>.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, pop } from "../motion";
import { DUR, FONT, INK, SAFE } from "../theme";

export const CtaCard: React.FC<{
  text: string;
  button?: string;
  top?: number;
}> = ({ text, button = "Comment below!", top = SAFE.top + 150 }) => {
  const frame = useCurrentFrame(); // local to its Sequence
  const wob = Math.sin(frame / 9) * 1.5; // ambient breathing
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top,
          padding: "30px 50px 34px",
          borderRadius: 44,
          background: "#ffd86b",
          border: `6px solid ${INK}`,
          boxShadow: `0 10px 0 ${INK}`,
          fontFamily: FONT,
          color: INK,
          textAlign: "center",
          scale: interpolate(frame, [0, DUR.standard], [0.4, 1], {
            ...clamp,
            easing: pop,
          }),
          rotate: `${interpolate(frame, [0, DUR.standard], [-8, -2], { ...clamp, easing: pop }) + wob * 0.4}deg`,
          opacity: interpolate(frame, [0, 4], [0, 1], clamp),
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
          {text}
        </div>
        <div
          style={{
            marginTop: 16,
            display: "inline-block",
            padding: "8px 30px",
            borderRadius: 999,
            background: INK,
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
            scale: interpolate(frame, [12, 12 + DUR.standard], [0.5, 1], {
              ...clamp,
              easing: pop,
            }),
            opacity: interpolate(frame, [12, 16], [0, 1], clamp),
          }}
        >
          {button}
        </div>
      </div>
    </AbsoluteFill>
  );
};
