// GRAVITY CHAMBERS: four tall glass tubes, each with its own floor, inner backdrop, light tint, label and height ruler.
import { ContactShadows } from "@react-three/drei";
import React from "react";
import * as THREE from "three";
import { CHAMBER, CHAMBER_LABEL_Y, chamberX, MASCOT_COLORS } from "./layout";
import { Matte } from "./LabRoom";
import { earthFloor, earthSky, jupiterFloor, jupiterSky, labelTexture, marsFloor, marsSky, moonFloor, moonSky, rulerTexture } from "./textures";

export type ChamberSpec = {
  id: string;
  title: string;
  sub: string;
  accent: string;
  floor: () => THREE.Texture;
  sky: () => THREE.Texture;
  /** interior light tint + intensity */
  tint: string;
  tintIntensity: number;
  backdropGlow: number;
};

/** The four planet presets (left → right). */
export const PLANET_CHAMBERS: ChamberSpec[] = [
  { id: "moon", title: "MOON", sub: "g = 1.62", accent: MASCOT_COLORS.miyu, floor: moonFloor, sky: moonSky, tint: "#d6deff", tintIntensity: 1.6, backdropGlow: 0.45 },
  { id: "mars", title: "MARS", sub: "g = 3.71", accent: MASCOT_COLORS.anna, floor: marsFloor, sky: marsSky, tint: "#ffc0a0", tintIntensity: 1.8, backdropGlow: 0.32 },
  { id: "earth", title: "EARTH", sub: "g = 9.81", accent: MASCOT_COLORS.lumi, floor: earthFloor, sky: earthSky, tint: "#fffaf0", tintIntensity: 1.4, backdropGlow: 0.32 },
  { id: "jupiter", title: "JUPITER", sub: "g = 24.79", accent: MASCOT_COLORS.zuzu, floor: jupiterFloor, sky: jupiterSky, tint: "#ffb060", tintIntensity: 3.0, backdropGlow: 0.3 },
];

export type MaxMarker = { height: number; color: string; /** 0..1 pop-in progress (eased by caller, may overshoot) */ pop: number };

export type GravityChamberProps = {
  spec: ChamberSpec;
  x: number;
  font: string;
  /** 0 = closed, 1 = fully open (front door slides round the back) */
  door?: number;
  marker?: MaxMarker | null;
  children?: React.ReactNode;
};

const H = CHAMBER.innerHeight;
const R = CHAMBER.radius;
const DOOR_ARC = (100 / 180) * Math.PI;

const glassMat = (
  <meshStandardMaterial color="#f2fbff" roughness={0.12} metalness={0} transparent opacity={0.09} depthWrite={false} side={THREE.DoubleSide} />
);

export const GravityChamber: React.FC<GravityChamberProps> = ({ spec, x, font, door = 0, marker, children }) => {
  const fy = CHAMBER.floorY;
  const label = labelTexture({ title: spec.title, sub: spec.sub, color: spec.accent, font });
  const ruler = rulerTexture(CHAMBER.rulerMax, font, spec.accent);
  const floor = spec.floor();
  const sky = spec.sky();
  return (
    <group position={[x, 0, 0]}>
      {/* pedestal */}
      <mesh castShadow receiveShadow position={[0, fy / 2, 0]}>
        <cylinderGeometry args={[R + 0.14, R + 0.18, fy, 40]} />
        <Matte color="#f6f0e7" />
      </mesh>
      <mesh position={[0, fy * 0.55, 0]}>
        <cylinderGeometry args={[R + 0.165, R + 0.165, 0.035, 40]} />
        <Matte color={spec.accent} roughness={0.6} />
      </mesh>
      {/* planet floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fy + 0.002, 0]} receiveShadow>
        <circleGeometry args={[R - 0.005, 40]} />
        <meshStandardMaterial map={floor} roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, fy + 0.006, 0]} scale={R * 1.8} far={2.2} blur={2.2} opacity={0.6} resolution={256} color="#3a2236" frames={Infinity} />
      {/* inner backdrop: back half-cylinder, slightly emissive so the planet reads under any light */}
      <mesh position={[0, fy + H / 2, 0]}>
        <cylinderGeometry args={[R - 0.02, R - 0.02, H, 40, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={sky} emissive="#ffffff" emissiveMap={sky} emissiveIntensity={spec.backdropGlow} roughness={0.9} side={THREE.BackSide} />
      </mesh>
      {/* tint light: each chamber has its own interior colour */}
      <pointLight position={[0, fy + H - 0.6, 0.15]} color={spec.tint} intensity={spec.tintIntensity} distance={6} decay={1.6} />
      <pointLight position={[0, fy + 0.9, 0.5]} color={spec.tint} intensity={spec.tintIntensity * 0.25} distance={2.5} decay={2} />

      {/* height ruler, inside the glass beside the mascot: 0 m at the chamber floor, marks every 0.5 m */}
      <mesh position={[R * 0.72, fy + CHAMBER.rulerMax / 2, -0.24]} rotation={[0, -0.35, 0]}>
        <planeGeometry args={[0.19, CHAMBER.rulerMax]} />
        <meshStandardMaterial map={ruler} transparent emissive="#ffffff" emissiveMap={ruler} emissiveIntensity={0.35} roughness={0.7} />
      </mesh>

      {/* MAX marker: a coloured bar frozen at the peak height */}
      {marker && marker.pop > 0 ? (
        <group position={[0, fy + marker.height, 0.05]} scale={[Math.max(0.001, marker.pop), 1, 1]}>
          <mesh>
            <boxGeometry args={[R * 1.8, 0.028, 0.02]} />
            <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={0.9} roughness={0.6} />
          </mesh>
          <mesh position={[R * 0.72 - 0.12, 0, 0.0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.05, 0.1, 3]} />
            <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={0.9} roughness={0.6} />
          </mesh>
        </group>
      ) : null}

      {children}

      {/* glass: fixed part + sliding front door */}
      <mesh position={[0, fy + H / 2, 0]} renderOrder={10}>
        <cylinderGeometry args={[R, R, H, 48, 1, true, DOOR_ARC / 2, Math.PI * 2 - DOOR_ARC]} />
        {glassMat}
      </mesh>
      <group rotation={[0, door * (DOOR_ARC * 1.15), 0]}>
        <mesh position={[0, fy + H / 2, 0]} renderOrder={11}>
          <cylinderGeometry args={[R + 0.012, R + 0.012, H, 24, 1, true, -DOOR_ARC / 2, DOOR_ARC]} />
          {glassMat}
        </mesh>
        {/* two soft highlight streaks sell the glass without hiding the mascot */}
        {[-0.62, 0.42].map((a, i) => (
          <mesh key={a} position={[Math.sin(a) * (R + 0.02), fy + H / 2 + (i ? 0.4 : -0.2), Math.cos(a) * (R + 0.02)]} rotation={[0, a, 0]} renderOrder={12}>
            <planeGeometry args={[i ? 0.035 : 0.06, H * (i ? 0.55 : 0.8)]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* rings + cap */}
      <mesh position={[0, fy + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.02, 0.035, 10, 48]} />
        <Matte color="#ece5dc" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, fy + H + 0.1, 0]}>
        <cylinderGeometry args={[R + 0.1, R + 0.06, 0.22, 40]} />
        <Matte color="#f6f0e7" />
      </mesh>
      <mesh position={[0, fy + H + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.07, 0.03, 10, 48]} />
        <Matte color={spec.accent} roughness={0.6} />
      </mesh>

      {/* big label on top */}
      <group position={[0, CHAMBER_LABEL_Y + 0.22, 0.05]} rotation={[-0.06, 0, 0]}>
        <mesh castShadow position={[0, 0, -0.03]}>
          <boxGeometry args={[1.38, 0.71, 0.05]} />
          <Matte color={spec.accent} roughness={0.6} />
        </mesh>
        <mesh>
          <planeGeometry args={[1.36, 0.68]} />
          <meshStandardMaterial map={label} emissive="#ffffff" emissiveMap={label} emissiveIntensity={0.2} roughness={0.7} transparent />
        </mesh>
        <mesh castShadow position={[0, -0.42, -0.03]}>
          <boxGeometry args={[0.08, 0.2, 0.05]} />
          <Matte color="#e8e0d6" />
        </mesh>
      </group>
    </group>
  );
};

export type GravityChambersProps = {
  font: string;
  specs?: ChamberSpec[];
  doors?: number[];
  markers?: (MaxMarker | null)[];
  /** per-chamber content (mascots), indexed like specs */
  contents?: React.ReactNode[];
};

export const GravityChambers: React.FC<GravityChambersProps> = ({ font, specs = PLANET_CHAMBERS, doors = [], markers = [], contents = [] }) => (
  <group>
    {specs.map((s, i) => (
      <GravityChamber key={s.id} spec={s} x={chamberX(i, specs.length)} font={font} door={doors[i] ?? 0} marker={markers[i] ?? null}>
        {contents[i]}
      </GravityChamber>
    ))}
  </group>
);
