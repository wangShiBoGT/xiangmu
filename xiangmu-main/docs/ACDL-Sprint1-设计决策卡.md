# ACDL Sprint 1 · 设计决策卡（2026-07-25）

> 范围：P27–P31 入宪法与速查表；自绘 Dropdown 全站替换；Agent 规划舞台化；运行中一屏一问收纳；Questions IA（关键时刻问题式入口 + P27 证据倒转）。
> 依据：`docs/design-language/00–07`（ACDL 规范）与产品宪法 P27–P31。

## 1. 文档

- `E5-VolumeI-产品宪法.md`：使命句（理解 AI，不靠信任，靠观察）+ P27 Cognitive First / P28 One Screen, One Question / P29 Pattern Before Numbers / P30 One Visual Grammar / P31 Questions Drive Navigation + 三层原则架构（价值层/认知层/交互层）。
- `合规速查表.md`：同步为 31 条速记 + 使命句 + 三层级归位规则（新原则归不进三层就不新增）。

## 2. 自绘 Dropdown（`src/components/Dropdown.tsx`，ACDL 06 §3）

决策：
- 全站禁用原生 `<select>` 弹出层；一个组件双体系（tone=obs 暗 / paper 亮），`rg -n "<select" src` 归零。
- listbox/option 语义；键盘 ↑↓/Enter/Space/Esc/Home/End/Tab；↑↓ 自动跳过 disabled 项；hover 与键盘 active 同一高亮。
- **弹层用 createPortal 挂 body + fixed 定位**：实测发现记录台工具行是 `overflow-hidden` 容器，绝对定位弹层被裁剪不可见（浏览器实测抓到的缺陷）；portal 后不受任何祖先裁剪，scroll/resize 时收起。
- 上下自适应：下方空间 <240px 且上方更宽裕时向上展开。
- 状态完整：默认/hover/展开/选中(✓)/disabled 项/disabled 触发器/空 options（空列表如实为空，不虚构占位项）。
- 不引入依赖；复用既有 icons 与 token。测试 `Dropdown.test.tsx` 覆盖展开/键盘/禁用/空态/外部关闭。

替换三处：ObservePage 规划模型、ModelSelect 权重精度（paper）、ArchiveCards 模型筛选（obs, align=right）。

## 3. Agent 规划舞台（`src/components/PlanStage.tsx`，Flow 语法）

决策：
- 规划子运行从一行 prepNote 升级为主舞台卡片：真实 plan token 逐字流出（observe-plan worker update 事件）+ 实时计时器 + planner→executor 关系行（同模型 / 接力交棒需重新加载）。
- 状态四态全部真实驱动：running（流式）/ done（计划原文 + 实测耗时）/ empty（子运行完成但计划为空，如实说明）/ failed（错误原文展示，不粉饰）。
- 文案守宪法：只说「规划子运行/生成中/交棒」，不用「AI 在想/思考中」。
- P28 取舍：主生成开始出 token 后，默认舞台让位给正文流（PlanStage 让位），计划全文与耗时在完成态经 Agent Timeline / Workflow 阶段条随时可回看。

## 4. 运行中一屏一问（P28，`ObservePage`）

- 运行中默认只渲染：正文（TokenText）+ 当前时刻卡 + 一条细状态线（准备中/生成中 · 第 N 个 token · 最近 20 步平均耗时 · 模型 · 温度）+ PlanStage（真实发生时）。
- DebugBar / WorkflowStrip / InstrumentCluster / 3D / LivePanel 曲线全部下潜到「专业视图」按钮（localStorage `obs-pro-view`，默认关）；能力未删除，只改默认可见性。
- LivePanel：运行中仅专业视图渲染；完成态照旧。

## 5. Questions IA + P27 倒转（`ActivityLog`）

- 「决策日志」改为「关键时刻」：每条入口 = 读者问题（为什么它写「X」而不是「Y」？/ 为什么它没写第一名「X」？/ 为什么这一步候选特别散？/ 为什么「X」这一步写得特别慢？），token 原文来自真实 trace。
- 展开顺序固定为 P27 链：① Pattern——该步 top 候选真实概率条（选中亮/落选暗，先看形状）；② Story——一句人话（同一批真实读数）；③ Explanation——证据口径置底。禁止先结论后证据。
- UI 用「时刻」，代码/trace 保留 `Decision`。

## 6. 验证

- `npx tsc -b` / `npm run lint` / `npx vitest run`（52 文件 314 测试）/ `npm run build` 全绿；`rg -n "<select" src` 归零。
- 浏览器实测（云端 WASM 真跑 Qwen3 0.6B）：规划舞台 running 流式+计时、planner Dropdown 展开/键盘/收起、一屏一问默认布局与专业视图入口；Dropdown 被 overflow 裁剪的缺陷即来自该实测并已修复。
