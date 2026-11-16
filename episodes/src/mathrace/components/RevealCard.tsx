import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { useRace } from "../context.tsx";
import { character } from "../manifest.ts";
import { FONT, INK, INK_SOFT, MathText, renderMathWord } from "../theme.tsx";
import { Background } from "./Effects.tsx";
import { Mascot } from "./Mascot.tsx";
import { MangaSymbol } from "./MangaSymbol.tsx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Ending card: host mascot + the takeaway + call to action. Frame 0 = start of this scene. */
export const RevealCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ep, tl } = useRace();
  const e = ep.ending;
  const host = character(e.character);
  const scale = 0.82;
  const feetY = 1000;
  const sub = spring({ frame: frame - 2.0 * fps, fps, config: { damping: 200 } });
  const cta = spring({ frame: frame - 3.4 * fps, fps, config: { damping: 10, stiffness: 160 } });
  const [ex, ey] = host.eye_right;
  const eyeX = 540 + (ex - host.face_center_x) * scale;
  const eyeY = feetY - (host.feet_baseline_y - ey) * scale;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background />
      <Mascot name={e.character} pose={e.pose} expression={e.expression} changeFrame={8} enterFrame={4} x={540} feetY={feetY} scale={scale} />
      {/* the "glint": a sparkle on the host's eye from manifest eye coordinates */}
      <MangaSymbol kind="sparkle" x={eyeX + 18} y={eyeY - 14} size={120} from={14} />

      <div style={{ position: "absolute", left: 80, width: 920, top: 1020, height: 270 }}>
        <SpringScaleIn
          text={e.headline}
          fontFamily={FONT}
          fontSize={72}
          fontWeight={700}
          color={INK}
          staggerDelay={4}
          maxWidth={900}
          renderWord={renderMathWord}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: 1316,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 50,
          color: INK_SOFT,
          opacity: sub,
          translate: `0px ${(1 - sub) * 30}px`,
        }}
      >
        <MathText text={e.subline(tl)} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 70,
          width: 940,
          top: 1440,
          height: 120,
          borderRadius: 60,
          background: "#ffffff",
          border: `4px solid ${INK}`,
          boxShadow: `0 6px 0 ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 44,
          color: INK,
          scale: `${cta}`,
          opacity: interpolate(frame, [3.4 * fps, 3.4 * fps + 4], [0, 1], clamp),
        }}
      >
        {e.cta}
      </div>
    </div>
  );
};
