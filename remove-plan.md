# AI Microscope · Remove Plan（纯删除方案）

> 原则：删除之后页面**更容易理解，不是更丰富**。
> 目标：UI 复杂度 ↓30%，功能 100% 保留（删的是重复表达，不是能力；所有数据仍可从保留下来的唯一入口下钻看到）。
> 依据：`ui-audit.md` 实测。本文只列删除项与理由，不改代码。
> 判定标准：同一信息/同一动作/同一视觉元素在同屏或同流程出现 ≥2 次 → 只留一个最佳位置，其余删除。

---

## 1. 重复按钮（删 ~40 个按钮实例）

| 重复项 | 现状 | 删除决定 |
|---|---|---|
| 「专业视图」开关 | 3 个组件 11 处（ObservePage 6、RunStoryPage 3、ArchivePage 2），运行中控制台、完成态尾栏、故事页、档案页各放一个 | **只留 1 处**：页面顶部控制台条右端一个全局开关（状态本就是同一个 `obs-pro-view`）。其余全删 |
| 回放入口 | 「▶ 讲成故事」「回放」「慢速」多处并列 | 完成态只留 1 个「回放」，「慢速」降为回放器内的一个选项，删外层重复入口 |
| 展开/收起类按钮 | 每张卡自带一个（ArtifactCard、关键时刻、推理折叠、专业折叠区…），文案各异（展开 ▸ / 收起 ▾ / 查看全文 / 详情） | 保留功能，**统一为一种**展开控件；删除各卡自定义的第二入口（既能点标题又有独立按钮的，删按钮） |
| 「知道了」「关闭」并存 | 提示卡同时给 ✕ 和「知道了」 | 只留 ✕ |
| 跳步入口 | 关键时刻卡内「跳到该步」按钮 + 点卡片本身也跳步 | 删按钮，点卡即跳（已有行为） |
| 尾注里的操作链接 | 页脚同时出现 导出/对比/星标/删除 + 卡内同名动作 | 动作只在对象卡上，删页脚重复动作 |

## 2. 重复标题（删 ~25 处）

| 重复项 | 删除决定 |
|---|---|
| 卡片大标题 + 丝印小标题同现（如「Sampling Inspector」标题 + 「这一刻的选择」副题 + 分区线上再写一次来源） | 每卡只留**一行丝印**（名称 · 来源），删大标题行 |
| 区块标题复述内容第一行（「任务阶段」标题下第一行就是阶段条；「决策日志」标题下卡片自带「关键时刻」字样） | 删外层区块标题，内容自说明 |
| 页面 H1 与导航项同文重复（档案页大标题「运行档案」+ 侧导航已高亮「档案」） | 删页面 H1，用丝印级页头 |
| TeamFlow 与 TeamPanel 都写「TEAM」名册标题 | 收束后只有 TeamPanel，运行中只有 TeamFlow，各留其一但**共用同一标题组件**；删 TeamPanel 在 TeamFlow 仍在屏时的并存渲染 |

## 3. 重复说明（删 ~30 处，最大的可读性收益）

| 重复项 | 删除决定 |
|---|---|
| 「来源 · 本机 trace」类口径句在同屏出现 4+ 次（Inspector、图表脚注、时间轴脚注、页脚各一遍） | **每屏只留 1 处**：页脚一条全局出处线；各部件脚注删除，学名/口径进 Tooltip |
| 「不是查词典——整个词表按概率投票」「岔路由真实 top-k 候选延展…」等教育性长句每次渲染都在 | 首次运行显示一次（onboarding 层），部件内删除；保留 hover 学名 |
| 同一读数配两遍解释：MomentCard 人话 + ThinkingCaption 字幕 + ActivityLog story 三处讲同一步 | 见 §8 统计合并；字幕条 ThinkingCaption **整体删除**（它是 MomentCard 的第二次复述） |
| 按钮 title 与旁边灰字重复（停止按钮 title + 尾注同句） | 留 title，删尾注句 |
| 空态里「等待第一个词…」+「正在唤醒…」两句叠放 | 各留一句 |

## 4. 重复 Border（25 种彩边 → 删 21 种）

- 保留 4 种：`line`（唯一中性边）、`measure` 选中边、`alert` 失败边、Empty 投放区虚线。
- **删除**：indigo-400/40、/50、/60 三档并存（同一"选中"三种深浅）、amber 边、emerald 边、white/10、/15、/30 三档、red-400/30 与 alert 并存的第二种红……全部归并，即删 21 个 distinct 边框组合。
- 卡内分区「边框套边框」（卡边 + 内嵌区边 + 列表项边三层嵌套）：删中间层，内区只用底色差。

## 5. 重复 Shadow（7 种 → 删 5 种）

- 保留：`shadow-raise`（浮层微起）、`shadow-float`（Dialog/抽屉）。
- **删除**：`shadow-card`（平面卡一律无阴影，5 处删）、`shadow-lg`（1 处）、4 个一次性彩色阴影/辉光（Glow 违禁，连同 `anomaly-glow` keyframes 删）。

## 6. 重复 Divider（52 处 → 约留 20 处）

- 同一卡内「标题下一条 + 内容间一条 + 脚注上一条」三线并存：只留内容与脚注之间 1 条，删 ~15 处。
- 分隔线与间距双重分隔（既有 border-t 又有 mt-6）：删线留间距，删 ~10 处。
- 彩色分隔线（indigo/amber 的 border-t）：一律归 `line`，多余语义删除。

## 7. 重复 Card（≥5 种卡 → 1 种；删除嵌套层 ~20 处）

- 删除 4 种变体卡（暗卡、半透明 `bg-obs/60` 卡、彩边强调卡、渐变卡），全部归唯一 Card。
- **卡套卡展平**：LivePanel（外卡套 Inspector 卡套读数卡三层）、TeamFlow（舞台卡套 Worker 卡套 Artifact 卡）、ObservePage 专业折叠区（折叠卡内每个组件再各包一张卡）——中间容器层删除，用分隔线分区。预计删 ~20 个容器 div 层级。

## 8. 重复统计（同一读数多处渲染 → 各留一处）

「熵」出现在 20 个组件、tok/s 出现在 9 个组件。同屏重复的删除决定：

| 读数 | 现状同屏渲染处 | 保留 | 删除 |
|---|---|---|---|
| 当前步熵/确定度 | MomentCard、DebugBar、LivePanel 读数区、ThinkingCaption | LivePanel（专业）+ MomentCard（默认层） | DebugBar 读数行、ThinkingCaption 整条 |
| 生成速率 tok/s | DebugBar、LivePanel、页脚 | LivePanel | 其余 2 处 |
| step 计数 | 控制台、DebugBar、曲线标题、页脚 | 控制台 1 处 | 其余 3 处 |
| top-k 候选 | InstrumentCluster、SamplingInspector、SamplingChamber、BirthScene 同时可见 | Inspector（数据）+ 标本台（视觉）二选一同屏 | SamplingChamber 删除（并入 Inspector）；BirthScene 触发时其它候选视图暂隐 |
| 交接次数/成员数 | TeamFlow 头部、TeamPanel、OceanView Team 面板 | 所在视图各自 1 处，但同屏共存时只留当前主视图的 | 同屏第二处 |

## 9. 重复状态（删 ~15 处状态指示）

- 「运行中」同屏 4 种表达：控制台呼吸点 + 按钮态 + 尾注文字 + 正文光标闪烁 → **保留光标 + 控制台一处**，删其余 2 种。
- animate-pulse×12 / ping×2：按「同屏一个测量中指示」原则，删至 ≤1 处/屏（其余状态改静态点）。
- Worker 状态双写（chip 颜色 + 文字「running」+ 图标三重表达）→ 留色点 + 文字，删图标层。
- 完成态「✓ 完成」在 MissionRow、页脚、Toast 三处 → 留 MissionRow。
- `EvidenceField` 氛围流线（熵的第 4 种表达）→ **组件整体删除**（SentenceRibbon 已表达同一数据）。

## 10. 重复图标（三体系 → 一体系，删 ~50 处）

- 保留：`icons.tsx` 线性 svg 体系（补缺失图标属于替换，不在本删除方案内）。
- **删除**：界面 emoji 图标全部（WorkspacePage 9、DebugBar 5、LandingHero 5、JourneyPage 4…约 30 处）；Unicode 控件符（▶⏸◉ 等，ObservePage 18 处）中与文字并存的删符号留文字，独立成按钮的待替换前先删重复者。
- 同一含义双图标（「检索」既有 🔍 又有放大镜 svg）：删 emoji。

---

## 11. 建议整体删除的组件（功能由现存组件 100% 覆盖）

| 组件 | 功能去向 |
|---|---|
| `ThinkingCaption`（底部字幕条） | 同步骤解释已由 MomentCard + ActivityLog 覆盖 |
| `EvidenceField`（背景流线） | 熵已由 SentenceRibbon/TraceBand 表达 |
| `SamplingChamber` | 与 SamplingInspector/InstrumentCluster 职责重叠 |
| `DebugBar` 的读数行（保留断点/续跑控制） | 读数由 LivePanel 覆盖 |
| BirthScene 粒子层（converge/scatter） | 数据保留在候选概率条；场面动画删除 |
| 装饰 keyframes ~10 组（anomaly-glow、scene-storm、demo-resume-pulse、pop-in、breath 等） | 无功能，直接删 |

## 12. 复杂度账本（如何到 -30%）

| 维度 | 现状 | 删后 | 降幅 |
|---|---|---|---|
| 同屏可见部件数（Observe 运行中） | ~14 个区块 | ~9 | -36% |
| 边框 distinct | 25+ | 4 | -84% |
| 阴影 | 7 | 2 | -71% |
| keyframes | 26 | ~8（3 token + 必要过渡） | -69% |
| 状态指示/屏 | 4 | 2 | -50% |
| 重复说明句/屏 | 4+ | 1 | -75% |
| 组件文件 | 58 | 54（删 4 个整组件） | -7%（其余为组件内删减） |

功能核对：断点/续跑、慢速回放、专业读数、top-k 下钻、Team 协作、导出/对比/星标全部保留，只是入口从多处归一处。

## 13. 执行顺序（待批准后）

1. 无争议纯删：装饰 keyframes、Glow 阴影、emoji 图标、重复说明句、重复分隔线。
2. 组件级删除：ThinkingCaption、EvidenceField、SamplingChamber、DebugBar 读数行（各跑全量测试确认无功能回归）。
3. 归一化删除：专业视图开关归 1、读数归位表（§8）、状态指示归 2。
4. 展平卡套卡（涉及布局回归，最后做）。
