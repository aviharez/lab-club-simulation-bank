// EP05 props: the balls (one instanced mesh), a highlighted path trail, the machine glass, the ball counter display,
// bet tags on the bins and Miyu's brass scoop. Pure functions of their props: the episode drives every ball position,
// the counter value and the tags from data.ts / timeline.ts.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../../kit/env";
import { ARCADE } from "../layout";

const M = ARCADE.machine;

/** A canvas texture redrawn synchronously on every render (deterministic). */
const useCanvas = (w: number, h: number) => {
  const res = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t, ctx: c.getContext("2d")! };
  }, [w, h]);
  useEffect(() => () => res.texture.dispose(), [res]);
  return res;
};

// ---------------------------------------------------------------- balls

export type BallDraw = { pos: Vec3; /** 0 ivory .. 1 teal highlight */ hi?: number; /** another highlight colour (k 0..1) */ tint?: { color: string; k: number }; /** 0..1 extra glow (a landing flash) */ glow?: number };

const IVORY = new THREE.Color("#f3e6cc");
const TEAL = new THREE.Color("#3fe6d6");
const AMBER = new THREE.Color("#ffc070");

/** Every ball of the pour in one InstancedMesh (capacity = max balls ever drawn). Glossy ivory marbles. */
export const Balls: React.FC<{ balls: BallDraw[]; capacity: number; radius?: number }> = ({ balls, capacity, radius = M.ballR }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 14, 10);
    const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.34, metalness: 0.02 });
    const m = new THREE.InstancedMesh(geo, mat, capacity);
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = true;
    return m;
  }, [capacity]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const tc = useMemo(() => new THREE.Color(), []);
  const n = Math.min(capacity, balls.length);
  for (let k = 0; k < n; k++) {
    const b = balls[k];
    o.position.set(b.pos[0], b.pos[1], b.pos[2]);
    o.scale.setScalar(radius);
    o.updateMatrix();
    mesh.setMatrixAt(k, o.matrix);
    c.copy(IVORY).lerp(TEAL, b.hi ?? 0);
    if (b.tint) c.lerp(tc.set(b.tint.color), b.tint.k).multiplyScalar(1 + 0.6 * b.tint.k);
    if (b.glow) c.lerp(AMBER, 0.5 * b.glow).multiplyScalar(1 + 1.5 * b.glow);
    mesh.setColorAt(k, c);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** A glowing trail along a ball's path (points in order), drawn up to `progress` (0..1), fading toward its tail. */
export const PathTrail: React.FC<{ points: Vec3[]; progress?: number; color?: string; width?: number; opacity?: number }> = ({
  points,
  progress = 1,
  color = "#3fe6d6",
  width = 0.006,
  opacity = 0.9,
}) => {
  const n = Math.max(2, Math.round(points.length * Math.max(0, Math.min(1, progress))));
  const geo = useMemo(() => {
    const pts = points.slice(0, n).map((p) => new THREE.Vector3(p[0], p[1], p[2] + 0.004));
    if (pts.length < 2) return null;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), width, 6, false);
  }, [points, n, width]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2.2)} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

/**
 * Many paths at once (e.g. all 924 paths into the centre bin) as one additive line set: segments used by many paths
 * glow brighter. Every path must have the same number of points; `progress` (0..1) reveals all of them top-down together.
 */
export const PathFan: React.FC<{ paths: Vec3[][]; progress?: number; color?: string; opacity?: number }> = ({ paths, progress = 1, color = "#ffd84a", opacity = 0.1 }) => {
  const geo = useMemo(() => {
    const n = paths.length;
    const S = n ? paths[0].length : 0;
    const pos = new Float32Array(Math.max(0, S - 1) * n * 6);
    let o = 0;
    for (let s = 0; s < S - 1; s++)
      for (const p of paths) {
        pos.set([p[s][0], p[s][1], p[s][2] + 0.005, p[s + 1][0], p[s + 1][1], p[s + 1][2] + 0.005], o);
        o += 6;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [paths]);
  useEffect(() => () => geo.dispose(), [geo]);
  const S = paths.length ? paths[0].length : 0;
  const steps = Math.round(Math.max(0, Math.min(1, progress)) * (S - 1));
  geo.setDrawRange(0, steps * paths.length * 2);
  if (!steps) return null;
  return (
    <lineSegments geometry={geo} renderOrder={4}>
      <lineBasicMaterial color={new THREE.Color(color).multiplyScalar(1.6)} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
};

// ---------------------------------------------------------------- glass

/** The machine's glass front: a faint tinted pane plus soft diagonal reflection streaks (additive), and the funnel pane. */
export const MachineGlass: React.FC<{ streak?: number }> = ({ streak = 1 }) => {
  const { texture, ctx, canvas } = useCanvas(256, 512);
  useMemo(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const band = (x0: number, w: number, a: number) => {
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, "rgba(255,240,215,0)");
      g.addColorStop(0.5, `rgba(255,240,215,${a})`);
      g.addColorStop(1, "rgba(255,240,215,0)");
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(128, 256);
      ctx.rotate(-0.42);
      ctx.translate(-128, -256);
      ctx.fillRect(x0, -300, w, 1100);
      ctx.restore();
    };
    band(30, 70, 0.55);
    band(110, 18, 0.4);
    band(185, 40, 0.25);
    texture.needsUpdate = true;
  }, [ctx, canvas, texture]);
  const w = 2 * M.halfW;
  const h = M.topY - M.binY0;
  const fh = M.funnel.mouthY - M.funnel.neckY + 0.04;
  return (
    <group>
      <mesh position={[0, (M.topY + M.binY0) / 2, M.glassZ]} renderOrder={2}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#dfeee8" roughness={0.12} metalness={0.3} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh position={[0, (M.topY + M.binY0) / 2, M.glassZ + 0.002]} renderOrder={3}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} transparent opacity={0.11 * streak} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, (M.funnel.mouthY + M.funnel.neckY) / 2, M.glassZ]} renderOrder={2}>
        <planeGeometry args={[2 * M.funnel.mouthHalf, fh]} />
        <meshStandardMaterial color="#dfeee8" roughness={0.04} metalness={0.3} transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- counter display

/** Amber nixie-style counter in the window on the machine's left shoulder ("BALLS 0000"). */
export const BallCounter: React.FC<{ value: number; font: string; position: Vec3; size?: [number, number] }> = ({ value, font, position, size = [0.47, 0.125] }) => {
  const { texture, ctx } = useCanvas(512, 136);
  {
    ctx.fillStyle = "#0b0705";
    ctx.fillRect(0, 0, 512, 136);
    ctx.fillStyle = "#7a5a32";
    ctx.font = `700 34px ${font}`;
    ctx.textBaseline = "middle";
    ctx.fillText("BALLS", 22, 70);
    const digits = String(Math.max(0, Math.min(9999, Math.round(value)))).padStart(4, "0");
    for (let k = 0; k < 4; k++) {
      const x = 190 + k * 76;
      ctx.fillStyle = "#1a100a";
      ctx.fillRect(x, 14, 66, 108);
      ctx.fillStyle = "#ffb347";
      ctx.shadowColor = "#ff8a20";
      ctx.shadowBlur = 16;
      ctx.font = `700 92px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(digits[k], x + 33, 72);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
    texture.needsUpdate = true;
  }
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color(1.5, 1.5, 1.5)} />
    </mesh>
  );
};

// ---------------------------------------------------------------- bet tags

/** A hanging card tag (name + colour) clipped to the glass bezel above a bin. Origin = the clip point. */
export const BetTag: React.FC<{ label: string; color: string; font: string; position: Vec3; swing?: number; glow?: number; scale?: number }> = ({ label, color, font, position, swing = 0, glow = 0, scale = 1 }) => {
  const { texture, ctx } = useCanvas(256, 128);
  {
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 116, 26);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#2a1a10";
    ctx.stroke();
    ctx.fillStyle = "#2a1a10";
    ctx.font = `700 66px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 70);
    ctx.fillStyle = "#e6c57a";
    ctx.beginPath();
    ctx.arc(128, 20, 9, 0, Math.PI * 2);
    ctx.fill();
    texture.needsUpdate = true;
  }
  return (
    <group position={position} rotation={[0, 0, swing]} scale={scale}>
      <mesh position={[0, -0.045, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.09, 6]} />
        <meshStandardMaterial color="#c9a04a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.135, 0.002]}>
        <planeGeometry args={[0.2, 0.1]} />
        <meshStandardMaterial map={texture} transparent roughness={0.6} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.35 + glow} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Lumi's clipboard

/** A walnut clipboard with a brass clip and a sheet with a hand-drawn bell sketch. Origin = the grip at its bottom edge. */
export const Clipboard: React.FC<{ font: string }> = ({ font }) => {
  const { texture, ctx } = useCanvas(256, 340);
  useMemo(() => {
    ctx.fillStyle = "#fbf6ea";
    ctx.fillRect(0, 0, 256, 340);
    ctx.strokeStyle = "#cfe0f3";
    ctx.lineWidth = 3;
    for (let y = 70; y < 340; y += 26) {
      ctx.beginPath();
      ctx.moveTo(14, y);
      ctx.lineTo(242, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#2a1a10";
    ctx.font = `700 34px ${font}`;
    ctx.fillText("BINS", 20, 52);
    // the binomial bars C(12,k) as a sketch (13 bars, heights ∝ C(12,k))
    const c = [1, 12, 66, 220, 495, 792, 924, 792, 495, 220, 66, 12, 1];
    ctx.fillStyle = "#6fa8e8";
    c.forEach((v, k) => ctx.fillRect(22 + k * 16.5, 300 - (v / 924) * 190, 12, (v / 924) * 190 + 1));
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, 302);
    ctx.lineTo(240, 302);
    ctx.stroke();
    texture.needsUpdate = true;
  }, [ctx, texture, font]);
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.16, 0.22, 0.008]} />
        <meshStandardMaterial color="#5a3720" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.105, 0.0045]}>
        <planeGeometry args={[0.14, 0.186]} />
        <meshStandardMaterial map={texture} roughness={0.8} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.212, 0.008]}>
        <boxGeometry args={[0.06, 0.022, 0.01]} />
        <meshStandardMaterial color="#c9a04a" metalness={0.9} roughness={0.28} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Miyu's scoop

/** A brass scoop (open end toward +x local), optionally heaped with balls. Origin = the handle grip. */
export const Scoop: React.FC<{ position: Vec3; yaw?: number; tilt?: number; full?: number }> = ({ position, yaw = 0, tilt = 0, full = 1 }) => {
  const heap = useMemo(() => {
    const out: Vec3[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 22; k++) out.push([0.08 + rnd() * 0.12, 0.03 + rnd() * 0.04, (rnd() - 0.5) * 0.08]);
    return out;
  }, []);
  const brass = <meshStandardMaterial color="#c9a04a" metalness={0.92} roughness={0.25} side={THREE.DoubleSide} />;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, -tilt]}>
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.014, 0.1, 10]} />
          <meshStandardMaterial color="#3a2214" roughness={0.5} />
        </mesh>
        <mesh position={[0.14, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.055, 0.2, 20, 1, true, 0, Math.PI * 1.25]} />
          {brass}
        </mesh>
        <mesh position={[0.04, 0.03, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.058, 20]} />
          {brass}
        </mesh>
        {heap.slice(0, Math.round(heap.length * full)).map((p, k) => (
          <mesh key={k} position={p}>
            <sphereGeometry args={[M.ballR, 10, 8]} />
            <meshStandardMaterial color="#f3e6cc" roughness={0.22} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
