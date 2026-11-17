// 3D half of EP04: the game-show studio, the three doors and the two mini stages driven by the seeded rounds,
// the live scoreboard, the two cheer signs and the four actors, all posed from the frame.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Actor } from "../actors/Actor";
import { type CastMember } from "../kit";
import { SetStage, type LoadedSet, type Vec3 } from "../kit/env";
import { CheerSign, GAME_SHOW_LOOK, GameShowStudio, chaseBulbs, sweepSpots, type BulbLevel } from "../sets/game-show-studio";
import { camAt } from "./camera";
import { pct, ROUNDS, type Member } from "./data";
import { ACTING, BEAT, doorsAt, gripAt, MARK, miniAt, MIYU, MONTAGE, ANNA, scoreAt, SIGN_GRIP, signScale, worldTime } from "./timeline";


/** Marquee: chase; the win flashes everything, the duck dims it; the montage chases fast. */
const bulbsAt = (f: number): BulbLevel => {
  if (f >= MIYU.win - 4 && f < MIYU.win + 40) return (_g, i, _n, t) => (Math.floor(t * 12) + i) % 2 ? 1.45 : 0.35;
  if (f >= ANNA.duck - 4 && f < ANNA.duck + 36) return (g, i, n, t) => 0.35 * chaseBulbs(g, i, n, t);
  if (f >= BEAT.montage && f < BEAT.results) return (g, i, n, t) => chaseBulbs(g, i, n, t * 2.2);
  if (f >= BEAT.results && f < BEAT.results + 45) return (_g, i, _n, t) => (Math.floor(t * 10) + i) % 2 ? 1.4 : 0.5;
  return chaseBulbs;
};

/** Spots: sweep, but two heads hold the player on the mark during the slow rounds. */
const spotsAt = (f: number, t: number): Vec3[] => {
  const s = sweepSpots(t);
  if (f >= BEAT.anna && f < BEAT.twist) {
    s[1] = [MARK[0] - 0.15, MARK[1], MARK[2]];
    s[2] = [MARK[0] + 0.15, MARK[1], MARK[2]];
  }
  return s;
};

const Signs: React.FC<{ f: number; font: string }> = ({ f, font }) => (
  <>
    {(["zuzu", "lumi"] as const).map((m) => {
      const k = signScale(m, f);
      if (k <= 0.01) return null;
      const st = ACTING(m, f);
      const g = SIGN_GRIP[m];
      return (
        <group key={m} position={gripAt(st.pos, st.yaw, g)} rotation={[0, st.yaw, 0]} scale={k}>
          {m === "zuzu" ? (
            <CheerSign text="GO GO!" sub="LAB CLUB" font={font} handGap={g.gap} color="#ffcf3f" />
          ) : (
            <CheerSign text={ROUNDS.toLocaleString("en-US")} sub="ROUNDS EACH" font={font} handGap={g.gap} color="#80adf2" />
          )}
        </group>
      );
    })}
  </>
);

export const Scene3D: React.FC<{ cast: CastMember[]; font: string; set: LoadedSet | null }> = ({ cast, font, set }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = worldTime(f);
  const d = doorsAt(f);
  const minis = [miniAt(0, f), miniAt(1, f)];
  const stay = scoreAt("anna", f);
  const sw = scoreAt("miyu", f);
  const inMontage = f >= BEAT.montage;
  return (
    <SetStage width={width} height={height} cam={camAt(f)} look={GAME_SHOW_LOOK}>
      <GameShowStudio
        set={set}
        time={t}
        font={font}
        doors={d.open}
        doorGlow={d.glow}
        prizes={d.prizes}
        miniDoors={minis.map((m) => m.open)}
        miniPrizes={minis.map((m) => m.prizes)}
        shine={Math.max(d.shine, f >= MONTAGE.to ? 1 : 0)}
        bulbs={bulbsAt(f)}
        spots={spotsAt(f, t)}
        ledEnergy={inMontage && f < BEAT.results ? 1 : 0.3}
        scoreboard={{
          title: inMontage ? `ROUND ${stay.n.toLocaleString("en-US")}` : "THREE DOORS",
          cells: [
            { label: "STAY", value: String(stay.wins), color: "#ff8fc6", sub: stay.n ? pct(stay.rate) : "" },
            { label: "SWITCH", value: String(sw.wins), color: "#c4a8ff", sub: sw.n ? pct(sw.rate) : "" },
          ],
        }}
      />
      <Signs f={f} font={font} />
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
