// Prints the round-by-round log and the SFX cue sheet, and verifies the episode's expectations.
// Run: npm run report   (node strips the TypeScript types natively)
import { ep01 } from "../src/episodes/ep01-math-race.ts";
import { simulateRace } from "../src/mathrace/sim.ts";

const ep = ep01;
const tl = simulateRace(ep.race);
const [L, R] = ep.race.lanes;
const fps = ep.race.fps;
const ts = (f: number) => {
  const s = f / fps;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

console.log(`\n=== ${ep.id}: ${ep.hookTitle} — round log (HP to finish: ${tl.totalHp}) ===`);
const head = ["round", `${L.character}_power`, `${L.character}_total`, `${R.character}_power`, `${R.character}_total`, "leader", "notes"];
console.log(head.join("\t"));
for (const r of tl.rounds) {
  const [a, b] = r.lanes;
  const leader = a.after === b.after ? "tie" : a.after > b.after ? L.character : R.character;
  const notes: string[] = [];
  r.lanes.forEach((l, li) => {
    if (l.breaks.length) notes.push(`${ep.race.lanes[li].character} breaks wall ${l.breaks.map((x) => x.wall + 1).join(",")}`);
    if (l.finishFrame !== null) notes.push(`${ep.race.lanes[li].character} FINISHES @ ${ts(l.finishFrame)}`);
  });
  if (r.n === tl.overtakeRound) notes.push(`overtake @ ${ts(tl.overtakeFrame)}`);
  console.log([r.n, a.power, a.after, b.power, b.after, leader, notes.join("; ")].join("\t"));
}

console.log(`\nwinner: ${ep.race.lanes[tl.winner].character} in round ${tl.finishRound}`);
console.log(`overtake: round ${tl.overtakeRound}, frame ${tl.overtakeFrame} (${ts(tl.overtakeFrame)})`);
console.log(`per-round crossover: ${R.rule.label} > ${L.rule.label} for every n >= ${tl.permanentCrossover}`);
console.log(`duration: ${tl.totalFrames} frames = ${(tl.totalFrames / fps).toFixed(2)}s (race ${tl.raceFrames}f, ending ${tl.endingFrames}f, transition ${ep.race.transitionFrames}f)`);

console.log(`\n=== SFX cue sheet (${tl.sfx.length} cues) ===`);
console.log("time\tframe\ttype\tdescription");
for (const s of tl.sfx) console.log(`${ts(s.frame)}\t${s.frame}\t${s.type}\t${s.label}`);
console.log(`music: ${ep.audio.music ?? "(placeholder) full length 00:00 → " + ts(tl.totalFrames)}`);

if (ep.expect) {
  const e = ep.expect;
  const checks: [string, boolean][] = [
    [`winner = ${ep.race.lanes[e.winner].character}`, tl.winner === e.winner],
    [`overtake in round ${e.overtakeRound}`, tl.overtakeRound === e.overtakeRound],
    [`finish in round ${e.finishRound}`, tl.finishRound === e.finishRound],
    [`crossover at n = ${e.crossover}`, tl.permanentCrossover === e.crossover],
  ];
  console.log("\n=== checks ===");
  for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}
