// Lookdev stills for home-lab-v2 (frame 0 wide, 1 three-quarter, 2 close-up with Lumi).
// Render: npm run lookdev:home-lab-v2  → out/lookdev/home-lab-v2/
import React from "react";
import { Actor } from "../../actors/Actor";
import { useCast } from "../../kit";
import { SetLookdev, tweakLook, useSetGLB, type LookdevShot, type LookPreset } from "../../kit/env";
import type { CamState } from "../../kit/camera";
import { HomeLabV2, type HomeLabV2Parts } from "./HomeLabV2";
import { HOME_LAB_V2_LOOK } from "./look";

export const HOME_LAB_V2_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [0, 1.5, 8.6], target: [0, 1.35, -1.5], fov: 40 },
  threeQuarter: { pos: [5.2, 2.7, 6.2], target: [-0.6, 1.25, -2.0], fov: 38 },
  closeUp: { pos: [0.95, 1.05, 3.6], target: [0.05, 0.66, 0.5], fov: 30 },
};

const SPOTS: { name: "miyu" | "anna" | "lumi" | "zuzu"; x: number; z: number; yaw: number; clip: string; t: number; expr: string }[] = [
  { name: "miyu", x: -1.05, z: 0.9, yaw: 0.25, clip: "sleep_stand", t: 0.8, expr: "squint" },
  { name: "anna", x: -0.35, z: 0.55, yaw: 0.1, clip: "point", t: 0.6, expr: "smug" },
  { name: "lumi", x: 0.3, z: 0.6, yaw: -0.15, clip: "idle", t: 1.2, expr: "glint" },
  { name: "zuzu", x: 1.0, z: 0.95, yaw: -0.3, clip: "cheer", t: 0.5, expr: "happy" },
];

export const HomeLabV2Lookdev: React.FC<{ post?: boolean; debug?: Partial<LookPreset["post"]> & { exposure?: number }; parts?: HomeLabV2Parts }> = ({ post = true, debug, parts }) => {
  const look = debug ? tweakLook(HOME_LAB_V2_LOOK, { exposure: debug.exposure ?? HOME_LAB_V2_LOOK.exposure, post: debug }) : HOME_LAB_V2_LOOK;
  const set = useSetGLB("home-lab-v2");
  const cast = useCast(["miyu", "anna", "lumi", "zuzu"]);
  return (
    <SetLookdev title="home-lab-v2" look={look} shots={HOME_LAB_V2_SHOTS} post={post}>
      {(shot) => (
        <>
          <HomeLabV2 set={set} time={2.5} parts={parts} />
          {cast.map((c, i) => {
            const s = SPOTS[i];
            // close-up: Lumi alone, centred; other shots: the whole club on the rug. Hidden actors stay mounted:
            // an Actor releases its load hold (delayRender) only once it is in the scene.
            const hidden = shot === "closeUp" && c.name !== "lumi";
            const pos: [number, number, number] = shot === "closeUp" ? [0.05, 0, 0.5] : [s.x, 0, s.z];
            return (
              <group key={c.name} position={pos} visible={!hidden}>
                <Actor meta={c.meta} actor={c.actor} clip={s.clip} time={s.t} expression={s.expr} yaw={shot === "closeUp" ? 0.2 : s.yaw} />
              </group>
            );
          })}
        </>
      )}
    </SetLookdev>
  );
};
