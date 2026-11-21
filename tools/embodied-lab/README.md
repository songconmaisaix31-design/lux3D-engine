# 具身智能实验台（暂定）

通过本地 Agent 运行农作物抓取实验。实验台复用 lux3D-engine 的四轴教学臂、七轴 Panda、WebAssembly 物理和抓放策略。

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

打开 Agent，发送一段自然语言指令。

> 我从没用过机械臂。请用桌面四轴臂把 35 克的番茄放到 A 区，再把重量改成 75 克。然后换成同重的玉米段，最后换成 Panda。每次只改一个条件，告诉我实验结果，并给我回放链接。

Agent 可以先调用 `list_experiment_options` 查看可用设置，再用 `run_experiments` 一次运行一到四组实验。用 `baseline` 设置第一轮，再用 `changes` 指定后续每轮相对上一轮要改的条件。回放服务只在本机监听，使用结果自带的链接即可观看。每次运行的轨迹保存到 `out/embodied-lab/`。

## 实验设置

- 机械臂可选桌面四轴臂和七轴 Panda。作物包括球形番茄、长方体代理的马铃薯、圆柱形玉米段。质量输入使用克，程序按碰撞体积换算物理引擎使用的密度。
- 抓放实验可以指定 A 或 B 落区、落区容许半径以及随机种子。比较时使用相同的种子。一次成功需要抬升至少 3 厘米，并通过引擎的松爪后稳定放置判据。
- 回放读取本次运行保存的实际位姿。抓取失败和超时也会生成回放。

后续扩展以现有场景规格和策略为入口。新增作物可从碰撞体和尺寸配置开始。新增机械臂可先使用引擎的 URDF 导入入口，再接入相应的抓放策略。新增任务应同时提供动作策略和成功判据。
