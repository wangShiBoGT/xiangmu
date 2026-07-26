# AVP · Agent Visual Protocol（Agent 可视化协议）

> 状态：**草案 · 待创始人拍板**（2026-07-25）。拍板前不动 UI。
> 定位：这不是 UI 稿，是整个 Agent 可视化的**产品架构协议**。所有 Sprint 6 页面按本协议实现，先协议后组件（Architecture First）。
> 上位法：产品宪法 P1–P31；本协议属交互层，冲突时宪法优先。数据边界照旧：**没有真实记录的字段不显示、不估、不拟人**。

## 0. 定位升级（一句话）

产品灵魂从「看 AI Token」升级为：

> **Watch AI Teams Work Together. 观看 AI 团队如何协作。**

单模型 = 一个人的工作过程；多角色（Planner / Researcher / Executor / Reviewer / Tool …）= 一支团队。
**团队之间的信息如何流动、如何接力、为什么交棒**，是 Agent 最有价值、最能让普通用户「原来如此」的部分。
柱状图/采样显微镜已经足够好，保留为专业层；下一阶段不再优化柱状图，做 **Agent Flow（AI 协作流）**。

## 1. 产品目标：5 秒四问

用户不用懂 AI、不用懂 LLM。进入页面 5 秒内必须能回答：

| # | 问题 | 协议对象 |
|---|---|---|
| Q1 | 现在是谁在工作？ | Worker（角色优先） |
| Q2 | 为什么轮到它工作？ | Handoff.reason |
| Q3 | 它把什么交给了下一个？ | Artifact + Flow |
| Q4 | 整个团队进行到哪一步了？ | Mission Progress |

验收金句：第一次来的用户，不用教程，看完一次运行能自己说出——
「原来不是一个 AI 在回答，而是一个 AI 团队在合作：Planner 制定计划，把 Plan 交给 Executor 生成答案；需要搜索时 Researcher 去检索，再把结果交回来。」

## 2. Q1 · Worker：谁在工作（角色优先，模型其次）

- 任何时刻页面必须有明确的 **CURRENT OWNER**。禁止出现「Agent 规划」这种无主语标签——**Agent 不是角色，Planner 才是角色；Agent 不是模型，是一群模型。**
- 身份 = 角色 + 模型，角色优先：`Planner · DeepSeek-R1`、`Executor · Qwen`、`Researcher · Browser`。
- 面向用户的词是 **Team / AI 团队**，不叫 Agent（普通用户不知道 Agent，知道团队）。

```ts
/** 角色白名单（可扩展，但新增须入本协议） */
type WorkerRole = "planner" | "executor" | "researcher" | "reviewer" | "tool" | "memory";

interface Worker {
  id: string;            // 运行内唯一
  role: WorkerRole;      // 角色优先
  model?: string;        // 承担者（模型 id / "browser" / 工具名）；未记录则如实缺席
  status: WorkerStatus;
}
```

### Worker 生命周期（不许只有 Running/Finished，那太程序员）

```
waiting → preparing → running → output → handing_off → finished
                          └────────────→ failed（失败也如实展示，ok:false）
```

### 铁律：Worker 永不消失

- 已完成的 Worker **变灰/收敛，不移除**。DeepSeek 干完活不能凭空蒸发只剩 Qwen——用户会问「刚才那个去哪了」。
- 整个运行期间团队名单常驻（见 §6 Team Panel），只以状态色区分 running / finished / waiting / failed。

## 3. Q2 · Handoff：为什么轮到它（每次交接必须有原因）

- 每一次控制权转移必须回答「为什么」。`Planner Finished` 不合格；`完成计划 → 交给 Executor（Reason: Need answer generation）` 才合格。
- 数据层：现有 `ModelHandoffEvent`（`src/lib/agentTrace.ts`）已有 `reason?` 字段，S6 起**产出侧必填**（本产品自己发起的子运行都能如实给出原因：规划完成/需要检索/需要执行）。外部导入 trace 缺 reason 时如实显示「交接原因未记录」，不编。

```ts
interface Handoff {
  from: WorkerRef;       // 交出方（角色+模型）
  to: WorkerRef;         // 接手方
  reason: string;        // 必填：真实原因（Need execution / Need retrieval / 计划完成…）
  artifactId?: string;   // 交付物（见 §4）；没有真实交付物就不画流
  atStep: number;        // 锚定同一条 token 时间线（沿用 agentTrace 锚点约定）
}
```

## 4. Q3 · Artifact：它交出了什么（比 Token 更重要）

- Worker 结束不是 `Done`，而是**产出一个 Artifact 并交出去**。页面传递的不是「模型」，是 **Artifact**。
- Artifact 是统一数据对象 + 统一卡片样式（全产品一种卡）：

```ts
type ArtifactType =
  | "plan"           // 规划原文
  | "search_result"  // 检索结果（含弃用文档）
  | "context"        // 注入上下文
  | "tool_result"    // 工具返回
  | "memory"         // 记忆/存档引用
  | "summary"        // 摘要
  | "answer";        // 最终回答

interface Artifact {
  id: string;
  type: ArtifactType;
  producer: WorkerRef;   // 谁产出
  content: string;       // 原文，不清洗不改写
  atStep: number;
  durationMs?: number;   // 真实耗时（有记录才有）
}
```

- 现有真实数据的映射（不造新世界）：`plan` 工具事件 → Artifact(plan)；`RetrievalRecord` → Artifact(search_result)；`tool_result` → Artifact(tool_result)；最终 trace 正文 → Artifact(answer)。**没有真实内容的 Artifact 不出现。**
- Artifact 可点击查看全文（Artifact Viewer，S6-8），全文 = trace 原文。

### Flow：Artifact 必须「飞过去」，不许瞬移

- 交接不是切页面、不是弹窗、不是换卡片，而是**一条真实的数据流**：`Planner ██ → [Plan] ────► Executor ██`。
- 归属既有视觉语法 **Flow**（宪法 P30 四语法之一），动画载体 = Artifact 卡从 from 流向 to；reduced-motion 降级为静态箭头+卡。
- Flow 类型 = ArtifactType（plan / search_result / context / tool_result / memory / …），未来 MCP 工具流复用同一语法。

## 5. Q4 · Mission Progress：团队进行到哪（替代 step 123）

- 普通层进度 = **任务阶段**，不是 token 步数（`step 123` 没人关心，Token Progress 下潜专业层）。
- 阶段由真实事件推导（复用 `workflowStages` 证据分级：事件记录 > 结构边界 > 运行实测），无对应事件的阶段诚实缺席：

```
Understand ✔ → Plan ✔ → Search ●Running → Write ○Waiting → Review ○Waiting
```

## 6. Team Panel：团队总览常驻

- 页面固定位置（右上/侧栏）常驻 **TEAM 面板**：全部 Worker（角色+模型+状态点），当前执行者高亮。
- 让用户第一次知道：Agent 不是一个模型，是一群模型。
- 单模型运行时 Team 只有一个 Executor——如实呈现，不虚构队友。

## 7. 主舞台：Pipeline，不是 Card

Agent Timeline 从卡片改为**纵向流水线**（每个 Worker 一段进度 + 产出 Artifact + Flow 到下一个）：

```
Planner · DeepSeek-R1
■■■■■■■■ finished（73.2s 实测）
      ↓ Artifact: Plan（reason: 计划完成，交给执行）
Executor · Qwen
■■■□□ running
```

远期形态 = **Agent Orchestra**：USER 在顶，Planner/Researcher 分支汇入 Context，再入 Executor 出 Answer，每个节点实时亮。回放模式（S6-9）沿同一条时间线整场重演协作，Decision Ocean 2.0（S6-10）把多 Worker 协作纳入 3D（3D 仍=Feel，不承载必读信息）。

## 8. 诚实边界（继承宪法，逐条适用）

- Worker/Handoff/Artifact 全部由真实事件构造：子运行真实发生才有 Worker；真实交接才有 Flow；真实产物才有 Artifact。
- reason 只写机制原因（规划完成/需要检索/需要执行），禁止「AI 想/决定/认为」。
- 失败也是数据：failed Worker、ok:false 的 Artifact 原样入舞台，变红不隐藏。
- 外部 trace 字段缺失 → 「未记录」如实展示，不估算不脑补。

## 9. Sprint 6 任务拆分（10 个独立开发/验收/回滚单元）

| Sprint | 模块 | 核心目标 | 优先级 |
|---|---|---|---|
| S6-1 | Worker System | Planner/Executor/Researcher 等角色体系（数据层+身份规范） | ⭐⭐⭐⭐⭐ |
| S6-2 | Worker Timeline | 每个 Worker 独立生命周期与状态（六态，永不消失） | ⭐⭐⭐⭐⭐ |
| S6-3 | Artifact System | Plan/Search/Memory/Tool 统一数据对象+统一卡片 | ⭐⭐⭐⭐⭐ |
| S6-4 | Handoff Flow | Worker 间交接动画（Artifact 飞过去）+ reason 展示 | ⭐⭐⭐⭐⭐ |
| S6-5 | AI Team Panel | 团队总览常驻+当前执行者 | ⭐⭐⭐⭐ |
| S6-6 | Mission Progress | 任务阶段替代 Token Step 进度 | ⭐⭐⭐⭐ |
| S6-7 | Live Collaboration | 多 Worker 同时运行与协同可视化 | ⭐⭐⭐⭐ |
| S6-8 | Artifact Viewer | 点击查看每次交接内容全文 | ⭐⭐⭐ |
| S6-9 | Replay Mode | 回放整个 AI Team 协作过程 | ⭐⭐⭐ |
| S6-10 | Decision Ocean 2.0 | 多 Worker 协作融入 3D Ocean（不只单模型 Token 决策） | ⭐⭐⭐⭐⭐ |

实现顺序：S6-1 → S6-2 → S6-3 → S6-4 为地基链（缺一后面全空），S6-5/6 并行跟进，S6-7~10 在地基验收后排。
每个任务交付时按本协议逐条验收（§1 四问 + §2 铁律 + §8 边界），不满足即回滚。
