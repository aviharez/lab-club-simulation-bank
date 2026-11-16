import { Composition, Folder } from "remotion";
import {
  ActorClipsTest,
  ActorFaceTest,
  calcClips,
  calcFace,
} from "./actors/ActorTests";
import { Template, TemplateAudio } from "./_template/Episode";
import {
  DURATION as TEMPLATE_DURATION,
  FPS as TEMPLATE_FPS,
} from "./_template/timeline";
import { SameJump, SameJumpAudio } from "./jump/SameJump";
import { HomeLabV2Lookdev } from "./sets/home-lab-v2";
import { DURATION, FPS } from "./jump/timeline";

const MASCOTS = ["zuzu", "anna", "lumi", "miyu"];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SameJump"
        component={SameJump}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ music: true }}
      />
      {/* same soundtrack without the picture: fast WAV renders for mastering (pass {"music": false} for the no-music mix) */}
      <Composition
        id="SameJumpAudio"
        component={SameJumpAudio}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ music: true }}
      />
      <Folder name="Template">
        <Composition
          id="Template"
          component={Template}
          durationInFrames={TEMPLATE_DURATION}
          fps={TEMPLATE_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="TemplateAudio"
          component={TemplateAudio}
          durationInFrames={TEMPLATE_DURATION}
          fps={TEMPLATE_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="Sets">
        <Composition
          id="HomeLabV2Lookdev"
          component={HomeLabV2Lookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
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
