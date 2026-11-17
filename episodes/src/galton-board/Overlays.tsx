// 2D overlays for EP05: thin adapters feeding timeline.ts / data.ts into the shared kit components (src/kit/overlays).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Badge, CaptionPills, ChartPanel, CtaCard, MangaSymbols, Mark, MASCOT_COLORS, ResultCards as KitResultCards, RevealCard as KitRevealCard, type Projector } from "../kit";
import { project } from "../kit/camera";
import { clamp, move } from "../kit/motion";
import { DUR, SAFE } from "../kit/theme";
import { camAt } from "./camera";
import { BALLS, BET, BINS, choose, counts, countsAfter, int, normalCount, ORDER, pct, ROWS } from "./data";
import { ACTING, BADGES, BEAT, CAPTIONS, CHART, landedAt, RESULT_OUTS, RESULT_POPS } from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

const N = int(BALLS);
const PATHS_ALL = int(2 ** ROWS);

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const Badges: React.FC = () => (
  <>
    <Badge text="SLOW-MO" from={BADGES.slow.from} to={BADGES.slow.to} icon="slowmo" />
    <Badge text="each peg = 50/50" from={BADGES.coin.from} to={BADGES.coin.to} icon="info" top={SAFE.top + 230} />
    <Badge text="FAST-FORWARD" from={BADGES.fast.from} to={BADGES.fast.to} icon="slowmo" dot />
    <Badge text="≈ normal curve" from={BADGES.normal.from} to={BADGES.normal.to} icon="info" />
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

// ---------------------------------------------------------------- notebook panel: live histogram vs the bell curve

const BAR = "#e0902a";
const CURVE = "#19b3a6";
const binOf = (x: number) => Math.max(0, Math.min(BINS - 1, Math.round(x)));

export const PourChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [CHART.from, CHART.from + DUR.slow, CHART.to, CHART.to + 14], [0, 1, 1, 0], { ...clamp, easing: move });
  if (k <= 0) return null;
  const n = landedAt(f);
  const c = countsAfter(n);
  return (
    <ChartPanel
      title="balls per bin"
      subtitle={`${int(n)} of ${N} landed`}
      legend={[
        { label: "bins", sub: "actual", color: BAR },
        { label: "bell curve", sub: `for ${int(n)}`, color: CURVE },
      ]}
      legendAt={{ x: 520, y: 52, step: 200, width: 186 }}
      x={{ min: -0.5, max: 12.5, ticks: [0, 2, 4, 6, 8, 10, 12], label: (v) => (v === 0 ? "bin 0" : String(v)) }}
      y={{ max: 250, ticks: [100, 200], label: (v) => String(v) }}
      series={[
        { key: "bins", color: BAR, fn: (x) => c[binOf(x)] },
        { key: "curve", color: CURVE, fn: (x) => normalCount(x, n), dash: [14, 10] },
      ]}
      progress={12.5}
      step={0.02}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

// ---------------------------------------------------------------- results: Anna's bin vs Zuzu's bin

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const C = counts();
  const who = [
    { key: "anna", name: "ANNA", bin: BET.anna, where: "far left" },
    { key: "zuzu", name: "ZUZU", bin: BET.zuzu, where: "centre" },
  ] as const;
  const items = who.map((w, i) => ({
    key: w.key,
    rank: 1 + who.filter((o) => C[o.bin] > C[w.bin]).length,
    name: w.name,
    sub: `bin ${w.bin} (${w.where})`,
    color: MASCOT_COLORS[w.key],
    value: { to: C[w.bin], format: (x: number) => String(Math.round(x)), unit: C[w.bin] === 1 ? "ball" : "balls" },
    lines: [`${int(choose(ROWS, w.bin))} of ${PATHS_ALL} paths`],
    x: i === 0 ? 290 : 790,
    y: 560,
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
    title="Many random 50/50 bounces add up to a bell curve:"
    lines={
      <>
        the <Mark color="#a8eee6">normal distribution</Mark>.
      </>
    }
    formula={`bin k: C(${ROWS}, k) of ${PATHS_ALL} paths · centre ${int(choose(ROWS, BET.zuzu))}/${PATHS_ALL} = ${pct(choose(ROWS, BET.zuzu) / 2 ** ROWS)}`}
    small={{ text: "Ideal pegs, exactly 50/50. Balls follow coin-flip paths and pass through each other.", dot: MASCOT_COLORS.lumi }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="Which bin would you pick?" button="Comment below!" />;
