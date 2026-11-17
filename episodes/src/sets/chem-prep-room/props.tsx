// Props of the chem-prep-room set (EP07): the 12 beakers (glass + coloured liquid, level = value), and Zuzu's finish
// flag (a checkered banner on two sticks between the hands, same grip convention as the game-show CheerSign).
// All pure functions of their props (no clocks).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BEAKER, liquidHeight, SLOTS } from "./layout";

/** Liquid colour of value v (1 = shortest … 12 = tallest): a warm → cool spectrum, so the sorted row reads as a ramp. */
export const LIQUID_COLORS = Array.from({ length: SLOTS }, (_, k) => {
  const c = new THREE.Color();
  // hue 352° (rose) → 262° (violet) the long way round through orange, yellow, green, cyan, blue
  const h = ((352 + (k / (SLOTS - 1)) * 270) % 360) / 360;
  c.setHSL(h, 0.92, k >= 3 && k <= 5 ? 0.42 : 0.47);
  return `#${c.getHexString()}`;
});
export const liquidColor = (v: number) => LIQUID_COLORS[Math.min(SLOTS, Math.max(1, v)) - 1];

const GLASS = new THREE.MeshStandardMaterial({ color: "#eef7f4", roughness: 0.06, metalness: 0, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
const GLASS_RIM = new THREE.MeshStandardMaterial({ color: "#f7fbfa", roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
const TICK = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4, transparent: true, opacity: 0.75, depthWrite: false });

export type BeakerProps = {
  value: number;
  position: [number, number, number];
  /** a glowing ring on the coaster (compare / swap highlight) */
  ring?: { color: string; intensity: number } | null;
  /** the final-place lamp in front of the beaker */
  locked?: number;
  /** 0..1 how much the liquid glows from the backlight */
  glow?: number;
};

export const Beaker: React.FC<BeakerProps> = ({ value, position, ring, locked = 0, glow = 1 }) => {
  const color = liquidColor(value);
  const liq = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.12, emissive: new THREE.Color(color), emissiveIntensity: 0.28 }), [color]);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35), roughness: 0.1, emissive: new THREE.Color(color), emissiveIntensity: 0.4 }), [color]);
  useEffect(
    () => () => {
      liq.dispose();
      top.dispose();
    },
    [liq, top],
  );
  liq.emissiveIntensity = 0.28 * glow;
  top.emissiveIntensity = 0.35 * glow;
  const lh = liquidHeight(value);
  const R = BEAKER.r;
  return (
    <group position={position}>
      {/* liquid column + meniscus */}
      <mesh position={[0, BEAKER.base + lh / 2, 0]} material={liq} castShadow>
        <cylinderGeometry args={[R - 0.008, R - 0.008, lh, 28]} />
      </mesh>
      <mesh position={[0, BEAKER.base + lh + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={top}>
        <circleGeometry args={[R - 0.008, 28]} />
      </mesh>
      {/* glass: thick base, open wall, rolled rim, small spout */}
      <mesh position={[0, BEAKER.base / 2, 0]} material={GLASS}>
        <cylinderGeometry args={[R, R, BEAKER.base, 28]} />
      </mesh>
      <mesh position={[0, BEAKER.h / 2, 0]} material={GLASS} renderOrder={2}>
        <cylinderGeometry args={[R, R, BEAKER.h, 32, 1, true]} />
      </mesh>
      <mesh position={[0, BEAKER.h, 0]} rotation={[Math.PI / 2, 0, 0]} material={GLASS_RIM} renderOrder={3}>
        <torusGeometry args={[R, 0.004, 6, 32]} />
      </mesh>
      <mesh position={[-R * 0.96, BEAKER.h - 0.004, 0]} rotation={[0, 0, 0.5]} material={GLASS_RIM} renderOrder={3}>
        <boxGeometry args={[0.018, 0.01, 0.03]} />
      </mesh>
      {/* graduation ticks on the camera side: one per level step, a longer one every 3 */}
      {Array.from({ length: SLOTS }, (_, k) => (
        <mesh key={k} position={[R * 0.35, BEAKER.base + liquidHeight(k + 1), R * 0.94]} material={TICK} renderOrder={4}>
          <boxGeometry args={[(k + 1) % 3 === 0 ? 0.034 : 0.018, 0.0025, 0.002]} />
        </mesh>
      ))}
      {ring && ring.intensity > 0.01 ? (
        <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[R + 0.004, R + 0.022, 40]} />
          <meshBasicMaterial color={new THREE.Color(ring.color).multiplyScalar(1 + 1.6 * ring.intensity)} transparent opacity={Math.min(1, ring.intensity)} toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
      {locked > 0.01 ? (
        <mesh position={[0, 0.006, 0.115]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color={new THREE.Color("#8ff0a8").multiplyScalar(1 + locked)} transparent opacity={locked} toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Checkered FINISH banner on two sticks. Origin = the mid-point between the hands (hold_sign grip). */
export const FinishFlag: React.FC<{ font: string; handGap: number; wave?: number }> = ({ font, handGap, wave = 0 }) => {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useMemo(() => {
    const c = texture.image as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const n = 8;
    const s = 512 / n;
    for (let y = 0; y < 5; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#2b2420" : "#fff8ec";
      ctx.fillRect(x * s, y * s, s, s);
    }
    ctx.fillStyle = "#fff8ec";
    ctx.beginPath();
    ctx.roundRect(40, 104, 432, 112, 26);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#f2bf3b";
    ctx.stroke();
    ctx.fillStyle = "#2b2420";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 92px ${font}`;
    ctx.fillText("FINISH", 256, 164);
    texture.needsUpdate = true;
  }, [texture, font]);
  const BW = Math.max(0.62, handGap + 0.16);
  const BH = BW * (320 / 512);
  const geo = useMemo(() => new THREE.PlaneGeometry(BW, BH, 16, 1), [BW, BH]);
  useEffect(() => () => geo.dispose(), [geo]);
  // a gentle cloth wave (pure function of `wave`, seconds)
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / BW + 0.5;
    pos.setZ(i, 0.025 * Math.sin(x * Math.PI * 2.2 + wave * 5) * Math.sin(x * Math.PI));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const STICK = 0.62;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * handGap) / 2, 0.12, 0.02]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, STICK, 10]} />
          <meshStandardMaterial color="#c99a62" roughness={0.7} />
        </mesh>
      ))}
      <mesh geometry={geo} position={[0, 0.12 + STICK / 2 - BH / 2 + 0.02, 0.025]} castShadow>
        <meshStandardMaterial map={texture} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
