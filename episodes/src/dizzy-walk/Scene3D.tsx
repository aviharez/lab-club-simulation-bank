// 3D half of EP06: the night plaza, the two walkers and their glowing trails (tile centres from data.ts), Miyu's tapes,
// the 50 ghost walkers (one InstancedMesh) and the growing √n ring, and the four actors, all posed from the frame.
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import { type CastMember } from "../kit";
import { SetStage, type LoadedSet, type LookPreset } from "../kit/env";
import { FloorGlow, FloorRing, FloorTrail, Ghosts, NIGHT_PLAZA_LOOK, NightPlaza, Tape, TapeCase, TILE } from "../sets/night-plaza";
import { camAt, fogAt } from "./camera";
import { ghosts, GHOSTS, LUMI_START, lumiAt, STEPS, tileAt, zuzu, type Member } from "./data";
import { ACTING, BEAT, ghostScale, ghostsVisible, ringRadiusTiles, runAt, tapesAt, trailState, world, worldTime } from "./timeline";

export const ZUZU_YELLOW = "#ffd84a";
export const LUMI_BLUE = "#5f8fe8";

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = worldTime(f);
  const zuzuPts = useMemo(() => zuzu().pos.map((p) => world(p)), []);
  const lumiPts = useMemo(() => [world(LUMI_START), world(lumiAt(STEPS))], []);
  const tr = trailState(f);
  // the drone films from 76 m: trails and the head glow are drawn wider there so they read at phone size
  const wide = f >= BEAT.drone && f < BEAT.tape ? 3.5 : 1;
  const look: LookPreset = useMemo(() => {
    const k = fogAt(f);
    const fog = NIGHT_PLAZA_LOOK.fog;
    return fog && "density" in fog ? { ...NIGHT_PLAZA_LOOK, fog: { ...fog, density: fog.density * k } } : NIGHT_PLAZA_LOOK;
  }, [f]);
  // ghosts: tile position at the run's step progress, a small hop on every step
  const s2 = runAt(f);
  const hop = 0.07 * Math.sin(Math.PI * (s2 - Math.floor(s2)));
  const ghostDraws = ghostsVisible(f)
    ? ghosts().map((g, k) => {
        const p = world(tileAt(g.pos, s2), s2 > 0 && s2 < STEPS ? hop : 0);
        // drawn 1.5x so they read from the overhead camera (size is not data; position is)
        return { pos: p, scale: 1.5 * ghostScale(k, f) };
      })
    : [];
  const ring = ringRadiusTiles(f);
  const tapes = tapesAt(f);
  const zHead = world(tileAt(zuzu().pos, tr.s));
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={look}>
      <NightPlaza set={set} time={t} />
      {tr.show ? (
        <>
          <FloorTrail points={lumiPts} upTo={tr.s / STEPS} color={LUMI_BLUE} width={0.07 * wide} opacity={tr.lumiOpacity} />
          <FloorTrail points={zuzuPts} upTo={tr.s} color={ZUZU_YELLOW} width={0.09 * wide} opacity={tr.zuzuOpacity} />
          <FloorGlow position={zHead} radius={0.34 * wide} color={ZUZU_YELLOW} intensity={0.8 * (tr.zuzuOpacity / 0.85)} />
        </>
      ) : null}
      {tapes.map((x, i) => (
        <Tape key={i} from={x.from} to={x.to} progress={x.progress} width={x.width} />
      ))}
      {f >= BEAT.drone && f < BEAT.twist ? (
        <group position={[0.1, 0.075, 0.12]} rotation={[0, -0.6, 0]}>
          <TapeCase />
        </group>
      ) : null}
      {ghostDraws.length ? <Ghosts ghosts={ghostDraws} capacity={GHOSTS} /> : null}
      {ring > 0 ? <FloorRing radius={ring * TILE} width={0.06} fill={0.05} /> : null}
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

