// Manga symbol billboards above the mascots' heads. The episode supplies a projector (3D → screen px, from
// its camera function) and, per actor, a world anchor + the symbols currently active.
import React from "react";
import { AbsoluteFill } from "remotion";
import { MangaSymbol, type SymbolKind } from "../../components/MangaSymbol";

export type Projected = { x: number; y: number; visible: boolean };
export type Projector = (p: [number, number, number]) => Projected;
export type SymbolBillboard = {
  key: string;
  anchor: [number, number, number];
  symbols: { kind: SymbolKind; from: number }[];
};

/** Pixels per metre at a world point: billboards scale with the camera distance. */
export const pxPerM = (proj: Projector, p: [number, number, number]) =>
  Math.abs(proj(p).y - proj([p[0], p[1] + 1, p[2]]).y);

export const MangaSymbols: React.FC<{
  project: Projector;
  items: SymbolBillboard[];
  minSize?: number;
  maxSize?: number;
}> = ({ project, items, minSize = 60, maxSize = 150 }) => (
  <AbsoluteFill>
    {items.map(({ key, anchor, symbols }) => {
      const q = project(anchor);
      if (!q.visible) return null;
      const s = Math.min(
        maxSize,
        Math.max(minSize, pxPerM(project, anchor) * 0.5),
      );
      return (
        <React.Fragment key={key}>
          {symbols.map((sym) => (
            <MangaSymbol
              key={sym.kind}
              kind={sym.kind}
              x={sym.kind === "sweat" ? q.x - s * 0.1 : q.x}
              y={q.y}
              size={sym.kind === "zzz" ? s * 1.1 : s}
              from={sym.from}
            />
          ))}
        </React.Fragment>
      );
    })}
  </AbsoluteFill>
);
