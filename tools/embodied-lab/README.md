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

玉米入槽默认使用随仓库提供的精细模型 `sweet-corn-detail`。本地 GLB 和云端生成的 GLB 均使用现有的 Three.js 加载与回放路径。

若需要重建本地资产，在安装 NumPy 和 Trimesh 4.8.3 的 Python 环境中，从仓库根目录运行 `python tools/embodied-lab/assets/build-corn-model.py tools/embodied-lab/assets/sweet-corn-detail.glb`。

### 在 Windows 配置 Meshy

在 Meshy 开发者平台打开 API Keys，选择 Create API Key。用 PowerShell 7 输入密钥，并为当前 Windows 用户保存。Meshy 创建 API 密钥需要支持 API 的套餐。[Meshy API Keys](https://www.meshy.ai/developers/keys) · [Meshy 鉴权说明](https://docs.meshy.ai/en/api/authentication)

```powershell
$env:MESHY_API_KEY = Read-Host 'Meshy API Key' -MaskInput
[Environment]::SetEnvironmentVariable('MESHY_API_KEY', $env:MESHY_API_KEY, 'User')
```

从同一个 PowerShell 窗口启动 MCP 客户端，或者完全退出客户端后重新启动。用 `node tools/embodied-lab/cli.mjs list` 查看 `modeling.available`，此字段表示进程已读取密钥。

> 我有一段约 75 克的甜玉米。用 Meshy 生成有独立籽粒和明确尖端的精细带纹理 GLB，然后把同一物体放进仿真。让机械臂抬过筐沿、转向、尖端朝左放进长槽。请微调并返回成功结果和带生成模型的回放。

Agent 通过 `start_object_model` 生成预览网格，`get_object_model` 查询成功后，通过 `refine_object_model` 生成纹理。精修成功后查询并下载 GLB，将返回的 `modelId` 放入 `tune_corn_slot` 的 `baseline`。CLI 对应命令为 `model-start --detailed`、`model-get --status-only`、`model-refine`、`model-get` 和 `tune --model-id`。[Meshy 文本生成三维模型 API](https://docs.meshy.ai/en/api/text-to-3d)

回放会把 GLB 缩放并挂到物体的实际位姿。质量、碰撞和尖端判定取实验设置中的物理碰撞体。

后续扩展以现有场景规格和策略为入口。新增作物可从碰撞体和尺寸配置开始。新增机械臂可先使用引擎的 URDF 导入入口，再接入相应的抓放策略。新增任务应同时提供动作策略和成功判据。
