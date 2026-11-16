// Physics table, soundtrack cue sheet and checks for "Same Jump, Different Planets" (same functions the video uses).
// Run: npm run report:jump
import { createReport } from "../src/kit/report.ts";
import { fmt2, physicsTable, V0, V0_LABEL } from "../src/jump/physics.ts";
import {
  CTA_GROUP,
  MUSIC_RANGE,
  soundtrack,
  VOICE_COOLDOWN,
} from "../src/jump/sound.ts";
import {
  BEAT,
  DURATION,
  FPS,
  landFrame,
  peakFrame,
  SLOWMO,
  SLOWMO_END,
} from "../src/jump/timeline.ts";

const r = createReport({ fps: FPS });
const { ts } = r;

r.section(`Physics (v = ${V0} m/s, h = v²/2g, T = 2v/g)`);
r.table(
  [
    "planet",
    "mascot",
    "g (m/s²)",
    "height (m)",
    "airtime (s)",
    "t_peak (s)",
    "peak @",
    "lands @",
  ],
  physicsTable().map((row) => {
    const id = row.planet.toLowerCase() as
      | "moon"
      | "mars"
      | "earth"
      | "jupiter";
    return [
      row.planet,
      row.mascot,
      row.g.toFixed(2),
      row.height.toFixed(3),
      row.airtime.toFixed(3),
      row.tPeak.toFixed(3),
      ts(peakFrame(id)),
      ts(landFrame(id)),
    ];
  }),
);
console.log(
  `\ntakeoff @ ${ts(BEAT.takeoff)} (frame ${BEAT.takeoff}); slow-mo ${SLOWMO}x until ${ts(SLOWMO_END)} (frame ${SLOWMO_END})`,
);

const sound = soundtrack();
r.cueSheet(sound, { duration: DURATION });

r.section("Checks");
r.audioChecks(sound, {
  duration: DURATION,
  cooldown: VOICE_COOLDOWN,
  group: CTA_GROUP,
  musicRange: MUSIC_RANGE,
});

// expectations from the brief (rounded as given there)
// every on-screen number uses fmt2 (2 decimals); these are the values the video must show
const exp: Record<string, [string, string]> = {
  Moon: ["3.03", "3.87"],
  Mars: ["1.32", "1.69"],
  Earth: ["0.50", "0.64"],
  Jupiter: ["0.20", "0.25"],
};
r.section(`Displayed values vs brief (v shown as ${V0_LABEL} m/s)`);
for (const row of physicsTable()) {
  const [h, T] = exp[row.planet];
  r.expect(
    `${row.planet}: ${fmt2(row.height)} m / ${fmt2(row.airtime)} s  (brief ${h} m / ${T} s)`,
    fmt2(row.height) === h && fmt2(row.airtime) === T,
  );
}

r.loudness(
  [
    [".same-jump-full.wav", "mix"],
    [".same-jump-nomusic.wav", "mix"],
    ["same-jump-different-planets.mp4", "final"],
    ["same-jump-different-planets_nomusic.mp4", "final"],
  ],
  "npm run render:jump",
);
r.finish();
