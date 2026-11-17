// Chemistry prep room (EP07): the Blender-built GLB (assets/sets/chem-prep-room, AO baked to vertex colours) plus the
// live parts: pendant lamp light, the burner flame (a practical), soft caustics on the bench tops in the window light,
// warm dust motes in the window beams. The beakers and the flag are separate props (./props) driven by the episode.
// Everything is a pure function of `time` (world seconds).
//   const set = useSetGLB("chem-prep-room");      // outside the canvas
//   <SetStage look={CHEM_PREP_LOOK} …><ChemPrepRoom set={set} time={t} /> …beakers, actors…</SetStage>
import React from "react";
import * as THREE from "three";
import { Caustics, Dust, type LoadedSet } from "../../kit/env";
import { CHEM_PREP } from "./layout";

export type ChemPrepParts = { glb?: boolean; practicals?: boolean; caustics?: boolean; dust?: boolean };

const Flame: React.FC<{ time: number }> = ({ time }) => {
  const flick = 1 + 0.08 * Math.sin(time * 23) + 0.05 * Math.sin(time * 37 + 1.3);
  const p = CHEM_PREP.flame;
  return (
    <group position={p}>
      <mesh scale={[1, flick, 1]} position={[0, 0.03, 0]}>
        <coneGeometry args={[0.014, 0.07, 12]} />
        <meshBasicMaterial color={new THREE.Color("#7fb2ff").multiplyScalar(2.2)} transparent opacity={0.8} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh scale={[1, flick, 1]} position={[0, 0.02, 0]}>
        <coneGeometry args={[0.007, 0.035, 10]} />
        <meshBasicMaterial color={new THREE.Color("#dff0ff").multiplyScalar(2.6)} toneMapped={false} />
      </mesh>
      <pointLight color="#9cc4ff" intensity={0.35 * flick} distance={0.9} decay={2} position={[0, 0.06, 0]} />
    </group>
  );
};

export const ChemPrepRoom: React.FC<{ set: LoadedSet | null; time: number; parts?: ChemPrepParts }> = ({ set, time, parts = {} }) => {
  const on = { glb: true, practicals: true, caustics: true, dust: true, ...parts };
  const A = CHEM_PREP;
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      {on.practicals ? (
        <>
          {A.pendants.map((p, i) => (
            <pointLight key={i} position={[p[0], p[1] - 0.06, p[2]]} color="#ffcf8f" intensity={1.5} distance={3.2} decay={1.6} />
          ))}
          {/* warm bounce off the window-lit floor, and the window glow on the left wall */}
          <pointLight position={[-2.3, 0.4, -1.0]} color="#ffe2b8" intensity={1.0} distance={5} decay={1.5} />
          <pointLight position={[-2.75, 1.8, -1.0]} color="#fff1da" intensity={1.2} distance={4.5} decay={1.6} />
          <Flame time={time} />
        </>
      ) : null}
      {on.caustics
        ? (["anna", "lumi"] as const).map((b) => (
            // light through the liquids lands to the right of the beakers (the window is on the left)
            <Caustics key={b} position={[0.12, A.bench.top + 0.002, A.benchZ[b]]} size={[A.bench.length - 0.1, A.bench.depth - 0.06]} time={time} color="#ffe6b8" intensity={0.22} scale={3.2} speed={0.35} />
          ))
        : null}
      {on.dust ? (
        <>
          <Dust center={[-1.4, 1.5, -1.0]} size={[3.2, 2.2, 3.8]} count={260} seed={711} time={time} pointSize={6} opacity={0.22} speed={0.12} color="#fff0d2" />
          <Dust center={[0.4, 1.2, 1.4]} size={[4, 1.6, 2]} count={80} seed={712} time={time} pointSize={9} opacity={0.14} speed={0.1} color="#ffe6c4" />
        </>
      ) : null}
    </>
  );
};
