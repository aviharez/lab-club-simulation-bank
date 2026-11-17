// Report: data table + PASS/FAIL checks (+ timeline checks and the cue sheet once the episode is animated).
// Run: npm run report:galton-board
import { createReport } from "../kit/report.ts";
import { captionReadability } from "../kit/captions.ts";
import { ARCADE, ballPath, contactPoint, overlayHeight, PATH_SEGMENTS, STACK, stackHeight, stackPos } from "../sets/probability-arcade/layout.ts";
import { project } from "../kit/camera.ts";
import { BOARD_SHOTS, boardShotAt, camAt } from "./camera.ts";
import { ballsAt, counterAt, curveAt, FAN_SIZE, pathsAt, pathsInto } from "./board.ts";
import { CTA_GROUP, MUSIC_RANGE, soundtrack, VOICE_COOLDOWN, VOICE_MIN_GAP } from "./sound.ts";
import { ACTING, ANNA, ANNA_BALL, ANNA_LAND, BEAT, CAPTIONS, CHART, DURATION, FLIGHTS, FPS, landedAt, MIYU, PATHS, POUR, RESULT_COUNT_END, RESULT_OUTS, RESULT_POPS, SLOW_BALLS } from "./timeline.ts";
import { fitCam, occluders, regionOnScreen } from "../sets/probability-arcade/boardShots.ts";
import { BALLS, balls, BET, BINS, choose, counts, countsAfter, int, ORDER, MEAN, normalCount, odds, P_RIGHT, pct, ROWS, SD, SEED_NOTE, simulate, theoryCount, theoryP } from "./data.ts";

const r = createReport({ fps: 30 });
const c = counts();
const M = ARCADE.machine;

r.section(`Galton board: ${int(BALLS)} balls, ${ROWS} rows of pegs, ${BINS} bins, p(right) = ${P_RIGHT} (${SEED_NOTE})`);
r.table(
  ["bin", "C(12,k)", "theory P", "expected", "ACTUAL", "actual %", "diff", "z"],
  c.map((n, k) => {
    const p = theoryP(k);
    const e = theoryCount(k);
    const sd = Math.sqrt(BALLS * p * (1 - p));
    return [k, choose(ROWS, k), p.toFixed(5), e.toFixed(2), n, pct(n / BALLS), (n - e).toFixed(2), ((n - e) / sd).toFixed(2)];
  }),
);
const rights = balls().reduce((s, b) => s + b.bin, 0);
const mean = rights / BALLS;
const sdAct = Math.sqrt(balls().reduce((s, b) => s + (b.bin - mean) ** 2, 0) / BALLS);
console.log(`peg draws: ${int(BALLS * ROWS)} bounces, ${int(rights)} right = ${pct(rights / (BALLS * ROWS))}`);
console.log(`landing bin: mean ${mean.toFixed(3)} (theory ${MEAN}), sd ${sdAct.toFixed(3)} (theory √3 = ${SD.toFixed(3)})`);
const edges = balls().filter((b) => b.bin === 0 || b.bin === ROWS);
console.log(`edge-bin balls (pour order): ${edges.map((b) => `#${b.i + 1} → bin ${b.bin}`).join(", ") || "none"}`);
console.log(`first 10 balls (the slow ones): bins ${balls().slice(0, 10).map((b) => b.bin).join(", ")}`);

r.section("Expectations from the brief");
r.expect(`${int(BALLS)} balls, ${ROWS} rows, ${BINS} bins, p = 0.5 (brief 1,000 / 12 / 13 / 0.5)`, BALLS === 1000 && ROWS === 12 && BINS === 13 && P_RIGHT === 0.5);
r.expect(`centre bin theory C(12,6)/4096 = ${choose(12, 6)}/4096 = ${pct(theoryP(6))} ≈ ${Math.round(theoryCount(6))} balls (brief 22.6%, ~226)`, pct(theoryP(6)) === "22.6%" && Math.round(theoryCount(6)) === 226);
r.expect(`outer bins theory 1/4096 = ${odds(theoryP(0))} = ${theoryCount(0).toFixed(2)} balls (brief ~0.24)`, theoryP(0) === 1 / 4096 && theoryCount(0).toFixed(2) === "0.24" && theoryP(12) === theoryP(0));
r.expect(`Zuzu's bin ${BET.zuzu} (centre) is the tallest: ACTUAL ${c[BET.zuzu]} (max ${Math.max(...c)})`, c[BET.zuzu] === Math.max(...c));
// the brief expected Anna's bin to stay empty; the honest seed puts one ball there (theory 0.24 balls, so 1 is normal).
// The seed is not tuned: beat 3 shows the lone ball and the centre towering over it instead.
r.expect(`Anna's bin ${BET.anna} (far left) is nearly empty: ACTUAL ${c[BET.anna]} vs theory ${theoryCount(BET.anna).toFixed(2)} (brief "stays empty"; the honest seed gives 1, shown on screen)`, c[BET.anna] <= 2);

r.section("Checks");
r.check(
  "every ball: 12 bounces, bin = number of rights, counts add up to the pour",
  [
    ...balls().filter((b) => b.steps.length !== ROWS || b.bin !== b.steps.reduce<number>((s, x) => s + x, 0)).map((b) => `#${b.i + 1}`),
    ...(c.reduce((s, n) => s + n, 0) === BALLS ? [] : ["sum"]),
  ].slice(0, 5),
);
r.check(
  "stacking slots: each bin's balls take slots 0..n-1 in landing order",
  c.flatMap((n, k) => {
    const s = balls().filter((b) => b.bin === k).map((b) => b.slot);
    return s.every((x, j) => x === j) && s.length === n ? [] : [`bin ${k}`];
  }),
);
r.check(
  `peg draws are fair: rights within 3 sd of 50% (z ${((rights - BALLS * ROWS * 0.5) / Math.sqrt(BALLS * ROWS * 0.25)).toFixed(2)})`,
  Math.abs(rights - BALLS * ROWS * 0.5) <= 3 * Math.sqrt(BALLS * ROWS * 0.25) ? [] : ["biased"],
);
{
  // chi-square goodness of fit; pool the tails so every expected count is ≥ 5 (bins 0-2 and 10-12)
  const groups = [[0, 1, 2], [3], [4], [5], [6], [7], [8], [9], [10, 11, 12]];
  const chi = groups.reduce((s, g) => {
    const o = g.reduce((a, k) => a + c[k], 0);
    const e = g.reduce((a, k) => a + theoryCount(k), 0);
    return s + (o - e) ** 2 / e;
  }, 0);
  r.check(`counts fit the binomial (χ² ${chi.toFixed(2)}, 8 dof, < 20.09 = p 0.01)`, chi < 20.09 ? [] : [`χ² ${chi.toFixed(2)}`]);
}
r.check("data is deterministic (same seed, same pour)", JSON.stringify(simulate()) === JSON.stringify(balls()) ? [] : ["balls() changed"]);

r.section("Machine geometry (set layout)");
console.log(`pegs: ${ROWS} rows, pitch ${M.pitch} m, row spacing ${M.rowDy} m; bins ${M.binH} m tall, ${(M.pitch - M.divider).toFixed(3)} m wide; ball r ${M.ballR} m`);
console.log(`tallest stack: bin ${c.indexOf(Math.max(...c))}, ${Math.max(...c)} balls = ${stackHeight(Math.max(...c)).toFixed(3)} m of ${M.binH} m`);
r.check("every stack fits inside its bin", c.flatMap((n, k) => (stackHeight(n) <= M.binH - 0.02 ? [] : [`bin ${k}: ${stackHeight(n).toFixed(3)} m`])));
r.check(
  "stacked balls sit inside their bin walls",
  balls().flatMap((b) => {
    const p = stackPos(b.bin, b.slot);
    const half = (M.pitch - M.divider) / 2 - M.ballR;
    return Math.abs(p[0] - M.binX(b.bin)) <= half + 1e-9 ? [] : [`#${b.i + 1}`];
  }).slice(0, 5),
);
r.check(
  "animated path follows the data: touches peg (row i, rights so far) at u = i + 1, ends on its stack slot, stays inside the board",
  balls().slice(0, 200).flatMap((b) => {
    const out: string[] = [];
    let rr = 0;
    for (let i = 0; i < ROWS; i++) {
      const p = ballPath(b.steps, stackPos(b.bin, b.slot), i + 1);
      const q = contactPoint(i, rr);
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9) out.push(`#${b.i + 1} row ${i}`);
      rr += b.steps[i];
    }
    const end = ballPath(b.steps, stackPos(b.bin, b.slot), PATH_SEGMENTS);
    const s = stackPos(b.bin, b.slot);
    if (Math.hypot(end[0] - s[0], end[1] - s[1]) > 1e-9) out.push(`#${b.i + 1} end`);
    for (let u = 0; u <= PATH_SEGMENTS; u += 0.05) if (Math.abs(ballPath(b.steps, s, u)[0]) > M.halfW - M.ballR) out.push(`#${b.i + 1} outside @${u.toFixed(2)}`);
    return out;
  }).slice(0, 5),
);

r.check(
  "no ball passes through a peg, a bin divider or a ball already stacked (every path, sampled every 0.01 segment)",
  (() => {
    const out: string[] = [];
    const EPS = 1e-6;
    for (const b of balls()) {
      const slot = stackPos(b.bin, b.slot);
      const below = Array.from({ length: b.slot }, (_, s) => stackPos(b.bin, s));
      for (let u = 0; u <= PATH_SEGMENTS + 1e-9 && out.length < 5; u += 0.01) {
        const p = ballPath(b.steps, slot, u);
        for (let i = 0; i < M.rows; i++)
          for (let j = 0; j <= i; j++)
            if (Math.hypot(p[0] - M.pegX(i, j), p[1] - M.pegY(i)) < M.pegR + M.ballR - EPS) out.push(`#${b.i + 1} peg ${i},${j} @${u.toFixed(2)}`);
        for (let k = 0; k <= M.bins; k++) {
          const x = M.binX(0) - M.pitch / 2 + k * M.pitch;
          const d = Math.hypot(Math.max(0, Math.abs(p[0] - x) - M.divider / 2), Math.max(0, p[1] - (M.binY0 + M.binH)));
          if (d < M.ballR - EPS) out.push(`#${b.i + 1} divider ${k} @${u.toFixed(2)}`);
        }
        if (u > PATH_SEGMENTS - 1) for (const q of below) if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 2 * M.ballR - EPS) out.push(`#${b.i + 1} stacked ball @${u.toFixed(2)}`);
      }
      if (out.length >= 5) break;
    }
    return out.slice(0, 5);
  })(),
);

r.section("Bell curve (the twist overlay)");
console.log(`normal curve: mean ${MEAN}, sd √3 = ${SD.toFixed(3)} (the binomial's own mean and sd), scaled to ${int(BALLS)} balls × bin width 1`);
r.table(
  ["bin", "exact binomial", "normal curve", "diff", "overlay h (m)", "actual stack h (m)"],
  c.map((n, k) => [k, theoryCount(k).toFixed(2), normalCount(k).toFixed(2), (normalCount(k) - theoryCount(k)).toFixed(2), overlayHeight(normalCount(k)).toFixed(3), stackHeight(n).toFixed(3)]),
);
r.check(
  "overlay uses the stacks' height scale: overlayHeight(actual count) is within one row of the real stack, every bin",
  c.flatMap((n, k) => (Math.abs(overlayHeight(n) - stackHeight(n)) <= STACK.rowH + 1e-9 ? [] : [`bin ${k}: ${overlayHeight(n).toFixed(3)} vs ${stackHeight(n).toFixed(3)}`])),
);
r.check(
  "the normal curve is a close fit to the exact binomial (|diff| < 2% of the pour in every bin)",
  c.flatMap((_, k) => (Math.abs(normalCount(k) - theoryCount(k)) < 0.02 * BALLS ? [] : [`bin ${k}`])),
);
r.check("the overlay peak fits inside the bins", overlayHeight(normalCount(MEAN)) <= M.binH - 0.02 ? [] : [`${overlayHeight(normalCount(MEAN)).toFixed(3)} m`]);

r.section("Timeline");
console.log(
  `beats: bets @${BEAT.bets}, slow balls @${POUR.first}, fast-forward @${POUR.fast}, ball #${ANNA_BALL + 1} lands @${ANNA_LAND}, last ball @${POUR.end}, twist @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, paths @${BEAT.paths}, results @${BEAT.results}, reveal @${BEAT.reveal}, CTA @${BEAT.cta}, end ${(DURATION / FPS).toFixed(1)} s`,
);
r.table(
  ["frame", "screen s", "landed", ...Array.from({ length: BINS }, (_, k) => `b${k}`)],
  [POUR.first + POUR.firstDur, POUR.fast, POUR.fast + 60, POUR.fast + 120, ANNA_LAND, POUR.fast + 240, POUR.end].map((f) => [f, (f / FPS).toFixed(2), landedAt(f), ...countsAfter(landedAt(f))]),
);
const FL = FLIGHTS();
r.check("episode length is 35-50 s", DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`]);
r.check("the twist sits at ~60 % (55-65 %)", BEAT.twist / DURATION >= 0.55 && BEAT.twist / DURATION <= 0.65 ? [] : [`${((100 * BEAT.twist) / DURATION).toFixed(1)} %`]);
r.check(
  "pour schedule: balls leave the neck and land in pour order (so every bin fills slot by slot, never a gap under a ball)",
  FL.flatMap((x, i) => (i && (x.launch < FL[i - 1].launch || x.land < FL[i - 1].land) ? [`ball ${i + 1}`] : [])).slice(0, 5),
);
r.check(
  "every bin's balls land in slot order (slot s lands after slot s-1)",
  (() => {
    const last = new Array<number>(BINS).fill(-Infinity);
    const out: string[] = [];
    for (const b of balls()) {
      if (FL[b.i].land < last[b.bin]) out.push(`bin ${b.bin} slot ${b.slot}`);
      last[b.bin] = FL[b.i].land;
    }
    return out.slice(0, 5);
  })(),
);
r.check(`the first ${SLOW_BALLS} balls are slow-mo (all land before the fast-forward starts)`, FL.slice(0, SLOW_BALLS).every((x) => x.slow && x.land <= POUR.fast) && !FL[SLOW_BALLS].slow ? [] : ["slow set"]);
r.check(
  "counter: never goes back, 0 before the first landing, exactly 1,000 at the last landing, held ≥ 1 s",
  (() => {
    const out: string[] = [];
    for (let f = 1; f < DURATION; f++) if (counterAt(f) < counterAt(f - 1)) out.push(`@${f}`);
    if (counterAt(POUR.first + POUR.firstDur - 1) !== 0) out.push("counts before ball 1 lands");
    if (counterAt(POUR.end) !== BALLS || counterAt(POUR.end - 1) >= BALLS) out.push(`end ${counterAt(POUR.end)}`);
    if (CHART.to - POUR.end < FPS) out.push("final count held < 1 s on the panel");
    return out;
  })(),
);
r.check(
  "what is drawn = the data: every landed ball sits in its own slot and the stacks hold countsAfter(landed) balls (sampled every 5 frames)",
  (() => {
    const out: string[] = [];
    for (let f = 0; f < DURATION && out.length < 5; f += 5) {
      const drawn = ballsAt(f);
      const n = landedAt(f);
      const per = new Array<number>(BINS).fill(0);
      drawn.forEach((d, i) => {
        const b = balls()[i];
        const slot = stackPos(b.bin, b.slot);
        if (i < n) {
          if (d.pos.some((v, j) => Math.abs(v - slot[j]) > 1e-9)) out.push(`@${f} ball ${i + 1} not in its slot`);
          per[b.bin]++;
        }
      });
      if (per.join() !== countsAfter(n).join()) out.push(`@${f} stacks ${per.join(",")}`);
    }
    return out;
  })(),
);
r.check(
  `ball #${ANNA_BALL + 1} is the first ball of the pour in bin ${BET.anna}, lands in slot 0 at ${ANNA_LAND}, during the pour`,
  balls()[ANNA_BALL].bin === BET.anna && balls()[ANNA_BALL].slot === 0 && balls().slice(0, ANNA_BALL).every((b) => b.bin !== BET.anna) && ANNA_LAND < POUR.end
    ? []
    : ["Anna's ball"],
);
r.check(
  "the bell curve and the path fans appear only after the last ball has landed; the fan holds every path into the centre bin",
  (() => {
    const out: string[] = [];
    for (let f = 0; f < POUR.end; f++) if (curveAt(f) > 0 || pathsAt(f).fan > 0 || pathsAt(f).anna > 0) out.push(`@${f}`);
    const fan = pathsInto(BET.zuzu);
    if (fan.length !== choose(ROWS, BET.zuzu) || FAN_SIZE !== fan.length) out.push(`fan ${fan.length}`);
    if (new Set(fan.map((p) => p.join(""))).size !== fan.length || fan.some((p) => p.reduce<number>((a, x) => a + x, 0) !== BET.zuzu)) out.push("fan paths");
    if (pathsInto(BET.anna).length !== 1 || pathsInto(BET.anna)[0].some((x) => x !== 0)) out.push("Anna's path");
    if (pathsAt(PATHS.anna + PATHS.annaLen).anna !== 1 || pathsAt(PATHS.fan + PATHS.fanLen).fan !== 1) out.push("not fully drawn");
    return out.slice(0, 5);
  })(),
);
r.check(
  "board shots: the region is fully inside the free screen area and no mascot covers it (every frame)",
  (() => {
    const out: string[] = [];
    for (let f = 0; f < DURATION; f++) {
      const shot = boardShotAt(f);
      if (!shot) continue;
      const cam = camAt(f);
      const { region, area } = BOARD_SHOTS[shot];
      if (!regionOnScreen(cam, region, area).inside) out.push(`@${f} ${shot}: outside`);
      const actors = ORDER.map((m) => ({ name: m, pos: ACTING(m, f).pos }));
      const occ = occluders(cam, region, actors);
      if (occ.length) out.push(`@${f} ${shot}: ${occ.join(", ")} in front`);
    }
    return out.slice(0, 6);
  })(),
);
r.check(
  "board shots: bin numbers ≥ 28 px tall on screen",
  Object.entries(BOARD_SHOTS).flatMap(([k, v]) => {
    const cam = fitCam(v.region, 40, 1, v.area);
    const a = project(cam, [0, ARCADE.machine.labelY - 0.0425, ARCADE.machine.glassZ + 0.08], 1080, 1920);
    const b = project(cam, [0, ARCADE.machine.labelY + 0.0425, ARCADE.machine.glassZ + 0.08], 1080, 1920);
    const px = Math.abs(a.y - b.y);
    return px >= 28 ? [] : [`${k}: ${px.toFixed(0)} px`];
  }),
);
r.check(
  "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
  RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}`])),
);
r.check(
  "captions quote the computed counts, the lone ball's number and the path counts",
  [
    CAPTIONS.some((x) => x.text.toLowerCase().includes(`bin ${BET.anna}: ${c[BET.anna]} ball`) && x.text.toLowerCase().includes(`bin ${BET.zuzu}: ${c[BET.zuzu]}`)) ? "" : "counts caption",
    CAPTIONS.some((x) => x.text.includes(`#${ANNA_BALL + 1}`)) ? "" : "ball number",
    CAPTIONS.some((x) => x.text.includes(int(choose(ROWS, BET.zuzu)))) ? "" : "924 paths",
  ].filter(Boolean),
);
r.check(
  "acting: Anna smug at the bet, shocked then crying at the results, Zuzu cheers; Miyu pours (no sleeping); no reaction close-ups between the first ball and the results; Lumi glints at the reveal",
  (() => {
    const out: string[] = [];
    if (ACTING("anna", BEAT.bets + 30).expression !== "smug") out.push("Anna bet");
    if (ACTING("anna", ANNA.cry + 10).expression !== "crying") out.push("Anna cry");
    if (ACTING("anna", ANNA.shocked + 5).expression !== "shocked") out.push("Anna shocked");
    for (let f = BEAT.pour; f < DURATION; f++) if (ACTING("miyu", f).clip === "sleep_stand" || ACTING("miyu", f).symbols.some((s) => s.kind === "zzz")) { out.push(`Miyu sleeps @${f}`); break; }
    for (let f = BEAT.slow; f < BEAT.results; f++) if (!boardShotAt(f)) { out.push(`not a board shot @${f}`); break; }
    if (ACTING("miyu", MIYU.drop + 5).clip !== "hold_drop") out.push("Miyu pour");
    if (ACTING("lumi", BEAT.reveal + 60).expression !== "glint") out.push("Lumi glint");
    if (ACTING("zuzu", BEAT.results + 10).clip !== "cheer") out.push("Zuzu cheer");
    return out;
  })(),
);
r.check(
  `voices stay sparse: ≤ 5 single reactions, ≥ ${(VOICE_MIN_GAP / FPS).toFixed(1)} s apart (the CTA group cheer excepted)`,
  (() => {
    const v = soundtrack().cues.filter((x) => x.layer === "voice" && x.group !== CTA_GROUP);
    const out: string[] = v.length > 5 ? [`${v.length} voices`] : [];
    for (let i = 1; i < v.length; i++) if (v[i].at - v[i - 1].at < VOICE_MIN_GAP) out.push(`${v[i - 1].label} → ${v[i].label}: ${v[i].at - v[i - 1].at} f`);
    return out;
  })(),
);

r.cueSheet(soundtrack(), { duration: DURATION });
r.audioChecks(soundtrack(), { duration: DURATION, cooldown: VOICE_COOLDOWN, musicRange: MUSIC_RANGE });
r.loudness(
  [
    [".galton-board-full.wav", "mix"],
    ["galton-board.mp4", "final"],
    ["galton-board_nomusic.mp4", "final"],
  ],
  "npm run render:galton-board",
);
r.check("captions stay up long enough to read (info pill ≥ 1.5 s, chat bubble ≥ 2.2 s)", captionReadability(CAPTIONS));
r.finish();
