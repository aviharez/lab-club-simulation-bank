// Top caption pill per beat (+ optional slapped sticker, e.g. "Guess first!"). Text springs in letter by letter.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { clamp, move, pop } from "../motion";
import { DUR, FONT, INK, PAPER, SAFE } from "../theme";

export type Caption = {
  from: number;
  to: number;
  text: string;
  /** "big": yellow pill, 72 px (one-word shouts like "GO!") */
  variant?: "big";
  /** sticker slapped mid-screen at frame `at` (absolute) */
  sticker?: { text: string; at: number; top?: number; color?: string };
};

const CaptionPill: React.FC<{ c: Caption }> = ({ c }) => {
  const frame = useCurrentFrame(); // local to the caption's Sequence
  const len = c.to - c.from;
  const big = c.variant === "big";
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 50,
          width: 980,
          top: SAFE.top + 12,
          height: 108,
          borderRadius: 54,
          background: big ? "#ffd86b" : PAPER,
          border: `5px solid ${INK}`,
          boxShadow: `0 7px 0 ${INK}`,
          translate: interpolate(
            frame,
            [0, DUR.standard, len - DUR.quick, len],
            ["0px -26px", "0px 0px", "0px 0px", "0px -18px"],
            { ...clamp, easing: move },
          ),
          scale: interpolate(frame, [0, DUR.standard], [0.86, 1], {
            ...clamp,
            easing: pop,
          }),
          opacity: interpolate(
            frame,
            [0, 4, len - 5, len],
            [0, 1, 1, 0],
            clamp,
          ),
        }}
      >
        <SpringScaleIn
          text={c.text}
          fontFamily={FONT}
          fontSize={big ? 72 : c.text.length > 30 ? 46 : 52}
          fontWeight={700}
          color={INK}
          staggerDelay={2}
        />
      </div>
      {c.sticker ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: c.sticker.top ?? 640,
            translate: "-50% 0",
            padding: "10px 30px",
            borderRadius: 22,
            background: c.sticker.color ?? "#ff8fa8",
            border: `5px solid ${INK}`,
            boxShadow: `0 6px 0 ${INK}`,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 72,
            color: "#fff",
            rotate: "-6deg",
            // slap: anticipation (big), overshoot, settle
            scale: interpolate(
              frame - (c.sticker.at - c.from),
              [0, 5, 9, 13],
              [1.7, 0.92, 1.05, 1],
              { ...clamp, easing: Easing.out(Easing.quad) },
            ),
            opacity: interpolate(
              frame - (c.sticker.at - c.from),
              [0, 3],
              [0, 1],
              clamp,
            ),
          }}
        >
          {c.sticker.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** One pill per caption, each in its own named Sequence (visible in the Studio timeline). */
export const CaptionPills: React.FC<{ captions: Caption[] }> = ({
  captions,
}) => (
  <>
    {captions.map((c) => (
      <Sequence
        key={c.text}
        name={`Caption: ${c.text}`}
        from={c.from}
        durationInFrames={c.to - c.from}
        layout="none"
      >
        <CaptionPill c={c} />
      </Sequence>
    ))}
  </>
);
