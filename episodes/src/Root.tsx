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
import { FeatherHammer, FeatherHammerAudio } from "./feather-hammer/FeatherHammer";
import {
  DURATION as FH_DURATION,
  FPS as FH_FPS,
} from "./feather-hammer/timeline";
import { VacuumHallLookdev } from "./sets/vacuum-hall";
import { SunlitAtriumLookdev } from "./sets/sunlit-atrium";
import { GameShowStudioLookdev } from "./sets/game-show-studio";
import { DropThrow, DropThrowAudio } from "./drop-throw/DropThrow";
import {
  DURATION as DT_DURATION,
  FPS as DT_FPS,
} from "./drop-throw/timeline";
import { ThreeDoors, ThreeDoorsAudio } from "./three-doors/ThreeDoors";
import {
  DURATION as TD_DURATION,
  FPS as TD_FPS,
} from "./three-doors/timeline";
import { GaltonBoard, GaltonBoardAudio } from "./galton-board/GaltonBoard";
import {
  DURATION as GB_DURATION,
  FPS as GB_FPS,
} from "./galton-board/timeline";
import { ProbabilityArcadeBoardShots, ProbabilityArcadeLookdev } from "./sets/probability-arcade";
import { GravityLabLookdev } from "./sets/gravity-lab";
import { NightPlazaLookdev } from "./sets/night-plaza";
import { DizzyWalk, DizzyWalkAudio } from "./dizzy-walk/DizzyWalk";
import { DURATION as DW_DURATION, FPS as DW_FPS } from "./dizzy-walk/timeline";
import { SortingRace, SortingRaceAudio } from "./sorting-race/SortingRace";
import { DURATION as SR_DURATION, FPS as SR_FPS } from "./sorting-race/timeline";
import { HomeLabV2Lookdev } from "./sets/home-lab-v2";
import { ChemPrepRoomLookdev } from "./sets/chem-prep-room";
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
      <Folder name="EP02-FeatherHammer">
        <Composition
          id="FeatherHammer"
          component={FeatherHammer}
          durationInFrames={FH_DURATION}
          fps={FH_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="FeatherHammerAudio"
          component={FeatherHammerAudio}
          durationInFrames={FH_DURATION}
          fps={FH_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="EP03-DropThrow">
        <Composition
          id="DropThrow"
          component={DropThrow}
          durationInFrames={DT_DURATION}
          fps={DT_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="DropThrowAudio"
          component={DropThrowAudio}
          durationInFrames={DT_DURATION}
          fps={DT_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="EP04-ThreeDoors">
        <Composition
          id="ThreeDoors"
          component={ThreeDoors}
          durationInFrames={TD_DURATION}
          fps={TD_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="ThreeDoorsAudio"
          component={ThreeDoorsAudio}
          durationInFrames={TD_DURATION}
          fps={TD_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="EP05-GaltonBoard">
        <Composition
          id="GaltonBoard"
          component={GaltonBoard}
          durationInFrames={GB_DURATION}
          fps={GB_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="GaltonBoardAudio"
          component={GaltonBoardAudio}
          durationInFrames={GB_DURATION}
          fps={GB_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="EP06-DizzyWalk">
        <Composition
          id="DizzyWalk"
          component={DizzyWalk}
          durationInFrames={DW_DURATION}
          fps={DW_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="DizzyWalkAudio"
          component={DizzyWalkAudio}
          durationInFrames={DW_DURATION}
          fps={DW_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
      <Folder name="EP07-SortingRace">
        <Composition
          id="SortingRace"
          component={SortingRace}
          durationInFrames={SR_DURATION}
          fps={SR_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
        <Composition
          id="SortingRaceAudio"
          component={SortingRaceAudio}
          durationInFrames={SR_DURATION}
          fps={SR_FPS}
          width={1080}
          height={1920}
          defaultProps={{ music: true }}
        />
      </Folder>
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
          id="ChemPrepRoomLookdev"
          component={ChemPrepRoomLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="HomeLabV2Lookdev"
          component={HomeLabV2Lookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="GravityLabLookdev"
          component={GravityLabLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VacuumHallLookdev"
          component={VacuumHallLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SunlitAtriumLookdev"
          component={SunlitAtriumLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="GameShowStudioLookdev"
          component={GameShowStudioLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="ProbabilityArcadeLookdev"
          component={ProbabilityArcadeLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="NightPlazaLookdev"
          component={NightPlazaLookdev}
          durationInFrames={3}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="ProbabilityArcadeBoardShots"
          component={ProbabilityArcadeBoardShots}
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
