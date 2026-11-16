// Soundtrack: plays the cue sheet from sound.ts (voices, SFX, music) out of the approved audio library.
// All levels come from src/audio/mix.ts, so the report prints exactly what is heard.
import { Audio } from "@remotion/media";
import React from "react";
import { Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cueFrames, cueVolumeAt, HEADROOM, type Cue } from "../audio/mix";
import { soundtrack } from "./sound";

const CueAudio: React.FC<{ cue: Cue; duck: number[] }> = ({ cue, duck }) => {
  const local = useCurrentFrame(); // relative to the cue's Sequence
  const { fps } = useVideoConfig();
  return (
    <Audio
      src={staticFile(cue.file.path)}
      trimBefore={cue.offset ? Math.round(cue.offset * fps) : undefined}
      playbackRate={cue.rate ?? 1}
      volume={HEADROOM * cueVolumeAt(cue, cue.at + local, fps, duck)}
    />
  );
};

/** `music={false}` renders the no-music version (voices + SFX only) for IG/TikTok. */
export const Soundtrack: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const { fps } = useVideoConfig();
  const { cues, duck } = soundtrack();
  return (
    <>
      {cues
        .filter((c) => music || c.layer !== "music")
        .map((c, i) => (
          <Sequence key={`${c.file.id}-${c.at}-${i}`} from={c.at} durationInFrames={Math.max(1, cueFrames(c, fps))} name={`${c.layer.toUpperCase()} ${c.label}`} layout="none">
            <CueAudio cue={c} duck={duck} />
          </Sequence>
        ))}
    </>
  );
};

/** Audio-only composition: renders the mix to WAV in seconds, without the 3D scene. */
export const SoundtrackOnly: React.FC<{ music?: boolean }> = ({ music = true }) => <Soundtrack music={music} />;
