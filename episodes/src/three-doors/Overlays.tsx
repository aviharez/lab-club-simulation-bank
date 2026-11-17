// 2D overlays for EP04: thin adapters feeding timeline.ts into the shared kit components (src/kit/overlays).
// Episode-specific: the two live win counters over the mini stages (styled with the kit theme).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Badge,
  CaptionPills,
  ChartPanel,
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
import { ORDER, pct, rateAfter, ROUNDS, totalWins, type Player } from "./data";
import { ACTING, BADGES, BEAT, CAPTIONS, CHART, COUNTERS, played, RESULT_OUTS, RESULT_POPS, scoreAt } from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

const LABEL: Record<Player, string> = { anna: "STAY", miyu: "SWITCH" };
const WHO: Record<Player, string> = { anna: "Anna", miyu: "Miyu" };
const colorOf = (p: Player) => MASCOT_COLORS[p];
const PLAYERS: Player[] = ["anna", "miyu"];
const N = ROUNDS.toLocaleString("en-US");

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const Badges: React.FC = () => (
  <>
    <Badge text="Lumi always opens a duck door" from={BADGES.rules.from} to={BADGES.rules.to} icon="info" />
    <Badge text="FAST-FORWARD" from={BADGES.fast.from} to={BADGES.fast.to} icon="slowmo" dot />
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

// ---------------------------------------------------------------- live counters (montage)

const COUNTER_X: Record<Player, number> = { anna: 290, miyu: 790 };
const COUNTER_Y = 470;

export const Counters: React.FC = () => {
  const f = useCurrentFrame();
  if (f < COUNTERS.from || f > COUNTERS.to + 12) return null;
  const vis = interpolate(f, [COUNTERS.from, COUNTERS.from + DUR.standard, COUNTERS.to, COUNTERS.to + 12], [0, 1, 1, 0], { ...clamp, easing: move });
  return (
    <AbsoluteFill>
      {PLAYERS.map((p, i) => {
        const s = scoreAt(p, f);
        const c = colorOf(p);
        const done = s.n >= ROUNDS;
        return (
          <div
            key={p}
            style={{
              position: "absolute",
              left: COUNTER_X[p],
              top: COUNTER_Y,
              translate: "-50% -50%",
              opacity: vis,
              scale: interpolate(vis, [0, 1], [0.6, 1], { ...clamp, easing: pop }),
              rotate: `${i ? 1.2 : -1.2}deg`,
              width: 380,
              padding: "10px 0 14px",
              borderRadius: 30,
              background: done ? c : PAPER,
              border: `5px solid ${INK}`,
              boxShadow: `0 6px 0 ${INK}`,
              fontFamily: FONT,
              color: done ? "#fff" : INK,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, background: done ? PAPER : c, border: `3px solid ${INK}` }} />
              {LABEL[p]} · {WHO[p]}
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.08 }}>
              {s.wins} <span style={{ fontSize: 34 }}>wins</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
              {pct(s.rate)} of {s.n.toLocaleString("en-US")}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- notebook chart: win rate vs rounds (log x)

export const EpisodeChart: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [CHART.from, CHART.from + DUR.slow, CHART.to, CHART.to + 14], [0, 1, 1, 0], { ...clamp, easing: move });
  if (k <= 0) return null;
  const n = played(f);
  return (
    <ChartPanel
      title="win rate"
      subtitle={`after ${n.toLocaleString("en-US")} rounds`}
      legend={PLAYERS.map((p) => ({ label: LABEL[p], sub: pct(rateAfter(p, n)), color: colorOf(p) }))}
      legendAt={{ x: 560, y: 52, step: 192, width: 176 }}
      x={{ min: 1, max: ROUNDS, log: true, ticks: [1, 10, 100, 1000], label: (v) => (v === ROUNDS ? `${N} rounds` : String(v)) }}
      y={{ max: 100, ticks: [100 / 3, 200 / 3, 100], label: (v) => (v === 100 ? "100%" : v < 50 ? "1/3" : "2/3") }}
      series={PLAYERS.map((p) => ({ key: p, color: colorOf(p), fn: (x: number) => 100 * rateAfter(p, x), liveUntil: ROUNDS }))}
      progress={n}
      step={1}
      style={{ translate: `0px ${(1 - k) * 700}px` }}
    />
  );
};

// ---------------------------------------------------------------- results: one card per player

export const ResultCards: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const wins = PLAYERS.map((p) => totalWins(p));
  const items = PLAYERS.map((p, i) => ({
    key: p,
    rank: 1 + wins.filter((w) => w > wins[i]).length,
    name: LABEL[p],
    sub: `${WHO[p]} always ${p === "anna" ? "stays" : "switches"}`,
    color: colorOf(p),
    value: { to: wins[i], format: (x: number) => String(Math.round(x)), unit: `/ ${N}` },
    lines: [`wins ${pct(wins[i] / ROUNDS)}`],
    x: i === 0 ? 290 : 790,
    y: 560,
    tilt: i ? 1.4 : -1.4,
    // the loser pops first so the winner lands last
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
    title="Your first pick is right only 1/3 of the time."
    lines={
      <>
        <Mark color="#d9c8ff">Switching</Mark> wins the other <Mark color="#ffd86b">2/3</Mark>.
      </>
    }
    formula={`stay ${totalWins("anna")}/${N} = ${pct(totalWins("anna") / ROUNDS)}  ·  switch ${totalWins("miyu")}/${N} = ${pct(totalWins("miyu") / ROUNDS)}`}
    small={{ text: "Lumi knows where the trophy is: she always opens a duck.", dot: colorOf("miyu") }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="Would you switch?" button="Comment below!" />;

