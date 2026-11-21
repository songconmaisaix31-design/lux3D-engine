import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { z } from "zod";

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
  pick_place: { name: "抓取并放置", id: "pick_place@v2" },
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
  tasks: Object.entries(tasks).map(([id, { name }]) => ({ id, name })),
  targetZones: targets,
};
const settings = z.object({
  robot: z.enum(Object.keys(robots)).describe("机械臂：tabletop 桌面四轴臂，panda 七轴臂"),
  crop: z.enum(Object.keys(crops)).describe("作物：tomato 番茄，potato 马铃薯，corn 玉米段"),
  massGrams: z.number().positive().max(1000).describe("作物质量，单位克"),
  task: z.enum(Object.keys(tasks)),
  target: z.enum(Object.keys(targets)).describe("放置目标区域"),
  toleranceCm: z.number().min(1).max(9).describe("落区容许半径，单位厘米"),
  seed: z.number().int().min(0).max(2 ** 32 - 1)
    .describe("控制样本初始位置；比较时用相同种子"),
}).strict();
export const experimentSchema = settings.extend({
  task: settings.shape.task.default("pick_place"),
  target: settings.shape.target.default("A"),
  toleranceCm: settings.shape.toleranceCm.default(7),
  seed: settings.shape.seed.default(1000),
});
export const changesSchema = settings.partial();

function volume(shape) {
  if (shape.kind === "sphere") return 4 / 3 * Math.PI * shape.r ** 3;
  if (shape.kind === "cylinder") return Math.PI * shape.radius ** 2 * 2 * shape.half_h;
  return 8 * shape.half[0] * shape.half[1] * shape.half[2];
}

function makeScene(settings) {
  const { preset } = robots[settings.robot];
  const crop = crops[settings.crop];
  const spec = JSON.parse(readFileSync(new URL("specs/resolved/tabletop-4dof-pick.json", simulator), "utf8"));
  if (preset !== robots.tabletop.preset) {
    const presetUrl = new URL(`specs/resolved/${preset}.json`, simulator);
    spec.robot = JSON.parse(readFileSync(presetUrl, "utf8")).robot;
  }
  const prop = spec.scene.props[0];
  prop.name = settings.crop;
  prop.shape = crop.shape;
  prop.phys.density = settings.massGrams / 1000 / volume(crop.shape);
  spec.randomization.enabled = false;
  spec.task.id = tasks[settings.task].id;
  spec.task.params.goal = { fixed: targets[settings.target] };
  spec.task.params.goal_xz_tol = settings.toleranceCm / 100;
  return spec;
}

export async function runExperiment(settings) {
  const spec = makeScene(settings);
  const sim = wasm.OrieraSim.from_spec_json(JSON.stringify(spec));
  try {
    sim.reset(settings.seed);
    const arm = kernel.ikArmFromSpec(spec);
    const naxis = arm ? null : kernel.createNaxisPickState(spec, kernel.phaseGeom(spec));
    const names = JSON.parse(sim.layout()).obs;
    const indices = {
      ee: names.indexOf("ee.x"),
      obj: names.indexOf("obj_rel.x"),
      goal: names.indexOf("goal_rel.x"),
    };
    const firstFrame = JSON.parse(sim.poses());
    const frames = [firstFrame];
    const startHeight = firstFrame.props[0].pos[1];
    let liftMeters = 0;
    let placed = false;
    for (let step = 0; step < sim.max_steps(); step++) {
      const obs = sim.obs();
      const action = arm
        ? kernel.fourAxisPickAction(arm, obs, indices, step)
        : kernel.naxisPickAction(spec, naxis, obs, indices, step);
      const result = sim.step(action);
      const done = result.terminated || result.truncated;
      placed = result.success;
      result.free();
      liftMeters = Math.max(liftMeters, sim.cube_pos()[1] - startHeight);
      if (step % 2 === 1 || done) frames.push(JSON.parse(sim.poses()));
      if (done) break;
    }
    const id = randomUUID();
    const summary = {
      ...settings,
      robotName: robots[settings.robot].name,
      cropName: crops[settings.crop].name,
      success: placed && liftMeters >= 0.03,
      stableInTarget: placed,
      liftCm: Number((liftMeters * 100).toFixed(1)),
      simulatedSeconds: Number((sim.steps() * sim.dt()).toFixed(2)),
      objectPosition: Array.from(sim.cube_pos()),
      goalPosition: Array.from(sim.goal()),
      replayUrl: `${viewerOrigin}/examples/15-embodied-sim/?replay=${id}`,
    };
    await mkdir(resultsDir, { recursive: true });
    const replay = { scene: spec, summary, frames, frameSeconds: sim.dt() * 2 };
    await writeFile(new URL(`${id}.json`, resultsDir), JSON.stringify(replay), { flag: "wx" });
    return summary;
  } finally {
    sim.free();
  }
}
