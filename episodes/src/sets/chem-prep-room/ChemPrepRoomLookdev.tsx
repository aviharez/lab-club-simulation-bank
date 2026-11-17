// Lookdev stills for chem-prep-room (EP07's set):
//   frame 0 wide (the race shot: both benches, all four mascots) · 1 three-quarter · 2 close-up: Anna comparing two
//   beakers at her bench
// Render: npm run lookdev:chem-prep-room  → out/lookdev/chem-prep-room/
import React from "react";
import { Actor } from "../../actors/Actor";
import { MASCOT_COLORS, useCast, useFontReady, FONT } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot, type Vec3 } from "../../kit/env";
import { Stopwatch } from "../sunlit-atrium/props";
import { ChemPrepRoom } from "./ChemPrepRoom";
import { CHEM_PREP, slotX } from "./layout";
import { CHEM_PREP_LOOK } from "./look";
import { Beaker, FinishFlag } from "./props";

export const CHEM_PREP_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [0, 3.3, 5.9], target: [0, 0.5, -1.1], fov: 42 },
  threeQuarter: { pos: [2.6, 1.55, 2.9], target: [-0.25, 0.5, -0.9], fov: 42 },
  closeUp: { pos: [-0.5, 0.92, 1.6], target: [-0.66, 0.6, -0.3], fov: 38 },
};

/** the episode's start order (data.ts START, seed 190), shown on both benches */
const START = [8, 10, 1, 9, 11, 3, 5, 2, 4, 6, 12, 7];
const B = CHEM_PREP.benchZ;
const W = CHEM_PREP.workZ;

type Pose = { pos: Vec3; clip: string; t: number; expr: string; yaw: number };
const POSES: Record<LookdevShot, Record<string, Pose>> = {
  wide: {
    anna: { pos: [slotX(2), 0, W.anna], clip: "compare", t: 0.8, expr: "smug", yaw: 0 },
    lumi: { pos: [slotX(8), 0, W.lumi], clip: "compare", t: 2.2, expr: "neutral", yaw: 0 },
    miyu: { pos: CHEM_PREP.referee, clip: "sleep_stand", t: 1.0, expr: "squint", yaw: 0.7 },
    zuzu: { pos: CHEM_PREP.finish, clip: "hold_sign", t: 0.3, expr: "happy", yaw: -0.7 },
  },
  threeQuarter: {
    anna: { pos: [slotX(5), 0, W.anna], clip: "carry", t: 0.5, expr: "smug", yaw: 0.3 },
    lumi: { pos: [slotX(3), 0, W.lumi], clip: "compare", t: 1.0, expr: "neutral", yaw: 0.3 },
    miyu: { pos: CHEM_PREP.referee, clip: "idle", t: 4.0, expr: "squint", yaw: 0.9 },
    zuzu: { pos: CHEM_PREP.finish, clip: "hold_sign", t: 0.6, expr: "happy", yaw: -0.2 },
  },
  closeUp: {
    anna: { pos: [(slotX(1) + slotX(2)) / 2, 0, W.anna], clip: "compare", t: 0.9, expr: "smug", yaw: 0 },
    lumi: { pos: [slotX(6), 0, W.lumi], clip: "compare", t: 2.2, expr: "neutral", yaw: 0 },
    miyu: { pos: CHEM_PREP.referee, clip: "sleep_stand", t: 1.0, expr: "squint", yaw: 0.7 },
    zuzu: { pos: CHEM_PREP.finish, clip: "hold_sign", t: 0.3, expr: "happy", yaw: -0.7 },
  },
};

/** hold_sign grip on Zuzu's rig (measured for EP04, actor frame) */
const GRIP = { fwd: 0.033, right: -0.009, up: 0.615, gap: 0.475 };
const gripAt = (p: Vec3, yaw: number): Vec3 => [p[0] + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw), p[1] + GRIP.up, p[2] + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw)];

export const ChemPrepRoomLookdev: React.FC<{ post?: boolean }> = ({ post = true }) => {
  const set = useSetGLB("chem-prep-room");
  const cast = useCast(["anna", "lumi", "miyu", "zuzu"]);
  const fontReady = useFontReady();
  return (
    <SetLookdev title="chem-prep-room" look={CHEM_PREP_LOOK} shots={CHEM_PREP_SHOTS} post={post}>
      {(shot) =>
        fontReady ? (
          <>
            <ChemPrepRoom set={set} time={2.5} />
            {(["anna", "lumi"] as const).map((b) =>
              START.map((v, k) => {
                // sample highlights: Anna compares slots 1-2, Lumi compares slot 8 with the pivot (slot 11)
                const ring = b === "anna" ? (k === 1 || k === 2 ? { color: MASCOT_COLORS.anna, intensity: 1 } : null) : k === 8 ? { color: MASCOT_COLORS.lumi, intensity: 1 } : k === 11 ? { color: "#f2bf3b", intensity: 1 } : null;
                return <Beaker key={`${b}${k}`} value={v} position={[slotX(k), CHEM_PREP.bench.top, B[b]]} ring={ring} locked={0} />;
              }),
            )}
            {cast.map((c) => {
              const p = POSES[shot][c.name];
              const attach =
                c.name === "miyu"
                  ? [{ bone: "R_Hand", children: <group position={[0, 0.03, 0.02]} rotation={[0, 0, 0]} scale={0.7}><Stopwatch reading="0.0" font={FONT} sweep={0} /></group> }]
                  : undefined;
              return (
                <group key={c.name} position={p.pos}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={p.t} expression={p.expr} yaw={p.yaw} attach={attach} faceLit={1} faceGlow={0.08} />
                </group>
              );
            })}
            {(() => {
              const z = POSES[shot].zuzu;
              return (
                <group position={gripAt(z.pos, z.yaw)} rotation={[0, z.yaw, 0]}>
                  <FinishFlag font={FONT} handGap={GRIP.gap} wave={1.2} />
                </group>
              );
            })()}
          </>
        ) : null
      }
    </SetLookdev>
  );
};
