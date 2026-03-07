import { createInitialGameState, stepGame } from '../../../src/core/stepGame.js';
import { CoreGameState, CoreTree, StepCommand } from '../../../src/core/types.js';

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

const FIXED_DT_FRAMES = 1;
const FIXED_FPS = 60;

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

function buildSimulationTrees(seed: number, targetDistance: number, canvasWidth: number): CoreTree[] {
  const rand = mulberry32(seed);
  const trees: CoreTree[] = [];

  for (let y = 140; y <= targetDistance + 220; y += 75) {
    const leftBase = canvasWidth * (0.13 + rand() * 0.12);
    const rightBase = canvasWidth * (0.75 + rand() * 0.12);
    const variance = (rand() - 0.5) * 24;

    trees.push({
      x: Math.max(20, Math.min(canvasWidth - 20, leftBase + variance)),
      y,
      width: 34 + rand() * 12,
      height: 52 + rand() * 20
    });

    trees.push({
      x: Math.max(20, Math.min(canvasWidth - 20, rightBase - variance)),
      y: y + 14,
      width: 34 + rand() * 12,
      height: 52 + rand() * 20
    });
  }

  return trees;
}

export function initSimulation(seed: number): CoreGameState {
  const trees = buildSimulationTrees(seed, 5000, 800);
  const state = createInitialGameState({
    canvasWidth: 800,
    canvasHeight: 600,
    targetDistance: 5000,
    trees,
    startingScrollSpeed: 1.45,
    maxScrollSpeedIncrease: 1.45 * 0.35
  });

  state.isRunning = true;
  return state;
}

export function simulationCommandsForStep(step: number): StepCommand[] {
  const atMs = (step * 1000) / FIXED_FPS;
  const cycle = step % 180;

  if (step === 0) return [{ direction: 'down', atMs }];
  if (cycle === 45) return [{ direction: 'left', atMs }];
  if (cycle === 90) return [{ direction: 'right', atMs }];
  if (cycle === 135) return [{ direction: 'down', atMs }];

  return [];
}

export function stepSimulation(state: CoreGameState, step: number): CoreGameState {
  return stepGame(state, { commands: simulationCommandsForStep(step) }, FIXED_DT_FRAMES);
}

export function runSimulation(input: SimulationInput): SimulationMetrics {
  const seconds = Math.max(1, Math.min(300, Math.floor(input.seconds)));
  const steps = seconds * FIXED_FPS;

  let state = initSimulation(input.seed);

  for (let i = 0; i < steps; i++) {
    state = stepSimulation(state, i);
    if (state.crashed || state.runComplete) {
      break;
    }
  }

  return {
    seed: input.seed,
    seconds,
    totalDistance: Math.round(state.distanceTraveled),
    crashCount: state.crashCount,
    finalScrollSpeed: Math.round(state.currentScrollSpeed * 100) / 100,
    snowmanDistance: Math.round((state.worldOffset - state.snowman.worldY) * 100) / 100
  };
}
