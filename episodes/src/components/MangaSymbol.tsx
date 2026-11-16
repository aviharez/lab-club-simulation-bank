import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, INK as TEXT_INK } from "../kit/theme";

export type SymbolKind =
  | "sweat"
  | "exclaim"
  | "sparkle"
  | "spiral"
  | "zzz"
  | "question"
  | "anger"
  | "heart"
  | "music_note"
  | "none";
export const SYMBOL_KINDS: SymbolKind[] = [
  "sweat",
  "exclaim",
  "sparkle",
  "spiral",
  "zzz",
  "question",
  "anger",
  "heart",
  "music_note",
];

const INK = "#2b2118";

/** Sleeping Z's: three letters rising and fading on a 60-frame loop. Drawn with the house font, not SVG. */
const Zzz: React.FC<{ x: number; y: number; size: number; age: number }> = ({
  x,
  y,
  size,
  age,
}) => (
  <>
    {[0, 1, 2].map((k) => {
      const t = ((age + k * 20) % 60) / 60;
      return (
        <div
          key={k}
          style={{
            position: "absolute",
            left: x + t * size * 0.7,
            top: y - t * size * 1.3,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: size * (0.45 + 0.25 * t),
            color: "#d9c6ff",
            WebkitTextStroke: `${Math.max(3, size * 0.06)}px ${TEXT_INK}`,
            paintOrder: "stroke fill",
            rotate: `${-12 + t * 18}deg`,
            opacity:
              Math.min(1, age / 6) *
              interpolate(t, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
            translate: "-50% -50%",
          }}
        >
          Z
        </div>
      );
    })}
  </>
);

/**
 * Manga symbols. (x, y) is the symbol center in parent px; `from` is the frame it appears.
 * Kinds: sweat, exclaim, sparkle, spiral (dizzy), zzz (asleep), question, anger (vein), heart, music_note.
 */
export const MangaSymbol: React.FC<{
  kind: SymbolKind;
  x: number;
  y: number;
  size: number;
  from: number;
}> = ({ kind, x, y, size, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const age = frame - from;
  if (kind === "none" || age < 0) return null;
  if (kind === "zzz") return <Zzz x={x} y={y} size={size} age={age} />;
  const pop = spring({
    frame: age,
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  let body: React.ReactNode = null;
  if (kind === "sweat") {
    const loop = (age % 45) / 45;
    body = (
      <g
        style={{
          translate: `0px ${loop * 26}px`,
          opacity: loop > 0.8 ? (1 - loop) * 5 : 1,
        }}
      >
        <path
          d="M50 8 C 50 8, 80 48, 80 64 A 30 30 0 0 1 20 64 C 20 48, 50 8, 50 8 Z"
          fill="#9fdcff"
          stroke="#2a6fa0"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <ellipse cx={38} cy={62} rx={6} ry={10} fill="#ffffff" opacity={0.85} />
      </g>
    );
  } else if (kind === "exclaim") {
    const shake = Math.sin(age * 1.7) * (age < 20 ? 6 : 1.5);
    body = (
      <g style={{ rotate: `${shake}deg`, transformOrigin: "50px 50px" }}>
        {[
          [28, -10],
          [66, 10],
        ].map(([cx, rot], i) => (
          <g key={i} transform={`rotate(${rot} ${cx} 50)`}>
            <rect
              x={cx - 9}
              y={6}
              width={18}
              height={58}
              rx={9}
              fill="#ff4d4d"
              stroke={INK}
              strokeWidth={5}
            />
            <circle
              cx={cx}
              cy={84}
              r={10}
              fill="#ff4d4d"
              stroke={INK}
              strokeWidth={5}
            />
          </g>
        ))}
      </g>
    );
  } else if (kind === "sparkle") {
    const star = (cx: number, cy: number, r: number, phase: number) => {
      const s = 0.55 + 0.45 * Math.abs(Math.sin((age + phase) / 7));
      const rr = r * s;
      const k = rr * 0.22;
      return (
        <path
          key={phase}
          d={`M ${cx} ${cy - rr} Q ${cx + k} ${cy - k} ${cx + rr} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + rr} Q ${cx - k} ${cy + k} ${cx - rr} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - rr} Z`}
          fill="#ffd23f"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      );
    };
    body = (
      <>
        {star(50, 46, 34, 0)}
        {star(16, 14, 16, 9)}
        {star(86, 82, 14, 17)}
      </>
    );
  } else if (kind === "spiral") {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = i * 0.32;
      const r = 3 + i * 0.68;
      pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`);
    }
    body = (
      <g style={{ rotate: `${age * 14}deg`, transformOrigin: "50px 50px" }}>
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#8a5cf6"
          strokeWidth={7}
          strokeLinecap="round"
        />
      </g>
    );
  } else if (kind === "question") {
    // a "?" that tilts back and forth, with a little bounce on the beat
    const tilt = Math.sin(age / 8) * 10;
    const hop = Math.abs(Math.sin(age / 8)) * -4;
    body = (
      <g
        style={{
          rotate: `${tilt}deg`,
          translate: `0px ${hop}px`,
          transformOrigin: "50px 90px",
        }}
      >
        <path
          d="M30 34 C 30 14, 70 10, 72 32 C 74 50, 52 52, 52 66"
          fill="none"
          stroke={INK}
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 34 C 30 14, 70 10, 72 32 C 74 50, 52 52, 52 66"
          fill="none"
          stroke="#7fc4ff"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={52}
          cy={88}
          r={10}
          fill="#7fc4ff"
          stroke={INK}
          strokeWidth={5}
        />
      </g>
    );
  } else if (kind === "anger") {
    // the cross-shaped "vein" mark, throbbing
    const throb = 1 + 0.12 * Math.max(0, Math.sin(age / 4));
    const arc = (rot: number) => (
      <path
        key={rot}
        transform={`rotate(${rot} 50 50)`}
        d="M 18 40 Q 40 40 40 18"
        fill="none"
        stroke="#ff3b3b"
        strokeWidth={11}
        strokeLinecap="round"
      />
    );
    body = (
      <g style={{ scale: `${throb}`, transformOrigin: "50px 50px" }}>
        <g stroke={INK}>
          {[0, 90, 180, 270].map((r) => (
            <path
              key={r}
              transform={`rotate(${r} 50 50)`}
              d="M 18 40 Q 40 40 40 18"
              fill="none"
              strokeWidth={19}
              strokeLinecap="round"
            />
          ))}
        </g>
        {[0, 90, 180, 270].map(arc)}
      </g>
    );
  } else if (kind === "heart") {
    // two hearts floating up on a loop, the big one beating
    const beat = 1 + 0.1 * Math.max(0, Math.sin(age / 5));
    const heart = (cx: number, cy: number, s: number, key: number, op = 1) => (
      <path
        key={key}
        transform={`translate(${cx} ${cy}) scale(${s}) translate(-50 -50)`}
        d="M50 86 C 18 64, 8 46, 18 30 C 28 14, 46 20, 50 34 C 54 20, 72 14, 82 30 C 92 46, 82 64, 50 86 Z"
        fill="#ff7aa8"
        stroke={INK}
        strokeWidth={6}
        strokeLinejoin="round"
        opacity={op}
      />
    );
    const t = (age % 50) / 50;
    body = (
      <>
        {heart(46, 54, 0.82 * beat, 0)}
        {heart(
          84 + t * 6,
          30 - t * 30,
          0.36,
          1,
          interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
        )}
      </>
    );
  } else if (kind === "music_note") {
    // eighth notes bobbing side to side (humming, singing, happy)
    const note = (cx: number, cy: number, s: number, phase: number) => {
      const sway = Math.sin((age + phase) / 7) * 6;
      return (
        <g key={phase} transform={`translate(${cx + sway} ${cy}) scale(${s})`}>
          <path
            d="M 12 -38 L 12 10"
            stroke={INK}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <path
            d="M 12 -38 Q 30 -30 30 -14"
            fill="none"
            stroke={INK}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <ellipse
            cx={0}
            cy={12}
            rx={14}
            ry={10}
            fill="#ffcf4d"
            stroke={INK}
            strokeWidth={5}
            transform="rotate(-20 0 12)"
          />
        </g>
      );
    };
    body = (
      <>
        {note(34, 60, 1, 0)}
        {note(74, 38, 0.7, 11)}
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      overflow="visible"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        scale: `${pop}`,
        opacity: Math.min(1, age / 4),
      }}
    >
      {body}
    </svg>
  );
};
