// src/rng.js — browser CSPRNG wrapper using window.crypto.getRandomValues.
// Per inline-deviation dev-002, this is the client-dealer fallback's RNG.
// Cloud Functions path uses Node crypto.randomBytes (functions/src/shuffle.js).

export function randomInt(maxExclusive) {
  // Reject-sample uniformly in [0, maxExclusive).
  if (maxExclusive <= 0) throw new RangeError("maxExclusive must be > 0");
  const max = Math.floor(maxExclusive);
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let v;
  do { window.crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % max;
}

export function shuffleInPlace(arr) {
  // Fisher-Yates with CSPRNG.
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
