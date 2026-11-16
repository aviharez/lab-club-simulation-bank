// Seeded dust motes / particles drifting in a box. Every position is a pure function of (seed, time), so the
// same frame always shows the same motes. Additive soft discs; brighten them inside light cones with `glow`.
import React, { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "../random";
import type { Vec3 } from "./look";

export type DustProps = {
  /** box centre and size (metres) */
  center: Vec3;
  size: Vec3;
  count?: number;
  seed?: number;
  /** seconds (from the frame) */
  time: number;
  color?: string;
  /** point size in pixels at 1 m */
  pointSize?: number;
  opacity?: number;
  /** drift speed (m/s) */
  speed?: number;
};

const vert = /* glsl */ `
  uniform float time;
  uniform float speed;
  uniform vec3 size;
  uniform float pointSize;
  attribute vec4 seed4;
  varying float vTw;
  void main() {
    vec3 p = position;
    float t = time * speed;
    // slow wander on three incommensurate sines + a gentle fall, wrapped inside the box
    p += vec3(sin(t * 0.7 + seed4.x * 6.283) * 0.12, -t * 0.08 * (0.5 + seed4.y), cos(t * 0.53 + seed4.z * 6.283) * 0.12);
    p = mod(p + size * 0.5, size) - size * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = pointSize * (0.5 + seed4.w) / max(0.1, -mv.z);
    vTw = 0.55 + 0.45 * sin(time * (1.0 + seed4.w * 2.0) + seed4.x * 20.0);
    gl_Position = projectionMatrix * mv;
  }`;

const frag = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  varying float vTw;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = (1.0 - smoothstep(0.0, 0.5, length(d))) * opacity * vTw;
    if (!(a >= 0.0)) a = 0.0; // NaN guard
    gl_FragColor = vec4(color * a, a);
  }`;

export const Dust: React.FC<DustProps> = ({ center, size, count = 400, seed = 7, time, color = "#fff6e0", pointSize = 14, opacity = 0.55, speed = 1 }) => {
  const geo = useMemo(() => {
    const r = seeded(seed);
    const pos = new Float32Array(count * 3);
    const s4 = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) pos[i * 3 + k] = (r() - 0.5) * size[k];
      for (let k = 0; k < 4; k++) s4[i * 4 + k] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed4", new THREE.BufferAttribute(s4, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(...size));
    return g;
  }, [count, seed, size]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          speed: { value: speed },
          size: { value: new THREE.Vector3(...size) },
          pointSize: { value: pointSize },
          color: { value: new THREE.Color(color) },
          opacity: { value: opacity },
        },
      }),
    [speed, size, pointSize, color, opacity],
  );
  mat.uniforms.time.value = time;
  return <points geometry={geo} material={mat} position={center} renderOrder={11} />;
};
