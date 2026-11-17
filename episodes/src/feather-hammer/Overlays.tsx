// 2D overlays for EP02: thin adapters feeding timeline.ts into the shared kit components (src/kit/overlays).
// Only DropTimers is episode-specific (two stopwatch pills styled with the kit theme).
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
  type Projector,
} from "../kit";
import { project } from "../kit/camera";
import { clamp, move, pop } from "../kit/motion";
import { DUR, FONT, INK, PAPER } from "../kit/theme";
import { camAt } from "./camera";
import { fmt, G, H, heightAt, landTime, ORDER, type Medium, type ObjectId } from "./data";
import {
  ACTING,
  BADGES,
  BEAT,
  CAPTIONS,
  COUNTDOWN,
  HAMMER_AIR,
  HOLDER,
  RESULT_OUTS,
  RESULT_POPS,
  SLOWMO,
  simTime,
  STAGE,
  timerValue,
  VAC_LAND,
} from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

const NAME: Record<ObjectId, string> = { hammer: "HAMMER", feather: "FEATHER" };
const MED: Record<Medium, string> = { air: "AIR", vacuum: "VACUUM" };
const colorOf = (o: ObjectId) => MASCOT_COLORS[HOLDER[o]];

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const EpisodeCountdown: React.FC = () => <Countdown steps={COUNTDOWN} from={BEAT.countdown} to={BEAT.dropAir + 20} />;

export const Badges: React.FC = () => (
  <>
    <Badge text="simplified air drag" from={BADGES.drag.from} to={BADGES.drag.to} icon="info" />
    <Badge text={`${SLOWMO}x SLOW-MO`} from={BADGES.slowmo.from} to={BADGES.slowmo.to} icon="slowmo" dot />
  </>
);

export const Symbols: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const items = ORDER.map((m) => {
    const st = ACTING(m, f);
    const [x, y, z] = st.pos;
    const seated = st.clip === "sit";
    return {
      key: m,
      anchor: [x + 0.3, y + (seated ? 0.85 : 1.08), z + 0.2] as [number, number, number],
      symbols: st.symbols,
    };
  });
  return <MangaSymbols project={proj} items={items} />;
};

// ---------------------------------------------------------------- stopwatches (one per object, per round)

const ROUND: Record<Medium, [number, number]> = {
  air: [BEAT.countdown + 30, BEAT.twist - 20],
  vacuum: [BEAT.dropVac - 24, BEAT.results - 6],
};
/** stopwatch row: low while the chart is out, just above the panel when it is in */
const TIMER_Y = { low: 1530, high: 1258 };
const TIMER_X: Record<ObjectId, number> = { hammer: 270, feather: 810 };

export const DropTimers: React.FC = () => {
  const f = useCurrentFrame();
  const m: Medium | null = f >= ROUND.air[0] && f < ROUND.air[1] + 10 ? "air" : f >= ROUND.vacuum[0] && f < ROUND.vacuum[1] + 10 ? "vacuum" : null;
  if (!m) return null;
  const [a, b] = ROUND[m];
  const vis = interpolate(f, [a, a + DUR.standard, b, b + 10], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      {(["hammer", "feather"] as ObjectId[]).map((o) => {
        const done = simTime(m, f) >= landTime(o, m);
        const age = (simTime(m, f) - landTime(o, m)) * (m === "air" ? 30 : 60);
        const c = colorOf(o);
        return (
          <div
            key={o}
            style={{
              position: "absolute",
              left: TIMER_X[o],
              top: TIMER_Y.low + (TIMER_Y.high - TIMER_Y.low) * chartIn(f),
              translate: `-50% -50%`,
              opacity: vis,
              scale: done ? interpolate(age, [0, DUR.standard], [1.25, 1], { ...clamp, easing: pop }) : interpolate(vis, [0, 1], [0.6, 1]),
              padding: "8px 22px 10px",
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
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <span style={{ width: 16, height: 16, borderRadius: 99, background: done ? PAPER : c, border: `3px solid ${INK}` }} />
              {NAME[o]} · {MED[m]}
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{fmt(timerValue(o, m, f))} s</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- notebook chart: height vs time, both rounds

const VAC_COLOR = "#2aa7c0";
/** The chart stays out of the two whole-drop shots (the tube floor sits where the panel would be) and slides in
 *  right after each landing cut, the air round still live (the feather is falling), the vacuum round complete. */
const CHART_IN: [number, number][] = [
  [HAMMER_AIR + 10, BEAT.twist - 26],
  [VAC_LAND + 24, BEAT.results],
];
/** 0..1: how far the chart panel is in (the stopwatches ride on top of it). */
const chartIn = (f: number) => {
  const k = CHART_IN.map(([a, b]) => interpolate(f, [a, a + DUR.slow, b, b + 14], [0, 1, 1, 0], { ...clamp, easing: move }));
  return Math.max(...k);
};

export const EpisodeChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = chartIn(f);
  if (k <= 0) return null;
  const tAir = simTime("air", f);
  const tVac = simTime("vacuum", f);
  const vacRound = f >= BEAT.dropVac;
  // the air curves stay on the chart for the vacuum round; the vacuum curves are cut at the current sim time
  const progress = vacRound ? 8 : tAir;
  const vac = (o: ObjectId) => (x: number) => (tVac >= 0 && x <= tVac ? heightAt(o, "vacuum", x) : NaN);
  return (
    <ChartPanel
      title="height vs time"
      subtitle={`drop from ${H} m · real seconds`}
      legend={[
        { label: "HAMMER", sub: "in air", color: colorOf("hammer") },
        { label: "FEATHER", sub: "in air", color: colorOf("feather") },
        { label: "BOTH", sub: "in vacuum", color: VAC_COLOR },
      ]}
      x={{ max: 8, ticks: [0, 2, 4, 6, 8], label: (s) => (s === 8 ? "8 s" : String(s)) }}
      y={{ max: 3.2, ticks: [1, 2, 3], label: (m) => `${m} m` }}
      series={[
        { key: "hammer-air", color: colorOf("hammer"), fn: (x) => heightAt("hammer", "air", x), liveUntil: landTime("hammer", "air") },
        { key: "feather-air", color: colorOf("feather"), fn: (x) => heightAt("feather", "air", x), liveUntil: landTime("feather", "air") },
        { key: "hammer-vac", color: VAC_COLOR, fn: vac("hammer"), liveUntil: landTime("hammer", "vacuum") },
        { key: "feather-vac", color: VAC_COLOR, fn: vac("feather"), liveUntil: landTime("feather", "vacuum") },
      ]}
      progress={progress}
      started={tAir >= 0}
      step={0.005}
      style={{
        translate: `0px ${(1 - k) * 700}px`,
      }}
    />
  );
};

// ---------------------------------------------------------------- results: one card per drop, over its column

const DROPS: { o: ObjectId; m: Medium }[] = [
  { o: "hammer", m: "air" },
  { o: "feather", m: "air" },
  { o: "hammer", m: "vacuum" },
  { o: "feather", m: "vacuum" },
];

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  // rank at display precision: equal shown times share a rank
  const shown = DROPS.map((d) => fmt(landTime(d.o, d.m)));
  const items = DROPS.map((d, i) => {
    const rank = 1 + shown.filter((s) => Number(s) < Number(shown[i])).length;
    const a = proj([STAGE.columnX[d.m], d.o === "hammer" ? 3.55 : 1.85, 0.6]);
    return {
      key: `${d.o}-${d.m}`,
      rank,
      name: NAME[d.o],
      sub: `in ${d.m}`,
      color: d.m === "vacuum" ? VAC_COLOR : colorOf(d.o),
      value: { to: landTime(d.o, d.m), format: fmt, unit: "s" },
      lines: [`from ${H} m`],
      x: a.x,
      y: a.y,
      tilt: (i % 2 ? 1.4 : -1.4) * (d.m === "air" ? 1 : -1),
      popAt: RESULT_POPS[i],
      outAt: RESULT_OUTS[i],
    };
  });
  return (
    <AbsoluteFill>
      <KitResultCards items={items} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal + CTA

const T_VAC = landTime("hammer", "vacuum");

export const RevealCard: React.FC = () => (
  <KitRevealCard
    title="No air, no difference."
    lines={
      <>
        <Mark color="#bfeef5">Gravity</Mark> speeds everything
        <br />
        up the <Mark color="#ffd86b">same</Mark>.
      </>
    }
    formula={`t = √(2h / g) = √(2 × ${H} / ${G}) = ${fmt(T_VAC)} s  ·  hammer or feather`}
    small={{ text: "Apollo 15's David Scott did this on the Moon in 1971.", dot: VAC_COLOR }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="What should we drop next?" button="Comment below!" />;
