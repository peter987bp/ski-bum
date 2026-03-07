import {
  GameCoreConfig,
  GameCoreState,
  GameInput,
  createDefaultGameCoreConfig,
  createInitialGameState,
  stepGameFixed,
} from "../../../src/core/gameCore.js";
import { CourseGenerator } from "../../../src/course.js";
import { buildCoreObstaclesFromCourseObjects } from "../../../src/core/progression.js";

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
  dtSec: number;
  totalSteps: number;
  stepIndex: number;
  crashCount: number;
  coreConfig: GameCoreConfig;
  coreState: GameCoreState;
  rand: () => number;
};

// Small deterministic PRNG (Mulberry32)
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
  const seconds = Math.max(1, Math.min(300, Math.floor(secondsInput)));
  const dtSec = 1 / 60;
  const totalSteps = Math.floor(seconds / dtSec);
  const rand = mulberry32(seed);

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
    seed,
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
  const state = initSimulation(input.seed, input.seconds);

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

function nextDeterministicInput(rand: () => number): GameInput {
  const roll = rand();

  if (roll < 0.06) return { intent: "left", justPressed: true };
  if (roll < 0.12) return { intent: "right", justPressed: true };
  if (roll < 0.16) return { intent: "down", justPressed: true };
  if (roll < 0.165) return { intent: "up", justPressed: true };

  return { intent: "none", justPressed: false };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
