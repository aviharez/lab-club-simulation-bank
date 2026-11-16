// Glossy floor with blurred real-time reflections (drei MeshReflectorMaterial). Use for polished labs, studios,
// wet streets. The reflection is rendered in the same r3f advance as the frame, so captures are consistent.
import { MeshReflectorMaterial } from "@react-three/drei";
import React from "react";
import type { Vec3 } from "./look";

export type ReflectiveFloorProps = {
  position?: Vec3;
  size?: [number, number];
  color?: string;
  roughness?: number;
  /** 0..1 how strongly reflections show */
  mirror?: number;
  blur?: [number, number];
  /** reflection texture resolution */
  resolution?: number;
};

export const ReflectiveFloor: React.FC<ReflectiveFloorProps> = ({ position = [0, 0, 0], size = [30, 30], color = "#d8d2ca", roughness = 0.55, mirror = 0.45, blur = [400, 120], resolution = 1024 }) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={size} />
    <MeshReflectorMaterial
      color={color}
      roughness={roughness}
      metalness={0}
      blur={blur}
      resolution={resolution}
      mixBlur={1}
      mixStrength={mirror * 2.2}
      mixContrast={1}
      depthScale={0.6}
      minDepthThreshold={0.5}
      maxDepthThreshold={1.3}
      mirror={mirror}
    />
  </mesh>
);
