# Story Mode + Compare 开发计划（时间维度主线 · 2026-07-24 规划）

> ✅ 已于 2026-07-24 交付：Sprint A（`lib/storyChapters`+测试 / `StoryPlayer` / 完成态入口）与 Sprint B（`lib/compareReplay`+测试 / CompareView 同步回放+分歧停点人话+双 top-k 下钻）。B4 入口经核对已由既有 ResearchTimeline「最近两条对比」、HistoryDrawer / ArchivePage 对比入口与 CompleteSummary「比较」动作覆盖，未重复新增（NRP）。验证全绿（283 测试）。本文兼作设计决策卡。

> 方向一句话：把产品从「单次 Run 的 Debugger」推进到「跨 Run 的时间维度」——
> 一条 trace 能被讲成一部纪录片（Story Mode），两条 trace 能被并排同步回放（Compare Replay）。
> 共同宪法：只消费 `.aitrace` 已有真实记录，不造新数据源；无数据的镜头诚实缺席；不新造播放器，复用既有 Replay 传输控制。

## 为什么是这两个（方向论证）

- 用户核心叙事是「你在 AI 的时间线上穿梭」。目前单次 Run 的 Observe/Explain/Microscope/Debug 四层已闭环，缺的是**时间维度的产品化**：跑完之后这条记录如何被讲述、如何被对比。
- 两者都零依赖新数据：Story Mode 消费单条 trace 的既有字段（pipeline/steps/agent/extensions），Compare 消费实验档案里已存的两条记录——不依赖注意力导出、不依赖重排器得分，不会被外部条件卡住。
- 不做 Time Travel（改参数重跑模拟）在本批：它依赖 Story/Compare 的时间轴组件成熟后复用，排下一批。

## Sprint A · Story Mode（同一 trace 的纪录片式 renderer）

**回答的问题**：「这次 Run 发生了一个什么故事？」——用户跑完（或打开一条存档）后，一键把整条 trace 按章节播放成有旁白的纪录片。

- A1 `lib/storyChapters.ts` 纯函数 + 测试：从单条 trace 自动切章节，全部用既有真实口径拼装（NRP，不新造算法）：
  - 开场「启动」章：`trace.pipeline` 实测（tokenize/prefill/decode 三段，无 pipeline 则本章缺席）；
  - 「检索/规划」章：`trace.agent` 事件（web_search/plan/model_handoff，无事件缺席）；
  - 「思考」章：复用 `thoughtMap` 的站（无 `<think>` 边界缺席）；
  - 「关键抉择」章：复用 `decisionPoints`（首字/最高熵/犹豫点）；
  - 「收束」章：完成统计（tokens/耗时/平均速度，全部实测）。
  - 每章输出：步区间、标题（白名单措辞）、一句旁白（全部由真实数字/原文摘录填模板，不拟人臆测）。
- A2 `StoryPlayer` 组件（不新造播放器）：包一层既有 Replay 传输控制——章节进度轨（点章跳段）+ 旁白字幕条（复用 ThinkingCaption 的字幕视觉语言）+ 章间自动停点（复用既有章节停点机制，等用户「继续」）。
- A3 入口：完成态 CompleteSummary 与实验档案（HistoryDrawer）各加「▶ 讲成故事」；Workspace 的 Current Run 卡挂同一入口。演示 trace 首屏 Replay 不改动（避免破坏现有首屏节奏）。
- A4 验收：每章步区间与 token 色条严格成比；旁白每个数字可在 trace 中定位；无对应字段的章节完全不出现；验证序列全绿。

## Sprint B · Compare Replay（两次运行的同步对比 renderer）

**回答的问题**：「同一个问题，两次 Run 差在哪、从哪一步开始分道扬镳？」

现状：`CompareView` 已有静态对比（首个分歧步、熵曲线叠加、参数 diff、双列 token）。本批把它升级为**同步回放**：

- B1 `lib/compareReplay.ts` 纯函数 + 测试：双 trace 对齐口径——共同前缀（逐 token 相同段）→ 分歧点 → 各自后续；输出同步播放的步映射（前缀段一对一，分歧后按各自步进）。
- B2 CompareView 加传输控制（复用既有 Replay 控制条）：播放/暂停/上下步，两列同步走；到分歧步自动停点（琥珀高亮 + 一句人话：「第 N 步走向不同：A 选了 x(p%)，B 选了 y(q%)」——两个概率都来自各自 trace 实录）。
- B3 分歧步下钻：点分歧步双列并排展开两边该步的真实 top-k（复用 SamplingInspector 双开），一眼看清是采样抖动（同候选不同抽签）还是分布本身不同。
- B4 入口收口：实验档案多选两条 → Compare；New Seed / 方向重跑完成后提示「与上一条对比」。
- B5 验收：共同前缀判定有测试（含空 trace/完全相同/首步即分歧边界例）；同步播放两列步号始终满足映射关系；验证序列全绿。

## 顺序与工作量

先 A 后 B（A 的章节轨/旁白条组件 B 直接复用）。A：约 2 个纯函数库 + 1 组件 + 3 处入口；B：1 纯函数库 + CompareView 增量改造。全程不动 worker、不动 trace schema（只读不写）。

## 五闸自检

- AODL 六层栈：全部消费既有证据层，新增的只是叙事 renderer。
- Evidence First：章节边界/旁白数字/分歧概率全部来自 trace 实录，模板措辞白名单化。
- 认知阶梯：Observe（故事播放）→ Explain（旁白+分歧人话）→ Microscope（分歧步 top-k 下钻）→ Experiment（从对比发起再跑）。
- Q→E→I→C→R：「两次为什么不一样？」→ 分歧步双 top-k → 点章/点步交互 → 用户结论 → 两条 `.aitrace` 均可导出复放。

## 完成定义

代码 + 测试 + 决策卡（并入本文件迭代）+ 看板更新；验证序列 `npx tsc -b` → lint → vitest → build 全绿；桥接写回本机并 SHA-256 校验。
