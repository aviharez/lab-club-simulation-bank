// Cuts the voice pack (one WAV with every voice take, made in the ElevenLabs sandbox) into the audio library:
//   picked takes -> ../audio/final/voices/<name>/<name>_<reaction>.mp3
//   other takes  -> ../audio/_takes/voices/<name>/<name>_<reaction>_<take>.mp3
// The cut points come from ../audio/voice_pack.json (sample-exact). Durations of the final files are measured after
// encoding and written back to ../audio/audio_manifest.json. Then run `npm run sync-audio` (npm run import-voices does both).
//
// Run: npm run import-voices                      (pack at ../audio/_raw/lab_club_voices_pack.wav)
//      npm run import-voices -- path/to/pack.wav  (any other location)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const audio = path.resolve(root, "..", "audio");
const index = JSON.parse(fs.readFileSync(path.join(audio, "voice_pack.json"), "utf8"));
const wav = path.resolve(process.argv[2] ?? path.join(audio, "_raw", index.file));

if (!fs.existsSync(wav)) {
  console.error(`Voice pack not found: ${wav}\nDownload ${index.file} from the ElevenLabs flow (${index.elevenlabs_flow}) and put it in audio/_raw/.`);
  process.exit(1);
}

const probe = (file, entries) =>
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", entries, "-of", "default=nw=1:nk=1", file], { encoding: "utf8" }).trim().split("\n");

const [rate, channels] = probe(wav, "stream=sample_rate,channels");
const samples = Math.round(Number(probe(wav, "format=duration")[0]) * Number(rate));
if (Number(rate) !== index.sample_rate || Number(channels) !== index.channels) {
  throw new Error(`${path.basename(wav)} is ${rate} Hz / ${channels} ch, expected ${index.sample_rate} Hz / ${index.channels} ch`);
}
if (Math.abs(samples - index.total_samples) > 64) {
  throw new Error(`${path.basename(wav)} has ${samples} samples, voice_pack.json expects ${index.total_samples}. Wrong or truncated file?`);
}

const finalDir = path.join(audio, "final", "voices");
const takesDir = path.join(audio, "_takes", "voices");
const durations = {};
let n = 0;
for (const t of index.takes) {
  const name = `${t.character}_${t.reaction}`;
  const out = t.picked
    ? path.join(finalDir, t.character, `${name}.mp3`)
    : path.join(takesDir, t.character, `${name}_${t.take}.mp3`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", wav,
    "-af", `atrim=start_sample=${t.start}:end_sample=${t.start + t.samples},asetpts=PTS-STARTPTS`,
    "-ac", "1", "-ar", String(index.sample_rate), "-c:a", "libmp3lame", "-b:a", "192k", out,
  ]);
  if (t.picked) durations[name] = Math.round(Number(probe(out, "format=duration")[0]) * 1000) / 1000;
  n++;
}

const manifestPath = path.join(audio, "audio_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const missing = [];
for (const f of manifest.files) {
  if (f.type !== "voice") continue;
  const d = durations[`${f.character}_${f.reaction}`];
  if (d === undefined) missing.push(f.file);
  else f.duration = d;
}
if (missing.length) throw new Error(`manifest voices with no picked take in the pack:\n  ${missing.join("\n  ")}`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`imported ${n} takes (${Object.keys(durations).length} final voices) from ${path.basename(wav)}; manifest durations updated`);
