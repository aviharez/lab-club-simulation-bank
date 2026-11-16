// The reveal card Lumi delivers (her 3D acting does the `glint`; this is the 2D card). Put it in a
// <Sequence>: it reads its length from the Sequence and animates in/out inside it.
//   title (springs in) → lines (the big statement, may use <Mark>) → formula (small, honest numbers) → small note
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { clamp, exitE, move, pop } from "../motion";
import { DUR, FONT, INK, INK_SOFT, PAPER, SAFE } from "../theme";

/** Highlighter mark for a word or number inside RevealCard lines. */
export const Mark: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => (
  <span style={{ background: color, padding: "0 14px", borderRadius: 16 }}>
    {children}
  </span>
);

export const RevealCard: React.FC<{
  title: string;
  lines: React.ReactNode;
  /** small tabular line under the statement, e.g. the formula with the real numbers */
  formula?: string;
  /** footnote under a dashed rule, e.g. a simplification ("Real Jupiter has no ground.") */
  small?: { text: string; dot?: string };
  top?: number;
}> = ({ title, lines, formula, small, top = SAFE.top + 140 }) => {
  const frame = useCurrentFrame(); // local to its Sequence
  const { durationInFrames: len } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top,
          width: 960,
          padding: "30px 34px 28px",
          borderRadius: 40,
          background: PAPER,
          border: `6px solid ${INK}`,
          boxShadow: `0 10px 0 ${INK}`,
          fontFamily: FONT,
          color: INK,
          textAlign: "center",
          translate: interpolate(
            frame,
            [0, DUR.slow, len - 8, len],
            ["0px 70px", "0px 0px", "0px 0px", "0px -50px"],
            { ...clamp, easing: frame < len - 8 ? move : exitE },
          ),
          scale: interpolate(frame, [0, DUR.slow], [0.9, 1], {
            ...clamp,
            easing: pop,
          }),
          opacity: interpolate(
            frame,
            [0, 5, len - 8, len],
            [0, 1, 1, 0],
            clamp,
          ),
        }}
      >
        <div style={{ position: "relative", height: 76 }}>
          <SpringScaleIn
            text={title}
            fontFamily={FONT}
            fontSize={56}
            fontWeight={700}
            color={INK}
            staggerDelay={3}
          />
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.12,
            scale: interpolate(frame, [16, 16 + DUR.standard], [0.6, 1], {
              ...clamp,
              easing: pop,
            }),
            opacity: interpolate(frame, [16, 20], [0, 1], clamp),
          }}
        >
          {lines}
        </div>
        {formula ? (
          <div
            style={{
              marginTop: 20,
              fontSize: 30,
              fontWeight: 600,
              color: INK_SOFT,
              fontVariantNumeric: "tabular-nums",
              translate: interpolate(
                frame,
                [34, 34 + DUR.standard],
                ["0px 16px", "0px 0px"],
                { ...clamp, easing: move },
              ),
              opacity: interpolate(frame, [34, 40], [0, 1], clamp),
            }}
          >
            {formula}
          </div>
        ) : null}
        {small ? (
          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: `3px dashed #e6d9c8`,
              fontSize: 30,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              translate: interpolate(
                frame,
                [70, 70 + DUR.standard],
                ["0px 16px", "0px 0px"],
                { ...clamp, easing: move },
              ),
              opacity: interpolate(frame, [70, 76], [0, 1], clamp),
            }}
          >
            {small.dot ? (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: small.dot,
                  border: `3px solid ${INK}`,
                  display: "inline-block",
                }}
              />
            ) : null}
            {small.text}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
