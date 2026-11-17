// Caption model + lane layout (pure, no React: the reports import it too).
//
// Three lanes:
// - hook:  the opening question, a big card mid-upper screen with the "Guess first!" sticker under it.
// - info:  process info in the top pill. A pill holds until the next info caption starts, so dialog
//          lines never knock it off screen early.
// - chat:  dialog (`speaker` set) as chat bubbles under the pill. A conversation (dialog lines with no
//          info caption starting between them) stacks up like a chat; each bubble stays up at least
//          CHAT_MIN frames and lingers CHAT_LINGER frames after the conversation's last line.
import type { Mascot } from "./cast";

export type Caption = {
  from: number;
  to: number;
  text: string;
  /** "big": yellow pill, 72 px (one-word shouts like "GO!"). "hook": the opening question card. */
  variant?: "big" | "hook";
  /** set for dialog: shown as a chat bubble from this mascot (text without the name or quotes) */
  speaker?: Mascot;
  /** sticker slapped mid-screen at frame `at` (absolute); under the hook card it sits below the question */
  sticker?: { text: string; at: number; top?: number; color?: string };
};

export const CHAT_MIN = 66; // 2.2 s on screen, at least
export const CHAT_LINGER = 18;
export const CHAT_MAX_VISIBLE = 3;
export const INFO_MIN = 45; // 1.5 s, checked by the reports

export type Lane = "hook" | "info" | "chat";
export const laneOf = (c: Caption): Lane =>
  c.speaker ? "chat" : c.variant === "hook" ? "hook" : "info";

export type Placed = Caption & { lane: Lane; end: number };

/** Every caption with the frame it actually leaves the screen. */
export const layoutCaptions = (captions: Caption[]): Placed[] => {
  const sorted = [...captions].sort((a, b) => a.from - b.from);
  const infos = sorted.filter((c) => laneOf(c) === "info");
  const nextInfoFrom = (f: number) => infos.find((i) => i.from > f)?.from;
  return sorted.map((c) => {
    const lane = laneOf(c);
    if (lane === "hook") return { ...c, lane, end: c.to };
    // shouts ("big") keep their own end; status lines hold until the next info caption
    if (lane === "info")
      return { ...c, lane, end: c.variant === "big" ? c.to : Math.max(c.to, nextInfoFrom(c.from) ?? c.to) };
    // chat: the conversation runs until an info caption starts after this line (or the next hook)
    const breakAt = nextInfoFrom(c.from) ?? Infinity;
    const thread = sorted.filter((d) => d.speaker && d.from >= c.from && d.from < breakAt);
    const threadEnd = Math.max(...thread.map((d) => d.to));
    return { ...c, lane, end: Math.max(threadEnd + CHAT_LINGER, c.from + CHAT_MIN) };
  });
};

/** Chat bubble geometry (px). Lines are estimated from the text length (Fredoka 44 px, ~30 chars per line). */
export const CHAT = { top: 360, font: 44, charsPerLine: 30, lineH: 54, padY: 22, nameH: 36, gap: 18 };
export const chatLines = (text: string) => Math.max(1, Math.ceil(text.length / CHAT.charsPerLine));
export const chatHeight = (text: string) => CHAT.nameH + chatLines(text) * CHAT.lineH + CHAT.padY * 2;

/** Report check: every caption is on screen long enough to read. Returns failure strings. */
export const captionReadability = (captions: Caption[]): string[] =>
  layoutCaptions(captions).flatMap((c) => {
    const len = c.end - c.from;
    if (c.lane === "info" && len < INFO_MIN && c.variant !== "big")
      return [`info "${c.text}" only ${len} f (< ${INFO_MIN})`];
    if (c.lane === "chat" && len < CHAT_MIN) return [`chat "${c.text}" only ${len} f`];
    if (c.speaker && /^\w+: /.test(c.text)) return [`chat "${c.text}" still has the name in its text`];
    return [];
  });
