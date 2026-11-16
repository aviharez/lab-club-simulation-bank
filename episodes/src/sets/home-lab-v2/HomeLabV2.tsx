// Home lab v2 set: the Blender-built GLB (assets/sets/home-lab-v2, AO baked to vertex colours) plus the live parts:
// practical lights, sun shaft, dust, the window view (sky + parallax hills), and animated nodes (fan, clock, orb,
// neon). Everything is a pure function of `time` (seconds from the frame).
//   const set = useSetGLB("home-lab-v2");       // outside the canvas
//   <SetStage look={HOME_LAB_V2_LOOK} …><HomeLabV2 set={set} time={f / fps} /></SetStage>
import React, { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "../../kit/random";
import { Caustics, Dust, GradientSky, ParallaxLayers, VolumetricCone, type LoadedSet, type ParallaxLayer, type Vec3 } from "../../kit/env";

/** Layout numbers shared with the Blender build script (three.js coordinates, metres). */
export const HOME_LAB_V2 = {
  backZ: -4,
  ceiling: 4.6,
  window: { x: -1.6, w: 1.9, y0: 1.15, y1: 3.75 },
  hero: { x: 0.95, z: -2.75, orbY: 1.18 },
  pendants: [
    [-2.3, 4.6 - 1.35 - 0.3, -1.2],
    [0.95, 4.6 - 1.5 - 0.3, -1.5],
    [3.1, 4.6 - 1.35 - 0.3, -0.7],
  ] as Vec3[],
  /** foreground framing props (plant left, stool right) */
  foreground: { plant: [-1.2, 0, 4.0] as Vec3, stool: [1.0, 0, 4.4] as Vec3 },
  /** clear midground area for the mascots (on the rug) */
  stage: { x: [-1.5, 1.5], z: [0, 1.5], rugCenter: [0, 0, 0.6] as Vec3 },
  /** clock time at time = 0 (hours): 17:40, golden hour */
  clockStart: 17 + 40 / 60,
};

const HILLS: ParallaxLayer[] = [
  { z: -9, color: "#d9a68a", height: 1.9, amplitude: 0.5, kind: "trees", seed: 4, width: 30 },
  { z: -16, color: "#c9a2a8", height: 2.6, amplitude: 1.0, kind: "skyline", seed: 9, width: 40 },
  { z: -26, color: "#b7a3c2", height: 3.4, amplitude: 1.6, kind: "hills", seed: 2, width: 60 },
];

export type HomeLabV2Parts = { sky?: boolean; glb?: boolean; cones?: boolean; dust?: boolean; caustics?: boolean; practicals?: boolean };

export const HomeLabV2: React.FC<{ set: LoadedSet | null; time: number; parts?: HomeLabV2Parts }> = ({ set, time, parts = {} }) => {
  const on = { sky: true, glb: true, cones: true, dust: true, caustics: true, practicals: true, ...parts };
  const H = HOME_LAB_V2;
  const flicker = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 64 }, () => (r() < 0.06 ? 0.55 + r() * 0.3 : 1));
  }, []);
  if (set) {
    const { nodes } = set;
    if (nodes.fan) nodes.fan.rotation.y = -time * 2.4;
    const hours = H.clockStart + time / 3600;
    if (nodes.clock_min) nodes.clock_min.rotation.z = -((hours % 1) * Math.PI * 2);
    if (nodes.clock_hour) nodes.clock_hour.rotation.z = -(((hours % 12) / 12) * Math.PI * 2);
    const orb = nodes.orb as THREE.Mesh | undefined;
    if (orb?.material) (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.2 + 0.8 * Math.sin(time * 2.1);
    const neon = nodes.neon_noshadow as THREE.Mesh | undefined;
    if (neon?.material) (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = 5 * flicker[Math.floor(time * 12) % flicker.length];
  }
  return (
    <>
      {/* window view: sky dome + hills (true parallax through the window) */}
      {on.sky ? <GradientSky bottom="#fff0d2" middle="#ffd2a6" top="#e9b8c9" horizon={0.12} /> : null}
      {on.sky ? <ParallaxLayers layers={HILLS} /> : null}
      {set && on.glb ? <primitive object={set.scene} /> : null}

      {/* practicals */}
      {on.practicals && H.pendants.map((p, i) => (
        <pointLight key={i} position={p} color="#ffcf94" intensity={2.2} distance={6} decay={1.6} />
      ))}
      <pointLight position={[H.hero.x, H.hero.orbY, H.hero.z]} color="#7ff0d0" intensity={2.4} distance={3.2} decay={1.8} />
      <pointLight position={[3.0, 3.18, -3.6]} color="#ff7aa8" intensity={1.1} distance={2.6} decay={2} />

      {/* sun shaft through the window + motes inside it, pendant cones */}
      {on.cones ? <VolumetricCone position={[H.window.x, (H.window.y0 + H.window.y1) / 2, H.backZ + 0.1]} target={[-0.4, 0, -0.6]} length={5.4} radius={1.9} apexRadius={1.05} color="#ffcf9a" intensity={0.3} time={time} noise={0.45} /> : null}
      {on.cones && H.pendants.map((p, i) => (
        <VolumetricCone key={i} position={[p[0], p[1] + 0.06, p[2]]} length={2.2} radius={0.8} apexRadius={0.22} color="#ffe2b8" intensity={0.07} time={time + i * 3} noise={0.2} />
      ))}
      {on.dust ? <Dust center={[-0.9, 1.6, -1.8]} size={[3.6, 3.0, 3.8]} count={420} seed={11} time={time} pointSize={11} opacity={0.5} speed={0.6} /> : null}
      {/* light through the bell jar onto the floor */}
      {on.caustics ? <Caustics position={[H.hero.x - 0.2, 0.012, H.hero.z + 0.95]} size={[1.6, 1.1]} time={time} color="#b9fbe6" intensity={0.28} scale={1.4} /> : null}
    </>
  );
};
