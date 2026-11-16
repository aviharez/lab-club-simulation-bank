// 2D overlays: only src/kit components, fed from timeline.ts.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionPills, MangaSymbols, type Projector } from "../kit";
import { project } from "../sets/lab/layout";
import { camAt } from "./camera";
import { ORDER } from "./data";
import { ACTING, CAPTIONS } from "./timeline";

const useProjector = (): Projector => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(f);
  return (p) => project(cam, p, width, height);
};

export const Captions: React.FC = () => <CaptionPills captions={CAPTIONS} />;

export const Symbols: React.FC = () => {
  const f = useCurrentFrame();
  const proj = useProjector();
  const items = ORDER.map((m) => {
    const st = ACTING(m, f);
    const [x, y, z] = st.pos;
    return {
      key: m,
      anchor: [x + 0.3, y + 1.05, z + 0.2] as [number, number, number],
      symbols: st.symbols,
    };
  });
  return <MangaSymbols project={proj} items={items} />;
};
