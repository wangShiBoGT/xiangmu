# AGENTS.md · 所有 AI 开工前必读

> 适用于任何 AI（Claude / Codex / Gemini / GPT / Cursor / Devin）与人类贡献者。
> 本项目是 **AI Observatory**。它以 AOKS（AI Observatory Knowledge System）组织知识：让每个任务拿到足够、但不过量的上下文。
> 铁律：**永不全量加载文档；token 只花在当前任务必需的地方。**

## 0 · 先判定任务，不要先读一堆文件

先回答：这是接续开发、Bug/验证、视觉/交互、产品/新模块、Trace/Agent、评测，还是文档治理？

然后打开 `docs/00-START-HERE.md`，再按 `docs/AOKS/CONTEXT-ROUTER.md` 只加载对应链。
若任务改变产品方向、规范住址或文档角色，先读 `docs/AOKS/SOURCE-OF-TRUTH.md`；不确定时停在设计阶段，不用代码猜方向。

## 1 · 每次任务的最小必读

1. `docs/合规速查表.md`：日常提交的宪法压缩与红线。
2. `docs/AODL/01-Cognitive-DNA.md`：用户如何从困惑走向理解。
3. `docs/AODL/02-Visual-DNA.md`：探索性、克制且可观察的视觉气质。
4. 接续开发、问进度或排期时，再读 `docs/任务看板.md`；完成后必须当场更新它。
5. 打开 `docs/AOKS/CONTEXT-ROUTER.md`，只加载任务行列出的额外文件。
6. 读任何文档前先查 `docs/AOKS/DOC-INDEX.md`（标题+行号索引），按行号只取需要的片段；读写约束见 `docs/AOKS/TOKEN-DIET.md`。

历史验收、早期推演和完整规划均按需回卷，**不自动加载**。不要把“读得多”误当作“理解得深”。

## 2 · 开发前：五闸 + 设计决策卡

功能、产品或影响体验的改动，在写代码前必须完成五闸（`docs/E5-双轨开发计划.md` §3）：

```text
□ 符合 AODL 六层栈？
□ 符合 Product Constitution（四卷）？
□ 每个视觉/数字都有真实数据来源，符合 Evidence First？
□ 接认知阶梯哪一阶，并埋下哪个下一阶钩子？
□ 能填满 Question → Evidence → Interaction → Conclusion（用户产生）→ Replay？
```

视觉、交互或新模块还必须按 `docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md` 完成一张**设计决策卡**；它不是额外的官僚流程，而是防止把真实 Trace 做成普通 Dashboard 或假生命动画。

## 3 · 三条 AOKS 铁律

- **NRP**：一句原则只存一处；其他地方只写 `See <住址>`。唯一住址与裁决顺序见 `docs/AOKS/SOURCE-OF-TRUTH.md`。
- **单文件 ≤500 行、只答一个问题**：超了就拆；文件的生命周期见 `docs/AOKS/DOCUMENT-LIFECYCLE.md`。
- **Context Router**：按任务加载最小上下文，不能因“可能有用”而全读。

## 4 · 产品底线（速记，不替代事实源）

- 观察 AI 做出的每一个可追溯选择；**真实运行本身成为特效**。
- 没有真实数据，不动、不推断、不做假 UI；无法测量时诚实缺席。
- 3D、动效与空间关系都必须使用户多理解一件事；删掉不损失信息，就删掉。
- 默认先服务 Explorer 的好奇与理解；专业字段通过既有三级下潜呈现，不以工程仪表盘作为默认入口。

规范住址：Evidence/语言/产品语法见 Vol I；认知与视觉见 AODL；交互与 Motion 见 Vol III。

## 5 · 事实源与交付

四卷宪法 > AODL > 已批准的模块体验稿/规划 > 任务看板 > 历史记录。冲突裁决与每个文件的角色见 `docs/AOKS/SOURCE-OF-TRUTH.md`。

实现变更必须按项目既有验证序列完成：`npx tsc -b` → `npm run lint` → `npx vitest run` → `npm run build`（Node 22.23.1）。
代码、测试、必要的体验稿/决策卡与更新后的任务看板必须一起交付。
