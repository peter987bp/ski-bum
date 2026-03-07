type SimulationInput = {
  seed: number;
  seconds: number;
};

export type SimulationMetrics = {
  seed: number;
  seconds: number;
  totalDistance: number;
  crashCount: number;
  finalScrollSpeed: number;
  snowmanDistance: number;
};

export type SimulationState = {
  seed: number;
  seconds: number;
  scrollSpeed: number;
  accelPerSec: number;
  totalDistance: number;
  crashCount: number;
  snowmanDistance: number;
};

const MIN_SEED = 0;
const MAX_SEED = 2_147_483_647;
const MIN_SECONDS = 1;
const MAX_SECONDS = 300;

// Small deterministic PRNG (Mulberry32)
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function rand() {
    state += 0x6D2B79F5;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function validateSeed(seedInput: number): number {
  if (!Number.isFinite(seedInput)) {
    throw new TypeError("seed must be a finite number");
  }
  const seed = Math.floor(seedInput);
  if (seed < MIN_SEED || seed > MAX_SEED) {
    throw new RangeError(`seed must be between ${MIN_SEED} and ${MAX_SEED}`);
  }
  return seed;
}

function clampSeconds(secondsInput: number): number {
  if (!Number.isFinite(secondsInput)) {
    throw new TypeError("seconds must be a finite number");
  }
  return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.floor(secondsInput)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function initSimulation(seed: number, seconds: number): SimulationState {
  return {
    seed,
    seconds,
    scrollSpeed: 220,
    accelPerSec: 8,
    totalDistance: 0,
    crashCount: 0,
    snowmanDistance: 260,
  };
}

export function stepSimulation(state: SimulationState, dt: number, rng: () => number): boolean {
  // Speed ramps over time (placeholder for your course/difficulty curve)
  state.scrollSpeed += state.accelPerSec * dt;

  // Distance integrates in world space
  state.totalDistance += state.scrollSpeed * dt;

  // Crash model: probability increases slightly as speed rises.
  // A crash event ends this frame early, preventing any second crash increment.
  const crashProb = Math.min(0.002 + (state.scrollSpeed - 220) * 0.000002, 0.02);
  if (rng() < crashProb) {
    state.crashCount += 1;
    state.scrollSpeed *= 0.92;
    state.snowmanDistance -= 6;
    state.snowmanDistance = Math.max(-50, Math.min(1000, state.snowmanDistance));
    if (state.snowmanDistance <= 0) {
      return true;
    }
    return false;
  }

  // Snowman behavior: closes as speed increases + random pressure
  const pressure = 0.6 + rng() * 0.8;
  state.snowmanDistance -= pressure * dt * (1.2 + state.scrollSpeed / 400);

  // But player also “pulls away” when fast (net effect)
  state.snowmanDistance += dt * 0.35 * (state.scrollSpeed / 220);

  // Keep values bounded
  state.snowmanDistance = Math.max(-50, Math.min(1000, state.snowmanDistance));

  // Catch is terminal and exclusive for this frame.
  if (state.snowmanDistance <= 0) {
    state.crashCount += 1;
    return true;
  }

  return false;
}

function finalizeMetrics(state: SimulationState): SimulationMetrics {
  return {
    seed: state.seed,
    seconds: state.seconds,
    totalDistance: Math.round(state.totalDistance),
    crashCount: state.crashCount,
    finalScrollSpeed: round2(state.scrollSpeed),
    snowmanDistance: round2(state.snowmanDistance),
  };
}

/**
 * MVP headless simulation.
 * - No DOM/canvas.
 * - Deterministic for (seed, seconds).
 * - Returns metrics you care about.
 *
 * Later you’ll replace internal helpers with shared game-core logic.
 */
export function runSimulation(input: SimulationInput): SimulationMetrics {
  const seed = validateSeed(input.seed);
  const seconds = clampSeconds(input.seconds);
  const rng = mulberry32(seed);

  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  const state = initSimulation(seed, seconds);

  for (let i = 0; i < steps; i++) {
    const shouldTerminate = stepSimulation(state, dt, rng);
    if (shouldTerminate) {
      break;
    }
  }

  return finalizeMetrics(state);
}
