// Vacuum test hall (EP02): the Blender-built GLB (assets/sets/vacuum-hall, AO baked to vertex colours) plus the live
// parts: daylight shafts from the clerestory windows, dust in the haze, practical lights and animated nodes (deck LED
// strip, lamps). The columns, the pump and the console stay separate components (src/sets/lab/props, src/sets/lab)
// because the episode drives them (gauges, labels, falling props, screen text).
// Everything is a pure function of `time` (world seconds).
//   const set = useSetGLB("vacuum-hall");      // outside the canvas
//   <SetStage look={VACUUM_HALL_LOOK} …><VacuumHall set={set} time={t} /> …columns, pump, console, actors…</SetStage>
import React from "react";
import * as THREE from "three";
import { Dust, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";

/** Layout numbers shared with the Blender build script (three.js coordinates, metres). */
export const VACUUM_HALL = {
  backZ: -4.2,
  /** column axes (AIR, VACUUM) */
  columnX: [-0.9, 0.9] as const,
  /** mezzanine deck top (wraps around the columns); the cast stands beside the glass at deckZ, `side` from the axis */
  deckY: 2.77,
  deckZ: 0.0,
  side: 0.74,
  deckX: 2.6,
  /** Miyu's bench (seat centre, top at y 0.23) */
  bench: [-2.0, 0.23, 2.15] as Vec3,
  /** console + pump (front right) */
  console: { pos: [2.3, 0, 1.75] as Vec3, rotY: -0.75 },
  pump: { pos: [2.35, 0, 0.45] as Vec3, rotY: -0.55 },
  windows: [-6, -4, -2, 0, 2, 4, 6],
  windowY: [6.8, 9.8] as const,
  lamps: [
    [-4.5, 8.9, 1.2],
    [0, 8.9, 1.2],
    [4.5, 8.9, 1.2],
  ] as Vec3[],
};

export type VacuumHallParts = { glb?: boolean; shafts?: boolean; dust?: boolean; practicals?: boolean };

export const VacuumHall: React.FC<{ set: LoadedSet | null; time: number; parts?: VacuumHallParts }> = ({ set, time, parts = {} }) => {
  const on = { glb: true, shafts: true, dust: true, practicals: true, ...parts };
  const V = VACUUM_HALL;
  if (set) {
    for (const [name, node] of Object.entries(set.nodes)) {
      const led = node as THREE.Mesh;
      if (name.startsWith("deck_led") && led.material) (led.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.6 + 0.4 * Math.sin(time * 1.7);
    }
  }
  const wy = (V.windowY[0] + V.windowY[1]) / 2;
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      {on.practicals ? (
        <>
          {V.lamps.map((p, i) => (
            <pointLight key={i} position={[p[0], p[1] - 0.3, p[2]]} color="#eef8ff" intensity={2.4} distance={9} decay={1.5} />
          ))}
          {/* deck LED strip: cyan wash on the column backs and the cast's feet */}
          {[-1.8, 0, 1.8].map((x) => (
            <pointLight key={x} position={[x, V.deckY - 0.25, 0.6]} color="#6fe8ff" intensity={0.5} distance={2.2} decay={2} />
          ))}
          {/* daylight bounce from the windows onto the back wall + catwalk */}
          <pointLight position={[0, wy, V.backZ + 2.2]} color="#e3f1ff" intensity={2.2} distance={10} decay={1.4} />
          {/* cabinet LEDs + gas rack */}
          <pointLight position={[5.2, 1.9, V.backZ + 1.0]} color="#7fe0f0" intensity={0.5} distance={2.5} decay={2} />
        </>
      ) : null}
      {/* daylight shafts from the clerestory, slanting down toward the camera */}
      {on.shafts
        ? V.windows.map((x, i) =>
            i % 2 === 1 || x === 0 ? null : (
              <VolumetricCone
                key={x}
                position={[x, wy, V.backZ + 0.1]}
                target={[x * 0.85 + 0.6, 0, 3.4]}
                length={11}
                radius={1.9}
                apexRadius={1.0}
                color="#e6f3ff"
                intensity={0.085}
                time={time + i * 3}
                noise={0.35}
              />
            ),
          )
        : null}
      {on.dust ? <Dust center={[0, 4.2, 0]} size={[7, 7, 5]} count={420} seed={33} time={time} pointSize={9} opacity={0.35} speed={0.4} color="#f2f8ff" /> : null}
    </>
  );
};
