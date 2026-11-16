// Render gate for @react-three/postprocessing inside a Remotion <ThreeCanvas>.
//
// Why: <EffectComposer> creates its composer in a useEffect, then adds the effect passes in a later layout
// effect. <ThreeCanvas> has already rendered and released the frame by then, so a capture could get the plain
// R3F render (no AO, bloom, grade or vignette). It happened on ~50% of stills before this gate existed.
//
// How: usePostGate() registers a delayRender OUTSIDE the canvas (so it is pending before capture), and
// <PostReady> (placed inside <EffectComposer>) waits until the composer holds an EffectPass, advances R3F
// once so the canvas shows the post-processed image, then releases the handle.
import { useThree } from "@react-three/fiber";
import type { EffectComposer as Composer } from "postprocessing";
import { EffectPass } from "postprocessing";
import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

export type PostGate = { release: () => void };

/** Call in a normal component (outside <ThreeCanvas>). Pass the gate to <PostReady>. */
export const usePostGate = (
  label = "post-processing passes",
  enabled = true,
): PostGate => {
  const [gate] = useState(() => {
    if (!enabled) return { release: () => {} };
    const handle = delayRender(label);
    let done = false;
    return {
      release: () => {
        if (done) return;
        done = true;
        continueRender(handle);
      },
    };
  });
  useEffect(() => gate.release, [gate]); // never leak the handle on unmount
  return gate;
};

/** Place inside <EffectComposer ref={composerRef}>. */
export const PostReady: React.FC<{
  gate: PostGate;
  composer: React.RefObject<Composer | null>;
}> = ({ gate, composer }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    let raf = 0;
    const poll = () => {
      const c = composer.current;
      if (c && c.passes.some((p) => p instanceof EffectPass)) {
        advance(performance.now());
        gate.release();
        return;
      }
      raf = requestAnimationFrame(poll);
    };
    poll();
    return () => cancelAnimationFrame(raf);
  }, [advance, composer, gate]);
  return null;
};
