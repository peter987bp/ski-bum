import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultGameCoreConfig,
  createInitialGameState,
  stepGame,
  stepGameFixed,
} from "../dist/src/core/gameCore.js";
import { CourseGenerator } from "../dist/src/course.js";
import { buildCoreObstaclesFromCourseObjects, createCourseProgression } from "../dist/src/core/progression.js";
import { shouldQueueGameplayInput } from "../dist/src/inputPolicy.js";

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

test("stepGameFixed matches repeated stepGame", () => {
  const config = createDefaultGameCoreConfig();
  const initial = createInitialGameState({ config, obstacles: [] });
  const input = { intent: "down", justPressed: true };

  const fixedState = stepGameFixed(initial, input, 1 / 60, 120, config);

  let iterativeState = initial;
  for (let i = 0; i < 120; i += 1) {
    iterativeState = stepGame(iterativeState, input, 1 / 60, config);
  }

  assert.deepEqual(fixedState, iterativeState);
});

test("terminal states are inert to further input", () => {
  const config = createDefaultGameCoreConfig();
  const crashed = {
    ...createInitialGameState({ config, obstacles: [] }),
    crashed: true,
    crashReason: "tree_collision",
  };

  const next = stepGame(crashed, { intent: "right", justPressed: true }, 1 / 60, config);

  assert.equal(next.player.x, crashed.player.x);
  assert.equal(next.worldOffset, crashed.worldOffset);
  assert.equal(next.crashed, true);
  assert.equal(next.scroll.currentSpeed, 0);
});

test("outcome precedence is snowman catch > tree collision > finish", () => {
  const config = createDefaultGameCoreConfig({ targetDistance: 1, snowmanCatchThreshold: 20 });
  const state = createInitialGameState({
    config,
    obstacles: [{ type: "tree", x: config.playerStartX, y: 1, width: 80, height: 80 }],
  });

  // Force same-step finish + tree overlap + snowman catch.
  state.worldOffset = 0.9;
  state.distanceTraveled = 0.9;
  state.snowman.worldY = state.worldOffset - 5;

  const next = stepGame(state, { intent: "none", justPressed: false }, 1 / 60, config);

  assert.equal(next.crashed, true);
  assert.equal(next.crashReason, "snowman_catch");
  assert.equal(next.runComplete, false);
});

test("invalid config values are sanitized and do not produce NaN", () => {
  const config = createDefaultGameCoreConfig({
    worldWidth: Number.NaN,
    baseScrollSpeed: Number.POSITIVE_INFINITY,
    targetDistance: Number.NaN,
    snowmanChaseRampStart: 0.99,
    snowmanChaseRampEnd: 0.1,
  });
  const state = createInitialGameState({ config, obstacles: [] });

  const next = stepGame(state, { intent: "none", justPressed: false }, 1 / 60, config);

  assert.equal(Number.isFinite(next.worldOffset), true);
  assert.equal(Number.isFinite(next.distanceTraveled), true);
  assert.equal(Number.isFinite(next.scroll.baseSpeed), true);
  assert.equal(Number.isFinite(next.snowman.worldY), true);
});

test("dt <= 0 does not advance and returns a distinct state object", () => {
  const config = createDefaultGameCoreConfig();
  const state = createInitialGameState({ config, obstacles: [] });
  const next = stepGame(state, { intent: "right", justPressed: true }, 0, config);

  assert.notEqual(next, state);
  assert.equal(next.worldOffset, state.worldOffset);
  assert.equal(next.player.x, state.player.x);
});

test("browser-style fixed stepping and mcp-style fixed stepping stay in parity for same progression+inputs", () => {
  const seed = 1337;
  const randA = mulberry32(seed);
  const randB = mulberry32(seed);

  const configA = createDefaultGameCoreConfig({ worldWidth: 800, playerStartX: 400, playerScreenY: 200 });
  const configB = createDefaultGameCoreConfig({ worldWidth: 800, playerStartX: 400, playerScreenY: 200 });

  const genA = new CourseGenerator(800, randA);
  const courseA = genA.createSimpleCourse(1.0);
  const objectsA = genA.getAllObjects(courseA);
  const obstaclesA = buildCoreObstaclesFromCourseObjects(objectsA, randA);

  const genB = new CourseGenerator(800, randB);
  const courseB = genB.createSimpleCourse(1.0);
  const objectsB = genB.getAllObjects(courseB);
  const obstaclesB = buildCoreObstaclesFromCourseObjects(objectsB, randB);

  assert.deepEqual(obstaclesA, obstaclesB);
  configA.targetDistance = courseA.totalLength;
  configB.targetDistance = courseB.totalLength;

  let browserLike = createInitialGameState({ config: configA, obstacles: obstaclesA });
  let mcpLike = createInitialGameState({ config: configB, obstacles: obstaclesB });

  const inputRng = mulberry32(seed + 99);
  for (let i = 0; i < 600; i += 1) {
    const roll = inputRng();
    const input = roll < 0.05
      ? { intent: "left", justPressed: true }
      : roll < 0.1
      ? { intent: "right", justPressed: true }
      : roll < 0.14
      ? { intent: "down", justPressed: true }
      : { intent: "none", justPressed: false };

    browserLike = stepGame(browserLike, input, 1 / 60, configA);
    mcpLike = stepGame(mcpLike, input, 1 / 60, configB);

    if (browserLike.crashed || browserLike.runComplete || mcpLike.crashed || mcpLike.runComplete) {
      break;
    }
  }

  assert.deepEqual(browserLike, mcpLike);
});

test("paused/menu input policy blocks gameplay input queueing", () => {
  assert.equal(shouldQueueGameplayInput(true, false, false), true);
  assert.equal(shouldQueueGameplayInput(true, true, false), false);
  assert.equal(shouldQueueGameplayInput(false, false, false), false);
  assert.equal(shouldQueueGameplayInput(true, false, true), false);
});

test("shared progression generation supports deterministic seeding", () => {
  const seed = 2026;
  const first = createCourseProgression(800, 1, mulberry32(seed));
  const second = createCourseProgression(800, 1, mulberry32(seed));
  const third = createCourseProgression(800, 1, mulberry32(seed + 1));

  assert.equal(first.course.totalLength, second.course.totalLength);
  assert.deepEqual(first.obstacles, second.obstacles);
  assert.notDeepEqual(first.obstacles, third.obstacles);
});
