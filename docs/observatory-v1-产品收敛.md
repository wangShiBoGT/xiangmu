# AI Observatory V1 产品收敛文档

> 从观察 AI 输出，到观察 AI 本身。
> 本文档是战略讨论的收敛结论：V1 只做一个核心闭环，其余进路线图。
> 原则：一切基于现有 Browser AI Microscope 平台升级改造，不推倒重来。

## 一、定位

- 不做：「一个可以看到 AI token 的网页」（市场太小）
- 不做：「AI 博物馆」（六个仪表盘同时上线会死）
- 做：**第一台真正能看见 AI 决策过程的仪器**
- 一句话：让一个人打开 Ocean 后说出「原来 AI 每回答一句话，背后有这么多可能性」

## 二、V1 三页面结构（收敛自六模块概念图）

```
Landing（已完成，M-Landing）
  ↓ 开始体验
Ocean（V1 核心，新增）──点击粒子──→ Token Microscope（现有 Observe 钻取层，降为详情）
Machine Score（改造现有 Discover + M7 分享卡，负责传播）
```

| 概念图模块 | V1 处置 | 依据 |
|---|---|---|
| Ocean View | **V1 核心，占最大屏幕面积** | 唯一能 100% 用现有真实 TokenTrace 驱动的 3D |
| Microscope View | 降为 Ocean 点击粒子后的详情面板 | 现有 Observe 页 token 出生档案直接复用 |
| Machine Score / Arena | V1 保留单机跑分+分享卡；全球榜单需后端，进二期 | 现有 Discover 真实 benchmark + M7 分享卡管线 |
| Brain View | **不做 MRI 脑**。改为 Model Anatomy（模型解剖）；「脑区」重定义为规则镜头（见 §四），进二期 | 脑区激活度无真实对应物，违背「不伪造数据」底线 |
| DNA View | 二期。诚实版=小样本探针题集实测，明确标注非权威能力分 | 浏览器跑不动完整 benchmark 套件 |
| Lab 实验室 | 现有实验存档/对比已覆盖大部分，V1 不新增 | experiments.ts（IndexedDB 存档/星标/对比）已有 |

## 三、Ocean View 产品定义

命名倾向：**Probability Ocean / 概率海洋**（备选 Token Universe）。

- 本质是「概率空间」，不是海洋屏保。参照天文学：每一颗星体都有数据，可点击、可回溯。
- 数据源：现有 `GenerationTrace`（`steps: TokenStep[]`，每步含 top-8 候选、精确概率、精确熵、耗时）。**零新增伪造字段。**
- 视觉语义（每个三维维度必须回答「为什么是三维」）：
  - X = 时间步；Y = 候选概率排位；Z = 该步熵
  - 主流 = 被采样 token 连线；暗流 = top-k 未选候选（随概率衰散）
  - 流宽 = 概率；颜色 = 熵冷暖 + 规则命中标记（复用 M5 规则引擎输出）
- 交互闭环：
  1. 输入 prompt → 真实生成，粒子实时汇入
  2. 旋转/缩放，看见「100 条可能路线中一条被选中」
  3. 点击任意粒子 → Token Microscope 详情（出生档案，现有组件）
  4. 分岔重生成（现有 BranchNode 机制）= 在海洋里看到两条时间线
  5. 导出 Replay（现有 browser-ai-replay/v1 → 演进为 .aitrace）
- 设计原则（沿用共识）：
  - 90% 黑白灰 + 10% 数据颜色；拒绝霓虹堆砌、游戏 HUD
  - 3D 是仪器不是装饰；卡片数量比概念图减少 50%
  - 任何视觉元素可点开追溯到真实数据

## 四、Brain 的诚实化路径（二期）

用户方向保留：按人脑功能区匹配模型功能区，定义一套**公开规则**，用户可自定义/导入/分享。

- 实现基座 = 现有 M5 规则 DSL 引擎：脑区亮度 = 规则函数(真实信号)，信号仅取自熵、top-k 分布形态、token 类型、生成阶段（thinking/回答）、规则命中。
- 硬约束：任何亮起区域必须能点开看「哪条规则、吃了哪些真实信号、为什么亮」；UI 常驻标注「这是诠释模型，非解剖事实」。
- V1 不做；作为「观测语言」的首个官方规则包在二期发布。

## 五、护城河：.aitrace 开放格式

现有 `browser-ai-replay/v1` 已是雏形（format 字段 + steps + params + pipeline + annotationsRuleset）。演进路线：

- v1 保持兼容导入（experiments.ts importReplay 已实现）
- v2（更名 .aitrace）增补：schema 版本协商、模型指纹、生成环境摘要、分岔树、可选签名
- 目标：任何模型 → 生成 trace → 导入 Observatory → 观察。定义「AI 可观察标准」而非做一个网页。

## 六、半年排期（与 CTO 视角一致）

| 月 | 交付 | 基座 |
|---|---|---|
| 1 | Ocean MVP（真实 trace → 3D，点击钻取） | trace.ts / ObservePage / Three.js（选型见技术调研） |
| 2 | Machine Score 单机跑分 + 分享卡 | DiscoverPage benchmark + shareCard.ts |
| 3 | .aitrace v2 + Replay 分享 | experiments.ts replay 管线 |
| 4–6 | 实验平台：多模型比较（双洋流）、参数调节、干预生成（改 token/温度看洋流改道） | BranchNode 分岔重生成已有 |

## 七、V1 成功判据

1. 第一次打开 Ocean 的非专业用户能复述「AI 是在多个候选里按概率选择」
2. 工程师抽查任意粒子，数据可回溯（概率/熵/候选与导出 Replay 一致）
3. 一张 Machine Score 分享卡在社交平台可自解释（设备、分数、可复现入口）
4. 全程无一个伪造数字
