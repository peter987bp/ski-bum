import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState, stepGame } from '../dist/src/core/stepGame.js';
import { GAME_CONFIG, MAX_SCROLL_SPEED_INCREASE, SIMULATION_CONFIG } from '../dist/src/core/config.js';
import { stepBrowserFrame } from '../dist/src/core/runtimeAdapters.js';
import {
  initSimulation,
  runSimulation,
  simulationCommandsForStep,
  stepSimulation
} from '../dist/mcp/src/sim/runSimulation.js';

test('shared core step has deterministic known progression', () => {
  let state = createInitialGameState({
    canvasWidth: GAME_CONFIG.canvasWidth,
    canvasHeight: GAME_CONFIG.canvasHeight,
    targetDistance: GAME_CONFIG.defaultTargetDistance,
    trees: [],
    startingScrollSpeed: GAME_CONFIG.baseScrollSpeed,
    maxScrollSpeedIncrease: MAX_SCROLL_SPEED_INCREASE
  });

  state = stepGame(state, { commands: [{ direction: 'down', atMs: 0 }] }, 1);
  assert.equal(state.distanceTraveled, 1.45);
  assert.equal(state.currentScrollSpeed, 1.45);
  assert.equal(state.skier.vx, 0);
  assert.equal(state.skier.vy, 1.7);

  state = stepGame(state, { commands: [{ direction: 'left', atMs: 50 }] }, 1);
  assert.equal(Math.round(state.skier.x * 100) / 100, 397.45);
  assert.equal(state.skier.vx, -2.55);
  assert.equal(Math.round(state.distanceTraveled * 1000) / 1000, 2.9);
});

test('runSimulation is deterministic for identical inputs', () => {
  const first = runSimulation({ seed: 42, seconds: 40 });
  const second = runSimulation({ seed: 42, seconds: 40 });
  assert.deepEqual(second, first);
});

test('simulation wrapper matches direct shared step loop', () => {
  const seconds = 20;
  const totalSteps = seconds * SIMULATION_CONFIG.fixedFps;

  let fromWrapper = initSimulation(123);
  let fromDirect = initSimulation(123);

  for (let step = 0; step < totalSteps; step++) {
    fromWrapper = stepSimulation(fromWrapper, step);
    fromDirect = stepGame(
      fromDirect,
      { commands: simulationCommandsForStep(step) },
      SIMULATION_CONFIG.fixedDtFrames
    );

    if (fromWrapper.crashed || fromWrapper.runComplete) {
      break;
    }
  }

  assert.deepEqual(fromWrapper, fromDirect);
});

test('browser adapter and simulation adapter stay in lockstep for same inputs', () => {
  const seconds = 8;
  const totalSteps = seconds * SIMULATION_CONFIG.fixedFps;
  let browserPathState = initSimulation(999);
  let simulationPathState = initSimulation(999);

  for (let step = 0; step < totalSteps; step++) {
    const commands = simulationCommandsForStep(step);
    browserPathState = stepBrowserFrame(
      browserPathState,
      commands,
      SIMULATION_CONFIG.fixedDtFrames
    );
    simulationPathState = stepSimulation(simulationPathState, step);

    assert.deepEqual(simulationPathState, browserPathState);
    if (simulationPathState.crashed || simulationPathState.runComplete) break;
  }
});

test('runSimulation produces deterministic metrics for known input', () => {
  const actual = runSimulation({ seed: 42, seconds: 40 });
  assert.deepEqual(actual, {
    seed: 42,
    seconds: 40,
    totalDistance: 3940,
    crashCount: 0,
    finalScrollSpeed: 1.85,
    snowmanDistance: 129.7
  });
});
