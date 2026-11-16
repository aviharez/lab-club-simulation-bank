import { Composition, Folder } from "remotion";
import { ActorClipsTest, ActorFaceTest, calcClips, calcFace } from "./actors/ActorTests";
import { durationFor, MathRace, type MathRaceProps } from "./mathrace/MathRace";
import { SameJump } from "./jump/SameJump";
import { DURATION, FPS } from "./jump/timeline";

const MASCOTS = ["zuzu", "anna", "lumi", "miyu"];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MathRace"
        component={MathRace}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ episodeId: "ep01" } satisfies MathRaceProps}
        calculateMetadata={({ props }) => ({ durationInFrames: durationFor(props.episodeId) })}
      />
      <Composition id="SameJump" component={SameJump} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Folder name="ActorTests">
        {MASCOTS.map((name) => (
          <Composition
            key={`c-${name}`}
            id={`ActorClips-${name}`}
            component={ActorClipsTest}
            durationInFrames={30}
            fps={30}
            width={1080}
            height={1080}
            defaultProps={{ name }}
            calculateMetadata={calcClips}
          />
        ))}
        {MASCOTS.map((name) => (
          <Composition
            key={`f-${name}`}
            id={`ActorFace-${name}`}
            component={ActorFaceTest}
            durationInFrames={30}
            fps={30}
            width={1080}
            height={1080}
            defaultProps={{ name }}
            calculateMetadata={calcFace}
          />
        ))}
      </Folder>
    </>
  );
};
