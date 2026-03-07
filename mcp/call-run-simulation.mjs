import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const MIN_SEED = 0;
const MAX_SEED = 2_147_483_647;
const MIN_SECONDS = 1;
const MAX_SECONDS = 300;
const usage = "Usage: node call-run-simulation.mjs <seed> <seconds>";

function fail(message) {
  console.error(`${message}\n${usage}`);
  process.exit(1);
}

function parseBoundedInt(raw, name, min, max) {
  if (!/^\d+$/.test(raw ?? "")) {
    fail(`${name} must be an integer between ${min} and ${max}. Got: ${raw}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${name} must be an integer between ${min} and ${max}. Got: ${raw}`);
  }
  return value;
}

async function main() {
  const seed = parseBoundedInt(process.argv[2] ?? "42", "seed", MIN_SEED, MAX_SEED);
  const seconds = parseBoundedInt(process.argv[3] ?? "40", "seconds", MIN_SECONDS, MAX_SECONDS);

  const client = new Client({ name: "caller", version: "0.0.1" }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./dist/index.js"],
    cwd: new URL(".", import.meta.url).pathname, // mcp/ folder
  });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: "run_simulation", arguments: { seed, seconds } });
    if (result.isError) {
      const message = result.content?.[0]?.text ?? "MCP tool returned an error";
      throw new Error(message);
    }

    const text = result.content?.[0]?.text ?? "";
    process.stdout.write(text);
  } finally {
    try {
      await client.close();
    } catch {
      // Best-effort close; keep original failure as exit trigger.
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
