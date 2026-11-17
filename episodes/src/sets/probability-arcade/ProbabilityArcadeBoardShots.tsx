// Board-shot review stills (EP05): the camera framings the episode uses to zoom in on the Galton board, fitted to the
// safe areas by fitCam, with the floor cast stepped aside (ASIDE) so nothing covers the board.
//   frame 0: the whole board · 1: Anna's bin vs Zuzu's bin (bins 0..6) · 2: all bins
// Render: npm run lookdev:probability-arcade:board → out/lookdev/probability-arcade/board_*.png
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../../actors/Actor";
import { balls as pour, BET } from "../../galton-board/data";
import { FONT, INK, PAPER, useCast, useFontReady } from "../../kit";
import { SetStage, useSetGLB } from "../../kit/env";
import { ASIDE, fitCam, occluders, REGIONS, SCREEN, type Region } from "./boardShots";
import { ARCADE, ballPath, stackPos } from "./layout";
import { ARCADE_LOOK } from "./look";
import { ProbabilityArcade } from "./ProbabilityArcade";
import type { BallDraw } from "./props";

const SHOTS: { name: string; region: Region }[] = [
  { name: "board", region: REGIONS.board },
  { name: "anna vs zuzu", region: REGIONS.annaVsZuzu },
  { name: "bins", region: REGIONS.bins },
];
const LANDED = 640;
const FLYING = [0.6, 2.2, 3.9, 5.1, 6.8, 8.4, 9.6, 11.2, 12.4];

export const ProbabilityArcadeBoardShots: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const set = useSetGLB("probability-arcade");
  const cast = useCast(["anna", "lumi", "zuzu", "miyu"]);
  const fontReady = useFontReady(["700"]);
  const shot = SHOTS[Math.min(SHOTS.length - 1, f)];
  const cam = fitCam(shot.region);
  const balls = React.useMemo((): BallDraw[] => {
    const all = pour();
    const out: BallDraw[] = all.slice(0, LANDED).map((b) => ({ pos: stackPos(b.bin, b.slot) }));
    FLYING.forEach((u, k) => {
      const b = all[LANDED + k];
      out.push({ pos: ballPath(b.steps, stackPos(b.bin, b.slot), u) });
    });
    return out;
  }, []);
  const poses = {
    anna: { pos: ASIDE.anna, clip: "idle", expr: "shocked", yaw: 0.9 },
    zuzu: { pos: ASIDE.zuzu, clip: "cheer", expr: "happy", yaw: -0.9 },
    lumi: { pos: ASIDE.lumi, clip: "point", expr: "happy", yaw: -1.0 },
    miyu: { pos: [0.74, ARCADE.platform.pos[1], -0.95], clip: "hold_drop", expr: "squint", yaw: -1.05 },
  } as const;
  const blocked = occluders(cam, shot.region, (["anna", "lumi", "zuzu"] as const).map((n) => ({ name: n, pos: [...poses[n].pos] as [number, number, number] })));
  return (
    <AbsoluteFill style={{ backgroundColor: ARCADE_LOOK.background }}>
      <SetStage width={width} height={height} cam={cam} look={ARCADE_LOOK}>
        {fontReady ? (
          <>
            <ProbabilityArcade
              set={set}
              time={3.2}
              font={FONT}
              balls={balls}
              capacity={1000}
              counter={LANDED}
              glassStreak={0.35}
              haze={0.4}
              tags={[
                { bin: BET.anna, label: "ANNA", color: "#ff8fc6" },
                { bin: BET.zuzu, label: "ZUZU", color: "#ffd84a" },
              ]}
            />
            {cast.map((c) => {
              const p = poses[c.name as keyof typeof poses];
              return (
                <group key={c.name} position={[...p.pos]}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={1.2} expression={p.expr} yaw={p.yaw} />
                </group>
              );
            })}
          </>
        ) : null}
      </SetStage>
      {/* safe-area guides */}
      <div style={{ position: "absolute", left: 0, right: 0, top: SCREEN.top, height: 2, background: "rgba(63,230,214,0.6)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SCREEN.h - SCREEN.bottom, height: 2, background: "rgba(63,230,214,0.6)" }} />
      {fontReady ? (
        <div style={{ position: "absolute", left: 40, bottom: 120, padding: "8px 20px", borderRadius: 999, background: PAPER, border: `4px solid ${INK}`, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: INK }}>
          board shot {f + 1}/3 · {shot.name} · {blocked.length ? `BLOCKED by ${blocked.join(", ")}` : "clear"}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
