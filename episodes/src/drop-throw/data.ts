// DATA FIRST (EP03 "Drop vs Throw"): every number the episode shows comes from these pure functions.
// The report (npm run report:drop-throw) prints them and checks them against the episode prompt.
//
// Model: two balls leave the same height H on the same instant, no air drag (Badge "no air drag").
//   dropped: x(t) = 0,        y(t) = H − g t² / 2
//   thrown:  x(t) = VX · t,   y(t) = H − g t² / 2      (horizontal launch, no vertical speed)
//   → both land at t = sqrt(2H / g); the thrown ball lands VX · t from the edge.
// x is measured from the release point (the balcony edge plumb line, the "0" of the floor tape).

/** Cast in screen order, left → right (Zuzu + Anna on the balcony, Miyu + Lumi on the floor). */
export const ORDER = ["zuzu", "anna", "miyu", "lumi"] as const;
export type Member = (typeof ORDER)[number];

/** Release height: the ball's lowest point at release to the floor (m); a ball "lands" when it touches the floor. */
export const H = 2;
/** Earth gravity (m/s²). */
export const G = 9.81;
/** Horizontal throw speed (m/s). */
export const VX = 3;
/** Slow-motion factor of the release → landing shot (Badge "4x SLOW-MO"). */
export const SLOWMO = 4;
/** Ball radius (m): oversized for phone readability next to 1 m chibis. Picture only, not part of the physics. */
export const BALL_R = 0.075;
/** Ghost copies in the side-view replay, every GHOST_DT seconds of real time. */
export const GHOST_DT = 0.08;

export type BallId = "dropped" | "thrown";
export const BALLS: BallId[] = ["dropped", "thrown"];
/** Who releases which ball. */
export const BALL_OWNER: Record<BallId, Member> = { dropped: "zuzu", thrown: "anna" };

/** Horizontal launch speed of a ball (m/s). */
export const launchSpeed = (b: BallId) => (b === "thrown" ? VX : 0);

/** Landing time (s): the same closed form for both balls, the one value used by picture, timer, cards and report. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same closed form for both balls, the id is kept for call sites
export const landTime = (_b: BallId) => Math.sqrt((2 * H) / G);

/** Ball at t seconds after release: x from the edge (m), y = height of its lowest point above the floor (m), clamped at landing.
 * The 3D ball is drawn with its centre at y + BALL_R. */
export const ballAt = (b: BallId, t: number): { x: number; y: number } => {
  const tt = Math.min(Math.max(t, 0), landTime(b));
  return { x: launchSpeed(b) * tt, y: Math.max(0, H - 0.5 * G * tt * tt) };
};

/** Horizontal distance from the edge where a ball lands (m). */
export const landDistance = (b: BallId) => ballAt(b, landTime(b)).x;

/** Vertical speed at landing (m/s, downward). */
export const impactSpeedY = (b: BallId) => G * landTime(b);

/** Ghost sample times for the replay: every GHOST_DT up to (not past) the landing, plus the landing itself. */
export const ghostTimes = (b: BallId): number[] => {
  const T = landTime(b);
  const out: number[] = [];
  for (let k = 0; k * GHOST_DT < T - 1e-9; k++) out.push(Number((k * GHOST_DT).toFixed(6)));
  out.push(T);
  return out;
};

/** The one rounding rule for on-screen times and distances in this episode. */
export const fmt = (x: number) => x.toFixed(2);

export type BallRow = { ball: BallId; owner: Member; vx: number; t: number; x: number; vy: number };

export const ballTable = (): BallRow[] =>
  BALLS.map((ball) => ({
    ball,
    owner: BALL_OWNER[ball],
    vx: launchSpeed(ball),
    t: landTime(ball),
    x: landDistance(ball),
    vy: impactSpeedY(ball),
  }));

/** Reference integration (semi-implicit Euler, tiny step) used by the report to cross-check the closed form. */
export const integrateLanding = (b: BallId, dt = 1e-6) => {
  let x = 0;
  let y = H;
  let vy = 0;
  let t = 0;
  const vx = launchSpeed(b);
  while (y > 0) {
    vy -= G * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }
  const back = y / (vy || -1); // overshoot time below the floor in the last step (y, vy both ≤ 0)
  return { t: t - back, x: x - vx * back };
};
