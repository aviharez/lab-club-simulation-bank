// Night plaza (EP06): the Blender-built GLB (assets/sets/night-plaza, AO baked to vertex colours) plus the live
// parts: the night sky (gradient dome, seeded stars, the moon), warm lamp light (point lights near the action, glow
// pools on the stone, faint haze cones), the pulsing start ring, the sign glow and drifting mist motes.
// Everything is a pure function of `time` (world seconds).
//   const set = useSetGLB("night-plaza");      // outside the canvas
//   <SetStage look={NIGHT_PLAZA_LOOK} …><NightPlaza set={set} time={t} /> …trails, ghosts, actors…</SetStage>
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Dust, GradientSky, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";
import { seeded } from "../../kit/random";
import { lampHeads, NIGHT_PLAZA } from "./layout";
import { FloorGlow } from "./props";

export { NIGHT_PLAZA } from "./layout";

export type NightPlazaParts = { glb?: boolean; sky?: boolean; lamps?: boolean; haze?: boolean; dust?: boolean };

const LAMP = "#ffb35c";

const Stars: React.FC<{ count?: number; seed?: number; time: number }> = ({ count = 700, seed = 606, time }) => {
  const { geo, mat } = useMemo(() => {
    const r = seeded(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // upper sky only (above ~8° elevation), uniform on the sphere cap
      const y = 0.14 + 0.86 * r();
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(1 - y * y);
      const R = 74;
      pos.set([Math.cos(a) * s * R, y * R, Math.sin(a) * s * R], i * 3);
      const b = 0.35 + 0.65 * r() ** 2;
      const warm = r() < 0.2;
      col.set(warm ? [b, b * 0.92, b * 0.8] : [b * 0.85, b * 0.92, b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, fog: false, toneMapped: false, depthWrite: false });
    return { geo: g, mat: m };
  }, [count, seed]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  mat.opacity = 0.82 + 0.08 * Math.sin(time * 1.3);
  return <points geometry={geo} material={mat} renderOrder={-9} />;
};

const Moon: React.FC<{ dir: Vec3 }> = ({ dir }) => {
  const l = Math.hypot(...dir);
  const p: Vec3 = [(dir[0] / l) * 70, (dir[1] / l) * 70, (dir[2] / l) * 70];
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        uniforms: { c: { value: new THREE.Color("#9db8ff") } },
        vertexShader:
          "varying float vF; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 c; varying float vF; void main() { gl_FragColor = vec4(c * pow(vF, 4.0) * 0.55, 1.0); }",
      }),
    [],
  );
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <group position={p}>
      <mesh renderOrder={-8}>
        <sphereGeometry args={[2.1, 32, 16]} />
        <meshBasicMaterial color={new THREE.Color("#eef3ff").multiplyScalar(1.7)} toneMapped={false} fog={false} />
      </mesh>
      <mesh renderOrder={-8} material={glow}>
        <sphereGeometry args={[9, 32, 16]} />
      </mesh>
    </group>
  );
};

export const NightPlaza: React.FC<{ set: LoadedSet | null; time: number; parts?: NightPlazaParts; startGlow?: number }> = ({ set, time, parts = {}, startGlow = 1 }) => {
  const on = { glb: true, sky: true, lamps: true, haze: true, dust: true, ...parts };
  const A = NIGHT_PLAZA;
  const heads = useMemo(lampHeads, []);
  // the start ring pulses softly (kept node "start_glow")
  const glowNode = set?.nodes["start_glow"] as THREE.Mesh | undefined;
  if (glowNode?.material) {
    const m = glowNode.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = startGlow * (2.6 + 0.6 * Math.sin(time * 3.2));
  }
  // real lamp light only near the action (the far lamps get glow pools, haze and their bloom)
  const lit = heads.filter((p) => p[2] > -17);
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      {on.sky ? (
        <>
          <GradientSky bottom="#1b2648" middle="#0f1838" top="#050915" radius={78} horizon={0.06} />
          <Stars time={time} />
          <Moon dir={A.moonDisc} />
        </>
      ) : null}
      {on.lamps ? (
        <>
          {lit.map((p, i) => (
            <pointLight key={i} position={[p[0], p[1] - 0.1, p[2]]} color={LAMP} intensity={5.5} distance={7.5} decay={1.7} />
          ))}
          {heads.map((p, i) => (
            <FloorGlow key={`g${i}`} position={[p[0] * 0.97, 0, p[2]]} radius={2.4} color={LAMP} intensity={0.22} />
          ))}
          {/* the entrance canopy + sign */}
          <pointLight position={[A.canopy[0], A.canopy[1], A.canopy[2] + 0.6]} color="#ffc47a" intensity={8} distance={9} decay={1.5} />
          <FloorGlow position={[0, 0, -43.6]} radius={3.6} color="#ffc47a" intensity={0.3} />
        </>
      ) : null}
      {on.haze
        ? heads.map((p, i) => (
            <VolumetricCone key={`h${i}`} position={[p[0], p[1] + 0.1, p[2]]} length={p[1] + 0.1} radius={1.5} apexRadius={0.14} color="#ffbf73" intensity={0.07} time={time + i * 1.7} noise={0.3} />
          ))
        : null}
      {on.dust ? (
        <>
          <Dust center={[0, 1.6, -2]} size={[14, 3.2, 16]} count={380} seed={611} time={time} pointSize={7} opacity={0.22} speed={0.18} color="#b9ccff" />
          <Dust center={[0, 1.2, 7]} size={[10, 2.4, 6]} count={120} seed={612} time={time} pointSize={10} opacity={0.18} speed={0.15} color="#ffd9a8" />
        </>
      ) : null}
    </>
  );
};
