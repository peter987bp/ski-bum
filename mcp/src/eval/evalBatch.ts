import {
  normalizeSimulationSeconds,
  normalizeSimulationSeed,
  runSimulation,
} from "../sim/runSimulation.js";

export type BatchEvaluationResult = {
  seconds: number;
  runCount: number;
  avgCrashCount: number;
  avgDistance: number;
  minDistance: number;
  maxDistance: number;
  avgSnowmanDistance: number;
  // Percent of runs with at least one crash.
  crashRate: number;
};

export function runBatchEvaluation(seeds: number[], seconds: number): BatchEvaluationResult {
  const normalized = normalizeBatchEvaluationInput(seeds, seconds);
  const results = normalized.seeds.map((seed) => runSimulation({ seed, seconds: normalized.seconds }));
  const runCount = results.length;

  let totalCrashCount = 0;
  let totalDistance = 0;
  let totalSnowmanDistance = 0;
  let crashedRuns = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  let maxDistance = Number.NEGATIVE_INFINITY;

  for (const result of results) {
    totalCrashCount += result.crashCount;
    totalDistance += result.totalDistance;
    totalSnowmanDistance += result.snowmanDistance;
    crashedRuns += result.crashCount > 0 ? 1 : 0;
    minDistance = Math.min(minDistance, result.totalDistance);
    maxDistance = Math.max(maxDistance, result.totalDistance);
  }

  return {
    seconds: normalized.seconds,
    runCount,
    avgCrashCount: round2(totalCrashCount / runCount),
    avgDistance: round2(totalDistance / runCount),
    minDistance,
    maxDistance,
    avgSnowmanDistance: round2(totalSnowmanDistance / runCount),
    crashRate: round2((crashedRuns / runCount) * 100),
  };
}

export function normalizeBatchEvaluationInput(seeds: number[], seconds: number) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error("Batch evaluation requires at least one seed.");
  }

  const normalizedSeeds = seeds.map((seed) => normalizeSimulationSeed(seed));

  return {
    seeds: normalizedSeeds,
    seconds: normalizeSimulationSeconds(seconds),
  };
}

export function parseBatchSeedsCsv(csv: string): number[] {
  if (csv.length === 0) {
    return [];
  }

  return csv.split(",").map((token) => {
    const trimmed = token.trim();

    if (trimmed.length === 0) {
      throw new Error("Batch evaluation seeds CSV must not contain empty values.");
    }

    return normalizeSimulationSeed(Number(trimmed));
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
