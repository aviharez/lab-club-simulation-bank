// Environment kit: look presets, the generic set stage, atmosphere (volumetric cones, dust, caustics), floors,
// backdrops, set GLB loading and the lookdev pattern. See CLAUDE.md "Environment quality bar".
export { GradientSky, ParallaxLayers, type ParallaxLayer } from "./Backdrop";
export { Caustics, type CausticsProps } from "./Caustics";
export { Dust, type DustProps } from "./Dust";
export { ExposureEffect, GradeEffect } from "./effects";
export { LightRig } from "./LightRig";
export { tweakLook, type GradeSettings, type LightSpec, type LookPreset, type ShadowSpec, type Vec3 } from "./look";
export { PostReady, usePostGate, type PostGate } from "./PostReady";
export { ReflectiveFloor, type ReflectiveFloorProps } from "./ReflectiveFloor";
export { LOOKDEV_SHOTS, SetLookdev, type LookdevShot } from "./SetLookdev";
export { SetPost } from "./SetPost";
export { SetStage, type SetStageProps } from "./SetStage";
export { useSetGLB, type LoadedSet } from "./useSetGLB";
export { VolumetricCone, type VolumetricConeProps } from "./VolumetricCone";
