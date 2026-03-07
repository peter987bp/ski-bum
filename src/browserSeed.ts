export function createBrowserRngFromSearch(search: string): () => number {
  const params = new URLSearchParams(search);
  const seedParam = params.get('seed');
  if (seedParam === null) return Math.random;

  const seed = Number(seedParam);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647) {
    return Math.random;
  }

  let t = seed >>> 0;
  return function seededRandom(): number {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
