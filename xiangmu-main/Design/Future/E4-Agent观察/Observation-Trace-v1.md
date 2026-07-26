# Observation Trace v1（标准草案）

> 定位：AI Runtime 的统一观察协议——不是「Token 播放格式」，而是「决策链回放格式」。
> 口号对齐：Observe every decision an AI makes。Token 是 AI 做出的最小决策，
> Agent Workflow 是完整决策链。本草案是 `.aitrace` 的加法式演进，不推翻既有字段。

## 设计原则（继承产品宪法，See docs/合规速查表.md）

1. **Decision 是一等公民**：记录的核心单元是「决策→行动→证据→结果」，Node 只是行动的载体。
2. **Evidence First**：每个字段来自真实运行记录；缺失字段如实缺席（不估算、不补齐、不显示）。
3. **同一条时间线**：所有层级事件用 `atStep` 锚定在 token 时间线上，回放复用同一套仪器。
4. **失败也是数据**：错误输出、低置信决策、重试原样保留。

## 分层结构（观察深度自上而下）

| 层 | 对象 | 已实现载体 | 状态 |
|---|---|---|---|
| Run | 一次完整运行（prompt/params/seed/模型） | `.aitrace` 根字段 | ✅ 已实现 |
| Decision | 为什么（reason/confidence/evidence） | `agent[].reason / confidence / evidence` | ✅ 已实现（数据来自导入） |
| Workflow | 工具/模型交接（tool_call/tool_result/model_handoff） | `agent[]` 事件 | ✅ 已实现（数据来自导入） |
| Model Responsibility | 每段 token 归属谁 | `model_handoff` → `modelSegments()` 推导 | ✅ 已实现 |
| Token | 逐步候选/概率/熵/耗时 | `steps[]` | ✅ 已实现 |
| Sampling | 采样前 logits 快照/反事实 | `steps[].deep`（深度采集） | ✅ 已实现 |
| Metrics | latency/cost/GPU | 未定义 | ⏸ 草案阶段 |

## 事件 Schema（当前实现，See src/lib/agentTrace.ts —— 代码是唯一事实源）

所有事件共有：`atStep`（锚定步）、可选 `model`（产出方）、可选 `reason`（为什么）、
可选 `confidence ∈ [0,1]`（上游 runtime 如实记录，非本地估算）。

- `tool_call`：`tool` + 原始 `input`（不清洗）
- `tool_result`：`tool` + 原始 `output` + `ok` + `durationMs`
- `decision_point`：可选 `note`、`evidence`（证据原文，不改写）
- `model_handoff`：`to`（接手方）+ 可选 `from`——责任边界，非瞬时事件

导入校验：`sanitizeAgentEvents()` 逐条过滤非法事件，主链不失败。

## 路线图（诚实边界：本机 runtime 只有单模型 WebGPU 推理）

- **V2 Runtime Observatory**：外部 Agent 框架（LangGraph/Dify/OpenAI SDK 等）导出适配器 →
  本产品导入回放。先做导入侧标准，不做假的"本机多 Agent 运行"。
- **V3 Compare Lab**：双 Run 同步回放 + Decision Diff / Sampling Diff。
  依赖 V1 的 Run 可复现性（已具备：seed + 完整 trace）。
- **V4 Time Travel / Simulation**：暂停→改参数→续跑。本机单模型场景已有雏形
  （犹豫点双跑 / 温度反事实重算）；跨工具的 workflow 级 time travel 依赖 V2。
- **Metrics/GPU 层**：待本机可稳定测量后再入协议，不先放空字段。

## 开放扩展（防写死）

根级可选 `extensions: Record<string, unknown>`：各 runtime 以命名空间自携数据
（如 `"openai.reasoning"` / `"anthropic.thinking"` / `"deepseek.planning"`），
导入/导出**原样保留、不解释、不渲染**——接入新 runtime 无需升级协议。
解释某个命名空间时才为其定义正式层，未定义前不做假 UI。

## 下一层草案：Decision Context（未实装，先立规范）

Decision 是结果不是原因。完整决策观察还需两块（等真实 runtime 能导出再实装）：

- **Available Choices**：`selected` + `rejected[]`——「为什么选 Search」的完整答案
  是「为什么没选 Python/Browser/Memory」。无真实候选清单前不渲染。
- **Decision Context**：决策发生时的上下文快照（system prompt 摘要 / memory /
  可用工具开关 / 上下文长度）。协议位置预留在 `extensions` 下试运行，
  稳定后再提升为正式字段。

## 非目标

- 不做流程图编辑器（Dify/Flowise 的领域：让 AI 工作；我们的领域：看见 AI 怎么工作）。
- 不伪造任何演示 trace；多模型/Agent 数据只来自真实运行的导出。
