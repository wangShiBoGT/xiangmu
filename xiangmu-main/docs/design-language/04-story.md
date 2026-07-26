# ACDL 04 · Story（叙事层规范 · Layer 3）

> 普通人理解故事，不理解 Timeline/Node/Workflow（程序员视角）。Story 远重要于 Timeline。UI 永远不直接画 Trace，先翻译成 Story。

## 1. 定义

Story = 用确定性规则把 Moment 翻译成的人话句子。不是 LLM 生成，就是规则模板 + 真实字段填空。

反例（Data）：`Step 143 · Entropy High · Rank 2`
正例（Story）：`它差一点写了「看起来」，后来写下了「形成」`

## 2. Story Engine（Phase 4 / Sprint 3）

```text
输入：Moment[]（含 prob/entropy/rank/dt/retrieval/plan 等真实字段）
输出：Story[]
```

结构：

```ts
interface Story {
  momentRef: number;      // 回链 Moment
  text: string;           // 人话一句（Story 层）
  meaning?: string;       // 最后才展示的解释（Meaning 层，可选）
  grammar: "birth" | "branch" | "collapse" | "flow"; // 视觉语法归属
}
```

## 3. 模板库（全部规则，字段填空）

| Moment 类型 | Story 模板 | Meaning 模板（下潜） |
|---|---|---|
| 掷硬币 | 它差一点写了「{loser}」，最后写下了「{winner}」 | 两个候选只差 {gap}%，胜负由采样抽出 |
| 温度改命 | 它没有写最有把握的「{rank1}」，写了「{chosen}」 | 温度 {T} 让第 {rank} 名被抽中 |
| 想法很散 | 写这个词之前，它同时想到了 {n} 种写法 | 这一步候选分布最分散（熵 {H}） |
| 卡住了 | 写「{token}」这一步，它用了平时 {x} 倍的时间 | 该步耗时 {dt}ms，全程中位数 {med}ms |
| 去查资料 | 它先去搜了「{query}」，把 {k} 篇里的 {m} 篇读进了上下文 | 检索耗时 {ms}，未采用 {k-m} 篇 |
| 先写计划 | 动笔前，它先给自己写了一份 {n} 字的计划 | 规划子运行耗时 {s}s{,接力交棒给 {model}} |
| 失败 | 它想查资料，但没查到（如实记录） | {error}，ok:false 入档 |

## 4. 铁律

- 措辞不声称主观状态：可以说「它差一点写了」（采样事实），不可以说「它想到了/它理解了」（P9）；
- Story 先于 Meaning 出现（P27）；Meaning 默认下潜；
- 每句 Story 必须能点击回到那一刻（回链 trace step）；
- 同一 trace 的 Story 输出确定性一致。
