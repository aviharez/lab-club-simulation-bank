// Animated caustics projector: an additive plane (on a floor, wall or under a tank) with a procedural, tileable
// water-caustic pattern driven by time. Deterministic (pure function of uv + time).
import React, { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "./look";

export type CausticsProps = {
  position: Vec3;
  rotation?: Vec3;
  size: [number, number];
  /** seconds (from the frame) */
  time: number;
  color?: string;
  intensity?: number;
  /** pattern repeats across the plane */
  scale?: number;
  speed?: number;
};

const frag = /* glsl */ `
  uniform float time;
  uniform vec3 color;
  uniform float intensity;
  uniform float scale;
  varying vec2 vUv;
  // classic iterative water caustic (tileable, inspired by public-domain shader art)
  float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 5; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      vec2 d = vec2(sin(i.x + tt), cos(i.y + tt)) / inten;
      d = sign(d) * max(abs(d), vec2(1e-3)) + vec2(d.x == 0.0 ? 1e-3 : 0.0, d.y == 0.0 ? 1e-3 : 0.0);
      c += 1.0 / max(length(p / d), 1e-3);
    }
    c /= 5.0;
    c = 1.17 - pow(max(c, 0.0), 1.4);
    return pow(abs(c), 8.0);
  }
  void main() {
    float k = caustic(vUv * scale, time);
    float edge = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x)) * smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
    float a = clamp(k, 0.0, 1.0) * intensity * edge;
    if (!(a >= 0.0)) a = 0.0; // NaN guard: one NaN pixel blacks out the whole frame through bloom's mip blur
    gl_FragColor = vec4(color * a, a);
  }`;

export const Caustics: React.FC<CausticsProps> = ({ position, rotation = [-Math.PI / 2, 0, 0], size, time, color = "#bfefff", intensity = 0.6, scale = 2, speed = 0.5 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) }, intensity: { value: intensity }, scale: { value: scale } },
      }),
    [color, intensity, scale],
  );
  mat.uniforms.time.value = time * speed + 23.0;
  return (
    <mesh position={position} rotation={rotation} material={mat} renderOrder={9}>
      <planeGeometry args={size} />
    </mesh>
  );
};
