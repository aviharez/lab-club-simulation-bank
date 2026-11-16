// Physics table + SFX cue sheet for "Same Jump, Different Planets" (same functions the video uses).
// Run: npm run report:jump
import { fmt2, physicsTable, V0, V0_LABEL } from "../src/jump/physics.ts";
import { soundCues } from "../src/jump/sound.ts";
import { BEAT, FPS, landFrame, peakFrame, SLOWMO, SLOWMO_END } from "../src/jump/timeline.ts";

const ts = (f: number) => {
  const s = f / FPS;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

console.log(`\n=== Physics (v = ${V0} m/s, h = v²/2g, T = 2v/g) ===`);
console.log(["planet", "mascot", "g (m/s²)", "height (m)", "airtime (s)", "t_peak (s)", "peak @", "lands @"].join("\t"));
for (const r of physicsTable()) {
  const id = r.planet.toLowerCase() as "moon" | "mars" | "earth" | "jupiter";
  console.log([r.planet, r.mascot, r.g.toFixed(2), r.height.toFixed(3), r.airtime.toFixed(3), r.tPeak.toFixed(3), ts(peakFrame(id)), ts(landFrame(id))].join("\t"));
}
console.log(`\ntakeoff @ ${ts(BEAT.takeoff)} (frame ${BEAT.takeoff}); slow-mo ${SLOWMO}x until ${ts(SLOWMO_END)} (frame ${SLOWMO_END})`);

console.log(`\n=== SFX cue sheet (as placed in the soundtrack, public/audio/jump/*.mp3) ===`);
console.log(["time", "frame", "sfx", "note"].join("\t"));
for (const c of soundCues()) console.log([ts(c.at), c.at, c.name, c.label].join("\t"));

// expectations from the brief (rounded as given there)
// every on-screen number uses fmt2 (2 decimals); these are the values the video must show
const exp: Record<string, [string, string]> = { Moon: ["3.03", "3.87"], Mars: ["1.32", "1.69"], Earth: ["0.50", "0.64"], Jupiter: ["0.20", "0.25"] };
console.log(`\n=== Displayed values vs brief (v shown as ${V0_LABEL} m/s) ===`);
let fails = 0;
for (const r of physicsTable()) {
  const [h, T] = exp[r.planet];
  const ok = fmt2(r.height) === h && fmt2(r.airtime) === T;
  if (!ok) fails++;
  console.log(`${r.planet}: ${fmt2(r.height)} m / ${fmt2(r.airtime)} s  (brief ${h} m / ${T} s)  ${ok ? "PASS" : "FAIL"}`);
}
if (fails) process.exitCode = 1;
