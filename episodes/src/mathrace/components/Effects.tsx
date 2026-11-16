import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { ShaderWarpCream } from "@/components/remocn/shader-warp-cream";
import { useRace } from "../context.tsx";
import { LANE } from "../layout.ts";
import { laneColor } from "../manifest.ts";
import { mulberry32 } from "../sim.ts";
import { FONT, INK, PAPER, renderMathWord } from "../theme.tsx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Soft flat paper background with a faint remocn warp-cream drift on top. */
export const Background: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: PAPER }}>
    <div style={{ position: "absolute", inset: 0, opacity: 0.14 }}>
      <ShaderWarpCream speed={0.5} />
    </div>
  </div>
);

/** Intro hook title over the lanes (remocn spring-scale-in), fades before round 1. */
export const HookTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { ep, tl } = useRace();
  const end = tl.introFrames;
  const opacity = interpolate(frame, [end - 12, end], [1, 0], clamp);
  if (frame >= end) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        width: 900,
        top: 960,
        height: 260,
        borderRadius: 40,
        background: "#ffffff",
        border: `4px solid ${INK}`,
        boxShadow: `0 8px 0 ${INK}`,
        opacity,
        scale: `${interpolate(frame, [0, 10], [0.9, 1], clamp)}`,
      }}
    >
      <SpringScaleIn
        text={ep.hookTitle}
        fontFamily={FONT}
        fontSize={92}
        fontWeight={700}
        color={INK}
        staggerDelay={5}
        maxWidth={820}
        renderWord={renderMathWord}
      />
    </div>
  );
};

/** "GO!" pop at the start of round 1. */
export const GoPop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tl } = useRace();
  const age = frame - tl.rounds[0].start;
  if (age < 0 || age > 24) return null;
  const s = spring({ frame: age, fps, config: { damping: 8, stiffness: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: 1040,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 160,
        color: INK,
        WebkitTextStroke: "10px #ffffff",
        paintOrder: "stroke",
        scale: `${s}`,
        opacity: interpolate(age, [16, 24], [1, 0], clamp),
      }}
    >
      GO!
    </div>
  );
};

/** Starburst behind the winner's lane at the overtake + FINISH stamp + confetti at the finish. */
export const RaceMoments: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ep, tl } = useRace();
  const win = tl.winner;
  const color = laneColor(ep.race.lanes[win].character);
  const cx = LANE.cx(win);

  const confetti = useMemo(() => {
    const rand = mulberry32(ep.race.seed + 7);
    const palette = [color, laneColor(ep.race.lanes[1 - win].character), "#80adf2", "#ffd23f", "#6ed3a3"];
    return Array.from({ length: 140 }, () => ({
      x: rand() * 1080,
      delay: rand() * 20,
      vy: 7 + rand() * 9,
      sway: 20 + rand() * 40,
      phase: rand() * 6.28,
      rot: rand() * 360,
      vr: (rand() - 0.5) * 20,
      w: 14 + rand() * 12,
      c: palette[Math.floor(rand() * palette.length)],
    }));
  }, [ep, color, win]);

  const ov = frame - tl.overtakeFrame;
  const fin = frame - tl.finishFrame;
  const stamp = spring({ frame: fin, fps, config: { damping: 9, stiffness: 180 } });

  return (
    <>
      {ov >= 0 && ov < 30 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2 + ov * 0.02;
            const len = interpolate(ov, [0, 10], [100, 900], clamp);
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * 80}
                y1={1100 + Math.sin(a) * 80}
                x2={cx + Math.cos(a) * len}
                y2={1100 + Math.sin(a) * len}
                stroke={color}
                strokeWidth={14}
                strokeLinecap="round"
                opacity={interpolate(ov, [0, 6, 30], [0, 0.6, 0], clamp)}
              />
            );
          })}
        </svg>
      )}
      {fin >= 0 && (
        <>
          <div
            style={{
              position: "absolute",
              left: LANE.x(win),
              width: LANE.width,
              top: LANE.bottom - 210,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 104,
              color: INK,
              WebkitTextStroke: "12px #ffffff",
              paintOrder: "stroke",
              rotate: "-7deg",
              scale: `${stamp}`,
            }}
          >
            FINISH!
          </div>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {confetti.map((p, i) => {
              const t = fin - p.delay;
              if (t < 0) return null;
              const y = -40 + p.vy * t;
              if (y > 1960) return null;
              const x = p.x + Math.sin(t / 8 + p.phase) * p.sway;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={p.w}
                  height={p.w * 0.55}
                  rx={3}
                  fill={p.c}
                  transform={`rotate(${p.rot + p.vr * t} ${x + p.w / 2} ${y})`}
                />
              );
            })}
          </svg>
        </>
      )}
    </>
  );
};

/** Small deterministic camera shake on big moments. */
export const useShake = () => {
  const frame = useCurrentFrame();
  const { tl } = useRace();
  let amp = 0;
  const kick = (at: number, strength: number, len: number) => {
    const age = frame - at;
    if (age >= 0 && age < len) amp = Math.max(amp, strength * (1 - age / len));
  };
  kick(tl.overtakeFrame, 10, 12);
  kick(tl.finishFrame, 16, 16);
  for (const r of tl.rounds) {
    for (const l of r.lanes) if (l.visibleBalls === 1 && l.power >= 1024) kick(l.hitStart, 3 + Math.log2(l.power) - 10, 8);
  }
  return `${Math.sin(frame * 2.3) * amp}px ${Math.cos(frame * 1.7) * amp}px`;
};
