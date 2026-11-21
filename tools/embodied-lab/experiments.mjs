import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { z } from "zod";
import { gapForPhase, observeCornSlot, setupCornSlot } from "./corn-slot.mjs";
import { detailedCornId, modelAvailable, modelIdSchema, requireModel } from "./model-assets.mjs";

const simulator = new URL("../../examples/15-embodied-sim/", import.meta.url);
const three = new URL("vendor/three.module.js", simulator).href;
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "three" ? three : specifier, context);
  },
});
const kernel = await import(new URL("engine/kernel.js", simulator));
hook.deregister();
const wasm = await import(new URL("vendor/oriera/oriera_wasm.js", simulator));
await wasm.default({
  module_or_path: readFileSync(new URL("vendor/oriera/oriera_wasm_bg.wasm", simulator)),
});

const robots = {
  tabletop: { name: "桌面四轴臂", preset: "tabletop-4dof-pick" },
  panda: { name: "Franka Panda 七轴臂", preset: "panda-7dof-pick" },
};
const crops = {
  tomato: { name: "番茄", shape: { kind: "sphere", r: 0.025 } },
  potato: { name: "马铃薯", shape: { kind: "cuboid", half: [0.03, 0.025, 0.025] } },
  corn: { name: "玉米段", shape: { kind: "cylinder", radius: 0.025, half_h: 0.025 } },
};
const tasks = {
  pick_place: { name: "抓取并放置", robots: Object.keys(robots), crops: Object.keys(crops) },
  corn_slot: {
    name: "玉米越过筐沿、转向、尖端朝左入槽",
    robots: ["panda"],
    crops: ["corn"],
    sceneDefaults: { tableHeightCm: 50, rimHeightCm: 4.5, slotWidthCm: 9 },
    strategyDefaults: { liftExtraCm: 5, rotationTicks: 90, gripperGapMm: 34 },
  },
};
const targets = {
  A: [0.31, 0.5, -0.09],
  B: [0.31, 0.5, 0.09],
};

export const resultsDir = new URL("../../out/embodied-lab/", import.meta.url);
export const viewerOrigin = "http://127.0.0.1:8124";
export const options = {
  robots: Object.entries(robots).map(([id, { name }]) => ({ id, name })),
  crops: Object.entries(crops).map(([id, { name, shape }]) => ({ id, name, shapeMeters: shape })),
  tasks: Object.entries(tasks).map(([id, task]) => ({ id, ...task })),
  targetZones: targets,
  modeling: {
    provider: "Meshy",
    available: modelAvailable(),
    localModels: [{ modelId: detailedCornId, name: "精细玉米模型" }],
    purpose: "GLB 外观与碰撞体、质量分别配置",
  },
};
const dimension = z.number().min(1).max(20);
const objectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  geometry: z.discriminatedUnion("shape", [
    z.object({ shape: z.literal("sphere"), diameterCm: dimension }).strict(),
    z.object({ shape: z.literal("cylinder"), diameterCm: dimension, heightCm: dimension }).strict(),
    z.object({ shape: z.literal("box"), xCm: dimension, yCm: dimension, zCm: dimension }).strict(),
  ]),
}).strict().describe("普通抓放可用任意物体名称和基础碰撞几何，尺寸单位厘米");
const settings = z.object({
  robot: z.enum(Object.keys(robots)).describe("机械臂：tabletop 桌面四轴臂，panda 七轴臂"),
  crop: z.enum(Object.keys(crops)).describe("作物：tomato 番茄，potato 马铃薯，corn 玉米段"),
  object: objectSchema,
  modelId: modelIdSchema.describe("GLB 外观，可指定本地 sweet-corn-detail 或 Meshy 返回的 modelId"),
  massGrams: z.number().positive().max(1000).describe("作物质量，单位克"),
  task: z.enum(Object.keys(tasks))
    .describe("pick_place 普通抓放；corn_slot 抬过筐沿后转向，尖端朝左放入长槽"),
  target: z.enum(Object.keys(targets)).describe("放置目标区域"),
  toleranceCm: z.number().min(1).max(9).describe("落区容许半径，单位厘米"),
  seed: z.number().int().min(0).max(2 ** 32 - 1)
    .describe("普通抓放使用随机种子选择起始位置；玉米入槽使用固定起点"),
  scene: z.object({
    tableHeightCm: z.number().min(46).max(54).optional().describe("桌面高度（厘米），两种任务均适用"),
    rimHeightCm: z.number().min(2).max(8).optional().describe("筐沿离桌面高度（厘米），用于 corn_slot"),
    slotWidthCm: z.number().min(5.5).max(12).optional().describe("槽内宽（厘米），用于 corn_slot"),
  }).strict(),
  strategy: z.object({
    liftExtraCm: z.number().min(1).max(10).optional().describe("在筐沿之上的额外抬升目标（厘米）"),
    rotationTicks: z.number().int().min(30).max(180).optional().describe("转向使用的仿真步数，每步约 1/60 秒"),
    gripperGapMm: z.number().min(28).max(48).optional().describe("夹爪闭合后的间距（毫米）"),
  }).strict(),
}).strict();
export const experimentSchema = settings.extend({
  robot: settings.shape.robot.optional(),
  crop: settings.shape.crop.optional(),
  object: settings.shape.object.optional(),
  modelId: settings.shape.modelId.optional(),
  massGrams: settings.shape.massGrams.optional(),
  task: settings.shape.task.default("pick_place"),
  target: settings.shape.target.optional(),
  toleranceCm: settings.shape.toleranceCm.optional(),
  seed: settings.shape.seed.default(1000),
  scene: settings.shape.scene.optional(),
  strategy: settings.shape.strategy.optional(),
});
export const changesSchema = settings.partial();

function volume(shape) {
  if (shape.kind === "sphere") return 4 / 3 * Math.PI * shape.r ** 3;
  if (shape.kind === "cylinder") return Math.PI * shape.radius ** 2 * 2 * shape.half_h;
  return 8 * shape.half[0] * shape.half[1] * shape.half[2];
}

function physicalObject(settings) {
  if (!settings.object) return crops[settings.crop];
  const { name, geometry: g } = settings.object;
  if (g.shape === "sphere") return { name, shape: { kind: "sphere", r: g.diameterCm / 200 } };
  if (g.shape === "cylinder") {
    return { name, shape: { kind: "cylinder", radius: g.diameterCm / 200, half_h: g.heightCm / 200 } };
  }
  return { name, shape: { kind: "cuboid", half: [g.xCm, g.yCm, g.zCm].map((v) => v / 200) } };
}

function makeScene(settings) {
  const { preset } = robots[settings.robot];
  const crop = physicalObject(settings);
  const spec = JSON.parse(readFileSync(new URL("specs/resolved/tabletop-4dof-pick.json", simulator), "utf8"));
  if (preset !== robots.tabletop.preset) {
    const presetUrl = new URL(`specs/resolved/${preset}.json`, simulator);
    spec.robot = JSON.parse(readFileSync(presetUrl, "utf8")).robot;
  }
  const prop = spec.scene.props[0];
  prop.name = settings.object ? "custom" : settings.crop;
  prop.shape = crop.shape;
  spec.randomization.enabled = false;
  spec.task.id = "pick_place@v2";
  const slot = settings.task === "corn_slot" ? setupCornSlot(spec, settings.scene, settings.strategy) : null;
  if (!slot) {
    const tableTop = settings.scene.tableHeightCm / 100;
    const table = spec.scene.fixtures.find(({ name }) => name === "table");
    table.half[1] = tableTop / 2;
    table.center[1] = tableTop / 2;
    const shape = prop.shape;
    const halfHeight = shape.kind === "sphere" ? shape.r : shape.kind === "cylinder" ? shape.half_h : shape.half[1];
    prop.placement.range.y = tableTop + Math.max(0.05, halfHeight + 0.008);
    spec.task.params.goal = { fixed: [targets[settings.target][0], tableTop, targets[settings.target][2]] };
    spec.task.params.goal_xz_tol = settings.toleranceCm / 100;
    spec.task.params.goal_y_min += tableTop - 0.5;
    spec.task.params.goal_y_max += tableTop - 0.5;
  }
  prop.phys.density = settings.massGrams / 1000 / volume(prop.shape);
  return { spec, slot };
}

function resolveSettings(input) {
  const corn = input.task === "corn_slot";
  const entry = tasks[input.task];
  const resolved = {
    ...input,
    robot: input.robot ?? (corn ? "panda" : "tabletop"),
    crop: input.object ? undefined : input.crop ?? (corn ? "corn" : "tomato"),
    massGrams: input.massGrams ?? (corn ? 75 : 35),
    modelId: input.modelId ?? (corn ? detailedCornId : undefined),
    target: corn ? "slot" : input.target ?? "A",
    toleranceCm: corn ? undefined : input.toleranceCm ?? 7,
    scene: { ...(corn ? entry.sceneDefaults : { tableHeightCm: 50 }), ...input.scene },
    strategy: corn ? { ...entry.strategyDefaults, ...input.strategy } : input.strategy,
  };
  if (corn && (!entry.robots.includes(resolved.robot) || !entry.crops.includes(resolved.crop))) {
    throw new Error("corn_slot 当前支持七轴 Panda 与玉米段，请将 robot 设为 panda、crop 设为 corn。");
  }
  if (corn && input.object) {
    throw new Error("corn_slot 使用可判定尖端朝向的专用玉米碰撞体；自定义碰撞体可使用 pick_place。");
  }
  if (input.crop && input.object) {
    throw new Error("选择内置 crop 或填写自定义 object。");
  }
  if (corn && (input.target !== undefined || input.toleranceCm !== undefined)) {
    throw new Error("corn_slot 按长槽边界和尖端方向判定，请通过 scene.slotWidthCm 调整槽内宽。");
  }
  if (!corn && (resolved.scene.rimHeightCm !== undefined || resolved.scene.slotWidthCm !== undefined ||
    Object.keys(resolved.strategy ?? {}).length)) {
    throw new Error("筐沿、长槽和转向策略参数适用于 corn_slot。");
  }
  return resolved;
}

async function runExperiment(settings) {
  if (settings.modelId) await requireModel(settings.modelId);
  const { spec, slot } = makeScene(settings);
  const sim = wasm.OrieraSim.from_spec_json(JSON.stringify(spec));
  try {
    sim.reset(settings.seed);
    const arm = kernel.ikArmFromSpec(spec);
    const naxis = arm ? null : kernel.createNaxisPickState(spec, kernel.phaseGeom(spec));
    if (slot) naxis.phases = slot.phases;
    const names = JSON.parse(sim.layout()).obs;
    const indices = {
      ee: names.indexOf("ee.x"),
      obj: names.indexOf("obj_rel.x"),
      goal: names.indexOf("goal_rel.x"),
    };
    const firstFrame = JSON.parse(sim.poses());
    const frames = [firstFrame];
    const phaseChanges = [];
    const observer = slot ? observeCornSlot(slot) : null;
    const startHeight = firstFrame.props[0].pos[1];
    const totalSteps = slot?.steps ?? sim.max_steps();
    let liftMeters = 0;
    let placed = false;
    let lastPhase;
    for (let step = 0; step < totalSteps; step++) {
      const obs = sim.obs();
      const phaseIndex = slot ? kernel.policyTick(slot.phases, step) : -1;
      const phase = slot?.phases[phaseIndex];
      if (phase && lastPhase !== phase.name) {
        phaseChanges.push({ phase: phase.name, seconds: step * sim.dt() });
        lastPhase = phase.name;
      }
      const action = arm
        ? kernel.fourAxisPickAction(arm, obs, indices, step)
        : kernel.naxisPickAction(spec, naxis, obs, indices, step,
          slot ? gapForPhase(slot.phases, phaseIndex, step) : undefined);
      const result = sim.step(action);
      const done = result.terminated || result.truncated;
      placed = result.success;
      result.free();
      liftMeters = Math.max(liftMeters, sim.cube_pos()[1] - startHeight);
      const saveFrame = step % 2 === 1 || done || step === totalSteps - 1;
      const poses = slot || saveFrame ? JSON.parse(sim.poses()) : null;
      if (observer) observer.sample(poses, phase.name);
      if (saveFrame) frames.push(poses);
      if (done) break;
    }
    const checks = observer?.result();
    const id = randomUUID();
    const summary = {
      ...settings,
      runId: id,
      robotName: robots[settings.robot].name,
      cropName: physicalObject(settings).name,
      success: checks ? checks.grasped && checks.clearedRim && checks.tipLeft &&
        checks.releasedInSlot && checks.stableInSlot : placed && liftMeters >= 0.03,
      stableInTarget: checks?.stableInSlot ?? placed,
      checks,
      liftCm: Number((liftMeters * 100).toFixed(1)),
      simulatedSeconds: Number((sim.steps() * sim.dt()).toFixed(2)),
      objectPosition: Array.from(sim.cube_pos()),
      goalPosition: Array.from(sim.goal()),
      replayUrl: `${viewerOrigin}/examples/15-embodied-sim/?replay=${id}`,
    };
    await mkdir(resultsDir, { recursive: true });
    const replay = { scene: spec, summary, phaseChanges, frames, frameSeconds: sim.dt() * 2 };
    await writeFile(new URL(`${id}.json`, resultsDir), JSON.stringify(replay), { flag: "wx" });
    return summary;
  } finally {
    sim.free();
  }
}

export const runIdSchema = z.uuid().describe("run_experiments 返回的 runId");
export async function inspectRun(id, atSeconds) {
  const replay = JSON.parse(await readFile(new URL(`${runIdSchema.parse(id)}.json`, resultsDir), "utf8"));
  if (atSeconds === undefined) return { summary: replay.summary, phaseChanges: replay.phaseChanges ?? [] };
  const index = Math.min(Math.round(atSeconds / replay.frameSeconds), replay.frames.length - 1);
  const frame = replay.frames[index];
  return {
    summary: replay.summary,
    phaseChanges: replay.phaseChanges ?? [],
    frame: {
      seconds: Number((frame.steps * replay.scene.dt).toFixed(2)),
      holding: frame.holding,
      gripper: frame.gripper,
      object: frame.props[0],
      endEffector: frame.ee,
    },
  };
}

export async function runExperiments(baseline, changes = []) {
  let input = baseline;
  const runs = [await runExperiment(resolveSettings(input))];
  for (const change of changes) {
    input = {
      ...input, ...change,
      scene: { ...input.scene, ...change.scene },
      strategy: { ...input.strategy, ...change.strategy },
    };
    runs.push(await runExperiment(resolveSettings(input)));
  }
  return { runs };
}

export async function tuneCornSlot(baseline) {
  if (baseline.task !== "corn_slot") throw new Error("自动微调目前支持 corn_slot。");
  const original = resolveSettings(baseline);
  const { strategy } = original;
  const candidates = [
    strategy,
    { ...strategy, liftExtraCm: Math.min(10, strategy.liftExtraCm + 0.5) },
    { ...strategy, rotationTicks: Math.min(180, strategy.rotationTicks + 15) },
    { ...strategy, gripperGapMm: Math.max(28, strategy.gripperGapMm - 1) },
  ];
  const runs = [];
  for (const candidate of candidates) {
    if (runs.some((run) => run.strategy.liftExtraCm === candidate.liftExtraCm &&
      run.strategy.rotationTicks === candidate.rotationTicks && run.strategy.gripperGapMm === candidate.gripperGapMm)) continue;
    runs.push(await runExperiment({ ...original, strategy: candidate }));
  }
  const recommended = runs.filter(({ success }) => success).sort((a, b) =>
    b.checks.rimClearanceCm - a.checks.rimClearanceCm ||
    a.checks.tipErrorDegrees - b.checks.tipErrorDegrees ||
    a.simulatedSeconds - b.simulatedSeconds
  )[0];
  return { recommendedRunId: recommended?.runId ?? null, recommendedReplayUrl: recommended?.replayUrl ?? null, runs };
}
