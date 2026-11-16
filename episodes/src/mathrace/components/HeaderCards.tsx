import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Odometer } from "@/components/remocn/number-wheel";
import { useRace } from "../context.tsx";
import { HEADER, LANE, ROUND_PILL } from "../layout.ts";
import { laneColor, shade } from "../manifest.ts";
import { roundAt } from "../sim.ts";
import { CARD, FONT, INK, INK_SOFT, MathText } from "../theme.tsx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const COUNT_FRAMES = 12;

/** Value of a per-round stat, rolling from the previous round's value over COUNT_FRAMES. */
const useRoundStat = (lane: 0 | 1, pick: "balls" | "power") => {
  const frame = useCurrentFrame();
  const { tl } = useRace();
  const r = roundAt(tl, frame);
  if (!r) return 0;
  const prev = r.n > 1 ? tl.rounds[r.n - 2].lanes[lane][pick] : 0;
  const cur = r.lanes[lane][pick];
  return interpolate(frame, [r.start, r.start + COUNT_FRAMES], [prev, cur], clamp);
};

const Stat: React.FC<{ label: string; lane: 0 | 1; pick: "balls" | "power"; note?: string }> = ({ label, lane, pick, note }) => {
  const v = useRoundStat(lane, pick);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: INK_SOFT, letterSpacing: "0.04em" }}>
        {label}
        {note && <span style={{ fontSize: 18, marginLeft: 6 }}>{note}</span>}
      </div>
      <Odometer current={v} fontSize={46} color={INK} />
    </div>
  );
};

const Card: React.FC<{ lane: 0 | 1 }> = ({ lane }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ep, tl } = useRace();
  const cfg = ep.race.lanes[lane];
  const color = laneColor(cfg.character);
  const enter = spring({ frame: frame - 2 - lane * 4, fps, config: { damping: 14, stiffness: 140 } });
  const r = roundAt(tl, frame);
  const capped = r && r.lanes[lane].balls > r.lanes[lane].visibleBalls;
  return (
    <div
      style={{
        position: "absolute",
        left: LANE.x(lane),
        top: HEADER.top,
        width: LANE.width,
        height: HEADER.height,
        background: CARD,
        borderRadius: 32,
        border: `4px solid ${color}`,
        boxShadow: "0 2px 0 rgba(43,33,24,0.08)",
        padding: "22px 30px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        translate: `${(1 - enter) * (lane === 0 ? -520 : 520)}px 0px`,
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.05 }}>
        <span style={{ color: shade(color, lane === 1 ? 0.35 : 0.1) }}>{cfg.displayName.toUpperCase()}</span> picks{" "}
        <MathText text={cfg.rule.label} />
      </div>
      <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 500, color: INK_SOFT }}>{cfg.tagline}</div>
      <div style={{ display: "flex", gap: 34, marginTop: 8 }}>
        <Stat label="BALLS" lane={lane} pick="balls" note={capped ? `(${r!.lanes[lane].visibleBalls} shown)` : undefined} />
        <Stat label="POWER" lane={lane} pick="power" />
      </div>
    </div>
  );
};

export const HeaderCards: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vs = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 160 } });
  return (
    <>
      <Card lane={0} />
      <Card lane={1} />
      <div
        style={{
          position: "absolute",
          left: 540 - 56,
          top: HEADER.top + HEADER.height / 2 - 56,
          width: 112,
          height: 112,
          borderRadius: 56,
          background: INK,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 46,
          border: "6px solid #fff8ef",
          scale: `${vs}`,
        }}
      >
        VS
      </div>
    </>
  );
};

/** Center pill between the mascots: current round number with a pop on every new round. */
export const RoundPill: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tl } = useRace();
  const r = roundAt(tl, frame);
  const pop = r ? spring({ frame: frame - r.start, fps, config: { damping: 8, stiffness: 220 } }) : 1;
  const enter = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 120,
        top: ROUND_PILL.cy - 80,
        width: 240,
        height: 160,
        borderRadius: 36,
        background: "#ffffff",
        border: `4px solid ${INK}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        color: INK,
        scale: `${enter}`,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600, color: INK_SOFT }}>{r ? "ROUND" : "GET READY"}</div>
      <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, scale: `${interpolate(pop, [0, 1], [1.5, 1])}` }}>
        {r ? (
          <>
            n = {r.n}
          </>
        ) : (
          "?"
        )}
      </div>
    </div>
  );
};
