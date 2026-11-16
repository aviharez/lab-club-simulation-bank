// Post chain from a LookPreset: AO → bloom → exposure → tone mapping → grade → vignette.
// Gated with PostReady so every captured frame has the effects (see PostReady.tsx).
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type EffectComposer as Composer } from "postprocessing";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { ExposureEffect, GradeEffect } from "./effects";
import type { LookPreset } from "./look";
import { PostReady, type PostGate } from "./PostReady";

const TONE = { aces: ToneMappingMode.ACES_FILMIC, neutral: ToneMappingMode.NEUTRAL, agx: ToneMappingMode.AGX } as const;

export const SetPost: React.FC<{ look: LookPreset; gate?: PostGate }> = ({ look, gate }) => {
  const composer = useRef<Composer>(null);
  const { ao, bloom, grade, vignette } = look.post;
  const gradeKey = JSON.stringify(grade);
  const exposure = useMemo(() => new ExposureEffect(look.exposure), [look.exposure]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gradeFx = useMemo(() => (grade ? new GradeEffect(grade) : null), [gradeKey]);
  const aoColor = useMemo(() => new THREE.Color(ao ? ao.color : "#000"), [ao]);
  return (
    <EffectComposer multisampling={4} ref={composer}>
      {gate ? <PostReady gate={gate} composer={composer} /> : null}
      {ao ? <N8AO aoRadius={ao.radius} distanceFalloff={ao.falloff ?? 0.6} intensity={ao.intensity} quality="medium" color={aoColor} /> : null}
      {bloom ? (
        <Bloom luminanceThreshold={bloom.threshold} luminanceSmoothing={bloom.smoothing ?? 0.1} intensity={bloom.intensity} mipmapBlur radius={bloom.radius ?? 0.5} />
      ) : null}
      {look.exposure !== 1 ? <primitive object={exposure} dispose={null} /> : null}
      <ToneMapping mode={TONE[look.toneMapping]} />
      {gradeFx ? <primitive object={gradeFx} dispose={null} /> : null}
      {vignette ? <Vignette offset={vignette.offset} darkness={vignette.darkness} /> : null}
    </EffectComposer>
  );
};
