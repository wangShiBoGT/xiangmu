# Observe 页融合重构方案 v2（像素级规格 · 照此实现）

> v1 讲"为什么"，v2 只讲"长什么样"。全部值取自 design-system.md token，不发明新值。
> 主题：暗室 Darkroom（bg #1b1c1e / surface #242528 / line #37383c / ink #e8e8e6 / ink-2 #9d9ea3 / measure #5b8def / caution #d99a3d / alert #e05d5d）。
> 字阶：display 24 / title 16 / body 14 / reading 13 等宽 / label 12 / micro 11。

---

## 0. 页面栅格（先定骨架，再填内容）

```text
视口 ≥1280px：
┌────────────────── 左栏 minmax(0,1fr) ──────────────────┐  gap 24  ┌── 右栏 296px 固定 ──┐
全页 max-w 1440 居中，左右 padding 32。
左右栏各有一条贯穿到底的左对齐线；右栏宽度永远 296px，窄屏(<1024)下沉到左栏之后单列。
```

垂直节律（左栏，自上而下，间距只用 16/24）：

```text
① 工具行 h-40px            ── border-b 1px line ──
② 标本区（Hero）           ↕ 24
③ 流水线时间轴 h-64px      ↕ 24
④ 操作台 Bench             ↕ 32
⑤ Debug 带（专业视图才有）  ── border-t 1px line ──
```

---

## ① 工具行（40px，一行，永不换行，替代现在的 DEBUG 条 + 四方块开关）

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ● Qwen3 0.6B · WebGPU   step 144/144            专业视图  熵热力  概率地形  更多 ▾ │
│ └12px 状态点+label档     └reading档等宽          └─────── Tabs 开关组 ───────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- 左槽：状态点 6px（运行中 measure、完成 ink-3、失败 alert）+ 模型·设备（label 档 12px ink-2）+ `step 144/144`（reading 档 13px 等宽 ink）。
- 右槽：开关组，每项 = body 14px 文字，间距 24；**开 = ink + 底部 2px measure 线（距文字 11px，贴工具行底边）；关 = ink-2，hover → ink（150ms）**。无边框、无底色、无方块。
- "更多"用 12px ▾ 折叠次要镜头，弹层走统一 Popover（surface + 1px line + r-md 10 + shadow-raise）。
- 整行底部 1px line，与标本区分隔。这一行是页面唯一常驻 chrome。

## ② 标本区（唯一视觉中心）

- Prompt：label 档 ink-2，一行丝印 `PROMPT`（12px 等宽 +0.08em 大写 ink-3）+ 内容。
- 答案正文：body 14/22，把握度着色仅用 **measure 明度 5 阶**（高把握 = ink 原色，低把握 = measure 弱底 8%，高熵步 = caution 点式下划线）。无卡片包裹——正文直接坐在 bg 上，宽度 max-w-[720px]（阅读列）。
- 选中 token：measure 8% 弱底 + 1px measure 边（全站唯一选中语言），选中即联动右栏 Inspector。

## ③ 流水线时间轴（替代"8 方块阶段链 + 右栏 PIPELINE 卡"两处）

```text
PIPELINE · 本机实测                                                  全程 27.0 s
├─┬────┬──────────────────────────────────────┬──┬────────────┬──────────┤
 33ms  1.2s              25.7s decode          │        51.4s tool plan   │
tokenize prefill        ████ 段=measure 明度阶  └─ 工具段=同阶更浅 ─┘
第 1 步 ▲        第 68 步 ▲（犹豫，caution 刻度）          ▲ 断点
```

规格：
- 容器：无卡。丝印行（label 12 等宽：`PIPELINE · 本机实测`，右端 reading 档总耗时）+ 轴体 h-24px + 刻度行 h-16px。
- 轴体：一条 24px 高的横带，**段宽 ∝ 真实耗时（log 刻度，min-width 24px 保证 33ms 可点）**；段底色 = measure 明度 5 阶按阶段类型取档；段间 1px bg 缝，无箭头无 ✓；圆角只在整条轴两端 r-sm。
- 段内标签：耗时（reading 11px 等宽）居中，放不下时移到 hover Tooltip；阶段名在轴下方刻度行（micro 11 ink-3）。
- 事件刻度：轴下沿 ▲ 6px 三角标记决策点/犹豫步/断点（measure/caution/alert），hover 弹该步 Tooltip，点击 = 跳步（保留现有阶段决策下钻）。
- 当前回放位置：1px measure 竖线贯穿轴体（回放时随步移动，这是本区唯一动的东西）。
- 交互态：段 hover → 明度 +1 档；选中段 → 1px measure 边。

## ④ 右栏仪表列（296px，统一 Gauge 解剖，四层结构）

每个仪表统一为：

```text
┌ 296px，surface 底 + 1px line + r-md 10 + padding 16，无阴影 ┐
│ THROUGHPUT · 本机实测            ← 丝印 label 12 等宽大写 ink-3 │
│ 5.7 tok/s                        ← 读数 24px 等宽 600 ink，单位 micro ink-2 │
│ ~~~~~~~~~~~~~~~~~~~~             ← 迷你图 h-32：1.5px 细线 ink-3，无渐变填充；│
│                                     峰值点 2px measure 圆点，右端当前值小标 │
└──────────────────────────────────────────────────────────┘
```

仪表栏内容（自上而下，间距 16）：
1. `THROUGHPUT` 5.7 tok/s + 细线图
2. `ENTROPY` 1.05 nats + 细线图（>阈值的段用 caution 着色，这是全屏唯一 caution 来源之一）
3. `INSPECTOR · 第 N 步`（替代"最后一步的候选"死卡）：**选中正文 token 即更新**。内容 = top-k 概率条列表，每行固定三槽位：token 原文（reading 等宽，被选中者 measure）｜水平条（h-6px，选中 measure、落选 surface-2、条端 r-full）｜百分比（reading 等宽右对齐，1 位小数）。未选中任何 token 时显示最后一步（丝印注明"最后一步"）。
4. 栏底一条全局出处线（micro ink-3）：`所有读数来自本机 trace · 数据不出设备`——同屏其他"来源"脚注全部删除（remove-plan §3）。

## ⑤ 操作台 Bench（composer 收编对比实验）

```text
┌ surface + 1px line + r-md 10，无阴影 ────────────────────────────┐
│ 你好                                    ← 输入区 body 14，min-h 72 │
│──────────────── 1px line 内分隔 ─────────────────────────────────│
│ Qwen3 0.6B · WebGPU · T 0.6   检索 开   规划 DeepSeek-R1 ▾   [● 开始记录] │
│ └── 状态槽：全部 label 12 等宽，值 ink 名 ink-2，无胶囊无边框 ──┘  └Primary h-32 r-sm┘ │
└──────────────────────────────────────────────────────────────────┘
 对比再跑：更短 · 更严谨 · 面向 8 岁儿童     ← Ghost 文字链一行，micro，点击直接开跑
```

- 状态行五槽位恒定（模型/设备/温度/检索/规划），全部文字化：`名 值` 成对，名 ink-2、值 ink 等宽；可点的（规划模型）带 ▾。**删除全部 chip 底色和边框**——DevTools 的工具行没有一个"胶囊"。
- 唯一 Primary：「开始记录」（measure 底白字 h-32 r-sm，每屏 ≤1）。
- 对比实验从"说明句+3 个按钮"压缩成一行文字链（remove-plan：教育性长句删除），置于 Bench 下方 8px 处。

## ⑥ Debug 带（仅专业视图，页面最底）

```text
── border-t 1px line ──────────────────────────────────────────────
DEBUG   ⏮ Back   Step   ▶ Continue   New Seed   ◉ 断点   step 144/144
└丝印    └── 全部 Ghost 变体 h-28 紧凑档 r-sm，间距 8 ──┘   └reading 等宽
续跑/改选产物 = 模拟续跑 · 非原始记录        ← micro ink-3 右对齐
```

- 从第一屏顶部移到最底（layout-plan 原判）；普通观察者关掉专业视图时整条不渲染。
- 按钮全部 Ghost（透明底 ink-2 字 hover surface-2 底），唯一例外：命中断点暂停时 Continue 升为 Secondary。

---

## 视觉重量预算（整屏检查表）

| 颜色 | 允许出现的位置（超出即违规） |
|---|---|
| measure | 工具行开关指示线、时间轴段与回放线、选中 token、Inspector 选中条、开始记录按钮 |
| caution | 熵超阈值段、犹豫刻度 ▲、高熵 token 下划线 |
| alert | 失败段、错误卡、断点命中 |
| 其余一切 | 中性灰阶。完成态 ✓/绿色全部退场，成功=中性。 |

等宽纪律：**所有** 数字/单位/token 原文/step 计数 = 等宽 + tabular-nums；百分比 1 位小数、耗时 ms/s 自动换档、熵 2 位 nats。

## 实施顺序（同 v1 S1–S5，规格以本文为准）

S1 工具行+Debug 沉底 → S2 时间轴合并 → S3 右栏 Gauge/Inspector → S4 Bench 收编 → S5 重量清扫+全量验证（tsc/lint/vitest/build + 浏览器实测）。
