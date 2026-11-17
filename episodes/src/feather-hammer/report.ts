// Report: data table + PASS/FAIL checks + cue sheet. Run: npm run report:feather-hammer
import { createReport } from "../kit/report.ts";
import { captionReadability } from "../kit/captions.ts";
import {
  dropTable,
  FEATHER_VT,
  fmt,
  G,
  H,
  HAMMER,
  HAMMER_VT,
  heightAt,
  integrateFallTime,
  landTime,
} from "./data.ts";
import { MUSIC_RANGE, soundtrack, VOICE_COOLDOWN } from "./sound.ts";
import {
  BEAT,
  CAPTIONS,
  DURATION,
  FEATHER_AIR,
  FPS,
  HAMMER_AIR,
  landFrame,
  landOn,
  propAt,
  releasePoint,
  SLOWMO,
  STAGE,
  timerValue,
  VAC_LAND,
  vacPressure,
  PUMP,
  walkRate,
  RESULT_COUNT_END,
  RESULT_OUTS,
  RESULT_POPS,
} from "./timeline.ts";
import type { Medium, ObjectId } from "./data.ts";

const r = createReport({ fps: FPS });

r.section(`Drop data (H = ${H} m, g = ${G} m/s², simplified quadratic air drag)`);
console.log(
  `hammer: m ${HAMMER.mass} kg, A ${HAMMER.area} m², Cd ${HAMMER.cd} → v_t ${HAMMER_VT.toFixed(1)} m/s · feather: v_t ${FEATHER_VT} m/s (brief)`,
);
const rows = dropTable();
r.table(
  ["object", "medium", "v_t m/s", "t_land s", "shown", "impact m/s", "frames@30"],
  rows.map((x) => [
    x.object,
    x.medium,
    Number.isFinite(x.vt) ? x.vt.toFixed(2) : "∞",
    x.t.toFixed(4),
    `${fmt(x.t)} s`,
    x.impact.toFixed(3),
    (x.t * FPS).toFixed(2),
  ]),
);

r.section("Expectations from the brief");
const tv = Math.sqrt((2 * H) / G);
r.expect(
  `vacuum, both: ${fmt(landTime("hammer", "vacuum"))} s = sqrt(2h/g) (brief 0.78 s)`,
  fmt(landTime("hammer", "vacuum")) === "0.78" &&
    landTime("hammer", "vacuum") === tv &&
    landTime("feather", "vacuum") === tv,
);
r.expect(
  `air, hammer: ${fmt(landTime("hammer", "air"))} s (brief ~0.78 s, drag negligible)`,
  fmt(landTime("hammer", "air")) === "0.78",
);
r.expect(
  `air, feather: ${fmt(landTime("feather", "air"))} s with v_t = ${FEATHER_VT} m/s (computed, used everywhere)`,
  landTime("feather", "air") > 5 * landTime("hammer", "air"),
);

r.section("Checks");
const tol = 1e-3;
r.check(
  "closed form matches a step-by-step integration (< 1 ms) for every drop",
  rows.flatMap((x) => {
    const n = integrateFallTime(x.vt);
    return Math.abs(n - x.t) < tol
      ? []
      : [`${x.object}/${x.medium}: closed ${x.t.toFixed(5)} vs integrated ${n.toFixed(5)}`];
  }),
);
r.check(
  "heights start at H, never rise, and reach 0 exactly at t_land",
  rows.flatMap((x) => {
    const p: string[] = [];
    if (heightAt(x.object, x.medium, 0) !== H) p.push(`${x.object}/${x.medium}: h(0) ≠ H`);
    if (heightAt(x.object, x.medium, x.t) !== 0) p.push(`${x.object}/${x.medium}: h(t_land) ≠ 0`);
    let prev = H;
    for (let t = 0; t <= x.t + 0.1; t += 0.01) {
      const h = heightAt(x.object, x.medium, t);
      if (h > prev + 1e-12) p.push(`${x.object}/${x.medium}: rises at t=${t.toFixed(2)}`);
      prev = h;
    }
    return p;
  }),
);
r.check(
  "data is deterministic (same values on a second call)",
  JSON.stringify(dropTable()) === JSON.stringify(rows) ? [] : ["dropTable() changed between calls"],
);
r.check(
  "episode length is 35-50 s",
  DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`],
);

r.section("Timeline");
const DROPS: [ObjectId, Medium][] = [
  ["hammer", "air"],
  ["feather", "air"],
  ["hammer", "vacuum"],
  ["feather", "vacuum"],
];
r.table(
  ["object", "medium", "land frame", "first frame on floor", "timer stops at", "screen s"],
  DROPS.map(([o, m]) => [o, m, landFrame(o, m).toFixed(2), String(landOn(o, m)), `${fmt(timerValue(o, m, landOn(o, m)))} s`, (landOn(o, m) / FPS).toFixed(2)]),
);
console.log(
  `beats: twist (pump) @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, same-frame landing @${VAC_LAND} = ${((100 * VAC_LAND) / DURATION).toFixed(0)} % · vacuum round at ${SLOWMO}x slow-mo · walk clip played at ${walkRate().toFixed(2)}x to match the path speed`,
);
r.check(
  "vacuum: hammer and feather touch down on the same frame",
  landOn("hammer", "vacuum") === landOn("feather", "vacuum") && propAt("hammer", "vacuum", VAC_LAND - 1).pos[1] === propAt("feather", "vacuum", VAC_LAND - 1).pos[1]
    ? []
    : [`hammer ${landOn("hammer", "vacuum")} vs feather ${landOn("feather", "vacuum")}`],
);
r.check(
  "air: hammer lands long before the feather (on screen, real time)",
  HAMMER_AIR < FEATHER_AIR && FEATHER_AIR - HAMMER_AIR > 5 * FPS ? [] : [`hammer ${HAMMER_AIR}, feather ${FEATHER_AIR}`],
);
r.check(
  "every prop is released exactly H above its tube floor, inside the glass",
  DROPS.flatMap(([o, m]) => {
    const p = releasePoint(o, m);
    const out: string[] = [];
    if (Math.abs(p[1] - STAGE.floorY - H) > 1e-12) out.push(`${o}/${m}: release ${p[1] - STAGE.floorY} m`);
    if (Math.hypot(p[0] - STAGE.columnX[m], p[2]) > 0.45) out.push(`${o}/${m}: outside the glass`);
    return out;
  }),
);
r.check(
  "prop heights on screen = data (h(t) at every frame of both rounds), floor exactly at landing",
  DROPS.flatMap(([o, m]) => {
    const out: string[] = [];
    const drop = m === "air" ? BEAT.dropAir : BEAT.dropVac;
    const rate = m === "air" ? FPS : FPS * SLOWMO;
    for (let f = drop; f <= landOn(o, m) + 5; f++) {
      const want = STAGE.floorY + heightAt(o, m, (f - drop) / rate);
      if (Math.abs(propAt(o, m, f).pos[1] - want) > 1e-12) out.push(`${o}/${m} @${f}`);
    }
    if (propAt(o, m, landOn(o, m)).pos[1] !== STAGE.floorY) out.push(`${o}/${m}: not on the floor at its landing frame`);
    return out;
  }),
);
r.check(
  "stopwatches stop exactly on the landing time and never run past it",
  DROPS.flatMap(([o, m]) => {
    const out: string[] = [];
    if (timerValue(o, m, landOn(o, m)) !== landTime(o, m)) out.push(`${o}/${m}: stops at ${timerValue(o, m, landOn(o, m))}`);
    for (let f = 0; f < DURATION; f++) if (timerValue(o, m, f) > landTime(o, m)) out.push(`${o}/${m} @${f}`);
    return out;
  }),
);
r.check(
  "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
  RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}: done @${p + RESULT_COUNT_END}, first exit @${Math.min(...RESULT_OUTS)}`])),
);
r.check(
  "captions quote the computed landing times",
  CAPTIONS.some((c) => c.text.includes(`${fmt(landTime("feather", "air"))} s`) && c.text.includes(`${fmt(landTime("hammer", "air"))} s`))
    ? []
    : ["no caption shows the air times"],
);
r.check(
  "VACUUM gauge: 1 atm before the pump, falls monotonically, reads exactly 0 when the pump stops",
  (() => {
    const out: string[] = [];
    if (vacPressure(PUMP.on) !== 1) out.push("not 1 atm at pump start");
    if (vacPressure(PUMP.off) !== 0 || vacPressure(BEAT.dropVac) !== 0) out.push("not 0 at pump stop / vacuum drop");
    for (let f = PUMP.on; f < PUMP.off; f++) if (vacPressure(f + 1) > vacPressure(f)) out.push(`rises @${f}`);
    return out;
  })(),
);

r.cueSheet(soundtrack(), { duration: DURATION });
r.audioChecks(soundtrack(), {
  duration: DURATION,
  cooldown: VOICE_COOLDOWN,
  musicRange: MUSIC_RANGE,
});

r.loudness(
  [
    [".feather-hammer-full.wav", "mix"],
    ["feather-hammer.mp4", "final"],
    ["feather-hammer_nomusic.mp4", "final"],
  ],
  "npm run render:feather-hammer",
);
r.check("captions stay up long enough to read (info pill ≥ 1.5 s, chat bubble ≥ 2.2 s)", captionReadability(CAPTIONS));
r.finish();
