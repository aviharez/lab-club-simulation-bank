// ThreeCanvas wrapper for the lab: frame-driven camera, figurine lighting, soft shadows, floor contact shadows, post FX.
import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  N8AO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import {
  ToneMappingMode,
  type EffectComposer as Composer,
} from "postprocessing";
import React, { useRef } from "react";
import * as THREE from "three";
import { PostReady, usePostGate, type PostGate } from "../../kit/env/PostReady";
import { toThreeCamera, type CamState } from "./layout";

/** Applies the CamState synchronously during render, before ThreeCanvas advances the frame. */
const CameraRig: React.FC<{ cam: CamState; aspect: number }> = ({
  cam,
  aspect,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  toThreeCamera(cam, aspect, camera);
  return null;
};

export const LabLights: React.FC = () => (
  <>
    <hemisphereLight args={["#fbfbff", "#f0d8e2", 0.82]} />
    <ambientLight intensity={0.12} color="#fff8f2" />
    {/* one clean, slightly warm key from above, soft PCF shadows with a wide radius */}
    <directionalLight
      position={[3.5, 11, 7.5]}
      color="#fff6ea"
      intensity={2.25}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-radius={14}
      shadow-blurSamples={24}
      shadow-bias={-0.0004}
      shadow-normalBias={0.025}
      shadow-camera-left={-8}
      shadow-camera-right={8}
      shadow-camera-top={8}
      shadow-camera-bottom={-4}
      shadow-camera-near={1}
      shadow-camera-far={30}
    />
    {/* soft coloured fills + rims (no shadows) in the four mascot hues: lively, and they pull the figurines off the wall */}
    <directionalLight position={[-7, 3, 6]} intensity={0.35} color="#ff9cc0" />
    <directionalLight position={[7, 3.5, 6]} intensity={0.32} color="#9cc4ff" />
    <directionalLight position={[0, 2, 9]} intensity={0.22} color="#ffe08a" />
    <directionalLight position={[-6, 5, -3]} intensity={0.55} color="#c9a8ff" />
    <directionalLight position={[6, 5, -3]} intensity={0.4} color="#ffb8d2" />
  </>
);

/** `gate` (from usePostGate, outside the canvas) holds the frame until the effect passes exist. */
export const LabPost: React.FC<{ gate?: PostGate }> = ({ gate }) => {
  const composer = useRef<Composer>(null);
  return (
    <EffectComposer multisampling={4} ref={composer}>
      {gate ? <PostReady gate={gate} composer={composer} /> : null}
      {/* subtle AO: tinted mauve, not grey, so contact areas stay colourful */}
      <N8AO
        aoRadius={0.45}
        distanceFalloff={0.6}
        intensity={0.85}
        quality="medium"
        color={new THREE.Color("#6a4560")}
      />
      <Bloom
        luminanceThreshold={0.94}
        luminanceSmoothing={0.1}
        intensity={0.3}
        mipmapBlur
        radius={0.5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* bright candy grade: a touch more exposure, clean contrast, higher saturation */}
      <BrightnessContrast brightness={0.0} contrast={0.07} />
      <HueSaturation saturation={0.24} />
      <Vignette offset={0.38} darkness={0.18} />
    </EffectComposer>
  );
};

export type LabStageProps = {
  width: number;
  height: number;
  cam: CamState;
  children: React.ReactNode;
  background?: string;
  /**
   * Post-processing (AO, bloom, grade, vignette). Gated so it is applied on every captured frame.
   * EP01 passes `false`: before the gate existed the composer lost a race in most browser sessions, and the
   * shipped EP01 render has no post at all, so `false` keeps EP01 identical to what was published.
   */
  post?: boolean;
};

export const LabStage: React.FC<LabStageProps> = ({
  width,
  height,
  cam,
  children,
  background = "#fdf3f6",
  post = true,
}) => {
  const gate = usePostGate("lab post-processing", post);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows={{ type: THREE.PCFShadowMap }} // three r18x removed PCFSoftShadowMap; PCF + shadow.radius is the soft path
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ fov: cam.fov, position: cam.pos, near: 0.1, far: 120 }}
      style={{ backgroundColor: background }}
    >
      <color attach="background" args={[background]} />
      <CameraRig cam={cam} aspect={width / height} />
      <LabLights />
      {/* floor-level contact shadows for anything standing on the lab floor (pedestals, console, Lumi walking) */}
      <ContactShadows
        position={[0, 0.004, 1.2]}
        scale={[16, 7]}
        far={1.4}
        blur={2.6}
        opacity={0.45}
        resolution={1024}
        color="#3a2236"
        frames={Infinity}
      />
      {children}
      {post ? <LabPost gate={gate} /> : null}
    </ThreeCanvas>
  );
};
