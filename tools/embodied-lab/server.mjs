import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { changesSchema, experimentSchema, inspectRun, options, runExperiments, runIdSchema, tuneCornSlot } from "./experiments.mjs";
import { modelAvailable, modelPromptSchema, modelTaskIdSchema, readModel, refineModel, startModel } from "./model-assets.mjs";

const server = new McpServer({ name: "embodied-lab", version: "0.2.0" }, {
  instructions: "把用户一段话转成实验，识别物体、估计质量、动作和场景。普通抓放用 pick_place；玉米越沿、转向朝左入槽用 corn_slot，默认有精细本地玉米外观。自动微调调用 tune_corn_slot。用户要求从文字通过 Meshy 生成新外观时，先 start_object_model，轮询 get_object_model 至成功。要求高精度带纹理外观时，预览用 detailed:true，查询预览用 download:false，再 refine_object_model 并查询精修任务。把最终 modelId 放入实验。若没有建模工具，明确说明 API 尚未配置。输出实际结果和回放链接。",
});
const toolResult = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
});

server.registerTool("list_experiment_options", {
  title: "查看实验台可用的机械臂、作物和任务",
  description: "查看可用的机械臂、作物、任务、场景与策略的默认配置。",
  annotations: { readOnlyHint: true },
}, () => toolResult(options));

server.registerTool("run_experiments", {
  title: "运行农作物抓取实验",
  description: "执行物理仿真实验，返回各轮判据、仿真用时和浏览器回放。用户要求玉米越过筐沿、转向并尖端朝左入槽时，设置 baseline.task 为 corn_slot 即可运行。用 scene 调整桌高、筐沿和槽宽，用 strategy 调整抬升、转向时间和夹爪间距。changes 每轮继承上一轮，只修改给出的字段。",
  inputSchema: {
    baseline: experimentSchema.describe("第一轮的实验条件"),
    changes: z.array(changesSchema).max(3).optional()
      .describe("每项从上一轮继承条件。例如 [{massGrams:75},{crop:'corn'},{robot:'panda'}]"),
  },
}, async ({ baseline, changes }) => toolResult(await runExperiments(baseline, changes)));

server.registerTool("tune_corn_slot", {
  title: "通过物理仿真微调玉米入槽策略",
  description: "用同一件物体和场景实际运行基准参数及其抬升、转向变体。只从完成越沿、朝左与稳定入槽的回合中选择推荐策略，并返回每轮结果和回放。",
  inputSchema: { baseline: experimentSchema },
}, async ({ baseline }) => toolResult(await tuneCornSlot(baseline)));

if (modelAvailable()) {
  server.registerTool("start_object_model", {
    title: "提交物体的文本转 3D 外观任务",
    description: "调用 Meshy 生成物体的 GLB 外观。仅当用户要求生成外观时调用，之后用 get_object_model 查询。",
    inputSchema: {
      prompt: modelPromptSchema.describe("仅描述单个物体外形，包含长度方向与尖端"),
      detailed: z.boolean().optional().describe("4K 几何，适合精修后的高精度 GLB"),
    },
  }, async ({ prompt, detailed }) => toolResult(await startModel(prompt, detailed)));

  server.registerTool("refine_object_model", {
    title: "生成三维模型纹理",
    description: "将已成功的 Meshy 预览任务提交精修，之后查询新任务以取得含纹理的 GLB。",
    inputSchema: { previewTaskId: modelTaskIdSchema },
  }, async ({ previewTaskId }) => toolResult(await refineModel(previewTaskId)));

  server.registerTool("get_object_model", {
    title: "查询 3D 建模任务并取得模型",
    description: "建模完成后下载 GLB 到本地，返回可传给实验的 modelId。建模进行中时返回状态。",
    inputSchema: {
      taskId: modelTaskIdSchema,
      download: z.boolean().optional().describe("只检查预览状态时可设为 false"),
      waitSeconds: z.number().int().min(0).max(30).optional(),
    },
  }, async ({ taskId, download, waitSeconds }) => toolResult(await readModel(taskId, { download, waitSeconds })));
}

server.registerTool("inspect_run", {
  title: "查看实验的阶段和指定时刻",
  description: "通过 runId 读取已经运行的实验结果、阶段时间和回放链接。指定 atSeconds 可读取该时刻的真实夹持和物体位姿。",
  inputSchema: { runId: runIdSchema, atSeconds: z.number().min(0).optional() },
  annotations: { readOnlyHint: true },
}, async ({ runId, atSeconds }) => toolResult(await inspectRun(runId, atSeconds)));

await server.connect(new StdioServerTransport());
