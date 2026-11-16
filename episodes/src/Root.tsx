import { Composition, Folder } from "remotion";
import { ActorClipsTest, ActorFaceTest, calcClips, calcFace } from "./actors/ActorTests";
import { SameJump } from "./jump/SameJump";
import { SoundtrackOnly } from "./jump/Soundtrack";
import { DURATION, FPS } from "./jump/timeline";

const MASCOTS = ["zuzu", "anna", "lumi", "miyu"];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SameJump" component={SameJump} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ music: true }} />
      {/* same soundtrack without the picture: fast WAV renders for mastering (pass {"music": false} for the no-music mix) */}
      <Composition id="SameJumpAudio" component={SoundtrackOnly} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ music: true }} />
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
