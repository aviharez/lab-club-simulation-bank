// Lookdev pattern (Environment quality bar, step 8): one composition, 3 frames = 3 stills of a set.
//   frame 0: wide · frame 1: 3/4 · frame 2: close-up with a mascot
// Register per set:  <Composition id="<Set>Lookdev" component={HomeLabV2Lookdev} durationInFrames={3} fps={30} width={1080} height={1920} />
// Render:            node scripts/stills.mjs <Set>Lookdev out/lookdev/<set> 0,1,2
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { CamState } from "../camera";
import { FONT, INK, PAPER } from "../theme";
import { useFontReady } from "../useFontReady";
import type { LookPreset } from "./look";
import { SetStage } from "./SetStage";

export type LookdevShot = "wide" | "threeQuarter" | "closeUp";
export const LOOKDEV_SHOTS: LookdevShot[] = ["wide", "threeQuarter", "closeUp"];

export const SetLookdev: React.FC<{
  title: string;
  look: LookPreset;
  shots: Record<LookdevShot, CamState>;
  /** the set + any mascots; receives the shot so a set can hide foreground framing in a close-up, etc. */
  children: (shot: LookdevShot) => React.ReactNode;
  /** seconds used for animated parts (haze drift, flicker) in every still */
  time?: number;
  /** false: skip the post chain (debugging) */
  post?: boolean;
}> = ({ title, look, shots, children, post = true }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shot = LOOKDEV_SHOTS[Math.min(2, Math.max(0, f))];
  const fontReady = useFontReady(["700"]);
  return (
    <AbsoluteFill style={{ backgroundColor: look.background }}>
      <SetStage width={width} height={height} cam={shots[shot]} look={look} post={post}>
        {children(shot)}
      </SetStage>
      {fontReady ? (
        <div style={{ position: "absolute", left: 40, bottom: 330, padding: "8px 20px", borderRadius: 999, background: PAPER, border: `4px solid ${INK}`, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: INK }}>
          {title} · lookdev {f + 1}/3 · {shot === "threeQuarter" ? "3/4" : shot === "closeUp" ? "close-up" : "wide"}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
