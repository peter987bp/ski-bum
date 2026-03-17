import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  normalizeBatchEvaluationInput,
  parseBatchSeedsCsv,
  runBatchEvaluation,
} from "../dist/mcp/src/eval/evalBatch.js";

const workspaceRoot = path.resolve(process.cwd(), "..");

test("runBatchEvaluation rejects an empty seed array", () => {
  assert.throws(
    () => runBatchEvaluation([], 40),
    /at least one seed/i,
  );
});

test("runBatchEvaluation rejects invalid seeds", () => {
  assert.throws(
    () => runBatchEvaluation([1.5], 40),
    /seed must be an integer/i,
  );
  assert.throws(
    () => runBatchEvaluation([2_147_483_648], 40),
    /seed must be between/i,
  );
});

test("runBatchEvaluation rejects invalid seconds", () => {
  assert.throws(
    () => runBatchEvaluation([1, 2, 3], 40.5),
    /seconds must be an integer/i,
  );
  assert.throws(
    () => runBatchEvaluation([1, 2, 3], 301),
    /seconds must be between/i,
  );
});

test("parseBatchSeedsCsv rejects malformed CSV instead of repairing it", () => {
  assert.throws(
    () => parseBatchSeedsCsv("1,,2"),
    /must not contain empty values/i,
  );
});

test("normalizeBatchEvaluationInput returns canonical execution values", () => {
  const normalized = normalizeBatchEvaluationInput([1, 2, 3], 40);

  assert.deepEqual(normalized, {
    seeds: [1, 2, 3],
    seconds: 40,
  });
});

test("runBatchEvaluation is deterministic for identical inputs", () => {
  const first = runBatchEvaluation([1, 2, 3, 4, 5], 40);
  const second = runBatchEvaluation([1, 2, 3, 4, 5], 40);

  assert.deepEqual(second, first);
});

test("runBatchEvaluation produces stable aggregate metrics for a known seed set", () => {
  const actual = runBatchEvaluation([1, 2, 3, 4, 5], 40);

  assert.deepEqual(actual, {
    seconds: 40,
    runCount: 5,
    avgCrashCount: 1,
    avgDistance: 944.4,
    minDistance: 335,
    maxDistance: 2259,
    avgSnowmanDistance: 220,
    crashRate: 100,
  });
});

test("CLI matches library output for valid input", () => {
  const cli = spawnSync(process.execPath, ["scripts/eval-batch.mjs", "1,2,3,4,5", "40"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(cli.status, 0);
  assert.equal(cli.stderr, "");
  assert.equal(cli.stdout, `${JSON.stringify(runBatchEvaluation([1, 2, 3, 4, 5], 40), null, 2)}\n`);
});

test("CLI matches library failure semantics for malformed CSV", () => {
  const cli = spawnSync(process.execPath, ["scripts/eval-batch.mjs", "1,,2", "40"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /must not contain empty values/i);
  assert.throws(
    () => parseBatchSeedsCsv("1,,2"),
    /must not contain empty values/i,
  );
});
