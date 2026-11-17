// Captions in three lanes (see src/kit/captions.ts):
// - hook: the opening question as a big card, with the "Guess first!" sticker slapped under it,
// - info: process info in the top pill (holds until the next info caption),
// - chat: dialog lines (`speaker`) as chat bubbles under the pill, stacking like a conversation.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import {
  CHAT,
  CHAT_MAX_VISIBLE,
  chatHeight,
  layoutCaptions,
  type Caption,
  type Placed,
} from "../captions";
import { MASCOT_COLORS, MASCOT_NAMES, type Mascot } from "../cast";
import { clamp, exitE, move, pop } from "../motion";
import { DUR, FONT, INK, PAPER, SAFE } from "../theme";

export type { Caption } from "../captions";

// ---------------------------------------------------------------- sticker

const Sticker: React.FC<{
  s: NonNullable<Caption["sticker"]>;
  local: number; // frames since the sticker's `at`
  style?: React.CSSProperties;
}> = ({ s, local, style }) => (
  <div
    style={{
      padding: "10px 34px",
      borderRadius: 24,
      background: s.color ?? "#ff8fa8",
      border: `5px solid ${INK}`,
      boxShadow: `0 6px 0 ${INK}`,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 76,
      color: "#fff",
      whiteSpace: "nowrap",
      rotate: "-6deg",
      // slap: anticipation (big), overshoot, settle
      scale: interpolate(local, [0, 5, 9, 13], [1.7, 0.92, 1.05, 1], {
        ...clamp,
        easing: Easing.out(Easing.quad),
      }),
      opacity: interpolate(local, [0, 3], [0, 1], clamp),
      ...style,
    }}
  >
    {s.text}
  </div>
);

// ---------------------------------------------------------------- hook card

const HOOK = { top: 230, font: 96, stagger: 3 };

const HookCard: React.FC<{ c: Placed }> = ({ c }) => {
  const frame = useCurrentFrame(); // local
  const len = c.end - c.from;
  const words = c.text.split(" ");
  const out = interpolate(frame, [len - DUR.quick, len], [0, 1], {
    ...clamp,
    easing: exitE,
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: HOOK.top,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: 1 - out,
          translate: `0px ${-40 * out}px`,
        }}
      >
        <div
          style={{
            width: 960,
            boxSizing: "border-box",
            padding: "38px 46px 44px",
            borderRadius: 52,
            background: PAPER,
            border: `7px solid ${INK}`,
            boxShadow: `0 12px 0 ${INK}`,
            scale: interpolate(frame, [0, DUR.standard], [0.8, 1], {
              ...clamp,
              easing: pop,
            }),
            opacity: interpolate(frame, [0, 4], [0, 1], clamp),
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: "0.24em",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: HOOK.font,
            lineHeight: 1.08,
            color: INK,
            letterSpacing: "-0.01em",
            textAlign: "center",
          }}
        >
          {words.map((w, i) => {
            const l = frame - 3 - i * HOOK.stagger;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: interpolate(l, [0, 4], [0, 1], clamp),
                  scale: interpolate(l, [0, DUR.standard], [0.6, 1], {
                    ...clamp,
                    easing: pop,
                  }),
                  translate: `0px ${interpolate(l, [0, DUR.standard], [24, 0], { ...clamp, easing: move })}px`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {c.sticker ? (
          <Sticker
            s={c.sticker}
            local={frame - (c.sticker.at - c.from)}
            style={{ marginTop: -18 }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- info pill

const InfoPill: React.FC<{ c: Placed }> = ({ c }) => {
  const frame = useCurrentFrame(); // local to the caption's Sequence
  const len = c.end - c.from;
  const big = c.variant === "big";
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 50,
          width: 980,
          top: SAFE.top + 12,
          height: 108,
          borderRadius: 54,
          background: big ? "#ffd86b" : PAPER,
          border: `5px solid ${INK}`,
          boxShadow: `0 7px 0 ${INK}`,
          translate: interpolate(
            frame,
            [0, DUR.standard, len - DUR.quick, len],
            ["0px -26px", "0px 0px", "0px 0px", "0px -18px"],
            { ...clamp, easing: move },
          ),
          scale: interpolate(frame, [0, DUR.standard], [0.86, 1], {
            ...clamp,
            easing: pop,
          }),
          opacity: interpolate(frame, [0, 4, len - 5, len], [0, 1, 1, 0], clamp),
        }}
      >
        <SpringScaleIn
          text={c.text}
          fontFamily={FONT}
          fontSize={big ? 72 : c.text.length > 30 ? 46 : 52}
          fontWeight={700}
          color={INK}
          staggerDelay={2}
        />
      </div>
      {c.sticker ? (
        <Sticker
          s={c.sticker}
          local={frame - (c.sticker.at - c.from)}
          style={{
            position: "absolute",
            left: "50%",
            top: c.sticker.top ?? 640,
            translate: "-50% 0",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- chat lane

/** Speakers on the left vs right, so two rivals answer each other across the screen. */
const SIDE: Record<Mascot, "left" | "right"> = {
  anna: "left",
  lumi: "left",
  zuzu: "right",
  miyu: "right",
};
const tint = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * k + 255 * (1 - k));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};
const ENTER = DUR.standard;
const EXIT = DUR.quick + 2;
const AVATAR = 78;

const Bubble: React.FC<{ c: Placed; y: number; enter: number; exit: number }> = ({
  c,
  y,
  enter,
  exit,
}) => {
  const who = c.speaker!;
  const side = SIDE[who];
  const color = MASCOT_COLORS[who];
  const sign = side === "left" ? -1 : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [side]: 44,
        maxWidth: 900,
        display: "flex",
        flexDirection: side === "left" ? "row" : "row-reverse",
        alignItems: "flex-end",
        gap: 14,
        opacity: Math.min(interpolate(enter, [0, 0.3], [0, 1], clamp), 1 - exit),
        translate: `${sign * 60 * (1 - enter)}px ${-30 * exit}px`,
        scale: 0.8 + 0.2 * enter,
        transformOrigin: `${side} bottom`,
      }}
    >
      <div
        style={{
          width: AVATAR,
          height: AVATAR,
          flex: "none",
          borderRadius: "50%",
          background: color,
          border: `5px solid ${INK}`,
          boxShadow: `0 5px 0 ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 44,
          color: "#fff",
          textShadow: `0 3px 0 ${INK}`,
        }}
      >
        {MASCOT_NAMES[who][0]}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: side === "left" ? "flex-start" : "flex-end",
        }}
      >
        <div
          style={{
            height: CHAT.nameH,
            padding: "0 16px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 34,
            lineHeight: `${CHAT.nameH}px`,
            color: "#fff",
            textShadow: `0 2px 0 ${INK}, 0 0 8px rgba(0,0,0,0.45)`,
          }}
        >
          {MASCOT_NAMES[who]}
        </div>
        <div
          style={{
            padding: `${CHAT.padY - 5}px 30px`,
            maxWidth: 780,
            background: tint(color, 0.16),
            border: `5px solid ${INK}`,
            boxShadow: `0 6px 0 ${INK}`,
            borderRadius: 36,
            [side === "left" ? "borderBottomLeftRadius" : "borderBottomRightRadius"]: 8,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: CHAT.font,
            lineHeight: `${CHAT.lineH}px`,
            color: INK,
            textAlign: side,
          }}
        >
          {c.text}
        </div>
      </div>
    </div>
  );
};

const ChatLane: React.FC<{ chat: Placed[] }> = ({ chat }) => {
  const frame = useCurrentFrame();
  // a bubble also leaves when it would be the (MAX+1)-th on screen
  const ends = chat.map((c, i) => {
    const pushedAt = chat[i + CHAT_MAX_VISIBLE]?.from;
    return pushedAt !== undefined && pushedAt < c.end ? pushedAt : c.end;
  });
  const shown = chat
    .map((c, i) => ({
      c,
      enter: interpolate(frame - c.from, [0, ENTER], [0, 1], { ...clamp, easing: pop }),
      exit: interpolate(frame - ends[i], [0, EXIT], [0, 1], { ...clamp, easing: exitE }),
    }))
    .filter(({ c }, i) => frame >= c.from && frame < ends[i] + EXIT);
  let y = CHAT.top;
  return (
    <AbsoluteFill>
      {shown.map(({ c, enter, exit }) => {
        const top = y;
        // the slot collapses as the bubble leaves, so the ones below slide up smoothly
        const slot = chatHeight(c.text) + CHAT.gap;
        y += slot * Easing.inOut(Easing.quad)(1 - exit) * Math.min(1, enter * 1.4);
        return <Bubble key={`${c.from}-${c.text}`} c={c} y={top} enter={enter} exit={exit} />;
      })}
    </AbsoluteFill>
  );
};

const StickerAt: React.FC<{ s: NonNullable<Caption["sticker"]> }> = ({ s }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Sticker
        s={s}
        local={frame}
        style={{ position: "absolute", left: "50%", top: s.top ?? 640, translate: "-50% 0" }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- all lanes

/** Hook card, info pills and the chat lane; each hook/info caption in its own named Sequence. */
export const CaptionPills: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const placed = layoutCaptions(captions);
  const chat = placed.filter((c) => c.lane === "chat");
  return (
    <>
      {placed
        .filter((c) => c.lane !== "chat")
        .map((c) => (
          <Sequence
            key={`${c.from}-${c.text}`}
            name={`${c.lane === "hook" ? "Hook" : "Caption"}: ${c.text}`}
            from={c.from}
            durationInFrames={c.end - c.from}
            layout="none"
          >
            {c.lane === "hook" ? <HookCard c={c} /> : <InfoPill c={c} />}
          </Sequence>
        ))}
      {chat
        .filter((c) => c.sticker)
        .map((c) => (
          <Sequence
            key={`sticker-${c.from}`}
            name={`Sticker: ${c.sticker!.text}`}
            from={c.sticker!.at}
            durationInFrames={Math.max(1, c.end - c.sticker!.at)}
            layout="none"
          >
            <StickerAt s={c.sticker!} />
          </Sequence>
        ))}
      {chat.length ? (
        <Sequence name="Chat" layout="none">
          <ChatLane chat={chat} />
        </Sequence>
      ) : null}
    </>
  );
};
