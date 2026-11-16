import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pose, SymbolKind } from "../episode.ts";
import { character, spriteSrc } from "../manifest.ts";
import { MangaSymbol } from "./MangaSymbol.tsx";

// Symbol anchor offsets relative to the face center, in sprite pixels (1024 space).
const SYMBOL_OFFSET: Record<SymbolKind, [number, number]> = {
  sweat: [150, -70],
  exclaim: [170, -230],
  sparkle: [190, -190],
  spiral: [0, -290],
  none: [0, 0],
};

export type MascotProps = {
  name: string;
  pose: Pose;
  expression: string;
  /** Frame of the last expression change — drives the squash/bounce. */
  changeFrame: number;
  /** Screen x of the face center. */
  x: number;
  /** Screen y of the feet baseline. */
  feetY: number;
  scale: number;
  symbol?: SymbolKind;
  /** Every sprite this mascot will show — kept mounted (hidden) so swaps never flash. */
  preload?: { pose: Pose; expression: string }[];
  /** Frame the mascot first pops in. */
  enterFrame?: number;
};

export const Mascot: React.FC<MascotProps> = ({
  name,
  pose,
  expression,
  changeFrame,
  x,
  feetY,
  scale,
  symbol = "none",
  preload = [],
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = character(name);
  const [sw, sh] = c.sprite_size;

  const enter = spring({ frame: frame - enterFrame, fps, config: { damping: 12, stiffness: 160 } });
  const bounce = spring({ frame: frame - changeFrame, fps, config: { damping: 7, stiffness: 260, mass: 0.6 } });
  const squashX = interpolate(bounce, [0, 1], [1.16, 1]);
  const squashY = interpolate(bounce, [0, 1], [0.8, 1]);
  const hop = interpolate(bounce, [0, 0.5, 1], [0, -26, 0], { extrapolateRight: "clamp" });
  const breathe = 1 + 0.012 * Math.sin(frame / 9);
  const wobble = pose === "panic" ? Math.sin(frame / 3) * 3 : 0;

  const left = x - c.face_center_x * scale;
  const top = feetY - c.feet_baseline_y * scale;
  const current = spriteSrc(name, pose, expression);
  const all = Array.from(new Set([current, ...preload.map((p) => spriteSrc(name, p.pose, p.expression))]));
  const [ox, oy] = SYMBOL_OFFSET[symbol];

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: sw * scale,
        height: sh * scale,
        transformOrigin: `${c.face_center_x * scale}px ${c.feet_baseline_y * scale}px`,
        scale: `${squashX * enter} ${squashY * breathe * enter}`,
        translate: `0px ${hop}px`,
        rotate: `${wobble}deg`,
      }}
    >
      {all.map((src) => (
        <Img
          key={src}
          src={src}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: src === current ? 1 : 0 }}
        />
      ))}
      <MangaSymbol
        kind={symbol}
        x={(c.face_center_x + ox) * scale}
        y={(c.face_center_y + oy) * scale}
        size={170 * scale}
        from={changeFrame}
      />
    </div>
  );
};
