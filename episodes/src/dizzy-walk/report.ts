// Report: data table + PASS/FAIL checks, timeline checks and the cue sheet.
// Run: npm run report:dizzy-walk
import { createReport } from "../kit/report.ts";
import { captionReadability } from "../kit/captions.ts";
import { project } from "../kit/camera.ts";
import { SAFE } from "../kit/theme.ts";
import { TILE } from "../sets/night-plaza/layout.ts";
import { camAt, CUTS } from "./camera.ts";
import { CTA_GROUP, MUSIC_RANGE, soundtrack, VOICE_COOLDOWN, VOICE_MAX, VOICE_MIN_GAP } from "./sound.ts";
import {
  ACTING,
  BEAT,
  CAPTIONS,
  DURATION,
  done,
  FPS,
  ghostScale,
  lumiPos,
  OOPS_STEP,
  PANEL_A,
  PANEL_B,
  realStepS,
  RESULT_COUNT_END,
  RESULT_OUTS,
  RESULT_POPS,
  ringRadiusTiles,
  RUN,
  RUN_END,
  runAt,
  speedUp,
  tapesAt,
  walkAt,
  walkStepEnd,
  WALK,
  WALK_END,
  WALK_SPEED,
  WATCH,
  world,
  ZUZU,
  zuzuPos,
  ZUZU_END,
} from "./timeline.ts";
import {
  DIRS,
  dist,
  dist2,
  FINAL,
  ghostMean,
  ghostRms,
  ghosts,
  GHOSTS,
  GHOST_SEED0,
  insideCircle,
  lumiAt,
  lumiDist,
  ORDER,
  reversals,
  SEED_NOTE,
  STEPS,
  theoryRms,
  tiles,
  walk,
  zuzu,
  zuzuDist,
  ZUZU_SEED,
} from "./data.ts";

const r = createReport({ fps: FPS });
const W = 1080;
const H = 1920;
const PANEL_TOP = 1322;

// ---------------------------------------------------------------- data

r.section(`2D lattice random walk: ${STEPS} steps, N/E/S/W with p = 1/4 each, ${GHOSTS} ghost walks (${SEED_NOTE})`);
r.table(
  ["n", "Zuzu tile", "Zuzu dist", "Lumi dist", "ghosts RMS", "√n", "ghosts mean", "√(πn/4)", "inside √n ring"],
  [0, 1, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => [
    n,
    `(${zuzu().pos[n].join(", ")})`,
    zuzuDist(n).toFixed(3),
    lumiDist(n),
    ghostRms(n).toFixed(3),
    theoryRms(n).toFixed(3),
    ghostMean(n).toFixed(3),
    Math.sqrt((Math.PI * n) / 4).toFixed(3),
    n ? `${insideCircle(n)}/${GHOSTS}` : "-",
  ]),
);
const zf = zuzu().pos[STEPS];
console.log(`Zuzu's walk (seed ${ZUZU_SEED}): ends on tile (${zf.join(", ")}) → √(${zf[0]}² + ${zf[1]}²) = √${dist2(zf)} = ${FINAL.zuzu().toFixed(4)} tiles (shown "${tiles(FINAL.zuzu())}")`);
console.log(`Zuzu's directions: ${[0, 1, 2, 3].map((d) => `${"ENWS"[d]} ${zuzu().dirs.filter((x) => x === d).length}`).join(", ")}; straight back ${reversals().length} times (first at step ${OOPS_STEP})`);
console.log(`ghost endpoints R² (seeds ${GHOST_SEED0}..${GHOST_SEED0 + GHOSTS - 1}): ${ghosts().map((g) => dist2(g.pos[STEPS])).join(" ")}`);
console.log(`ghosts: mean R² = ${(ghostRms(STEPS) ** 2).toFixed(2)} (theory ${STEPS}), RMS = ${ghostRms(STEPS).toFixed(4)} (shown "${tiles(FINAL.ghosts())}"), theory √${STEPS} = ${FINAL.theory}`);
console.log(`farthest ghost ${Math.max(...ghosts().map((g) => dist(g.pos[STEPS]))).toFixed(2)} tiles, nearest ${Math.min(...ghosts().map((g) => dist(g.pos[STEPS]))).toFixed(2)}; inside the √${STEPS} ring at the end: ${insideCircle(STEPS)}/${GHOSTS} (Gaussian limit 1 − 1/e = 63.2 %)`);

r.section("Expectations from the brief");
r.expect(`${STEPS} steps, ${GHOSTS} ghosts, 4 directions at 1/4 (brief 100 / 50 / equal probability)`, STEPS === 100 && GHOSTS === 50 && DIRS.length === 4);
r.expect(`Lumi walks ${STEPS} tiles straight: ${FINAL.lumi()} (brief 100)`, FINAL.lumi() === 100);
r.expect(`theory RMS = √${STEPS} = ${FINAL.theory} (brief 10)`, FINAL.theory === 10);
r.expect(`Zuzu's exact final distance printed and shown: ${FINAL.zuzu().toFixed(4)} → "${tiles(FINAL.zuzu())}"`, Number.isFinite(FINAL.zuzu()));
r.expect(`the ghosts' exact RMS printed and shown: ${FINAL.ghosts().toFixed(4)} → "${tiles(FINAL.ghosts())}"`, Number.isFinite(FINAL.ghosts()));

r.section("Checks (math)");
const all = [zuzu(), ...ghosts()];
r.check(
  "every step moves exactly one tile N, E, S or W; positions are the running sum of the steps",
  all.flatMap((w) => w.pos.slice(1).flatMap((p, i) => (Math.abs(p[0] - w.pos[i][0]) + Math.abs(p[1] - w.pos[i][1]) === 1 && p[0] - w.pos[i][0] === DIRS[w.dirs[i]][0] && p[1] - w.pos[i][1] === DIRS[w.dirs[i]][1] ? [] : [`seed ${w.seed} step ${i + 1}`]))).slice(0, 5),
);
{
  const counts = [0, 1, 2, 3].map((d) => all.reduce((s, w) => s + w.dirs.filter((x) => x === d).length, 0));
  const n = all.length * STEPS;
  const chi = counts.reduce((s, c) => s + (c - n / 4) ** 2 / (n / 4), 0);
  r.check(`direction draws are fair: ${counts.join(" / ")} of ${n} (χ² ${chi.toFixed(2)}, 3 dof, < 11.34 = p 0.01)`, chi < 11.34 ? [] : [`χ² ${chi.toFixed(2)}`]);
}
r.check(
  "theory: E[R²] = n exactly (every one of the 4ⁿ paths enumerated, n = 1..7)",
  [1, 2, 3, 4, 5, 6, 7].flatMap((n) => {
    let sum = 0;
    for (let code = 0; code < 4 ** n; code++) {
      let x = 0;
      let y = 0;
      for (let k = 0, c = code; k < n; k++, c >>= 2) {
        x += DIRS[c & 3][0];
        y += DIRS[c & 3][1];
      }
      sum += x * x + y * y;
    }
    return sum / 4 ** n === n ? [] : [`n ${n}: ${sum / 4 ** n}`];
  }),
);
{
  // R² of one walk has mean n and (for large n) sd ≈ n; the mean of 50 has sd ≈ n/√50
  const mean = ghostRms(STEPS) ** 2;
  const z = (mean - STEPS) / (STEPS / Math.sqrt(GHOSTS));
  r.check(`ghosts' mean R² ${mean.toFixed(1)} is consistent with n = ${STEPS} (z ${z.toFixed(2)}, |z| < 3)`, Math.abs(z) < 3 ? [] : [`z ${z.toFixed(2)}`]);
}
r.check("Lumi: distance = steps, every step", Array.from({ length: STEPS + 1 }, (_, n) => n).flatMap((n) => (lumiDist(n) === n ? [] : [`n ${n}`])));
r.check("data is deterministic (same seed, same walk)", JSON.stringify(walk(ZUZU_SEED)) === JSON.stringify(zuzu()) ? [] : ["zuzu() changed"]);
r.check(
  "on-screen numbers use one rounding (1 decimal) and match the data",
  [
    tiles(FINAL.zuzu()) === (Math.round(FINAL.zuzu() * 10) / 10).toFixed(1) ? "" : "zuzu",
    tiles(FINAL.ghosts()) === (Math.round(FINAL.ghosts() * 10) / 10).toFixed(1) ? "" : "ghosts",
    CAPTIONS.some((c) => c.text.includes(tiles(FINAL.zuzu())) && c.text.includes(String(FINAL.lumi()))) ? "" : "measure caption",
    CAPTIONS.some((c) => c.text.includes(tiles(FINAL.ghosts()))) ? "" : "RMS caption",
    CAPTIONS.some((c) => c.text.includes(`${reversals().length} of her steps`)) ? "" : "reversal caption",
  ].filter(Boolean),
);

r.section("Checks (what is drawn = the data)");
r.check(
  "walkers stand on the data's tiles: at every completed step Zuzu is on her tile centre and Lumi on (2, n)",
  Array.from({ length: STEPS + 1 }, (_, k) => k).flatMap((k) => {
    const f = walkStepEnd(k);
    const z = zuzuPos(f);
    const zt = world(zuzu().pos[k]);
    const l = lumiPos(f);
    const lt = world(lumiAt(k));
    return Math.hypot(z[0] - zt[0], z[2] - zt[2]) < 1e-6 && Math.hypot(l[0] - lt[0], l[2] - lt[2]) < 1e-6 ? [] : [`step ${k}`];
  }).slice(0, 5),
);
r.check(
  "acting follows the walk: Zuzu's and Lumi's actors are where the trails' heads are (every walk frame)",
  (() => {
    const out: string[] = [];
    for (let f = BEAT.walk; f < BEAT.walkEnd; f++) {
      const a = ACTING("zuzu", f).pos;
      const b = zuzuPos(f);
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) > 1e-6) out.push(`zuzu @${f}`);
      const c = ACTING("lumi", f).pos;
      const d = lumiPos(f);
      if (Math.hypot(c[0] - d[0], c[2] - d[2]) > 1e-6) out.push(`lumi @${f}`);
    }
    return out.slice(0, 5);
  })(),
);
r.check(
  "the walk clip advances with the distance walked (feet planted at any time-lapse speed)",
  (["zuzu", "lumi"] as const).flatMap((m) => {
    const a = ACTING(m, BEAT.walk + 50);
    const b = ACTING(m, BEAT.walk + 51);
    const dClip = b.time - a.time;
    const dDist = Math.hypot(b.pos[0] - a.pos[0], b.pos[2] - a.pos[2]);
    return Math.abs(dClip * WALK_SPEED[m] - dDist) < 1e-6 ? [] : [`${m}: ${dClip.toFixed(3)} s clip for ${dDist.toFixed(3)} m`];
  }),
);
r.check(
  "Zuzu and Lumi never collide (≥ 0.55 m apart at every walk frame)",
  (() => {
    const out: string[] = [];
    for (let f = BEAT.go; f < BEAT.walkEnd + 1; f++) {
      const a = zuzuPos(f);
      const b = lumiPos(f);
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.55) out.push(`@${f}: ${Math.hypot(a[0] - b[0], a[2] - b[2]).toFixed(2)} m`);
    }
    return out.slice(0, 5);
  })(),
);
r.check(
  "the watchers stand clear of Zuzu's walk (≥ 0.6 m from every tile she visits)",
  (["anna", "miyu"] as const).flatMap((m) => {
    const d = Math.min(...zuzu().pos.map((p) => Math.hypot(world(p)[0] - WATCH[m][0], world(p)[2] - WATCH[m][2])));
    return d >= 0.6 ? [] : [`${m}: ${d.toFixed(2)} m`];
  }),
);
r.check(
  `tapes measure the data: Lumi's ${FINAL.lumi()} tiles, Zuzu's ${tiles(FINAL.zuzu())} tiles (full length, straight from the start)`,
  (() => {
    const t = tapesAt(BEAT.drone + 60);
    const len = (x: (typeof t)[number]) => Math.hypot(x.to[0] - x.from[0], x.to[2] - x.from[2]) / TILE;
    const cu = tapesAt(BEAT.twist - 2)[0];
    return [
      Math.abs(len(t[0]) - FINAL.lumi()) < 1e-9 && t[0].progress === 1 ? "" : `Lumi's tape ${len(t[0])}`,
      Math.abs(len(t[1]) - FINAL.zuzu()) < 1e-9 && t[1].progress === 1 ? "" : `Zuzu's tape ${len(t[1])}`,
      Math.abs(len(cu) - FINAL.zuzu()) < 1e-9 && cu.progress === 1 ? "" : "close-up tape",
      cu.from.every((v) => v === 0) ? "" : "close-up tape not from the start",
    ].filter(Boolean);
  })(),
);
r.check(
  `ghosts: all ${GHOSTS} visible for the run and on their data tiles at every whole step; the ring radius is √n tiles`,
  (() => {
    const out: string[] = [];
    for (let k = 0; k <= STEPS; k++) {
      const f = Math.min(RUN_END, Math.ceil(RUN.start + RUN.dur * (k / STEPS) ** (1 / RUN.accel)));
      const s = runAt(f);
      if (done(s) < k) out.push(`step ${k} not done @${f}`);
      if (Math.abs(ringRadiusTiles(f) - Math.sqrt(s)) > 1e-9) out.push(`ring @${f}`);
    }
    for (let k = 0; k < GHOSTS; k++) if (ghostScale(k, RUN.start) < 1 - 1e-9) out.push(`ghost ${k} not popped by the run`);
    return out.slice(0, 5);
  })(),
);

r.section("Checks (timeline + framing)");
console.log(
  `beats: spin @${BEAT.spin}, GO @${BEAT.go}, walk ${WALK.start}-${WALK_END} (${((WALK_END - WALK.start) / FPS).toFixed(1)} s), drone @${BEAT.drone}, tape @${BEAT.tape}, twist @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, ghost run ${RUN.start}-${RUN_END}, results @${BEAT.results}, reveal @${BEAT.reveal}, CTA @${BEAT.cta}, end ${(DURATION / FPS).toFixed(1)} s`,
);
console.log(`time-lapse: real step ${realStepS.toFixed(2)} s; step 1 ×${speedUp(1).toFixed(1)}, step 10 ×${speedUp(10).toFixed(1)}, step 50 ×${speedUp(50).toFixed(1)}, step 100 ×${speedUp(100).toFixed(1)} (labelled FAST-FORWARD)`);
r.check("episode length is 35-50 s", DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`]);
r.check("the twist sits at ~60 % (55-65 %)", BEAT.twist / DURATION >= 0.55 && BEAT.twist / DURATION <= 0.65 ? [] : [`${((100 * BEAT.twist) / DURATION).toFixed(1)} %`]);
r.check(
  "step counters never go back, read 0 at the start and exactly 100 at the end, and the final values hold ≥ 1 s on the panel",
  (() => {
    const out: string[] = [];
    for (let f = 1; f < DURATION; f++) {
      if (walkAt(f) < walkAt(f - 1)) out.push(`walk @${f}`);
      if (runAt(f) < runAt(f - 1)) out.push(`run @${f}`);
    }
    if (done(walkAt(WALK.start)) !== 0 || done(walkAt(WALK_END)) !== STEPS || done(walkAt(WALK_END - 1)) >= STEPS) out.push("walk ends");
    if (done(runAt(RUN.start)) !== 0 || done(runAt(RUN_END)) !== STEPS) out.push("run ends");
    if (PANEL_A.to - WALK_END < FPS) out.push("panel A hold");
    if (PANEL_B.to - RUN_END < FPS) out.push("panel B hold");
    return out;
  })(),
);
const onScreen = (f: number, p: [number, number, number], top = SAFE.top, bottom = SAFE.bottom) => {
  const q = project(camAt(f), p, W, H);
  return q.visible && q.x >= SAFE.side && q.x <= W - SAFE.side && q.y >= top && q.y <= bottom;
};
const panelOn = (f: number) => (f >= PANEL_A.from && f <= PANEL_A.to + 14) || (f >= PANEL_B.from && f <= PANEL_B.to + 14);
r.check(
  "Zuzu is in frame (head and feet, above the panel) for the whole walk",
  (() => {
    const out: string[] = [];
    for (let f = BEAT.go; f < BEAT.drone; f++) {
      const p = ACTING("zuzu", f).pos;
      const bottom = panelOn(f) ? PANEL_TOP : SAFE.bottom;
      if (!onScreen(f, p, SAFE.top, bottom) || !onScreen(f, [p[0], 1.0, p[2]], SAFE.top, bottom)) out.push(`@${f}`);
    }
    return out.slice(0, 5);
  })(),
);
r.check(
  "drone shot: Lumi at tile 100, Zuzu at her last tile and the start ring are all inside the safe area",
  (() => {
    const out: string[] = [];
    for (let f = CUTS.drone; f < CUTS.tape; f++)
      for (const [k, p] of [
        ["Lumi", world(lumiAt(STEPS))],
        ["Zuzu", ZUZU_END],
        ["start", [0, 0, 0]],
      ] as [string, [number, number, number]][])
        if (!onScreen(f, p, SAFE.top + 120)) out.push(`${k} @${f}`);
    return out.slice(0, 5);
  })(),
);
r.check(
  "ghost run: at least 45 of 50 ghosts and the whole √n ring are on screen above the panel at the end",
  (() => {
    const f = RUN_END + 10;
    const n = ghosts().filter((g) => onScreen(f, world(g.pos[STEPS]), SAFE.top, PANEL_TOP)).length;
    const R = Math.sqrt(STEPS) * TILE;
    const ring = Array.from({ length: 24 }, (_, i) => (i / 24) * 2 * Math.PI).every((a) => onScreen(f, [R * Math.cos(a), 0, R * Math.sin(a)], SAFE.top + 120, PANEL_TOP));
    return [n >= 45 ? "" : `${n}/50 on screen`, ring ? "" : "ring cut"].filter(Boolean);
  })(),
);
const heightPx = (f: number, m: (typeof ORDER)[number]) => {
  const p = ACTING(m, f).pos;
  const a = project(camAt(f), p, W, H);
  const b = project(camAt(f), [p[0], p[1] + 1.0, p[2]], W, H);
  return Math.abs(a.y - b.y);
};
r.check(
  "key beats: the mascots in the shot are ≥ 1/5 frame tall (384 px) and inside the frame (body centre and head)",
  (
    [
      [BEAT.spin + 30, ["zuzu", "anna"]],
      [BEAT.bets + 30, ["anna", "zuzu"]],
      [BEAT.miyuBet + 30, ["miyu"]],
      [WALK.start + 10, ["zuzu", "lumi"]],
      [BEAT.tape + 40, ["zuzu", "miyu"]],
      [BEAT.results + 30, ["miyu", "anna", "zuzu", "lumi"]],
      [BEAT.reveal + 60, ["lumi"]],
      [BEAT.cta + 30, ["miyu", "anna", "zuzu", "lumi"]],
    ] as [number, (typeof ORDER)[number][]][]
  ).flatMap(([f, ms]) =>
    ms.flatMap((m) => {
      const p = ACTING(m, f).pos;
      const mid = project(camAt(f), [p[0], 0.5, p[2]], W, H);
      const head = project(camAt(f), [p[0], 1.0, p[2]], W, H);
      const inside = [mid, head].every((q) => q.visible && q.x >= SAFE.side + 60 && q.x <= W - SAFE.side - 60 && q.y >= 0 && q.y <= H);
      return [heightPx(f, m) >= 384 ? "" : `${m} @${f}: ${heightPx(f, m).toFixed(0)} px`, inside ? "" : `${m} @${f}: out of frame`].filter(Boolean);
    }),
  ),
);
r.check(
  "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
  RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}`])),
);
r.check(
  "acting: Anna spins Zuzu (push_hands) and bets smug, shocked at the results; Zuzu dizzy on the walk; Miyu points + squints with the tape; Lumi glints; nobody sleeps",
  (() => {
    const out: string[] = [];
    if (ACTING("anna", BEAT.spin + 10).clip !== "push_hands") out.push("Anna spin");
    if (ACTING("anna", BEAT.bets + 20).expression !== "smug") out.push("Anna bet");
    if (ACTING("anna", BEAT.results + 10).expression !== "shocked") out.push("Anna shocked");
    if (ACTING("zuzu", WALK.start + 100).clip !== "walk" || ACTING("zuzu", WALK.start + 100).expression !== "dizzy" || !ACTING("zuzu", WALK.start + 100).symbols.some((s) => s.kind === "spiral")) out.push("Zuzu walk");
    if (ACTING("lumi", WALK.start + 100).clip !== "walk" || ACTING("lumi", WALK.start + 100).expression !== "neutral") out.push("Lumi walk");
    if (ACTING("miyu", BEAT.tape + 20).clip !== "point" || ACTING("miyu", BEAT.tape + 20).expression !== "squint") out.push("Miyu measures");
    if (ACTING("lumi", BEAT.reveal + 60).expression !== "glint") out.push("Lumi glint");
    if (ACTING("zuzu", ZUZU.oops + 5).symbols.every((s) => s.kind !== "sweat")) out.push("Zuzu oops");
    for (let f = 0; f < DURATION; f++) if (ORDER.some((m) => ACTING(m, f).clip === "sleep_stand" || ACTING(m, f).symbols.some((s) => s.kind === "zzz"))) { out.push(`sleep @${f}`); break; }
    return out;
  })(),
);
r.check(
  `voices stay sparse: ≤ ${VOICE_MAX} single reactions, ≥ ${(VOICE_MIN_GAP / FPS).toFixed(1)} s apart (the CTA group cheer excepted)`,
  (() => {
    const v = soundtrack().cues.filter((x) => x.layer === "voice" && x.group !== CTA_GROUP);
    const out: string[] = v.length > VOICE_MAX ? [`${v.length} voices`] : [];
    for (let i = 1; i < v.length; i++) if (v[i].at - v[i - 1].at < VOICE_MIN_GAP) out.push(`${v[i - 1].label} → ${v[i].label}: ${v[i].at - v[i - 1].at} f`);
    return out;
  })(),
);

r.cueSheet(soundtrack(), { duration: DURATION });
r.audioChecks(soundtrack(), { duration: DURATION, cooldown: VOICE_COOLDOWN, musicRange: MUSIC_RANGE });
r.loudness(
  [
    [".dizzy-walk-full.wav", "mix"],
    ["dizzy-walk.mp4", "final"],
    ["dizzy-walk_nomusic.mp4", "final"],
  ],
  "npm run render:dizzy-walk",
);
r.check("captions stay up long enough to read (info pill ≥ 1.5 s, chat bubble ≥ 2.2 s)", captionReadability(CAPTIONS));
r.finish();

