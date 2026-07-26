# AI Microscope · Component Guideline（组件统一规则）

> 上位法：`design-language.md`（判据）→ `design-system.md`（token）→ 本文件（组件构成规则）。
> 依据：`ui-audit.md` 实测的失控点（219 个手写按钮、≥5 种卡、4 套概率条、25 种彩边…）。
> 本文不改业务、不改功能、不含代码。它定义的不是九种样式，而是**一套所有组件共用的构成法则 + 九个组件各自的解剖规格**。今后任何页面出现这九类 UI，必须由统一基础组件渲染，禁止再手写 className。

---

## 0. 一套统一规则（Nine components, one grammar）

所有九类组件共用同六条法则。先记法则，再看各组件——组件规格只是法则的实例化。

### 法则一 · 同一来源（Single Source）
每类组件全项目**只有一个实现**，位于统一部件库（如 `src/ui/`）。业务组件只传数据与语义，不传视觉。className 里出现颜色/圆角/阴影/字号 = 违规。

### 法则二 · 同一解剖（Anatomy）
每个组件都由同四层构成，缺层允许、换层禁止：
1. **容器**：`surface` 底 + 1px `line` 边 + 规定圆角（控件 `r-sm`=6 / 容器 `r-md`=10），无阴影（浮层除外，见法则四）；
2. **丝印**（可选）：左上 `label` 档等宽小字 = 名称 · 数据来源；
3. **内容**：文字用六档字阶，一切读数等宽 + `tabular-nums`；
4. **脚注**（可选）：`micro` 档口径/单位说明。

### 法则三 · 同一语义色（Semantic only）
组件不允许"选颜色"，只允许"选语义"：`neutral / measure / caution / alert` 四选一，颜色由 token 决定。选中 = `measure` 弱底 + 1px `measure` 边（全站唯一选中语言）；失败 = `alert` + 错误原文。禁止组件私自定义第五种语义或直接写色值。

### 法则四 · 同一层级（Elevation）
平面组件（Button/Card/Badge/Tabs/Input/Chart）**零阴影**，层级靠边框与底色。
浮层组件（Tooltip/Popover → `shadow-raise`；Dialog → `shadow-float`）共用同一浮层基座：纯色遮罩（Dialog 黑 40%，无 blur）、`m-expand` 250ms 进出（透明度 + ≤8px 位移）、Esc 关闭、焦点圈闭与归还、同屏 ≤1 个。

### 法则五 · 同一状态机（States）
每个可交互组件必须实现同一组状态且表现一致：
- `default` → `hover`（底色深一档，150ms）→ `active`（再深一档，无位移缩放）→ `focus-visible`（2px `measure` 环，offset 2）→ `disabled`（透明度 45% + not-allowed + 可解释原因）。
- 数据组件必须实现四数据态：`有数据 / 测量中（m-sampling，同屏 ≤1）/ 无数据（诚实缺席三要素）/ 失败（alert + 错误原文）`。

### 法则六 · 同一尺寸制（Sizing）
高度只有两档：默认 32 / 紧凑 28。内边距只用 8pt 序列（4/8/12/16/24…）。字号只用六档。任何 2.5/3.5/半像素值违规。

---

## 1. Button

- **唯一实现**，四变体（design-system §10）：Primary（measure 底白字，每屏 ≤1）/ Secondary（surface 底+1px line）/ Ghost（透明底 ink-2 字）/ Danger（透明底 alert 字+alert 30% 边）。
- 解剖：`[图标 16px?] 文字 [快捷键提示?]`；圆角 `r-sm`；高度 32/28；`body` 字号。
- 图标按钮（仅图标）：同规格正方形，必带 aria-label。
- loading：文字旁 `m-sampling` 单点，按钮不变形不变骨架。
- 迁移含义：现有 219 个手写 `<button>` 全部归入四变体；78 处胶囊圆角废止；「停止并保留已生成」这类破坏性动作归 Danger。

## 2. Card

- **唯一实现**（design-system §12）：surface + 1px line + `r-md` + padding 16 + 无阴影。
- 解剖：丝印行（部件名 · 数据来源，`label` 等宽）→ 内容 → 可选 `micro` 脚注。
- 变化只允许两个开关：`compact`（padding 12）、`failed`（左侧 2px alert 内嵌条 + 错误原文）。没有彩色卡、半透明卡、渐变卡。
- 硬规则：**卡不套卡**——内部分区用 1px line 分隔线；现有 obs-2 暗卡 / bg-obs/60 半透明卡 / 彩边强调卡全部收编（强调改用丝印 + Badge 表达语义）。

## 3. Badge

- **唯一实现**（design-system §13）：`r-sm`、`micro` 等宽、4×8 padding、语义色 10% 弱底同色字、无边框。
- 语义四选一：neutral / measure / caution / alert。
- 必须由真实字段驱动（「高熵 0.82」「失败」），文字 = 读数或状态名，禁止装饰徽章。
- 迁移含义：现有 ≥6 种 chip/徽章（胶囊、彩底、纯边、点+文字、emoji 徽章）全部收编；Worker 名册 chip（TeamFlow/TeamPanel 两套规格）统一为本组件 + 状态点。

## 4. Tabs

- **唯一实现**，两个用途同一规格：视图切换（页面级）与面板切换（部件内）。
- 解剖：横排 `body`/`label` 档文字项；选中项 = `ink` 字重 500 + 底部 2px `measure` 指示线；未选中 = `ink-2`，hover 深一档。
- 不用胶囊分段控件、不用卡片式 tab；tab 行底部 1px `line` 与内容分隔。
- 键盘：←→ 切换，focus-visible 环；选中状态与 §法则三 的选中语言区分（tab 用指示线，不用弱底框）。
- 迁移含义：导航 view 切换（create/observe/archive…）、专业视图内的面板切换、Compare 双栏切换全部归此。

## 5. Input

- **唯一实现**覆盖文本框/textarea/下拉/搜索（design-system §11）：surface-2 底 + 1px line + `r-sm` + 高 32 + `body`。
- 解剖：`[前缀图标?] 值 [后缀单位/动作?]`；参数值与单位等宽。
- focus = measure 边 + focus 环；error = alert 边 + 下方 `micro` 等宽错误原文（必须给原因）；运行锁定 = disabled + 锁定原因文字。
- 下拉（现有自绘 Dropdown 是全站体系最好的组件，保留为基准实现）：弹层走 Popover 基座（§8）。

## 6. Dialog

- **唯一实现**（design-system §15）：黑 40% 纯色遮罩（无 blur）+ surface 面板 + 1px line + `r-md` + `shadow-float`，≤560px（观测型 720px）。
- 解剖：`title` 标题行（右侧 Ghost 关闭钮）→ 内容 → 右对齐按钮行（Secondary 左、Primary/Danger 右）。
- 行为：`m-expand` 进出、Esc 关闭、焦点圈闭+归还、禁止嵌套。
- 迁移含义：Overlay / HistoryDrawer / SettingsPanel / BirthCard 弹层等各自实现的遮罩+进场全部收敛到同一浮层基座（抽屉 = 同基座的侧滑变体）。

## 7. Tooltip

- **唯一实现**（design-system §14）：surface + 1px line + `r-md` + `shadow-raise`，`micro` 档，读数等宽。
- 300ms 延迟、`m-pointer` 淡入、纯文本、无交互控件。
- 职责边界：只放「学名 / 完整读数 / 单位解释」；重要信息不允许只存在于 Tooltip。
- 与 Popover 的分界：**不可点 = Tooltip，可交互 = Popover**，不允许"带按钮的 tooltip"。

## 8. Popover

- **唯一实现**：Tooltip 同容器规格（surface + 1px line + `r-md` + `shadow-raise`），但可承载交互（列表、参数浮层、下拉选项）。
- 行为：点击触发、点外关闭、Esc 关闭、焦点入内并归还；`m-expand` 进出；同屏 ≤1；自动翻边防溢出（Dropdown 现有 portal+上下自适应逻辑即基准）。
- 迁移含义：composer 参数浮层、Dropdown 选项层、token 点击的候选层（fission 弹出）统一到此基座；「原地裂变」动效替换为 `m-expand`。

## 9. Chart

- 一套图表语法（design-system §16），四个基准件，全站复用禁止再造：
  1. **ProbBar 概率条**：水平条 + 等宽读数 + token 原文，唯一实现（收编现有 InstrumentCluster / SamplingInspector / ActivityLog / BirthCard 四套）；选中候选用 measure、落选中性、高熵警示 caution。
  2. **TraceLine 记录线**：1.5px 细线 + 数据点，无渐变面积填充（LivePanel 曲线迁入）；hover 十字标线 + 等宽读数条。
  3. **TraceBand 色带轴**：单色明度阶（measure 5 档）表连续量，时间横向向右，可点击定位（收编 SentenceRibbon / AgentTimeline / ThoughtMap 底条三套）。
  4. **HeatCell 热图格**：单色明度阶（TraceFingerprint 迁入）。
- 每张图三件套必备：轴+单位、来源丝印（「本机 trace 实录 · Top-N 截断」）、下钻入口。
- 多系列 ≤3，明度+线型区分，禁止彩虹；3D（OceanView）为选配观察方式，服从同一色板，去氛围光/霓虹材质/blur。

---

## 10. 落位表（现有组件 → 统一组件）

| 现有 | 归宿 |
|---|---|
| 219 处手写 `<button>` | Button 四变体 |
| 亮卡/暗卡/半透明卡/彩边卡 | Card（+failed 开关） |
| 各类 chip/徽章/emoji 徽章 | Badge |
| 导航切换、专业面板切换 | Tabs |
| composer、参数输入、Dropdown | Input（+Popover 基座） |
| Overlay/抽屉/设置面板/BirthCard 弹层 | Dialog 基座（含 Drawer 变体） |
| 学名/读数悬浮说明 | Tooltip |
| 参数浮层/候选裂变层/下拉选项 | Popover |
| 4 套概率条 / 渐变曲线 / 3 套色带 / 指纹 | ProbBar / TraceLine / TraceBand / HeatCell |

## 11. 验收清单（评审时逐条打勾）

1. 该 UI 是否由九类统一组件渲染？（业务层无视觉 className）
2. 颜色是否只传了语义（neutral/measure/caution/alert）？
3. 读数是否等宽 + tabular-nums？
4. 五个交互态 + 四个数据态是否齐全且表现一致？
5. 浮层是否走统一基座（无 blur、可 Esc、焦点归还）？
6. 图表是否复用四基准件、带三件套？
7. 是否出现 Glass / 渐变背景 / 彩虹色 / Glow？（任一出现即打回）
