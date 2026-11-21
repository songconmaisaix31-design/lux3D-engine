import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";
import { setTimeout } from "node:timers/promises";
import { z } from "zod";

export const modelsDir = new URL("../../out/embodied-lab-models/", import.meta.url);
export const bundledModelsDir = new URL("./assets/", import.meta.url);
export const detailedCornId = "sweet-corn-detail";
export const modelIdSchema = z.union([z.literal(detailedCornId), z.uuid()]);
export const modelPromptSchema = z.string().trim().min(1).max(800);
export const modelTaskIdSchema = z.string().min(1).max(160);
const endpoint = "https://api.meshy.ai/openapi/v2/text-to-3d";
const limitBytes = 25 * 1024 * 1024;

async function meshy(path, options) {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error("生成外观需要在 MCP 服务进程中配置 MESHY_API_KEY。");
  const response = await fetch(endpoint + path, {
    ...options,
    redirect: "error",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Meshy API 请求失败（HTTP ${response.status}）`);
  return response.json();
}

export function modelAvailable() {
  return Boolean(process.env.MESHY_API_KEY);
}

export async function startModel(prompt, detailed = false) {
  const geometry = detailed ? { geometry_resolution: "4k", target_polycount: 60000 } : { target_polycount: 20000 };
  const data = await meshy("", {
    method: "POST",
    body: JSON.stringify({ mode: "preview", prompt, ai_model: "latest", should_remesh: true, ...geometry, target_formats: ["glb"] }),
  });
  return { taskId: modelTaskIdSchema.parse(data.result), status: "PENDING", phase: "preview" };
}

export async function refineModel(previewTaskId) {
  const data = await meshy("", {
    method: "POST",
    body: JSON.stringify({ mode: "refine", preview_task_id: modelTaskIdSchema.parse(previewTaskId), target_formats: ["glb"] }),
  });
  return { taskId: modelTaskIdSchema.parse(data.result), status: "PENDING", phase: "refine" };
}

export async function readModel(taskId, { download = true, waitSeconds = 0 } = {}) {
  const path = "/" + encodeURIComponent(modelTaskIdSchema.parse(taskId));
  const deadline = Date.now() + waitSeconds * 1000;
  let data = await meshy(path);
  while ((data.status === "PENDING" || data.status === "IN_PROGRESS") && Date.now() + 3000 < deadline) {
    await setTimeout(3000);
    data = await meshy(path);
  }
  if (data.status === "FAILED" || data.status === "CANCELED" || data.status === "EXPIRED") {
    throw new Error(`Meshy 建模终止（${data.status}）`);
  }
  const summary = { taskId, status: data.status, progress: data.progress, phase: data.type };
  if (data.status !== "SUCCEEDED" || !download) return summary;

  const source = new URL(data.model_urls.glb);
  if (source.protocol !== "https:" || source.hostname !== "assets.meshy.ai" || source.port) {
    throw new Error("Meshy 返回了不受支持的模型下载地址。");
  }
  const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`模型下载失败（HTTP ${response.status}）`);

  let received = 0;
  const chunks = [];
  const limit = new Writable({
    write(chunk, _encoding, done) {
      received += chunk.length;
      if (received > limitBytes) done(new Error("GLB 模型超过 25 MiB。"));
      else { chunks.push(chunk); done(); }
    },
  });
  await pipeline(response.body, limit);
  const modelId = randomUUID();
  await mkdir(modelsDir, { recursive: true });
  await writeFile(new URL(`${modelId}.glb`, modelsDir), Buffer.concat(chunks), { flag: "wx" });
  return { ...summary, modelId };
}

export async function requireModel(id) {
  await access(new URL(`${modelIdSchema.parse(id)}.glb`, id === detailedCornId ? bundledModelsDir : modelsDir));
}
