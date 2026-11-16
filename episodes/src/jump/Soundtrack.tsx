// Soundtrack: HeyGen (HyperFrames media-use) BGM + SFX, every cue derived from the same timeline as the picture.
import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { soundCues } from "./sound";
import { BEAT, SLOWMO_END } from "./timeline";

const src = (name: string) => staticFile(`audio/jump/${name}.mp3`);

const CUES = soundCues();

/** Music bed: fades in, ducks under the slow-mo jump and the reveal line, fades out at the end. */
const Bgm: React.FC = () => (
    <Audio
      src={src("bgm_lab")}
      durationInFrames={BEAT.end}
      volume={(f) =>
        interpolate(
          f,
          [0, 12, BEAT.takeoff - 6, BEAT.takeoff + 6, SLOWMO_END, SLOWMO_END + 20, BEAT.reveal + 20, BEAT.reveal + 40, BEAT.cta, BEAT.cta + 10, BEAT.end - 30, BEAT.end],
          [0, 0.26, 0.26, 0.11, 0.11, 0.26, 0.26, 0.16, 0.16, 0.28, 0.28, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
      name="BGM"
    />
);

export const Soundtrack: React.FC = () => (
  <>
    <Bgm />
    {CUES.map((c, i) => (
      <Sequence key={`${c.name}-${c.at}-${i}`} from={c.at} durationInFrames={c.len ?? 150} name={`SFX ${c.label}`} layout="none">
        <Audio
          src={src(c.name)}
          playbackRate={c.rate ?? 1}
          volume={c.len ? (f) => (c.volume ?? 1) * interpolate(f, [c.len! - 10, c.len!], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : (c.volume ?? 1)}
        />
      </Sequence>
    ))}
  </>
);
