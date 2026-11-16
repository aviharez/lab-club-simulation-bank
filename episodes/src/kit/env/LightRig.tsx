// Key + fill + rim lights and fog from a LookPreset. Practical lights (lamps, screens) belong to the set itself.
import React from "react";
import type { LookPreset } from "./look";

export const LightRig: React.FC<{ look: LookPreset }> = ({ look }) => {
  const { hemisphere, ambient, key, fill = [], rim = [] } = look.lights;
  const s = key.shadow;
  const [l, r, t, b] = s?.area ?? [-8, 8, 8, -4];
  return (
    <>
      {hemisphere ? <hemisphereLight args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]} /> : null}
      {ambient ? <ambientLight intensity={ambient.intensity} color={ambient.color} /> : null}
      <directionalLight
        position={key.position}
        color={key.color}
        intensity={key.intensity}
        castShadow={!!s}
        shadow-mapSize={[s?.mapSize ?? 2048, s?.mapSize ?? 2048]}
        shadow-radius={s?.radius ?? 12}
        shadow-blurSamples={24}
        shadow-bias={s?.bias ?? -0.0004}
        shadow-normalBias={s?.normalBias ?? 0.025}
        shadow-camera-left={l}
        shadow-camera-right={r}
        shadow-camera-top={t}
        shadow-camera-bottom={b}
        shadow-camera-near={1}
        shadow-camera-far={s?.far ?? 40}
      />
      {[...fill, ...rim].map((L, i) => (
        <directionalLight key={i} position={L.position} color={L.color} intensity={L.intensity} />
      ))}
      {look.fog ? (
        "density" in look.fog ? (
          <fogExp2 attach="fog" args={[look.fog.color, look.fog.density]} />
        ) : (
          <fog attach="fog" args={[look.fog.color, look.fog.near, look.fog.far]} />
        )
      ) : null}
    </>
  );
};
