// Cheap volumetric light: an open cone with an additive shader (bright at the apex, fading along its length and
// toward its silhouette, optional slow drifting noise). No raymarching, no depth pre-pass: cheap and deterministic.
import React, { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "./look";

export type VolumetricConeProps = {
  /** apex (the lamp) */
  position: Vec3;
  /** a point the cone aims at (default: straight down) */
  target?: Vec3;
  length?: number;
  /** radius at the far end */
  radius?: number;
  /** radius at the apex */
  apexRadius?: number;
  color?: string;
  intensity?: number;
  /** seconds (from the frame): drives the noise drift */
  time?: number;
  /** 0 = smooth beam, ~0.5 = visible dusty streaks */
  noise?: number;
};

const vert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const frag = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float time;
  uniform float noise;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vWorld;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    float along = clamp(1.0 - vUv.y, 0.0, 1.0);                      // 0 at the apex, 1 at the far end
    float fade = pow(1.0 - along, 1.6) * smoothstep(0.0, 0.06, along);
    vec3 nn = length(vN) > 1e-5 ? normalize(vN) : vec3(0.0, 0.0, 1.0);
    float edge = pow(clamp(abs(dot(nn, normalize(vV))), 0.0, 1.0), 2.0);
    float n = mix(1.0, 0.55 + 0.9 * vnoise(vWorld * 3.0 + vec3(0.0, -time * 0.15, time * 0.07)), noise);
    float a = intensity * fade * edge * n;
    if (!(a >= 0.0)) a = 0.0; // NaN guard (bloom spreads NaN over the frame)
    gl_FragColor = vec4(color * a, a);
  }`;

export const VolumetricCone: React.FC<VolumetricConeProps> = ({
  position,
  target,
  length = 3,
  radius = 1,
  apexRadius = 0.05,
  color = "#fff3d6",
  intensity = 0.35,
  time = 0,
  noise = 0.35,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(apexRadius, radius, length, 40, 1, true);
    g.translate(0, -length / 2, 0); // apex at the origin, cone along -Y
    return g;
  }, [apexRadius, radius, length]);
  const quat = useMemo(() => {
    const dir = target ? new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize() : new THREE.Vector3(0, -1, 0);
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  }, [position, target]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, time: { value: 0 }, noise: { value: noise } },
      }),
    [color, intensity, noise],
  );
  mat.uniforms.time.value = time; // set during render: the captured frame always matches `time`
  return <mesh geometry={geo} material={mat} position={position} quaternion={quat} renderOrder={10} />;
};
