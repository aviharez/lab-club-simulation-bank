// Episode: EP02 "Feather vs Hammer" — 1080x1920, 30 fps, 40 s.
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FONT, Soundtrack, soundtrackOnly, useCast, useFontReady } from "../kit";
import { useSetGLB } from "../kit/env";
import { ORDER } from "./data";
import { Badges, Captions, DropTimers, EpisodeChart, EpisodeCountdown, EpisodeCta, ResultCards, RevealCard, Symbols } from "./Overlays";
import { Scene3D } from "./Scene3D";
import { soundtrack } from "./sound";
import { BEAT, REVEAL_CARD } from "./timeline";

export const FeatherHammer: React.FC<{ music?: boolean }> = ({ music = true }) => {
  // actors and the set GLB load OUTSIDE the canvas so their delayRender is registered before capture
  const cast = useCast(ORDER);
  const set = useSetGLB("vacuum-hall");
  const fontReady = useFontReady();
  return (
    <AbsoluteFill style={{ backgroundColor: "#dfe5ea" }}>
      <Soundtrack soundtrack={soundtrack} music={music} />
      {fontReady ? <Scene3D cast={cast} font={FONT} set={set} /> : null}
      <EpisodeChart />
      <DropTimers />
      <Symbols />
      <ResultCards />
      <EpisodeCountdown />
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
export const FeatherHammerAudio = soundtrackOnly(soundtrack);
