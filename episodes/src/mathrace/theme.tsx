import { loadFont } from "@remotion/google-fonts/Fredoka";
import type React from "react";

export const { fontFamily: FONT } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

export const INK = "#2b2118";
export const INK_SOFT = "#7a6a5c";
export const PAPER = "#fff8ef";
export const CARD = "#ffffff";
export const LINE = "#efe2d2";

const SUPERS: Record<string, string> = { "ⁿ": "n", "³": "3", "²": "2", "¹": "1", "⁰": "0" };

/** Renders text with superscript characters typeset as real raised glyphs (Fredoka lacks ⁿ). */
export const MathText: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let buf = "";
  [...text].forEach((ch, i) => {
    if (SUPERS[ch]) {
      if (buf) parts.push(buf);
      buf = "";
      parts.push(
        <span key={i} style={{ fontSize: "0.6em", position: "relative", top: "-0.75em", marginLeft: "0.04em" }}>
          {SUPERS[ch]}
        </span>,
      );
    } else buf += ch;
  });
  if (buf) parts.push(buf);
  return <>{parts}</>;
};

export const renderMathWord = (w: string) => <MathText text={w} />;
