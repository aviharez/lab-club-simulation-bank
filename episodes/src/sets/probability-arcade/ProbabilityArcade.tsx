// Probability arcade (EP05): the Blender-built GLB (assets/sets/probability-arcade, AO baked to vertex colours) plus
// the live parts: the machine glass, the balls (instanced), path trails, the ball counter, bet tags on the bins, pendant
// spots with haze cones, practical spill lights (neon, crest bulbs, cabinet screens) and dust.
// Everything is a pure function of its props (`time` = world seconds; ball positions, the counter and the tags come
// from the episode timeline).
//   const set = useSetGLB("probability-arcade");      // outside the canvas
//   <SetStage look={ARCADE_LOOK} …><ProbabilityArcade set={set} time={t} font={FONT} balls={…} … /> …actors…</SetStage>
import React, { useMemo } from "react";
import * as THREE from "three";
import { Dust, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";
import { ARCADE, TAG } from "./layout";
import { BallCounter, Balls, BetTag, MachineGlass, PathFan, PathTrail, type BallDraw } from "./props";

export { ARCADE } from "./layout";

const A = ARCADE;
const M = A.machine;

export type ArcadeParts = { glb?: boolean; glass?: boolean; pendants?: boolean; practicals?: boolean; dust?: boolean };
export type Tag = { bin: number; label: string; color: string; swing?: number; glow?: number };
export type Trail = { points: Vec3[]; progress?: number; color?: string; opacity?: number; width?: number };
export type Fan = { paths: Vec3[][]; progress?: number; color?: string; opacity?: number };

export type ArcadeProps = {
  set: LoadedSet | null;
  time: number;
  font: string;
  parts?: ArcadeParts;
  balls?: BallDraw[];
  /** InstancedMesh capacity (the pour size) */
  capacity?: number;
  counter?: number;
  tags?: Tag[];
  trails?: Trail[];
  /** many paths drawn at once as additive lines */
  fans?: Fan[];
  /** 0..1 pendant brightness (dim for the reveal) */
  pendants?: number;
  /** 0..1 glass reflection streaks (lower in board close-ups so the bins read clearly) */
  glassStreak?: number;
  /** 0..1 pendant haze cones (lower in board close-ups) */
  haze?: number;
};

/** A pendant's pool of light: a soft spot straight down (its target lives in the scene so its matrix updates). */
const PendantSpot: React.FC<{ position: Vec3; intensity: number }> = ({ position, intensity }) => {
  const { light, tgt } = useMemo(() => {
    const l = new THREE.SpotLight("#ffc98a", 1, 7, 0.62, 0.85, 1.4);
    const t = new THREE.Object3D();
    l.target = t;
    return { light: l, tgt: t };
  }, []);
  light.position.set(position[0], position[1] - 0.04, position[2]);
  tgt.position.set(position[0], 0, position[2]);
  light.intensity = intensity;
  return (
    <>
      <primitive object={light} />
      <primitive object={tgt} />
    </>
  );
};

/** Neon flicker: a steady sign with rare, short deterministic dips. */
const flicker = (t: number, seed: number) => {
  const k = Math.floor(t * 12 + seed * 7.3);
  const h = Math.abs(Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453) % 1;
  return h > 0.97 ? 0.55 : 1;
};

export const ProbabilityArcade: React.FC<ArcadeProps> = ({ set, time, font, parts = {}, balls = [], capacity = 1000, counter = 0, tags = [], trails = [], fans = [], pendants = 1, glassStreak = 1, haze = 1 }) => {
  const on = { glb: true, glass: true, pendants: true, practicals: true, dust: true, ...parts };
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      <Balls balls={balls} capacity={capacity} />
      {trails.map((tr, k) => (
        <PathTrail key={k} points={tr.points} progress={tr.progress} color={tr.color} opacity={tr.opacity} width={tr.width} />
      ))}
      {fans.map((fa, k) => (
        <PathFan key={k} paths={fa.paths} progress={fa.progress} color={fa.color} opacity={fa.opacity} />
      ))}
      {on.glass ? <MachineGlass streak={glassStreak} /> : null}
      <BallCounter value={counter} font={font} position={[-0.86, M.topY + 0.23, -0.892]} />
      {tags.map((t) => (
        <BetTag key={t.label} label={t.label} color={t.color} font={font} position={[M.binX(t.bin), TAG.clipY, TAG.z]} swing={t.swing} glow={t.glow} scale={TAG.scale} />
      ))}
      {on.pendants
        ? A.pendants.map((p, k) => (
            <React.Fragment key={k}>
              <PendantSpot position={p} intensity={(k < 2 ? 16 : 10) * pendants} />
              <VolumetricCone position={[p[0], p[1] - 0.05, p[2]]} length={p[1] - 0.1} radius={1.35} apexRadius={0.24} color="#ffc27a" intensity={0.22 * pendants * haze} time={time + k * 1.3} noise={0.35} />
            </React.Fragment>
          ))
        : null}
      {on.practicals ? (
        <>
          {/* the board's display lights: a top lamp (off-centre) and a footlight on the plinth, placed so their reflections fall off the glass and no hot spot covers the pegs or stacks */}
          <pointLight position={[-0.7, M.topY + 0.35, M.glassZ + 0.5]} color="#ffd2a0" intensity={1.5} distance={3.4} decay={1.6} />
          <pointLight position={[0, M.plinthY - 0.05, M.glassZ + 0.5]} color="#ffc890" intensity={0.9} distance={2.6} decay={1.6} />
          {/* crest bulbs */}
          <pointLight position={[0, M.topY + 0.9, M.caseBack + 0.4]} color="#ffb860" intensity={1.4} distance={2.4} decay={1.6} />
          {/* neon spill on the back wall */}
          <pointLight position={[-2.75, 3.85, A.room.back + 0.6]} color="#2fd3c4" intensity={2.2 * flicker(time, 1)} distance={3.2} decay={1.5} />
          <pointLight position={[2.75, 3.85, A.room.back + 0.6]} color="#ffa040" intensity={2.0 * flicker(time, 2)} distance={3.0} decay={1.5} />
          {/* cabinet screens */}
          {[...A.cabinetsFG, ...A.cabinetsSide].map((c, k) => (
            <pointLight
              key={k}
              position={[c.pos[0] + Math.sin(c.rotY) * 0.75, 1.3, c.pos[2] + Math.cos(c.rotY) * 0.75]}
              color={k % 2 ? "#ffb060" : "#3fd8cc"}
              intensity={0.6 + 0.08 * Math.sin(time * 9 + k)}
              distance={1.8}
              decay={1.6}
            />
          ))}
        </>
      ) : null}
      {on.dust ? <Dust center={[0, 2.4, 0.4]} size={[7, 4.4, 5]} count={380} seed={505} time={time} pointSize={7} opacity={0.28} speed={0.22} color="#ffe2b8" /> : null}
    </>
  );
};
