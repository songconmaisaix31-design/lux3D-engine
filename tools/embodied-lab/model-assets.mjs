import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";
import { z } from "zod";

export const modelsDir = new URL("../../out/embodied-lab-models/", import.meta.url);
export const modelIdSchema = z.uuid();
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

export async function startModel(prompt) {
  const data = await meshy("", {
    method: "POST",
    body: JSON.stringify({ mode: "preview", prompt, should_remesh: true, target_polycount: 20000, target_formats: ["glb"] }),
  });
  return { taskId: modelTaskIdSchema.parse(data.result), status: "PENDING" };
}

export async function readModel(taskId) {
  const data = await meshy("/" + encodeURIComponent(modelTaskIdSchema.parse(taskId)));
  if (data.status === "FAILED" || data.status === "CANCELED" || data.status === "EXPIRED") {
    throw new Error(`Meshy 建模终止（${data.status}）`);
  }
  if (data.status !== "SUCCEEDED") return { taskId, status: data.status, progress: data.progress };

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
  return { taskId, status: data.status, modelId };
}

export async function requireModel(id) {
  await access(new URL(`${modelIdSchema.parse(id)}.glb`, modelsDir));
}
