// EP07 "Sorting Race": picture + soundtrack.
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FONT, Soundtrack, soundtrackOnly, useCast, useFontReady } from "../kit";
import { useSetGLB } from "../kit/env";
import { ORDER } from "./data";
import { Badges, Captions, EpisodeCta, GrowthChart, CounterTags, RaceChart, ResultCards, RevealCard, Symbols } from "./Overlays";
import { Scene3D } from "./Scene3D";
import { soundtrack } from "./sound";
import { BEAT, REVEAL_CARD } from "./timeline";

export const SortingRace: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const cast = useCast([...ORDER]); // outside the canvas: actors' delayRender is pending before capture
  const set = useSetGLB("chem-prep-room");
  const fontReady = useFontReady();
  return (
    <AbsoluteFill style={{ backgroundColor: "#e8d8bc" }}>
      <Soundtrack soundtrack={soundtrack} music={music} />
      {fontReady ? <Scene3D cast={cast} font={FONT} set={set} /> : null}
      <RaceChart />
      <GrowthChart />
      <CounterTags />
      <Symbols />
      <ResultCards />
      <Badges />
      <Captions />
      <Sequence name="Reveal card" from={REVEAL_CARD.at} durationInFrames={BEAT.cta - REVEAL_CARD.at} layout="none">
        <RevealCard />
      </Sequence>
      <Sequence name="CTA" from={BEAT.cta + 10} durationInFrames={BEAT.end - BEAT.cta - 10} layout="none">
        <EpisodeCta />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Audio-only composition (WAV renders for mastering). */
export const SortingRaceAudio = soundtrackOnly(soundtrack);
