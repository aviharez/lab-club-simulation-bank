// Lab control console: cabinet, sloped desk with buttons/sliders, and a monitor whose text is driven by props.
import React, { useMemo } from "react";
import { MASCOT_COLORS } from "./layout";
import { Matte } from "./LabRoom";
import { drawScreen, screenCanvas } from "./textures";

export type ScreenLine = { text: string; size: number; color: string };

export type ControlPanelProps = {
  position: [number, number, number];
  rotationY?: number;
  font: string;
  /** lines shown on the main monitor (already typed-out by the caller) */
  lines: ScreenLine[];
  cursor?: boolean;
  /** 0..1 per button: lit amount (frame-driven by the caller) */
  buttonGlow?: number[];
};

const BUTTONS = [MASCOT_COLORS.miyu, MASCOT_COLORS.anna, MASCOT_COLORS.lumi, MASCOT_COLORS.zuzu];

export const ControlPanel: React.FC<ControlPanelProps> = ({ position, rotationY = 0, font, lines, cursor = false, buttonGlow = [0, 0, 0, 0] }) => {
  const screen = useMemo(() => screenCanvas(), []);
  const key = JSON.stringify(lines) + cursor;
  useMemo(() => {
    drawScreen(screen.canvas, font, lines, cursor);
    screen.texture.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, font, screen]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* cabinet */}
      <mesh castShadow receiveShadow position={[0, 0.36, 0]}>
        <boxGeometry args={[1.25, 0.72, 0.62]} />
        <Matte color="#e6dcf5" />
      </mesh>
      <mesh position={[0, 0.36, 0.312]}>
        <boxGeometry args={[1.05, 0.5, 0.01]} />
        <Matte color="#dcebfd" />
      </mesh>
      {/* front status lights + vent stripes */}
      {BUTTONS.map((c, i) => (
        <mesh key={c} position={[-0.36 + i * 0.24, 0.52, 0.32]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} roughness={0.5} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.3 - i * 0.07, 0.32]}>
          <boxGeometry args={[0.7, 0.025, 0.01]} />
          <Matte color={["#f27096", "#80adf2", "#f2bf3b"][i]} roughness={0.6} />
        </mesh>
      ))}
      {/* sloped desk */}
      <mesh castShadow receiveShadow position={[0, 0.79, 0.08]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[1.32, 0.06, 0.62]} />
        <Matte color="#fdf0c8" roughness={0.65} />
      </mesh>
      <group position={[0, 0.83, 0.1]} rotation={[-0.42, 0, 0]}>
        {BUTTONS.map((c, i) => (
          <mesh key={c} castShadow position={[-0.42 + i * 0.28, 0.02, 0.1]}>
            <cylinderGeometry args={[0.065, 0.075, 0.05, 16]} />
            <meshStandardMaterial color={c} roughness={0.6} emissive={c} emissiveIntensity={0.45 + 1.6 * (buttonGlow[i] ?? 0)} />
          </mesh>
        ))}
        {/* sliders */}
        {[0, 1, 2].map((i) => (
          <group key={i} position={[-0.3 + i * 0.3, 0.01, -0.13]}>
            <mesh>
              <boxGeometry args={[0.2, 0.012, 0.03]} />
              <Matte color="#cfc7bd" />
            </mesh>
            <mesh castShadow position={[-0.06 + i * 0.05, 0.025, 0]}>
              <boxGeometry args={[0.05, 0.04, 0.06]} />
              <Matte color={["#f27096", "#80adf2", "#4fd6a0"][i]} roughness={0.6} />
            </mesh>
          </group>
        ))}
        {/* big red-ish launch button */}
        <mesh castShadow position={[0.5, 0.02, -0.13]}>
          <cylinderGeometry args={[0.07, 0.08, 0.06, 18]} />
          <meshStandardMaterial color="#ff8a7a" roughness={0.6} emissive="#ff8a7a" emissiveIntensity={0.7} />
        </mesh>
      </group>
      {/* monitor */}
      <group position={[0, 1.28, -0.12]} rotation={[-0.12, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.08, 0.6, 0.08]} />
          <Matte color="#a9c8f4" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.042]}>
          <planeGeometry args={[0.98, 0.49]} />
          {/* unlit-ish screen so the text reads */}
          <meshStandardMaterial map={screen.texture} emissive="#ffffff" emissiveMap={screen.texture} emissiveIntensity={0.95} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.36, -0.02]}>
          <boxGeometry args={[0.1, 0.2, 0.06]} />
          <Matte color="#cbc2b7" />
        </mesh>
      </group>
      {/* side mini screen with a pulse line */}
      <group position={[0.75, 0.98, 0.05]} rotation={[-0.2, -0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.26, 0.05]} />
          <Matte color="#f4a9bd" />
        </mesh>
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[0.27, 0.2]} />
          <meshStandardMaterial color="#7ff0c0" emissive="#7ff0c0" emissiveIntensity={1.1} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};
