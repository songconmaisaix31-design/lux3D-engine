# 具身智能实验台（暂定）

通过自己的 Agent 描述物体、重量和要做的动作。实验台复用 lux3D-engine 的机械臂、WebAssembly 刚体物理、抓放控制和浏览器渲染。

## 本地启动

使用 Node.js 22.15 或更高版本。从仓库根目录运行以下命令。

```powershell
npm --prefix tools/embodied-lab ci
npm --prefix tools/embodied-lab run viewer
```

在支持本地 stdio MCP 的 Agent 中添加服务。启动命令为 `node`，参数为仓库中 `tools/embodied-lab/server.mjs` 的绝对路径。下面是 Claude Code 的 MCP 配置示例。

```json
{
  "mcpServers": {
    "embodied-lab": {
      "command": "node",
      "args": ["C:/path/to/lux3D-engine/tools/embodied-lab/server.mjs"]
    }
  }
}
```

打开已经接入实验台的 Agent，发送一段自然语言指令。对于估计重量，Agent 可直接采用这个数值。

> 有一段玉米，大概 75 克。请用机械臂把它抬过筐沿，再转向，尖端朝左放进长槽，松手后留在里面。微调动作，告诉我哪组完成了，给我回放链接。

Agent 可以调用 `list_experiment_options` 获取可用任务和默认配置。用 `run_experiments` 的 `baseline` 定义第一轮，以 `changes` 指定后续各轮相对上一轮改动的条件。用 `tune_corn_slot` 比较默认动作与抬升高度、转向时间、夹爪间距的变体。推荐结果必须完成夹持抬升、越过筐沿、尖端朝左并在松爪后稳定留在槽内。

用 `inspect_run` 查看阶段时间或指定时刻的实际位姿。每轮都保存轨迹到 `out/embodied-lab/`，结果链接可以在本机打开。回放支持暂停、拖动进度、从头播放和按阶段跳转。

## CLI

下面的命令与 Agent 走同一套仿真入口。

```powershell
node tools/embodied-lab/cli.mjs list
node tools/embodied-lab/cli.mjs run --task corn_slot --mass-grams 75
node tools/embodied-lab/cli.mjs tune --task corn_slot --mass-grams 75
node tools/embodied-lab/cli.mjs run --task corn_slot --scene '{"slotWidthCm":7.5}' --changes '[{"scene":{"slotWidthCm":9}}]'
node tools/embodied-lab/cli.mjs inspect RUN_ID --at 12
```

普通抓放支持桌面四轴臂、七轴 Panda、三种内置作物和自定义物体的球体、圆柱或长方体碰撞形状。玉米入槽使用七轴 Panda、带标记尖端的长形玉米碰撞体和固定初始位置。两种任务都能修改桌高。玉米任务还能修改筐沿高度、槽宽、抬升高度、转向用时和夹爪间距。约 75 克玉米的默认场景使用 4.5 厘米筐沿与 9 厘米槽宽。

## 文本生成三维外观

给运行 MCP 的进程配置 `MESHY_API_KEY` 后，Agent 可以把物体的描述交给 `start_object_model`，用 `get_object_model` 查询任务。成功后返回 `modelId`，运行实验时把它放入 `baseline`。CLI 可用 `model-start --prompt` 和 `model-get TASK_ID` 执行同一操作。

生成的 GLB 会贴合碰撞体的尺寸，用于回放外观。质量、碰撞和尖端判定取实验设置中的物理碰撞体。能够执行的动作由引擎已有的任务和控制策略决定。[Meshy 文本生成三维模型 API](https://docs.meshy.ai/en/api/text-to-3d)

后续扩展以现有场景规格和策略为入口。新增作物可从碰撞体和尺寸配置开始。新增机械臂可先使用引擎的 URDF 导入入口，再接入相应的抓放策略。新增任务应同时提供动作策略和成功判据。
