// 3D half of EP05: the probability arcade, the Galton machine driven by the seeded pour (board.ts), the bell-curve
// overlay and path fans of the twist, Miyu's scoop, Lumi's clipboard and the four actors, all posed from the frame.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import { type CastMember } from "../kit";
import { SetStage, type LoadedSet } from "../kit/env";
import { ARCADE_LOOK, Clipboard, ProbabilityArcade, Scoop } from "../sets/probability-arcade";
import { ANNA_PATH, ballsAt, counterAt, CURVE_POINTS, curveAt, pathsAt, trailsAt, zuzuFan } from "./board";
import { boardShotAt, camAt } from "./camera";
import { BET, type Member } from "./data";
import { ACTING, ANNA_LAND, BEAT, HIGHLIGHT, scoopAt, worldTime } from "./timeline";

/** Lumi's clipboard in her left hand (bone-local offset + rotation, set from the test stills). */
export const CLIPBOARD = { bone: "L_Hand", pos: [0, 0.02, 0.03] as [number, number, number], rot: [0, 0, 0] as [number, number, number], scale: 1 };

const tagGlow = (f: number, at: number) => (f >= at && f < at + 40 ? 0.9 * (1 - (f - at) / 40) : 0);

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, font, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = worldTime(f);
  const board = boardShotAt(f) !== null;
  const scoop = scoopAt(f);
  const fan = React.useMemo(zuzuFan, []);
  const p = pathsAt(f);
  const curve = curveAt(f);
  const trails = trailsAt(f);
  if (curve > 0) trails.push({ points: CURVE_POINTS, progress: curve, color: "#3fe6d6", opacity: f >= BEAT.paths ? 0.45 : 0.95, width: 0.009 });
  if (p.anna > 0) trails.push({ points: ANNA_PATH, progress: p.anna, color: HIGHLIGHT.annaColor, opacity: 0.95, width: 0.009 });
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={ARCADE_LOOK}>
      <ProbabilityArcade
        set={set}
        time={t}
        font={font}
        balls={ballsAt(f)}
        capacity={1000}
        counter={counterAt(f)}
        trails={trails}
        fans={p.fan > 0 ? [{ paths: fan, progress: p.fan, color: "#ffd84a", opacity: 0.09 }] : []}
        tags={[
          { bin: BET.anna, label: "ANNA", color: "#ff8fc6", swing: 0.05 * Math.sin(t * 1.7), glow: tagGlow(f, ANNA_LAND) },
          { bin: BET.zuzu, label: "ZUZU", color: "#ffd84a", swing: -0.04 * Math.sin(t * 1.5 + 1), glow: tagGlow(f, BEAT.grow) },
        ]}
        glassStreak={board ? 0.35 : 1}
        haze={board ? 0.4 : 1}
      />
      {scoop ? <Scoop position={scoop.pos} yaw={scoop.yaw} tilt={scoop.tilt} full={scoop.full} /> : null}
      {cast.map((c) => {
        const st = ACTING(c.name as Member, f);
        const attach =
          c.name === "lumi"
            ? [
                {
                  bone: CLIPBOARD.bone,
                  children: (
                    <group position={CLIPBOARD.pos} rotation={CLIPBOARD.rot} scale={CLIPBOARD.scale}>
                      <Clipboard font={font} />
                    </group>
                  ),
                },
              ]
            : undefined;
        return (
          <group key={c.name} position={st.pos}>
            <Actor meta={c.meta} actor={c.actor} clip={st.clip} time={st.time} blend={st.from} expression={st.expression} yaw={st.yaw} attach={attach} />
          </group>
        );
      })}
    </SetStage>
  );
};
