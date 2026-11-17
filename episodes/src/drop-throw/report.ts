// Report: data table + PASS/FAIL checks + cue sheet. Run: npm run report:drop-throw
import { createReport } from "../kit/report.ts";
import {
  ballAt,
  ballTable,
  BALLS,
  fmt,
  G,
  ghostTimes,
  GHOST_DT,
  H,
  integrateLanding,
  launchSpeed,
  landDistance,
  landTime,
  SLOWMO,
  VX,
} from "./data.ts";
import { MUSIC_RANGE, soundtrack, VOICE_COOLDOWN } from "./sound.ts";
import {
  ACTING,
  BEAT,
  ballState,
  CAPTIONS,
  DURATION,
  FPS,
  GHOSTS,
  LAND,
  landFrame,
  landOn,
  RELEASE_POINT,
  releaseGrip,
  releaseHandVelocity,
  REPLAY,
  REPLAY_LAND,
  RESULT_COUNT_END,
  RESULT_OUTS,
  RESULT_POPS,
  timerValue,
  distanceValue,
} from "./timeline.ts";
import { BALL_R } from "./data.ts";

const r = createReport({ fps: FPS });

r.section(`Drop vs throw (h = ${H} m, g = ${G} m/s², horizontal throw ${VX} m/s, no air drag)`);
r.table(
  ["ball", "by", "vx m/s", "t_land s", "shown", "x_land m", "shown", "vy impact m/s", `frames @${SLOWMO}x slow-mo`],
  ballTable().map((b) => [
    b.ball,
    b.owner,
    b.vx.toFixed(2),
    b.t.toFixed(5),
    `${fmt(b.t)} s`,
    b.x.toFixed(5),
    `${fmt(b.x)} m`,
    b.vy.toFixed(3),
    (b.t * FPS * SLOWMO).toFixed(2),
  ]),
);

r.section(`Replay ghosts (every ${GHOST_DT} s) — height is the same for both balls at every sample`);
r.table(
  ["t s", "dropped x", "dropped y", "thrown x", "thrown y", "Δy"],
  ghostTimes("thrown").map((t) => {
    const d = ballAt("dropped", t);
    const w = ballAt("thrown", t);
    return [t.toFixed(4), d.x.toFixed(3), d.y.toFixed(4), w.x.toFixed(3), w.y.toFixed(4), Math.abs(d.y - w.y).toExponential(1)];
  }),
);

r.section("Expectations from the brief");
const T = Math.sqrt((2 * H) / G);
r.expect(
  `both land at t = sqrt(2h/g) = ${fmt(landTime("dropped"))} s / ${fmt(landTime("thrown"))} s (brief 0.64 s)`,
  fmt(landTime("dropped")) === "0.64" && landTime("dropped") === T && landTime("thrown") === T,
);
r.expect(
  `thrown ball lands ${fmt(landDistance("thrown"))} m from the edge (brief 1.92 m)`,
  fmt(landDistance("thrown")) === "1.92",
);
r.expect(`dropped ball lands ${fmt(landDistance("dropped"))} m from the edge (straight down)`, landDistance("dropped") === 0);

r.section("Checks");
r.check(
  "closed form matches a step-by-step integration (< 0.1 ms, < 0.1 mm) for both balls",
  BALLS.flatMap((b) => {
    const n = integrateLanding(b);
    const p: string[] = [];
    if (Math.abs(n.t - landTime(b)) > 1e-4) p.push(`${b}: t ${n.t} vs ${landTime(b)}`);
    if (Math.abs(n.x - landDistance(b)) > 1e-4) p.push(`${b}: x ${n.x} vs ${landDistance(b)}`);
    return p;
  }),
);
r.check(
  "both balls are at the same height at every ghost sample",
  ghostTimes("thrown").flatMap((t) =>
    ballAt("dropped", t).y === ballAt("thrown", t).y ? [] : [`t ${t}: ${ballAt("dropped", t).y} vs ${ballAt("thrown", t).y}`],
  ),
);
r.check(
  "both balls start at h and end on the floor",
  BALLS.flatMap((b) => {
    const p: string[] = [];
    if (ballAt(b, 0).y !== H) p.push(`${b} starts at ${ballAt(b, 0).y}`);
    if (ballAt(b, landTime(b)).y !== 0 && Math.abs(ballAt(b, landTime(b)).y) > 1e-12) p.push(`${b} ends at ${ballAt(b, landTime(b)).y}`);
    return p;
  }),
);
r.check(
  "data is deterministic",
  JSON.stringify(ballTable()) === JSON.stringify(ballTable()) ? [] : ["ballTable() changed between calls"],
);


r.check(
  "episode length is 35-50 s",
  DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`],
);

r.section("Timeline");
r.table(
  ["ball", "release frame", "land frame", "first frame on floor", "timer stops at", "distance shown", "screen s"],
  BALLS.map((b) => [b, String(BEAT.release), landFrame(b).toFixed(2), String(landOn(b)), `${fmt(timerValue(landOn(b)))} s`, `${fmt(b === "thrown" ? distanceValue(landOn(b)) : 0)} m`, (landOn(b) / FPS).toFixed(2)]),
);
console.log(
  `beats: release @${BEAT.release}, same-frame landing @${LAND}, twist (replay) @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, replay landing @${REPLAY_LAND}, reveal @${BEAT.reveal} · ${GHOSTS.length} ghost pairs @ ${GHOSTS.map((g) => g.at).join(", ")}`,
);
r.check(
  "both balls leave the hands on the same frame from exactly h (lowest point) on the edge plumb line",
  BALLS.flatMap((b) => {
    const out: string[] = [];
    const before = ballState(b, BEAT.release - 1);
    const at = ballState(b, BEAT.release);
    if (before.phase !== "hand" || at.phase !== "flight") out.push(`${b}: phases ${before.phase} → ${at.phase}`);
    if (Math.abs(at.pos[1] - BALL_R - H) > 1e-12 || at.pos[0] !== RELEASE_POINT[b][0]) out.push(`${b}: release at ${at.pos.map((v) => v.toFixed(4))}`);
    // the hand carries the ball right up to the release point: the measured grip is within 5 mm of it
    const g = releaseGrip(b);
    const gap = Math.hypot(g[0] - RELEASE_POINT[b][0], g[1] - RELEASE_POINT[b][1], g[2] - RELEASE_POINT[b][2]);
    if (gap > 0.005) out.push(`${b}: grip ${(gap * 1000).toFixed(1)} mm from the release point`);
    // no jump: the ball's first slow-mo step after the release is no bigger than the hand's last step before it
    const step = Math.hypot(before.pos[0] - at.pos[0], before.pos[1] - at.pos[1], before.pos[2] - at.pos[2]);
    if (step > 0.04) out.push(`${b}: jumps ${(step * 100).toFixed(1)} cm on the release frame`);
    return out;
  }),
);
{
  const rows = BALLS.map((b) => {
    const v = releaseHandVelocity(b);
    const h = Math.hypot(v[0], v[2]);
    return { b, v, h, dir: (Math.atan2(v[2], v[0]) * 180) / Math.PI, launch: launchSpeed(b) };
  });
  r.table(
    ["ball", "hand speed at release (m/s, horizontal)", "hand direction vs lane", "hand vertical (m/s)", "launch speed (data)"],
    rows.map((x) => [x.b, x.h.toFixed(2), x.h > 0.05 ? `${x.dir.toFixed(1)}°` : "-", x.v[1].toFixed(2), x.launch.toFixed(2)]),
  );
  r.check(
    "the hands move like the launch: Zuzu's hand is at rest when she lets go, Anna's swing is at ~launch speed along the lane",
    rows.flatMap((x) =>
      x.launch === 0
        ? x.h > 0.05 ? [`${x.b}: hand moving ${x.h.toFixed(2)} m/s at a drop`] : []
        : Math.abs(x.h / x.launch - 1) > 0.15 || Math.abs(x.dir) > 10 ? [`${x.b}: hand ${x.h.toFixed(2)} m/s at ${x.dir.toFixed(1)}° vs ${x.launch} m/s`] : [],
    ),
  );
}
r.check(
  "both balls touch the floor on the same frame",
  landOn("dropped") === landOn("thrown") ? [] : [`dropped ${landOn("dropped")} vs thrown ${landOn("thrown")}`],
);
r.check(
  "ball positions on screen = data at every frame of the drop (x from the edge, lowest point = h(t)); on the floor at landing",
  BALLS.flatMap((b) => {
    const out: string[] = [];
    for (let f = BEAT.release; f <= landOn(b); f++) {
      const s = ballState(b, f);
      const want = ballAt(b, Math.min((f - BEAT.release) / (FPS * SLOWMO), landTime(b)));
      if (Math.abs(s.pos[1] - BALL_R - want.y) > 1e-12 || Math.abs(s.pos[0] - RELEASE_POINT[b][0] - want.x) > 1e-12) out.push(`${b} @${f}`);
    }
    if (ballState(b, landOn(b)).pos[1] !== BALL_R) out.push(`${b}: not on the floor at its landing frame`);
    if (ballState(b, landOn(b) - 1).pos[1] - BALL_R <= 0) out.push(`${b}: already on the floor before its landing frame`);
    return out;
  }),
);
r.check(
  "the replay shows the same drop: positions at replay frame f = live frame f - shift",
  BALLS.flatMap((b) => {
    const out: string[] = [];
    const shift = REPLAY.release - BEAT.release;
    for (let f = REPLAY.cut; f < REPLAY.until; f++) {
      const a = ballState(b, f).pos;
      const l = ballState(b, f - shift).pos;
      if (a.some((v, i) => v !== l[i])) out.push(`${b} @${f}`);
    }
    if (REPLAY_LAND !== landOn(b) + shift) out.push(`${b}: replay landing ${REPLAY_LAND} vs ${landOn(b) + shift}`);
    return out;
  }),
);
r.check(
  "ghosts sit exactly on the replayed path when they appear (same height for both balls)",
  GHOSTS.flatMap((g) => {
    const out: string[] = [];
    if (Math.abs(ballAt("dropped", g.t).y - ballAt("thrown", g.t).y) > 0) out.push(`t ${g.t}`);
    const f = g.at;
    const tf = (f - REPLAY.release) / (FPS * SLOWMO);
    if (tf < g.t - 1e-9 || tf - g.t >= 1 / (FPS * SLOWMO)) out.push(`ghost t ${g.t} appears @${f} (t = ${tf})`);
    return out;
  }),
);
r.check(
  "stopwatch + distance counters stop exactly on the computed values and never run past them",
  (() => {
    const out: string[] = [];
    if (timerValue(LAND) !== landTime("dropped")) out.push(`timer stops at ${timerValue(LAND)}`);
    if (distanceValue(LAND) !== landDistance("thrown")) out.push(`distance stops at ${distanceValue(LAND)}`);
    for (let f = 0; f < DURATION; f++) {
      if (timerValue(f) > landTime("dropped")) out.push(`timer @${f}`);
      if (distanceValue(f) > landDistance("thrown")) out.push(`distance @${f}`);
    }
    return out;
  })(),
);
r.check(
  "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
  RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}: done @${p + RESULT_COUNT_END}, first exit @${Math.min(...RESULT_OUTS)}`])),
);
r.check(
  "captions quote the computed time and distance",
  CAPTIONS.some((c) => c.text.includes(`${fmt(landTime("dropped"))} s`)) && CAPTIONS.some((c) => c.text.includes(`${fmt(landDistance("thrown"))} m`)) ? [] : ["no caption shows 0.64 s / 1.92 m"],
);
r.check(
  "acting: Anna bets confident, shocked on the landing; Zuzu happy, Miyu smug at the reactions; Lumi glints at the reveal",
  (() => {
    const out: string[] = [];
    if (ACTING("anna", BEAT.bets + 30).expression !== "smug") out.push("Anna not confident at the bet");
    if (ACTING("anna", LAND + 10).expression !== "shocked") out.push("Anna not shocked on the landing");
    if (ACTING("anna", BEAT.react + 30).expression !== "shocked") out.push("Anna not shocked at the reactions");
    if (ACTING("zuzu", BEAT.react + 30).expression !== "happy") out.push("Zuzu not happy at the reactions");
    if (ACTING("miyu", BEAT.react + 60).expression !== "smug") out.push("Miyu not smug at the reactions");
    if (ACTING("lumi", BEAT.reveal + 60).expression !== "glint") out.push("Lumi no glint at the reveal");
    if (ACTING("zuzu", BEAT.release - 1).clip !== "hold_drop" || ACTING("anna", BEAT.release - 1).clip !== "throw") out.push("release clips");
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
    [".drop-throw-full.wav", "mix"],
    ["drop-throw.mp4", "final"],
    ["drop-throw_nomusic.mp4", "final"],
  ],
  "npm run render:drop-throw",
);
r.finish();
