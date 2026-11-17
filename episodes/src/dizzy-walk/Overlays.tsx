// 2D overlays for EP06: thin adapters feeding timeline.ts / data.ts into the shared kit components (src/kit/overlays).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Badge, CaptionPills, ChartPanel, CtaCard, MangaSymbols, Mark, MASCOT_COLORS, ResultCards as KitResultCards, RevealCard as KitRevealCard, WorldTags, type Projector, type WorldTag } from "../kit";
import { project } from "../kit/camera";
import { clamp, move } from "../kit/motion";
import { DUR, SAFE } from "../kit/theme";
import { TILE } from "../sets/night-plaza";
import { camAt } from "./camera";
import { between, FINAL, GHOSTS, ghostRms, lumiAt, lumiDist, ORDER, STEPS, theoryRms, tiles, zuzuDist } from "./data";
import { ACTING, BADGES, BEAT, CAPTIONS, done, LUMI_TAPE_OFFSET, PANEL_A, PANEL_B, RESULT_OUTS, RESULT_POPS, ringRadiusTiles, runAt, TAGS, walkAt, world, ZUZU_END } from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const Badges: React.FC = () => (
  <>
    <Badge text="FAST-FORWARD" from={BADGES.fast.from} to={BADGES.fast.to} icon="slowmo" dot />
    <Badge text="1 step = 1 tile" from={BADGES.rule.from} to={BADGES.rule.to} icon="info" top={SAFE.top + 230} />
    <Badge text="straight-line distance" from={BADGES.line.from} to={BADGES.line.to} icon="info" />
    <Badge text={`${GHOSTS} seeded walks`} from={BADGES.run.from} to={BADGES.run.to} icon="info" />
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

// ---------------------------------------------------------------- distance tags in the world

export const Tags: React.FC = () => {
  const proj = useProjector();
  const le = world(lumiAt(STEPS));
  const f = useCurrentFrame();
  const r = ringRadiusTiles(f);
  const n = done(runAt(f));
  const tags: WorldTag[] = [
    // beside the lane end (east), clear of the caption pill and of the line itself
    { key: "lumi", anchor: [le[0] + LUMI_TAPE_OFFSET + 7, 0, le[2] + 1], text: `${FINAL.lumi()} tiles`, sub: "Lumi", color: MASCOT_COLORS.lumi, from: TAGS.lumi.from, to: TAGS.lumi.to },
    { key: "zuzu-d", anchor: ZUZU_END, text: `${tiles(FINAL.zuzu())} tiles`, sub: "Zuzu", color: MASCOT_COLORS.zuzu, from: TAGS.zuzuDrone.from, to: TAGS.zuzuDrone.to, dy: 70 },
    { key: "zuzu-cu", anchor: [ZUZU_END[0] / 2, 0, ZUZU_END[2] / 2], text: `${tiles(FINAL.zuzu())} tiles`, color: MASCOT_COLORS.zuzu, from: TAGS.zuzuCu.from, to: TAGS.zuzuCu.to, dy: 40 },
    { key: "ring", anchor: [r * TILE, 0, 0], text: `r = √${n} = ${tiles(theoryRms(n))}`, color: "#9cc4ff", from: TAGS.ring.from, to: TAGS.ring.to, dy: 50 },
  ];
  return <WorldTags project={proj} tags={tags} bottom={PANEL_TOP - 10} />;
};

// ---------------------------------------------------------------- notebook panel

const PANEL_TOP = 1322;
const ZUZU_C = "#e0a21a";
const LUMI_C = "#4f7fe0";
const RMS_C = "#e0a21a";
const SQRT_C = "#4f7fe0";

const slide = (f: number, a: number, b: number) => interpolate(f, [a, a + DUR.slow, b, b + 14], [0, 1, 1, 0], { ...clamp, easing: move });

/** Panel A: the walk. Lumi's distance (= steps) vs Zuzu's, 0-100 tiles: Zuzu's line hugs the floor. */
export const WalkChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = slide(f, PANEL_A.from, PANEL_A.to);
  if (k <= 0) return null;
  const s = walkAt(f);
  return (
    <ChartPanel
      title="distance from start (tiles)"
      subtitle={`step ${done(s)} of ${STEPS}`}
      legend={[
        { label: "Lumi", sub: tiles(between(lumiDist, done(s))), color: LUMI_C },
        { label: "Zuzu", sub: tiles(zuzuDist(done(s))), color: ZUZU_C },
      ]}
      legendAt={{ x: 560, y: 52, step: 190, width: 176 }}
      x={{ min: 0, max: STEPS, ticks: [0, 25, 50, 75, 100], label: (v) => (v === 0 ? "step 0" : String(v)) }}
      y={{ max: 100, ticks: [50, 100], label: (v) => String(v) }}
      series={[
        { key: "lumi", color: LUMI_C, fn: (x) => between(lumiDist, x) },
        { key: "zuzu", color: ZUZU_C, fn: (x) => between(zuzuDist, x) },
      ]}
      progress={s}
      step={1}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

/** Panel B: the ghost run. The 50 ghosts' RMS distance vs √n, 0-15 tiles. */
export const RunChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = slide(f, PANEL_B.from, PANEL_B.to);
  if (k <= 0) return null;
  const s = runAt(f);
  return (
    <ChartPanel
      title={`${GHOSTS} ghosts: typical distance`}
      subtitle={`step ${done(s)} of ${STEPS}`}
      legend={[
        { label: "ghosts RMS", sub: tiles(ghostRms(done(s))), color: RMS_C },
        { label: "√n", sub: tiles(theoryRms(done(s))), color: SQRT_C },
      ]}
      legendAt={{ x: 560, y: 52, step: 190, width: 176 }}
      x={{ min: 0, max: STEPS, ticks: [0, 25, 50, 75, 100], label: (v) => (v === 0 ? "step 0" : String(v)) }}
      y={{ max: 15, ticks: [5, 10, 15], label: (v) => String(v) }}
      series={[
        { key: "rms", color: RMS_C, fn: (x) => between(ghostRms, x) },
        { key: "sqrt", color: SQRT_C, fn: (x) => between(theoryRms, x), dash: [14, 10] },
      ]}
      progress={s}
      step={1}
      started={f >= BEAT.run}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

// ---------------------------------------------------------------- results

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const rows = [
    { key: "lumi", name: "LUMI", sub: `${STEPS} straight steps`, color: MASCOT_COLORS.lumi, value: FINAL.lumi(), line: "always north" },
    { key: "zuzu", name: "ZUZU", sub: `${STEPS} random steps`, color: MASCOT_COLORS.zuzu, value: FINAL.zuzu(), line: "her one walk" },
    { key: "ghosts", name: `${GHOSTS} ZUZUS`, sub: "RMS distance", color: "#e0a21a", value: FINAL.ghosts(), line: `√${STEPS} = ${tiles(FINAL.theory)}` },
  ];
  const items = rows.map((w, i) => ({
    key: w.key,
    rank: 1 + rows.filter((o) => o.value > w.value).length,
    name: w.name,
    sub: w.sub,
    color: w.color,
    value: { to: w.value, format: (x: number) => (w.key === "lumi" ? String(Math.round(x)) : tiles(x)), unit: "tiles" },
    lines: [w.line],
    x: [190, 540, 890][i],
    y: 600,
    tilt: [-1.4, 0.8, 1.6][i],
    popAt: RESULT_POPS[i],
    outAt: RESULT_OUTS[i],
  }));
  return (
    <AbsoluteFill>
      <KitResultCards items={items} width={300} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal + CTA

export const RevealCard: React.FC = () => (
  <KitRevealCard
    title="Random steps mostly cancel out."
    lines={
      <>
        After n steps you're only about <Mark color="#cfe0ff">√n away</Mark>.
      </>
    }
    formula={`RMS distance = √n · √${STEPS} = ${tiles(FINAL.theory)} · ${GHOSTS} ghosts: ${tiles(FINAL.ghosts())}`}
    small={{ text: "Each step: 1 tile N, E, S or W, 1/4 each. Straight-line distance from the start.", dot: MASCOT_COLORS.lumi }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="How many steps should Zuzu try next?" button="Comment below!" />;
