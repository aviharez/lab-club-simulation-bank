// The 3D half of the episode: lab set + four mascot actors, all posed from the frame.
import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import type { CastMember } from "../kit";
import {
  ControlPanel,
  GravityChambers,
  LabRoom,
  LabStage,
  chamberX,
  type MaxMarker,
} from "../sets/lab";
import { camAt } from "./camera";
import { PLANETS, peakHeight } from "./physics";
import {
  ACTING,
  BEAT,
  CONSOLE_TEXT,
  COUNTDOWN,
  DOOR,
  peakFrame,
} from "./timeline";

export type Cast = CastMember[];

const popOut = Easing.bezier(0.175, 0.885, 0.32, 1.275); // ease-out-back: playful overshoot

const typed = (text: string, f: number, at: number, cps = 1.4) =>
  text.slice(0, Math.max(0, Math.floor((f - at) * cps)));

const Console: React.FC<{ font: string }> = ({ font }) => {
  const f = useCurrentFrame();
  const l1 = typed(CONSOLE_TEXT.line1, f, CONSOLE_TEXT.at);
  const l2 = typed("— " + CONSOLE_TEXT.line2, f, CONSOLE_TEXT.at + 24);
  const idle = f < CONSOLE_TEXT.at;
  const blink = Math.floor(f / 8) % 2 === 0;
  const lines = idle
    ? [
        { text: "GRAVITY LAB", size: 52, color: "#ffd98a" },
        { text: "standby", size: 44, color: "#9fd0ff" },
      ]
    : [
        { text: "LAUNCH SETTINGS", size: 40, color: "#ffd98a" },
        { text: l1, size: 62, color: "#ffffff" },
        { text: l2, size: 46, color: "#9fe6c4" },
      ];
  // buttons blink in sequence while the screen types, and all light up on the countdown beeps
  const glow = [0, 1, 2, 3].map((i) => {
    const typing =
      f >= CONSOLE_TEXT.at &&
      f < CONSOLE_TEXT.at + 70 &&
      Math.floor((f - CONSOLE_TEXT.at) / 6) % 4 === i
        ? 1
        : 0;
    const beep = COUNTDOWN.some((c) => f >= c.at && f < c.at + 6) ? 1 : 0;
    return Math.max(typing, beep);
  });
  return (
    <ControlPanel
      position={[3.75, 0, 1.6]}
      rotationY={-0.58}
      font={font}
      lines={lines}
      cursor={!idle ? blink : blink}
      buttonGlow={glow}
    />
  );
};

export const Scene3D: React.FC<{ cast: Cast; font: string }> = ({
  cast,
  font,
}) => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const cam = camAt(f);

  const earthDoor =
    interpolate(f, [DOOR.earthOpen, DOOR.earthOpen + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.2, 0, 0, 1),
    }) -
    interpolate(f, [DOOR.earthClose, DOOR.earthClose + 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

  const markers: (MaxMarker | null)[] = PLANETS.map((p, i) => {
    const at = peakFrame(p.id);
    if (f < at || f > BEAT.reveal) return null;
    const pop = interpolate(f, [at, at + 0.3 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: popOut,
    });
    return { height: peakHeight(p.g), color: cast[i].color, pop };
  });

  return (
    <LabStage width={width} height={height} cam={cam}>
      <LabRoom font={font} />
      <GravityChambers
        font={font}
        doors={[0, 0, Math.max(0, earthDoor), 0]}
        markers={markers}
      />
      <Console font={font} />
      {PLANETS.map((p, i) => {
        const st = ACTING[p.id](f, { x: chamberX(i) });
        const c = cast[i];
        return (
          <group
            key={p.id}
            position={st.pos}
            scale={[st.squash[0], st.squash[1], st.squash[0]]}
          >
            <Actor
              meta={c.meta}
              actor={c.actor}
              clip={st.clip}
              time={st.time}
              blend={st.from}
              expression={st.expression}
              yaw={st.yaw}
            />
          </group>
        );
      })}
    </LabStage>
  );
};
