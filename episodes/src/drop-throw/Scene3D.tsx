// 3D half of EP03: the sunlit atrium, both balls (data-driven), the replay ghosts with their same-height lines,
// Miyu's stopwatch and the four actors, all posed from the frame.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import { MASCOT_COLORS, type CastMember } from "../kit";
import { SetStage, type LoadedSet } from "../kit/env";
import { Ball, Stopwatch, SUNLIT_ATRIUM_LOOK, SunlitAtrium } from "../sets/sunlit-atrium";
import { camAt } from "./camera";
import { BALL_OWNER, BALL_R, ballAt, BALLS, fmt, type BallId, type Member } from "./data";
import { ACTING, ballState, BEAT, GHOST_WINDOWS, GHOSTS, MIYU, RELEASE_POINT, timerValue, worldTime } from "./timeline";

const colorOf = (b: BallId) => MASCOT_COLORS[BALL_OWNER[b]];
const ghostPos = (b: BallId, t: number): [number, number, number] => {
  const r = RELEASE_POINT[b];
  const s = ballAt(b, t);
  return [r[0] + s.x, BALL_R + s.y, r[2]];
};

/** A dashed segment from a to b (world), drawn on over `k` (0..1). */
const Dashes: React.FC<{ a: [number, number, number]; b: [number, number, number]; k: number; color: string }> = ({ a, b, k, color }) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const n = Math.max(2, Math.round(len / 0.1));
  const yaw = Math.atan2(d[0], d[2]);
  const shown = Math.floor(n * k + 1e-9);
  return (
    <>
      {Array.from({ length: shown }, (_, i) => {
        const u = (i + 0.25) / n;
        return (
          <mesh key={i} position={[a[0] + d[0] * u, a[1] + d[1] * u, a[2] + d[2] * u]} rotation={[0, yaw, 0]}>
            <boxGeometry args={[0.026, 0.026, (len / n) * 0.55]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
};

const Ghosts: React.FC<{ f: number }> = ({ f }) => {
  const w = GHOST_WINDOWS.find(([a, b]) => f >= a && f < b);
  if (!w) return null;
  // in the results window every ghost is already there; fade in/out at the window edges
  const fade = Math.min(1, (w[1] - f) / 10, w[0] === GHOST_WINDOWS[0][0] ? 1 : (f - w[0]) / 10);
  return (
    <>
      {GHOSTS.filter((g) => f >= g.at).map((g) => {
        const age = f - g.at;
        const k = Math.min(1, age / 6);
        const d = ghostPos("dropped", g.t);
        const t = ghostPos("thrown", g.t);
        // the line runs from the dropped ghost to the thrown ghost (same y), a little past both
        const ext = 0.14;
        const dir = [t[0] - d[0], 0, t[2] - d[2]];
        const L = Math.hypot(dir[0], dir[2]) || 1;
        const a: [number, number, number] = [d[0] - (dir[0] / L) * ext, d[1], d[2] - (dir[2] / L) * ext];
        const b: [number, number, number] = [t[0] + (dir[0] / L) * ext, t[1], t[2] + (dir[2] / L) * ext];
        return (
          <group key={g.t}>
            {BALLS.map((ball) => (
              <Ball key={ball} position={ghostPos(ball, g.t)} radius={BALL_R * (0.9 + 0.1 * k)} color={colorOf(ball)} ghost={1 - (0.55 * fade) * k} />
            ))}
            <Dashes a={a} b={b} k={k * fade} color="#3a2c24" />
          </group>
        );
      })}
    </>
  );
};

/** Miyu's stopwatch in her right hand (pocketed when she cheers at the CTA). */
const MIYU_HAND = { fwd: 0.06, right: 0.2, up: 0.4 };
const MiyuStopwatch: React.FC<{ f: number; font: string }> = ({ f, font }) => {
  const st = ACTING("miyu", f);
  const away = Math.min(1, Math.max(0, (f - MIYU.cheer) / 6));
  if (away >= 1) return null;
  const [x, y, z] = st.pos;
  const yaw = st.yaw;
  const p: [number, number, number] = [
    x + MIYU_HAND.fwd * Math.sin(yaw) - MIYU_HAND.right * Math.cos(yaw) + 0.05 * Math.sin(yaw),
    y + MIYU_HAND.up + 0.02,
    z + MIYU_HAND.fwd * Math.cos(yaw) + MIYU_HAND.right * Math.sin(yaw) + 0.05 * Math.cos(yaw),
  ];
  const v = timerValue(f);
  return <Stopwatch position={p} rotation={[-0.2, yaw, 0]} reading={fmt(v)} font={font} sweep={v} scale={1.05 * (1 - away)} />;
};

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, font, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const time = worldTime(f);
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={SUNLIT_ATRIUM_LOOK}>
      <SunlitAtrium set={set} time={time} />
      {BALLS.map((b) => {
        const s = ballState(b, f);
        return <Ball key={b} position={s.pos} radius={BALL_R} color={colorOf(b)} spin={s.spin} />;
      })}
      <Ghosts f={f} />
      {f < BEAT.end ? <MiyuStopwatch f={f} font={font} /> : null}
      {cast.map((c) => {
        const st = ACTING(c.name as Member, f);
        return (
          <group key={c.name} position={st.pos}>
            <Actor meta={c.meta} actor={c.actor} clip={st.clip} time={st.time} blend={st.from} expression={st.expression} yaw={st.yaw} />
          </group>
        );
      })}
    </SetStage>
  );
};
