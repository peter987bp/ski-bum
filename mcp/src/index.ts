import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runSimulation } from "./sim/runSimulation.js";

const server = new McpServer({
  name: "ski-bum-local",
  version: "0.0.1",
});

server.tool(
    "run_simulation",
    "Run a deterministic, headless Ski Bum simulation and return JSON metrics. Local-only.",
    {
      seed: z.number().int().min(0).max(2_147_483_647),
      seconds: z.number().int().min(1).max(300),
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
        structuredContent: result,
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
