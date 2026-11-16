"use client";

import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const { fontFamily: MONO_FAMILY } = loadMono("normal", { weights: ["800"], subsets: ["latin"] });

export interface NumberWheelProps {
  from?: number;
  to?: number;
  fontSize?: number;
  color?: string;
  speed?: number;
}

export interface OdometerProps {
  current: number;
  fontSize: number;
  color: string;
}

const SPRING_FRAMES = 30;
const SPRING_CONFIG = { damping: 200, stiffness: 100, mass: 1 } as const;
const COUNT_PORTION = 0.8;

// Local edit: mechanical-odometer carry. A higher wheel only turns while the value
// passes through the last unit before a carry (e.g. 99 -> 100), so settled integers
// such as 4,096 always read exactly (the original rolled whenever the lower digits
// were above 90%, showing 4,096 as "4,1 96").
function rollFraction(current: number, place: number): number {
  const unit = 10 ** place;
  const rem = current - Math.floor(current / unit) * unit;
  if (rem <= unit - 1) return 0;
  return rem - (unit - 1);
}

function computeWheel(
  current: number,
  place: number,
  springEased: (t: number) => number,
): number {
  if (current <= 0) return 0;
  if (place === 0) return current % 10;

  const digit = Math.floor(current / 10 ** place) % 10;
  const t = rollFraction(current, place);
  if (t <= 0) return digit;
  return digit + springEased(t);
}

function placeOpacity(current: number, place: number): number {
  if (place === 0) return 1;
  const threshold = 10 ** place;
  return interpolate(current, [threshold * 0.9, threshold], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function DigitColumn({
  value,
  fontSize,
  opacity,
}: {
  value: number;
  fontSize: number;
  opacity: number;
}) {
  const cellHeight = fontSize * 1.1;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: cellHeight,
        width: "0.62em",
        verticalAlign: "top",
        textAlign: "center",
        opacity,
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          translate: `0 ${-value * cellHeight}px`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span
            key={i}
            style={{ height: cellHeight, lineHeight: `${cellHeight}px` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function OdometerColumns({
  current,
  templateValue,
  fontSize,
  color,
  fps,
}: {
  current: number;
  templateValue: number;
  fontSize: number;
  color: string;
  fps: number;
}) {
  const springAtEnd = spring({
    frame: SPRING_FRAMES,
    fps,
    config: SPRING_CONFIG,
  });
  const springEased = (t: number) =>
    spring({ frame: t * SPRING_FRAMES, fps, config: SPRING_CONFIG }) /
    springAtEnd;

  const template = templateValue.toLocaleString("en-US");

  const cells: React.ReactNode[] = [];
  let place = 0;
  for (let i = template.length - 1; i >= 0; i--) {
    const ch = template[i];
    if (ch === ",") {
      cells.unshift(
        <span
          key={`c${i}`}
          style={{
            display: "inline-block",
            width: "0.32em",
            color: "currentColor",
            fontSize: "0.85em",
            textAlign: "center",
            opacity: placeOpacity(current, place),
          }}
        >
          ,
        </span>,
      );
    } else {
      const wheel = computeWheel(current, place, springEased);
      cells.unshift(
        <DigitColumn
          key={`d${i}`}
          value={wheel}
          fontSize={fontSize}
          opacity={placeOpacity(current, place)}
        />,
      );
      place++;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontSize,
        fontWeight: 800,
        color,
        fontFamily: MONO_FAMILY,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}
    >
      {cells}
    </div>
  );
}

export function Odometer({ current, fontSize, color }: OdometerProps) {
  const { fps } = useVideoConfig();
  const value = Math.max(0, Math.round(current));
  return (
    <OdometerColumns
      current={current}
      templateValue={value}
      fontSize={fontSize}
      color={color}
      fps={fps}
    />
  );
}

export function NumberWheel({
  from = 0,
  to = 24813,
  fontSize = 120,
  color = "#171717",
  speed = 1,
}: NumberWheelProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const start = Math.max(0, Math.round(from));
  const end = Math.max(0, Math.round(to));

  const progress = interpolate(
    frame * speed,
    [0, durationInFrames * COUNT_PORTION],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.5, 1, 0.5, 1),
    },
  );
  const current = Math.max(0, start + progress * (end - start));
  const maxVal = Math.max(start, end);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OdometerColumns
        current={current}
        templateValue={maxVal}
        fontSize={fontSize}
        color={color}
        fps={fps}
      />
    </AbsoluteFill>
  );
}
