// Value tags pinned to world points (a measured distance at a tape's end, a ring's radius). The episode supplies a
// projector (3D → screen px, from its camera function); each tag pops in at `from` and shrinks away after `to`.
// Tags stay inside the safe area: they are clamped to the frame minus the side margin, the top bar and the bottom panel.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, exitE, pop } from "../motion";
import { DUR, FONT, INK, PAPER, SAFE } from "../theme";
import type { Projector } from "./MangaSymbols";

export type WorldTag = {
  key: string;
  anchor: [number, number, number];
  text: string;
  sub?: string;
  color: string;
  from: number;
  to: number;
  /** screen offset from the projected anchor (px), e.g. to sit above a head */
  dy?: number;
};

export const WorldTags: React.FC<{ project: Projector; tags: WorldTag[]; bottom?: number; width?: number; height?: number }> = ({
  project,
  tags,
  bottom = SAFE.bottom,
  width = 1080,
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {tags.map((t) => {
        if (f < t.from || f > t.to + DUR.quick) return null;
        const q = project(t.anchor);
        if (!q.visible) return null;
        const s = f <= t.to ? interpolate(f - t.from, [0, DUR.standard], [0.3, 1], { ...clamp, easing: pop }) : interpolate(f - t.to, [0, DUR.quick], [1, 0], { ...clamp, easing: exitE });
        const x = Math.min(width - SAFE.side - 120, Math.max(SAFE.side + 120, q.x));
        const y = Math.min(bottom - 70, Math.max(SAFE.top + 60, q.y + (t.dy ?? 0)));
        return (
          <div
            key={t.key}
            style={{
              position: "absolute",
              left: x,
              top: y,
              translate: "-50% -50%",
              scale: String(s),
              opacity: Math.min(1, s * 2),
              padding: t.sub ? "8px 26px 10px" : "10px 26px",
              borderRadius: 26,
              background: PAPER,
              border: `5px solid ${INK}`,
              boxShadow: `0 6px 0 ${INK}`,
              fontFamily: FONT,
              color: INK,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: t.color, border: `3px solid ${INK}` }} />
              {t.text}
            </div>
            {t.sub ? <div style={{ fontSize: 28, fontWeight: 600, color: "#7a6a5c" }}>{t.sub}</div> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
