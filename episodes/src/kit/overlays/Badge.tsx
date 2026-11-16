// Honesty badge for simplifications ("2x SLOW-MO", "no friction", "simplified air drag").
// Slides in from the right at `from`, shrinks away after `to`.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, exitE, move } from "../motion";
import { DUR, FONT, INK, SAFE } from "../theme";

export type BadgeIcon = "slowmo" | "info" | "none";

export const Badge: React.FC<{
  text: string;
  from: number;
  to: number;
  icon?: BadgeIcon;
  /** blinking red "recording" dot */
  dot?: boolean;
  top?: number;
  right?: number;
}> = ({
  text,
  from: a,
  to: b,
  icon = "none",
  dot = false,
  top = SAFE.top + 140,
  right = 50,
}) => {
  const f = useCurrentFrame();
  if (f < a || f > b + 10) return null;
  const blink = 0.55 + 0.45 * Math.cos(((f - a) / 30) * Math.PI * 2);
  return (
    <div
      style={{
        position: "absolute",
        right,
        top,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: `12px 26px 12px ${dot || icon !== "none" ? 20 : 26}px`,
        borderRadius: 999,
        background: INK,
        color: "#fff",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: 1,
        translate: interpolate(
          f,
          [a, a + DUR.standard],
          ["220px 0px", "0px 0px"],
          { ...clamp, easing: move },
        ),
        scale: interpolate(f, [b, b + 10], [1, 0.7], {
          ...clamp,
          easing: exitE,
        }),
        opacity: interpolate(f, [a, a + 4, b, b + 10], [0, 1, 1, 0], clamp),
      }}
    >
      {dot ? (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: "#ff7a8a",
            opacity: blink,
          }}
        />
      ) : null}
      {icon === "slowmo" ? (
        <svg width={40} height={26} viewBox="0 0 40 26">
          <path d="M2 2 L18 13 L2 24 Z M20 2 L36 13 L20 24 Z" fill="#ffd86b" />
        </svg>
      ) : icon === "info" ? (
        <svg width={30} height={30} viewBox="0 0 30 30">
          <circle cx={15} cy={15} r={13} fill="#ffd86b" />
          <rect x={13} y={12} width={4} height={11} rx={2} fill={INK} />
          <circle cx={15} cy={8} r={2.4} fill={INK} />
        </svg>
      ) : null}
      {text}
    </div>
  );
};
