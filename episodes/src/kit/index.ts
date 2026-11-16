// Episode kit: everything an episode needs besides its own data, timeline, set and sound plan.
// Node scripts (reports) import ./report.ts directly; it is not re-exported here (it uses node:fs).
export * from "./overlays";
export { MASCOT_COLORS, MASCOT_NAMES, MASCOTS, type Mascot } from "./cast";
export { countUp, CountUp } from "./CountUp";
export { clamp, exitE, move, pop } from "./motion";
export { Soundtrack, soundtrackOnly } from "./Soundtrack";
export { DUR, EASE, FONT, fredoka, INK, INK_SOFT, PAPER, SAFE } from "./theme";
export { ACTOR_META, useCast, type CastMember } from "./useCast";
export { useFontReady } from "./useFontReady";
export { seeded, seededList } from "./random";
