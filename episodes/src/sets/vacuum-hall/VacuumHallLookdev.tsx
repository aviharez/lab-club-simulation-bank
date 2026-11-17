// Lookdev stills for vacuum-hall (EP02's set):
//   frame 0 wide · 1 three-quarter · 2 close-up: Anna (hammer) + Zuzu (feather) at the AIR column's glove ports
// Render: npm run lookdev:vacuum-hall  → out/lookdev/vacuum-hall/
import React from "react";
import { Actor } from "../../actors/Actor";
import { FONT, useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot } from "../../kit/env";
import { ControlPanel, STEEL_PANEL } from "../lab/ControlPanel";
import { Feather, Hammer, VacuumColumn, VacuumPump } from "../lab/props";
import { VACUUM_HALL, VacuumHall, type VacuumHallParts } from "./VacuumHall";
import { VACUUM_HALL_LOOK } from "./look";

export const VACUUM_HALL_SHOTS: Record<LookdevShot, CamState> = {
  wide: { pos: [0, 3.3, 15.5], target: [0, 2.5, 0], fov: 36 },
  threeQuarter: { pos: [6.6, 4.8, 10.2], target: [-0.3, 2.3, -0.3], fov: 34 },
  closeUp: { pos: [-0.75, 3.7, 4.9], target: [-0.9, 3.2, 0], fov: 36 },
};

// hold_drop grip (measured on the rig): ~0.53 m up, ~0.22 m forward, ~0.10 m to the actor's right
const GRIP = { up: 0.53, fwd: 0.22, right: 0.104 };
const [AIR_X, VAC_X] = VACUUM_HALL.columnX;
const DECK = VACUUM_HALL.deckY;
const DZ = VACUUM_HALL.deckZ;
const SIDE = VACUUM_HALL.side;
const YAW = 1.1; // 3/4 toward the glass
/** world grip point for an actor at x (deck height, deckZ) with yaw (0 = facing the camera, + turns toward +x) */
const gripAt = (x: number, yaw: number): [number, number, number] => [
  x + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw),
  DECK + GRIP.up,
  DZ + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw),
];
/** where the held prop sits: through the glove port, 0.3 m from the column axis */
const inPort = (axis: number, g: [number, number, number]): [number, number, number] => {
  const a = Math.atan2(g[0] - axis, g[2]);
  return [axis + Math.sin(a) * 0.3, g[1], Math.cos(a) * 0.3];
};
const portAngle = (axis: number, g: [number, number, number]) => Math.atan2(g[0] - axis, g[2]);

type Pose = { pos: [number, number, number]; clip: string; t: number; expr: string; yaw?: number };
const POSES: Record<string, Pose> = {
  anna: { pos: [AIR_X - SIDE, DECK, DZ], clip: "hold_drop", t: 0.75, expr: "smug", yaw: YAW },
  zuzu: { pos: [AIR_X + SIDE, DECK, DZ], clip: "hold_drop", t: 0.75, expr: "neutral", yaw: -YAW },
  lumi: { pos: [1.5, 0, 2.35], clip: "point", t: 0.9, expr: "happy", yaw: 0.45 },
  miyu: { pos: [VACUUM_HALL.bench[0] + 0.2, 0, VACUUM_HALL.bench[2] - 0.1], clip: "sit", t: 2.2, expr: "squint", yaw: 0.25 },
};
const ANNA_GRIP = gripAt(POSES.anna.pos[0], YAW);
const ZUZU_GRIP = gripAt(POSES.zuzu.pos[0], -YAW);

export const VacuumHallLookdev: React.FC<{ post?: boolean; parts?: VacuumHallParts }> = ({ post = true, parts }) => {
  const set = useSetGLB("vacuum-hall");
  const cast = useCast(["miyu", "anna", "zuzu", "lumi"]);
  const fontReady = useFontReady();
  const P = VACUUM_HALL.pump;
  const C = VACUUM_HALL.console;
  return (
    <SetLookdev title="vacuum-hall" look={VACUUM_HALL_LOOK} shots={VACUUM_HALL_SHOTS} post={post}>
      {() =>
        fontReady ? (
          <>
            <VacuumHall set={set} time={2.5} parts={parts} />
            <VacuumColumn x={AIR_X} title="AIR" sub="normal air" font={FONT} pressure={1} ports={[portAngle(AIR_X, ANNA_GRIP), portAngle(AIR_X, ZUZU_GRIP)]} />
            <Hammer position={inPort(AIR_X, ANNA_GRIP)} tilt={Math.PI / 2} />
            <Feather position={inPort(AIR_X, ZUZU_GRIP)} />
            <VacuumColumn x={VAC_X} title="VACUUM" sub="no air" font={FONT} pressure={0.62} ports={[-Math.PI / 2 + 0.4, Math.PI / 2 - 0.4]} />
            <VacuumPump position={P.pos} rotationY={P.rotY} font={FONT} pressure={0.62} running={1} time={2.5} hoseTo={[VAC_X + 0.66, 0.16, 0.25]} />
            <ControlPanel
              position={C.pos}
              rotationY={C.rotY}
              font={FONT}
              lines={[
                { text: "VACUUM PUMP", size: 40, color: "#8af2ff" },
                { text: "ready", size: 62, color: "#ffffff" },
              ]}
              buttonGlow={[0, 0, 1, 0]}
              theme={STEEL_PANEL}
            />
            {cast.map((c) => {
              const p = POSES[c.name];
              return (
                <group key={c.name} position={p.pos}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={p.t} expression={p.expr} yaw={p.yaw ?? 0} />
                </group>
              );
            })}
          </>
        ) : null
      }
    </SetLookdev>
  );
};
