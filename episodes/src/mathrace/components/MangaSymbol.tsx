import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SymbolKind } from "../episode.ts";
import { INK } from "../theme.tsx";

/**
 * Simple SVG manga symbols. (x, y) is the symbol center in parent px; `from` is the frame it appears.
 */
export const MangaSymbol: React.FC<{ kind: SymbolKind; x: number; y: number; size: number; from: number }> = ({
  kind,
  x,
  y,
  size,
  from,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const age = frame - from;
  if (kind === "none" || age < 0) return null;
  const pop = spring({ frame: age, fps, config: { damping: 10, stiffness: 180 } });

  let body: React.ReactNode = null;
  if (kind === "sweat") {
    const loop = (age % 45) / 45;
    body = (
      <g style={{ translate: `0px ${loop * 26}px`, opacity: loop > 0.8 ? (1 - loop) * 5 : 1 }}>
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
            <rect x={cx - 9} y={6} width={18} height={58} rx={9} fill="#ff4d4d" stroke={INK} strokeWidth={5} />
            <circle cx={cx} cy={84} r={10} fill="#ff4d4d" stroke={INK} strokeWidth={5} />
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
        <polyline points={pts.join(" ")} fill="none" stroke="#8a5cf6" strokeWidth={7} strokeLinecap="round" />
      </g>
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
