import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { changesSchema, experimentSchema, options, runExperiment } from "./experiments.mjs";

const server = new McpServer({ name: "embodied-lab", version: "0.1.0" });
const toolResult = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
});

server.registerTool("list_experiment_options", {
  title: "查看实验台可用的机械臂、作物和任务",
  description: "查看可用的机械臂型号、作物物理代理、抓放任务和放置区。",
  annotations: { readOnlyHint: true },
}, () => toolResult(options));

server.registerTool("run_experiments", {
  title: "运行农作物抓取实验",
  description: "实际运行本地刚体仿真并返回各轮的结果、仿真用时和浏览器回放。第一轮使用 baseline，后续每轮继承上一轮，只应用 changes 中明确提供的字段。",
  inputSchema: {
    baseline: experimentSchema.describe("第一轮的实验条件"),
    changes: z.array(changesSchema).max(3).optional()
      .describe("每项从上一轮继承条件。例如 [{massGrams:75},{crop:'corn'},{robot:'panda'}]"),
  },
}, async ({ baseline, changes = [] }) => {
  const runs = [await runExperiment(baseline)];
  let settings = baseline;
  for (const change of changes) {
    settings = { ...settings, ...change };
    runs.push(await runExperiment(settings));
  }
  return toolResult({ runs });
});

await server.connect(new StdioServerTransport());
