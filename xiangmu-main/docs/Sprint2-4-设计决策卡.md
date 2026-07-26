# Sprint 2–4 · 设计决策卡（三张，随代码交付）

> 只答一个问题：这三个批次各自让用户多理解了什么，证据来自哪。模板 See `AOKS/PRODUCT-DELIVERY-WORKFLOW.md`。

### Runtime Journey（Sprint 2）· 设计决策卡
- 用户与场景：Explorer；问题：第一个字出现之前，AI 先做了什么？
- 认知位置：第 0 阶（生成不是瞬间的）→ 钩子：decode「逐字抽签」引出概率场。
- 唯一主焦点与主动作：三段启动路的点亮进度；主动作 = 等待或「跳过铺垫」。
- Q→E→I→C→R：问「首字前发生了什么」→ 证据 pipeline 实测三段耗时 → 交互跳过/等待 → 结论「先读完再逐字选」→ Replay 重播即重现。
- 真实数据来源：`trace.pipeline.tokenizeMs/prefillMs/decodeMs`、`promptIds.length`、`steps.length`；无 pipeline 字段不渲染（诚实缺席）。
- 视觉映射：点亮顺序 = 时间先后；脉冲点 = 当前阶段；数字 = 实测毫秒。
- 删除测试：删掉后用户以为生成从第一个字开始，丢失 prefill 这一真实阶段。
- 渐进披露：详情住址在 LivePanel 的 PipelineBar（同一字段，不重复解释）。
- 风险：被误当加载动画 → 已标注「数字来自本次 trace 的 pipeline 实测」。
- 验收：非快进 Replay 开场出现三段并与 LivePanel 数字一致；快进模式不出现。

### Decision Moments（Sprint 3）· 设计决策卡
- 用户与场景：Explorer→Researcher；问题：这次生成里，AI 真正「做了选择」的是哪几步？
- 认知位置：第 2 阶（从看单步到看全程决策结构）→ 钩子：点击任一时刻进入既有三级下潜。
- 唯一主焦点与主动作：一排可跳转的决策时刻 chips；主动作 = 点击定位。
- Q→E→I→C→R：问「哪里在做选择」→ 证据 steps[].entropy/topk 实算 → 点击跳转 → 结论「选择集中在少数关键步」→ 时刻表随 Replay 常在。
- 真实数据来源：`decisionMoments()`（首字 prob / 最高熵步 / closeSteps 前 3），纯函数有测试；规则命中不重复列（事件表已有住址）。
- 视觉映射：琥珀 = 犹豫、靛蓝 = 分散、灰 = 首字；#步号+读数为真实值。
- 删除测试：删掉后用户需逐 token 翻找关键步，丢失全程决策结构一览。
- 渐进披露：chips 只给读数，展开分布走既有 Inspector/概率场。
- 风险：时刻过多变数据墙 → 犹豫点上限 3 个、同步去重。
- 验收：chips 与 Observation Log 判读行数字一致，点击后镜头/句带同步。

### Agent 旅程带（Sprint 4）· 设计决策卡
- 用户与场景：Builder；问题：这趟 Agent 旅行在哪里调了工具、哪里失败、哪里交接？
- 认知位置：第 3 阶（Token → 完整决策链）→ 钩子：决策点跳转后用既有 top-k 下钻。
- 唯一主焦点与主动作：token 轴上的事件色带；主动作 = 点击定位到那一步。
- Q→E→I→C→R：问「旅程结构」→ 证据 agent 事件 atStep 锚点 → 点击跳转 → 结论「工具失败/交接的确切位置」→ 与 token Replay 同轴重现。
- 真实数据来源：`.aitrace` agent 事件（`sanitizeAgentEvents` 校验过）；无事件则整个 AgentTimeline 不出现。
- 视觉映射：横轴 = token 序列；色 = 事件类型（调用/成功/失败/决策/交接）；位置 = 真实 atStep。
- 删除测试：删掉后事件只剩列表，丢失「发生在生成的哪个阶段」的空间信息。
- 渐进披露：色带只给位置，详情在下方既有事件卡。
- 风险：事件重叠难点选 → 色块最小宽度兜底 + title 注明步号。
- 验收：色带位置与事件卡「第 N 步」一致，命中分布条同款交互语法。
