# ACDL Sprint 6 设计决策卡 · Agent Team Visualization

> 依据：`docs/architecture/AVP.md`（Agent Visual Protocol）。定位从「看 AI Token」升级为 **Watch AI Teams Work Together**。
> 本卡记录 S6-1~S6-10 落地时的关键设计决策与取舍，便于后续会话继承。

## D1 · 数据层与 UI 分离（S6-1）

- 决策：新增 `src/lib/team.ts` 作为唯一 Team 数据层，UI（`TeamFlow.tsx`）只消费 `TeamState`，不自己攒状态。
- `buildLiveTeam(input)`：运行中——由检索（webStage）/规划（planStage）/执行（steps+phase）三个真实子运行状态推导 Worker/Artifact/Handoff/Mission。
- `teamFromTrace(events, opts)`：完成态与存档回放——只从 trace 真实 agent 事件（plan 工具事件、web_search、model_handoff）重建，S6-9 Replay 因此零额外存储。
- 边界：单模型纯生成 = 只有 Executor 一名成员，此时 TeamFlow 整体不出现（不虚构团队）。

## D2 · Worker 身份与生命周期（S6-1/2）

- 角色优先、模型其次：`Planner · 规划 / DeepSeek-R1`；禁止无主语的「Agent 规划」。
- 七态：waiting → preparing → running → output → handing_off → finished / failed。
- 铁律「Worker 永不消失」：finished 降 opacity（0.75）+ 绿点，仍在名册与流水线中。
- 失败如实：failed 红点 + 红边 + 错误原文（如规划子运行报错），并展示降级去向（Executor 直接作答）。

## D3 · Artifact 统一卡与 Viewer（S6-3/8）

- 7 类：plan / search_result / context / tool_result / memory / summary / answer，统一 `ArtifactCard` 一种卡片。
- 真实映射：plan 工具事件→plan；RetrievalRecord→search_result（`retrievalSummary` 给出「选用 N 篇/落选原因」摘要）；主 trace 正文→answer（卡内只放真实 token 计数，正文本体在主舞台，不复制两份）。
- Viewer：>120 字截断，点击展开全文（aria-expanded，长文卡内滚动），再点收起。
- 失败 Artifact：ok:false → 红字红边，内容为错误原文。

## D4 · Handoff reason 与 Flow 动画（S6-4）

- 产出侧（本产品自己的规划/检索子运行）reason 必填：如「计划完成，交给执行模型逐 token 作答」。
- 外部 trace 缺 reason：显示「交接原因未记录（外部 trace 缺失，不猜测）」——不脑补。
- Flow 视觉语法：Artifact 沿 Worker 间虚线连接线入场（`team-artifact-in` 360ms），交接进行中光点沿线下行（`team-flow-dot` 1.4s 循环）；`prefers-reduced-motion` 全部禁用动画。
- 取舍：未做跨卡片几何飞行（DOM 结构上 Artifact 本就位于 from/to Worker 之间的连接线上，语义已表达「经由此线交付」，成本远低于 FLIP 动画且不破一屏布局）。

## D5 · Team Panel 常驻与 Mission Progress（S6-5/6）

- 运行分两段：子运行阶段 TeamFlow 全卡在主舞台；主生成开始后让位正文，`TeamPanel` 名册 chips + `MissionRow` 缩为一行常驻正文下方（Planner 变灰仍在）。
- Mission 阶段只由真实事件推导：检索（有 webStage 才有）/ 规划（有 planStage 才有）→ 作答 → 完成；普通用户层不再用「step 123」充当进度（专业视图 step 读数保留）。

## D6 · Decision Ocean 2.0（S6-10）

- OceanView 左侧新增「Team · 本次协作」实体卡：成员名册（角色+模型+状态点）+ 交接次数；仅 `team.workers.length > 1`（真实多 Worker）时出现。
- 3D 分工不变：3D = Feel，逐 token 决策粒子照旧；协作的解释性信息（reason、Artifact 全文）留在 2D 主页，Ocean 内只给指路（「交接详情见主页协作流」）。

## 验证

- `lib/team.test.ts` 10 例（单模型不虚构 / 生命周期 / Artifact 映射 / 失败态 / trace 重建 / retrievalSummary）。
- `TeamFlow.test.tsx` 6 例（角色优先+不消失 / reason 展示 / Viewer 展开 / Mission chips / 失败如实 / 缺 reason 口径）。
- 全量：tsc / oxlint / vitest 330 例 / build 全绿。云端浏览器为 CPU/WASM，WebGPU 待本机复核。
