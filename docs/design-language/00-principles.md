# ACDL 00 · 原则（AI Cognition Design Language）

> 本目录是全站唯一的设计语言事实源。任何组件、页面、动画在设计与评审时必须引用本目录条目（如「BirthScene ← 02-visual-grammar · Birth」），不得自行发明语言。
> 状态：Phase 0 规范稿（待创始人拍板）。上游：四卷宪法 + AODL；本目录细化，不覆盖。

## 0. 定位与使命

**The Language for Seeing AI Think.**（让普通人读懂 AI 思考的语言）

> 理解 AI，不应该依赖信任，而应该依赖观察。
> Don't trust AI. Observe AI.

实现方式副句：我们不是把 AI 的数据画出来，我们把 AI 的思考翻译成人类能够理解的语言。
产品定位：AI Understanding Interface / AI Literacy Interface；对标 Distill、Explorable Explanations、Anthropic Interpretability——它们停在论文与演示，我们做成人人可用的产品。

## 1. 五层认知链（本语言的宪法级骨架，重于 P27）

任何呈现必须按此顺序组织，禁止倒序：

```text
Question（人真正的问题）
  ↓
Evidence（真实 trace 证据 · P25）
  ↓
Pattern（形状/对比/变化，先于数字 · P29）
  ↓
Story（人话叙事：它差一点写了…后来…）
  ↓
Meaning（最后才出现的一句解释）
  ↓
Professional（专业字段下潜：数值/分布/参数）
```

- Layer 0 Question：先定义用户脑子里真正的问题（见 01-questions.md）。
- Layer 1 Evidence：一切只能来自真实 Trace（P25，不变）。
- Layer 2 Pattern：先画形状不画数字，数字只是 tooltip（见 05-pattern.md）。
- Layer 3 Story：不是 Step143/Entropy High/Rank2，而是「它差一点写了『形成』，后来改成『构成』」（见 04-story.md）。
- Layer 4 Meaning：解释永远最后说（「这是因为温度让第二名被抽中了」）。
- Layer 5 Professional：既有三级下潜承载全部工程字段，不删、不默认在场。

## 2. 原则总表（三层级收敛，此后新增原则必须归入其一）

### 价值层（Why）
- 使命句（本文件 §0）
- P25 · Every Pixel Has Evidence（住址：E5-VolumeI）
- P26 · Meaning over Data（住址：E5-VolumeI）
- P9 · 诚实缺席：无真实数据不做、不推断、不伪造

### 认知层（How people understand）
- P27 · Cognitive First：界面优先呈现可观察的证据，再帮助用户形成理解；Evidence→Pattern→Meaning→Explanation（可选），禁止倒序
- P28 · One Screen, One Question：一屏只回答一个问题（见 07-layout.md）
- **P29 · Pattern Before Numbers**：用户先看到形状、对比、变化，再看到概率/熵/耗时数值；大脑识别模式，不阅读数字
- 五问检验（P26 四问 + 第五问「不写一句解释用户能不能自己看懂？」）
- 五层认知链（本文件 §1）

### 交互层（How the interface behaves）
- **P30 · One Visual Grammar**：全站动画/交互只能属于 Birth / Branch / Collapse / Flow 四种语法之一（见 02-visual-grammar.md）
- **P31 · Questions Drive Navigation**：导航、侧栏、入口围绕用户问题组织，不围绕技术模块（见 01-questions.md）
- 直接操纵 / 无隐藏状态 / 词即入口 / 三态骨架 / P24 视觉红线（住址：Vol III 与 AODL）
- 3D = Feel，2D = Understand（见 03-motion.md §4）：信息发生在 2D 主舞台，3D 只承担情绪，千万不要反过来

## 3. 单向数据流架构（代码层对应）

```text
Trace → Moment Engine（规则）→ Story Engine（叙事）→ Question Engine（问题）→ Visual Engine（四语法）→ UI Components
```

上层只依赖下层，禁止反向耦合；UI 永远不直接碰 Trace，只读 Story/Moment。
新增能力（RAG/Agent/MCP/Tool/Memory/未来 Attention）= 往 Moment Engine 加规则，其余层自动复用。

## 4. 开发四问（写代码前必答）

1. 它属于哪一种问题（Question）？
2. 哪一种时刻（Moment）？
3. 哪一种叙事（Story）？
4. 哪一种视觉语法（Birth / Branch / Collapse / Flow）？

答不全 = 不开工。

## 5. 诚实边界（不变，凌驾一切效果）

Story/Moment 全部为确定性规则纯函数，不用 LLM 生成叙事、无随机数装饰；
attention / hidden state / circuit / neuron / KV cache / 主观意图：模型导出前不做、不推断、不伪造，导出后仅作为新 Evidence 接入（Phase 7）。
