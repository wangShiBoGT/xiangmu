# ACDL Sprint 2–5 + 规划页优化 + 稳定性修复 · 设计决策卡（2026-07-25）

> 范围：① 规划页优化方案落地（`docs/ACDL-规划页优化方案.md`）；② 两项运行稳定性修复；③ ACDL Sprint 2 Moment Engine / Sprint 3 Story Engine / Sprint 4 Observe 减法 / Sprint 5 BirthScene 粒子成字。
> 原则约束：真实数据优先（P9 诚实缺席）、一屏一问（P28）、Pattern before Numbers（P29）、Story before Meaning、Moment/Story 全部确定性纯逻辑（同一 trace 永远同一输出）。

## Sprint 2 · Moment Engine（`src/lib/moments.ts`，9 测试）

- **一个口径，不造第二真相源**：步内时刻（coinflip / temp_override / scattered / slow）直接复用 `lib/decisions.ts` 的 `decisionEvents()` 判定（top-2 差<5%、熵≥0.7、慢步 3 倍均值、每类预算 3 条），Moment 层只做「判定结果 → 类型化数据」的映射，不另起阈值。
- **RunMoment 由真实 agent 事件解析**：`tool_call/tool_result(web_search|plan)` → retrieval / plan Moment；检索命中数、采用数从真实事件输出与 decision_point 备注解析；失败事件 `ok:false` 保留错误原文入 `error`，不隐藏、不脑补。
- 数据形状：每个 Moment 携带 `index` 回链 trace 步（RunMoment 用 `atStep`），下游任何一句话都能指回证据。

## Sprint 3 · Story Engine（`src/lib/story.ts`，7 测试）

- **零 LLM、零随机**：Story = 确定性模板 + 真实字段填空。模板对齐 `docs/design-language/04-story.md`：
  - coinflip →「它差一点写了「{loser}」，最后写下了「{winner}」」（语法 Collapse）
  - temp_override →「它没有写最有把握的「{rank1}」，写了「{chosen}」」（Branch）
  - scattered →「写这个词之前，它同时想到了 {n} 种写法」（Birth）
  - slow →「写「{token}」这一步，它用了平时 {x} 倍的时间」（Flow）
  - retrieval →「它先去搜了「{query}」，把 {k} 篇里的 {m} 篇读进了上下文」；失败如实说「没搜到」并保留错误原文（Flow）
  - plan →「动笔前，它先给自己写了一份 {n} 字的计划」；失败如实降级说明（Flow）
- 每条 Story 带 `momentRef` 回链 Moment（Moment 再回链 trace 步）；`meaning` 是证据口径句，供下钻展示。
- **落地点**：`ActivityLog`（关键时刻）改由 Moment→Story 引擎驱动，展示顺序不变：读者问题 → 真实概率条（Pattern）→ Story 一句话 → 证据口径（P27 禁倒序）。

## Sprint 4 · Observe 减法（完成态专业层下潜）

- 完成态默认视图只留：正文（把握度着色）+ 观察摘要 + Team 回看（compact）+ 「讲成故事」入口 + 尾栏。
- 下潜进「专业视图」（`obs-pro-view`，能力零删除）：DebugBar、WorkflowStrip/DecisionCard、思路地图、没走的路、Agent 逐事件时间线、检索决策卡、右栏曲线/Sampling Inspector/Pipeline。
- 完成态尾栏新增「专业视图 开/关」开关（与运行中控制台的开关同一状态位）。
- 空数据不渲染占位壳（诚实缺席）：右栏无 token 且无规划子运行时整段不出现。

## 规划页优化落地（方案 P1–P5）

- **P1 右栏不摆空壳**：主生成首 token 前，右栏 Sampling Inspector 由 `LivePanel` 的 `planSide` 换成 Planner 侧卡——规划模型、已思考秒（实时）、已流出字数（真实输出流长度）、交接预告（交给 {Executor} 作答）。
- **P2 规划流式区可读**：TeamFlow 加宽至 `min(720px, 92vw)`；计划流式区 `max-h 40vh` 内部滚动 + 自动滚到最新；`<think>` 长文折叠成「推理中…（N 字）展开 ▸」按钮（`aria-expanded`，展开即全文，不删一个字），正文与推理分区展示（复用 `lib/thinking` 的 `splitThinking`）。
- **P3 阶段收束过渡**：TeamFlow → TeamPanel 用一次 320ms `team-fold-in` 淡入下移；`prefers-reduced-motion` 直接切换。
- **P4 话术**：Planner 运行中 detail =「正在制定计划」；Executor 等待中 detail =「等待计划 · 拿到后开始作答」；等待首 token 文案改「正在唤醒规划模型…」。
- **P5 记录台**：停止按钮 title/aria =「停止并保留已生成」；运行中尾注加「运行中 · 输入已锁定；停止会保留已生成内容」。

## 稳定性修复

- **停止未即时生效**：根因是「停止」只 `postMessage({type:"interrupt"})`——检索等待中 worker 没有生成可中断；规划子运行被中断后，流水线仍会继续推进主生成。修复：主线程 `stopReqRef` 停止标志，`interrupt()` 置位；`runWith` 在检索段后、规划段后各设一个检查点，命中即清理准备态并回 idle，不再推进；主生成中断走原生 `stopping_criteria`（已生成步全部保留）。
- **长规划偶发页面重载**：多为低配设备 CPU/WASM 长推理内存不足，浏览器强制重载，无法在页内拦截。修复取「诚实告知 + 恢复」：运行开始时写 sessionStorage 运行守卫（`obs-run-guard`，含问题原文），完成/报错/手动停清除；下次挂载若发现守卫残留 → 显示「上次运行中页面被意外重载」卡片，把问题恢复到输入框并提供一键重试。不伪造成功输出。另：`<think>` 长文折叠（P2）同时降低了长规划期的 DOM 压力。

## Sprint 5 · BirthScene 粒子成字

- 在既有词表投票场景上加「粒子成字」层：每个候选先化作一颗粒子从自己的圆周位置飞向中心（`birth-scene-converge`），大小 3–7px、时长 240–400ms 均 ∝ 该候选真实概率（确定性，无随机数）；胜者在汇聚处凝聚成字（既有 `birth-scene-winner`），落选者按真实概率飘散淡出（Collapse）。
- 触发与频控不变（导演系统既有口径）：top-2 差<5% 或 entropyLevel≥0.7；大场面最小间隔 12 步；`prefers-reduced-motion` 全部静态。
- 无对应真实字段（如旧 trace 无 topk）时场景诚实缺席。

## 验证

- `npx tsc -b` / `npm run lint` / `npx vitest run`（56 文件 344 测试，本批新增 16）/ `npm run build` 全绿（Node 22.23.1）。
- 浏览器实测（vite preview + CDP，无录屏）：落地页/演示切片加载零 console 错误；完成态默认视图无 Workflow/思路地图/Inspector；「专业视图」开关开→思路地图/没走的路出现、关→收起。
- 云端无 WebGPU：规划子运行实跑、停止即时性、意外重载恢复的真机行为待本机 WebGPU 复核（不伪称已复测）。
