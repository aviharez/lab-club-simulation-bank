// EP04 props: door leaves, the trophy, the rubber duck, the scoreboard screen, Zuzu's sign. Pure functions of their
// props: the episode drives door angles, screen text and sign text from data.ts / timeline.ts.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";

const INK = "#2a1d3d";
const GOLD = "#d8a84a";

/** A canvas texture redrawn synchronously on every render (deterministic, like the EP03 stopwatch). */
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

const goldMat = <meshStandardMaterial color={GOLD} roughness={0.28} metalness={0.9} />;

// ---------------------------------------------------------------- door leaf

/** A pastel door leaf hinged on its left edge. Origin = bottom of the hinge line, closed leaf spans +x, front face +z.
 * open: 0 closed .. 1 fully open (swings toward the camera). */
export const DoorLeaf: React.FC<{
  width: number;
  height: number;
  color: string;
  label: string;
  font: string;
  open?: number;
  thickness?: number;
  /** emissive kick on the leaf (a flash when it is picked) */
  glow?: number;
}> = ({ width, height, color, label, font, open = 0, thickness = 0.06, glow = 0 }) => {
  const { texture, ctx } = useCanvas(256, 256);
  {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#fff8ec";
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `700 178px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 140);
    texture.needsUpdate = true;
  }
  const w = width - 0.02;
  const h = height - 0.01;
  const lighter = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.28).getStyle(), [color]);
  const darker = useMemo(() => new THREE.Color(color).lerp(new THREE.Color(INK), 0.16).getStyle(), [color]);
  const mat = <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.08 + glow * 0.6} />;
  const plaque = Math.min(w * 0.62, 0.62);
  return (
    <group rotation={[0, -open * 1.72, 0]}>
      <group position={[w / 2 + 0.01, h / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, thickness]} />
          {mat}
        </mesh>
        {/* raised panels + their darker bevel lines */}
        {[
          [0, h * 0.2, w * 0.74, h * 0.28],
          [0, -h * 0.27, w * 0.74, h * 0.3],
        ].map(([x, y, pw, ph], i) => (
          <group key={i} position={[x, y, thickness / 2]}>
            <mesh position={[0, 0, 0.004]}>
              <boxGeometry args={[pw + 0.03, ph + 0.03, 0.008]} />
              <meshStandardMaterial color={darker} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0, 0.012]}>
              <boxGeometry args={[pw, ph, 0.014]} />
              <meshStandardMaterial color={lighter} roughness={0.45} emissive={color} emissiveIntensity={0.06 + glow * 0.5} />
            </mesh>
          </group>
        ))}
        {/* number plaque */}
        <mesh position={[0, h * 0.2, thickness / 2 + 0.022]}>
          <circleGeometry args={[plaque / 2, 48]} />
          <meshStandardMaterial map={texture} transparent emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
        {/* knob + plate */}
        <mesh position={[w / 2 - 0.12, -h * 0.02, thickness / 2 + 0.03]} castShadow>
          <sphereGeometry args={[0.035, 20, 14]} />
          {goldMat}
        </mesh>
        <mesh position={[w / 2 - 0.12, -h * 0.02, thickness / 2 + 0.006]}>
          <boxGeometry args={[0.05, 0.16, 0.012]} />
          {goldMat}
        </mesh>
        {/* hinges */}
        {[h * 0.38, -h * 0.38].map((y) => (
          <mesh key={y} position={[-w / 2, y, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.12, 12]} />
            {goldMat}
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- prizes

/** Gold trophy cup (prize). Origin at the base bottom; ~0.55 m tall at scale 1. */
export const Trophy: React.FC<{ position?: [number, number, number]; scale?: number; yaw?: number; shine?: number }> = ({ position = [0, 0, 0], scale = 1, yaw = 0, shine = 0 }) => {
  const cup = useMemo(() => {
    const pts = [
      [0.0, 0.0], [0.15, 0.0], [0.15, 0.035], [0.12, 0.05], [0.12, 0.09], [0.1, 0.1], [0.04, 0.13], [0.03, 0.2], [0.045, 0.23],
      [0.09, 0.25], [0.15, 0.3], [0.17, 0.38], [0.175, 0.46], [0.18, 0.48], [0.165, 0.48], [0.155, 0.4], [0.13, 0.32], [0.0, 0.29],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  useEffect(() => () => cup.dispose(), [cup]);
  const gold = <meshStandardMaterial color="#e9b64a" roughness={0.22} metalness={1} emissive="#ffb43a" emissiveIntensity={0.12 + shine * 0.9} />;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <mesh geometry={cup} castShadow>
        {gold}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.18, 0.38, 0]} rotation={[0, 0, s * 0.25]} castShadow>
          <torusGeometry args={[0.07, 0.016, 10, 24, Math.PI * 1.25]} />
          {gold}
        </mesh>
      ))}
      {/* plinth with a star plate */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[0.32, 0.1, 0.32]} />
        <meshStandardMaterial color="#2a1d3d" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.05, 0.161]}>
        <boxGeometry args={[0.18, 0.05, 0.004]} />
        {gold}
      </mesh>
      <mesh position={[0, 0.535, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.022, 5]} />
        {gold}
      </mesh>
    </group>
  );
};

/** Rubber duck (dud). Origin at its belly bottom, facing +x at yaw 0 (like the actors); ~0.36 m tall at scale 1. */
export const Duck: React.FC<{ position?: [number, number, number]; scale?: number; yaw?: number; squash?: number }> = ({ position = [0, 0, 0], scale = 1, yaw = 0, squash = 0 }) => {
  const yellow = <meshStandardMaterial color="#ffd54d" roughness={0.32} emissive="#ffb000" emissiveIntensity={0.05} />;
  const sy = 1 - 0.18 * squash;
  const sxz = 1 + 0.1 * squash;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale * sxz, scale * sy, scale * sxz]}>
      <mesh position={[0, 0.12, 0]} scale={[1.3, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.14, 28, 20]} />
        {yellow}
      </mesh>
      <mesh position={[-0.17, 0.19, 0]} rotation={[0, 0, 0.7]} scale={[0.6, 0.35, 0.6]} castShadow>
        <sphereGeometry args={[0.1, 16, 12]} />
        {yellow}
      </mesh>
      <mesh position={[0.08, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.095, 28, 20]} />
        {yellow}
      </mesh>
      <mesh position={[0.18, 0.25, 0]} scale={[1.3, 0.45, 1]}>
        <sphereGeometry args={[0.05, 18, 12]} />
        <meshStandardMaterial color="#ff8a3d" roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.135, 0.3, s * 0.06]}>
          <sphereGeometry args={[0.017, 12, 10]} />
          <meshStandardMaterial color="#1d1428" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- scoreboard screen

export type ScoreCell = { label: string; value: string; color: string; sub?: string };

/** The glowing scoreboard screen (plane facing +z, origin at its centre). title on top, up to 3 cells below. */
export const ScoreboardScreen: React.FC<{ size: [number, number]; font: string; title: string; cells: ScoreCell[]; brightness?: number }> = ({ size, font, title, cells, brightness = 1 }) => {
  const W = 1400;
  const H = Math.round((W * size[1]) / size[0]);
  const { texture, ctx } = useCanvas(W, H);
  {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2b1050");
    g.addColorStop(1, "#160828");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // LED dot texture
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 6; y < H; y += 12) for (let x = 6; x < W; x += 12) ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe08a";
    ctx.shadowColor = "#ffb43a";
    ctx.shadowBlur = 18;
    ctx.font = `700 ${Math.round(H * 0.2)}px ${font}`;
    ctx.fillText(title, W / 2, H * 0.17);
    const n = Math.max(1, cells.length);
    cells.forEach((c, i) => {
      const cx = (W * (i + 0.5)) / n;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = c.color;
      ctx.font = `700 ${Math.round(H * 0.15)}px ${font}`;
      ctx.fillText(c.label, cx, H * 0.4);
      ctx.fillStyle = "#fff6e8";
      ctx.font = `700 ${Math.round(H * 0.36)}px ${font}`;
      ctx.fillText(c.value, cx, H * 0.68);
      if (c.sub) {
        ctx.fillStyle = c.color;
        ctx.font = `600 ${Math.round(H * 0.11)}px ${font}`;
        ctx.fillText(c.sub, cx, H * 0.91);
      }
    });
    ctx.shadowBlur = 0;
    if (n > 1) {
      ctx.fillStyle = "rgba(255,224,138,0.35)";
      for (let i = 1; i < n; i++) ctx.fillRect((W * i) / n - 2, H * 0.32, 4, H * 0.6);
    }
    texture.needsUpdate = true;
  }
  return (
    <mesh>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color(brightness, brightness, brightness)} />
    </mesh>
  );
};

// ---------------------------------------------------------------- Zuzu's sign

/** A cheer sign on two sticks. Origin = midpoint between the two hands; sticks rise along +y, board faces +z.
 * handGap: distance between the hands (m). */
export const CheerSign: React.FC<{ text: string; sub?: string; font: string; handGap: number; color?: string; tilt?: number }> = ({ text, sub, font, handGap, color = "#ff7ab8", tilt = 0 }) => {
  const { texture, ctx } = useCanvas(512, 300);
  {
    ctx.fillStyle = "#fff6e8";
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 288, 34);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    let size = 132;
    ctx.font = `700 ${size}px ${font}`;
    while (ctx.measureText(text).width > 440 && size > 40) ctx.font = `700 ${(size -= 4)}px ${font}`;
    ctx.fillText(text, 256, sub ? 126 : 156);
    if (sub) {
      ctx.fillStyle = color;
      ctx.font = `700 54px ${font}`;
      ctx.fillText(sub, 256, 236);
    }
    // little stars in the corners
    ctx.fillStyle = "#f2b93b";
    for (const [x, y] of [[48, 48], [464, 48], [48, 252], [464, 252]]) {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 ? 8 : 20;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.fill();
    }
    texture.needsUpdate = true;
  }
  const BW = Math.max(0.62, handGap + 0.16);
  const BH = BW * (300 / 512);
  const STICK = 0.5;
  const wood = <meshStandardMaterial color="#c99a62" roughness={0.7} />;
  return (
    <group rotation={[0, 0, tilt]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * handGap) / 2, STICK / 2 - 0.04, -0.005]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, STICK + 0.08, 10]} />
          {wood}
        </mesh>
      ))}
      <group position={[0, STICK + BH / 2 - 0.02, 0]}>
        <mesh castShadow position={[0, 0, -0.012]}>
          <boxGeometry args={[BW + 0.02, BH + 0.02, 0.016]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh>
          <planeGeometry args={[BW, BH]} />
          <meshStandardMaterial map={texture} roughness={0.7} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.18} />
        </mesh>
      </group>
    </group>
  );
};
