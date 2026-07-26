# AI Microscope · UI Audit（全项目扫描 · 2026-07-25）

> 范围：全部 8 个页面视图（create / workspace / discover / observe / findings / archive / journey / benchmark）+ LandingHero + 58 个组件（不含测试）+ App 壳 + index.css（820 行，26 组 keyframes）。
> 基准：`design-system.md`（唯一事实源）。仅审计，不改代码。

---

## 一、统计总表（现状 vs 规范上限）

| 项 | 现状数量 | 规范上限 | 判定 |
|---|---|---|---|
| Font Size | **20 种**（9–44px，含 9.5/10.5/11.5/12.5/13.5/14.5 半像素档；text-[12px]×148、text-[10.5px]×96） | 6 档 | ❌ 超 3.3 倍 |
| Radius | **9 种**（full×179、2xl×90、xl×57、lg×53、rounded×25、sm×5、md×2、t/tl/tr 单角×3） | 3 档 | ❌ 超 3 倍 |
| Shadow | **7 种**（shadow-float×20、shadow-card×5、shadow-lg×1 + **4 个一次性彩色阴影/辉光**，如 `0_0_28px_6px_rgba(99,102,241,.28)`） | 2 档 | ❌ 且含 4 处 Glow 违禁 |
| Button | **≥6 种视觉族**（219 个 `<button>`：胶囊 full×78、lg×20、xl×9、2xl×6 + 文字裸按钮 + 图标按钮；高度散布 h-8/9/10/38px/44px 等无标准档） | 4 变体 | ❌ 无变体体系，逐处手写 |
| Card | **≥5 种**（surface+shadow-card 亮卡 / obs-2+obs-line 暗卡 / 半透明 `bg-obs/60` 卡 / 彩色描边强调卡（indigo/amber/emerald/red 边）/ 无边纯底块），普遍卡套卡 | 1 种 | ❌ |
| Badge/Chip | **≥6 种**（胶囊 chip、方角 chip、彩底徽章、纯边徽章、点+文字、emoji 徽章），语义色随组件各定 | 1 种 | ❌ |
| Spacing（gap/space） | **33 种** distinct（gap-2×90、gap-1.5×58…含 0.5 步进非 8pt 值） | 8 值序列 | ❌ |
| Padding | **58 种** distinct（px-2.5×37、px-3.5×27、py-3.5×8 等大量 2.5/3.5 非网格值） | 8 值序列 | ❌ |
| Margin | **39 种** distinct（mt-1.5×32、mt-2.5×23、mt-0.5×28 等） | 8 值序列 | ❌ |
| Divider | **4 方向 52 处**（border-t×31、border-b×16、border-l×4、border-r×1），但边框**颜色 25+ 种**（border-obs-line×220、border-line×33 之外，还有 indigo/amber/emerald/red/white 各种透明度共 25 个 distinct 彩边） | 1 色 1px | ❌ 结构统一、颜色失控 |
| Icon Style | **3 体系混用**：自绘线性 svg（icons.tsx 7 个 + 各组件散落 1 个×6）、Unicode 符号（▶⏸◉✓→，ObservePage 18 处）、emoji（WorkspacePage 9、DebugBar 5、LandingHero 5…） | 1 体系 | ❌ |
| Chart Style | **≥7 种**：SVG 折线/面积（LivePanel 曲线，带渐变填充）、水平概率条（多个组件各自实现）、3D THREE 场景（OceanView，带氛围光）、指纹热图（TraceFingerprint）、色带轴（SentenceRibbon/AgentTimeline 各一套）、柱状标本台（InstrumentCluster）、粒子场（BirthScene）。概率条至少 4 处独立实现，视觉互不一致 | 统一图表语法 | ❌ |
| 语义色 | **9 系 312 处**：indigo×112、amber×71、emerald×70、red×30、sky×12、teal×7、slate×4、rose×4、violet×2 | 3 测量色 | ❌ 彩虹化 |
| 动效 | **26 组 keyframes** + animate-pulse×12 + animate-ping×2；时长 90–600ms 共 9 档散布 | 3 token | ❌ |
| 渐变背景 | 5 处（SamplingChamber×3、LivePanel 曲线填充、LandingHero） | 0 | ❌ |
| blur/backdrop-blur | 10+ 组件在用（OceanView×5、ObservePage×4、LandingHero×4…） | 0（禁 Glass） | ❌ |
| Container Width | 无体系：仅 2 处 max-w-[760px] + 零星 max-w-md/sm/xl，其余页面各自撑满 | 3 档 | ❌ |

---

## 二、严重问题（阻断级，违反 Design System 硬禁令或系统性失控）

1. **Glow 违禁品 4 处**：彩色发光阴影（indigo 辉光 `0_0_28px_6px_rgba(99,102,241,.28)`、teal 光 `0_0_8px_rgba(94,234,212,.5)` 等）+ `anomaly-glow` 辉光呼吸 keyframes。直接违反「不要 Glow」。
2. **彩虹语义色系统性失控**：9 个色系 312 处硬编码 Tailwind 色阶，同一语义在不同组件用不同色（"成功"有 emerald-300/400/500/600 四档、"选中"有 indigo 五档透明度），没有任何组件从统一 token 取语义色。这是最大规模的违规（收敛它 = 一次性改掉一半问题）。
3. **字号体系不存在**：20 种字号全部是 `text-[Npx]` 硬编码（共 887 处），0 处使用体系化字阶；读数与正文同字体（等宽仅 2 处 font-family 定义，未系统用于数字），`tabular-nums` 缺失 → 读数会跳动。
4. **Glass/blur 10+ 组件**：backdrop-blur 弥散层用于遮罩、弹层、氛围（LandingHero/OceanView/ObservePage 等），违反「不要 Glass」。
5. **按钮无体系**：219 个 button 逐处手写 className，没有 Button 组件；同一功能（关闭、展开）在不同页面样式不同；胶囊按钮 78 处需按新规全部降为 r-sm。
6. **ObservePage 巨石组件 3308 行**：页面、布局、十几个内联子组件、状态机全在一个文件，任何 DS 迁移都会在此文件冲突；是所有不一致的温床（102 处彩色、18 处 Unicode 图标都在这）。

## 三、中等问题（体系性，但不违禁令）

1. **间距非 8pt**：padding 58 种 / margin 39 种 / gap 33 种，大量 0.5/1.5/2.5/3.5（2/6/10/14px）非网格值；无任何间距语义（组内/组间不区分）。
2. **Radius 9 种混用**：同为「卡片」出现 lg/xl/2xl 三种圆角；同为「chip」出现 full 与 lg 并存。
3. **动效 26 组 keyframes、9 档时长**：其中约半数是「场面型」（birth-scene-converge/scatter/condense、scene-storm、fission-in、pop-in），与指针语法冲突；`animate-pulse`×12 分布超出「同屏一处测量中」限制。
4. **图表风格 7 套并存**：概率水平条至少在 InstrumentCluster / SamplingInspector / ActivityLog / BirthCard 4 处独立实现（高度、色阶、标签位置全不同）；LivePanel 曲线用渐变面积填充（DS 已禁）。
5. **图标三体系混用**：线性 svg / Unicode 字符 / emoji 同屏出现（Observe 控制台一行内既有 svg 又有 ▶⏸ 又有 emoji）。
6. **边框颜色 25 种彩边**：强调、成功、失败、选中各自发明 `border-{色}-{阶}/{透明度}` 组合。
7. **Container 无档位**：阅读流（RunStoryPage/JourneyPage）、工作台（Observe）、全屏（Ocean）宽度各自为政，仅 760px 出现 2 次算半个约定。
8. **暗色主题近黑 + 霓虹 indigo**（`#0e0f12` + `#6366f1`）：与 DS 暗室规格（深石墨 `#1b1c1e` + 测量蓝）不符。

## 四、轻微问题

1. `rounded-t/tl/tr` 单角圆角 3 处（可归并容器圆角）。
2. `shadow-lg` 1 处（Tailwind 默认档，应归 shadow-float）。
3. `max-w-44/40` 等零星截断宽度硬编码。
4. `duration-90ms/120ms/180ms/240ms/320ms/360ms` 六个非 token 时长（应归 150/250）。
5. 滚动条样式已统一（现状良好），但「回到最新」跟随交互只有规划流式区有，其他长流缺失。
6. focus 样式部分控件缺失（裸 `<button>` 多数无 focus-visible 环）。
7. 半像素字号（10.5/11.5/12.5/13.5/14.5）在非整数 DPR 屏上渲染发虚。

## 五、重复组件（同一职责多个实现）

| 职责 | 重复实现 |
|---|---|
| 概率水平条 | InstrumentCluster / SamplingInspector / ActivityLog（关键时刻展开）/ BirthCard 各一套 |
| 「当前步读数」面板 | MomentCard、DebugBar、LivePanel 读数区三处重叠（确定度/熵/速率重复展示） |
| 采样过程可视化 | SamplingChamber、SamplingInspector、InstrumentCluster、BirthScene 四个组件都在讲「候选→选中」，抽象层级不同但视觉语言互不复用 |
| 时间轴/色带 | SentenceRibbon、AgentTimeline、ThoughtMap 底部色条三套独立实现 |
| 「一句人话解释」行 | ThinkingCaption、MomentCard 文案行、ActivityLog story 行、ConfidenceText 口径相近、模板各写各的 |
| 弹层容器 | Overlay、Dialog 用法、HistoryDrawer、SettingsPanel 各自实现遮罩+进场 |
| 进度指示 | Progress 组件 + 各页内联进度条 ≥3 处 |

## 六、不统一组件（同一组件内部或跨页状态不一致）

1. **Dropdown**（自绘，体系最好）与原生样式按钮混排时高度/圆角不齐。
2. **TokenText** 的选中高亮（indigo 底）与图表选中（amber 描边）语义冲突——「选中」两种颜色。
3. **ArtifactCard** 失败态红边 2px，其他失败态红边 1px。
4. **TeamFlow** 与 **TeamPanel** 同为 Worker 名册，chip 规格（圆角/字号/点状态）不同。
5. **LandingHero** 用亮色渐变+blur 装饰，与产品内 Observe 暗仪器割裂为两种气质。
6. Empty state 三种写法并存：诚实缺席句（好）/ 静默不渲染（好）/ 个别「等待…」占位（违规）。

## 七、建议删除/合并组件

| 组件 | 建议 | 理由 |
|---|---|---|
| `EvidenceField`（正文背后氛围流线） | 删除 | 纯氛围层，数据（熵）已有 SentenceRibbon 表达；违反 P2 Calm |
| `BirthScene` 粒子层（converge/scatter keyframes） | 删表现、留数据 | 场面型动画违反指针语法；数据重构进统一概率条组件的塌缩视图 |
| `anomaly-glow`、`scene-storm`、`demo-resume-pulse` 等装饰 keyframes（约 10 组） | 删除 | Glow/脉冲违禁 |
| `SamplingChamber` | 并入 SamplingInspector | 职责重叠（采样过程），且含 3 处渐变背景 |
| `MomentCard` 与 `DebugBar` 读数区 | 合并为统一 Gauge 部件 | 同读数两处渲染 |
| `Overlay` / 抽屉 / 弹层各自实现 | 收敛为单一 Dialog/Drawer 基座 | §15 每屏一弹层、统一遮罩（去 blur） |
| 概率条 4 处实现 | 收敛为 1 个 ProbBar 部件 | §16 全站同一组件 |
| emoji 图标（全部） | 替换为 icons.tsx 线性体系 | §9 唯一图标体系 |
| LivePanel 曲线渐变填充 | 改细线 | §16 禁渐变面积 |

## 八、优先级路线（与 design-language.md §7 对齐）

1. **Token 置换**（1 次 CSS 改动，最大杠杆）：三测量色 + 六档字阶 + 8pt 间距 + 3 radius + 2 shadow 写入 @theme，删除 4 处 Glow 阴影与 anomaly-glow。
2. **基础部件**：Button（4 变体）/ Card（1 种）/ Badge（1 种）/ ProbBar / Gauge 落地，全站替换手写 className。
3. **图表收敛**：渐变面积→细线，4 套概率条→1 套，色带轴→1 套。
4. **动效清理**：26 keyframes → 3 token + 测量中指示；删场面动画。
5. **巨石拆分**：ObservePage 3308 行按七类部件拆出子组件（迁移的前置条件）。
6. **暗室主题校色** + LandingHero 气质对齐。
