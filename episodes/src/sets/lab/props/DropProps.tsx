// Drop-test props: a fluffy feather and a geologist's hammer. Both are modelled with their origin at the point that
// touches the floor first when they hang level (feather: its lowest barb tip; hammer: the bottom of the head), so
// a caller places them at [x, floorY + height, z] straight from the data.
// `sway` (radians) and `spin` are decorative pose only (the height always comes from the episode's data).
import React, { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "../../../kit/random";

/** Feather length (m): oversized for phone readability next to 1 m chibis. */
export const FEATHER_LEN = 0.34;

export const Feather: React.FC<{
  position?: [number, number, number];
  sway?: number;
  spin?: number;
  scale?: number;
  /** barb colour (default: white); a pale tint keeps it readable against a white set */
  color?: string;
  tip?: string;
}> = ({ position = [0, 0, 0], sway = 0, spin = 0, scale = 1, color = "#fbfcfd", tip = "#7fdcea" }) => {
  const L = FEATHER_LEN;
  // barbs: thin curved blades along the rachis, longer in the middle, downy and splayed at the base
  const geo = useMemo(() => {
    const r = seeded(41);
    const blades: THREE.BufferGeometry[] = [];
    const n = 54;
    for (let k = 0; k < n; k++) {
      const s = k / (n - 1); // 0 base .. 1 tip
      for (const side of [-1, 1]) {
        const len = L * (0.2 + 0.32 * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.7) * (0.9 + 0.2 * r());
        const g = new THREE.PlaneGeometry(len, 0.011 + 0.006 * (1 - s), 4, 1);
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i) + len / 2; // 0..len from the rachis
          pos.setY(i, pos.getY(i) + 0.08 * x * x * (s < 0.25 ? -3 : 1)); // barbs curve toward the tip, down at the base
          pos.setX(i, x);
          pos.setZ(i, 0.04 * x * x * (r() - 0.5) * 8 * (s < 0.25 ? 1.6 : 0.6)); // fluff
        }
        g.rotateZ(side > 0 ? 0.5 + (r() - 0.5) * 0.12 : Math.PI - 0.5 + (r() - 0.5) * 0.12);
        g.translate(0, s * L * 0.92, 0);
        blades.push(g);
      }
    }
    const merged = mergeGeometries(blades);
    merged.computeVertexNormals();
    return merged;
  }, [L]);
  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      {/* lies roughly level while falling (tilted by sway); origin at its centre-bottom */}
      <group rotation={[0, 0, Math.PI / 2 - 0.25 + sway]} position={[0, 0.035, 0]}>
        <group position={[0, -L / 2, 0]}>
          <mesh geometry={geo} castShadow>
            <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} transparent opacity={0.96} />
          </mesh>
          {/* rachis (shaft) + quill */}
          <mesh position={[0, L * 0.4, 0]}>
            <cylinderGeometry args={[0.0025, 0.005, L * 0.95, 8]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.6} />
          </mesh>
          <mesh position={[0, -L * 0.1, 0]}>
            <cylinderGeometry args={[0.005, 0.0035, L * 0.12, 8]} />
            <meshStandardMaterial color="#d7cdbb" roughness={0.5} />
          </mesh>
          {/* cyan tip so the feather reads against the white hall */}
          <mesh position={[0, L * 0.86, 0]} scale={[1, 1.8, 0.3]}>
            <sphereGeometry args={[0.03, 12, 8]} />
            <meshStandardMaterial color={tip} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/** Hammer head width (m). */
export const HAMMER_LEN = 0.36;

export const Hammer: React.FC<{ position?: [number, number, number]; tilt?: number; spin?: number; scale?: number }> = ({
  position = [0, 0, 0],
  tilt = 0,
  spin = 0,
  scale = 1,
}) => (
  // hangs head-down (as it is held by the end of the handle); origin at the bottom of the head
  <group position={position} rotation={[0, spin, tilt]} scale={scale}>
    <group position={[0, 0.03, 0]}>
      {/* head: steel block + pick, pointing sideways */}
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.06, 0.06]} />
        <meshStandardMaterial color="#c3cbd2" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 20]} />
        <meshStandardMaterial color="#a6afb6" roughness={0.28} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0.11, -0.01, 0]} rotation={[0, 0, -Math.PI / 2 - 0.25]}>
        <coneGeometry args={[0.026, 0.14, 4]} />
        <meshStandardMaterial color="#c3cbd2" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* handle: ash wood with a cyan rubber grip */}
      <mesh castShadow position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.016, 0.019, 0.3, 14]} />
        <meshStandardMaterial color="#c7955f" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.11, 14]} />
        <meshStandardMaterial color="#2fa9bd" roughness={0.75} />
      </mesh>
    </group>
  </group>
);

// tiny local merge (BufferGeometryUtils' mergeGeometries, non-indexed planes only)
const mergeGeometries = (gs: THREE.BufferGeometry[]) => {
  const parts = gs.map((g) => g.toNonIndexed());
  const count = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
};
