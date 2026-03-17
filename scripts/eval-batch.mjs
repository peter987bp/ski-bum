import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const seedsArg = process.argv[2] ?? "";
const secondsArg = process.argv[3] ?? "";
const evalModulePath = path.join(projectRoot, "mcp", "dist", "mcp", "src", "eval", "evalBatch.js");

if (!seedsArg || !secondsArg) {
  console.error("Usage: node scripts/eval-batch.mjs 1,2,3,4,5 40");
  process.exit(1);
}

if (!fs.existsSync(evalModulePath)) {
  console.error("Batch evaluation build output is missing. Run: npm --prefix mcp run build");
  process.exit(1);
}

try {
  const { parseBatchSeedsCsv, runBatchEvaluation } = await import(pathToFileURL(evalModulePath).href);
  const seeds = parseBatchSeedsCsv(seedsArg);
  const seconds = Number(secondsArg);
  const result = runBatchEvaluation(seeds, seconds);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
