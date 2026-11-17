// Report: data table + PASS/FAIL checks + cue sheet. Run: npm run report:template
import { createReport } from "../kit/report.ts";
import { captionReadability } from "../kit/captions.ts";
import { fmt, guesses, ORDER, SEED } from "./data.ts";
import { MUSIC_RANGE, soundtrack, VOICE_COOLDOWN } from "./sound.ts";
import { CAPTIONS, DURATION, FPS } from "./timeline.ts";

const r = createReport({ fps: FPS });

r.section(`Data (seed ${SEED})`);
const g = guesses();
r.table(
  ["mascot", "guess", "shown"],
  ORDER.map((m) => [m, g[m].toFixed(4), fmt(g[m])]),
);

r.cueSheet(soundtrack(), { duration: DURATION });

r.section("Checks");
r.check(
  "data is deterministic (same seed, same values)",
  JSON.stringify(guesses()) === JSON.stringify(g)
    ? []
    : ["guesses() changed between calls"],
);
r.check(
  `episode length is 5 s (template; real episodes 35-50 s)`,
  DURATION === 5 * FPS ? [] : [`${DURATION} frames`],
);
r.audioChecks(soundtrack(), {
  duration: DURATION,
  cooldown: VOICE_COOLDOWN,
  musicRange: MUSIC_RANGE,
});

// expectations from the episode prompt go here, e.g.:
// r.expect(`Moon: ${fmt2(h)} m (brief 3.03 m)`, fmt2(h) === "3.03");

r.loudness(
  [
    [".template-full.wav", "mix"],
    ["template.mp4", "final"],
  ],
  "npm run render:template",
);
r.check("captions stay up long enough to read (info pill ≥ 1.5 s, chat bubble ≥ 2.2 s)", captionReadability(CAPTIONS));
r.finish();
