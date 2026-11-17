// 2D overlays for EP07: thin adapters feeding timeline.ts / data.ts into the shared kit components (src/kit/overlays).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Badge, CaptionPills, ChartPanel, CtaCard, MangaSymbols, Mark, MASCOT_COLORS, ResultCards as KitResultCards, RevealCard as KitRevealCard, WorldTags, type Projector, type WorldTag } from "../kit";
import { project } from "../kit/camera";
import { clamp, move } from "../kit/motion";
import { DUR } from "../kit/theme";
import { CHEM_PREP } from "../sets/chem-prep-room";
import { camAt } from "./camera";
import { about, ALGO_NAME, BIG_N, bubbleCompares, COST, countsAt, N, ORDER, quickCompares, secs, TOTAL } from "./data";
import { ACTING, BADGES, BEAT, CAPTIONS, clockAt, countsAtFrame, growthLog, PANEL_GROWTH, PANEL_RACE, RESULT_OUTS, RESULT_POPS, speedAt, TAGS } from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const Badges: React.FC = () => (
  <>
    <Badge text={`compare ${COST.compare} s · swap ${COST.swap} s`} from={BADGES.rule.from} to={BADGES.rule.to} icon="info" />
    <Badge text="4x SPEED" from={BADGES.x4.from} to={BADGES.x4.to} icon="slowmo" dot />
    <Badge text="8x SPEED" from={BADGES.x8.from} to={BADGES.x8.to} icon="slowmo" dot />
    <Badge text="average over random orders" from={BADGES.avg.from} to={BADGES.avg.to} icon="info" />
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

/** The live counters, big: one tag per racer above the back bench (Anna left, Lumi right), counting completed
 *  comparisons and swaps. */
export const CounterTags: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const tags: WorldTag[] = (["anna", "lumi"] as const).map((a, i) => {
    const c = countsAtFrame(a, f);
    return {
      key: a,
      anchor: [i === 0 ? -0.62 : 0.62, CHEM_PREP.bench.top + 1.3, CHEM_PREP.benchZ.lumi],
      text: `${c.compares} comparisons`,
      sub: `${a === "anna" ? "Anna" : "Lumi"} · ${ALGO_NAME[a]} · ${c.swaps} swaps`,
      color: MASCOT_COLORS[a],
      from: TAGS.counters.from,
      to: TAGS.counters.to,
    };
  });
  return <WorldTags project={proj} tags={tags} bottom={PANEL_TOP - 10} />;
};

// ---------------------------------------------------------------- notebook panels

const PANEL_TOP = 1322;
const ANNA_C = "#e2507f";
const LUMI_C = "#3f78d8";
const slide = (f: number, a: number, b: number) => interpolate(f, [a, a + DUR.slow, b, b + 14], [0, 1, 1, 0], { ...clamp, easing: move });
const T = { anna: TOTAL("anna"), lumi: TOTAL("lumi") };
const RACE_MAX = 60;

/** Race panel: comparisons over race time for both mascots; the legend counts comparisons and swaps live. */
export const RaceChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = slide(f, PANEL_RACE.from, PANEL_RACE.to);
  if (k <= 0) return null;
  const clock = clockAt(f);
  return (
    <ChartPanel
      title="comparisons"
      subtitle={`race time ${secs(clock)}${f >= BEAT.race && f < BEAT.annaDone ? ` · ${speedAt(f)}x` : ""}`}
      legend={[
        { label: "Anna · bubble", color: ANNA_C },
        { label: "Lumi · quick", color: LUMI_C },
      ]}
      legendAt={{ x: 470, y: 52, step: 236, width: 222 }}
      x={{ min: 0, max: RACE_MAX, ticks: [0, 15, 30, 45, 60], label: (v) => (v === 0 ? "0 s" : `${v}`) }}
      y={{ max: RACE_MAX, ticks: [20, 40, 60], label: (v) => String(v) }}
      series={[
        { key: "anna", color: ANNA_C, fn: (x) => countsAt("anna", x).compares, liveUntil: T.anna.time },
        { key: "lumi", color: LUMI_C, fn: (x) => countsAt("lumi", x).compares, liveUntil: T.lumi.time },
      ]}
      progress={clock}
      started={f >= BEAT.race}
      step={0.25}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

const nLabel = (v: number) => ["1", "10", "100", "1k", "10k", "100k", "1M"][Math.round(v)];
const cLabel = (v: number) => ({ 3: "1k", 6: "1M", 9: "1B", 12: "1T" })[Math.round(Math.log10(v))] ?? String(v);

/** Growth panel (twist + reveal): average comparisons for n beakers, n on a log axis, 12 → 1,000,000. */
export const GrowthChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = slide(f, PANEL_GROWTH.from, PANEL_GROWTH.to);
  if (k <= 0) return null;
  const x = growthLog(f);
  const n = Math.round(10 ** x);
  return (
    <ChartPanel
      title="comparisons for n beakers"
      subtitle={`n = ${n.toLocaleString("en-US")}`}
      legend={[
        { label: "bubble · n²/2", sub: about(bubbleCompares(n)), color: ANNA_C },
        { label: "quick · ~1.4 n log₂n", sub: about(quickCompares(n)), color: LUMI_C },
      ]}
      legendAt={{ x: 470, y: 52, step: 236, width: 222 }}
      x={{ min: 1, max: 6, ticks: [1, 2, 3, 4, 5, 6], label: nLabel }}
      y={{ min: 10, max: 1e12, log: true, ticks: [1e3, 1e6, 1e9, 1e12], label: cLabel }}
      series={[
        { key: "bubble", color: ANNA_C, fn: (v) => bubbleCompares(10 ** v) },
        { key: "quick", color: LUMI_C, fn: (v) => quickCompares(10 ** v) },
      ]}
      progress={x}
      started={f >= PANEL_GROWTH.from + 10}
      step={0.02}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

// ---------------------------------------------------------------- results

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BEAT.results || f > BEAT.twist + 12) return null;
  const rows = (["anna", "lumi"] as const).map((a) => ({ a, ...T[a] }));
  const items = rows.map((w, i) => ({
    key: w.a,
    rank: 1 + rows.filter((o) => o.time < w.time).length,
    name: w.a.toUpperCase(),
    sub: ALGO_NAME[w.a],
    color: MASCOT_COLORS[w.a],
    value: { to: w.time, format: (x: number) => x.toFixed(1), unit: "s" },
    lines: [`${w.compares} comparisons`, `${w.swaps} swaps`],
    x: [300, 780][i],
    y: 560,
    tilt: [-1.4, 1.2][i],
    popAt: RESULT_POPS[i],
    outAt: RESULT_OUTS[i],
  }));
  return (
    <AbsoluteFill>
      <KitResultCards items={items} width={330} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal + CTA

export const RevealCard: React.FC = () => (
  <KitRevealCard
    title="Bubble sort grows like n², quick sort like n log n."
    lines={
      <>
        For {BIG_N.toLocaleString("en-US")} items: about <Mark color="#ffd0dd">{about(bubbleCompares(BIG_N))}</Mark> vs about <Mark color="#cfe0ff">{about(quickCompares(BIG_N))}</Mark> comparisons.
      </>
    }
    formula={`n(n−1)/2 vs 2(n+1)Hₙ − 4n · this race (n = ${N}): ${T.anna.compares} vs ${T.lumi.compares}`}
    small={{ text: "Quick sort: Lomuto partition, average over random orders. Bubble sort stops early if a pass makes no swap.", dot: MASCOT_COLORS.lumi }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="Which algorithm should race next?" button="Comment below!" />;
