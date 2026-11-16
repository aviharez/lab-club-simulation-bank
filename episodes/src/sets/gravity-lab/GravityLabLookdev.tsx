// Lookdev stills for gravity-lab (EP01's set), shot with EP01's own cameras:
//   frame 0 wide (CAMERAS.wide) · 1 three-quarter (CAMERAS.iso) · 2 close-up: Lumi at the console (CAMERAS.panel)
// Render: npm run lookdev:gravity-lab  → out/lookdev/gravity-lab/
import React from "react";
import { Actor } from "../../actors/Actor";
import { FONT, useCast, useFontReady } from "../../kit";
import type { CamState } from "../../kit/camera";
import { SetLookdev, useSetGLB, type LookdevShot } from "../../kit/env";
import { ControlPanel } from "../lab/ControlPanel";
import { GravityChambers } from "../lab/GravityChambers";
import { CAMERAS, chamberX } from "../lab/layout";
import { GravityLab, type GravityLabParts } from "./GravityLab";
import { GRAVITY_LAB_LOOK } from "./look";

export const GRAVITY_LAB_SHOTS: Record<LookdevShot, CamState> = {
  wide: CAMERAS.wide,
  threeQuarter: CAMERAS.iso,
  closeUp: CAMERAS.panel,
};

const POSES: Record<string, { clip: string; t: number; expr: string }> = {
  miyu: { clip: "sleep_stand", t: 0.8, expr: "squint" },
  anna: { clip: "point", t: 0.6, expr: "smug" },
  lumi: { clip: "idle", t: 1.2, expr: "happy" },
  zuzu: { clip: "cheer", t: 0.5, expr: "happy" },
};

export const GravityLabLookdev: React.FC<{ post?: boolean; parts?: GravityLabParts }> = ({ post = true, parts }) => {
  const set = useSetGLB("gravity-lab");
  const cast = useCast(["miyu", "anna", "lumi", "zuzu"]);
  const fontReady = useFontReady();
  return (
    <SetLookdev title="gravity-lab" look={GRAVITY_LAB_LOOK} shots={GRAVITY_LAB_SHOTS} post={post}>
      {(shot) =>
        fontReady ? (
          <>
            <GravityLab set={set} time={2.5} parts={parts} />
            <GravityChambers font={FONT} />
            <ControlPanel
              position={[3.75, 0, 1.6]}
              rotationY={-0.58}
              font={FONT}
              lines={[
                { text: "LAUNCH SETTINGS", size: 40, color: "#ffd98a" },
                { text: "same push", size: 62, color: "#ffffff" },
                { text: "— 4 planets", size: 46, color: "#9fe6c4" },
              ]}
              buttonGlow={[1, 0, 1, 0]}
            />
            {cast.map((c, i) => {
              // close-up: Lumi at the console (EP01's setup beat); otherwise everyone in their chamber
              const atPanel = shot === "closeUp" && c.name === "lumi";
              const pos: [number, number, number] = atPanel ? [2.9, 0, 1.75] : [chamberX(i), 0.12, 0];
              const p = atPanel ? { clip: "point", t: 0.8, expr: "happy" } : POSES[c.name];
              return (
                <group key={c.name} position={pos}>
                  <Actor meta={c.meta} actor={c.actor} clip={p.clip} time={p.t} expression={p.expr} yaw={atPanel ? -0.15 : 0} />
                </group>
              );
            })}
          </>
        ) : null
      }
    </SetLookdev>
  );
};
