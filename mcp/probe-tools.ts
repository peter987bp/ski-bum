import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const client = new Client({ name: "probe", version: "0.0.1" }, { capabilities: {} });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["./dist/index.js"],
    // IMPORTANT: run from the mcp folder so ./dist works
    cwd: process.cwd(),
  });

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("TOOLS:", tools.tools.map(t => t.name));

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});