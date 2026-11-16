// 3D half of the episode: the set + the mascot actors, all posed from the frame.
// Swap LabStage/LabRoom for the episode's own set (src/sets/<set>) once its lookdev is approved.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import type { CastMember } from "../kit";
import { LabRoom, LabStage } from "../sets/lab";
import { camAt } from "./camera";
import type { Member } from "./data";
import { ACTING } from "./timeline";

export const Scene3D: React.FC<{ cast: CastMember[]; font: string }> = ({
  cast,
  font,
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <LabStage width={width} height={height} cam={camAt(f)}>
      <LabRoom font={font} />
      {cast.map((c) => {
        const st = ACTING(c.name as Member, f);
        return (
          <group key={c.name} position={st.pos}>
            <Actor
              meta={c.meta}
              actor={c.actor}
              clip={st.clip}
              time={st.time}
              expression={st.expression}
              yaw={st.yaw}
            />
          </group>
        );
      })}
    </LabStage>
  );
};
