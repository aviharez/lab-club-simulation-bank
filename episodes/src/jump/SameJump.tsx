// Episode: "Same Jump, Different Planets" — 1080x1920, 30 fps, 40 s.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Sequence } from "remotion";
import manifest from "../../public/mascots/manifest.json";
import { useActor, type ActorMeta } from "../actors/Actor";
import { MASCOT_COLORS } from "../sets/lab/layout";
import { Captions, ChartPanel, Countdown, CtaCard, HeightReadouts, MangaSymbols, ResultCards, RevealCard, SlowMoBadge } from "./Overlays";
import { PLANETS } from "./physics";
import { Scene3D, type Cast } from "./Scene3D";
import { Soundtrack } from "./Soundtrack";
import { FONT, fredoka } from "./theme";
import { BEAT, REVEAL_CARD } from "./timeline";

const chars = manifest.characters as unknown as Record<string, { signature_color: string; actor: ActorMeta }>;

/** Canvas textures draw text with Fredoka: hold the render until the font is really usable by canvas. */
const useFontReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("fonts for canvas textures"));
  useEffect(() => {
    fredoka
      .waitUntilDone()
      .then(() => Promise.all(["700 100px", "600 100px", "500 100px"].map((w) => document.fonts.load(`${w} ${FONT}`))))
      .catch((e) => console.error(e))
      .finally(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
};

const metaOf = (name: string) => chars[name].actor;
// stable meta objects (useActor's effect depends on identity)
const META = { miyu: metaOf("miyu"), anna: metaOf("anna"), lumi: metaOf("lumi"), zuzu: metaOf("zuzu") };

export const SameJump: React.FC<{ music?: boolean }> = ({ music = true }) => {
  // actors are loaded OUTSIDE the canvas so their delayRender is registered before capture
  const miyu = useActor(META.miyu);
  const anna = useActor(META.anna);
  const lumi = useActor(META.lumi);
  const zuzu = useActor(META.zuzu);
  const fontReady = useFontReady();
  const loaded = { miyu, anna, lumi, zuzu };
  const cast: Cast = PLANETS.map((p) => ({ meta: META[p.mascot], actor: loaded[p.mascot], color: MASCOT_COLORS[p.mascot] }));
  const colors = cast.map((c) => c.color);

  return (
    <AbsoluteFill style={{ backgroundColor: "#f6efe6" }}>
      <Soundtrack music={music} />
      {fontReady ? <Scene3D cast={cast} font={FONT} /> : null}
      <ChartPanel colors={colors} />
      <HeightReadouts colors={colors} />
      <MangaSymbols />
      <ResultCards colors={colors} />
      <Countdown />
      <SlowMoBadge />
      <Captions />
      <Sequence name="Reveal card" from={REVEAL_CARD.at} durationInFrames={BEAT.cta - REVEAL_CARD.at} layout="none">
        <RevealCard />
      </Sequence>
      <Sequence name="CTA" from={BEAT.cta + 10} durationInFrames={BEAT.end - BEAT.cta - 10} layout="none">
        <CtaCard />
      </Sequence>
    </AbsoluteFill>
  );
};
