// Lookdev stills for sunlit-atrium (EP03's set):
//   frame 0 wide · 1 three-quarter · 2 close-up: Zuzu (drop, yellow ball) + Anna (throw, pink ball) at the launch gap
// Render: npm run lookdev:sunlit-atrium  → out/lookdev/sunlit-atrium/
import React from "react";
import { Actor } from "../../actors/Actor";
import { FONT, MASCOT_COLORS, useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot } from "../../kit/env";
import { Ball, Stopwatch } from "./props";
import { SUNLIT_ATRIUM, SunlitAtrium, type SunlitAtriumParts } from "./SunlitAtrium";
import { SUNLIT_ATRIUM_LOOK } from "./look";

export const SUNLIT_ATRIUM_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [1.2, 2.5, 8.2], target: [0.7, 1.5, -0.4], fov: 44 },
  threeQuarter: { pos: [4.2, 3.1, 5.6], target: [0.2, 1.4, -0.6], fov: 44 },
  closeUp: { pos: [1.5, 2.45, 2.3], target: [-0.25, 2.0, 0], fov: 38 },
};

const BALL_R = 0.075;
type Grip = { up: number; fwd: number; right: number };
/** right-hand grips measured on the rig (metres, at actor scale 1) */
const HOLD_DROP: Grip = { up: 0.528, fwd: 0.223, right: 0.098 };
const THROW_WINDUP: Grip = { up: 0.392, fwd: 0.063, right: 0.161 }; // throw clip at 0.75 s
const IDLE_R: Grip = { up: 0.38, fwd: 0.03, right: 0.181 };
/** world point of a grip for an actor at feet p with yaw (0 = facing +z, + turns toward +x) */
const gripAt = (p: [number, number, number], yaw: number, g: Grip): [number, number, number] => [
  p[0] + g.fwd * Math.sin(yaw) - g.right * Math.cos(yaw),
  p[1] + g.up,
  p[2] + g.fwd * Math.cos(yaw) + g.right * Math.sin(yaw),
];
/** feet so that a grip lands on a target point */
const feetFor = (target: [number, number, number], yaw: number, g: Grip, floorY: number): [number, number, number] => [
  target[0] - (g.fwd * Math.sin(yaw) - g.right * Math.cos(yaw)),
  floorY,
  target[2] - (g.fwd * Math.cos(yaw) + g.right * Math.sin(yaw)),
];

const A = SUNLIT_ATRIUM;
const YAW = Math.PI / 2 - 0.3; // facing +x (the throw direction), turned a little toward the camera
const ZUZU_BALL: [number, number, number] = [A.edgeX, A.releaseY + BALL_R, A.lane.zuzu];
const ZUZU_FEET = feetFor(ZUZU_BALL, YAW, HOLD_DROP, A.deckY);
const ANNA_FEET: [number, number, number] = [-0.3, A.stepTop, A.lane.anna - 0.06];
const ANNA_BALL = gripAt(ANNA_FEET, YAW, THROW_WINDUP);
const MIYU_FEET: [number, number, number] = [1.1, 0, 1.45];
const MIYU_YAW = 0.35;
const MIYU_WATCH = gripAt(MIYU_FEET, MIYU_YAW, IDLE_R);

type Pose = { pos: [number, number, number]; clip: string; t: number; expr: string; yaw: number };
const POSES: Record<string, Pose> = {
  zuzu: { pos: ZUZU_FEET, clip: "hold_drop", t: 0.75, expr: "happy", yaw: YAW },
  anna: { pos: ANNA_FEET, clip: "throw", t: 0.75, expr: "smug", yaw: YAW },
  miyu: { pos: MIYU_FEET, clip: "idle", t: 1.2, expr: "squint", yaw: MIYU_YAW },
  lumi: { pos: [2.3, 0, 1.5], clip: "point", t: 0.9, expr: "happy", yaw: -0.45 },
};

export const SunlitAtriumLookdev: React.FC<{ post?: boolean; parts?: SunlitAtriumParts }> = ({ post = true, parts }) => {
  const set = useSetGLB("sunlit-atrium");
  const cast = useCast(["zuzu", "anna", "miyu", "lumi"]);
  const fontReady = useFontReady();
  return (
    <SetLookdev title="sunlit-atrium" look={SUNLIT_ATRIUM_LOOK} shots={SUNLIT_ATRIUM_SHOTS} post={post}>
      {() =>
        fontReady ? (
          <>
            <SunlitAtrium set={set} time={2.5} parts={parts} />
            <Ball position={ZUZU_BALL} radius={BALL_R} color={MASCOT_COLORS.zuzu} />
            <Ball position={ANNA_BALL} radius={BALL_R} color={MASCOT_COLORS.anna} />
            <Stopwatch position={[MIYU_WATCH[0], MIYU_WATCH[1] + 0.02, MIYU_WATCH[2] + 0.05]} rotation={[-0.2, MIYU_YAW, 0]} reading="0.64" font={FONT} sweep={0.64} scale={0.9} />
            {cast.map((c) => {
              const p = POSES[c.name];
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
