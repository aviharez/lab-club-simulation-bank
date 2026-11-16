// Report helpers shared by every episode's report script (run with node, no bundler):
//   const r = createReport({ fps: FPS });
//   r.section("Physics"); r.table(headers, rows);
//   r.check("name", problems[]);                       // PASS/FAIL line; any problem fails the run
//   r.cueSheet(soundtrack(), { duration });            // cue sheet + voice decisions + ducking summary
//   r.audioChecks(soundtrack(), { ... });              // missing files, placeholders, voice overlaps, cooldown, ...
//   r.loudness([[".x-full.wav", "mix"], ["x.mp4", "final"]]);
//   r.finish();                                        // "all checks passed" or sets the exit code
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LIB_DIR, voice } from "../audio/library.ts";
import {
  cueFrames,
  HEADROOM,
  MUSIC_TRIM,
  type Cue,
  type SoundtrackData,
} from "../audio/mix.ts";
import { checkVoices } from "../audio/voiceCues.ts";

/** episodes/ (this file is src/kit/report.ts) */
export const EPISODES_ROOT = path.resolve(import.meta.dirname, "..", "..");

export const createReport = ({
  fps,
  root = EPISODES_ROOT,
}: {
  fps: number;
  root?: string;
}) => {
  let fails = 0;

  /** mm:ss.ss of a frame */
  const ts = (f: number) => {
    const s = f / fps;
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
  };
  const check = (name: string, problems: string[]) => {
    if (problems.length) fails++;
    console.log(
      `${problems.length ? "FAIL" : "PASS"}  ${name}${problems.length ? `\n      ${problems.join("\n      ")}` : ""}`,
    );
  };
  /** A single PASS/FAIL value line (e.g. "Moon: 3.03 m (brief 3.03 m)  PASS"). */
  const expect = (line: string, ok: boolean) => {
    if (!ok) fails++;
    console.log(`${line}  ${ok ? "PASS" : "FAIL"}`);
  };
  const section = (title: string) => console.log(`\n=== ${title} ===`);
  const table = (headers: string[], rows: (string | number)[][]) => {
    console.log(headers.join("\t"));
    for (const r of rows) console.log(r.join("\t"));
  };

  const layerOf = (c: Cue) =>
    c.layer === "sfx" && c.tier === "ambient" ? "sfx·amb" : c.layer;
  const vol = (c: Cue) =>
    c.curve
      ? `${Math.min(...c.curve.filter((k) => k[1] > 0).map((k) => k[1])).toFixed(2)}-${c.volume.toFixed(2)}`
      : c.volume.toFixed(2);

  /** Cue sheet, voice line-up decisions and the music ducking summary. */
  const cueSheet = (
    { cues, ducks, duck, voiceLog }: SoundtrackData,
    { duration }: { duration: number },
  ) => {
    const notes = (c: Cue) =>
      [
        c.offset ? `from ${c.offset.toFixed(2)}s` : "",
        c.len ? `${c.len}f` : "",
        c.rate && c.rate !== 1 ? `rate ${c.rate.toFixed(2)}` : "",
        c.group ? `group ${c.group}` : "",
      ]
        .filter(Boolean)
        .join(", ");
    const pad = (s: string | number, n: number) => String(s).padEnd(n);
    section(
      `Cue sheet (${cues.length} cues; files under public/${LIB_DIR}; volumes before the ${(20 * Math.log10(HEADROOM)).toFixed(1)} dB mix headroom; music bus +${(20 * Math.log10(MUSIC_TRIM)).toFixed(0)} dB to match the voice loudness target)`,
    );
    console.log(
      [
        pad("frame", 6),
        pad("time", 9),
        pad("layer", 8),
        pad("file", 36),
        pad("vol", 10),
        "label",
      ].join(""),
    );
    for (const c of cues) {
      const n = notes(c);
      console.log(
        [
          pad(c.at, 6),
          pad(ts(c.at), 9),
          pad(layerOf(c), 8),
          pad(c.file.path.replace(`${LIB_DIR}/`, ""), 36),
          pad(vol(c), 10),
          c.label + (n ? `  [${n}]` : ""),
        ].join(""),
      );
    }
    const count = (l: string) => cues.filter((c) => layerOf(c) === l).length;
    console.log(
      `\nsummary: ${count("voice")} voice · ${count("sfx")} key sfx · ${count("sfx·amb")} ambient sfx · ${count("music")} music cues`,
    );

    section(`Voice line-up decisions (acting → reaction, one voice at a time)`);
    console.log(
      voiceLog.length ? voiceLog.join("\n") : "nothing shifted, cut or dropped",
    );

    section(
      `Music ducking (${ducks.length} windows, 5-frame attack / 6-frame release)`,
    );
    const ducked = duck.filter((g) => g < 0.99).length;
    console.log(
      `music is ducked on ${ducked} of ${duration} frames (${((100 * ducked) / duration).toFixed(0)}%), deepest ${(20 * Math.log10(Math.min(...duck))).toFixed(1)} dB`,
    );
  };

  /** The audio rules from CLAUDE.md as PASS/FAIL checks. Call after section("Checks"). */
  const audioChecks = (
    { cues }: SoundtrackData,
    {
      duration,
      cooldown,
      group,
      musicRange,
    }: {
      duration: number;
      cooldown: number;
      /** the one voice group allowed to overlap */ group?: string;
      musicRange: readonly [number, number];
    },
  ) => {
    const files = [...new Set(cues.map((c) => c.file.path))];
    check(
      `every referenced file exists in public/${LIB_DIR} and in audio/final (${files.length} files)`,
      files.flatMap((p) => {
        const lib = path.join(root, "public", p);
        const src = path.join(
          root,
          "..",
          "audio",
          "final",
          p.replace(`${LIB_DIR}/`, ""),
        );
        return [
          ...(fs.existsSync(lib)
            ? []
            : [`missing ${lib} (run npm run sync-audio)`]),
          ...(fs.existsSync(src) ? [] : [`missing ${src}`]),
        ];
      }),
    );
    const srcFiles = (dir: string): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? srcFiles(path.join(dir, e.name))
            : /\.(ts|tsx)$/.test(e.name)
              ? [path.join(dir, e.name)]
              : [],
        );
    check(
      "no placeholder audio: every cue is a library file, nothing in src mentions audio/jump or _takes",
      [
        ...cues
          .filter((c) => !c.file.path.startsWith(`${LIB_DIR}/`))
          .map((c) => `${c.label}: ${c.file.path}`),
        ...srcFiles(path.join(root, "src"))
          .filter((f) => !f.endsWith(path.join("kit", "report.ts")))
          .filter((f) =>
            /audio\/jump|_takes|placeholders_jump/.test(
              fs.readFileSync(f, "utf8"),
            ),
          )
          .map((f) => `${path.relative(root, f)} references placeholder audio`),
        ...(fs.existsSync(path.join(root, "public", "audio", "jump"))
          ? ["public/audio/jump still exists"]
          : []),
      ],
    );
    const { overlaps, repeats } = checkVoices(cues, cooldown);
    check(
      group
        ? `one voice at a time (only the "${group}" group may overlap)`
        : "one voice at a time",
      overlaps,
    );
    check(`no reaction repeats inside its ${cooldown}-frame cooldown`, repeats);
    if (group) {
      const g = cues
        .filter((c) => c.group === group)
        .sort((a, b) => a.at - b.at);
      check(
        `${group.toUpperCase()} group cheer is staggered 3-6 frames`,
        g
          .slice(1)
          .flatMap((c, i) =>
            c.at - g[i].at >= 3 && c.at - g[i].at <= 6
              ? []
              : [`${g[i].file.id} @${g[i].at} → ${c.file.id} @${c.at}`],
          ),
      );
    }
    check(
      "each character only uses her own voice folder",
      cues
        .filter(
          (c) =>
            c.layer === "voice" &&
            !c.file.path.includes(`/voices/${c.character}/${c.character}_`),
        )
        .map((c) => `${c.character} plays ${c.file.path}`),
    );
    check(
      `music stays inside ${musicRange[0] * 100}-${musicRange[1] * 100}% and under every voice`,
      cues
        .filter(
          (c) =>
            c.layer === "music" &&
            (c.volume > musicRange[1] + 1e-9 ||
              Math.min(
                ...(c.curve ?? [[0, c.volume]])
                  .filter((k) => k[1] > 0)
                  .map((k) => k[1]),
              ) <
                musicRange[0] - 1e-9),
        )
        .map((c) => `${c.file.id}: ${vol(c)}`),
    );
    check(
      "every cue starts and ends inside the episode",
      cues
        .filter(
          (c) =>
            c.at < 0 ||
            c.at >= duration ||
            (c.layer !== "music" && c.at + cueFrames(c, fps) > duration + fps),
        )
        .map((c) => `${c.file.id} @${c.at}`),
    );
    check(
      "unknown library names throw",
      (() => {
        try {
          voice("zuzu", "not_a_reaction" as never);
          return ["voice('zuzu','not_a_reaction') did not throw"];
        } catch {
          return [];
        }
      })(),
    );
  };

  /** Loudness of rendered files in out/: "mix" = pre-master WAV (must not clip), "final" = mastered MP4. */
  const loudness = (files: [string, "mix" | "final"][], renderHint: string) => {
    const hasFfmpeg = (() => {
      try {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    })();
    const measure = (file: string) => {
      const p = path.join(root, "out", file);
      if (!fs.existsSync(p)) return undefined;
      const out = spawnSync(
        "ffmpeg",
        [
          "-hide_banner",
          "-nostats",
          "-i",
          p,
          "-map",
          "0:a:0",
          "-af",
          "ebur128=peak=true",
          "-f",
          "null",
          "-",
        ],
        { encoding: "utf8" },
      ).stderr;
      const summary = out.slice(out.lastIndexOf("Summary:"));
      const num = (re: RegExp) => Number(re.exec(summary)?.[1]);
      return {
        lufs: num(/I:\s+(-?[\d.]+) LUFS/),
        peak: num(/Peak:\s+(-?[\d.]+) dBFS/),
        lra: num(/LRA:\s+(-?[\d.]+) LU/),
      };
    };
    section(
      `Loudness (targets: -14 LUFS integrated, true peak ≤ -1.5 dBTP; pre-master mix must not clip)`,
    );
    if (!hasFfmpeg) return console.log("ffmpeg not found: skipped");
    for (const [file, kind] of files) {
      const m = measure(file);
      if (!m) {
        console.log(`SKIP  out/${file}: not rendered yet (${renderHint})`);
        continue;
      }
      const ok =
        kind === "mix"
          ? m.peak <= -1
          : Math.abs(m.lufs + 14) <= 0.5 && m.peak <= -1.5;
      if (!ok) fails++;
      console.log(
        `${ok ? "PASS" : "FAIL"}  out/${file}: ${m.lufs.toFixed(1)} LUFS integrated, true peak ${m.peak.toFixed(1)} dBTP, LRA ${m.lra.toFixed(1)} LU${kind === "mix" ? "  (pre-master, needs peak ≤ -1.0)" : ""}`,
      );
    }
  };

  const finish = () => {
    console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks passed");
    if (fails) process.exitCode = 1;
  };

  return {
    ts,
    check,
    expect,
    section,
    table,
    cueSheet,
    audioChecks,
    loudness,
    finish,
  };
};
