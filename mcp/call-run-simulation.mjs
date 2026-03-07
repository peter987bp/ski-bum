import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const seed = Number(process.argv[2] ?? "42");
const seconds = Number(process.argv[3] ?? "40");

const client = new Client({ name: "caller", version: "0.0.1" }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: "node",
  args: ["./dist/mcp/src/index.js"],
  cwd: new URL(".", import.meta.url).pathname, // mcp/ folder
});

await client.connect(transport);
const result = await client.callTool({ name: "run_simulation", arguments: { seed, seconds } });

const text = result.content?.[0]?.text ?? "";
process.stdout.write(text);

await client.close();
