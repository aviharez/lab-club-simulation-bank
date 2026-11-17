// 2D overlays for EP03: thin adapters feeding timeline.ts into the shared kit components (src/kit/overlays).
// Only BallTimers is episode-specific (two stopwatch pills styled with the kit theme, as in EP02).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Badge,
  CaptionPills,
  ChartPanel,
  Countdown,
  CtaCard,
  MangaSymbols,
  Mark,
  MASCOT_COLORS,
  ResultCards as KitResultCards,
  RevealCard as KitRevealCard,
  SAFE,
  type Projector,
} from "../kit";
import { project } from "../kit/camera";
import { clamp, move, pop } from "../kit/motion";
import { DUR, FONT, INK, PAPER } from "../kit/theme";
import { camAt } from "./camera";
import { BALL_OWNER, ballAt, fmt, G, H, landDistance, landTime, ORDER, SLOWMO, VX, type BallId } from "./data";
import {
  ACTING,
  BADGES,
  BEAT,
  CAPTIONS,
  CHART_WINDOWS,
  COUNTDOWN,
  distanceValue,
  landOn,
  REPLAY,
  replayTime,
  RESULT_OUTS,
  RESULT_POPS,
  sceneFrame,
  timerValue,
  TIMERS,
} from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

const NAME: Record<BallId, string> = { dropped: "DROPPED", thrown: "THROWN" };
const colorOf = (b: BallId) => MASCOT_COLORS[BALL_OWNER[b]];
const DIST_COLOR = "#2aa7c0";
const T = landTime("dropped");

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const EpisodeCountdown: React.FC = () => <Countdown steps={COUNTDOWN} from={BEAT.countdown} to={BEAT.release + 20} top={1000} />;

export const Badges: React.FC = () => (
  <>
    <Badge text="no air drag" from={BADGES.drag.from} to={BADGES.drag.to} icon="info" />
    <Badge text={`${SLOWMO}x SLOW-MO`} from={BADGES.slowmo.from} to={BADGES.slowmo.to} icon="slowmo" dot top={SAFE.top + 220} />
    <Badge text="REPLAY · side view" from={BADGES.replay.from} to={BADGES.replay.to} top={SAFE.top + 220} />
    <Badge text={`${SLOWMO}x SLOW-MO`} from={BADGES.replaySlowmo.from} to={BADGES.replaySlowmo.to} icon="slowmo" dot top={SAFE.top + 300} />
  </>
);

export const Symbols: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const items = ORDER.map((m) => {
    const st = ACTING(m, f);
    const [x, y, z] = st.pos;
    return { key: m, anchor: [x + 0.3, y + 1.08, z + 0.2] as [number, number, number], symbols: st.symbols };
  });
  return <MangaSymbols project={proj} items={items} />;
};

// ---------------------------------------------------------------- stopwatch pills (one per ball)

const TIMER_X: Record<BallId, number> = { dropped: 280, thrown: 800 };
const TIMER_Y = 1500;

export const BallTimers: React.FC = () => {
  const f = useCurrentFrame();
  if (f < TIMERS.from || f > TIMERS.to + 10) return null;
  const vis = interpolate(f, [TIMERS.from, TIMERS.from + DUR.standard, TIMERS.to, TIMERS.to + 10], [0, 1, 1, 0], clamp);
  const live = sceneFrame(f);
  return (
    <AbsoluteFill>
      {(["dropped", "thrown"] as BallId[]).map((b) => {
        const done = live >= landOn(b);
        const age = live - landOn(b);
        const c = colorOf(b);
        return (
          <div
            key={b}
            style={{
              position: "absolute",
              left: TIMER_X[b],
              top: TIMER_Y,
              translate: `-50% -50%`,
              opacity: vis,
              scale: done ? interpolate(age, [0, DUR.standard], [1.25, 1], { ...clamp, easing: pop }) : interpolate(vis, [0, 1], [0.6, 1]),
              padding: "8px 24px 10px",
              borderRadius: 28,
              background: done ? c : PAPER,
              border: `5px solid ${INK}`,
              boxShadow: `0 6px 0 ${INK}`,
              fontFamily: FONT,
              color: INK,
              textAlign: "center",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <span style={{ width: 16, height: 16, borderRadius: 99, background: done ? PAPER : c, border: `3px solid ${INK}` }} />
              {NAME[b]}
            </div>
            <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{fmt(timerValue(f))} s</div>
            <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>→ {fmt(b === "thrown" ? distanceValue(f) : 0)} m</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- notebook chart: height vs time + distance

const chartIn = (f: number) => Math.max(...CHART_WINDOWS.map(([a, b]) => interpolate(f, [a, a + DUR.slow, b, b + 14], [0, 1, 1, 0], { ...clamp, easing: move })));

export const EpisodeChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = chartIn(f);
  if (k <= 0) return null;
  const t = f < REPLAY.until ? replayTime(f) : 0.8;
  const height = (b: BallId) => (x: number) => ballAt(b, x).y;
  return (
    <ChartPanel
      title="height vs time"
      subtitle="same curve · thrown dashed"
      legend={[
        { label: "DROPPED", sub: "height", color: colorOf("dropped") },
        { label: "THROWN", sub: "height", color: colorOf("thrown") },
        { label: "DISTANCE", sub: "thrown →", color: DIST_COLOR },
      ]}
      x={{ max: 0.8, ticks: [0, 0.2, 0.4, 0.6, 0.8], label: (s) => (s === 0.8 ? "0.8 s" : String(s)) }}
      y={{ max: 2.4, ticks: [1, 2], label: (m) => `${m} m` }}
      series={[
        // identical curves: the thrown one is dashed on top, so the dropped one shows through the gaps
        { key: "dropped-h", color: colorOf("dropped"), fn: height("dropped"), liveUntil: T },
        { key: "thrown-h", color: colorOf("thrown"), fn: height("thrown"), liveUntil: T, dash: [16, 12] },
        { key: "thrown-x", color: DIST_COLOR, fn: (x) => ballAt("thrown", x).x, liveUntil: T },
      ]}
      progress={t}
      started={t >= 0}
      step={0.004}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

// ---------------------------------------------------------------- results: one card per ball

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const balls: BallId[] = ["dropped", "thrown"];
  // rank at display precision: equal shown times share a rank
  const shown = balls.map((b) => fmt(landTime(b)));
  const items = balls.map((b, i) => ({
    key: b,
    rank: 1 + shown.filter((s) => Number(s) < Number(shown[i])).length,
    name: NAME[b],
    sub: b === "dropped" ? "Zuzu drops" : `Anna throws ${VX} m/s`,
    color: colorOf(b),
    value: { to: landTime(b), format: fmt, unit: "s" },
    lines: [`lands ${fmt(landDistance(b))} m out`],
    x: i === 0 ? 290 : 790,
    y: 640,
    tilt: i ? 1.4 : -1.4,
    popAt: RESULT_POPS[i],
    outAt: RESULT_OUTS[i],
  }));
  return (
    <AbsoluteFill>
      <KitResultCards items={items} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal + CTA

export const RevealCard: React.FC = () => (
  <KitRevealCard
    title="Sideways speed doesn't change falling time."
    lines={
      <>
        <Mark color="#ffd86b">Gravity</Mark> only pulls <Mark color="#bfeef5">down</Mark>.
      </>
    }
    formula={`t = √(2h / g) = √(2 × ${H} / ${G}) = ${fmt(T)} s  ·  dropped or thrown`}
    small={{ text: `Thrown at ${VX} m/s: ${fmt(landDistance("thrown"))} m farther, same ${fmt(T)} s.`, dot: DIST_COLOR }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="Want a faster throw next?" button="Comment below!" />;
