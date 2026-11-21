import express from "express";
import { fileURLToPath } from "node:url";
import { bundledModelsDir, modelsDir } from "./model-assets.mjs";

const app = express();
const simulator = new URL("../../examples/15-embodied-sim/", import.meta.url);
const results = new URL("../../out/embodied-lab/", import.meta.url);
const addons = new URL("../../frame-hunter/vendor/", import.meta.url);
app.use("/examples/15-embodied-sim", express.static(fileURLToPath(simulator)));
app.use("/out/embodied-lab", express.static(fileURLToPath(results)));
app.use("/out/embodied-lab-models", express.static(fileURLToPath(bundledModelsDir)));
app.use("/out/embodied-lab-models", express.static(fileURLToPath(modelsDir)));
app.get("/lab-loader/loaders/GLTFLoader.js", (_req, res) =>
  res.sendFile(fileURLToPath(new URL("GLTFLoader.js", addons))));
app.get("/lab-loader/utils/BufferGeometryUtils.js", (_req, res) =>
  res.sendFile(fileURLToPath(new URL("utils/BufferGeometryUtils.js", addons))));
app.listen(8124, "127.0.0.1", () => {
  console.log("具身智能实验台回放服务已启动。http://127.0.0.1:8124");
});
