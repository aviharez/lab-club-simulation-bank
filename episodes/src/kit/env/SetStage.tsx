// Generic ThreeCanvas wrapper for any set: frame-driven camera, the set's LookPreset (lights, fog, contact
// shadows, gated post chain). Sets add their GLB, practicals, haze and animated parts as children.
//   <SetStage width height cam={camAt(f)} look={HOME_LAB_V2_LOOK}> <HomeLabV2 set={set}/> …actors… </SetStage>
import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import * as THREE from "three";
import { toThreeCamera, type CamState } from "../camera";
import { LightRig } from "./LightRig";
import type { LookPreset } from "./look";
import { usePostGate } from "./PostReady";
import { SetPost } from "./SetPost";

const CameraRig: React.FC<{ cam: CamState; aspect: number }> = ({ cam, aspect }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  toThreeCamera(cam, aspect, camera);
  return null;
};

export type SetStageProps = {
  width: number;
  height: number;
  cam: CamState;
  look: LookPreset;
  children: React.ReactNode;
  /** post chain on (gated). Default on. */
  post?: boolean;
};

export const SetStage: React.FC<SetStageProps> = ({ width, height, cam, look, children, post = true }) => {
  const gate = usePostGate(`${look.name} post-processing`, post);
  const cs = look.contactShadows;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ fov: cam.fov, position: cam.pos, near: 0.1, far: 120 }}
      style={{ backgroundColor: look.background }}
    >
      <color attach="background" args={[look.background]} />
      <CameraRig cam={cam} aspect={width / height} />
      <LightRig look={look} />
      {cs ? (
        <ContactShadows position={cs.position} scale={cs.scale} far={cs.far} blur={cs.blur} opacity={cs.opacity} resolution={1024} color={cs.color} frames={Infinity} />
      ) : null}
      {children}
      {post ? <SetPost look={look} gate={gate} /> : null}
    </ThreeCanvas>
  );
};
