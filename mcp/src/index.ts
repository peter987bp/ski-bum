import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  runSimulation,
  SIMULATION_SECONDS_MAX,
  SIMULATION_SECONDS_MIN,
  SIMULATION_SEED_MAX,
  SIMULATION_SEED_MIN,
} from "./sim/runSimulation.js";

const server = new McpServer({
  name: "ski-bum-local",
  version: "0.0.1",
});

server.tool(
    "run_simulation",
    "Run a deterministic, headless Ski Bum simulation and return JSON metrics. Local-only.",
    {
      seed: z.number().int().min(SIMULATION_SEED_MIN).max(SIMULATION_SEED_MAX),
      seconds: z.number().int().min(SIMULATION_SECONDS_MIN).max(SIMULATION_SECONDS_MAX),
    },
    async ({ seed, seconds }) => {
      const result = runSimulation({ seed, seconds });
  
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[ski-bum-mcp] fatal:", err);
  process.exit(1);
});
