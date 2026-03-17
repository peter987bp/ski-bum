import test from "node:test";
import assert from "node:assert/strict";
import {
  initSimulation,
  runSimulation,
  stepSimulation,
} from "../dist/mcp/src/sim/runSimulation.js";

const knownCases = [
  {
    seed: 1,
    seconds: 10,
    expected: {
      seed: 1,
      seconds: 10,
      totalDistance: 335,
      crashCount: 1,
      finalScrollSpeed: 0,
      snowmanDistance: 220,
    },
  },
  {
    seed: 42,
    seconds: 40,
    expected: {
      seed: 42,
      seconds: 40,
      totalDistance: 398,
      crashCount: 1,
      finalScrollSpeed: 0,
      snowmanDistance: 220,
    },
  },
  {
    seed: 123456,
    seconds: 60,
    expected: {
      seed: 123456,
      seconds: 60,
      totalDistance: 674,
      crashCount: 1,
      finalScrollSpeed: 0,
      snowmanDistance: 220,
    },
  },
];

test("runSimulation is deterministic for identical inputs", () => {
  for (const { seed, seconds } of knownCases) {
    const first = runSimulation({ seed, seconds });
    const second = runSimulation({ seed, seconds });
    assert.deepEqual(second, first);
  }
});

test("runSimulation produces stable known outputs", () => {
  for (const { seed, seconds, expected } of knownCases) {
    const actual = runSimulation({ seed, seconds });
    assert.equal(actual.seed, expected.seed);
    assert.equal(actual.seconds, expected.seconds);
    assert.equal(actual.totalDistance, expected.totalDistance);
    assert.equal(actual.crashCount, expected.crashCount);
    assert.equal(actual.finalScrollSpeed, expected.finalScrollSpeed);
    assert.equal(actual.snowmanDistance, expected.snowmanDistance);
  }
});

test("stepSimulation terminates immediately when crash penalty causes catch", () => {
  const state = initSimulation(7, 10);
  state.coreState.snowman.worldY = state.coreState.worldOffset - 5;
  const terminate = stepSimulation(state, 1 / 60);

  assert.equal(terminate, true);
  assert.equal(state.coreState.crashed, true);
  assert.equal(state.coreState.crashReason, "snowman_catch");
  assert.equal(state.crashCount, 1);
});

test("boundary seed/seconds cases are deterministic", () => {
  const boundaryCases = [
    { seed: 0, seconds: 1 },
    { seed: 0, seconds: 300 },
    { seed: 2_147_483_647, seconds: 1 },
    { seed: 2_147_483_647, seconds: 300 },
  ];

  for (const input of boundaryCases) {
    const first = runSimulation(input);
    const second = runSimulation(input);
    assert.deepEqual(second, first);
  }
});

test("runSimulation rejects invalid seeds", () => {
  assert.throws(
    () => runSimulation({ seed: 1.5, seconds: 40 }),
    /seed must be an integer/i,
  );
  assert.throws(
    () => runSimulation({ seed: -1, seconds: 40 }),
    /seed must be between/i,
  );
});

test("runSimulation rejects invalid seconds", () => {
  assert.throws(
    () => runSimulation({ seed: 1, seconds: 40.5 }),
    /seconds must be an integer/i,
  );
  assert.throws(
    () => runSimulation({ seed: 1, seconds: 301 }),
    /seconds must be between/i,
  );
});
