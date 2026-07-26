# ACDL 06 · Components（组件规范）

> 任何组件必须引用本目录条目立项：Question（01）· Moment 类型 · Story 模板（04）· 视觉语法（02）。四项答不全 = 不开工（开发四问，见 00 §4）。

## 1. 组件登记表（现有组件归位）

| 组件 | Question | 语法 | 说明 |
|---|---|---|---|
| TokenText 正文 | AI 为什么写这个？ | Birth | 把握度着色 = Pattern |
| Token 候选展开 | 为什么它没写另一个词？ | Branch | FLIP 原地，无 Modal |
| BirthScene | 为什么它写「X」？ | Birth+Collapse | 犹豫点触发，预算制 |
| ActivityLog→关键时刻 | 读者层 Questions 入口 | —（列表） | 只读 Story |
| SamplingInspector | 为什么换温度会改变答案？ | Collapse | 专业下潜 |
| RAG 舞台 | AI 为什么引用这一段？ | Flow | 命中/弃用真实状态 |
| Agent 规划舞台 | AI 为什么决定这样做？ | Flow | 计划逐字流出 |
| OceanView→Decision Ocean | AI 什么时候开始犹豫？ | Branch+Collapse | 3D=Feel（Phase 6） |
| CompareView | 两次运行从哪里分岔？ | Branch | 同步回放 |

## 2. 状态完整性（硬规则，教训固化）

任何交互组件必须连同**全部状态**一起设计并验收：默认 / hover / 展开 / 加载中 / 失败 / 空态 / 禁用。
只交付「关着的样子」不算完成；展开态压在什么背景上、加载中主舞台放什么，属于设计本体。

## 3. 基础控件

- 全站禁用原生 `<select>` 弹出层；统一自绘 `Dropdown`：rounded-xl · border-obs-line · bg-obs-2 · shadow-float · backdrop-blur，键盘可达（↑↓/Enter/Esc）、listbox 语义、点击外部关闭、上下自适应展开；
- 浮层/菜单/tooltip 同一气质件复用，不引新依赖；
- 所有控件可键盘导航，可视元素有文字说明（无障碍）。

## 4. 单向数据流约束

组件只读 Story/Question/Moment 层输出，禁止直接解析 Trace；新增能力先在 Moment Engine 加规则，再登记本表。
