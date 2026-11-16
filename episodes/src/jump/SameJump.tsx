// Episode: "Same Jump, Different Planets" — 1080x1920, 30 fps, 40 s.
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import {
  FONT,
  Soundtrack,
  soundtrackOnly,
  useCast,
  useFontReady,
} from "../kit";
import {
  Captions,
  EpisodeChart,
  EpisodeCountdown,
  EpisodeCta,
  HeightReadouts,
  MangaSymbols,
  ResultCards,
  RevealCard,
  SlowMoBadge,
} from "./Overlays";
import { PLANETS } from "./physics";
import { Scene3D } from "./Scene3D";
import { soundtrack } from "./sound";
import { BEAT, REVEAL_CARD } from "./timeline";

/** Chamber order, left → right. */
const ORDER = PLANETS.map((p) => p.mascot);

export const SameJump: React.FC<{ music?: boolean }> = ({ music = true }) => {
  // actors are loaded OUTSIDE the canvas so their delayRender is registered before capture
  const cast = useCast(ORDER);
  const fontReady = useFontReady();
  const colors = cast.map((c) => c.color);

  return (
    <AbsoluteFill style={{ backgroundColor: "#f6efe6" }}>
      <Soundtrack soundtrack={soundtrack} music={music} />
      {fontReady ? <Scene3D cast={cast} font={FONT} /> : null}
      <EpisodeChart colors={colors} />
      <HeightReadouts colors={colors} />
      <MangaSymbols />
      <ResultCards colors={colors} />
      <EpisodeCountdown />
      <SlowMoBadge />
      <Captions />
      <Sequence
        name="Reveal card"
        from={REVEAL_CARD.at}
        durationInFrames={BEAT.cta - REVEAL_CARD.at}
        layout="none"
      >
        <RevealCard />
      </Sequence>
      <Sequence
        name="CTA"
        from={BEAT.cta + 10}
        durationInFrames={BEAT.end - BEAT.cta - 10}
        layout="none"
      >
        <EpisodeCta />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Audio-only composition (WAV renders for mastering). */
export const SameJumpAudio = soundtrackOnly(soundtrack);
