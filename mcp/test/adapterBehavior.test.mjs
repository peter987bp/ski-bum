import test from "node:test";
import assert from "node:assert/strict";
import { buildCoreObstaclesFromCourseObjects } from "../dist/src/core/progression.js";
import { createDefaultGameCoreConfig, createInitialGameState } from "../dist/src/core/gameCore.js";
import { withMenuClosed, withMenuOpened, withQueuedGameplayInput } from "../dist/src/gameAdapterControls.js";
import { applyGameAdapterFixedStep, createBrowserCourseGenerator, createGameCourseProgression } from "../dist/src/gameAdapterRuntime.js";

function obstaclesSignature(obstacles) {
  return obstacles.slice(0, 8).map((o) => [
    Math.round(o.x * 1000) / 1000,
    Math.round(o.y * 1000) / 1000,
    Math.round(o.width * 1000) / 1000,
    Math.round(o.height * 1000) / 1000,
  ]);
}

test("game adapter browser seed path produces deterministic shared progression", () => {
  const first = createBrowserCourseSnapshot("?seed=42");
  const second = createBrowserCourseSnapshot("?seed=42");
  const other = createBrowserCourseSnapshot("?seed=43");

  assert.deepEqual(obstaclesSignature(first), obstaclesSignature(second));
  assert.notDeepEqual(obstaclesSignature(first), obstaclesSignature(other));

  // Stable known-seed expectation (rounded snapshot for regression detection).
  assert.deepEqual(obstaclesSignature(first), [
    [194.016, 100, 40.325, 60.488],
    [720, 100, 45.15, 67.725],
    [80, 343.088, 33.929, 50.894],
    [607.41, 343.088, 47.93, 71.895],
    [160, 600, 41.005, 61.507],
    [240, 600, 46.658, 69.987],
    [544, 757.208, 38.944, 58.416],
    [624, 757.208, 41.255, 61.883],
  ]);
});

test("Game adapter entrypoint honors URL seed for progression wiring", () => {
  const first = createGameCourseProgression("?seed=42", 800, 1).obstacles;
  const second = createGameCourseProgression("?seed=42", 800, 1).obstacles;
  const other = createGameCourseProgression("?seed=43", 800, 1).obstacles;

  assert.deepEqual(obstaclesSignature(first), obstaclesSignature(second));
  assert.notDeepEqual(obstaclesSignature(first), obstaclesSignature(other));
});

test("pause boundary prevents stale input replay at adapter fixed-step consumption", () => {
  const config = createDefaultGameCoreConfig();
  let coreState = createInitialGameState({ config, obstacles: [] });
  let pendingInputs = ["left"];
  let state = {
    isRunning: true,
    isMenuPaused: false,
    isTerminal: false,
    pendingInputs,
  };

  state = withMenuOpened(state);
  state = withQueuedGameplayInput(state, "right");
  state = withMenuClosed(state);
  assert.deepEqual(state.pendingInputs, []);

  const beforeX = coreState.player.x;
  const stepped = applyGameAdapterFixedStep(coreState, config, state.pendingInputs, 1 / 60);
  coreState = stepped.coreState;
  pendingInputs = stepped.pendingInputs;

  assert.equal(coreState.player.x, beforeX);
  assert.deepEqual(pendingInputs, []);
});

function createBrowserCourseSnapshot(search) {
  const { rng, courseGenerator } = createBrowserCourseGenerator(search, 800);
  const course = courseGenerator.createSimpleCourse(1);
  const objects = courseGenerator.getAllObjects(course);
  return buildCoreObstaclesFromCourseObjects(objects, rng);
}
