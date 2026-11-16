// Gravity lab set (EP01): the Blender-built GLB (assets/sets/gravity-lab, AO baked to vertex colours) plus the live
// parts: the dusk sky, stars and a ringed planet seen through the oculus, the oculus light shaft with dust, practical
// lights, and animated nodes (orrery arms, rack LEDs, neon). The chambers and the console stay separate components
// (src/sets/lab: GravityChambers, ControlPanel) because the episode drives them (doors, markers, screen text).
// Everything is a pure function of `time` (world seconds: slows down with the episode's slow-mo).
//   const set = useSetGLB("gravity-lab");      // outside the canvas
//   <SetStage look={GRAVITY_LAB_LOOK} …><GravityLab set={set} time={worldTime(f)} /> …chambers, console, actors…</SetStage>
import React, { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "../../kit/random";
import { Dust, GradientSky, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";

/** Layout numbers shared with the Blender build script (three.js coordinates, metres). */
export const GRAVITY_LAB = {
  backZ: -2.6,
  oculus: { x: 0, y: 7.25, r: 1.3 },
  gantry: { x: 3.35, y: 6.15, z: -0.95 },
  pendants: [
    [-5.0, 4.15, 0.2],
    [5.1, 4.35, 0.2],
  ] as Vec3[],
  screens: [5.35, 2.55, -2.3] as Vec3,
  orrery: [-4.7, 1.4, -2.1] as Vec3,
};

const Stars: React.FC<{ count?: number; seed?: number }> = ({ count = 260, seed = 5 }) => {
  const geo = useMemo(() => {
    const r = seeded(seed);
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (r() - 0.5) * 34;
      p[i * 3 + 1] = 3 + r() * 22;
      p[i * 3 + 2] = -18 - r() * 6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count, seed]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#fff6e8" size={2.2} sizeAttenuation={false} fog={false} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
};

const RingedPlanet: React.FC<{ position: Vec3; radius: number }> = ({ position, radius }) => (
  <group position={position} rotation={[0.25, 0, -0.32]}>
    <mesh>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshStandardMaterial color="#e3c08f" emissive="#c98f6a" emissiveIntensity={0.55} roughness={0.8} fog={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
      <ringGeometry args={[radius * 1.35, radius * 1.95, 64]} />
      <meshStandardMaterial color="#f1dfc0" emissive="#d9b88f" emissiveIntensity={0.4} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.8} fog={false} />
    </mesh>
  </group>
);

export type GravityLabParts = { sky?: boolean; glb?: boolean; shaft?: boolean; dust?: boolean; practicals?: boolean };

export const GravityLab: React.FC<{ set: LoadedSet | null; time: number; parts?: GravityLabParts }> = ({ set, time, parts = {} }) => {
  const on = { sky: true, glb: true, shaft: true, dust: true, practicals: true, ...parts };
  const G = GRAVITY_LAB;
  const blink = useMemo(() => {
    const r = seeded(17);
    return Array.from({ length: 48 }, () => (r() < 0.3 ? 0.35 : 1));
  }, []);
  if (set) {
    const { nodes } = set;
    // orrery: inner planets faster (Kepler-ish ratios, purely decorative)
    [1.6, 1.1, 0.75, 0.42].forEach((w, k) => {
      const arm = nodes[`orrery_arm_${k}`];
      if (arm) arm.rotation.y = time * w + k * 1.7;
    });
    const leds = nodes.rack_leds_noshadow as THREE.Mesh | undefined;
    if (leds?.material) (leds.material as THREE.MeshStandardMaterial).emissiveIntensity = 6 * blink[Math.floor(time * 4) % blink.length];
    const neon = nodes.neon_noshadow as THREE.Mesh | undefined;
    if (neon?.material) (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = 4.5 + 0.5 * Math.sin(time * 1.3);
  }
  const O = G.oculus;
  return (
    <>
      {on.sky ? <GradientSky bottom="#f0b79a" middle="#7a7cb6" top="#2a2f5e" horizon={-0.05} /> : null}
      {on.sky ? <Stars /> : null}
      {on.sky ? <RingedPlanet position={[1.15, 9.55, -16]} radius={0.5} /> : null}
      {set && on.glb ? <primitive object={set.scene} /> : null}

      {on.practicals ? (
        <>
          {G.pendants.map((p, i) => (
            <pointLight key={i} position={p} color="#ffcf94" intensity={3} distance={7} decay={1.6} />
          ))}
          {/* neon sign + spot housings on the gantry: warm glow on the labels and caps */}
          <pointLight position={[0, G.gantry.y - 0.3, G.gantry.z + 0.9]} color="#ffc777" intensity={1.6} distance={5} decay={1.8} />
          {/* mission wall screens */}
          <pointLight position={[G.screens[0], G.screens[1], G.screens[2] + 0.9]} color="#7fe0e8" intensity={1.3} distance={4} decay={1.8} />
          {/* orrery sun + desk lamp */}
          <pointLight position={G.orrery} color="#ffc46b" intensity={0.9} distance={2.2} decay={2} />
          <pointLight position={[5.88, 1.3, -2.05]} color="#ffd9a0" intensity={0.8} distance={2} decay={2} />
        </>
      ) : null}

      {/* cool dusk light falling through the oculus, motes inside it */}
      {on.shaft ? (
        <VolumetricCone position={[O.x, O.y, G.backZ + 0.05]} target={[0.4, 0, 3.2]} length={8.5} radius={2.5} apexRadius={1.15} color="#b8c4ff" intensity={0.12} time={time} noise={0.4} />
      ) : null}
      {on.dust ? <Dust center={[0.2, 3.6, 0.6]} size={[5, 5.5, 3.5]} count={420} seed={21} time={time} pointSize={10} opacity={0.4} speed={0.5} color="#e8ecff" /> : null}
    </>
  );
};
