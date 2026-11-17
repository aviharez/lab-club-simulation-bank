// Lookdev stills for night-plaza (EP06's set):
//   frame 0 wide · 1 three-quarter (sample trails, ghosts and the √n ring) · 2 close-up: dizzy Zuzu on the start ring,
//   Anna smug beside her, Miyu with the tape, a trail behind them
// Render: npm run lookdev:night-plaza  → out/lookdev/night-plaza/
import React, { useMemo } from "react";
import { Actor } from "../../actors/Actor";
import { useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot, type Vec3 } from "../../kit/env";
import { seeded } from "../../kit/random";
import { tileWorld, TILE } from "./layout";
import { NightPlaza } from "./NightPlaza";
import { NIGHT_PLAZA_LOOK } from "./look";
import { FloorGlow, FloorRing, FloorTrail, Ghosts, Tape } from "./props";

export const NIGHT_PLAZA_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [1.5, 3.6, 16.2], target: [-0.6, 2.6, -16], fov: 50 },
  threeQuarter: { pos: [6.8, 5.6, 7.4], target: [-0.6, 0.2, -2.4], fov: 46 },
  closeUp: { pos: [0.55, 1.15, 3.0], target: [0.0, 0.62, 0.1], fov: 40 },
};

/** a sample lattice walk (lookdev only; the episode's walks live in src/dizzy-walk/data.ts) */
const sampleWalk = (seed: number, n: number): [number, number][] => {
  const r = seeded(seed);
  const D: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const p: [number, number][] = [[0, 0]];
  for (let k = 0; k < n; k++) {
    const d = D[Math.floor(r() * 4)];
    const [x, y] = p[p.length - 1];
    p.push([x + d[0], y + d[1]]);
  }
  return p;
};

type Pose = { pos: Vec3; clip: string; t: number; expr: string; yaw: number };
const POSES: Record<LookdevShot, Record<string, Pose>> = {
  wide: {
    zuzu: { pos: tileWorld(-2, -1), clip: "walk", t: 0.4, expr: "dizzy", yaw: -1.2 },
    lumi: { pos: tileWorld(0, 30), clip: "walk", t: 0.9, expr: "neutral", yaw: Math.PI },
    anna: { pos: [-0.9, 0, 1.1], clip: "idle", t: 2.0, expr: "smug", yaw: 0.3 },
    miyu: { pos: [0.95, 0, 1.0], clip: "idle", t: 4.0, expr: "squint", yaw: -0.3 },
  },
  threeQuarter: {
    zuzu: { pos: tileWorld(3, -2), clip: "walk", t: 0.4, expr: "dizzy", yaw: 0.9 },
    lumi: { pos: tileWorld(0, 18), clip: "walk", t: 0.9, expr: "neutral", yaw: Math.PI },
    anna: { pos: [-1.3, 0, 1.4], clip: "idle", t: 2.0, expr: "smug", yaw: 0.6 },
    miyu: { pos: [1.4, 0, 1.6], clip: "point", t: 1.6, expr: "squint", yaw: -0.6 },
  },
  closeUp: {
    zuzu: { pos: [0, 0, 0], clip: "dizzy", t: 1.0, expr: "dizzy", yaw: 0.15 },
    anna: { pos: [-0.62, 0, 0.12], clip: "push_hands", t: 0.5, expr: "smug", yaw: 0.9 },
    miyu: { pos: [0.66, 0, 0.18], clip: "point", t: 1.6, expr: "squint", yaw: -0.7 },
    lumi: { pos: tileWorld(0, 14), clip: "walk", t: 0.9, expr: "neutral", yaw: Math.PI },
  },
};

export const NightPlazaLookdev: React.FC<{ post?: boolean }> = ({ post = true }) => {
  const set = useSetGLB("night-plaza");
  const cast = useCast(["zuzu", "anna", "miyu", "lumi"]);
  const fontReady = useFontReady();
  const walk = useMemo(() => sampleWalk(6006, 40).map(([i, j]) => tileWorld(i, j)), []);
  const ghosts = useMemo(() => Array.from({ length: 50 }, (_, k) => sampleWalk(7000 + k, 40)[40]), []);
  return (
    <SetLookdev title="night-plaza" look={NIGHT_PLAZA_LOOK} shots={NIGHT_PLAZA_SHOTS} post={post}>
      {(shot) =>
        fontReady ? (
          <>
            <NightPlaza set={set} time={2.5} />
            <FloorTrail points={walk} upTo={shot === "closeUp" ? 12 : 40} color="#ffd84a" />
            <FloorTrail points={[tileWorld(0, 0), tileWorld(0, shot === "wide" ? 30 : 18)]} upTo={1} color="#5f8fe8" width={0.07} opacity={0.6} />
            <FloorGlow position={walk[shot === "closeUp" ? 12 : 40]} radius={0.35} color="#ffd84a" intensity={0.9} />
            {shot === "threeQuarter" ? (
              <>
                <Ghosts ghosts={ghosts.map(([i, j]) => ({ pos: tileWorld(i, j), scale: 1 }))} capacity={50} />
                <FloorRing radius={Math.sqrt(40) * TILE} />
              </>
            ) : null}
            {shot === "closeUp" ? <Tape from={[0, 0, 0]} to={walk[12]} progress={1} /> : null}
            {cast.map((c) => {
              const p = POSES[shot][c.name];
              return (
                <group key={c.name} position={p.pos}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={p.t} expression={p.expr} yaw={p.yaw} />
                </group>
              );
            })}
          </>
        ) : null
      }
    </SetLookdev>
  );
};
