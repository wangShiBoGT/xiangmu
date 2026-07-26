# AODL · 00 · 索引与认知栈（Index & Cognitive Stack）

> **AODL = AI Observatory Design Language**：AI 时代的人机认知设计语言。
> 就像 Apple 有 HIG、Google 有 Material、IBM 有 Carbon——AI Observatory 的设计文明沉淀在这里。
>
> 目标（Five-Year Test, P24）：**任何一行代码、任何一个页面、任何一个图标、任何一句文案，
> 都能在 AODL 里找到它存在的依据。** 找不到依据的，要么补依据，要么删。
>
> **NRP 职责边界**：跨全项目的知识路由与"最小上下文加载"由 `docs/AOKS/`（Context-Router / Migration-Map）负责，
> 本篇只做 **AODL 三篇（00/01/02）的本地目录与六层设计栈说明**，不重复承担全项目路由。

---

## 1 · 六层认知栈（The Six-Layer Stack）

AODL 不是平铺的规范集合，是一个**自上而下**的栈：上层决定下层的**存在理由**，下层是上层的**兑现方式**。视觉不是第一层——就像 Apple 先有 Think Different 再有 HIG，Material 先有 Paper 再有 FAB。

```text
Layer 0 · Worldview（世界观）          这个产品为什么存在、永不做什么
   ↓  决定
Layer 1 · Cognitive DNA（认知语言）    用户脑子里一步步发生什么          ← 最难被复制的一层
   ↓  决定
Layer 2 · Visual DNA（视觉语言）       为什么像同一只手画的
   ↓  决定
Layer 3 · Interaction Grammar（交互语言）  用什么统一动词与语法交互
   ↓  决定
Layer 4 · Design System（设计系统）    token / 图标 / 组件 / 评测的规则与数值
   ↓  兑现
Layer 5 · Implementation（实现）       代码里的 CSS 变量、组件、快照防线
```

**读法**：评审一屏时自上而下问——它服务认知阶梯哪一阶（L1）？气质对味吗（L2）？用的是既有交互语法吗（L3）？值合规吗（L4）？实现到位吗（L5）？**任一层答不出依据，即为债务。**

---

## 2 · 逐层索引（新写缺失层 + 索引复用四卷）

AODL 的定位是**不重复造轮子**：四卷宪法已经把 Design System 层定全了，AODL 只新写四卷缺失的上层（认知/视觉气质），其余层用索引指回四卷事实源。

| 层 | 文档 | 状态 | 事实源 / 说明 |
|---|---|---|---|
| L0 世界观 | 本篇 §3（锚点）| 索引 | → 四卷 Vol I 第一章（产品哲学）、第四章（品牌哲学）、第五章（产品语法）|
| L1 认知语言 | `01-Cognitive-DNA.md` | **新写** ✅ | 四卷无此层；散落判断收敛为"认知建立时序"+"观察阶梯" |
| L2 视觉语言 | `02-Visual-DNA.md` | **新写** ✅ | 四卷无此层；七轴视觉性格 + 同一只手测试 |
| L3 交互语言 | `03-Interaction-Grammar.md` | 待补（索引） | → Vol III 第一·二章（交互语法/组件哲学）、Vol I 第五章 |
| L4 设计系统 | `04-Design-System.md` | 待补（索引） | → Vol II（视觉哲学）、Vol III 第三·四·五章（Motion/token/图标）、Vol IV（评测）、`docs/DS0-token对照表.md` |
| L5 实现 | `05-Implementation.md` | 待补（索引） | → `src/index.css`（token）、`src/components/icons.tsx`（单库）、`dsSnapshots.test.tsx`（快照防线）|

> ✅ = 校准切片已成稿待定标准；待补 = 定标准后按同体例展开。

---

## 3 · Layer 0 · 世界观锚点（Worldview Anchor）

世界观不新写，全文在 Vol I。此处只钉三条最高裁决锚点，供 L1–L5 随时回溯：

1. **存在理由**：人类第一次观察 AI，本应该是什么体验——我们把它造出来。（Vol I §1.1）
2. **一句话定位**：别人做 AI Story（讲 AI 的故事），我们做 AI Evidence（出示 AI 的证据）。观察 AI，而不是观察答案。（Vol I §1.6）
3. **产品语法**：Question → Evidence → Interaction → Conclusion(用户产生) → Replay / Next Question。填不满五行的功能不立项。（Vol I 第五章）

> 冲突裁决顺序（Vol I 第六章）：基本法（Vol I 第一章、P1–P4、第五章）> 通则（P5–P24、词表）> 各卷规范（含本 AODL）> 个人品味。
> AODL 六层栈是"各卷规范"层内部的组织方式：它不凌驾四卷，但在其内部规定"下层依据回溯上层"。

---

## 4 · 与四卷宪法、DS0、合规速查表的关系

- **四卷宪法**：最高事实源。AODL 不改四卷任何数值/规则，只做四卷没做的"认知/视觉气质"层与"逐层依据回溯"。
- **DS0-token对照表**：Layer 4/5 的实现事实源（motion/radius token、字号/圆角校准债务）。
- **合规速查表**：提交前的一页速查（禁词/token/图标/交互红线），是 AODL 的"日常快速通道"，不替代 AODL 的分层依据。

---

*本篇随 L3–L5 补齐持续更新。每个开发批次的验收记录"宪法自查"一节，今后可同时对照 AODL 六层栈：每处改动写出它落在哪一层、依据哪一条。*
