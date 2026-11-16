// 2D overlays for "Same Jump, Different Planets": thin adapters that feed EP01's timeline into the shared
// kit components (src/kit/overlays). Only HeightReadouts is specific to this episode.
// 3D anchors are projected with the same camera function the 3D rig uses, so billboards stick to the mascots.
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MASCOT_NAMES } from "../kit/cast";
import {
  Badge,
  CaptionPills,
  ChartPanel,
  Countdown,
  CtaCard,
  Mark,
  MangaSymbols as KitMangaSymbols,
  ResultCards as KitResultCards,
  RevealCard as KitRevealCard,
  type Projector,
} from "../kit/overlays";
import { clamp, move, pop } from "../kit/motion";
import { DUR, FONT, INK } from "../kit/theme";
import { CHAMBER, chamberX, project, type CamState } from "../sets/lab/layout";
import { camAt } from "./camera";
import {
  airtime,
  fmt2,
  heightAt,
  peakHeight,
  PLANETS,
  ranked,
  V0_LABEL,
} from "./physics";
import {
  ACTING,
  BEAT,
  CAPTIONS,
  COUNTDOWN,
  jumpHeightAt,
  landFrame,
  peakFrame,
  RESULT_POPS,
  simTime,
  SLOWMO,
  SLOWMO_END,
} from "./timeline";

export type CastColors = string[];

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam: CamState = camAt(f);
  return (p) => project(cam, p, width, height);
};

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const EpisodeCountdown: React.FC = () => (
  <Countdown steps={COUNTDOWN} from={BEAT.countdown} to={BEAT.takeoff + 24} />
);

export const SlowMoBadge: React.FC = () => (
  <Badge
    text={`${SLOWMO}x SLOW-MO`}
    from={BEAT.takeoff}
    to={SLOWMO_END}
    icon="slowmo"
    dot
  />
);

// ---------------------------------------------------------------- live height readouts + MAX tags

const pill = (bg: string, fontSize: number): React.CSSProperties => ({
  position: "absolute",
  padding: "4px 16px",
  borderRadius: 999,
  background: bg,
  border: `4px solid ${INK}`,
  color: "#fff",
  fontFamily: FONT,
  fontWeight: 700,
  fontSize,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  translate: "-50% -50%",
});

export const HeightReadouts: React.FC<{ colors: CastColors }> = ({
  colors,
}) => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const { width } = useVideoConfig();
  if (f < BEAT.takeoff - 8 || f > BEAT.reveal) return null;
  return (
    <AbsoluteFill>
      {PLANETS.map((p, i) => {
        const x = chamberX(i);
        const h = jumpHeightAt(p.id, f);
        const head = proj([x, CHAMBER.floorY + h + 1.22, 0.3]);
        // the number counts up while rising and ends exactly on the analytic apex h = v²/2g
        const shown = f >= peakFrame(p.id) ? peakHeight(p.g) : h;
        const land = landFrame(p.id);
        const liveOpacity = interpolate(
          f,
          [BEAT.takeoff - 8, BEAT.takeoff - 2, land + 20, land + 30],
          [0, 1, 1, 0],
          clamp,
        );
        const peak = peakHeight(p.g);
        const pf = peakFrame(p.id);
        // MAX tag: at the marker bar for big jumps, floating above the head when the bar hides behind the body
        const low = peak < 1.1;
        const tag = proj([x, CHAMBER.floorY + (low ? 1.95 : peak + 0.16), 0.4]);
        const tagAge = f - pf;
        const onScreen = (q: { x: number; visible: boolean }) =>
          q.visible && q.x > -80 && q.x < width + 80;
        return (
          <React.Fragment key={p.id}>
            {liveOpacity > 0 && onScreen(head) ? (
              <div
                style={{
                  ...pill(colors[i], 34),
                  left: head.x,
                  top: head.y,
                  opacity: liveOpacity,
                  border: `4px solid ${INK}`,
                }}
              >
                {fmt2(shown)} m
              </div>
            ) : null}
            {tagAge >= 0 && f < BEAT.results + 10 && onScreen(tag) ? (
              <div
                style={{
                  ...pill("#ffffff", 28),
                  left: tag.x,
                  top: tag.y,
                  color: INK,
                  border: `4px solid ${colors[i]}`,
                  scale: interpolate(tagAge, [0, DUR.standard], [0.4, 1], {
                    ...clamp,
                    easing: pop,
                  }),
                  // step aside (fade) while the live readout passes through the tag
                  opacity:
                    interpolate(
                      f,
                      [pf, pf + 3, BEAT.results, BEAT.results + 10],
                      [0, 1, 1, 0],
                      clamp,
                    ) *
                    (liveOpacity > 0
                      ? interpolate(
                          Math.abs(tag.y - head.y),
                          [34, 70],
                          [0.12, 1],
                          clamp,
                        )
                      : 1),
                }}
              >
                MAX {fmt2(peak)} m
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- manga symbols (billboards above heads)

export const MangaSymbols: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const items = PLANETS.map((p, i) => {
    const st = ACTING[p.id](f, { x: chamberX(i) });
    const [x, y, z] = st.pos;
    return {
      key: p.id,
      anchor: [x + 0.38, y + 1.05, z + 0.3] as [number, number, number],
      symbols: st.symbols,
    };
  });
  return <KitMangaSymbols project={proj} items={items} />;
};

// ---------------------------------------------------------------- notebook chart: height vs time

export const EpisodeChart: React.FC<{ colors: CastColors }> = ({ colors }) => {
  const f = useCurrentFrame();
  const enter = 18;
  const exit = BEAT.reveal;
  if (f > exit + 16) return null;
  const tMax = 4;
  return (
    <ChartPanel
      title="height vs time"
      subtitle={`v = ${V0_LABEL} m/s for all · real seconds`}
      legend={PLANETS.map((p, i) => ({
        label: p.name.toUpperCase(),
        sub: `g = ${p.g}`,
        color: colors[i],
      }))}
      x={{
        max: tMax,
        ticks: [0, 1, 2, 3, 4],
        label: (s) => (s === 4 ? "4 s" : String(s)),
      }}
      y={{ max: 3.2, ticks: [1, 2, 3], label: (m) => `${m} m` }}
      series={PLANETS.map((p, i) => ({
        key: p.id,
        color: colors[i],
        fn: (s) => heightAt(p.g, s),
        liveUntil: airtime(p.g),
      }))}
      progress={simTime(f)}
      started={f >= BEAT.takeoff}
      style={{
        // in for the hook (g values help the guess), out of Lumi's way during setup, back for the countdown
        translate: interpolate(
          f,
          [
            enter,
            enter + DUR.slow,
            BEAT.setup,
            BEAT.setup + 12,
            BEAT.countdown - 14,
            BEAT.countdown + 6,
            exit,
            exit + 14,
          ],
          [
            "0px 700px",
            "0px 0px",
            "0px 0px",
            "0px 700px",
            "0px 700px",
            "0px 0px",
            "0px 0px",
            "0px 700px",
          ],
          { ...clamp, easing: move },
        ),
      }}
    />
  );
};

// ---------------------------------------------------------------- results: ranked cards above the chambers

export const ResultCards: React.FC<{ colors: CastColors }> = ({ colors }) => {
  const f = useCurrentFrame();
  const proj = useProjector();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const items = ranked().map((p, rank) => {
    const i = PLANETS.findIndex((q) => q.id === p.id);
    const a = proj([chamberX(i), 3.05, 0.6]);
    return {
      key: p.id,
      rank: rank + 1,
      name: MASCOT_NAMES[p.mascot],
      sub: p.name,
      color: colors[i],
      value: { to: peakHeight(p.g), format: fmt2, unit: "m" },
      lines: [`air ${fmt2(airtime(p.g))} s`],
      x: a.x,
      y: a.y,
      tilt: (i - 1.5) * 1.6,
      popAt: RESULT_POPS[3 - rank], // #4 first … #1 last
      outAt: BEAT.reveal - (3 - rank) * 3,
    };
  });
  return (
    <AbsoluteFill>
      <KitResultCards items={items} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal card + CTA

const moon = PLANETS[0];
const earth = PLANETS[2];
const G_RATIO = earth.g / moon.g;
const H_RATIO = peakHeight(moon.g) / peakHeight(earth.g);

export const RevealCard: React.FC = () => (
  <KitRevealCard
    title="Same push, different gravity."
    lines={
      <>
        <Mark color="#d9c6ff">6x weaker</Mark> gravity
        <br />→ <Mark color="#ffd86b">6x higher</Mark> jump.
      </>
    }
    formula={`h = v² / 2g  ·  Earth ${earth.g} ÷ Moon ${moon.g} = ${fmt2(G_RATIO)}x  ·  ${fmt2(peakHeight(moon.g))} m ÷ ${fmt2(peakHeight(earth.g))} m = ${fmt2(H_RATIO)}x`}
    small={{
      text: "Real Jupiter has no ground. Zuzu would just sink.",
      dot: "#f2bf3b",
    }}
  />
);

export const EpisodeCta: React.FC = () => <CtaCard text="Which planet next?" />;
