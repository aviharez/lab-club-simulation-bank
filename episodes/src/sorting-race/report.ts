// Report for EP07 "Sorting Race": data table + PASS/FAIL checks (timeline + cue sheet join once the episode is animated).
// Run: npm run report:sorting-race
import { createReport } from "../kit/report.ts";
import { seeded } from "../kit/random.ts";
import { captionReadability } from "../kit/captions.ts";
import { project } from "../kit/camera.ts";
import { SAFE } from "../kit/theme.ts";
import { slotX } from "../sets/chem-prep-room/layout.ts";
import { camAt } from "./camera.ts";
import { CTA_GROUP, MUSIC_RANGE, soundtrack, VOICE_COOLDOWN, VOICE_MAX, VOICE_MIN_GAP } from "./sound.ts";
import * as TL from "./timeline.ts";
import {
  about,
  ALGO_NAME,
  ALGOS,
  apply,
  BIG_N,
  bubbleCompares,
  bubbleOps,
  COST,
  countsAt,
  N,
  nLog2n,
  quickCompares,
  quickRun,
  race,
  secs,
  shuffled,
  SHUFFLE_SEED,
  START,
  TOTAL,
} from "./data.ts";

const r = createReport({ fps: 30 });
const sorted = Array.from({ length: N }, (_, i) => i + 1);
const inversions = (a: number[]) => a.reduce((s, x, i) => s + a.slice(i + 1).filter((y) => y < x).length, 0);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// ---------------------------------------------------------------- the race

r.section(`Start (seed ${SHUFFLE_SEED}, same on both benches): ${START.join(" ")} · ${inversions(START)} inversions`);
r.table(
  ["mascot", "algorithm", "comparisons", "swaps", `time (${COST.compare} s/compare, ${COST.swap} s/swap)`, "shown"],
  ALGOS.map((a) => {
    const t = TOTAL(a);
    return [a, ALGO_NAME[a], t.compares, t.swaps, `${t.compares}×${COST.compare} + ${t.swaps}×${COST.swap} = ${t.time}`, secs(t.time)];
  }),
);
const q = quickRun();
console.log(`Lomuto swaps of a beaker with itself (i = j, nothing moves, not counted): ${q.selfSwaps}`);

for (const a of ALGOS) {
  const R = race(a);
  r.section(`${a}: every operation (race time at its start)`);
  r.table(
    ["#", "t (s)", "op", "slots", "values", "result", "order after", "C", "S", "locked"],
    R.ops.map((o, k) => {
      const before = R.orders[k];
      const vals = `${before[o.i]} vs ${before[o.j]}`;
      const res = o.kind === "compare" ? (o.yes ? (a === "anna" ? "left taller → swap" : "< pivot") : a === "anna" ? "in order" : "≥ pivot") : "swapped";
      const ctx = o.pass ? `pass ${o.pass}` : `range ${o.range![0]}-${o.range![1]}`;
      return [k + 1, R.t[k].toFixed(1), o.kind, `${o.i},${o.j} (${ctx})`, vals, res, R.orders[k + 1].join(" "), R.compares[k + 1], R.swaps[k + 1], [...R.locked[k + 1]].sort((x, y) => x - y).join(",")];
    }),
  );
}

r.section(`Growth for big n (reveal: n = ${BIG_N.toLocaleString("en-US")})`);
r.table(
  ["n", "bubble n(n−1)/2", "quick avg 2(n+1)H_n − 4n", "n log₂ n", "ratio bubble/quick"],
  [12, 100, 1000, 1e4, 1e5, BIG_N].map((n) => [n.toLocaleString("en-US"), bubbleCompares(n).toLocaleString("en-US"), quickCompares(n).toFixed(1), nLog2n(n).toFixed(1), (bubbleCompares(n) / quickCompares(n)).toFixed(1)]),
);

// measured: early-exit bubble sort on random orders vs n(n−1)/2, and Lomuto on a random million
const bubbleCount = (a0: number[]) => {
  const a = [...a0];
  let c = 0;
  for (let end = a.length - 1; end > 0; end--) {
    let sw = false;
    for (let j = 0; j < end; j++) {
      c++;
      if (a[j] > a[j + 1]) {
        const t = a[j];
        a[j] = a[j + 1];
        a[j + 1] = t;
        sw = true;
      }
    }
    if (!sw) break;
  }
  return c;
};
const lomutoCount = (a: Int32Array) => {
  let c = 0;
  const st = [0, a.length - 1];
  while (st.length) {
    const hi = st.pop()!;
    const lo = st.pop()!;
    if (lo >= hi) continue;
    const p = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      c++;
      if (a[j] < p) {
        i++;
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
    }
    const t = a[i + 1];
    a[i + 1] = a[hi];
    a[hi] = t;
    st.push(lo, i, i + 2, hi);
  }
  for (let k = 1; k < a.length; k++) if (a[k - 1] > a[k]) return -1;
  return c;
};
const bubbleMeasured = [1000, 4000].map((n) => {
  const runs = 3;
  let s = 0;
  for (let k = 0; k < runs; k++) s += bubbleCount(shuffled(n, 9000 + k));
  return { n, measured: s / runs, formula: bubbleCompares(n) };
});
for (const b of bubbleMeasured) console.log(`bubble (early exit) on random n = ${b.n}: ${b.measured.toFixed(0)} comparisons = ${((100 * b.measured) / b.formula).toFixed(2)} % of n(n−1)/2`);
// 5 random millions (seeds 4242..4246). One run's comparisons have sd ≈ √(7 − 2π²/3)·n ≈ 0.652 n (Knuth)
const MILLION_RUNS = [4242, 4243, 4244, 4245, 4246].map((s) => lomutoCount(Int32Array.from(shuffled(BIG_N, s))));
const lomutoMillion = MILLION_RUNS.reduce((a, b) => a + b, 0) / MILLION_RUNS.length;
const QUICK_SD = Math.sqrt(7 - (2 * Math.PI ** 2) / 3) * BIG_N;
const millionZ = (lomutoMillion - quickCompares(BIG_N)) / (QUICK_SD / Math.sqrt(MILLION_RUNS.length));
console.log(`quick sort (Lomuto) on 5 random millions: ${MILLION_RUNS.map((c) => c.toLocaleString("en-US")).join(", ")} → mean ${lomutoMillion.toFixed(0)}; formula ${quickCompares(BIG_N).toFixed(0)} (z ${millionZ.toFixed(2)}); n log₂ n ${nLog2n(BIG_N).toFixed(0)}`);
console.log(`reveal line: about ${about(bubbleCompares(BIG_N))} vs about ${about(quickCompares(BIG_N))} comparisons`);

// ---------------------------------------------------------------- checks

r.section("Expectations from the brief");
r.expect(`${N} beakers, ${N} different levels`, N === 12 && same([...START].sort((x, y) => x - y), sorted));
r.expect("both benches start from the same shuffled order (one seeded START feeds both races)", same(race("anna").orders[0], race("lumi").orders[0]));
r.expect(`Lumi (quick) finishes first: ${secs(TOTAL("lumi").time)} vs ${secs(TOTAL("anna").time)}`, TOTAL("lumi").time < TOTAL("anna").time);
r.expect(`n = 1,000,000: bubble about ${about(bubbleCompares(BIG_N))} (brief "about 500 billion")`, about(bubbleCompares(BIG_N)) === "500 billion");
r.expect(
  `n = 1,000,000: quick about ${about(quickCompares(BIG_N))} (brief said "about 20 million" = n log₂ n ${about(nLog2n(BIG_N))}; quick sort's real average is ${(quickCompares(BIG_N) / nLog2n(BIG_N)).toFixed(2)}× that, so the episode says ${about(quickCompares(BIG_N))})`,
  about(quickCompares(BIG_N)) === "25 million",
);

r.section("Checks (math)");
r.check("both algorithms end sorted 1..12", ALGOS.flatMap((a) => (same(race(a).orders[race(a).ops.length], sorted) ? [] : [a])));
r.check("every compare and swap only touches slots 0..11, i ≠ j", ALGOS.flatMap((a) => race(a).ops.flatMap((o, k) => (o.i >= 0 && o.j < N && o.i !== o.j ? [] : [`${a} op ${k + 1}`]))));
r.check(`bubble: swaps = inversions of the start (${inversions(START)}), every swap fixes one adjacent inversion`, TOTAL("anna").swaps === inversions(START) ? [] : [`${TOTAL("anna").swaps}`]);
r.check(
  "bubble: compares only neighbours; a swap always follows a 'left taller' compare of the same pair",
  bubbleOps().flatMap((o, k, ops) => (o.j !== o.i + 1 ? [`op ${k + 1} not adjacent`] : o.kind === "swap" && !(ops[k - 1].kind === "compare" && ops[k - 1].yes && ops[k - 1].i === o.i) ? [`op ${k + 1}`] : [])),
);
r.check(
  "quick: every compare is a beaker in the range vs its pivot (the last slot of the range)",
  q.ops.flatMap((o, k) => (o.kind === "compare" && !(o.j === o.range![1] && o.i >= o.range![0] && o.i < o.range![1]) ? [`op ${k + 1}`] : [])),
);
r.check(
  "quick: a partition of a range of size m makes exactly m − 1 comparisons",
  (() => {
    const by = new Map<string, number>();
    q.ops.filter((o) => o.kind === "compare").forEach((o) => by.set(o.range!.join("-"), (by.get(o.range!.join("-")) ?? 0) + 1));
    return [...by].flatMap(([k, c]) => {
      const [lo, hi] = k.split("-").map(Number);
      return c === hi - lo ? [] : [`${k}: ${c}`];
    });
  })(),
);
r.check(
  "locks: a locked slot already holds its final beaker and never changes again; all 12 are locked at the end",
  ALGOS.flatMap((a) => {
    const R = race(a);
    const bad = R.locked.flatMap((L, k) => [...L].flatMap((s) => (R.orders[k][s] !== s + 1 ? [`${a} after op ${k}: slot ${s}`] : [])));
    return R.locked[R.ops.length].size === N ? bad : [...bad, `${a}: only ${R.locked[R.ops.length].size} locked`];
  }).slice(0, 5),
);
r.check(
  "fair clock: time = compares × cost + swaps × cost, the same costs for both",
  ALGOS.flatMap((a) => {
    const t = TOTAL(a);
    return Math.abs(t.time - (t.compares * COST.compare + t.swaps * COST.swap)) < 1e-9 ? [] : [a];
  }),
);
r.check("apply(ops) = the race's final order (one source of truth)", ALGOS.flatMap((a) => (same(apply(START, race(a).ops), race(a).orders[race(a).ops.length]) ? [] : [a])));
r.check("counters end exactly on the totals at the finish (and never before)", ALGOS.flatMap((a) => {
  const t = TOTAL(a);
  const end = countsAt(a, t.time);
  const before = countsAt(a, t.time - 1e-6);
  return end.compares === t.compares && end.swaps === t.swaps && end.done && !before.done ? [] : [a];
}));
r.check(
  "quick-sort average formula is exact: 2(n+1)H_n − 4n = mean comparisons over all n! orders (n = 2..8)",
  [2, 3, 4, 5, 6, 7, 8].flatMap((n) => {
    let total = 0;
    let count = 0;
    const perm = (p: number[], rest: number[]) => {
      if (!rest.length) {
        total += quickRun(p).ops.filter((o) => o.kind === "compare").length;
        count++;
        return;
      }
      rest.forEach((x, i) => perm([...p, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
    };
    perm([], Array.from({ length: n }, (_, i) => i + 1));
    return Math.abs(total / count - quickCompares(n)) < 1e-9 ? [] : [`n ${n}: ${total / count} vs ${quickCompares(n)}`];
  }),
);
r.check(`quick sort on 5 random millions: mean ${lomutoMillion.toFixed(0)} agrees with the formula (|z| ${Math.abs(millionZ).toFixed(2)} < 3) and every run sorted`, MILLION_RUNS.every((c) => c > 0) && Math.abs(millionZ) < 3 ? [] : [`z ${millionZ.toFixed(2)}`]);
r.check("bubble with the early exit on random orders stays ≥ 98 % of n(n−1)/2 (so 'about n²/2' holds)", bubbleMeasured.flatMap((b) => (b.measured / b.formula >= 0.98 ? [] : [`n ${b.n}`])));
{
  // the seed is typical: averages over 2000 other shuffles
  let bc = 0;
  let bs = 0;
  let qc = 0;
  let qs = 0;
  const M = 2000;
  for (let s = 1; s <= M; s++) {
    const a = shuffled(N, 100000 + s);
    const b = bubbleOps(a);
    const k = quickRun(a).ops;
    bc += b.filter((o) => o.kind === "compare").length;
    bs += b.filter((o) => o.kind === "swap").length;
    qc += k.filter((o) => o.kind === "compare").length;
    qs += k.filter((o) => o.kind === "swap").length;
  }
  const A = TOTAL("anna");
  const L = TOTAL("lumi");
  console.log(`averages over ${M} random shuffles of 12: bubble ${(bc / M).toFixed(1)} C / ${(bs / M).toFixed(1)} S · quick ${(qc / M).toFixed(1)} C / ${(qs / M).toFixed(1)} S (formula ${quickCompares(N).toFixed(2)} C)`);
  r.check(
    `seed ${SHUFFLE_SEED} is a typical race (each count within 20 % of the 2000-shuffle average)`,
    [
      ["bubble C", A.compares, bc / M],
      ["bubble S", A.swaps, bs / M],
      ["quick C", L.compares, qc / M],
      ["quick S", L.swaps, qs / M],
    ].flatMap(([k, v, m]) => (Math.abs((v as number) / (m as number) - 1) <= 0.2 ? [] : [`${k} ${v} vs ${(m as number).toFixed(1)}`])),
  );
}
r.check("data is deterministic (same seed, same shuffle)", same(shuffled(N, SHUFFLE_SEED), START) && seeded(1)() === seeded(1)() ? [] : ["shuffle changed"]);
// ---------------------------------------------------------------- timeline + picture
{
  const { ACTING, BEAT, CAPTIONS, DURATION, FPS, beakersAt, countsAtFrame, frameOf, tauAt, PANEL_RACE, RESULT_POPS, RESULT_OUTS, RESULT_COUNT_END } = TL;
  const W = 1080;
  const H = 1920;
  const PANEL_TOP = 1322;
  const ORD = ["miyu", "anna", "lumi", "zuzu"] as const;
  r.section("Checks (timeline + framing)");
  console.log(
    `beats: bets @${BEAT.annaBet}/${BEAT.lumiBet}, GO @${BEAT.go}, race @${BEAT.race}, 4x @${BEAT.x4}, 8x @${BEAT.x8}, Lumi done @${BEAT.lumiDone}, Anna done @${BEAT.annaDone}, results @${BEAT.results}, twist @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, reveal @${BEAT.reveal}, CTA @${BEAT.cta}, end ${(DURATION / FPS).toFixed(1)} s`,
  );
  r.check("episode length is 35-50 s", DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`]);
  r.check("the twist sits at ~60 % (55-65 %)", BEAT.twist / DURATION >= 0.55 && BEAT.twist / DURATION <= 0.65 ? [] : [`${((100 * BEAT.twist) / DURATION).toFixed(1)} %`]);
  r.check(
    "race clock: frameOf and tauAt are inverses, and both benches use the same mapping (fair race)",
    (() => {
      const out: string[] = [];
      for (let t = 0; t <= 60; t += 0.25) if (Math.abs(tauAt(frameOf(t)) - t) > 1e-9) out.push(`τ ${t}`);
      return out.slice(0, 5);
    })(),
  );
  r.check(
    "drawn beakers = the data: every frame shows each value exactly once per bench, the final frame is sorted, counters never go back and end on the totals",
    (() => {
      const out: string[] = [];
      for (const a of ["anna", "lumi"] as const) {
        let prev = { compares: 0, swaps: 0 };
        for (let f = 0; f < DURATION; f++) {
          const b = beakersAt(a, f);
          if (new Set(b.map((x) => x.value)).size !== N) out.push(`${a} @${f}: duplicate`);
          const c = countsAtFrame(a, f);
          if (c.compares < prev.compares || c.swaps < prev.swaps) out.push(`${a} @${f}: counter back`);
          prev = c;
        }
        const end = beakersAt(a, DURATION - 1).map((x) => x.value);
        if (end.some((v, i) => i > 0 && v < end[i - 1])) out.push(`${a}: not sorted at the end`);
        const T = TOTAL(a);
        const c = countsAtFrame(a, DURATION - 1);
        if (c.compares !== T.compares || c.swaps !== T.swaps) out.push(`${a}: counters end ${c.compares}/${c.swaps}`);
        if (beakersAt(a, BEAT.race).map((x) => x.value).join() !== START.join()) out.push(`${a}: start order`);
      }
      return out.slice(0, 6);
    })(),
  );
  const proj = (f: number, p: [number, number, number]) => project(camAt(f), p, W, H);
  r.check(
    "the race: all 24 beakers (top and base) stay on screen, inside the sides and above the panel, from GO to Anna's last swap",
    (() => {
      const out: string[] = [];
      for (let f = BEAT.go; f <= BEAT.annaDone; f++)
        for (const a of ["anna", "lumi"] as const)
          for (const b of beakersAt(a, f))
            for (const y of [b.pos[1], b.pos[1] + 0.22]) {
              const q = proj(f, [b.pos[0], y, b.pos[2]]);
              const bottom = f >= PANEL_RACE.from ? PANEL_TOP : SAFE.bottom;
              if (!q.visible || q.x < SAFE.side || q.x > W - SAFE.side || q.y < SAFE.top || q.y > bottom) out.push(`${a} ${b.value} @${f}`);
            }
      return out.slice(0, 5);
    })(),
  );
  r.check(
    "the race: Anna and Lumi (body and head) stay in frame from GO to their finish",
    (() => {
      const out: string[] = [];
      for (const a of ["anna", "lumi"] as const)
        for (let f = BEAT.go; f <= TL.DONE[a]; f++) {
          const p = ACTING(a, f).pos;
          for (const y of [0.5, 1.0]) {
            const q = proj(f, [p[0], y, p[2]]);
            if (!q.visible || q.x < SAFE.side || q.x > W - SAFE.side || q.y < SAFE.top || q.y > PANEL_TOP) out.push(`${a} @${f}`);
          }
        }
      return out.slice(0, 5);
    })(),
  );
  const heightPx = (f: number, m: (typeof ORD)[number]) => {
    const p = ACTING(m, f).pos;
    return Math.abs(proj(f, p).y - proj(f, [p[0], p[1] + 1.0, p[2]]).y);
  };
  r.check(
    "key beats (bets, results, reveal, CTA): the mascots in the shot are ≥ 1/5 frame tall (384 px) and in frame",
    (
      [
        [BEAT.annaBet + 30, ["anna"]],
        [BEAT.lumiBet + 30, ["lumi"]],
        [BEAT.results + 40, ["anna", "lumi"]],
        [BEAT.reveal + 60, ["lumi"]],
        [BEAT.cta + 30, ["miyu", "anna", "zuzu", "lumi"]],
      ] as [number, (typeof ORD)[number][]][]
    ).flatMap(([f, ms]) =>
      ms.flatMap((m) => {
        const p = ACTING(m, f).pos;
        const inside = [0.5, 1.0].every((y) => {
          const q = proj(f, [p[0], y, p[2]]);
          return q.visible && q.x >= SAFE.side && q.x <= W - SAFE.side && q.y >= 0 && q.y <= H;
        });
        const h = heightPx(f, m);
        return [h >= 384 ? "" : `${m} @${f}: ${h.toFixed(0)} px`, inside ? "" : `${m} @${f}: out of frame`].filter(Boolean);
      }),
    ),
  );
  console.log(
    `race shot (wide, apparatus first): mascot height ${ORD.map((m) => `${m} ${heightPx(BEAT.x4 + 30, m).toFixed(0)} px`).join(", ")}; beaker row ${(proj(BEAT.x4 + 30, [slotX(11), 0.4, 0])["x"] - proj(BEAT.x4 + 30, [slotX(0), 0.4, 0])["x"]).toFixed(0)} px wide`,
  );
  r.check(
    "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
    RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}`])),
  );
  r.check(
    "acting: Anna bets smug (point), compares/carries while racing, cries before she finishes; Lumi compares/carries, cheers at her finish, glints at the reveal; Zuzu holds the flag; nobody sleeps",
    (() => {
      const out: string[] = [];
      const A = (m: (typeof ORD)[number], f: number) => ACTING(m, f);
      if (A("anna", TL.ANNA.bet + 10).clip !== "point" || A("anna", TL.ANNA.bet + 10).expression !== "smug") out.push("Anna bet");
      const clips = new Set<string>();
      for (let f = BEAT.race; f < BEAT.lumiDone; f++) clips.add(A("lumi", f).clip).add(A("anna", f).clip);
      if (![...clips].every((c) => c === "compare" || c === "carry") || clips.size !== 2) out.push(`race clips ${[...clips]}`);
      if (A("anna", BEAT.annaDone - 5).expression !== "crying") out.push("Anna crying");
      if (A("lumi", BEAT.lumiDone + 10).clip !== "cheer") out.push("Lumi cheer");
      if (A("lumi", BEAT.reveal + 60).expression !== "glint") out.push("Lumi glint");
      if (A("zuzu", BEAT.x4).clip !== "hold_sign") out.push("Zuzu flag");
      for (let f = 0; f < DURATION; f++) if (ORD.some((m) => A(m, f).clip === "sleep_stand" || A(m, f).symbols.some((x) => x.kind === "zzz"))) { out.push(`sleep @${f}`); break; }
      return out;
    })(),
  );
  r.check(
    "captions quote the data (done times, ratio, the million numbers)",
    (() => {
      const text = CAPTIONS.map((c) => c.text).join(" | ");
      const want = [secs(TOTAL("lumi").time), secs(TOTAL("anna").time), (TOTAL("anna").time / TOTAL("lumi").time).toFixed(1) + "x", about(bubbleCompares(BIG_N)), about(quickCompares(BIG_N))];
      return want.filter((w) => !text.includes(w));
    })(),
  );
  r.check("captions stay up long enough to read (info pill ≥ 1.5 s, chat bubble ≥ 2.2 s)", captionReadability(CAPTIONS));
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
      [".sorting-race-full.wav", "mix"],
      ["sorting-race.mp4", "final"],
      ["sorting-race_nomusic.mp4", "final"],
    ],
    "npm run render:sorting-race",
  );
}
r.finish();
