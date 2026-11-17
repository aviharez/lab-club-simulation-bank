// EP03 props: the two balls and Miyu's stopwatch. Pure functions of their props (the episode drives position,
// spin and the stopwatch reading from data.ts / timeline.ts).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";

/** A matte play ball with a cream seam band. Origin at its centre. */
export const Ball: React.FC<{
  position: [number, number, number];
  radius: number;
  color: string;
  /** spin about the ball's own z axis (radians), decorative only */
  spin?: number;
  /** 0..1: ghost copy (replay) */
  ghost?: number;
}> = ({ position, radius, color, spin = 0, ghost = 0 }) => {
  const op = ghost > 0 ? 1 - ghost : 1;
  const transparent = ghost > 0;
  return (
    <group position={position} rotation={[0.4, 0, spin]}>
      <mesh castShadow={!transparent}>
        <sphereGeometry args={[radius, 32, 20]} />
        <meshStandardMaterial color={color} roughness={0.55} transparent={transparent} opacity={op} depthWrite={!transparent} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.002, radius * 0.07, 8, 40]} />
        <meshStandardMaterial color="#fff6e6" roughness={0.6} transparent={transparent} opacity={op} depthWrite={!transparent} />
      </mesh>
    </group>
  );
};

/** Brass pocket stopwatch facing +z (rotate the group to aim it). Origin at the dial centre. */
export const Stopwatch: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** text on the digital dial, e.g. "0.64" */
  reading: string;
  font: string;
  /** 0..1 sweep of the hand (one turn) */
  sweep?: number;
  scale?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], reading, font, sweep = 0, scale = 1 }) => {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbf4e6";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#4a3b30";
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2;
      const r0 = k % 5 === 0 ? 100 : 110;
      ctx.lineWidth = k % 5 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0);
      ctx.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120);
      ctx.stroke();
    }
    // digital window
    ctx.fillStyle = "#3b4a3a";
    ctx.beginPath();
    ctx.roundRect(46, 140, 164, 66, 12);
    ctx.fill();
    ctx.fillStyle = "#e8ffd9";
    ctx.font = `700 52px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(reading, 128, 175);
    // sweep hand
    const a = sweep * Math.PI * 2;
    ctx.strokeStyle = "#c8714f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
    ctx.stroke();
    ctx.fillStyle = "#c8714f";
    ctx.beginPath();
    ctx.arc(128, 128, 10, 0, Math.PI * 2);
    ctx.fill();
    texture.needsUpdate = true;
  }
  const brass = <meshStandardMaterial color="#c9a45c" roughness={0.32} metalness={0.85} />;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.04, 40]} />
        {brass}
      </mesh>
      <mesh position={[0, 0, 0.0205]}>
        <circleGeometry args={[0.088, 40]} />
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.137, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 8, 20]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.142, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial color="#c8714f" roughness={0.5} />
      </mesh>
    </group>
  );
};
