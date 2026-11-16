// 2D overlays for "Same Jump, Different Planets". Every element is frame-driven; 3D anchors are projected
// with the same camera function the 3D rig uses, so billboards stick to the mascots.
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { MangaSymbol } from "../mathrace/components/MangaSymbol";
import { CHAMBER, chamberX, project, type CamState } from "../sets/lab/layout";
import { camAt } from "./camera";
import { airtime, fmt2, heightAt, peakHeight, PLANETS, ranked, V0_LABEL } from "./physics";
import { ACTING, BEAT, CAPTIONS, COUNTDOWN, jumpHeightAt, landFrame, peakFrame, RESULT_POPS, simTime, SLOWMO, SLOWMO_END, type Caption } from "./timeline";
import { DUR, EASE, FONT, INK, INK_SOFT, PAPER, SAFE } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = Easing.bezier(...EASE.pop);
const move = Easing.bezier(...EASE.move);
const exitE = Easing.bezier(...EASE.exit);

export type CastColors = string[];

const useProjector = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam: CamState = camAt(f);
  return (p: [number, number, number]) => project(cam, p, width, height);
};

/** Pixels per metre at a world point (for billboards that scale with the camera). */
const pxPerM = (proj: ReturnType<typeof useProjector>, p: [number, number, number]) => {
  const a = proj(p);
  const b = proj([p[0], p[1] + 1, p[2]]);
  return Math.abs(a.y - b.y);
};

// ---------------------------------------------------------------- caption pill (top)

const CaptionPill: React.FC<{ c: Caption }> = ({ c }) => {
  const frame = useCurrentFrame(); // local to the caption's Sequence
  const len = c.to - c.from;
  const big = c.text === "GO!";
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 50,
          width: 980,
          top: SAFE.top + 12,
          height: 108,
          borderRadius: 54,
          background: big ? "#ffd86b" : PAPER,
          border: `5px solid ${INK}`,
          boxShadow: `0 7px 0 ${INK}`,
          translate: interpolate(frame, [0, DUR.standard, len - DUR.quick, len], ["0px -26px", "0px 0px", "0px 0px", "0px -18px"], { ...clamp, easing: move }),
          scale: interpolate(frame, [0, DUR.standard], [0.86, 1], { ...clamp, easing: pop }),
          opacity: interpolate(frame, [0, 4, len - 5, len], [0, 1, 1, 0], clamp),
        }}
      >
        <SpringScaleIn text={c.text} fontFamily={FONT} fontSize={big ? 72 : c.text.length > 30 ? 46 : 52} fontWeight={700} color={INK} staggerDelay={2} />
      </div>
      {c.sticker ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 640,
            translate: "-50% 0",
            padding: "10px 30px",
            borderRadius: 22,
            background: "#ff8fa8",
            border: `5px solid ${INK}`,
            boxShadow: `0 6px 0 ${INK}`,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 72,
            color: "#fff",
            rotate: "-6deg",
            // slap: anticipation (big), overshoot, settle
            scale: interpolate(frame - (c.sticker.at - c.from), [0, 5, 9, 13], [1.7, 0.92, 1.05, 1], { ...clamp, easing: Easing.out(Easing.quad) }),
            opacity: interpolate(frame - (c.sticker.at - c.from), [0, 3], [0, 1], clamp),
          }}
        >
          {c.sticker.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => (
  <>
    {CAPTIONS.map((c) => (
      <Sequence key={c.text} name={`Caption: ${c.text}`} from={c.from} durationInFrames={c.to - c.from} layout="none">
        <CaptionPill c={c} />
      </Sequence>
    ))}
  </>
);

// ---------------------------------------------------------------- countdown 3-2-1 above the chambers

export const Countdown: React.FC = () => {
  const f = useCurrentFrame();
  const cur = [...COUNTDOWN].reverse().find((c) => f >= c.at);
  if (!cur || f > BEAT.takeoff + 24 || f < BEAT.countdown) return null;
  const age = f - cur.at;
  const isGo = cur.n === "JUMP!";
  const life = isGo ? 24 : 18;
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 520,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: isGo ? 190 : 300,
          lineHeight: 1,
          color: isGo ? "#ffd86b" : "#ffffff",
          WebkitTextStroke: `10px ${INK}`,
          paintOrder: "stroke fill",
          textShadow: `0 12px 0 ${INK}`,
          scale: interpolate(age, [0, DUR.standard, life - 4, life], [0.35, 1, 1, 0.75], { ...clamp, easing: pop }),
          rotate: isGo ? `${interpolate(age, [0, DUR.standard], [-8, -3], clamp)}deg` : "0deg",
          opacity: interpolate(age, [0, 3, life - 4, life], [0, 1, 1, 0], clamp),
        }}
      >
        {cur.n}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2x SLOW-MO badge

export const SlowMoBadge: React.FC = () => {
  const f = useCurrentFrame();
  const a = BEAT.takeoff;
  const b = SLOWMO_END;
  if (f < a || f > b + 10) return null;
  const blink = 0.55 + 0.45 * Math.cos(((f - a) / 30) * Math.PI * 2);
  return (
    <div
      style={{
        position: "absolute",
        right: 50,
        top: SAFE.top + 140,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 26px 12px 20px",
        borderRadius: 999,
        background: INK,
        color: "#fff",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: 1,
        translate: interpolate(f, [a, a + DUR.standard], ["220px 0px", "0px 0px"], { ...clamp, easing: move }),
        scale: interpolate(f, [b, b + 10], [1, 0.7], { ...clamp, easing: exitE }),
        opacity: interpolate(f, [a, a + 4, b, b + 10], [0, 1, 1, 0], clamp),
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ff7a8a", opacity: blink }} />
      <svg width={40} height={26} viewBox="0 0 40 26">
        <path d="M2 2 L18 13 L2 24 Z M20 2 L36 13 L20 24 Z" fill="#ffd86b" />
      </svg>
      {`${SLOWMO}x SLOW-MO`}
    </div>
  );
};

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

export const HeightReadouts: React.FC<{ colors: CastColors }> = ({ colors }) => {
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
        const liveOpacity = interpolate(f, [BEAT.takeoff - 8, BEAT.takeoff - 2, land + 20, land + 30], [0, 1, 1, 0], clamp);
        const peak = peakHeight(p.g);
        const pf = peakFrame(p.id);
        // MAX tag: at the marker bar for big jumps, floating above the head when the bar hides behind the body
        const low = peak < 1.1;
        const tag = proj([x, CHAMBER.floorY + (low ? 1.95 : peak + 0.16), 0.4]);
        const tagAge = f - pf;
        const onScreen = (q: { x: number; visible: boolean }) => q.visible && q.x > -80 && q.x < width + 80;
        return (
          <React.Fragment key={p.id}>
            {liveOpacity > 0 && onScreen(head) ? (
              <div style={{ ...pill(colors[i], 34), left: head.x, top: head.y, opacity: liveOpacity, border: `4px solid ${INK}` }}>{fmt2(shown)} m</div>
            ) : null}
            {tagAge >= 0 && f < BEAT.results + 10 && onScreen(tag) ? (
              <div
                style={{
                  ...pill("#ffffff", 28),
                  left: tag.x,
                  top: tag.y,
                  color: INK,
                  border: `4px solid ${colors[i]}`,
                  scale: interpolate(tagAge, [0, DUR.standard], [0.4, 1], { ...clamp, easing: pop }),
                  // step aside (fade) while the live readout passes through the tag
                  opacity:
                    interpolate(f, [pf, pf + 3, BEAT.results, BEAT.results + 10], [0, 1, 1, 0], clamp) *
                    (liveOpacity > 0 ? interpolate(Math.abs(tag.y - head.y), [34, 70], [0.12, 1], clamp) : 1),
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

const Zzz: React.FC<{ x: number; y: number; size: number; from: number }> = ({ x, y, size, from }) => {
  const f = useCurrentFrame();
  const age = f - from;
  if (age < 0) return null;
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = ((age + k * 20) % 60) / 60; // each Z rises and fades on a 60-frame loop (slowed world)
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x + t * size * 0.7,
              top: y - t * size * 1.3,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: size * (0.45 + 0.25 * t),
              color: "#d9c6ff",
              WebkitTextStroke: `${Math.max(3, size * 0.06)}px ${INK}`,
              paintOrder: "stroke fill",
              rotate: `${-12 + t * 18}deg`,
              opacity: Math.min(1, age / 6) * interpolate(t, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
              translate: "-50% -50%",
            }}
          >
            Z
          </div>
        );
      })}
    </>
  );
};

export const MangaSymbols: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  return (
    <AbsoluteFill>
      {PLANETS.map((p, i) => {
        const st = ACTING[p.id](f, { x: chamberX(i) });
        const [x, y, z] = st.pos;
        const anchor: [number, number, number] = [x + 0.38, y + 1.05, z + 0.3];
        const q = proj(anchor);
        if (!q.visible) return null;
        const s = Math.min(150, Math.max(60, pxPerM(proj, anchor) * 0.5));
        return st.symbols.map((sym) =>
          sym.kind === "zzz" ? (
            <Zzz key={sym.kind} x={q.x} y={q.y} size={s * 1.1} from={sym.from} />
          ) : (
            <MangaSymbol key={sym.kind} kind={sym.kind} x={sym.kind === "sweat" ? q.x - s * 0.1 : q.x} y={q.y} size={s} from={sym.from} />
          ),
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- notebook chart: height vs time

const CH = { left: 60, top: 1322, width: 960, height: 290 };
const PLOT = { x0: 120, x1: 930, y0: 246, y1: 112, tMax: 4, hMax: 3.2 };

export const ChartPanel: React.FC<{ colors: CastColors }> = ({ colors }) => {
  const f = useCurrentFrame();
  const enter = 18;
  const exit = BEAT.reveal;
  if (f > exit + 16) return null;
  const t = Math.min(PLOT.tMax, Math.max(0, simTime(f)));
  const sx = (s: number) => PLOT.x0 + (s / PLOT.tMax) * (PLOT.x1 - PLOT.x0);
  const sy = (h: number) => PLOT.y0 - (h / PLOT.hMax) * (PLOT.y0 - PLOT.y1);
  const started = f >= BEAT.takeoff;
  return (
    <div
      style={{
        position: "absolute",
        left: CH.left,
        top: CH.top,
        width: CH.width,
        height: CH.height,
        // in for the hook (g values help the guess), out of Lumi's way during setup, back for the countdown
        translate: interpolate(
          f,
          [enter, enter + DUR.slow, BEAT.setup, BEAT.setup + 12, BEAT.countdown - 14, BEAT.countdown + 6, exit, exit + 14],
          ["0px 700px", "0px 0px", "0px 0px", "0px 700px", "0px 700px", "0px 0px", "0px 0px", "0px 700px"],
          { ...clamp, easing: move },
        ),
        rotate: "-0.6deg",
      }}
    >
      <svg width={CH.width} height={CH.height} viewBox={`0 0 ${CH.width} ${CH.height}`} style={{ overflow: "visible" }}>
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0 L0 0 0 24" fill="none" stroke="#cfe0f3" strokeWidth={1.5} />
          </pattern>
        </defs>
        {/* paper */}
        <rect x={0} y={10} width={CH.width} height={CH.height - 10} rx={26} fill={INK} />
        <rect x={0} y={0} width={CH.width} height={CH.height - 10} rx={26} fill="#fffdf6" stroke={INK} strokeWidth={5} />
        <rect x={6} y={40} width={CH.width - 12} height={CH.height - 56} fill="url(#grid)" />
        <line x1={92} y1={36} x2={92} y2={CH.height - 18} stroke="#f2a3b3" strokeWidth={3} />
        {/* spiral binding */}
        {Array.from({ length: 15 }, (_, k) => (
          <g key={k}>
            <circle cx={50 + k * 62} cy={22} r={9} fill="#f4ede3" stroke={INK} strokeWidth={3.5} />
            <path d={`M ${50 + k * 62} 22 L ${50 + k * 62} -8`} stroke={INK_SOFT} strokeWidth={4} strokeLinecap="round" />
          </g>
        ))}
        {/* title + legend with g values */}
        <text x={110} y={78} fontFamily={FONT} fontWeight={700} fontSize={30} fill={INK}>
          height vs time
        </text>
        <text x={110} y={102} fontFamily={FONT} fontWeight={500} fontSize={20} fill={INK_SOFT}>
          {`v = ${V0_LABEL} m/s for all · real seconds`}
        </text>
        {PLANETS.map((p, i) => (
          <g key={p.id} transform={`translate(${372 + i * 142}, 62)`}>
            <rect x={0} y={0} width={132} height={44} rx={22} fill={colors[i]} stroke={INK} strokeWidth={3} />
            <text x={66} y={20} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} fill="#fff">
              {p.name.toUpperCase()}
            </text>
            <text x={66} y={38} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={17} fill="#fff">
              {`g = ${p.g}`}
            </text>
          </g>
        ))}
        {/* axes */}
        <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x1 + 10} y2={PLOT.y0} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1 + 12} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        {[0, 1, 2, 3, 4].map((s) => (
          <text key={s} x={sx(s)} y={PLOT.y0 + 26} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={20} fill={INK_SOFT}>
            {s === 4 ? "4 s" : s}
          </text>
        ))}
        {[1, 2, 3].map((m) => (
          <g key={m}>
            <line x1={PLOT.x0 - 6} y1={sy(m)} x2={PLOT.x0 + 6} y2={sy(m)} stroke={INK} strokeWidth={3} />
            <text x={PLOT.x0 - 12} y={sy(m) + 7} textAnchor="end" fontFamily={FONT} fontWeight={600} fontSize={20} fill={INK_SOFT}>
              {`${m} m`}
            </text>
          </g>
        ))}
        {/* curves, drawn up to the current simulated time */}
        {started
          ? PLANETS.map((p, i) => {
              const pts: string[] = [];
              const step = 0.01;
              for (let s = 0; s <= t + 1e-9; s += step) pts.push(`${sx(s).toFixed(1)},${sy(heightAt(p.g, s)).toFixed(1)}`);
              pts.push(`${sx(t).toFixed(1)},${sy(heightAt(p.g, t)).toFixed(1)}`);
              const live = t < airtime(p.g);
              return (
                <g key={p.id}>
                  <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={0.18} />
                  <polyline points={pts.join(" ")} fill="none" stroke={colors[i]} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
                  {t <= PLOT.tMax && (live || simTime(f) < PLOT.tMax) ? (
                    <circle cx={sx(t)} cy={sy(heightAt(p.g, t))} r={live ? 10 : 6} fill={colors[i]} stroke={INK} strokeWidth={3} />
                  ) : null}
                </g>
              );
            })
          : null}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- results: ranked cards above the chambers

const NAMES: Record<string, string> = { miyu: "Miyu", anna: "Anna", lumi: "Lumi", zuzu: "Zuzu" };

export const ResultCards: React.FC<{ colors: CastColors }> = ({ colors }) => {
  const f = useCurrentFrame();
  const proj = useProjector();
  if (f < BEAT.results || f > BEAT.reveal + 12) return null;
  const order = ranked(); // highest first
  return (
    <AbsoluteFill>
      {order.map((p, rank) => {
        const i = PLANETS.findIndex((q) => q.id === p.id);
        const popAt = RESULT_POPS[3 - rank]; // #4 first … #1 last
        const age = f - popAt;
        if (age < 0) return null;
        const a = proj([chamberX(i), 3.05, 0.6]);
        const h = peakHeight(p.g);
        const count = interpolate(age, [2, 20], [0, h], { ...clamp, easing: Easing.out(Easing.cubic) });
        const out = BEAT.reveal - (3 - rank) * 3;
        const first = rank === 0;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: a.x,
              top: a.y,
              width: 232,
              translate: "-50% -50%",
              scale: `${interpolate(age, [0, DUR.standard], [0.3, first ? 1.08 : 1], { ...clamp, easing: pop }) * interpolate(f, [out, out + 8], [1, 0.4], { ...clamp, easing: exitE })}`,
              rotate: `${interpolate(age, [0, DUR.standard], [-10, (i - 1.5) * 1.6], { ...clamp, easing: pop })}deg`,
              opacity: interpolate(f, [popAt, popAt + 3, out, out + 8], [0, 1, 1, 0], clamp),
              fontFamily: FONT,
              color: INK,
            }}
          >
            <div
              style={{
                background: PAPER,
                border: `5px solid ${INK}`,
                boxShadow: `0 8px 0 ${INK}`,
                borderRadius: 30,
                padding: "40px 10px 16px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -38,
                  left: "50%",
                  translate: "-50% 0",
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  background: colors[i],
                  border: `5px solid ${INK}`,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                #{rank + 1}
              </div>
              <div style={{ fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{NAMES[p.mascot]}</div>
              <div style={{ fontWeight: 600, fontSize: 22, color: INK_SOFT }}>{p.name}</div>
              <div style={{ fontWeight: 700, fontSize: 54, lineHeight: 1.15, color: colors[i], fontVariantNumeric: "tabular-nums", WebkitTextStroke: `1.5px ${INK}` }}>
                {fmt2(count)}
                <span style={{ fontSize: 30 }}> m</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 24, fontVariantNumeric: "tabular-nums" }}>air {fmt2(airtime(p.g))} s</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reveal card + CTA

const moon = PLANETS[0];
const earth = PLANETS[2];
const G_RATIO = earth.g / moon.g;
const H_RATIO = peakHeight(moon.g) / peakHeight(earth.g);

export const RevealCard: React.FC = () => {
  const frame = useCurrentFrame(); // local to its Sequence
  const { durationInFrames } = useVideoConfig();
  const len = durationInFrames;
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 140,
          width: 960,
          padding: "30px 34px 28px",
          borderRadius: 40,
          background: PAPER,
          border: `6px solid ${INK}`,
          boxShadow: `0 10px 0 ${INK}`,
          fontFamily: FONT,
          color: INK,
          textAlign: "center",
          translate: interpolate(frame, [0, DUR.slow, len - 8, len], ["0px 70px", "0px 0px", "0px 0px", "0px -50px"], { ...clamp, easing: frame < len - 8 ? move : exitE }),
          scale: interpolate(frame, [0, DUR.slow], [0.9, 1], { ...clamp, easing: pop }),
          opacity: interpolate(frame, [0, 5, len - 8, len], [0, 1, 1, 0], clamp),
        }}
      >
        <div style={{ position: "relative", height: 76 }}>
          <SpringScaleIn text="Same push, different gravity." fontFamily={FONT} fontSize={56} fontWeight={700} color={INK} staggerDelay={3} />
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.12,
            scale: interpolate(frame, [16, 16 + DUR.standard], [0.6, 1], { ...clamp, easing: pop }),
            opacity: interpolate(frame, [16, 20], [0, 1], clamp),
          }}
        >
          <span style={{ background: "#d9c6ff", padding: "0 14px", borderRadius: 16 }}>6x weaker</span> gravity
          <br />→ <span style={{ background: "#ffd86b", padding: "0 14px", borderRadius: 16 }}>6x higher</span> jump.
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            fontWeight: 600,
            color: INK_SOFT,
            fontVariantNumeric: "tabular-nums",
            translate: interpolate(frame, [34, 34 + DUR.standard], ["0px 16px", "0px 0px"], { ...clamp, easing: move }),
            opacity: interpolate(frame, [34, 40], [0, 1], clamp),
          }}
        >
          {`h = v² / 2g  ·  Earth ${earth.g} ÷ Moon ${moon.g} = ${fmt2(G_RATIO)}x  ·  ${fmt2(peakHeight(moon.g))} m ÷ ${fmt2(peakHeight(earth.g))} m = ${fmt2(H_RATIO)}x`}
        </div>
        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: `3px dashed #e6d9c8`,
            fontSize: 30,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            translate: interpolate(frame, [70, 70 + DUR.standard], ["0px 16px", "0px 0px"], { ...clamp, easing: move }),
            opacity: interpolate(frame, [70, 76], [0, 1], clamp),
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 11, background: "#f2bf3b", border: `3px solid ${INK}`, display: "inline-block" }} />
          Real Jupiter has no ground. Zuzu would just sink.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CtaCard: React.FC = () => {
  const frame = useCurrentFrame(); // local to its Sequence
  const wob = Math.sin(frame / 9) * 1.5; // ambient breathing
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 150,
          padding: "30px 50px 34px",
          borderRadius: 44,
          background: "#ffd86b",
          border: `6px solid ${INK}`,
          boxShadow: `0 10px 0 ${INK}`,
          fontFamily: FONT,
          color: INK,
          textAlign: "center",
          scale: interpolate(frame, [0, DUR.standard], [0.4, 1], { ...clamp, easing: pop }),
          rotate: `${interpolate(frame, [0, DUR.standard], [-8, -2], { ...clamp, easing: pop }) + wob * 0.4}deg`,
          opacity: interpolate(frame, [0, 4], [0, 1], clamp),
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>Which planet next?</div>
        <div
          style={{
            marginTop: 16,
            display: "inline-block",
            padding: "8px 30px",
            borderRadius: 999,
            background: INK,
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
            scale: interpolate(frame, [12, 12 + DUR.standard], [0.5, 1], { ...clamp, easing: pop }),
            opacity: interpolate(frame, [12, 16], [0, 1], clamp),
          }}
        >
          Comment below!
        </div>
      </div>
    </AbsoluteFill>
  );
};
