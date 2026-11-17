// Live props of the night plaza: glowing floor trails, the ghost walkers (one InstancedMesh of translucent capsules,
// not 50 skinned actors), the growing √n circle, the measuring tape and its case. Every prop is a pure function of
// its props; positions come from the episode's data (tile centres), never from the frame clock.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../kit/env";
import { TILE } from "../layout";

const FLOOR_Y = 0.012;

/**
 * A glowing ribbon on the floor through `points` (tile centres, in order), drawn up to `upTo` segments (fractional:
 * the last segment is drawn partway). Square caps, additive: segments walked twice glow brighter.
 */
export const FloorTrail: React.FC<{ points: Vec3[]; upTo: number; color: string; width?: number; opacity?: number; glow?: number; y?: number }> = ({
  points,
  upTo,
  color,
  width = 0.09,
  opacity = 0.85,
  glow = 0.28,
  y = FLOOR_Y,
}) => {
  const n = Math.max(0, Math.min(points.length - 1, upTo));
  const build = (w: number) => {
    const segs = Math.ceil(n);
    if (segs <= 0) return null;
    const pos = new Float32Array(segs * 18);
    let o = 0;
    for (let s = 0; s < segs; s++) {
      const a = points[s];
      const b0 = points[s + 1];
      const k = Math.min(1, n - s);
      const b: Vec3 = [a[0] + (b0[0] - a[0]) * k, 0, a[2] + (b0[2] - a[2]) * k];
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const L = Math.hypot(dx, dz) || 1;
      const ux = dx / L;
      const uz = dz / L;
      const h = w / 2;
      // square caps: extend both ends by half the width
      const ax = a[0] - ux * h;
      const az = a[2] - uz * h;
      const bx = b[0] + ux * h;
      const bz = b[2] + uz * h;
      const px = -uz * h;
      const pz = ux * h;
      const q = [ax + px, az + pz, bx + px, bz + pz, bx - px, bz - pz, ax - px, az - pz];
      pos.set([q[0], y, q[1], q[2], y, q[3], q[4], y, q[5], q[0], y, q[1], q[4], y, q[5], q[6], y, q[7]], o);
      o += 18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  };
  const core = useMemo(() => build(width), [points, n, width, y]); // eslint-disable-line react-hooks/exhaustive-deps
  const halo = useMemo(() => build(width * 3.2), [points, n, width, y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => core?.dispose(), [core]);
  useEffect(() => () => halo?.dispose(), [halo]);
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(1.6), [color]);
  if (!core || !halo) return null;
  return (
    <group renderOrder={2}>
      <mesh geometry={halo} renderOrder={2}>
        <meshBasicMaterial color={c} toneMapped={false} transparent opacity={glow * opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={core} renderOrder={3}>
        <meshBasicMaterial color={c} toneMapped={false} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/** A soft glowing disc on the floor (a trail head, a tile highlight). */
export const FloorGlow: React.FC<{ position: Vec3; radius: number; color: string; intensity?: number }> = ({ position, radius, color, intensity = 1 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { c: { value: new THREE.Color(color) }, k: { value: intensity } },
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 c; uniform float k; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(c * a * k, 1.0); }",
      }),
    [color, intensity],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[position[0], position[1] + 0.004, position[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
};

export type GhostDraw = { pos: Vec3; scale: number; opacity?: number };

/** The ghost walkers: translucent glowing yellow capsules (one InstancedMesh, `capacity` instances). */
export const Ghosts: React.FC<{ ghosts: GhostDraw[]; capacity: number; color?: string; opacity?: number }> = ({ ghosts, capacity, color = "#ffd84a", opacity = 0.5 }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.CapsuleGeometry(0.11, 0.3, 6, 14);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity, depthWrite: false });
    const m = new THREE.InstancedMesh(geo, mat, capacity);
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    m.renderOrder = 4;
    return m;
  }, [capacity, color, opacity]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new THREE.Object3D(), []);
  const n = Math.min(capacity, ghosts.length);
  for (let k = 0; k < n; k++) {
    const g = ghosts[k];
    o.position.set(g.pos[0], g.pos[1] + 0.26 * g.scale, g.pos[2]);
    o.scale.setScalar(Math.max(1e-4, g.scale));
    o.updateMatrix();
    mesh.setMatrixAt(k, o.matrix);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** A ring on the floor: radius in metres (the √n circle). */
export const FloorRing: React.FC<{ radius: number; color?: string; width?: number; opacity?: number; fill?: number; center?: Vec3 }> = ({
  radius,
  color = "#9cc4ff",
  width = 0.05,
  opacity = 0.95,
  fill = 0.06,
  center = [0, 0, 0],
}) => {
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(1.5), [color]);
  if (radius <= 0.01) return null;
  return (
    <group position={[center[0], FLOOR_Y + 0.002, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={2}>
        <ringGeometry args={[Math.max(0, radius - width / 2), radius + width / 2, 160]} />
        <meshBasicMaterial color={c} toneMapped={false} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh renderOrder={1}>
        <ringGeometry args={[Math.max(0, radius - width * 3), radius + width * 3, 160]} />
        <meshBasicMaterial color={c} toneMapped={false} transparent opacity={opacity * 0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {fill > 0 ? (
        <mesh renderOrder={1}>
          <circleGeometry args={[radius, 160]} />
          <meshBasicMaterial color={c} toneMapped={false} transparent opacity={fill} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Tick texture for the tape: one tile per repeat (a major tick at the tile edge, a minor one at the half). */
const useTapeTexture = () => {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 32;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#ffd84a";
    g.fillRect(0, 0, 256, 32);
    g.fillStyle = "#3a2c24";
    g.fillRect(0, 0, 10, 22);
    g.fillRect(124, 0, 6, 12);
    for (const x of [64, 192]) g.fillRect(x, 0, 3, 7);
    g.fillRect(0, 29, 256, 3);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
};

/**
 * A measuring tape lying on the floor from `from` to `to` (metres), unrolled to `progress` (0..1), ticks every tile
 * starting at `from`. Width in metres.
 */
export const Tape: React.FC<{ from: Vec3; to: Vec3; progress: number; width?: number; y?: number }> = ({ from, to, progress, width = 0.07, y = 0.02 }) => {
  const tex = useTapeTexture();
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const L = Math.hypot(dx, dz) * Math.max(0, Math.min(1, progress));
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: "#ffd84a", emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }), [tex]);
  useEffect(() => () => mat.dispose(), [mat]);
  tex.repeat.set(L / TILE, 1);
  if (L < 0.005) return null;
  const ang = Math.atan2(dz, dx);
  return (
    <group position={[from[0], y, from[2]]} rotation={[0, -ang, 0]}>
      <mesh position={[L / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[L, width]} />
      </mesh>
    </group>
  );
};

/** The tape-measure case (held by Miyu): a chunky yellow-navy reel. Local origin at its centre. */
export const TapeCase: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <group scale={scale}>
    <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.075, 0.075, 0.05, 28]} />
      <meshStandardMaterial color="#ffd84a" roughness={0.45} />
    </mesh>
    <mesh position={[0, 0, 0.027]}>
      <circleGeometry args={[0.05, 24]} />
      <meshStandardMaterial color="#1c2440" roughness={0.4} />
    </mesh>
    <mesh position={[0.07, -0.045, 0]}>
      <boxGeometry args={[0.04, 0.02, 0.03]} />
      <meshStandardMaterial color="#1c2440" roughness={0.4} />
    </mesh>
  </group>
);
