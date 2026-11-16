import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useRace } from "../context.tsx";
import { drillY, frontY, LANE, PROGRESS, wallRect } from "../layout.ts";
import { laneColor, shade, tint } from "../manifest.ts";
import { damageAt, frontWall, mulberry32, roundAt, type RaceTimeline } from "../sim.ts";
import { FONT, INK, LINE } from "../theme.tsx";

const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SHATTER_FRAMES = 24;
const WALL_INSET = 14;

type WallFx = {
  breakFrame: number;
  cracks: string[];
  frags: { vx: number; vy: number; vr: number }[];
};

const useWallFx = (tl: RaceTimeline, lane: 0 | 1): WallFx[] =>
  useMemo(() => {
    const rand = mulberry32(tl.config.seed + 101 * (lane + 1));
    return tl.config.walls.map((_, wi) => {
      let breakFrame = Infinity;
      for (const r of tl.rounds) for (const b of r.lanes[lane].breaks) if (b.wall === wi) breakFrame = b.frame;
      const { y, h } = wallRect(tl.config.walls.length, wi);
      const x0 = LANE.x(lane) + WALL_INSET;
      const w = LANE.width - 2 * WALL_INSET;
      // 3 crack polylines, each starting on the top edge (balls hit from above) and zig-zagging down.
      const cracks = [0, 1, 2].map((k) => {
        let cx = x0 + w * (0.2 + 0.3 * k + rand() * 0.15);
        let cy = y;
        const pts = [`M ${cx.toFixed(1)} ${cy.toFixed(1)}`];
        const steps = 4 + Math.floor(rand() * 3);
        for (let s = 0; s < steps; s++) {
          cx += (rand() - 0.5) * 46;
          cy += h / steps;
          pts.push(`L ${cx.toFixed(1)} ${Math.min(y + h, cy).toFixed(1)}`);
        }
        return pts.join(" ");
      });
      const frags = Array.from({ length: 6 }, (_, k) => ({
        vx: ((k % 3) - 1) * 4 + (rand() - 0.5) * 6,
        vy: -3 - rand() * 5,
        vr: (rand() - 0.5) * 24,
      }));
      return { breakFrame, cracks, frags };
    });
  }, [tl, lane]);

/** Walls + balls + finish line for one lane, all derived from the simulation timeline. */
export const Lane: React.FC<{ lane: 0 | 1 }> = ({ lane }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ep, tl } = useRace();
  const cfg = ep.race.lanes[lane];
  const color = laneColor(cfg.character);
  const fx = useWallFx(tl, lane);
  const D = damageAt(tl, lane, frame);
  const front = frontWall(tl, D);
  const r = roundAt(tl, frame);
  const lr = r?.lanes[lane];
  const x0 = LANE.x(lane);
  const w = LANE.width;
  const finished = tl.winner === lane && frame >= tl.finishFrame;
  const count = tl.config.walls.length;

  // Front wall shakes while it is being hit.
  let shake = 0;
  if (lr && frame >= lr.hitStart && frame <= lr.hitEnd + 6) {
    const amp = lr.visibleBalls === 1 ? Math.min(14, 2 + Math.log2(lr.power) * 0.9) : 3;
    const decay = interpolate(frame, [lr.hitEnd, lr.hitEnd + 6], [1, 0], clamp);
    shake = Math.sin(frame * 2.1) * amp * decay;
  }

  const enter = spring({ frame: frame - 12, fps, config: { damping: 200 } });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter, translate: `0px ${(1 - enter) * 40}px` }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }} overflow="visible">
        <defs>
          <pattern id={`check-${lane}`} width={24} height={24} patternUnits="userSpaceOnUse">
            <rect width={24} height={24} fill="#ffffff" />
            <rect width={12} height={12} fill={INK} />
            <rect x={12} y={12} width={12} height={12} fill={INK} />
          </pattern>
        </defs>

        {/* lane body */}
        <rect
          x={x0}
          y={LANE.top}
          width={w}
          height={LANE.bottom - LANE.top}
          rx={28}
          fill={tint(color, 0.88)}
          stroke={finished ? color : tint(color, 0.5)}
          strokeWidth={finished ? 10 : 4}
        />

        {/* finish strip */}
        <g>
          <rect
            x={x0 + WALL_INSET}
            y={LANE.bottom - LANE.finishZone + 6}
            width={w - 2 * WALL_INSET}
            height={LANE.finishZone - 20}
            rx={10}
            fill={`url(#check-${lane})`}
            opacity={0.8}
          />
          <rect x={x0 + w / 2 - 70} y={LANE.bottom - LANE.finishZone + 8} width={140} height={34} rx={17} fill="#fff" />
          <text
            x={x0 + w / 2}
            y={LANE.bottom - LANE.finishZone + 35}
            textAnchor="middle"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={26}
            fill={INK}
          >
            FINISH
          </text>
        </g>

        {/* walls */}
        {tl.config.walls.map((hp, wi) => {
          const { y, h } = wallRect(count, wi);
          const prev = wi === 0 ? 0 : tl.cum[wi - 1];
          const dmgIn = Math.min(hp, Math.max(0, D - prev));
          const f = fx[wi];
          const wx = x0 + WALL_INSET;
          const ww = w - 2 * WALL_INSET;
          const fill = tint(color, 0.62 - 0.5 * (wi / (count - 1)));
          if (frame >= f.breakFrame) {
            const age = frame - f.breakFrame;
            if (age > SHATTER_FRAMES) return null;
            return (
              <g key={wi} opacity={1 - age / SHATTER_FRAMES}>
                {f.frags.map((fr, k) => {
                  const fw = ww / 3;
                  const fh = h / 2;
                  const bx = wx + (k % 3) * fw + fr.vx * age;
                  const by = y + Math.floor(k / 3) * fh + fr.vy * age + 0.7 * age * age;
                  return (
                    <rect
                      key={k}
                      x={bx}
                      y={by}
                      width={fw - 4}
                      height={fh - 4}
                      rx={6}
                      fill={fill}
                      stroke={shade(color, 0.35)}
                      strokeWidth={3}
                      transform={`rotate(${fr.vr * age * 0.3} ${bx + fw / 2} ${by + fh / 2})`}
                    />
                  );
                })}
              </g>
            );
          }
          const crack = dmgIn / hp;
          const dx = wi === front ? shake : 0;
          return (
            <g key={wi} transform={`translate(${dx} 0)`}>
              <rect x={wx} y={y} width={ww} height={h} rx={12} fill={fill} stroke={shade(color, 0.3)} strokeWidth={3} />
              {crack > 0 &&
                f.cracks.map((d, k) => (
                  <path
                    key={k}
                    d={d}
                    fill="none"
                    stroke={shade(color, 0.6)}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - Math.min(1, crack * (1.6 - k * 0.3))}
                  />
                ))}
              <text
                x={wx + ww / 2}
                y={y + h / 2 + 12}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={34}
                fill={INK}
                stroke="#ffffff"
                strokeWidth={6}
                paintOrder="stroke"
              >
                {fmt(hp - dmgIn)}
              </text>
            </g>
          );
        })}

        {/* balls */}
        {r && lr && lr.visibleBalls > 1 && <BallStream lane={lane} tl={tl} color={color} frame={frame} />}
        {r && lr && lr.visibleBalls === 1 && (
          <SingleBall lane={lane} tl={tl} color={color} frame={frame} fps={fps} roundIndex={r.n - 1} finished={finished} />
        )}

        {/* damage popup */}
        {lr && frame >= lr.hitStart && frame < lr.hitStart + 26 && (
          <text
            x={x0 + w - 40}
            y={frontY(tl, lr.before) - 20 - (frame - lr.hitStart) * 2}
            textAnchor="end"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={44}
            fill={shade(color, 0.45)}
            stroke="#ffffff"
            strokeWidth={8}
            paintOrder="stroke"
            opacity={interpolate(frame - lr.hitStart, [0, 4, 18, 26], [0, 1, 1, 0], clamp)}
          >
            −{fmt(lr.power)}
          </text>
        )}
      </svg>

      {/* progress bar to FINISH */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: PROGRESS.top,
          width: w,
          height: PROGRESS.height,
          borderRadius: PROGRESS.height / 2,
          background: LINE,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${(D / tl.totalHp) * 100}%`, height: "100%", background: color }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 24,
            color: INK,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(D)} / {fmt(tl.totalHp)} to finish
        </div>
      </div>
    </div>
  );
};

const BallStream: React.FC<{ lane: 0 | 1; tl: RaceTimeline; color: string; frame: number }> = ({
  lane,
  tl,
  color,
  frame,
}) => {
  const { ep } = useRace();
  const r = roundAt(tl, frame)!;
  const lr = r.lanes[lane];
  const rad = ep.race.lanes[lane].ballRadius(lr.power, lr.balls);
  const y0 = LANE.top + 26;
  return (
    <g>
      {lr.ballList.map((b, i) => {
        if (frame < b.launch || frame > b.hit + 7) return null;
        const bx = LANE.x(lane) + b.x * LANE.width;
        const target = frontY(tl, damageAt(tl, lane, b.hit)) - rad;
        if (frame <= b.hit) {
          const p = (frame - b.launch) / (b.hit - b.launch);
          return (
            <circle key={i} cx={bx} cy={y0 + (target - y0) * p * p} r={rad} fill={color} stroke={shade(color, 0.4)} strokeWidth={2.5} />
          );
        }
        const a = (frame - b.hit) / 7;
        return <circle key={i} cx={bx} cy={target + rad} r={rad + a * 10} fill="none" stroke="#fff" strokeWidth={3} opacity={0.7 * (1 - a)} />;
      })}
    </g>
  );
};

const SingleBall: React.FC<{
  lane: 0 | 1;
  tl: RaceTimeline;
  color: string;
  frame: number;
  fps: number;
  roundIndex: number;
  finished: boolean;
}> = ({ lane, tl, color, frame, fps, roundIndex, finished }) => {
  const { ep } = useRace();
  const round = tl.rounds[roundIndex];
  const lr = round.lanes[lane];
  const radiusOf = (ri: number) => {
    const l = tl.rounds[ri].lanes[lane];
    return ep.race.lanes[lane].ballRadius(l.power, l.balls);
  };
  const target = radiusOf(roundIndex);
  const prev = roundIndex > 0 ? radiusOf(roundIndex - 1) : target * 0.5;
  // Ball "charges up" from last round's size to this round's size (the doubling, made visible).
  const grow = spring({ frame: frame - round.start, fps, config: { damping: 11, stiffness: 120 } });
  let rad = prev + (target - prev) * grow;
  const cx = LANE.cx(lane);
  const rest = LANE.top + LANE.startZone / 2;
  const contact = frontY(tl, lr.before);
  let cy = rest;
  let sx = 1;
  let sy = 1;
  let opacity = interpolate(frame - round.start, [0, 4], [0, 1], clamp);

  if (frame >= lr.launch && frame < lr.hitStart) {
    const p = (frame - lr.launch) / (lr.hitStart - lr.launch);
    cy = rest + (contact - rad * 0.9 - rest) * p * p;
    sy = 1 + 0.12 * p;
    sx = 1 - 0.06 * p;
  } else if (frame >= lr.hitStart) {
    const D = damageAt(tl, lane, Math.min(frame, lr.hitEnd));
    cy = drillY(tl, D) - rad * 0.9;
    const imp = spring({ frame: frame - lr.hitStart, fps, config: { damping: 8, stiffness: 240 } });
    sx = interpolate(imp, [0, 1], [1.3, 1]);
    sy = interpolate(imp, [0, 1], [0.7, 1]);
    if (frame > lr.hitEnd && !finished) {
      const a = Math.min(1, (frame - lr.hitEnd) / 10);
      opacity *= 1 - a;
      rad *= 1 - 0.35 * a;
      cy -= Math.sin(Math.PI * a) * 24;
    }
  }
  if (opacity <= 0) return null;

  const ringAge = frame - lr.hitStart;
  return (
    <g opacity={opacity}>
      {ringAge >= 0 && ringAge < 12 && (
        <circle
          cx={cx}
          cy={contact}
          r={rad * (0.6 + ringAge / 6)}
          fill="none"
          stroke="#ffffff"
          strokeWidth={8}
          opacity={0.8 * (1 - ringAge / 12)}
        />
      )}
      <g transform={`translate(${cx} ${cy}) scale(${sx} ${sy})`}>
        <circle r={rad} fill={color} stroke={shade(color, 0.45)} strokeWidth={Math.max(3, rad * 0.07)} />
        <ellipse cx={-rad * 0.35} cy={-rad * 0.4} rx={rad * 0.22} ry={rad * 0.14} fill="#ffffff" opacity={0.75} />
        {rad >= 24 && (
          <text
            y={rad * 0.2}
            textAnchor="middle"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={rad * 0.55}
            fill={INK}
          >
            {fmt(lr.power)}
          </text>
        )}
      </g>
    </g>
  );
};
