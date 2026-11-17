// Report: data table + PASS/FAIL checks + timeline checks + cue sheet.
// Run: npm run report:three-doors
import { createReport } from "../kit/report.ts";
import { frameOfRound, MUSIC_RANGE, soundtrack, TICK_AT, VOICE_COOLDOWN } from "./sound.ts";
import { ACTING, ANNA, BEAT, CAPTIONS, doorsAt, DURATION, FPS, miniAt, MIYU, MONTAGE, played, RESULT_COUNT_END, RESULT_OUTS, RESULT_POPS, ROUND_AT, scoreAt, SLOW } from "./timeline.ts";
import { simulate, DOORS, EXPECTED, pct, PLAYERS, rateAfter, ROUNDS, rounds, SEED_NOTE, STRATEGY, totalWins, winsAfter, doorLabel, type Player } from "./data.ts";

const r = createReport({ fps: 30 });
const NAME: Record<Player, string> = { anna: "Anna", miyu: "Miyu" };

r.section(`Monty Hall: ${ROUNDS} rounds each (${SEED_NOTE})`);
r.table(
  ["player", "strategy", "wins", "losses", "win rate", "shown", "expected", "z-score"],
  PLAYERS.map((p) => {
    const w = totalWins(p);
    const e = EXPECTED[STRATEGY[p]];
    const sd = Math.sqrt(ROUNDS * e * (1 - e));
    return [NAME[p], STRATEGY[p], w, ROUNDS - w, (w / ROUNDS).toFixed(4), pct(w / ROUNDS), pct(e), ((w - ROUNDS * e) / sd).toFixed(2)];
  }),
);

r.section("Slow rounds (round 1 of each stream, shown in full)");
r.table(
  ["player", "prize", "pick", "Lumi opens", "final", "result"],
  PLAYERS.map((p) => {
    const x = rounds(p)[0];
    return [NAME[p], `door ${doorLabel(x.prize)}`, `door ${doorLabel(x.pick)}`, `door ${doorLabel(x.opened)}`, `door ${doorLabel(x.final)}`, x.win ? "TROPHY" : "duck"];
  }),
);

r.section("Running win rate (chart samples)");
const marks = [1, 2, 3, 5, 10, 20, 50, 100, 200, 300, 500, 750, 1000];
r.table(
  ["after n", ...PLAYERS.map((p) => `${NAME[p]} wins`), ...PLAYERS.map((p) => `${NAME[p]} rate`)],
  marks.map((n) => [n, ...PLAYERS.map((p) => winsAfter(p, n)), ...PLAYERS.map((p) => pct(rateAfter(p, n)))]),
);

r.section("Door tallies (sanity: prize and pick are uniform)");
r.table(
  ["player", ...DOORS.map((d) => `prize ${doorLabel(d)}`), ...DOORS.map((d) => `pick ${doorLabel(d)}`), "first pick right"],
  PLAYERS.map((p) => {
    const rs = rounds(p);
    return [NAME[p], ...DOORS.map((d) => rs.filter((x) => x.prize === d).length), ...DOORS.map((d) => rs.filter((x) => x.pick === d).length), rs.filter((x) => x.pick === x.prize).length];
  }),
);

r.section("Expectations from the brief");
r.expect(`Anna (stay) wins ${totalWins("anna")}/${ROUNDS} = ${pct(totalWins("anna") / ROUNDS)} (brief ~1/3)`, Math.abs(totalWins("anna") / ROUNDS - 1 / 3) < 3 * Math.sqrt(2 / 9 / ROUNDS));
r.expect(`Miyu (switch) wins ${totalWins("miyu")}/${ROUNDS} = ${pct(totalWins("miyu") / ROUNDS)} (brief ~2/3)`, Math.abs(totalWins("miyu") / ROUNDS - 2 / 3) < 3 * Math.sqrt(2 / 9 / ROUNDS));
r.expect("Anna's slow round: she stays and gets a duck", !rounds("anna")[0].win && rounds("anna")[0].final === rounds("anna")[0].pick);
r.expect("Miyu's slow round: she switches and gets the trophy", rounds("miyu")[0].win && rounds("miyu")[0].final !== rounds("miyu")[0].pick);

r.section("Checks");
r.check(
  "every round: Lumi never opens the pick or the trophy; the final door follows the strategy; win = final is the trophy",
  PLAYERS.flatMap((p) =>
    rounds(p).flatMap((x) => {
      const out: string[] = [];
      if (x.opened === x.pick || x.opened === x.prize) out.push(`${p} #${x.n}: opened ${x.opened}`);
      const want = STRATEGY[p] === "stay" ? x.pick : 3 - x.pick - x.opened;
      if (x.final !== want || x.final === x.opened) out.push(`${p} #${x.n}: final ${x.final}`);
      if (x.win !== (x.final === x.prize)) out.push(`${p} #${x.n}: win flag`);
      return out;
    }),
  ),
);
r.check(
  "stay wins exactly when the first pick was right; switch wins exactly when it was wrong",
  PLAYERS.flatMap((p) => rounds(p).filter((x) => x.win !== (STRATEGY[p] === "stay" ? x.pick === x.prize : x.pick !== x.prize)).map((x) => `${p} #${x.n}`)),
);
r.check(
  "running counts: wins after n are non-decreasing, grow by at most 1 per round and end on the totals",
  PLAYERS.flatMap((p) => {
    const out: string[] = [];
    for (let n = 1; n <= ROUNDS; n++) {
      const d = winsAfter(p, n) - winsAfter(p, n - 1);
      if (d < 0 || d > 1) out.push(`${p} @${n}`);
    }
    if (winsAfter(p, ROUNDS) !== totalWins(p)) out.push(`${p}: total`);
    return out;
  }),
);
r.check(
  "prize and first pick are uniform (chi-square, 2 dof, < 9.21 = p 0.01)",
  PLAYERS.flatMap((p) => {
    const rs = rounds(p);
    const chi = (key: "prize" | "pick") => DOORS.reduce<number>((s, d) => s + (rs.filter((x) => x[key] === d).length - ROUNDS / 3) ** 2 / (ROUNDS / 3), 0);
    return (["prize", "pick"] as const).filter((k) => chi(k) >= 9.21).map((k) => `${p} ${k}: χ² ${chi(k).toFixed(2)}`);
  }),
);
r.check(
  "data is deterministic (same seeds, same rounds)",
  PLAYERS.every((p) => JSON.stringify(simulate(p)) === JSON.stringify(rounds(p))) ? [] : ["rounds() changed"],
);

r.check(
  "episode length is 35-50 s",
  DURATION >= 35 * FPS && DURATION <= 50 * FPS ? [] : [`${(DURATION / FPS).toFixed(1)} s`],
);

r.section("Timeline");
console.log(
  `beats: Anna's round @${BEAT.anna}, Miyu's round @${BEAT.miyu}, twist ("Let's play 1,000 times") @${BEAT.twist} = ${((100 * BEAT.twist) / DURATION).toFixed(0)} %, montage ${MONTAGE.from}-${MONTAGE.to}, results @${BEAT.results}, reveal @${BEAT.reveal}, CTA @${BEAT.cta}, end ${(DURATION / FPS).toFixed(1)} s`,
);
r.table(
  ["round n", "first frame", "screen s", "Anna wins", "Miyu wins"],
  [2, 3, 5, 10, 25, 50, 100, 250, 500, 750, 1000].map((n) => {
    const f = frameOfRound(n);
    return [n, f, (f / FPS).toFixed(2), scoreAt("anna", f).wins, scoreAt("miyu", f).wins];
  }),
);
r.check(
  "slow rounds on screen follow the data: Lumi opens the data's door, the final door is the data's, prizes match",
  (["anna", "miyu"] as const).flatMap((p) => {
    const out: string[] = [];
    const at = ROUND_AT[p];
    const x = SLOW[p];
    const mid = doorsAt(at.host + 20);
    if (mid.open[x.opened] < 0.99 || mid.open[x.pick] !== 0) out.push(`${p}: host door state ${mid.open}`);
    const end = doorsAt(at.open + 20);
    if (end.open[x.final] < 0.99) out.push(`${p}: final door not open`);
    if (end.prizes[x.prize] !== "trophy" || end.prizes.filter((q) => q === "trophy").length !== 1) out.push(`${p}: prizes ${end.prizes}`);
    if (p === "miyu" && end.shine <= 0) out.push("no trophy shine on Miyu's win");
    return out;
  }),
);
r.check(
  "every mini-stage round shown is a real round of that player's stream (prize + opened doors match)",
  (() => {
    const out: string[] = [];
    for (let f = MONTAGE.from; f <= BEAT.results; f++)
      for (const k of [0, 1] as const) {
        const m = miniAt(k, f);
        const rd = m.round;
        const real = rounds(k === 0 ? "anna" : "miyu")[rd.n - 1];
        if (JSON.stringify(real) !== JSON.stringify(rd)) out.push(`@${f} stage ${k}`);
        if (m.prizes[rd.prize] !== "trophy") out.push(`@${f} stage ${k}: prize`);
        if (m.open[rd.prize] > 0 && rd.prize !== rd.final) out.push(`@${f} stage ${k}: trophy door opened by Lumi`);
      }
    return out.slice(0, 5);
  })(),
);
r.check(
  "counters: rounds never go backwards, start at 1 (the slow round), end exactly on 1,000 and the exact totals, held ≥ 0.5 s",
  (() => {
    const out: string[] = [];
    for (let f = BEAT.montage + 1; f < DURATION; f++) if (played(f) < played(f - 1)) out.push(`@${f}`);
    if (played(BEAT.montage) !== 1) out.push(`starts at ${played(BEAT.montage)}`);
    if (played(MONTAGE.to) !== ROUNDS) out.push(`ends at ${played(MONTAGE.to)}`);
    if (BEAT.results - MONTAGE.to < 15) out.push("final count held < 0.5 s");
    for (const p of PLAYERS) if (scoreAt(p, MONTAGE.to).wins !== totalWins(p)) out.push(`${p}: ${scoreAt(p, MONTAGE.to).wins}`);
    return out;
  })(),
);
r.check(
  "scoreboard: STAY 0/1 after Anna's duck, SWITCH 1/1 after Miyu's trophy (the slow rounds are round 1)",
  scoreAt("anna", ANNA.duck).wins === winsAfter("anna", 1) && scoreAt("anna", ANNA.duck).n === 1 && scoreAt("miyu", MIYU.win).wins === winsAfter("miyu", 1) && scoreAt("miyu", MIYU.win - 1).n === 0
    ? []
    : ["slow round scores"],
);
r.check(
  "every result card finishes its count-up on the exact value and holds it ≥ 0.5 s before any card leaves",
  RESULT_POPS.flatMap((p, i) => (p + RESULT_COUNT_END + 15 <= Math.min(...RESULT_OUTS) ? [] : [`card ${i + 1}`])),
);
r.check(
  "captions quote the computed totals and the slow rounds' doors",
  [
    CAPTIONS.some((c) => c.text.includes(pct(totalWins("anna") / ROUNDS))) && CAPTIONS.some((c) => c.text.includes(pct(totalWins("miyu") / ROUNDS))) ? "" : "no caption with both rates",
    CAPTIONS.some((c) => c.text.includes(`door ${doorLabel(SLOW.anna.opened)}`)) ? "" : "Anna's opened door missing",
  ].filter(Boolean),
);
r.check(
  "acting: Anna smug at the bet, shocked at the duck, crying near the end; Miyu calm (squint) in the montage, happy on her win; Lumi glints",
  (() => {
    const out: string[] = [];
    if (ACTING("anna", BEAT.bets + 30).expression !== "smug") out.push("Anna bet");
    if (ACTING("anna", ANNA.duck + 10).expression !== "shocked") out.push("Anna duck");
    if (ACTING("anna", ANNA.cry + 10).expression !== "crying") out.push("Anna cry");
    if (ACTING("miyu", MONTAGE.from + 60).expression !== "squint") out.push("Miyu calm");
    if (ACTING("miyu", MIYU.win + 10).expression !== "happy") out.push("Miyu win");
    if (ACTING("lumi", BEAT.reveal + 60).expression !== "glint") out.push("Lumi glint");
    if (ACTING("zuzu", 10).clip !== "hold_sign") out.push("Zuzu sign");
    if (ACTING("lumi", BEAT.twist + 30).clip !== "hold_sign") out.push("Lumi sign");
    return out;
  })(),
);
console.log(`montage ticks at rounds ${TICK_AT.join(", ")}`);

r.cueSheet(soundtrack(), { duration: DURATION });
r.audioChecks(soundtrack(), { duration: DURATION, cooldown: VOICE_COOLDOWN, musicRange: MUSIC_RANGE });
r.loudness(
  [
    [".three-doors-full.wav", "mix"],
    ["three-doors.mp4", "final"],
    ["three-doors_nomusic.mp4", "final"],
  ],
  "npm run render:three-doors",
);
r.finish();
