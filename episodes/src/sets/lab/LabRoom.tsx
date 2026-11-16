// Low-poly candy lab room: checker floor and striped walls in light mascot colours, whiteboard, bench, plants, pendant lamps.
import React from "react";
import { MASCOT_COLORS, PASTEL } from "./layout";
import { BunsenBurner, FlaskShelf, GlowFlask, Poster, TestTubeRack, WallClock } from "./LabProps";
import { floorTiles, wallPanels, whiteboardTexture } from "./textures";

const ACCENTS = [MASCOT_COLORS.miyu, MASCOT_COLORS.anna, MASCOT_COLORS.lumi, MASCOT_COLORS.zuzu];

/** Matte pastel material shorthand (roughness 0.6-0.9 as per the look). */
export const Matte: React.FC<{ color: string; roughness?: number; flat?: boolean; emissive?: string; emissiveIntensity?: number }> = ({
  color,
  roughness = 0.8,
  flat,
  emissive,
  emissiveIntensity,
}) => <meshStandardMaterial color={color} roughness={roughness} metalness={0} flatShading={flat} emissive={emissive} emissiveIntensity={emissiveIntensity} />;

const WALL_Z = -1.45;

export const Plant: React.FC<{ position: [number, number, number]; scale?: number; pot?: string; seed?: number }> = ({ position, scale = 1, pot = PASTEL.pot, seed = 0 }) => {
  // leaves: a fixed fan of flattened low-poly blobs (no randomness, the seed only rotates the fan)
  const leaves = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = (i / 7) * Math.PI * 2 + seed;
    const tall = i % 2 === 0;
    return { a, h: tall ? 0.62 : 0.48, r: tall ? 0.13 : 0.18 };
  });
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 0.34, 10]} />
        <Matte color={pot} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.345, 0]} receiveShadow>
        <cylinderGeometry args={[0.185, 0.185, 0.02, 10]} />
        <Matte color="#9c7a5f" roughness={0.95} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} castShadow position={[Math.cos(l.a) * l.r, 0.34 + l.h * 0.55, Math.sin(l.a) * l.r]} rotation={[Math.sin(l.a) * 0.5, l.a, Math.cos(l.a) * 0.5]} scale={[0.11, l.h * 0.5, 0.05]}>
          <icosahedronGeometry args={[1, 0]} />
          <Matte color={i % 2 ? PASTEL.leaf : PASTEL.leafDark} flat roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

export const LabBench: React.FC<{ position: [number, number, number]; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh castShadow receiveShadow position={[0, 0.86, 0]}>
      <boxGeometry args={[2.1, 0.08, 0.8]} />
      <Matte color="#fffaf2" roughness={0.65} />
    </mesh>
    {/* cabinet body with colour-coded drawers */}
    <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
      <boxGeometry args={[2.0, 0.8, 0.72]} />
      <Matte color="#e6dcf5" />
    </mesh>
    {ACCENTS.map((c, i) => (
      <group key={i} position={[-0.72 + i * 0.48, 0.5, 0.365]}>
        <mesh>
          <boxGeometry args={[0.42, 0.3, 0.02]} />
          <Matte color="#f8f2ea" />
        </mesh>
        <mesh position={[0, 0.04, 0.02]}>
          <boxGeometry args={[0.16, 0.035, 0.03]} />
          <Matte color={c} roughness={0.6} />
        </mesh>
      </group>
    ))}
    <GlowFlask position={[-0.85, 0.9, 0.08]} color="#5fb4ff" glow={0.8} bubbles seed={1} />
    <GlowFlask position={[-0.62, 0.9, -0.15]} color="#ff6fa3" kind="round" glow={0.8} bubbles seed={2} />
    <BunsenBurner position={[-0.35, 0.9, 0.05]} />
    <TestTubeRack position={[0.0, 0.9, -0.18]} />
    <GlowFlask position={[0.2, 0.9, 0.16]} color="#ffcc33" kind="beaker" glow={0.5} />
    {/* microscope-ish instrument */}
    <group position={[0.45, 0.9, -0.05]}>
      <mesh castShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.26]} />
        <Matte color="#d8d2ca" />
      </mesh>
      <mesh castShadow position={[0.08, 0.22, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.08, 0.38, 0.1]} />
        <Matte color={MASCOT_COLORS.miyu} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.02, 0.4, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.04, 0.05, 0.16, 10]} />
        <Matte color="#efe9e2" />
      </mesh>
    </group>
    {/* stack of notebooks */}
    {["#f6d68a", "#f4a9bd", "#a9c8f4"].map((c, i) => (
      <mesh key={c} castShadow position={[0.85, 0.92 + i * 0.045, 0.08]} rotation={[0, 0.15 * (i - 1), 0]}>
        <boxGeometry args={[0.36, 0.04, 0.26]} />
        <Matte color={c} />
      </mesh>
    ))}
  </group>
);

export const Whiteboard: React.FC<{ position: [number, number, number]; font: string; size?: [number, number] }> = ({ position, font, size = [2.3, 1.45] }) => {
  const tex = whiteboardTexture(font);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0, -0.02]}>
        <boxGeometry args={[size[0] + 0.12, size[1] + 0.12, 0.05]} />
        <Matte color="#dcd5cd" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.006]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial map={tex} roughness={0.6} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.12} />
      </mesh>
      {/* marker tray with the four colours */}
      <mesh castShadow position={[0, -size[1] / 2 - 0.07, 0.06]}>
        <boxGeometry args={[size[0] * 0.6, 0.04, 0.1]} />
        <Matte color="#cfc8c0" />
      </mesh>
      {ACCENTS.map((c, i) => (
        <mesh key={c} castShadow position={[-0.35 + i * 0.22, -size[1] / 2 - 0.035, 0.07]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
          <Matte color={c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

const PendantLamp: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 1.2, 0]}>
      <cylinderGeometry args={[0.012, 0.012, 2.4, 6]} />
      <Matte color="#cfc6bc" />
    </mesh>
    <mesh castShadow position={[0, 0, 0]}>
      <coneGeometry args={[0.32, 0.26, 16, 1, true]} />
      <meshStandardMaterial color={color} roughness={0.7} side={2} />
    </mesh>
    <mesh position={[0, -0.09, 0]}>
      <sphereGeometry args={[0.1, 14, 10]} />
      <meshStandardMaterial color="#fff6e0" emissive="#fff1cc" emissiveIntensity={3} roughness={0.6} />
    </mesh>
  </group>
);

/** The room shell + set dressing. Chambers and the control panel are separate components. */
export const LabRoom: React.FC<{ font: string }> = ({ font }) => {
  const floor = floorTiles();
  const wall = wallPanels();
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]} receiveShadow>
        <planeGeometry args={[36, 24]} />
        <meshStandardMaterial map={floor} roughness={0.85} />
      </mesh>
      {/* back wall: panels above, mint wainscot below, accent stripe in the four mascot colours */}
      <mesh position={[0, 6, WALL_Z]} receiveShadow>
        <planeGeometry args={[36, 12]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, WALL_Z + 0.03]} receiveShadow castShadow>
        <boxGeometry args={[36, 1.1, 0.06]} />
        <Matte color="#e3f1e9" roughness={0.85} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position={[-18 + 0.75 + i * 1.5, 1.16, WALL_Z + 0.05]}>
          <boxGeometry args={[1.5, 0.09, 0.04]} />
          <Matte color={ACCENTS[i % 4]} roughness={0.7} />
        </mesh>
      ))}
      {/* skirting */}
      <mesh position={[0, 0.06, WALL_Z + 0.07]} receiveShadow>
        <boxGeometry args={[36, 0.12, 0.06]} />
        <Matte color={PASTEL.wallTrim} />
      </mesh>
      {/* a pale ceiling band so iso shots don't see a void */}
      <mesh position={[0, 11.5, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 12]} />
        <Matte color="#f7f1e8" />
      </mesh>

      <Whiteboard position={[4.75, 2.45, WALL_Z + 0.08]} font={font} />
      {/* candy wall dressing: big clock between the lamps, posters, shelves of glowing flasks */}
      <WallClock position={[0, 6.55, WALL_Z + 0.06]} radius={0.46} />
      <Poster kind="atom" position={[3.22, 3.75, WALL_Z + 0.02]} height={0.86} font={font} tilt={0.03} />
      <Poster kind="planets" position={[6.55, 2.55, WALL_Z + 0.02]} height={1.35} font={font} tilt={-0.02} />
      <Poster kind="formula" position={[-3.5, 3.4, WALL_Z + 0.02]} height={0.72} font={font} tilt={-0.04} />
      <Poster kind="periodic" position={[-5.0, 3.05, WALL_Z + 0.02]} height={1.05} font={font} />
      <FlaskShelf position={[-3.5, 0.02, WALL_Z + 0.22]} width={1.0} levels={4} color={MASCOT_COLORS.anna} seed={0} />
      <FlaskShelf position={[4.75, 3.36, WALL_Z + 0.22]} width={1.9} levels={1} color={MASCOT_COLORS.lumi} seed={3} />
      <FlaskShelf position={[6.55, 0.02, WALL_Z + 0.22]} width={1.0} levels={2} color={MASCOT_COLORS.zuzu} seed={5} />

      <LabBench position={[-4.55, 0, -0.55]} />
      <Plant position={[-3.25, 0, 0.75]} scale={1.15} seed={0.3} />
      <Plant position={[5.9, 0, -0.6]} scale={1.4} pot="#cfe3f6" seed={1.1} />
      <Plant position={[-6.0, 0, -0.75]} scale={1.3} pot="#f6d9a0" seed={2.2} />
      <Plant position={[3.15, 0, -0.75]} scale={0.95} pot="#e9d4f2" seed={0.9} />

      {[-2.175, -0.725, 0.725, 2.175].map((x, i) => (
        <PendantLamp key={x} position={[x, 6.45, 0.2]} color={ACCENTS[i]} />
      ))}
    </group>
  );
};
