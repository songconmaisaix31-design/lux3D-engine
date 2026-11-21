import { parseArgs } from "node:util";
import { z } from "zod";
import { changesSchema, experimentSchema, inspectRun, options, runExperiments, tuneCornSlot } from "./experiments.mjs";
import { modelPromptSchema, readModel, startModel } from "./model-assets.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    task: { type: "string" },
    robot: { type: "string" },
    crop: { type: "string" },
    object: { type: "string" },
    "model-id": { type: "string" },
    prompt: { type: "string" },
    "mass-grams": { type: "string" },
    target: { type: "string" },
    "tolerance-cm": { type: "string" },
    seed: { type: "string" },
    at: { type: "string" },
    scene: { type: "string" },
    strategy: { type: "string" },
    changes: { type: "string" },
  },
});
const [command, id] = positionals;
const number = (value) => value === undefined ? undefined : Number(value);
if (values.help || !command) {
  console.log("用法：\n  node cli.mjs list\n  node cli.mjs run --task corn_slot [--mass-grams 75] [--scene JSON] [--strategy JSON] [--changes JSON] [--model-id ID]\n  node cli.mjs tune --task corn_slot\n  node cli.mjs inspect RUN_ID [--at 秒]\n  node cli.mjs model-start --prompt 描述\n  node cli.mjs model-get TASK_ID");
} else if (command === "list" && positionals.length === 1) {
  console.log(JSON.stringify(options, null, 2));
} else if (command === "inspect" && positionals.length === 2) {
  const at = z.number().min(0).optional().parse(number(values.at));
  console.log(JSON.stringify(await inspectRun(id, at), null, 2));
} else if (command === "model-start" && positionals.length === 1) {
  console.log(JSON.stringify(await startModel(modelPromptSchema.parse(values.prompt)), null, 2));
} else if (command === "model-get" && positionals.length === 2) {
  console.log(JSON.stringify(await readModel(id), null, 2));
} else if ((command === "run" || command === "tune") && positionals.length === 1) {
  const baseline = experimentSchema.parse({
    task: values.task,
    robot: values.robot,
    crop: values.crop,
    object: values.object === undefined ? undefined : JSON.parse(values.object),
    modelId: values["model-id"],
    massGrams: number(values["mass-grams"]),
    target: values.target,
    toleranceCm: number(values["tolerance-cm"]),
    seed: number(values.seed),
    scene: values.scene === undefined ? undefined : JSON.parse(values.scene),
    strategy: values.strategy === undefined ? undefined : JSON.parse(values.strategy),
  });
  const changes = values.changes === undefined ? []
    : z.array(changesSchema).max(3).parse(JSON.parse(values.changes));
  if (command === "tune" && changes.length) throw new Error("tune 使用内置的参数搜索，请用 run --changes 进行自定义对照。");
  const result = command === "tune" ? await tuneCornSlot(baseline) : await runExperiments(baseline, changes);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("运行 --help 查看命令用法。");
}
