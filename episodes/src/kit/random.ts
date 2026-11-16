// Seeded randomness (Series rule 2): the same seed always gives the same sequence, on every render and in
// the report. Never use Math.random() in an episode.

/** mulberry32: small, fast, good enough for visuals and toy simulations. Returns a generator in [0, 1). */
export const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** n values from one seed. */
export const seededList = (seed: number, n: number) => {
  const r = seeded(seed);
  return Array.from({ length: n }, r);
};
