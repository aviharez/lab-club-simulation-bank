// VACUUM COLUMN: a tall glass drop tube in the GravityChamber style (soft glass + highlight streaks, accent rings,
// label plaque on top, height ruler inside) with brushed-steel caps, a release ledge, glove ports, cyan LED rings and a
// pressure gauge on the pedestal. Reusable for any drop/vacuum episode. Everything is driven by props (pure).
//   <VacuumColumn x={-0.9} title="AIR" sub="normal air" pressure={1} font={FONT}>{falling props}</VacuumColumn>
import React from "react";
import * as THREE from "three";
import { Matte } from "../LabRoom";
import { canvasTexture, labelTexture, rulerTexture } from "../textures";

export const COLUMN = {
  /** tube floor (pedestal top) */
  floorY: 0.3,
  /** inner glass height */
  glassH: 3.7,
  radius: 0.5,
  /** release ledge above the tube floor (m) */
  ledge: 3,
  /** ruler range (m) */
  rulerMax: 3,
};

export type VacuumColumnProps = {
  x: number;
  z?: number;
  title: string;
  sub: string;
  accent?: string;
  font: string;
  /** 0..1 of one atmosphere: drives the gauge needle and the LED tint */
  pressure?: number;
  /** glove ports at ledge height, as angles around the glass (radians: 0 = front, +π/2 = right side) */
  ports?: number[];
  /** 0..1 glow pulse on the LED rings (e.g. while pumping) */
  pulse?: number;
  children?: React.ReactNode;
};

const glassMat = (
  <meshStandardMaterial color="#eefcff" roughness={0.1} metalness={0} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
);
const STEEL = "#b9c2ca";
const STEEL_DK = "#5d6873";

/** Gauge dial: 0..100 kPa over a 270° sweep, cyan "vacuum" band at the low end. */
const gaugeTexture = (font: string) =>
  canvasTexture(`vac-gauge-${font}`, 512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = "#f7f9fa";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    ctx.lineWidth = 34;
    ctx.strokeStyle = "#3cc8dc";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.37, a0, a0 + sweep * 0.12);
    ctx.stroke();
    ctx.strokeStyle = "#25292e";
    for (let k = 0; k <= 20; k++) {
      const a = a0 + (sweep * k) / 20;
      const major = k % 5 === 0;
      ctx.lineWidth = major ? 8 : 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.41, cy + Math.sin(a) * w * 0.41);
      ctx.lineTo(cx + Math.cos(a) * w * (major ? 0.32 : 0.36), cy + Math.sin(a) * w * (major ? 0.32 : 0.36));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = "#25292e";
        ctx.font = `700 44px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(k * 5), cx + Math.cos(a) * w * 0.24, cy + Math.sin(a) * w * 0.24);
      }
    }
    ctx.font = `700 46px ${font}`;
    ctx.fillStyle = "#5d6873";
    ctx.fillText("kPa", cx, cy + h * 0.27);
  });

/** Needle angle (radians, about the dial's normal) for a pressure 0..1 atm (0..100 kPa scale, 101.3 = 1 atm). */
export const needleAngle = (pressure: number) => {
  const kPa = Math.min(100, Math.max(0, pressure * 101.325));
  // dial: 0 at 135° (screen, clockwise from +x), 100 at 405°; three rotation.z is counter-clockwise
  return -(Math.PI * 0.75 + (Math.PI * 1.5 * kPa) / 100);
};

export const PressureGauge: React.FC<{ pressure: number; font: string; size?: number; position?: [number, number, number]; rotation?: [number, number, number] }> = ({
  pressure,
  font,
  size = 0.32,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const tex = gaugeTexture(font);
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[size * 0.56, size * 0.56, 0.05, 40]} />
        <meshStandardMaterial color={STEEL} roughness={0.32} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <circleGeometry args={[size * 0.5, 40]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      {/* needle: pivot at the centre, points along +x before rotating */}
      <group position={[0, 0, 0.034]} rotation={[0, 0, needleAngle(pressure)]}>
        <mesh position={[size * 0.17, 0, 0]}>
          <boxGeometry args={[size * 0.38, size * 0.03, 0.006]} />
          <meshStandardMaterial color="#d9453a" roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.04]}>
        <circleGeometry args={[size * 0.05, 16]} />
        <meshStandardMaterial color="#25292e" roughness={0.5} />
      </mesh>
      {/* glass cover */}
      <mesh position={[0, 0, 0.045]}>
        <circleGeometry args={[size * 0.5, 40]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} roughness={0.05} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const VacuumColumn: React.FC<VacuumColumnProps> = ({ x, z = 0, title, sub, accent = "#3cc8dc", font, pressure = 1, ports = [], pulse = 0, children }) => {
  const fy = COLUMN.floorY;
  const H = COLUMN.glassH;
  const R = COLUMN.radius;
  const label = labelTexture({ title, sub, color: accent, font });
  const ruler = rulerTexture(COLUMN.rulerMax, font, accent);
  // LEDs: cyan at 1 atm, brighter + whiter as the column empties
  const led = 2.2 + 2.2 * (1 - pressure) + 1.5 * pulse;
  const ledY = [fy + 0.06, fy + H - 0.04];
  return (
    <group position={[x, 0, z]}>
      {/* pedestal: steel drum with a hazard band + bolts */}
      <mesh castShadow receiveShadow position={[0, (fy - 0.06) / 2 + 0.06, 0]}>
        <cylinderGeometry args={[R + 0.2, R + 0.24, fy - 0.06, 48]} />
        <meshStandardMaterial color={STEEL} roughness={0.38} metalness={0.4} />
      </mesh>
      <mesh position={[0, fy - 0.03, 0]}>
        <cylinderGeometry args={[R + 0.12, R + 0.2, 0.06, 48]} />
        <meshStandardMaterial color="#d7dde2" roughness={0.3} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[R + 0.245, R + 0.245, 0.05, 48]} />
        <Matte color="#f2c230" roughness={0.55} />
      </mesh>
      {Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.sin(a) * (R + 0.16), fy + 0.005, Math.cos(a) * (R + 0.16)]}>
            <cylinderGeometry args={[0.018, 0.018, 0.02, 8]} />
            <meshStandardMaterial color={STEEL_DK} roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}
      {/* tube floor: rubber landing pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fy + 0.003, 0]} receiveShadow>
        <circleGeometry args={[R - 0.005, 48]} />
        <meshStandardMaterial color="#3a4148" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fy + 0.005, 0]}>
        <ringGeometry args={[R * 0.55, R * 0.6, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} roughness={0.6} />
      </mesh>

      {/* release ledge: steel shelf on the back wall, 3 m above the tube floor */}
      <group position={[0, fy + COLUMN.ledge, -R + 0.11]}>
        <mesh castShadow>
          <boxGeometry args={[R * 1.3, 0.035, 0.2]} />
          <meshStandardMaterial color={STEEL} roughness={0.32} metalness={0.45} />
        </mesh>
        <mesh position={[0, -0.03, 0.095]}>
          <boxGeometry args={[R * 1.3, 0.03, 0.012]} />
          <meshStandardMaterial color="#f2c230" roughness={0.55} />
        </mesh>
      </group>

      {/* height ruler inside the glass, 0 m at the tube floor */}
      <mesh position={[0, fy + COLUMN.rulerMax / 2, -R + 0.06]}>
        <planeGeometry args={[0.13, COLUMN.rulerMax]} />
        <meshStandardMaterial map={ruler} transparent opacity={0.9} emissive="#ffffff" emissiveMap={ruler} emissiveIntensity={0.22} roughness={0.7} />
      </mesh>

      {children}

      {/* glass + highlight streaks */}
      <mesh position={[0, fy + H / 2, 0]} renderOrder={10}>
        <cylinderGeometry args={[R, R, H, 56, 1, true]} />
        {glassMat}
      </mesh>
      {[-0.6, 0.45].map((a, i) => (
        <mesh key={a} position={[Math.sin(a) * (R + 0.012), fy + H / 2 + (i ? 0.45 : -0.15), Math.cos(a) * (R + 0.012)]} rotation={[0, a, 0]} renderOrder={12}>
          <planeGeometry args={[i ? 0.03 : 0.055, H * (i ? 0.5 : 0.78)]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.26} depthWrite={false} />
        </mesh>
      ))}
      {/* glove ports on the back at ledge height (the drop is made through them) */}
      {ports.map((a) => (
        <group key={a} position={[Math.sin(a) * R, fy + COLUMN.ledge + 0.02, Math.cos(a) * R]} rotation={[0, a, 0]}>
          <mesh>
            <torusGeometry args={[0.095, 0.018, 10, 28]} />
            <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.004]}>
            <ringGeometry args={[0.06, 0.088, 28]} />
            <meshStandardMaterial color="#3a4148" roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* brushed-steel caps with flanges, bolts and cyan LED rings */}
      {[fy, fy + H].map((y, i) => (
        <group key={y} position={[0, y, 0]}>
          {i ? (
            <>
              <mesh castShadow receiveShadow position={[0, 0.17, 0]}>
                <cylinderGeometry args={[R + 0.1, R + 0.1, 0.3, 48]} />
                <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh position={[0, 0.34, 0]}>
                <cylinderGeometry args={[R + 0.13, R + 0.13, 0.05, 48]} />
                <meshStandardMaterial color="#d7dde2" roughness={0.28} metalness={0.5} />
              </mesh>
            </>
          ) : (
            // bottom: a low collar around the glass, so the tube floor (the landing pad at fy) stays visible
            <>
              <mesh castShadow receiveShadow position={[0, -0.02, 0]}>
                <cylinderGeometry args={[R + 0.12, R + 0.12, 0.08, 48, 1, true]} />
                <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <ringGeometry args={[R, R + 0.12, 48]} />
                <meshStandardMaterial color="#d7dde2" roughness={0.28} metalness={0.5} />
              </mesh>
              <mesh position={[0, 0.01, 0]}>
                <cylinderGeometry args={[R, R, 0.02, 48, 1, true]} />
                <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} side={THREE.DoubleSide} />
              </mesh>
            </>
          )}
          <mesh position={[0, ledY[i] - y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R + 0.012, 0.016, 8, 56]} />
            <meshStandardMaterial color="#8af2ff" emissive="#4fe3f5" emissiveIntensity={led} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* top cap dome + valve block + feedthroughs */}
      <mesh castShadow position={[0, fy + H + 0.37, 0]} scale={[1, 0.38, 1]}>
        <sphereGeometry args={[R + 0.08, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.5} />
      </mesh>
      {[-0.22, 0, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, fy + H + 0.5, -0.05]}>
          <cylinderGeometry args={[0.035, 0.035, 0.18, 12]} />
          <meshStandardMaterial color={STEEL_DK} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
      {/* cyan practicals: inside light at the top, glow on the tube floor */}
      <pointLight position={[0, fy + H - 0.4, 0.1]} color="#bff6ff" intensity={0.9 + 0.6 * (1 - pressure)} distance={4.5} decay={1.6} />
      <pointLight position={[0, fy + 0.5, 0.35]} color="#7fe9f7" intensity={0.35} distance={1.8} decay={2} />

      {/* pressure gauge on the pedestal front */}
      <PressureGauge pressure={pressure} font={font} size={0.3} position={[0, 0.2, R + 0.25]} rotation={[-0.25, 0, 0]} />

      {/* label plaque on top */}
      <group position={[0, fy + H + 0.98, 0.05]} rotation={[-0.06, 0, 0]}>
        <mesh castShadow position={[0, 0, -0.03]}>
          <boxGeometry args={[1.18, 0.61, 0.05]} />
          <Matte color={accent} roughness={0.6} />
        </mesh>
        <mesh>
          <planeGeometry args={[1.16, 0.58]} />
          <meshStandardMaterial map={label} emissive="#ffffff" emissiveMap={label} emissiveIntensity={0.25} roughness={0.7} transparent />
        </mesh>
        <mesh castShadow position={[0, -0.4, -0.03]}>
          <boxGeometry args={[0.06, 0.24, 0.05]} />
          <meshStandardMaterial color={STEEL_DK} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
