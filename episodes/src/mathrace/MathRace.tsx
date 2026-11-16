import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { irisWipe } from "@/components/remocn/iris-wipe";
import { episodes } from "../episodes/index.ts";
import { Captions } from "./components/Caption.tsx";
import { Background, GoPop, HookTitle, RaceMoments, useShake } from "./components/Effects.tsx";
import { HeaderCards, RoundPill } from "./components/HeaderCards.tsx";
import { Lane } from "./components/Lane.tsx";
import { RaceMascots } from "./components/RaceMascots.tsx";
import { RevealCard } from "./components/RevealCard.tsx";
import { getTimeline, RaceProvider, useRace } from "./context.tsx";
import { LANE, MASCOT } from "./layout.ts";
import { character } from "./manifest.ts";
import { INK } from "./theme.tsx";

export type MathRaceProps = { episodeId: string };

export const getEpisode = (id: string) => {
  const ep = episodes[id];
  if (!ep) throw new Error(`Unknown episode "${id}". Known: ${Object.keys(episodes).join(", ")}`);
  return ep;
};

/** Composition duration comes straight from the simulated timeline. */
export const durationFor = (id: string) => getTimeline(getEpisode(id)).totalFrames;

const RaceScene: React.FC = () => {
  const { tl } = useRace();
  const shake = useShake();
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ translate: shake }}>
        <HeaderCards />
        <Lane lane={0} />
        <Lane lane={1} />
        <RaceMascots />
        <RoundPill />
        <HookTitle />
        <GoPop />
        <RaceMoments />
        <Captions end={tl.raceFrames} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Music + SFX placeholders: plays nothing until paths are set in the episode's `audio` block. */
const AudioLayer: React.FC = () => {
  const { ep, tl } = useRace();
  const { music, musicVolume, sfx } = ep.audio;
  return (
    <>
      {music && <Audio src={staticFile(music)} volume={musicVolume} loop />}
      {tl.sfx.map((s, i) => {
        const src = sfx[s.type];
        if (!src) return null;
        return (
          <Sequence key={i} name={`SFX ${s.type}: ${s.label}`} from={s.frame} durationInFrames={2 * tl.config.fps} layout="none">
            <Audio src={staticFile(src)} />
          </Sequence>
        );
      })}
    </>
  );
};

export const MathRace: React.FC<MathRaceProps> = ({ episodeId }) => {
  const ep = getEpisode(episodeId);
  const tl = getTimeline(ep);
  const { width, height } = useVideoConfig();
  const winner = ep.race.lanes[tl.winner].character;
  const w = character(winner);
  // Iris closes on the winner's face.
  const faceY = MASCOT.feetY - (w.feet_baseline_y - w.face_center_y) * MASCOT.scale;
  return (
    <RaceProvider ep={ep}>
      <AbsoluteFill style={{ backgroundColor: "#fff8ef" }}>
        <TransitionSeries>
          <TransitionSeries.Sequence name="Race" durationInFrames={tl.raceFrames}>
            <RaceScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: ep.race.transitionFrames })}
            presentation={irisWipe({ color: INK, centerX: LANE.cx(tl.winner) / width, centerY: faceY / height, holdRadius: 10 })}
          />
          <TransitionSeries.Sequence name="Ending card" durationInFrames={tl.endingFrames}>
            <RevealCard />
          </TransitionSeries.Sequence>
        </TransitionSeries>
        <AudioLayer />
      </AbsoluteFill>
    </RaceProvider>
  );
};
