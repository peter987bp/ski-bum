import { createInitialGameState, setGameRunning } from '../../../src/core/stepGame.js';
import { GAME_CONFIG, MAX_SCROLL_SPEED_INCREASE, SIMULATION_CONFIG } from '../../../src/core/config.js';
import { stepSimulationTick } from '../../../src/core/runtimeAdapters.js';
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

  for (
    let y = SIMULATION_CONFIG.treeStartY;
    y <= targetDistance + SIMULATION_CONFIG.treeEndBuffer;
    y += SIMULATION_CONFIG.treeStepY
  ) {
    const leftBase = canvasWidth * (SIMULATION_CONFIG.leftTreeBaseStart + rand() * SIMULATION_CONFIG.treeBaseRange);
    const rightBase = canvasWidth * (SIMULATION_CONFIG.rightTreeBaseStart + rand() * SIMULATION_CONFIG.treeBaseRange);
    const variance = (rand() - 0.5) * SIMULATION_CONFIG.treeVariance;

    trees.push({
      x: Math.max(
        SIMULATION_CONFIG.treeMinXPadding,
        Math.min(canvasWidth - SIMULATION_CONFIG.treeMinXPadding, leftBase + variance)
      ),
      y,
      width: SIMULATION_CONFIG.treeWidthBase + rand() * SIMULATION_CONFIG.treeWidthRange,
      height: SIMULATION_CONFIG.treeHeightBase + rand() * SIMULATION_CONFIG.treeHeightRange
    });

    trees.push({
      x: Math.max(
        SIMULATION_CONFIG.treeMinXPadding,
        Math.min(canvasWidth - SIMULATION_CONFIG.treeMinXPadding, rightBase - variance)
      ),
      y: y + SIMULATION_CONFIG.rightTreeYOffset,
      width: SIMULATION_CONFIG.treeWidthBase + rand() * SIMULATION_CONFIG.treeWidthRange,
      height: SIMULATION_CONFIG.treeHeightBase + rand() * SIMULATION_CONFIG.treeHeightRange
    });
  }

  return trees;
}

export function initSimulation(seed: number): CoreGameState {
  const trees = buildSimulationTrees(seed, GAME_CONFIG.defaultTargetDistance, GAME_CONFIG.canvasWidth);
  const state = createInitialGameState({
    canvasWidth: GAME_CONFIG.canvasWidth,
    canvasHeight: GAME_CONFIG.canvasHeight,
    targetDistance: GAME_CONFIG.defaultTargetDistance,
    trees,
    startingScrollSpeed: GAME_CONFIG.baseScrollSpeed,
    maxScrollSpeedIncrease: MAX_SCROLL_SPEED_INCREASE
  });

  return setGameRunning(state, true);
}

export function simulationCommandsForStep(step: number): StepCommand[] {
  const atMs = (step * 1000) / SIMULATION_CONFIG.fixedFps;
  const cycle = step % 180;

  if (step === 0) return [{ direction: 'down', atMs }];
  if (cycle === 45) return [{ direction: 'left', atMs }];
  if (cycle === 90) return [{ direction: 'right', atMs }];
  if (cycle === 135) return [{ direction: 'down', atMs }];

  return [];
}

export function stepSimulation(state: CoreGameState, step: number): CoreGameState {
  return stepSimulationTick(
    state,
    step,
    simulationCommandsForStep,
    SIMULATION_CONFIG.fixedDtFrames
  );
}

export function runSimulation(input: SimulationInput): SimulationMetrics {
  const seconds = Math.max(1, Math.min(300, Math.floor(input.seconds)));
  const steps = seconds * SIMULATION_CONFIG.fixedFps;

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
