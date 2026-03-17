import {
  GameCoreConfig,
  GameCoreState,
  GameInput,
  createDefaultGameCoreConfig,
  createInitialGameState,
  stepGameFixed,
} from '../../../src/core/gameCore.js';
import { CourseGenerator } from '../../../src/course.js';
import { buildCoreObstaclesFromCourseObjects } from '../../../src/core/progression.js';

type SimulationInput = {
  seed: number;
  seconds: number;
};

export type NormalizedSimulationInput = {
  seed: number;
  seconds: number;
};

export const SIMULATION_SEED_MIN = 0;
export const SIMULATION_SEED_MAX = 2_147_483_647;
export const SIMULATION_SECONDS_MIN = 1;
export const SIMULATION_SECONDS_MAX = 300;

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
  dtSec: number;
  totalSteps: number;
  stepIndex: number;
  crashCount: number;
  coreConfig: GameCoreConfig;
  coreState: GameCoreState;
  rand: () => number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function initSimulation(seed: number, secondsInput: number): SimulationState {
  const normalized = normalizeSimulationInput({ seed, seconds: secondsInput });
  const seconds = normalized.seconds;
  const dtSec = 1 / 60;
  const totalSteps = Math.floor(seconds / dtSec);
  const rand = mulberry32(normalized.seed);

  const coreConfig = createDefaultGameCoreConfig({
    worldWidth: 800,
    playerStartX: 400,
    playerScreenY: 200,
    baseScrollSpeed: 1.45 * 60,
  });

  const courseGenerator = new CourseGenerator(coreConfig.worldWidth, rand);
  const course = courseGenerator.createSimpleCourse(1.0);
  const objects = courseGenerator.getAllObjects(course);
  const obstacles = buildCoreObstaclesFromCourseObjects(objects, rand);
  coreConfig.targetDistance = course.totalLength;
  const coreState = createInitialGameState({
    config: coreConfig,
    obstacles,
  });

  return {
    seed: normalized.seed,
    seconds,
    dtSec,
    totalSteps,
    stepIndex: 0,
    crashCount: 0,
    coreConfig,
    coreState,
    rand,
  };
}

export function stepSimulation(state: SimulationState, dtSec: number = state.dtSec): boolean {
  if (state.coreState.crashed || state.coreState.runComplete || state.stepIndex >= state.totalSteps) {
    return true;
  }

  const input = nextDeterministicInput(state.rand);
  state.coreState = stepGameFixed(state.coreState, input, dtSec, 1, state.coreConfig);
  state.stepIndex += 1;

  if (state.coreState.crashed) {
    state.crashCount += 1;
    return true;
  }

  return state.coreState.runComplete || state.stepIndex >= state.totalSteps;
}

export function runSimulation(input: SimulationInput): SimulationMetrics {
  const normalized = normalizeSimulationInput(input);
  const state = initSimulation(normalized.seed, normalized.seconds);

  while (!stepSimulation(state, state.dtSec)) {
    // fixed-step deterministic loop
  }

  const snowmanDistance = state.coreState.worldOffset - state.coreState.snowman.worldY;

  return {
    seed: state.seed,
    seconds: state.seconds,
    totalDistance: Math.round(state.coreState.distanceTraveled),
    crashCount: state.crashCount,
    finalScrollSpeed: round2(state.coreState.scroll.currentSpeed),
    snowmanDistance: round2(snowmanDistance),
  };
}

export function normalizeSimulationInput(input: SimulationInput): NormalizedSimulationInput {
  return {
    seed: normalizeSimulationSeed(input.seed),
    seconds: normalizeSimulationSeconds(input.seconds),
  };
}

export function normalizeSimulationSeed(seed: number): number {
  if (!Number.isInteger(seed)) {
    throw new Error("Simulation seed must be an integer.");
  }

  if (seed < SIMULATION_SEED_MIN || seed > SIMULATION_SEED_MAX) {
    throw new Error(`Simulation seed must be between ${SIMULATION_SEED_MIN} and ${SIMULATION_SEED_MAX}.`);
  }

  return seed;
}

export function normalizeSimulationSeconds(seconds: number): number {
  if (!Number.isInteger(seconds)) {
    throw new Error("Simulation seconds must be an integer.");
  }

  if (seconds < SIMULATION_SECONDS_MIN || seconds > SIMULATION_SECONDS_MAX) {
    throw new Error(
      `Simulation seconds must be between ${SIMULATION_SECONDS_MIN} and ${SIMULATION_SECONDS_MAX}.`,
    );
  }

  return seconds;
}

function nextDeterministicInput(rand: () => number): GameInput {
  const roll = rand();

  if (roll < 0.06) return { intent: 'left', justPressed: true };
  if (roll < 0.12) return { intent: 'right', justPressed: true };
  if (roll < 0.16) return { intent: 'down', justPressed: true };
  if (roll < 0.165) return { intent: 'up', justPressed: true };

  return { intent: 'none', justPressed: false };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
