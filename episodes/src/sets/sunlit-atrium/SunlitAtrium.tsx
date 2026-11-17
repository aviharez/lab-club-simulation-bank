// Sunlit atrium (EP03): the Blender-built GLB (assets/sets/sunlit-atrium, AO baked to vertex colours) plus the live
// parts: god rays from the window wall, dust motes in the sun, warm practicals (pendants, sconces, desk lamp) and a
// soft bounce from the sunlit floor. The balls and the stopwatch are separate props (./props) driven by the episode.
// Everything is a pure function of `time` (world seconds).
//   const set = useSetGLB("sunlit-atrium");      // outside the canvas
//   <SetStage look={SUNLIT_ATRIUM_LOOK} …><SunlitAtrium set={set} time={t} /> …balls, actors…</SetStage>
import React from "react";
import { Dust, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";
import { SUNLIT_ATRIUM } from "./layout";

export { SUNLIT_ATRIUM } from "./layout";

export type SunlitAtriumParts = { glb?: boolean; rays?: boolean; dust?: boolean; practicals?: boolean };

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const SunlitAtrium: React.FC<{ set: LoadedSet | null; time: number; parts?: SunlitAtriumParts }> = ({ set, time, parts = {} }) => {
  const on = { glb: true, rays: true, dust: true, practicals: true, ...parts };
  const A = SUNLIT_ATRIUM;
  const d = norm(A.sunDir);
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      {on.practicals ? (
        <>
          {A.lamps.map((p, i) => (
            <pointLight key={i} position={[p[0], p[1] - 0.12, p[2]]} color="#ffcf8f" intensity={1.6} distance={4.5} decay={1.6} />
          ))}
          {A.sconces.map((p, i) => (
            <pointLight key={`s${i}`} position={[p[0] + 0.25, p[1], p[2]]} color="#ffc98a" intensity={0.9} distance={2.6} decay={1.8} />
          ))}
          <pointLight position={A.deskLamp} color="#ffd29a" intensity={0.6} distance={1.8} decay={2} />
          {/* warm bounce off the sunlit floor + window light on the back wall */}
          <pointLight position={[1.2, 0.35, -0.6]} color="#ffcf9a" intensity={1.1} distance={6} decay={1.4} />
          <pointLight position={[0.8, 2.6, A.backZ + 1.4]} color="#ffe2b8" intensity={1.4} distance={7} decay={1.4} />
        </>
      ) : null}
      {/* god rays: one wide shaft per window, along the sun direction, through the haze */}
      {on.rays
        ? A.windows.map((x, i) => {
            const apex: Vec3 = [x, (A.windowY[0] + A.windowY[1]) / 2 + 0.6, A.backZ - 0.2];
            const L = 9;
            return (
              <VolumetricCone
                key={x}
                position={apex}
                target={[apex[0] + d[0] * L, apex[1] + d[1] * L, apex[2] + d[2] * L]}
                length={L}
                radius={1.7}
                apexRadius={0.95}
                color="#ffd9a1"
                intensity={0.2}
                time={time + i * 2.3}
                noise={0.45}
              />
            );
          })
        : null}
      {on.dust ? (
        <>
          <Dust center={[0.8, 2.2, -0.8]} size={[6, 4, 5]} count={520} seed={303} time={time} pointSize={8} opacity={0.42} speed={0.3} color="#fff1d0" />
          <Dust center={[0.5, 1.8, 2.5]} size={[6, 3, 3]} count={160} seed={304} time={time} pointSize={11} opacity={0.25} speed={0.25} color="#fff4dc" />
        </>
      ) : null}
    </>
  );
};
