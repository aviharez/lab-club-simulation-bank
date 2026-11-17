// 3D half of EP07: the chemistry prep room, the 24 beakers (positions straight from the operation lists in data.ts),
// Lumi's partition range strip, Miyu's stopwatch (race time), Zuzu's finish flag and the four actors, all from the frame.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Actor } from "../actors/Actor";
import { type CastMember } from "../kit";
import { SetStage, type LoadedSet } from "../kit/env";
import { Beaker, CHEM_PREP, CHEM_PREP_LOOK, ChemPrepRoom, FinishFlag, SLOT, slotX } from "../sets/chem-prep-room";
import { Stopwatch } from "../sets/sunlit-atrium/props";
import { camAt } from "./camera";
import { type Member } from "./data";
import { ACTING, beakersAt, clockAt, flagVisible, flagWave, rangeAt, RING, stopwatchVisible, worldTime } from "./timeline";

/** Faces lit like the body skin (warm interior light), see actor_conventions.face. */
const FACE = { lit: 1, glow: 0.08 } as const;
/** hold_sign grip on Zuzu's rig (measured for EP04, actor frame) */
const GRIP = { fwd: 0.033, right: -0.009, up: 0.615, gap: 0.475 };
const gripAt = (p: [number, number, number], yaw: number): [number, number, number] => [
  p[0] + GRIP.fwd * Math.sin(yaw) - GRIP.right * Math.cos(yaw),
  p[1] + GRIP.up,
  p[2] + GRIP.fwd * Math.cos(yaw) + GRIP.right * Math.sin(yaw),
];

const RangeStrip: React.FC<{ range: [number, number] }> = ({ range }) => {
  const x0 = slotX(range[0]) - SLOT / 2 + 0.01;
  const x1 = slotX(range[1]) + SLOT / 2 - 0.01;
  return (
    <mesh position={[(x0 + x1) / 2, CHEM_PREP.bench.top + 0.004, CHEM_PREP.benchZ.lumi + 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[x1 - x0, 0.022]} />
      <meshBasicMaterial color={new THREE.Color(RING.lumi).multiplyScalar(1.6)} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, font, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = worldTime(f);
  const range = rangeAt(f);
  const clock = clockAt(f);
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={CHEM_PREP_LOOK}>
      <ChemPrepRoom set={set} time={t} />
      {(["anna", "lumi"] as const).map((algo) =>
        beakersAt(algo, f).map((b) => <Beaker key={`${algo}-${b.value}`} value={b.value} position={b.pos} ring={b.ring} locked={b.locked} />),
      )}
      {range ? <RangeStrip range={range} /> : null}
      {cast.map((c) => {
        const st = ACTING(c.name as Member, f);
        const attach =
          c.name === "miyu" && stopwatchVisible(f)
            ? [
                {
                  bone: "R_Hand",
                  children: (
                    <group position={[0, 0.03, 0.02]} scale={0.7}>
                      <Stopwatch reading={clock.toFixed(1)} font={font} sweep={(clock / 60) % 1} />
                    </group>
                  ),
                },
              ]
            : undefined;
        return (
          <group key={c.name} position={st.pos}>
            <Actor meta={c.meta} actor={c.actor} clip={st.clip} time={st.time} blend={st.from} expression={st.expression} yaw={st.yaw} attach={attach} faceGlow={FACE.glow} faceLit={FACE.lit} />
          </group>
        );
      })}
      {flagVisible(f)
        ? (() => {
            const z = ACTING("zuzu", f);
            return (
              <group position={gripAt(z.pos, z.yaw)} rotation={[0, z.yaw, 0]}>
                <FinishFlag font={font} handGap={GRIP.gap} wave={flagWave(f)} />
              </group>
            );
          })()
        : null}
    </SetStage>
  );
};
