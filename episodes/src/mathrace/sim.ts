// Math Race simulation: a pure, deterministic function from config -> event timeline.
// No React, no Remotion imports, so `node scripts/report.ts` can run the exact same code
// the video renders from. Every frame of the video is derived from the returned data.

export type LaneRule = {
  /** Shown in captions/cards, e.g. "n³". */
  label: string;
  /** Damage dealt in round n. */
  power: (n: number) => number;
  /** Number of balls thrown in round n (power is split evenly between them). */
  balls: (n: number) => number;
};

export type LaneConfig = {
  /** Manifest character key, e.g. "anna". */
  character: string;
  displayName: string;
  rule: LaneRule;
  /** Subtitle on the header card, e.g. "many balls". */
  tagline: string;
  /** Visual radius (px) of one ball for a round with this power / ball count. */
  ballRadius: (power: number, balls: number) => number;
};

export type Trigger =
  | { type: "start" }
  | { type: "round"; n: number; at: "start" | "launch" | "impact" | "end" }
  | { type: "overtake" }
  | { type: "finish" };

export type RaceConfig = {
  seed: number;
  fps: number;
  /** Wall HP from top (start) to bottom (finish). */
  walls: number[];
  maxVisibleBalls: number;
  maxRounds: number;
  introSeconds: number;
  /** Seconds per round, index 0 = round 1. Missing entries reuse the last value. */
  roundSeconds: number[];
  celebrateSeconds: number;
  endingSeconds: number;
  transitionFrames: number;
  lanes: [LaneConfig, LaneConfig];
};

export type Ball = { x: number; launch: number; hit: number };

export type LaneRound = {
  power: number;
  balls: number;
  visibleBalls: number;
  /** Damage each visible ball represents. */
  perBall: number;
  before: number;
  after: number;
  /** Frame the lane starts throwing. */
  launch: number;
  /** Travel time of a ball from start zone to the wall, in frames. */
  travel: number;
  /** Damage ramps linearly from `before` to `after` between hitStart and hitEnd. */
  hitStart: number;
  hitEnd: number;
  breaks: { wall: number; frame: number }[];
  /** Frame this lane crossed the finish line, if it happened this round. */
  finishFrame: number | null;
  /** Visible balls (many-ball lanes) — x is a 0..1 fraction of lane width. */
  ballList: Ball[];
};

export type RoundData = {
  n: number;
  start: number;
  end: number;
  lanes: [LaneRound, LaneRound];
};

export type SfxType = "hit" | "crack" | "whoosh" | "win";
export type SfxEvent = { frame: number; type: SfxType; label: string };

export type RaceTimeline = {
  config: RaceConfig;
  totalHp: number;
  /** Cumulative HP thresholds: wall i breaks when damage >= cum[i]. */
  cum: number[];
  introFrames: number;
  rounds: RoundData[];
  winner: 0 | 1;
  finishFrame: number;
  finishRound: number;
  /** Last lead change to the eventual winner. */
  overtakeFrame: number;
  overtakeRound: number;
  /** Frames of the race scene (before the transition into the ending card). */
  raceFrames: number;
  endingFrames: number;
  totalFrames: number;
  sfx: SfxEvent[];
  /** Smallest N with right.power(n) > left.power(n) for every n >= N (checked up to 200). */
  permanentCrossover: number;
};

// --- deterministic PRNG -----------------------------------------------------
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const permanentCrossover = (left: LaneRule, right: LaneRule, upTo = 200) => {
  let n = upTo;
  while (n > 1 && right.power(n - 1) > left.power(n - 1)) n--;
  return n;
};

// --- simulation ---------------------------------------------------------------
export const simulateRace = (config: RaceConfig): RaceTimeline => {
  const { fps, walls } = config;
  const totalHp = walls.reduce((a, b) => a + b, 0);
  const cum: number[] = [];
  walls.reduce((acc, hp) => {
    cum.push(acc + hp);
    return acc + hp;
  }, 0);

  const introFrames = Math.round(config.introSeconds * fps);
  const rand = mulberry32(config.seed);
  const totals: [number, number] = [0, 0];
  const rounds: RoundData[] = [];
  let t = introFrames;
  let finish: { lane: 0 | 1; frame: number; round: number } | null = null;

  for (let n = 1; n <= config.maxRounds && !finish; n++) {
    const secs = config.roundSeconds[Math.min(n - 1, config.roundSeconds.length - 1)];
    const D = Math.round(secs * fps);
    const start = t;
    const lanes = config.lanes.map((lane, li): LaneRound => {
      const power = lane.rule.power(n);
      const balls = lane.rule.balls(n);
      const visibleBalls = Math.min(balls, config.maxVisibleBalls);
      const before = totals[li];
      const after = before + power;
      let launch: number;
      let travel: number;
      let hitStart: number;
      let hitEnd: number;
      const ballList: Ball[] = [];
      if (visibleBalls > 1) {
        // A stream of balls: launched over 36% of the round, each falls for 30%.
        launch = start + 0.04 * D;
        const window = 0.36 * D;
        travel = Math.max(6, 0.3 * D);
        hitStart = launch + travel;
        hitEnd = hitStart + window;
        for (let i = 0; i < visibleBalls; i++) {
          const l = launch + (window * (i + rand() * 0.8)) / visibleBalls;
          ballList.push({ x: 0.08 + rand() * 0.84, launch: l, hit: l + travel });
        }
      } else {
        // One ball: it grows at the start of the round, flies, then drills through walls.
        launch = start + 0.14 * D;
        travel = Math.max(8, 0.3 * D);
        hitStart = launch + travel;
        hitEnd = hitStart + Math.max(4, 0.22 * D);
      }
      const breaks: LaneRound["breaks"] = [];
      cum.forEach((c, wi) => {
        if (c > before && c <= after) {
          breaks.push({ wall: wi, frame: hitStart + ((c - before) / power) * (hitEnd - hitStart) });
        }
      });
      let finishFrame: number | null = null;
      if (before < totalHp && after >= totalHp) {
        finishFrame = hitStart + ((totalHp - before) / power) * (hitEnd - hitStart);
      }
      totals[li] = after;
      return {
        power,
        balls,
        visibleBalls,
        perBall: power / visibleBalls,
        before,
        after,
        launch,
        travel,
        hitStart,
        hitEnd,
        breaks,
        finishFrame,
        ballList,
      };
    }) as [LaneRound, LaneRound];

    rounds.push({ n, start, end: start + D, lanes });
    const fins = lanes
      .map((l, li) => ({ lane: li as 0 | 1, frame: l.finishFrame }))
      .filter((f): f is { lane: 0 | 1; frame: number } => f.frame !== null)
      .sort((a, b) => a.frame - b.frame);
    if (fins.length) finish = { ...fins[0], round: n };
    t = start + D;
  }

  if (!finish) throw new Error(`Nobody finished within ${config.maxRounds} rounds`);

  const partial: Omit<RaceTimeline, "overtakeFrame" | "overtakeRound" | "sfx" | "raceFrames" | "endingFrames" | "totalFrames"> = {
    config,
    totalHp,
    cum,
    introFrames,
    rounds,
    winner: finish.lane,
    finishFrame: finish.frame,
    finishRound: finish.round,
    permanentCrossover: permanentCrossover(config.lanes[0].rule, config.lanes[1].rule),
  };

  // Overtake: scan every frame, find the last moment the lead switched to the winner.
  let overtakeFrame = introFrames;
  let prevLeader = -1;
  for (let f = introFrames; f <= Math.ceil(finish.frame); f++) {
    const d0 = damageAt(partial as RaceTimeline, 0, f);
    const d1 = damageAt(partial as RaceTimeline, 1, f);
    const leader = d0 === d1 ? prevLeader : d0 > d1 ? 0 : 1;
    if (leader !== prevLeader && leader === finish.lane && prevLeader !== -1) overtakeFrame = f;
    prevLeader = leader;
  }
  const overtakeRound = roundAt(partial as RaceTimeline, overtakeFrame)?.n ?? 0;

  const lastRoundEnd = rounds[rounds.length - 1].end;
  const raceFrames = Math.ceil(Math.max(lastRoundEnd, finish.frame + config.celebrateSeconds * fps));
  const endingFrames = Math.round(config.endingSeconds * fps);
  const totalFrames = raceFrames + endingFrames - config.transitionFrames;

  // Sound-effect cue list (placeholders are wired to these exact frames).
  const sfx: SfxEvent[] = [];
  const names = config.lanes.map((l) => l.displayName);
  for (const r of rounds) {
    r.lanes.forEach((l, li) => {
      if (l.visibleBalls === 1) sfx.push({ frame: l.launch, type: "whoosh", label: `R${r.n} ${names[li]} throws (power ${l.power})` });
      sfx.push({ frame: l.hitStart, type: "hit", label: `R${r.n} ${names[li]} ${l.visibleBalls === 1 ? "ball hits" : "first balls hit"}` });
      for (const b of l.breaks) {
        sfx.push({ frame: b.frame, type: "crack", label: `R${r.n} ${names[li]} breaks wall ${b.wall + 1} (${config.walls[b.wall]} HP)` });
      }
    });
  }
  sfx.push({ frame: overtakeFrame, type: "whoosh", label: `OVERTAKE (${names[finish.lane]})` });
  sfx.push({ frame: finish.frame, type: "win", label: `${names[finish.lane]} reaches FINISH` });
  sfx.push({ frame: raceFrames - config.transitionFrames, type: "whoosh", label: "Iris transition into ending card" });
  sfx.forEach((s) => (s.frame = Math.round(s.frame)));
  sfx.sort((a, b) => a.frame - b.frame);

  return {
    ...partial,
    overtakeFrame,
    overtakeRound,
    raceFrames,
    endingFrames,
    totalFrames,
    sfx,
  };
};

// --- per-frame queries (used by components) -----------------------------------

export const roundAt = (tl: Pick<RaceTimeline, "rounds">, frame: number): RoundData | null => {
  let found: RoundData | null = null;
  for (const r of tl.rounds) if (frame >= r.start) found = r;
  return found;
};

/** Cumulative damage of a lane at a frame, capped at the total HP. */
export const damageAt = (tl: Pick<RaceTimeline, "rounds" | "totalHp">, lane: 0 | 1, frame: number) => {
  let d = 0;
  for (const r of tl.rounds) {
    const l = r.lanes[lane];
    if (frame < l.hitStart) break;
    d = l.before + clamp01((frame - l.hitStart) / (l.hitEnd - l.hitStart)) * l.power;
  }
  return Math.min(d, tl.totalHp);
};

/** Index of the first unbroken wall for a damage value (walls.length if all broken). */
export const frontWall = (tl: Pick<RaceTimeline, "cum">, damage: number) => {
  const i = tl.cum.findIndex((c) => damage < c);
  return i === -1 ? tl.cum.length : i;
};

export const resolveTrigger = (tl: RaceTimeline, trig: Trigger): number => {
  switch (trig.type) {
    case "start":
      return 0;
    case "overtake":
      return tl.overtakeFrame;
    case "finish":
      return Math.round(tl.finishFrame);
    case "round": {
      const r = tl.rounds[trig.n - 1];
      if (!r) return Infinity;
      if (trig.at === "start") return r.start;
      if (trig.at === "end") return r.end;
      const first = Math.min(...r.lanes.map((l) => (trig.at === "launch" ? l.launch : l.hitStart)));
      return Math.round(first);
    }
  }
};
