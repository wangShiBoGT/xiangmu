# AI Microscope Design Constitution

> **本文件是全项目最高设计法。任何 AI（或人）改代码之前，必须先读本文件，再开始工作。**
> 与下层文档冲突时以本文件为准。效力顺序：
> **本宪法 > design-language.md > design-system.md > component-guideline.md > layout-plan.md / remove-plan.md / reference-study.md > 具体代码现状。**

## 十条

1. **Evidence First**：任何可视化都必须来源于真实数据（trace / pipeline / agent 事件），不制造不存在的状态；数据缺席时诚实缺席，不用占位假象填充。
2. **One Focus Per Screen**：一个页面只能有一个视觉中心；阅读顺序恒为 Hero → Explain → Interaction → Result → Advanced → Debug。
3. **Layout Before Decoration**：先解决信息组织（层级/顺序/密度），再考虑颜色和阴影；不允许用装饰弥补结构问题。
4. **Consistency Over Creativity**：统一性优先于炫技；宁可平淡一致，不要局部惊艳。
5. **Scientific Instrument, Not AI Chat**：整体体验像实验室工具（DevTools / Figma / Apple 实验软件），不是聊天机器人、不是 Dashboard、不是 SaaS 模板；禁 Glass、禁 Glow、禁 Cyberpunk、禁渐变背景、禁彩虹色。
6. **Remove Before Add**：优先删除复杂度，而不是增加组件；新增任何元素前先回答"能不能靠删除解决"。
7. **Motion Has Purpose**：动画只用于帮助理解状态变化，时长/幅度受 design-system 动效预算约束；`prefers-reduced-motion` 下直切或静态。
8. **All Components Come From Design System**：颜色只用中性带 + measure/caution/alert 三测量色；Radius 三档、Shadow 两档、Button 四种、Card/Badge 各一种；禁止新增游离样式。
9. **Every New Page Must Reuse Existing Patterns**：新页面优先复用既有骨架与部件，而不是重新设计；骨架恒定，新功能服从骨架。
10. **Every Change Must Improve Understanding**：任何视觉改动都必须帮助用户更理解 AI，而不是更"酷"；改动前自问——删掉它，用户会少理解什么？答不上来就删。

## 开工前检查（每次改代码必过）

- [ ] 已读本宪法与相关规范文档；
- [ ] 本次改动不违反十条中的任何一条；
- [ ] 不改变业务与功能（除非任务明确要求）；
- [ ] 改完跑 `tsc -b` / lint / vitest / build 全绿。
