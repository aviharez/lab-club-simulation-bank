// Physics table, soundtrack cue sheet and checks for "Same Jump, Different Planets" (same functions the video uses).
// Run: npm run report:jump
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LIB_DIR, voice } from "../src/audio/library.ts";
import { cueFrames, HEADROOM, MUSIC_TRIM, type Cue } from "../src/audio/mix.ts";
import { checkVoices } from "../src/audio/voiceCues.ts";
import { fmt2, physicsTable, V0, V0_LABEL } from "../src/jump/physics.ts";
import { CTA_GROUP, MUSIC_RANGE, soundtrack, VOICE_COOLDOWN } from "../src/jump/sound.ts";
import { BEAT, DURATION, FPS, landFrame, peakFrame, SLOWMO, SLOWMO_END } from "../src/jump/timeline.ts";

const root = path.resolve(import.meta.dirname, "..");
const ts = (f: number) => {
  const s = f / FPS;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};
let fails = 0;
const check = (name: string, problems: string[]) => {
  if (problems.length) fails++;
  console.log(`${problems.length ? "FAIL" : "PASS"}  ${name}${problems.length ? `\n      ${problems.join("\n      ")}` : ""}`);
};

console.log(`\n=== Physics (v = ${V0} m/s, h = v²/2g, T = 2v/g) ===`);
console.log(["planet", "mascot", "g (m/s²)", "height (m)", "airtime (s)", "t_peak (s)", "peak @", "lands @"].join("\t"));
for (const r of physicsTable()) {
  const id = r.planet.toLowerCase() as "moon" | "mars" | "earth" | "jupiter";
  console.log([r.planet, r.mascot, r.g.toFixed(2), r.height.toFixed(3), r.airtime.toFixed(3), r.tPeak.toFixed(3), ts(peakFrame(id)), ts(landFrame(id))].join("\t"));
}
console.log(`\ntakeoff @ ${ts(BEAT.takeoff)} (frame ${BEAT.takeoff}); slow-mo ${SLOWMO}x until ${ts(SLOWMO_END)} (frame ${SLOWMO_END})`);

// ---------------------------------------------------------------- cue sheet
const { cues, ducks, duck, voiceLog } = soundtrack();
const layerOf = (c: Cue) => (c.layer === "sfx" && c.tier === "ambient" ? "sfx·amb" : c.layer);
const notes = (c: Cue) =>
  [c.offset ? `from ${c.offset.toFixed(2)}s` : "", c.len ? `${c.len}f` : "", c.rate && c.rate !== 1 ? `rate ${c.rate.toFixed(2)}` : "", c.group ? `group ${c.group}` : ""].filter(Boolean).join(", ");
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const vol = (c: Cue) => (c.curve ? `${Math.min(...c.curve.filter((k) => k[1] > 0).map((k) => k[1])).toFixed(2)}-${c.volume.toFixed(2)}` : c.volume.toFixed(2));

console.log(`\n=== Cue sheet (${cues.length} cues; files under public/${LIB_DIR}; volumes before the ${(20 * Math.log10(HEADROOM)).toFixed(1)} dB mix headroom; music bus +${(20 * Math.log10(MUSIC_TRIM)).toFixed(0)} dB to match the voice loudness target) ===`);
console.log([pad("frame", 6), pad("time", 9), pad("layer", 8), pad("file", 36), pad("vol", 10), "label"].join(""));
for (const c of cues) {
  const n = notes(c);
  console.log([pad(c.at, 6), pad(ts(c.at), 9), pad(layerOf(c), 8), pad(c.file.path.replace(`${LIB_DIR}/`, ""), 36), pad(vol(c), 10), c.label + (n ? `  [${n}]` : "")].join(""));
}

const count = (l: string) => cues.filter((c) => layerOf(c) === l).length;
console.log(`\nsummary: ${count("voice")} voice · ${count("sfx")} key sfx · ${count("sfx·amb")} ambient sfx · ${count("music")} music cues`);

console.log(`\n=== Voice line-up decisions (acting → reaction, one voice at a time) ===`);
console.log(voiceLog.length ? voiceLog.join("\n") : "nothing shifted, cut or dropped");

console.log(`\n=== Music ducking (${ducks.length} windows, 5-frame attack / 6-frame release) ===`);
const ducked = duck.filter((g) => g < 0.99).length;
console.log(`music is ducked on ${ducked} of ${DURATION} frames (${((100 * ducked) / DURATION).toFixed(0)}%), deepest ${(20 * Math.log10(Math.min(...duck))).toFixed(1)} dB`);

// ---------------------------------------------------------------- checks
console.log(`\n=== Checks ===`);
const files = [...new Set(cues.map((c) => c.file.path))];
check(
  `every referenced file exists in public/${LIB_DIR} and in audio/final (${files.length} files)`,
  files.flatMap((p) => {
    const lib = path.join(root, "public", p);
    const src = path.join(root, "..", "audio", "final", p.replace(`${LIB_DIR}/`, ""));
    return [...(fs.existsSync(lib) ? [] : [`missing ${lib} (run npm run sync-audio)`]), ...(fs.existsSync(src) ? [] : [`missing ${src}`])];
  }),
);
const srcFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? srcFiles(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []));
check("no placeholder audio: every cue is a library file, nothing in src mentions audio/jump or _takes", [
  ...cues.filter((c) => !c.file.path.startsWith(`${LIB_DIR}/`)).map((c) => `${c.label}: ${c.file.path}`),
  ...srcFiles(path.join(root, "src")).filter((f) => /audio\/jump|_takes|placeholders_jump/.test(fs.readFileSync(f, "utf8"))).map((f) => `${path.relative(root, f)} references placeholder audio`),
  ...(fs.existsSync(path.join(root, "public", "audio", "jump")) ? ["public/audio/jump still exists"] : []),
]);
const { overlaps, repeats } = checkVoices(cues, VOICE_COOLDOWN);
check(`one voice at a time (only the "${CTA_GROUP}" group may overlap)`, overlaps);
check(`no reaction repeats inside its ${VOICE_COOLDOWN}-frame cooldown`, repeats);
const groups = cues.filter((c) => c.group === CTA_GROUP).sort((a, b) => a.at - b.at);
check(
  "CTA group cheer is staggered 3-6 frames",
  groups.slice(1).flatMap((c, i) => (c.at - groups[i].at >= 3 && c.at - groups[i].at <= 6 ? [] : [`${groups[i].file.id} @${groups[i].at} → ${c.file.id} @${c.at}`])),
);
check(
  "each character only uses her own voice folder",
  cues.filter((c) => c.layer === "voice" && !c.file.path.includes(`/voices/${c.character}/${c.character}_`)).map((c) => `${c.character} plays ${c.file.path}`),
);
check(
  `music stays inside ${MUSIC_RANGE[0] * 100}-${MUSIC_RANGE[1] * 100}% and under every voice`,
  cues.filter((c) => c.layer === "music" && (c.volume > MUSIC_RANGE[1] + 1e-9 || Math.min(...c.curve!.filter((k) => k[1] > 0).map((k) => k[1])) < MUSIC_RANGE[0] - 1e-9)).map((c) => `${c.file.id}: ${vol(c)}`),
);
check(
  "every cue starts and ends inside the episode",
  cues.filter((c) => c.at < 0 || c.at >= DURATION || (c.layer !== "music" && c.at + cueFrames(c, FPS) > DURATION + FPS)).map((c) => `${c.file.id} @${c.at}`),
);
check("unknown library names throw", (() => {
  try {
    voice("zuzu", "not_a_reaction" as never);
    return ["voice('zuzu','not_a_reaction') did not throw"];
  } catch {
    return [];
  }
})());

// expectations from the brief (rounded as given there)
// every on-screen number uses fmt2 (2 decimals); these are the values the video must show
const exp: Record<string, [string, string]> = { Moon: ["3.03", "3.87"], Mars: ["1.32", "1.69"], Earth: ["0.50", "0.64"], Jupiter: ["0.20", "0.25"] };
console.log(`\n=== Displayed values vs brief (v shown as ${V0_LABEL} m/s) ===`);
for (const r of physicsTable()) {
  const [h, T] = exp[r.planet];
  const ok = fmt2(r.height) === h && fmt2(r.airtime) === T;
  if (!ok) fails++;
  console.log(`${r.planet}: ${fmt2(r.height)} m / ${fmt2(r.airtime)} s  (brief ${h} m / ${T} s)  ${ok ? "PASS" : "FAIL"}`);
}

// ---------------------------------------------------------------- loudness of the rendered files
const measure = (file: string) => {
  const p = path.join(root, "out", file);
  if (!fs.existsSync(p)) return undefined;
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", p, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const summary = out.slice(out.lastIndexOf("Summary:"));
  const num = (re: RegExp) => Number(re.exec(summary)?.[1]);
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), peak: num(/Peak:\s+(-?[\d.]+) dBFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/) };
};
const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
console.log(`\n=== Loudness (targets: -14 LUFS integrated, true peak ≤ -1.5 dBTP; pre-master mix must not clip) ===`);
if (!hasFfmpeg) console.log("ffmpeg not found: skipped");
else {
  for (const [file, kind] of [
    [".same-jump-full.wav", "mix"],
    [".same-jump-nomusic.wav", "mix"],
    ["same-jump-different-planets.mp4", "final"],
    ["same-jump-different-planets_nomusic.mp4", "final"],
  ] as const) {
    const m = measure(file);
    if (!m) {
      console.log(`SKIP  out/${file}: not rendered yet (npm run render:jump)`);
      continue;
    }
    const ok = kind === "mix" ? m.peak <= -1 : Math.abs(m.lufs + 14) <= 0.5 && m.peak <= -1.5;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"}  out/${file}: ${m.lufs.toFixed(1)} LUFS integrated, true peak ${m.peak.toFixed(1)} dBTP, LRA ${m.lra.toFixed(1)} LU${kind === "mix" ? "  (pre-master, needs peak ≤ -1.0)" : ""}`);
  }
}

console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks passed");
if (fails) process.exitCode = 1;
