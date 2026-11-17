// 3D half of EP02: the vacuum-hall set, the AIR + VACUUM columns, the pump + console, two hammer/feather pairs and
// the four actors, all posed from the frame. Prop heights come straight from data.ts (via timeline.propAt).
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import type { CastMember } from "../kit";
import { SetStage, type LoadedSet } from "../kit/env";
import { ControlPanel, STEEL_PANEL } from "../sets/lab/ControlPanel";
import { Feather, Hammer, VacuumColumn, VacuumPump } from "../sets/lab/props";
import { VACUUM_HALL, VacuumHall, VACUUM_HALL_LOOK } from "../sets/vacuum-hall";
import { camAt } from "./camera";
import type { Medium, Member, ObjectId } from "./data";
import { ACTING, PUMP, portAngle, propAt, pumpRunning, STAGE, vacPressure, worldTime } from "./timeline";

const MEDIA: Medium[] = ["air", "vacuum"];

/** One prop, posed from the timeline. Decorative sway/spin only; the height is the data. */
const Prop: React.FC<{ o: ObjectId; m: Medium; f: number }> = ({ o, m, f }) => {
  const s = propAt(o, m, f);
  const [x, y, z] = s.pos;
  if (o === "hammer") return <Hammer position={[x, y + 0.05 * 1.25, z]} tilt={Math.PI / 2} spin={-0.4} scale={1.25} />;
  // air: the feather rocks and drifts a little while it floats down; it settles flat on landing
  const fall = s.falling && y > STAGE.floorY + 1e-6;
  const sway = fall ? 0.32 * Math.sin(s.t * 2.6) : 0;
  const drift = fall && m === "air" ? 0.07 * Math.sin(s.t * 1.3) : 0;
  const spin = 0.6 + (fall ? 0.35 * s.t : s.falling ? 0.35 * s.t : 0);
  return <Feather position={[x + drift, y, z]} sway={sway} spin={Math.min(spin, 3.2)} scale={1.25} color="#ffe58a" tip="#f29a2e" />;
};

const kPa = (p: number) => Math.round(p * 101.325);

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, font, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const time = worldTime(f);
  const p = vacPressure(f);
  const run = pumpRunning(f);
  const press = f >= PUMP.press - 3 && f < PUMP.press + 5 ? 1 : 0;
  const C = VACUUM_HALL.console;
  const P = VACUUM_HALL.pump;
  const pumping = f >= PUMP.on && f < PUMP.off;
  const blink = Math.floor(f / 8) % 2 === 0;
  const lines =
    f < PUMP.on
      ? [
          { text: "VACUUM PUMP", size: 40, color: "#8af2ff" },
          { text: "ready", size: 62, color: "#ffffff" },
        ]
      : [
          { text: pumping ? "PUMPING…" : "VACUUM", size: 40, color: "#8af2ff" },
          { text: `${kPa(p)} kPa`, size: 66, color: "#ffffff" },
          { text: pumping ? "removing air" : "no air left", size: 40, color: "#9fe6c4" },
        ];
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={VACUUM_HALL_LOOK}>
      <VacuumHall set={set} time={time} />
      {MEDIA.map((m) => (
        <VacuumColumn
          key={m}
          x={STAGE.columnX[m]}
          title={m === "air" ? "AIR" : "VACUUM"}
          sub={m === "air" ? "normal air" : "no air"}
          font={font}
          pressure={m === "air" ? 1 : p}
          ports={[portAngle("anna", m), portAngle("zuzu", m)]}
          pulse={m === "vacuum" ? run : 0}
        />
      ))}
      {MEDIA.flatMap((m) => (["hammer", "feather"] as ObjectId[]).map((o) => <Prop key={`${o}-${m}`} o={o} m={m} f={f} />))}
      <VacuumPump position={P.pos} rotationY={P.rotY} font={font} pressure={p} running={run} press={press} time={time} hoseTo={[STAGE.columnX.vacuum + 0.66, 0.16, 0.25]} />
      <ControlPanel position={C.pos} rotationY={C.rotY} font={font} lines={lines} cursor={pumping && blink} buttonGlow={[0, 0, Math.max(press, run), 0]} theme={STEEL_PANEL} />
      {cast.map((c) => {
        const st = ACTING(c.name as Member, f);
        return (
          <group key={c.name} position={st.pos}>
            <Actor meta={c.meta} actor={c.actor} clip={st.clip} time={st.time} blend={st.from} expression={st.expression} yaw={st.yaw} />
          </group>
        );
      })}
    </SetStage>
  );
};
