/** Small seeded PRNG (xorshift32 with splitmix-style seeding). Deterministic across runtimes. */
export interface Rng {
  next(): number; // [0, 1)
  int(maxExclusive: number): number;
  state(): number;
}

export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

export function createRng(seed: number): Rng {
  let x = (seed >>> 0) || 0x9e3779b9;
  const step = () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x;
  };
  return {
    next: () => step() / 0x100000000,
    int: (n) => {
      if (!Number.isInteger(n) || n <= 0) throw new RangeError('maxExclusive must be a positive integer');
      return step() % n;
    },
    state: () => x,
  };
}
