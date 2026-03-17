import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  setGameRunning,
  stepGame
} from '../../src/core/stepGame.ts';
import {
  GAME_CONFIG,
  MAX_SCROLL_SPEED_INCREASE,
  SIMULATION_CONFIG
} from '../../src/core/config.ts';
import {
  keyToStepDirection,
  stepBrowserFrame
} from '../../src/core/runtimeAdapters.ts';
import {
  initSimulation,
  runSimulation,
  simulationCommandsForStep,
  stepSimulation
} from '../src/sim/runSimulation.ts';

test('shared core step has deterministic known progression', () => {
  let state = createInitialGameState({
    canvasWidth: GAME_CONFIG.canvasWidth,
    canvasHeight: GAME_CONFIG.canvasHeight,
    targetDistance: GAME_CONFIG.defaultTargetDistance,
    trees: [],
    startingScrollSpeed: GAME_CONFIG.baseScrollSpeed,
    maxScrollSpeedIncrease: MAX_SCROLL_SPEED_INCREASE
  });

  state = setGameRunning(state, true);
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

test('core command semantics match browser control expectations', () => {
  let state = createInitialGameState({
    canvasWidth: GAME_CONFIG.canvasWidth,
    canvasHeight: GAME_CONFIG.canvasHeight,
    targetDistance: GAME_CONFIG.defaultTargetDistance,
    trees: [],
    startingScrollSpeed: GAME_CONFIG.baseScrollSpeed,
    maxScrollSpeedIncrease: MAX_SCROLL_SPEED_INCREASE
  });
  state = setGameRunning(state, true);

  state = stepGame(state, { commands: [{ direction: 'down', atMs: 0 }] }, 1);
  const singleDownSpeed = state.currentScrollSpeed;

  state = stepGame(state, { commands: [{ direction: 'down', atMs: 100 }] }, 1);
  assert.ok(state.currentScrollSpeed > singleDownSpeed);
  assert.equal(state.skier.vy, 3.4);

  state = stepGame(state, { commands: [{ direction: 'left', atMs: 200 }] }, 1);
  assert.equal(state.skier.vx, -2.55);

  state = stepGame(state, { commands: [{ direction: 'left', atMs: 300 }] }, 1);
  assert.equal(state.skier.vx, -5.1);

  state = stepGame(state, { commands: [{ direction: 'right', atMs: 400 }] }, 1);
  assert.equal(state.skier.vx, 2.55);

  state = stepGame(state, { commands: [{ direction: 'right', atMs: 500 }] }, 1);
  assert.equal(state.skier.vx, 5.1);

  state = stepGame(state, { commands: [{ direction: 'up', atMs: 600 }] }, 1);
  assert.equal(state.currentScrollSpeed, 0);
  assert.equal(state.skier.vx, 0);
  assert.equal(state.skier.vy, 0);
});

test('input mapping helper routes keyboard keys to step directions', () => {
  assert.equal(keyToStepDirection('ArrowLeft'), 'left');
  assert.equal(keyToStepDirection('ArrowRight'), 'right');
  assert.equal(keyToStepDirection('ArrowDown'), 'down');
  assert.equal(keyToStepDirection('ArrowUp'), 'up');
  assert.equal(keyToStepDirection('x'), null);
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

test('session helpers produce clean restart state for retry flows', () => {
  const seeded = initSimulation(777);
  let progressed = stepGame(
    seeded,
    { commands: [{ direction: 'down', atMs: 0 }, { direction: 'left', atMs: 50 }] },
    SIMULATION_CONFIG.fixedDtFrames
  );
  progressed = stepGame(progressed, { commands: [] }, SIMULATION_CONFIG.fixedDtFrames);
  assert.ok(progressed.distanceTraveled > 0);

  const restarted = createInitialGameState({
    canvasWidth: GAME_CONFIG.canvasWidth,
    canvasHeight: GAME_CONFIG.canvasHeight,
    targetDistance: GAME_CONFIG.defaultTargetDistance,
    trees: seeded.trees,
    startingScrollSpeed: GAME_CONFIG.baseScrollSpeed,
    maxScrollSpeedIncrease: MAX_SCROLL_SPEED_INCREASE
  });

  assert.equal(restarted.distanceTraveled, 0);
  assert.equal(restarted.crashed, false);
  assert.equal(restarted.runComplete, false);
  assert.equal(restarted.skier.x, GAME_CONFIG.canvasWidth / 2);
});

test('runSimulation is deterministic for identical inputs', () => {
  const first = runSimulation({ seed: 42, seconds: 40 });
  const second = runSimulation({ seed: 42, seconds: 40 });
  assert.deepEqual(second, first);
});

test('seed deterministically changes generated simulation world state', () => {
  const fromSeed42 = initSimulation(42);
  const fromSeed43 = initSimulation(43);
  const fromSeed42Again = initSimulation(42);

  assert.deepEqual(fromSeed42.trees, fromSeed42Again.trees);
  assert.notDeepEqual(fromSeed42.trees, fromSeed43.trees);
});

test('summary metrics can coincide across seeds for the fixed command script', () => {
  const seed42 = runSimulation({ seed: 42, seconds: 40 });
  const seed43 = runSimulation({ seed: 43, seconds: 40 });

  // Tree layouts differ by seed, but this fixed steering script can still
  // produce equal summary metrics for shorter windows.
  assert.deepEqual(
    {
      seconds: seed42.seconds,
      totalDistance: seed42.totalDistance,
      crashCount: seed42.crashCount,
      finalScrollSpeed: seed42.finalScrollSpeed,
      snowmanDistance: seed42.snowmanDistance
    },
    {
      seconds: seed43.seconds,
      totalDistance: seed43.totalDistance,
      crashCount: seed43.crashCount,
      finalScrollSpeed: seed43.finalScrollSpeed,
      snowmanDistance: seed43.snowmanDistance
    }
  );
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
