# 设计决策卡 · RAG 进运行链 + Agent 规划接力 + Live-Debug 断点

> 目标：让「AI Runtime Debugger」补齐三块真实运行能力——检索进 Workflow、双模型接力、生成中断点。
> 铁律：每个事件都来自真实发生的调用；失败也如实入档；无能力则诚实缺席。

## 决策 1 · 联网检索进运行链（RAG Observatory，不做独立页）

- **问题**：RAG 不该是脱离 Workflow 的指标页；用户想知道「它引用了什么，放弃了什么，为什么」。
- **方案**：ObservePage 输入区「🔎 联网检索」开关（持久化 `obs-web-search`）。Run 前真实 `webSearch`：
  - 成功 → `buildRetrievalEvents`（tool_call / tool_result / decision_point：前 K=4 进上下文、其余因上下文预算放弃，理由如实写「按返回顺序取前 K，无重排器」）；`RetrievalRecord` 存 `trace.extensions.retrieval`；执行段用 `buildSearchPrompt(前 K 条)` 续跑。
  - 失败 → `buildRetrievalFailEvents`（ok:false + 错误原文）挂 trace，降级按原问题直接作答，不隐藏。
- **呈现**：完成态 `RetrievalCard`——一句人话先行（「它拿 X 去搜，N 篇里选了 K 篇，因为…」），已引用暖白卡、未采用幽灵虚线 + 原因标签；沿用「没走的路」视觉语言。WorkflowStrip / AgentTimeline 照常消费事件（事件级证据，可点跳转）。
- **不做**：不虚构相关性得分（没有重排器就不显示分数）；Recall/Precision 等专业指标不进默认叙事。

## 决策 2 · Agent 规划接力（Agent = Workflow 升级）

- **问题**：Agent 不是新物种，是 Workflow 的升级；双模型协作必须真实发生、真实记录。
- **方案**：「🧭 Agent 规划」开关（持久化 `obs-agent-plan`）+ 规划模型下拉（`obs-planner-model`，默认同执行模型）。
  - Run 前先跑真实规划子运行（worker `src=observe-plan`，不记主 trace，流式累积）；计划原文（`stripThinking` 后）+ 实测耗时记入 `plan` 工具事件（`buildPlanEvents`，含模型归属）。
  - 选另一模型 = 接力式双模型：规划模型跑完，主生成切执行模型（worker 既有换模型即重载机制，先卸再载），交接记 `model_handoff`（`buildHandoffEvent`，理由如实写接力式）；AgentTimeline 模型责任分段照常显示两段归属。
  - 执行段提示词 = `buildExecutePrompt(检索上下文或原问题, 计划)`，同一条 trace 贯穿。
  - 规划失败 / 空计划 → tool_result ok:false + 原文，降级直接作答。
- **不做**：不做双模型同时驻留（浏览器显存无法保证，能力不足诚实缺席）；不编造交接耗时（主生成内加载时长未单独计量时 note 缺席）。

## 决策 3 · Live-Debug 犹豫断点（Sprint 4 收尾）

- **问题**：Pause 靠手速；用户想「在它犹豫的那一刻自动停下来检查」。
- **方案**：DebugBar「◉ 断点 · 犹豫点」开关（持久化 `obs-bp-hesitation`，running/done 态都可切，下次 Run 生效）。
  - 口径：top-2 概率差距 < 5%，与 closeSteps / 此刻卡犹豫口径同源（`lib/breakpoints.ts` HESITATION_GAP）。
  - 生成中只扫描新到达的步（`hesitationBreakIndex(steps, fromIndex)`）；命中即真实中断（与 ⏸ Pause 同一 interrupt 机制），完成后自动定位命中步，检查候选分布后可 ▶ Continue 真实续跑（既有能力，产物标注非原始记录）。
- **不做**：不做「修改该步后原地续跑」的假象——改选走既有 Fork（真实续跑挂分支）。

## 五闸自检

- AODL 六层栈：事件级证据（Agent 原文）优先，UI 只消费真实记录。
- Evidence First：检索结果、计划原文、耗时、交接、断点命中步全部实测/原文。
- 认知阶梯：Observe（开关+状态行）→ Explain（RetrievalCard/AgentTimeline 人话）→ Microscope（决策点跳 token 下钻）→ Experiment（断点暂停后 Continue/Fork）。
- Q→E→I→C→R：为什么引用这段？→ 检索决策卡证据 → 点击跳步/续跑 → 用户结论 → `.aitrace` 含 agent+extensions 可回放导出。

## 验证

`npx tsc -b` / `npm run lint` / `npx vitest run`（45 文件 268 通过，新增 breakpoints + handoff 测试）/ `npm run build` 全绿（Node 22.23.1）。
