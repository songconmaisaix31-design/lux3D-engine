import express from "express";
import { fileURLToPath } from "node:url";

const app = express();
const simulator = new URL("../../examples/15-embodied-sim/", import.meta.url);
const results = new URL("../../out/embodied-lab/", import.meta.url);
app.use("/examples/15-embodied-sim", express.static(fileURLToPath(simulator)));
app.use("/out/embodied-lab", express.static(fileURLToPath(results)));
app.listen(8124, "127.0.0.1", () => {
  console.log("具身智能实验台回放服务已启动。http://127.0.0.1:8124");
});
