// Episode root: picture + soundtrack. Register in Root.tsx as <Pascal> and <Pascal>Audio.
import React from "react";
import { AbsoluteFill } from "remotion";
import {
  FONT,
  Soundtrack,
  soundtrackOnly,
  useCast,
  useFontReady,
} from "../kit";
import { ORDER } from "./data";
import { Captions, Symbols } from "./Overlays";
import { Scene3D } from "./Scene3D";
import { soundtrack } from "./sound";

export const Template: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const cast = useCast(ORDER); // outside the canvas: actors' delayRender is pending before capture
  const fontReady = useFontReady();
  return (
    <AbsoluteFill style={{ backgroundColor: "#f6efe6" }}>
      <Soundtrack soundtrack={soundtrack} music={music} />
      {fontReady ? <Scene3D cast={cast} font={FONT} /> : null}
      <Symbols />
      <Captions />
    </AbsoluteFill>
  );
};

export const TemplateAudio = soundtrackOnly(soundtrack);
