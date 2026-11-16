"use client";

import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

// Local edits to the remocn original:
// - split on spaces (the shipped version split per character),
// - fontFamily / renderWord / maxWidth / lineHeight props, and wrapping for multi-line copy.

export interface SpringScaleInProps {
  text: string;
  staggerDelay?: number;
  scaleFrom?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  speed?: number;
  className?: string;
  fontFamily?: string;
  maxWidth?: number;
  lineHeight?: number;
  /** Custom rendering of a word (e.g. to typeset superscripts). */
  renderWord?: (word: string) => React.ReactNode;
}

export function SpringScaleIn({
  text,
  staggerDelay = 3,
  scaleFrom = 0.7,
  fontSize = 72,
  color = "#171717",
  fontWeight = 600,
  speed = 1,
  className,
  fontFamily = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
  maxWidth,
  lineHeight = 1.15,
  renderWord,
}: SpringScaleInProps) {
  const frame = useCurrentFrame() * speed;

  const words = text.split(" ");
  const wordDurationFrames = 11;
  const easing = Easing.bezier(0.34, 1.56, 0.64, 1);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color,
          letterSpacing: "-0.01em",
          fontFamily,
          maxWidth,
          lineHeight,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: "0.25em",
          textAlign: "center",
        }}
      >
        {words.map((word, i) => {
          const local = frame - i * staggerDelay;
          const opacity = interpolate(local, [0, wordDurationFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing,
          });
          const scale = interpolate(local, [0, wordDurationFrames], [scaleFrom, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing,
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transformOrigin: "50%",
                opacity,
                scale: `${scale}`,
                whiteSpace: "nowrap",
              }}
            >
              {renderWord ? renderWord(word) : word}
            </span>
          );
        })}
      </span>
    </div>
  );
}
