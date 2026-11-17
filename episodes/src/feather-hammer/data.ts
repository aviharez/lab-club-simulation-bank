// DATA FIRST (EP02 "Feather vs Hammer"): every number the episode shows comes from these pure functions.
// The report (npm run report:feather-hammer) prints them and checks them against the episode prompt.
//
// Model: an object dropped from rest at height H.
//   vacuum: no drag            y(t) = g t² / 2                      → t_land = sqrt(2H / g)
//   air:    quadratic drag     m dv/dt = m g − k v²,  v_t = sqrt(m g / k)
//           v(t) = v_t tanh(g t / v_t),  y(t) = (v_t² / g) ln cosh(g t / v_t)
//           → t_land = (v_t / g) arcosh(exp(g H / v_t²))
// On screen this is labelled "simplified air drag" (one constant drag coefficient, no tumbling, no air currents).

/** Cast in screen order, left → right. */
export const ORDER = ["miyu", "anna", "zuzu", "lumi"] as const;
export type Member = (typeof ORDER)[number];

/** Drop height: release ledge to the tube floor (m). */
export const H = 3;
/** Earth gravity (m/s²). */
export const G = 9.81;
/** Air density at sea level, 15 °C (kg/m³). */
export const RHO_AIR = 1.225;

export type ObjectId = "hammer" | "feather";
export type Medium = "air" | "vacuum";

/** Terminal velocity of the feather in air (brief: ~0.4 m/s; typical for a fluffy feather). */
export const FEATHER_VT = 0.4;

/** Hammer: steel geologist's hammer (Apollo 15 class, 1.32 kg). Drag only to show it is negligible. */
export const HAMMER = { mass: 1.32, area: 0.0035, cd: 1.0 };
/** v_t = sqrt(2 m g / (ρ Cd A)) */
export const HAMMER_VT = Math.sqrt(
  (2 * HAMMER.mass * G) / (RHO_AIR * HAMMER.cd * HAMMER.area),
);

/** Terminal velocity for an object in a medium (Infinity = no drag). */
export const terminalVelocity = (o: ObjectId, m: Medium) =>
  m === "vacuum" ? Infinity : o === "feather" ? FEATHER_VT : HAMMER_VT;

/** ln(cosh x) without overflow (x ≥ 0). */
const lnCosh = (x: number) => x + Math.log1p(Math.exp(-2 * x)) - Math.LN2;
/** arcosh(exp(a)) without overflow (a ≥ 0). */
const arcoshExp = (a: number) => a + Math.log1p(Math.sqrt(-Math.expm1(-2 * a)));

/** Distance fallen after t seconds (m), from rest. */
export const fallen = (vt: number, t: number) => {
  if (t <= 0) return 0;
  if (!Number.isFinite(vt)) return 0.5 * G * t * t;
  return ((vt * vt) / G) * lnCosh((G * t) / vt);
};

/** Speed after t seconds (m/s). */
export const speed = (vt: number, t: number) =>
  t <= 0 ? 0 : Number.isFinite(vt) ? vt * Math.tanh((G * t) / vt) : G * t;

/** Time to fall height h (s). */
export const fallTime = (vt: number, h = H) =>
  Number.isFinite(vt)
    ? (vt / G) * arcoshExp((G * h) / (vt * vt))
    : Math.sqrt((2 * h) / G);

/** Landing time of an object in a medium (s). The one value used by picture, timers, cards and report. */
export const landTime = (o: ObjectId, m: Medium) =>
  fallTime(terminalVelocity(o, m));

/** Height above the tube floor at t seconds after release (m), clamped at the floor. */
export const heightAt = (o: ObjectId, m: Medium, t: number) =>
  t >= landTime(o, m) ? 0 : Math.max(0, H - fallen(terminalVelocity(o, m), t));

/** The one rounding rule for on-screen times and heights in this episode. */
export const fmt = (x: number) => x.toFixed(2);

export type DropRow = {
  object: ObjectId;
  medium: Medium;
  vt: number;
  t: number;
  impact: number;
};

export const dropTable = (): DropRow[] =>
  (["air", "vacuum"] as Medium[]).flatMap((medium) =>
    (["hammer", "feather"] as ObjectId[]).map((object) => {
      const vt = terminalVelocity(object, medium);
      const t = landTime(object, medium);
      return { object, medium, vt, t, impact: speed(vt, t) };
    }),
  );

/** Reference integration (semi-implicit Euler, tiny step) used by the report to cross-check the closed form. */
export const integrateFallTime = (vt: number, h = H, dt = 1e-5) => {
  let y = 0;
  let v = 0;
  let t = 0;
  const k = Number.isFinite(vt) ? G / (vt * vt) : 0;
  while (y < h) {
    v += (G - k * v * v) * dt;
    y += v * dt;
    t += dt;
  }
  // interpolate the crossing inside the last step
  return t - ((y - h) / (v || 1));
};
