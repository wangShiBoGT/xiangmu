# ACDL 02 · Visual Grammar（统一视觉语法 · P30）

> 全站所有动画与交互只能属于四种语法之一。柱状图不再是核心语言（统计学语言 ≠ AI 语言；AI 不是 Excel）。评审时每个组件必须标注归属；归不进 = 重新设计。

## 1. 四种语法

### ① Birth（诞生）——产品 Logo 级能力
Token 不是被打印，是出生：`•••••••• → 聚合 → 凝聚成字`。
适用：token 生成、BirthScene、回答逐字呈现。
数据驱动：粒子数/聚合速度/亮度 = 真实 prob、候选数、entropy（无随机装饰）。

### ② Branch（分叉）
不是画很多柱子，是画很多未来：

```text
        ↗ 形成的
形成 →
        ↘ 形成一个
```

适用：候选展开、没走的路、Compare 分岔、Replay 岔口。
数据驱动：分支粗细/亮度 = 真实候选概率；分支文字 = 真实 topk 文本。

### ③ Collapse（坍缩）
多个未来 → 一个现实。Winner 落下，Loser 消散（量子坍缩，最贴合 LLM 采样本质）。
适用：采样落定、BirthScene 收尾、抽签动线（温度改命）。
数据驱动：消散时长/透明度 = 落选概率；落定 = 真实选中 token。

### ④ Flow（流）
Agent、RAG、Memory、Context 全是流，不弹 Panel——东西流过去（Dynamicland）。
适用：检索文档流入上下文、计划文本流出、模型交棒、上下文进入模型。
数据驱动：流的内容 = 真实文档/计划原文；流速/时序 = 真实耗时。

## 2. 现有组件归位表

| 组件 | 语法 |
|---|---|
| Token 逐字出现 / BirthScene | Birth（+ 结尾 Collapse） |
| Token 点击原地展开候选 | Branch |
| 没走的路 / Compare 分岔 | Branch |
| SamplingInspector 抽签/温度反事实 | Collapse |
| RAG 检索舞台 | Flow |
| Agent 规划 / model_handoff | Flow |
| Replay 时间线推进 | Birth（重演出生序列） |
| 3D Ocean（升级后） | Branch+Collapse 的空间化（Decision Ocean，见 §3） |

## 3. Ocean 的终局（Phase 6）

不是 Histogram，而是 Decision Space：每一步呈现 Future A/B/C（Branch）→ Collapse → Token；持续流动。信息仍在 2D 主舞台，Ocean 承担情绪（见 03-motion §4）。

## 4. 与叙事语法的对应

Observation → 静止的 Birth 结果；Comparison → Branch 并置；Transition → Collapse/Flow；Consequence → 落定后的正文。
一个完整叙事单元 = Observation → Comparison → Transition → Consequence，与五层链 Pattern→Story→Meaning 对齐。

## 5. 禁则

- 不属于四语法的动画一律不做；
- 无真实字段驱动的动效 = 装饰，删除（P25）；
- 呼吸光/随机噪声/无限循环动效触犯 P24 红线。
