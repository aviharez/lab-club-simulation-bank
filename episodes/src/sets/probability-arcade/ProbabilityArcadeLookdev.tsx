// Lookdev stills for probability-arcade (EP05's set):
//   frame 0 wide (from the arcade aisle, cabinets framing) · 1 three-quarter: the machine from stage right, Miyu on her
//   walkway with the scoop · 2 close-up: Anna at her empty far-left bin, the centre bin heaped behind Zuzu
// The balls are the real pour from the episode data (first 640 balls landed, a few in flight, one highlighted path).
// Render: npm run lookdev:probability-arcade  → out/lookdev/probability-arcade/
import React from "react";
import { Actor } from "../../actors/Actor";
import { balls as pour, BET } from "../../galton-board/data";
import { FONT, useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot } from "../../kit/env";
import { ARCADE, ballPath, stackPos } from "./layout";
import { ARCADE_LOOK } from "./look";
import { ProbabilityArcade } from "./ProbabilityArcade";
import { Scoop, type BallDraw } from "./props";

const A = ARCADE;
export const ARCADE_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [0, 2.55, 7.9], target: [0, 2.25, -1.2], fov: 40 },
  threeQuarter: { pos: [-3.0, 2.8, 3.4], target: [0.2, 2.4, -1.0], fov: 50 },
  closeUp: { pos: [-0.85, 1.0, 1.6], target: [-1.1, 1.05, -0.6], fov: 42 },
};

type V3 = [number, number, number];
/** hold_drop grip (measured on the rig, EP02): 0.53 m up, 0.22 m forward, 0.104 m to the actor's right */
const GRIP = { up: 0.53, fwd: 0.22, right: 0.104 };
const gripAt = (p: V3, yaw: number): V3 => [p[0] + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw), p[1] + GRIP.up, p[2] + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw)];

type Pose = { pos: V3; clip: string; t: number; expr: string; yaw: number };
const MIYU_POS: V3 = [0.74, A.platform.pos[1], -0.95];
const MIYU_YAW = -1.05;
const POSES: Record<string, Pose> = {
  anna: { pos: A.marks.anna, clip: "idle", t: 2.0, expr: "smug", yaw: 0.35 },
  lumi: { pos: A.marks.lumi, clip: "point", t: 1.2, expr: "happy", yaw: -0.5 },
  zuzu: { pos: A.marks.zuzu, clip: "cheer", t: 0.6, expr: "happy", yaw: -0.15 },
  miyu: { pos: MIYU_POS, clip: "hold_drop", t: 0.75, expr: "squint", yaw: MIYU_YAW },
};
const CLOSE: Record<string, Pose> = {
  anna: { pos: [-1.25, 0, -0.15], clip: "idle", t: 2.4, expr: "shocked", yaw: 0.6 },
  zuzu: { pos: [0.15, 0, -0.2], clip: "cheer", t: 0.6, expr: "happy", yaw: -0.35 },
  lumi: { pos: [1.2, 0, 0.6], clip: "point", t: 1.2, expr: "happy", yaw: -0.5 },
};

/** 3/4: the floor cast steps aside to the ladder side so the shot shows the machine + Miyu on her walkway */
const SIDE: Record<string, Pose> = {
  zuzu: { pos: [1.75, 0, -0.1], clip: "cheer", t: 0.6, expr: "happy", yaw: -0.6 },
  anna: { pos: [2.6, 0, -0.6], clip: "idle", t: 2.0, expr: "smug", yaw: -0.9 },
  lumi: { pos: [3.2, 0, 0.4], clip: "point", t: 1.2, expr: "happy", yaw: -1.0 },
};

const LANDED = 640;
const FLYING = [0.6, 2.2, 3.9, 5.1, 6.8, 8.4, 9.6, 11.2, 12.4];
const drawBalls = (): { balls: BallDraw[]; trail: V3[] } => {
  const all = pour();
  const out: BallDraw[] = all.slice(0, LANDED).map((b) => ({ pos: stackPos(b.bin, b.slot) }));
  FLYING.forEach((u, k) => {
    const b = all[LANDED + k];
    out.push({ pos: ballPath(b.steps, stackPos(b.bin, b.slot), u), hi: k === 4 ? 1 : 0 });
  });
  const hb = all[LANDED + 4];
  const trail = Array.from({ length: 80 }, (_, j) => ballPath(hb.steps, stackPos(hb.bin, hb.slot), (FLYING[4] * j) / 79) as V3);
  return { balls: out, trail };
};

export const ProbabilityArcadeLookdev: React.FC<{ post?: boolean }> = ({ post = true }) => {
  const set = useSetGLB("probability-arcade");
  const cast = useCast(["anna", "lumi", "zuzu", "miyu"]);
  const fontReady = useFontReady();
  const { balls, trail } = React.useMemo(drawBalls, []);
  return (
    <SetLookdev title="probability-arcade" look={ARCADE_LOOK} shots={ARCADE_SHOTS} post={post}>
      {(shot) => {
        if (!fontReady) return null;
        const poses = shot === "closeUp" ? { ...POSES, ...CLOSE } : shot === "threeQuarter" ? { ...POSES, ...SIDE } : POSES;
        return (
          <>
            <ProbabilityArcade
              set={set}
              time={3.2}
              font={FONT}
              balls={balls}
              capacity={1000}
              counter={LANDED}
              trails={[{ points: trail, color: "#3fe6d6" }]}
              tags={[
                { bin: BET.anna, label: "ANNA", color: "#ff8fc6", swing: 0.05 },
                { bin: BET.zuzu, label: "ZUZU", color: "#ffd84a", swing: -0.04 },
              ]}
            />
            <Scoop position={gripAt(MIYU_POS, MIYU_YAW)} yaw={MIYU_YAW - Math.PI / 2} tilt={0.2} />
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
