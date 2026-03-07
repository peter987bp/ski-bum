import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createInitialGameState, stepGame } from '../dist/src/core/stepGame.js';
import {
  initSimulation,
  runSimulation,
  simulationCommandsForStep,
  stepSimulation
} from '../dist/mcp/src/sim/runSimulation.js';

test('shared core step has deterministic known progression', () => {
  let state = createInitialGameState({
    canvasWidth: 800,
    canvasHeight: 600,
    targetDistance: 5000,
    trees: [],
    startingScrollSpeed: 1.45,
    maxScrollSpeedIncrease: 1.45 * 0.35
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
  const totalSteps = seconds * 60;

  let fromWrapper = initSimulation(123);
  let fromDirect = initSimulation(123);

  for (let step = 0; step < totalSteps; step++) {
    fromWrapper = stepSimulation(fromWrapper, step);
    fromDirect = stepGame(fromDirect, { commands: simulationCommandsForStep(step) }, 1);

    if (fromWrapper.crashed || fromWrapper.runComplete) {
      break;
    }
  }

  assert.deepEqual(fromWrapper, fromDirect);
});

test('browser game loop is wired to shared core step function', () => {
  const gamePath = path.resolve(process.cwd(), '../src/game.ts');
  const source = fs.readFileSync(gamePath, 'utf8');

  assert.match(source, /from '\.\/core\/stepGame'/);
  assert.match(source, /stepGame\(this\.coreState/);
});
