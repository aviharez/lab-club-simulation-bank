// VACUUM PUMP: skid-mounted rotary pump (cyan motor with fins, belt guard, exhaust filter), a big pressure gauge on a
// stalk, a start button, and a ribbed hose to a target point (e.g. the VACUUM column's pedestal).
// Pure: `pressure` (0..1 atm) drives the gauge, `running` (0..1) the vibration + lamp, `time` (s) the shake phase.
import React, { useMemo } from "react";
import * as THREE from "three";
import { PressureGauge } from "./VacuumColumn";

export type VacuumPumpProps = {
  position: [number, number, number];
  rotationY?: number;
  font: string;
  pressure?: number;
  running?: number;
  /** 0..1 button press depth */
  press?: number;
  time?: number;
  /** hose end in world space (the pump's local frame is computed from position/rotationY) */
  hoseTo?: [number, number, number];
};

const STEEL = "#b9c2ca";
const STEEL_DK = "#5d6873";

export const VacuumPump: React.FC<VacuumPumpProps> = ({ position, rotationY = 0, font, pressure = 1, running = 0, press = 0, time = 0, hoseTo }) => {
  const shake = running * 0.004 * Math.sin(time * 2 * Math.PI * 24);
  // hose from the pump inlet (local [0.05, 0.42, -0.3]) to hoseTo, sagging onto the floor
  const hose = useMemo(() => {
    if (!hoseTo) return null;
    const c = Math.cos(rotationY);
    const s = Math.sin(rotationY);
    const toWorld = (l: [number, number, number]) =>
      new THREE.Vector3(position[0] + l[0] * c + l[2] * s, position[1] + l[1], position[2] - l[0] * s + l[2] * c);
    const a = toWorld([0.05, 0.42, -0.32]);
    const a2 = toWorld([0.05, 0.3, -0.55]);
    const b = new THREE.Vector3(...hoseTo);
    const mid = a2.clone().lerp(b, 0.5).setY(0.05);
    const b2 = b.clone().add(new THREE.Vector3(0, -0.1, 0.25));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a2, mid, b2, b]), 64, 0.045, 12, false);
  }, [hoseTo, position, rotationY]);
  return (
    <>
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* skid */}
        <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
          <boxGeometry args={[0.95, 0.08, 0.6]} />
          <meshStandardMaterial color={STEEL_DK} roughness={0.45} metalness={0.4} />
        </mesh>
        {[-0.44, 0.44].map((x) => (
          <mesh key={x} position={[x, 0.082, 0]}>
            <boxGeometry args={[0.06, 0.006, 0.6]} />
            <meshStandardMaterial color="#f2c230" roughness={0.55} />
          </mesh>
        ))}
        <group position={[0, shake, 0]}>
          {/* motor: cyan finned cylinder */}
          <mesh castShadow position={[-0.18, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.42, 32]} />
            <meshStandardMaterial color="#3cc8dc" roughness={0.42} />
          </mesh>
          {Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} position={[-0.36 + k * 0.06, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.185, 0.185, 0.014, 32]} />
              <meshStandardMaterial color="#2fa9bd" roughness={0.45} />
            </mesh>
          ))}
          <mesh castShadow position={[-0.42, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.06, 24]} />
            <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.45} />
          </mesh>
          {/* pump body + belt guard */}
          <mesh castShadow position={[0.2, 0.3, 0]}>
            <boxGeometry args={[0.32, 0.36, 0.34]} />
            <meshStandardMaterial color="#d7dde2" roughness={0.35} metalness={0.35} />
          </mesh>
          <mesh castShadow position={[0.39, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 28]} />
            <meshStandardMaterial color="#f2c230" roughness={0.5} />
          </mesh>
          {/* oil sight glass + exhaust filter */}
          <mesh position={[0.2, 0.22, 0.172]}>
            <circleGeometry args={[0.035, 20]} />
            <meshStandardMaterial color="#e8b04a" emissive="#c98a2a" emissiveIntensity={0.3} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0.22, 0.56, 0.05]}>
            <cylinderGeometry args={[0.06, 0.06, 0.18, 20]} />
            <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.45} />
          </mesh>
          {/* inlet port for the hose */}
          <mesh position={[0.05, 0.42, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 18]} />
            <meshStandardMaterial color={STEEL_DK} roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
        {/* gauge stalk + big gauge facing forward */}
        <mesh castShadow position={[-0.3, 0.68, 0.2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 10]} />
          <meshStandardMaterial color={STEEL_DK} roughness={0.4} metalness={0.5} />
        </mesh>
        <PressureGauge pressure={pressure} font={font} size={0.42} position={[-0.3, 1.08, 0.23]} rotation={[-0.1, 0, 0]} />
        {/* start button box with run lamp */}
        <group position={[0.32, 0.62, 0.2]}>
          <mesh castShadow position={[0, -0.27, 0]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color={STEEL_DK} roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.14, 0.12]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.075 - 0.015 * press, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
            <meshStandardMaterial color="#e8483a" emissive="#ff4a3a" emissiveIntensity={0.3 + 1.2 * running} roughness={0.45} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.061]}>
            <circleGeometry args={[0.018, 14]} />
            <meshStandardMaterial color="#7cffb0" emissive="#59f59b" emissiveIntensity={0.2 + 3 * running} roughness={0.5} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {hose ? (
        <mesh geometry={hose} castShadow receiveShadow>
          <meshStandardMaterial color="#2c3136" roughness={0.55} />
        </mesh>
      ) : null}
    </>
  );
};
