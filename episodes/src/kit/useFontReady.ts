// Canvas textures (3D signs, screens, posters) draw text with Fredoka: hold the render until the font is
// really usable by canvas, not just declared. Returns true once ready; render the 3D scene only then.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { FONT, fredoka } from "./theme";

export const useFontReady = (weights: string[] = ["700", "600", "500"]) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("fonts for canvas textures"));
  useEffect(() => {
    fredoka
      .waitUntilDone()
      .then(() =>
        Promise.all(
          weights.map((w) => document.fonts.load(`${w} 100px ${FONT}`)),
        ),
      )
      .catch((e) => console.error(e))
      .finally(() => {
        setReady(true);
        continueRender(handle);
      });
    // weights are a constant per episode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);
  return ready;
};
