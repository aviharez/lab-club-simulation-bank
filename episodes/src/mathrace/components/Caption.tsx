import React from "react";
import { Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { cueSpans, useRace } from "../context.tsx";
import type { CaptionCue } from "../episode.ts";
import { CAPTION } from "../layout.ts";
import { laneColor } from "../manifest.ts";
import { FONT, INK, renderMathWord } from "../theme.tsx";

const CaptionBar: React.FC<{ cue: CaptionCue }> = ({ cue }) => {
  const frame = useCurrentFrame(); // local to the cue's Sequence
  const { fps } = useVideoConfig();
  const { ep } = useRace();
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 200 } });
  const bg = cue.accentLane !== undefined ? laneColor(ep.race.lanes[cue.accentLane].character) : "#ffffff";
  const big = cue.text === cue.text.toUpperCase();
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        width: 960,
        top: CAPTION.top,
        height: CAPTION.height,
        borderRadius: CAPTION.height / 2,
        background: bg,
        border: `4px solid ${INK}`,
        boxShadow: `0 6px 0 ${INK}`,
        scale: `${0.85 + 0.15 * pop}`,
      }}
    >
      <SpringScaleIn
        text={cue.text}
        fontFamily={FONT}
        fontSize={big ? 68 : 56}
        fontWeight={700}
        color={INK}
        staggerDelay={3}
        renderWord={renderMathWord}
      />
    </div>
  );
};

/** Bottom caption bar; each cue gets its own Sequence so the remocn reveal restarts per phase. */
export const Captions: React.FC<{ end: number }> = ({ end }) => {
  const { ep, tl } = useRace();
  return (
    <>
      {cueSpans(tl, ep.captions, end).map(({ cue, from, to }) => (
        <Sequence key={cue.text} name={`Caption: ${cue.text}`} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
          <CaptionBar cue={cue} />
        </Sequence>
      ))}
    </>
  );
};
