// Backdrops: a vertical-gradient sky dome and seeded silhouette layers at increasing depth (hills, skyline,
// trees). Layers are real geometry, so a moving camera gives true parallax and fog fades the far ones.
import React, { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "../random";

export const GradientSky: React.FC<{ bottom: string; middle?: string; top: string; radius?: number; horizon?: number }> = ({ bottom, middle, top, radius = 80, horizon = 0.1 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          cBottom: { value: new THREE.Color(bottom) },
          cMiddle: { value: new THREE.Color(middle ?? bottom).lerp(new THREE.Color(top), middle ? 0 : 0.5) },
          cTop: { value: new THREE.Color(top) },
          horizon: { value: horizon },
        },
        vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: /* glsl */ `
          uniform vec3 cBottom; uniform vec3 cMiddle; uniform vec3 cTop; uniform float horizon; varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 c = h < horizon ? mix(cBottom, cMiddle, smoothstep(-0.4, horizon, h)) : mix(cMiddle, cTop, smoothstep(horizon, 0.8, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [bottom, middle, top, horizon],
  );
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  );
};

export type ParallaxLayer = {
  /** world z of the layer (more negative = farther) */
  z: number;
  color: string;
  /** base height (m) and bump amplitude */
  height: number;
  amplitude: number;
  kind?: "hills" | "skyline" | "trees";
  width?: number;
  seed?: number;
};

const silhouette = (L: ParallaxLayer) => {
  const r = seeded(L.seed ?? 3);
  const w = L.width ?? 60;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -2);
  const n = L.kind === "hills" ? 48 : 64;
  if (L.kind === "skyline") {
    let x = -w / 2;
    while (x < w / 2) {
      const bw = 0.8 + r() * 2.4;
      const h = L.height + r() * L.amplitude;
      s.lineTo(x, h);
      s.lineTo(Math.min(w / 2, x + bw), h);
      x += bw;
    }
  } else {
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
    for (let i = 0; i <= n; i++) {
      const x = -w / 2 + (w * i) / n;
      let y = L.height + L.amplitude * (0.5 * Math.sin(x * 0.18 + ph[0]) + 0.3 * Math.sin(x * 0.41 + ph[1]) + 0.2 * Math.sin(x * 0.9 + ph[2]));
      if (L.kind === "trees") y += (r() - 0.3) * L.amplitude * 0.8;
      s.lineTo(x, y);
    }
  }
  s.lineTo(w / 2, -2);
  s.lineTo(-w / 2, -2);
  return new THREE.ShapeGeometry(s);
};

export const ParallaxLayers: React.FC<{ layers: ParallaxLayer[] }> = ({ layers }) => {
  const geos = useMemo(() => layers.map(silhouette), [layers]);
  return (
    <>
      {layers.map((L, i) => (
        <mesh key={i} geometry={geos[i]} position={[0, 0, L.z]} renderOrder={-5}>
          <meshBasicMaterial color={L.color} fog />
        </mesh>
      ))}
    </>
  );
};
