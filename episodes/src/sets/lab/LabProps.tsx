// Candy-coloured lab props: glowing flasks with frame-driven bubbles, shelves, test-tube rack, Bunsen burner, posters, wall clock.
import React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { MASCOT_COLORS } from "./layout";
import { Matte } from "./LabRoom";
import { atomPoster, formulaPoster, periodicPoster, planetsPoster } from "./textures";

type V3 = [number, number, number];

const glass = <meshStandardMaterial color="#f4fbff" roughness={0.15} transparent opacity={0.28} depthWrite={false} />;

/** Liquid material: bright colour, optional soft self-glow. */
const Liquid: React.FC<{ color: string; glow: number }> = ({ color, glow }) => (
  <meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={glow} />
);

/** Bubbles rising through a liquid column. Pure function of the frame (phase-offset loop, no randomness). */
const Bubbles: React.FC<{ height: number; radius: number; count?: number; seed?: number; color: string }> = ({ height, radius, count = 4, seed = 0, color }) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const period = 46 + ((i * 17 + seed * 13) % 23);
        const u = ((f + i * 29 + seed * 41) % period) / period;
        const a = i * 2.4 + seed;
        const wob = Math.sin(u * Math.PI * 4 + i) * radius * 0.15;
        const s = 0.6 + 0.6 * u;
        return (
          <mesh key={i} position={[Math.cos(a) * radius * 0.45 + wob, height * u, Math.sin(a) * radius * 0.45]} scale={s}>
            <sphereGeometry args={[radius * 0.16, 8, 6]} />
            <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.6} transparent opacity={0.75 * Math.sin(u * Math.PI)} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};

export type FlaskKind = "erlenmeyer" | "round" | "beaker" | "tube";

/** A glass vessel partly filled with brightly coloured liquid. */
export const GlowFlask: React.FC<{ position: V3; color: string; kind?: FlaskKind; glow?: number; bubbles?: boolean; scale?: number; seed?: number }> = ({
  position,
  color,
  kind = "erlenmeyer",
  glow = 0.25,
  bubbles = false,
  scale = 1,
  seed = 0,
}) => (
  <group position={position} scale={scale}>
    {kind === "erlenmeyer" ? (
      <>
        <mesh castShadow position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.055, 0.1, 0.15, 16]} />
          <Liquid color={color} glow={glow} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.035, 0.112, 0.22, 16]} />
          {glass}
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.1, 12, 1, true]} />
          {glass}
        </mesh>
        {bubbles ? (
          <group position={[0, 0.02, 0]}>
            <Bubbles height={0.26} radius={0.09} seed={seed} color={color} />
          </group>
        ) : null}
      </>
    ) : kind === "round" ? (
      <>
        <mesh castShadow position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.095, 18, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
          <Liquid color={color} glow={glow} />
        </mesh>
        <mesh position={[0, 0.1, 0]} scale={[0.95, 0.42, 0.95]}>
          <circleGeometry args={[0.1, 18]} />
          <Liquid color={color} glow={glow} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.105, 18, 14]} />
          {glass}
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.12, 12, 1, true]} />
          {glass}
        </mesh>
        {bubbles ? (
          <group position={[0, 0.03, 0]}>
            <Bubbles height={0.3} radius={0.08} seed={seed} color={color} />
          </group>
        ) : null}
      </>
    ) : kind === "beaker" ? (
      <>
        <mesh castShadow position={[0, 0.065, 0]}>
          <cylinderGeometry args={[0.078, 0.078, 0.13, 16]} />
          <Liquid color={color} glow={glow} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.2, 16, 1, true]} />
          {glass}
        </mesh>
        {bubbles ? <Bubbles height={0.2} radius={0.08} seed={seed} color={color} /> : null}
      </>
    ) : (
      <>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.12, 10]} />
          <Liquid color={color} glow={glow} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.22, 10, 1, true]} />
          {glass}
        </mesh>
      </>
    )}
  </group>
);

const LIQUIDS = ["#ff6fa3", "#5fb4ff", "#ffcc33", "#a777e6", "#4fd6a0", "#ff8a4c"];

/** Wall-standing shelf unit full of glowing flasks. */
export const FlaskShelf: React.FC<{ position: V3; width?: number; levels?: number; color?: string; seed?: number }> = ({ position, width = 1.1, levels = 3, color = MASCOT_COLORS.lumi, seed = 0 }) => {
  const h = 0.62;
  const kinds: FlaskKind[] = ["erlenmeyer", "round", "beaker", "erlenmeyer", "round"];
  return (
    <group position={position}>
      {/* back + sides */}
      <mesh receiveShadow position={[0, (levels * h) / 2, -0.17]}>
        <boxGeometry args={[width, levels * h + 0.05, 0.03]} />
        <Matte color="#fffaf4" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow receiveShadow position={[(s * width) / 2, (levels * h) / 2, 0]}>
          <boxGeometry args={[0.05, levels * h + 0.05, 0.36]} />
          <Matte color={color} roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: levels + 1 }, (_, l) => (
        <mesh key={l} castShadow receiveShadow position={[0, l * h, 0]}>
          <boxGeometry args={[width, 0.04, 0.36]} />
          <Matte color={l === 0 ? color : "#fffaf4"} roughness={0.65} />
        </mesh>
      ))}
      {Array.from({ length: levels }, (_, l) =>
        [0, 1, 2, 3].map((k) => {
          const i = l * 4 + k + seed;
          const x = -width / 2 + 0.17 + (k * (width - 0.34)) / 3;
          return (
            <GlowFlask
              key={`${l}-${k}`}
              position={[x, l * h + 0.02, 0.02 * ((k % 2) * 2 - 1)]}
              color={LIQUIDS[i % LIQUIDS.length]}
              kind={kinds[i % kinds.length]}
              glow={i % 3 === 0 ? 0.9 : 0.3}
              bubbles={i % 3 === 0}
              scale={1.15}
              seed={i}
            />
          );
        }),
      )}
    </group>
  );
};

/** Little wooden-ish rack with coloured test tubes. */
export const TestTubeRack: React.FC<{ position: V3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh castShadow receiveShadow position={[0, 0.02, 0]}>
      <boxGeometry args={[0.42, 0.04, 0.12]} />
      <Matte color="#f6d9a0" />
    </mesh>
    <mesh castShadow position={[0, 0.13, 0]}>
      <boxGeometry args={[0.42, 0.03, 0.12]} />
      <Matte color="#f6d9a0" />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} castShadow position={[s * 0.2, 0.08, 0]}>
        <boxGeometry args={[0.025, 0.14, 0.12]} />
        <Matte color="#e8c27f" />
      </mesh>
    ))}
    {LIQUIDS.slice(0, 5).map((c, i) => (
      <GlowFlask key={c} kind="tube" position={[-0.15 + i * 0.075, 0.02, 0]} color={c} glow={0.45} />
    ))}
  </group>
);

/** Bunsen burner with a soft, frame-driven flicker. */
export const BunsenBurner: React.FC<{ position: V3 }> = ({ position }) => {
  const f = useCurrentFrame();
  const flick = 1 + 0.08 * Math.sin(f * 0.9) + 0.05 * Math.sin(f * 2.3 + 1);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.03, 18]} />
        <Matte color="#6e4a8f" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.22, 12]} />
        <meshStandardMaterial color="#cfd6de" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.07, 0.03]}>
        <boxGeometry args={[0.03, 0.025, 0.04]} />
        <Matte color={MASCOT_COLORS.zuzu} roughness={0.6} />
      </mesh>
      <group position={[0, 0.24, 0]} scale={[1, flick, 1]}>
        <mesh position={[0, 0.06, 0]}>
          <coneGeometry args={[0.03, 0.13, 12]} />
          <meshBasicMaterial color="#7fb8ff" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <coneGeometry args={[0.017, 0.06, 10]} />
          <meshBasicMaterial color="#e6f3ff" toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.32, 0.05]} color="#9cc7ff" intensity={0.35 * flick} distance={1.2} decay={2} />
    </group>
  );
};

export type PosterKind = "planets" | "atom" | "formula" | "periodic";
const POSTERS: Record<PosterKind, { tex: (font: string) => THREE.Texture; aspect: number }> = {
  planets: { tex: planetsPoster, aspect: 512 / 704 },
  atom: { tex: atomPoster, aspect: 512 / 704 },
  formula: { tex: formulaPoster, aspect: 1 },
  periodic: { tex: periodicPoster, aspect: 1024 / 640 },
};

/** A paper poster pinned flat to the wall (height in metres). */
export const Poster: React.FC<{ kind: PosterKind; position: V3; height: number; font: string; tilt?: number }> = ({ kind, position, height, font, tilt = 0 }) => {
  const p = POSTERS[kind];
  const tex = p.tex(font);
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh receiveShadow>
        <planeGeometry args={[height * p.aspect, height]} />
        <meshStandardMaterial map={tex} roughness={0.75} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.08} />
      </mesh>
      {/* tape corners */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * height * p.aspect * 0.42, height * 0.47, 0.004]} rotation={[0, 0, s * 0.5]}>
          <planeGeometry args={[0.14, 0.05]} />
          <meshBasicMaterial color="#fff6dc" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

/** Big friendly wall clock; hands are fixed at a cheerful 10:10 (no real-time clock). */
export const WallClock: React.FC<{ position: V3; radius?: number; color?: string }> = ({ position, radius = 0.5, color = MASCOT_COLORS.anna }) => (
  <group position={position}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, 0.07, 36]} />
      <Matte color="#fffdf8" />
    </mesh>
    <mesh position={[0, 0, 0.04]}>
      <torusGeometry args={[radius, radius * 0.1, 10, 36]} />
      <Matte color={color} roughness={0.55} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const big = i % 3 === 0;
      return (
        <mesh key={i} position={[Math.sin(a) * radius * 0.78, Math.cos(a) * radius * 0.78, 0.045]}>
          <circleGeometry args={[radius * (big ? 0.07 : 0.04), 12]} />
          <meshBasicMaterial color={big ? [MASCOT_COLORS.zuzu, MASCOT_COLORS.lumi, MASCOT_COLORS.anna, MASCOT_COLORS.miyu][i / 3] : "#c9bfb6"} />
        </mesh>
      );
    })}
    <mesh position={[-radius * 0.18, radius * 0.1, 0.05]} rotation={[0, 0, 1.05]}>
      <boxGeometry args={[radius * 0.06, radius * 0.45, 0.01]} />
      <Matte color="#3a2c24" />
    </mesh>
    <mesh position={[radius * 0.25, radius * 0.14, 0.055]} rotation={[0, 0, -1.05]}>
      <boxGeometry args={[radius * 0.04, radius * 0.62, 0.01]} />
      <Matte color="#3a2c24" />
    </mesh>
    <mesh position={[0, 0, 0.06]}>
      <circleGeometry args={[radius * 0.06, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  </group>
);
