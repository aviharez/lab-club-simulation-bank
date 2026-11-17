// Lookdev stills for game-show-studio (EP04's set):
//   frame 0 wide (from the audience) · 1 three-quarter: the montage corner (STAY / SWITCH mini stages) with Anna + Miyu ·
//   2 close-up: Anna on the player mark, door 2 open on a duck, Lumi at her host podium
// Render: npm run lookdev:game-show-studio  → out/lookdev/game-show-studio/
import React from "react";
import { Actor } from "../../actors/Actor";
import { FONT, useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot } from "../../kit/env";
import { GAME_SHOW, GameShowStudio } from "./GameShowStudio";
import { GAME_SHOW_LOOK } from "./look";
import { CheerSign } from "./props";

const G = GAME_SHOW;
export const GAME_SHOW_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [0.1, 3.6, 10.8], target: [0.1, 1.25, -1.2], fov: 54 },
  threeQuarter: { pos: [6.2, 1.75, 4.1], target: [6.2, 0.85, -1.2], fov: 52 },
  closeUp: { pos: [-0.7, 1.05, 3.3], target: [0.3, 0.9, -1.2], fov: 44 },
};

type V3 = [number, number, number];
/** world point of a grip (fwd, right, up) for an actor at feet p with yaw (0 = facing +z) */
const gripAt = (p: V3, yaw: number, fwd: number, right: number, up: number): V3 => [
  p[0] + fwd * Math.sin(yaw) - right * Math.cos(yaw),
  p[1] + up,
  p[2] + fwd * Math.cos(yaw) + right * Math.sin(yaw),
];
/** hold_sign hands measured on the rig: fwd 0.03, right ±0.235, up 0.615 (both hands) */
const SIGN_GRIP = { fwd: 0.033, right: -0.009, up: 0.615, gap: 0.475 };

type Pose = { pos: V3; clip: string; t: number; expr: string; yaw: number };
const MAIN: Record<string, Pose> = {
  anna: { pos: [G.playerMark[0] - 0.1, G.stageY, G.playerMark[2]], clip: "idle", t: 2.0, expr: "smug", yaw: 0.25 },
  miyu: { pos: [1.05, G.stageY, 0.75], clip: "idle", t: 5.5, expr: "squint", yaw: -0.3 },
  lumi: { pos: [G.podium.pos[0] - 0.35, G.stageY, G.podium.pos[2] - 0.25], clip: "point", t: 1.0, expr: "happy", yaw: -0.75 },
  zuzu: { pos: [G.zuzuSpot[0], G.stageY, G.zuzuSpot[2]], clip: "hold_sign", t: 0.3, expr: "happy", yaw: 0.45 },
};
const CLOSE: Record<string, Pose> = {
  anna: { pos: [0.45, G.stageY, 0.4], clip: "idle", t: 2.0, expr: "smug", yaw: -0.35 },
};
const MINI: Record<string, Pose> = {
  anna: { pos: [G.mini.centers[0][0], G.mini.top, G.mini.centers[0][2] + 0.45], clip: "idle", t: 3.0, expr: "shocked", yaw: -0.35 },
  miyu: { pos: [G.mini.centers[1][0], G.mini.top, G.mini.centers[1][2] + 0.45], clip: "idle", t: 6.0, expr: "happy", yaw: -0.45 },
};

export const GameShowStudioLookdev: React.FC<{ post?: boolean }> = ({ post = true }) => {
  const set = useSetGLB("game-show-studio");
  const cast = useCast(["zuzu", "anna", "miyu", "lumi"]);
  const fontReady = useFontReady();
  return (
    <SetLookdev title="game-show-studio" look={GAME_SHOW_LOOK} shots={GAME_SHOW_SHOTS} post={post}>
      {(shot) => {
        if (!fontReady) return null;
        const poses = shot === "threeQuarter" ? { ...MAIN, ...MINI } : shot === "closeUp" ? { ...MAIN, ...CLOSE } : MAIN;
        const z = poses.zuzu;
        const g = gripAt(z.pos, z.yaw, SIGN_GRIP.fwd, SIGN_GRIP.right, SIGN_GRIP.up);
        return (
          <>
            <GameShowStudio
              set={set}
              time={3.2}
              font={FONT}
              doors={shot === "closeUp" ? [0, 0.8, 0] : [0, 0, 0]}
              prizes={["duck", "duck", "trophy"]}
              miniDoors={[
                [0, 0.9, 0.9],
                [0.9, 0, 0.9],
              ]}
              miniPrizes={[
                ["trophy", "duck", "duck"],
                ["duck", "duck", "trophy"],
              ]}
              scoreboard={{
                title: "THREE DOORS",
                cells: [
                  { label: "STAY", value: "317", color: "#ff8fc6", sub: "31.7%" },
                  { label: "SWITCH", value: "649", color: "#c4a8ff", sub: "64.9%" },
                ],
              }}
            />
            <group position={g} rotation={[0, z.yaw, 0]}>
              <CheerSign text="GO GO!" sub="LAB CLUB" font={FONT} handGap={SIGN_GRIP.gap} color="#ffcf3f" />
            </group>
            {cast.map((c) => {
              const p = poses[c.name];
              return (
                <group key={c.name} position={p.pos}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={p.t} expression={p.expr} yaw={p.yaw} />
                </group>
              );
            })}
          </>
        );
      }}
    </SetLookdev>
  );
};
