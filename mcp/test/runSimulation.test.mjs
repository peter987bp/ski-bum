import test from "node:test";
import assert from "node:assert/strict";
import { initSimulation, runSimulation, stepSimulation } from "../dist/sim/runSimulation.js";

const knownCases = [
  {
    seed: 1,
    seconds: 10,
    expected: {
      seed: 1,
      seconds: 10,
      totalDistance: 2601,
      crashCount: 0,
      finalScrollSpeed: 300,
      snowmanDistance: 245.47,
    },
  },
  {
    seed: 42,
    seconds: 40,
    expected: {
      seed: 42,
      seconds: 40,
      totalDistance: 12975,
      crashCount: 4,
      finalScrollSpeed: 435.42,
      snowmanDistance: 176.24,
    },
  },
  {
    seed: 123456,
    seconds: 60,
    expected: {
      seed: 123456,
      seconds: 60,
      totalDistance: 19685,
      crashCount: 11,
      finalScrollSpeed: 393.12,
      snowmanDistance: 103.5,
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
  state.snowmanDistance = 5;

  // First random call forces crash branch.
  const terminate = stepSimulation(state, 1 / 60, () => 0);

  assert.equal(terminate, true);
  assert.equal(state.snowmanDistance <= 0, true);
  assert.equal(state.snowmanDistance >= -50, true);
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
