# DOC-INDEX · 全文档标题行号索引（自动生成，勿手改）

> 生成命令：`node scripts/build-doc-index.mjs`（文档变动后重跑）。
> 用法：先在本文定位目标文件与标题行号，再只读该行号附近的片段（桥接 `/api/file?offset=&limit=` 或本地按行读取），**不要整篇加载**。

### AGENTS.md（60 行）

- L1 AGENTS.md · 所有 AI 开工前必读
  - L7 0 · 先判定任务，不要先读一堆文件
  - L14 1 · 每次任务的最小必读
  - L25 2 · 开发前：五闸 + 设计决策卡
  - L39 3 · 三条 AOKS 铁律
  - L45 4 · 产品底线（速记，不替代事实源）
  - L54 5 · 事实源与交付

### Design/Future/D6-成绩单页/体验稿.md（6 行）

- L1 体验稿 · 成绩单页

### Design/Future/E1-规则包目录/体验稿.md（6 行）

- L1 体验稿 · 规则包目录

### Design/Future/E2-分享链接/体验稿.md（6 行）

- L1 体验稿 · 分享链接

### Design/Future/E3-多模型对比/体验稿.md（6 行）

- L1 体验稿 · 多模型对比

### Design/Future/E4-Agent观察/Observation-Trace-v1.md（69 行）

- L1 Observation Trace v1（标准草案）
  - L7 设计原则（继承产品宪法，See docs/合规速查表.md）
  - L14 分层结构（观察深度自上而下）
  - L26 事件 Schema（当前实现，See src/lib/agentTrace.ts —— 代码是唯一事实源）
  - L38 路线图（诚实边界：本机 runtime 只有单模型 WebGPU 推理）
  - L48 开放扩展（防写死）
  - L55 下一层草案：Decision Context（未实装，先立规范）
  - L65 非目标

### Design/Future/E4-Agent观察/体验稿.md（92 行）

- L1 体验稿 · Agent 观察（E4）
  - L10 1 · 认知定位（Cognitive DNA）
  - L17 2 · 认知随访问次数生长
  - L24 3 · 产品语法五行（缺一行不立项）
  - L34 4 · 数据来源（Evidence First）
  - L43 5 · 界面与流程
  - L71 6 · 动画（Motion Bible）
  - L78 7 · 文案（AI Vocabulary）
  - L85 8 · AODL 依据与失败判据

### Design/Future/E5-采样显微镜/体验稿.md（6 行）

- L1 体验稿 · 采样显微镜

### Design/Future/README.md（30 行）

- L1 Design / Future · 未来模块体验稿
  - L10 目录
  - L21 怎么写

### Design/Future/_模板-体验稿.md（49 行）

- L1 体验稿 · <模块名>
  - L5 1 · 认知定位（Cognitive DNA）
  - L10 2 · 认知随访问次数生长
  - L16 3 · 产品语法五行（缺一行不立项）
  - L25 4 · 数据来源（Evidence First）
  - L29 5 · 界面与流程
  - L35 6 · 动画（Motion Bible）
  - L39 7 · 文案（AI Vocabulary）
  - L42 8 · AODL 依据与失败判据
  - L46 9 · 实现前设计决策卡

### README.md（145 行）

- L1 DeepSeek-R1 浏览器本地推理（WebGPU）
  - L6 快速开始
    - L18 局域网共享（让同事用他自己的显卡跑）
  - L32 模型（已内置，无需外网）
  - L45 功能
  - L55 测试与质量
  - L67 常见问题
  - L78 开发规则（AI / 人类贡献者必读 · 本项目对话沉淀）
    - L82 1. 开工前（每次任务，无例外）
    - L89 2. 环境准备
    - L95 3. 写代码的要求
    - L103 4. 产品与设计红线（对话定调）
    - L110 5. 测试与验证（交付前必须全绿）
    - L121 6. 交付与写回（本机桥接协作）
  - L128 目录结构

### docs/00-START-HERE.md（34 行）

- L1 AI Observatory · 文档入口
  - L5 开工路线
  - L12 我需要什么？
  - L27 不要误用

### docs/ACDL-Sprint1-设计决策卡.md（47 行）

- L1 ACDL Sprint 1 · 设计决策卡（2026-07-25）
  - L6 1. 文档
  - L11 2. 自绘 Dropdown（`src/components/Dropdown.tsx`，ACDL 06 §3）
  - L23 3. Agent 规划舞台（`src/components/PlanStage.tsx`，Flow 语法）
  - L31 4. 运行中一屏一问（P28，`ObservePage`）
  - L37 5. Questions IA + P27 倒转（`ActivityLog`）
  - L43 6. 验证

### docs/ACDL-Sprint2-5-设计决策卡.md（55 行）

- L1 ACDL Sprint 2–5 + 规划页优化 + 稳定性修复 · 设计决策卡（2026-07-25）
  - L6 Sprint 2 · Moment Engine（`src/lib/moments.ts`，9 测试）
  - L12 Sprint 3 · Story Engine（`src/lib/story.ts`，7 测试）
  - L24 Sprint 4 · Observe 减法（完成态专业层下潜）
  - L31 规划页优化落地（方案 P1–P5）
  - L39 稳定性修复
  - L44 Sprint 5 · BirthScene 粒子成字
  - L50 验证

### docs/ACDL-Sprint6-设计决策卡.md（49 行）

- L1 ACDL Sprint 6 设计决策卡 · Agent Team Visualization
  - L6 D1 · 数据层与 UI 分离（S6-1）
  - L13 D2 · Worker 身份与生命周期（S6-1/2）
  - L20 D3 · Artifact 统一卡与 Viewer（S6-3/8）
  - L27 D4 · Handoff reason 与 Flow 动画（S6-4）
  - L34 D5 · Team Panel 常驻与 Mission Progress（S6-5/6）
  - L39 D6 · Decision Ocean 2.0（S6-10）
  - L44 验证

### docs/ACDL-规划页优化方案.md（81 行）

- L1 规划页（Agent 规划 · 运行中界面）优化方案
  - L9 一、要解决的问题（来自真实反馈）
  - L17 二、设计原则
  - L24 三、目标布局（规划/检索子运行阶段）
  - L49 四、主生成阶段（token 开始后）
  - L55 五、话术清单（规划阶段）
  - L65 六、验收标准
  - L74 七、实施拆分（拍板后按序开工）

### docs/AODL/00-AODL-索引与认知栈.md（75 行）

- L1 AODL · 00 · 索引与认知栈（Index & Cognitive Stack）
  - L14 1 · 六层认知栈（The Six-Layer Stack）
  - L36 2 · 逐层索引（新写缺失层 + 索引复用四卷）
  - L53 3 · Layer 0 · 世界观锚点（Worldview Anchor）
  - L66 4 · 与四卷宪法、DS0、合规速查表的关系

### docs/AODL/01-Cognitive-DNA.md（189 行）

- L1 AODL · Layer 1 · Cognitive DNA（认知 DNA）
  - L16 0 · Cognitive DNA 与 Visual DNA 的区别
  - L30 1 · 六条认知原则（Six Cognitive Principles）
    - L36 原则一 · Question Before Knowledge（先有问题，再给知识）
    - L50 原则二 · Evidence Before Belief（先有证据，再有相信）
    - L64 原则三 · Discovery Before Feature（先有发现，再有功能）
    - L78 原则四 · Layer Before Density（先有分层，再谈密度）
    - L92 原则五 · Memory Before Novelty（先接旧知，再给新知）
    - L109 原则六 · Prediction Before Confirmation（先让预测，再给验证）
  - L127 2 · 第一次观察 AI 的认知阶梯（The Observation Ladder）
  - L155 3 · 认知验收（Cognitive DNA 的验收方式）
  - L170 4 · 与四卷宪法 / Visual DNA 的关系（事实源指向）

### docs/AODL/02-Visual-DNA.md（211 行）

- L1 AODL · Layer 2 · Visual DNA（视觉 DNA）
  - L17 0 · Visual DNA 与 Design System 的区别
  - L30 1 · 七条视觉性格（Seven Axes）
    - L36 轴一 · 可信，不是冰冷（Trustworthy, not Cold）
    - L55 轴二 · 科学，不是实验室白大褂（Scientific, not Sterile）
    - L74 轴三 · 未来，不是赛博朋克（Future, not Cyberpunk）
    - L93 轴四 · 探索，不是游戏（Exploratory, not Gamey）
    - L112 轴五 · 克制，不是无聊（Restrained, not Boring）
    - L131 轴六 · 透明，不是复杂（Transparent, not Complex）
    - L150 轴七 · 可观察，不可装饰（Observable, not Decorative）
  - L173 2 · 呼吸感：DNA 的合成结果
  - L182 3 · 「同一只手」测试（DNA 的验收方式）
  - L194 4 · 与四卷宪法的关系（事实源指向，避免重复与矛盾）

### docs/AOKS/CONTEXT-ROUTER.md（49 行）

- L1 AOKS · Context Router（上下文路由表）
  - L8 1 · 按任务类型加载
  - L24 2 · 30 秒自检
  - L32 3 · 规范住址速查

### docs/AOKS/DESIGN-REVIEW.md（33 行）

- L1 AOKS · Design Review（多角色设计审查）
  - L5 四个必问角色
  - L14 审查顺序
  - L22 结论格式

### docs/AOKS/DOCUMENT-LIFECYCLE.md（43 行）

- L1 AOKS · Document Lifecycle（文档生命周期）
  - L5 五种状态
  - L15 新建文件前的检查
  - L28 生命周期迁移
  - L38 保存规则

### docs/AOKS/MIGRATION-MAP.md（45 行）

- L1 AOKS · 知识地图（现有文档的角色与加载策略）
  - L6 Kernel / Constitution
  - L20 产品与模块
  - L32 实时状态与历史

### docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md（59 行）

- L1 AOKS · Product Delivery Workflow（从需求到可信体验）
  - L6 适用范围
  - L10 六步工作流
    - L12 1. 定义问题，不从组件开始
    - L17 2. 做设计决策卡（实现前）
    - L21 3. 先定静态信息层级，再定动态表达
    - L25 4. 进行多角色反驳
    - L29 5. 实现与截图审查
    - L33 6. 验证并写回
  - L37 设计决策卡模板
  - L53 不可跳过的底线

### docs/AOKS/README.md（40 行）

- L1 AOKS · AI Observatory Knowledge System
  - L5 它解决什么
  - L11 使用顺序
  - L22 AOKS 文件职责
  - L33 关键约束

### docs/AOKS/SOURCE-OF-TRUTH.md（35 行）

- L1 AOKS · Source of Truth（权威层级与裁决）
  - L5 权威顺序
  - L15 角色边界
  - L25 修改协议
  - L32 本项目的特别裁决

### docs/AOKS/TOKEN-DIET.md（32 行）

- L1 TOKEN-DIET · 省 token 作业规范（借鉴 Headroom，零依赖工程化）
  - L6 三层机制（对应 Headroom 概念）
  - L14 读取纪律（每次任务）
  - L21 写入纪律
  - L27 维护

### docs/DS0-token对照表.md（98 行）

- L1 DS0 · Design Token 对照表（校准记录）
  - L11 1. 动效 Motion
  - L43 2. 圆角 Radius
  - L61 3. 字号 Typography
  - L76 4. 间距 Spacing
  - L80 5. 语义色 Semantic Colors（≤5）
  - L94 变更小结（本批次实际改动）

### docs/Director-导演系统-设计决策卡.md（42 行）

- L1 设计决策卡 · 导演系统（Director）+ Token 即入口 + 证据流场
  - L6 一句话
  - L11 五闸
  - L19 决策与理由
  - L34 失效条件（P24）
  - L39 验证

### docs/E5-VolumeI-产品宪法.md（315 行）

- L1 AI Observatory E5 · Volume I · Product Constitution（产品宪法）
  - L9 第一章 · Philosophy（产品哲学）
    - L11 1.1 为什么这个产品存在
    - L22 1.2 为什么不是聊天
    - L30 1.3 为什么不是 Playground
    - L37 1.4 为什么不是 Dashboard
    - L44 1.5 为什么不是 Demo
    - L50 1.6 一句话定位
    - L55 1.7 使命句
  - L66 第二章 · Design Principles（设计原则，31 条，按三层级归位）
    - L74 基本法（P1–P4，不可修订）
    - L92 通则（P5–P24）
  - L218 第三章 · AI Language（语言宪章）
    - L223 3.1 允许的词（观察语言）
    - L233 3.2 禁止的词（拟人断言）
    - L242 3.3 改写范式（每个禁词都有出路）
    - L252 3.4 执行机制
  - L259 第四章 · Brand Philosophy（品牌哲学）
    - L261 4.1 品牌人格
    - L270 4.2 双体系的世界观（既有决策，upgraded to constitution）
    - L276 4.3 语气
  - L283 第五章 · Product Grammar（产品语法）
  - L309 第六章 · 修宪与执行

### docs/E5-VolumeII-设计图谱.md（202 行）

- L1 AI Observatory E5 · Volume II · Design Atlas（设计图谱）
  - L9 第一章 · 拆解方法
  - L22 第二章 · 案例拆解
    - L24 2.1 Lovart（用户指定研究对象）
    - L47 2.2 Linear
    - L66 2.3 Apple（HIG 与产品页双面）
    - L82 2.4 NASA Mission Control / Bloomberg Terminal（高密度仪表的两极）
    - L98 2.5 Stripe（文档与仪表台）
    - L112 2.6 Raycast / Arc（新一代工具的克制美学）
    - L123 2.7 Anthropic / OpenAI / DeepMind（研究机构的传播设计）
    - L137 2.8 CERN 科学可视化 / 示波器工业设计（仪器的本体）
  - L149 第三章 · 图标哲学（Icon Philosophy）
    - L153 3.1 各家拆解结论
    - L161 3.2 沉淀为我们的图标宪章
    - L172 3.3 填充与描边的唯一规则
  - L178 第四章 · 视觉语言基准（Visual Language）
  - L194 第五章 · 反面清单（我们永远不学的东西）

### docs/E5-VolumeIII-交互圣经.md（209 行）

- L1 AI Observatory E5 · Volume III · Interaction Bible（交互圣经）
  - L9 第一章 · 交互语法（Interaction Grammar）
    - L11 1.1 页面语法（继承宪法第五章）
    - L19 1.2 下潜语法（Progressive Disclosure 的唯一实现）
    - L33 1.3 时间语法（一切与生成过程相关的交互）
    - L49 1.4 悬停语法
    - L55 1.5 键盘语法（给回访者的糖，不是给首访者的门）
    - L60 1.6 状态语法（组件的五态齐全，Apple HIG 纪律）
  - L68 第二章 · 组件哲学（Component Philosophy）
  - L128 第三章 · Motion Bible（动效律法）
    - L130 3.1 第一定律：动效必须解释
    - L139 3.2 时长与缓动的三档制
    - L153 3.3 何时禁止动画
    - L159 3.4 Three.js 场景的运动纪律
  - L167 第四章 · 视觉规格数值（Design Tokens 的宪法值）
  - L183 第五章 · 图标执行规范（承接 Volume II 图标哲学）
  - L195 第六章 · 触屏与响应式语法
  - L204 第七章 · 执行与守护

### docs/E5-VolumeIV-科学评测框架.md（149 行）

- L1 AI Observatory E5 · Volume IV · Scientific Benchmark Framework（科学评测框架）
  - L8 第一章 · 评测哲学
    - L10 1.1 为什么仪器需要分数
    - L17 1.2 分数的三宗罪（我们防的就是这三件事）
    - L25 1.3 与主流 Benchmark 文化的分野
  - L34 第二章 · 分数的公民资格（什么数字有资格被称为分数）
  - L50 第三章 · 三层评测体系（现有实践的宪法化）
    - L52 3.1 第一层 · 官方引用层（Official Reference）
    - L60 3.2 第二层 · 系统测量层（System Measurement）
    - L70 3.3 第三层 · 行为统计层（Behavioral Statistics）
    - L80 3.4 三层关系图
  - L92 第四章 · 统计纪律
  - L105 第五章 · 评测的用户旅程（评测如何服从产品语法）
  - L124 第六章 · 未来扩展的合法性判据
  - L142 第七章 · 与其余三卷的关系

### docs/E5-双轨开发计划.md（173 行）

- L1 E5 双轨开发计划（AODL 治理版）
  - L12 0 · 为什么改节奏（品类产品的路径）
  - L32 1 · 双轨并行（Two Tracks）
  - L47 2 · Core Loop 定义与「第一次使用震撼」验收（轨道一的靶心）
  - L73 3 · 三阶段（Phase A / B / C）
    - L75 Phase A（现在）· 100% 不写新功能
    - L89 Phase B · 未来功能只做纸面设计（不写代码）
    - L97 Phase C · 真开发（每模块先过五闸）
  - L113 4 · 与《直通 E5 完整规划》批次的映射（重排，不推翻）
  - L129 5 · `Design/Future/` 目录约定
  - L158 6 · 三视角自评（写完先自我攻击）

### docs/P27-认知优先-重构设计稿.md（185 行）

- L1 P27/P28 认知优先 · 叙事语法 · Questions · 基础质量 重构设计稿 v2（待拍板）
  - L9 0. 使命句（提议直接入宪法序言 + 首页 hero）
  - L23 1. P27 · Cognitive First（认知优先 / Evidence before Explanation）
  - L52 2. P28 · One Screen, One Question（一屏只回答一个问题）
  - L71 3. 命名三层：Decision / Moment / Decision Moment
  - L83 4. Questions 组织 UI（信息架构级改动，本稿最重的一条）
  - L106 5. Narrative Grammar（叙事语法，全站组件统一语言）
  - L119 6. 运行中一屏的叙事主线重构（反面案例 A，P28 的第一个落地）
  - L132 7. 基础质量债（本次一并偿还 + 教训入流程）
  - L150 8. 宪法三层级收敛（治理架构，防止原则无限膨胀）
  - L162 9. 五闸预检（对本稿全部条目）
  - L170 10. 诚实边界（不变）
  - L174 11. 实施分期（拍板后执行）

### docs/Phase-A-CoreLoop-gap分析.md（68 行）

- L1 Phase A · Core Loop 逐阶 gap 分析
  - L10 一句话结论
  - L17 逐阶验收表
  - L32 P0-1 · 阶 4「复现」被说、没被看见
  - L42 P0-2 · 认知原则六「先猜后验」缺席
  - L54 次要 gap（不阻塞首用震撼，登记备查）
  - L61 建议的 Phase A 执行顺序（待你批准再进实现）

### docs/RAG-Agent-LiveDebug-设计决策卡.md（43 行）

- L1 设计决策卡 · RAG 进运行链 + Agent 规划接力 + Live-Debug 断点
  - L6 决策 1 · 联网检索进运行链（RAG Observatory，不做独立页）
  - L15 决策 2 · Agent 规划接力（Agent = Workflow 升级）
  - L25 决策 3 · Live-Debug 犹豫断点（Sprint 4 收尾）
  - L33 五闸自检
  - L40 验证

### docs/Sprint2-4-设计决策卡.md（40 行）

- L1 Sprint 2–4 · 设计决策卡（三张，随代码交付）
    - L5 Runtime Journey（Sprint 2）· 设计决策卡
    - L17 Decision Moments（Sprint 3）· 设计决策卡
    - L29 Agent 旅程带（Sprint 4）· 设计决策卡

### docs/Sprint5-6-设计决策卡.md（38 行）

- L1 设计决策卡 · Sprint 5–6「此刻卡片 + 内心独白剧场 + 思考字幕」
  - L6 决策 1 · 此刻卡（MomentCard）
  - L16 决策 2 · 思考字幕（ThinkingCaption）
  - L24 决策 3 · 内心独白 · 活动日志（ActivityLog）
  - L30 覆盖范围
  - L35 验证

### docs/Sprint7-9-设计决策卡.md（31 行）

- L1 设计决策卡 · Sprint 7–9「思路地图 + 没走的路 + 注意力聚光灯调研」
  - L5 Sprint 7 · 思路地图（ThoughtMap）
  - L15 Sprint 8 · 没走的路（RoadsNotTaken）
  - L21 Sprint 9 · 注意力聚光灯 · 可行性调研结论（本期只调研，不做 UI）
  - L28 验证

### docs/StoryMode-Compare-开发计划.md（56 行）

- L1 Story Mode + Compare 开发计划（时间维度主线 · 2026-07-24 规划）
  - L9 为什么是这两个（方向论证）
  - L15 Sprint A · Story Mode（同一 trace 的纪录片式 renderer）
  - L30 Sprint B · Compare Replay（两次运行的同步对比 renderer）
  - L42 顺序与工作量
  - L46 五闸自检
  - L53 完成定义

### docs/architecture/AVP.md（163 行）

- L1 AVP · Agent Visual Protocol（Agent 可视化协议）
  - L7 0. 定位升级（一句话）
  - L17 1. 产品目标：5 秒四问
  - L31 2. Q1 · Worker：谁在工作（角色优先，模型其次）
    - L49 Worker 生命周期（不许只有 Running/Finished，那太程序员）
    - L56 铁律：Worker 永不消失
  - L61 3. Q2 · Handoff：为什么轮到它（每次交接必须有原因）
  - L76 4. Q3 · Artifact：它交出了什么（比 Token 更重要）
    - L104 Flow：Artifact 必须「飞过去」，不许瞬移
  - L110 5. Q4 · Mission Progress：团队进行到哪（替代 step 123）
  - L119 6. Team Panel：团队总览常驻
  - L125 7. 主舞台：Pipeline，不是 Card
  - L139 8. 诚实边界（继承宪法，逐条适用）
  - L146 9. Sprint 6 任务拆分（10 个独立开发/验收/回滚单元）

### docs/design-language/00-principles.md（84 行）

- L1 ACDL 00 · 原则（AI Cognition Design Language）
  - L6 0. 定位与使命
  - L16 1. 五层认知链（本语言的宪法级骨架，重于 P27）
  - L41 2. 原则总表（三层级收敛，此后新增原则必须归入其一）
    - L43 价值层（Why）
    - L49 认知层（How people understand）
    - L56 交互层（How the interface behaves）
  - L62 3. 单向数据流架构（代码层对应）
  - L71 4. 开发四问（写代码前必答）
  - L80 5. 诚实边界（不变，凌驾一切效果）

### docs/design-language/01-questions.md（41 行）

- L1 ACDL 01 · Questions（问题驱动导航 · P31）
  - L5 1. 页面 = 问题（Question Organization）
  - L18 2. 读者层问题（锚定正文，随阅读产生）
  - L30 3. 专业层问题（下潜，不删）
  - L34 4. 诚实缺席问题（P9）
  - L38 5. Question Engine（代码层）

### docs/design-language/02-visual-grammar.md（61 行）

- L1 ACDL 02 · Visual Grammar（统一视觉语法 · P30）
  - L5 1. 四种语法
    - L7 ① Birth（诞生）——产品 Logo 级能力
    - L12 ② Branch（分叉）
    - L24 ③ Collapse（坍缩）
    - L29 ④ Flow（流）
  - L34 2. 现有组件归位表
  - L47 3. Ocean 的终局（Phase 6）
  - L51 4. 与叙事语法的对应
  - L56 5. 禁则

### docs/design-language/03-motion.md（32 行）

- L1 ACDL 03 · Motion（动效规范）
  - L5 1. 每个动效的三件套（评审必填）
  - L11 2. 节奏（导演制，沿用 director.ts 口径）
  - L18 3. 确定性
  - L22 4. 3D = Feel，2D = Understand（铁律）
  - L29 5. 性能

### docs/design-language/04-story.md（48 行）

- L1 ACDL 04 · Story（叙事层规范 · Layer 3）
  - L5 1. 定义
  - L12 2. Story Engine（Phase 4 / Sprint 3）
  - L30 3. 模板库（全部规则，字段填空）
  - L42 4. 铁律

### docs/design-language/05-pattern.md（40 行）

- L1 ACDL 05 · Pattern（先模式后数字 · P29 / Layer 2）
  - L5 1. 定义
  - L22 2. 字段 → Pattern 映射表（全站统一，禁止另造）
  - L34 3. 规则

### docs/design-language/06-components.md（33 行）

- L1 ACDL 06 · Components（组件规范）
  - L5 1. 组件登记表（现有组件归位）
  - L19 2. 状态完整性（硬规则，教训固化）
  - L24 3. 基础控件
  - L30 4. 单向数据流约束

### docs/design-language/07-layout.md（31 行）

- L1 ACDL 07 · Layout（一屏一问 · P28）
  - L5 1. 屏 → 唯一问题（验收口径）
  - L17 2. 运行中一屏的收纳（反面案例 A 的解法）
  - L22 3. 层级秩序
  - L28 4. 违宪判例

### docs/headroom-省token接入.md（73 行）

- L1 Headroom 省 token 接入指南（本机 AI 开发工作流）
  - L7 能省到哪里（诚实边界）
  - L15 一、安装（Windows 注意）
  - L32 二、接入方式（按省事程度排序）
    - L34 1. wrap 编码 Agent（一条命令，需 B/C 方案的 CLI）
    - L43 2. MCP server（Codex/Claude Code 等 MCP 客户端）
    - L54 3. 代理模式（任何 OpenAI/Anthropic 兼容客户端，含 Docker 方案）
  - L61 三、进阶（跑顺后再开）
  - L68 四、验证接入成功

### docs/observatory-roadmap-下一阶段.md（59 行）

- L1 AI Observatory 路线图 · 下一阶段（讨论收敛稿）
  - L7 北极星
  - L14 已上线的对应能力（现状盘点）
  - L24 Benchmark 三层体系（渐进落地）
    - L26 第一层：系统实测（已做，持续加深）
    - L31 第二层：官方成绩引用（未做）
    - L36 第三层：行为指标（原创，逐步定义）
    - L41 Benchmark 规则包（生态方向）
  - L46 多模型组合（愿景，V2+）
  - L53 明确不做（重申）

### docs/observatory-v1-产品收敛.md（84 行）

- L1 AI Observatory V1 产品收敛文档
  - L7 一、定位
  - L14 二、V1 三页面结构（收敛自六模块概念图）
  - L32 三、Ocean View 产品定义
  - L53 四、Brain 的诚实化路径（二期）
  - L61 五、护城河：.aitrace 开放格式
  - L69 六、半年排期（与 CTO 视角一致）
  - L78 七、V1 成功判据

### docs/observatory-v1-技术调研.md（127 行）

- L1 AI Observatory V1 技术调研与可行性验证
  - L6 一、渲染选型：Three.js
    - L8 1. 版本与供应链
    - L13 2. 包体实测
    - L23 3. 粒子规模与帧率实测
    - L38 4. 渲染与推理共存
  - L48 二、数据映射规范（trace → 3D）
  - L72 三、.aitrace v2 格式草案
  - L94 四、Machine Score 评分方法草案
  - L110 五、风险清单
  - L121 六、验证材料

### docs/产品分层重构-总开发计划.md（123 行）

- L1 产品分层重构 · 总开发计划（V2 主线）
  - L9 0.5 · Debugger 能力模型（产品核心，凌驾一切镜头）
  - L22 0 · 三层混淆的诊断（本次重构的出发点）
  - L32 1 · 新信息架构（四层导航，取代现有并列页签）
  - L45 1.5 · 首页定调：AI Workspace 工作现场，不是聊天页（创始人 2026-07-24 补充定调）
  - L67 2 · Workflow 阶段划分的诚实性方案（Sprint 1 的核心设计难题）
  - L77 3 · Sprint 排期
    - L79 Sprint 1 · AI Workspace 控制台（新首页，P0）
    - L88 Sprint 2 · Decision Layer（Explain 层，P0）
    - L94 Sprint 3 · Microscope 收编（P1）
    - L99 Sprint 4 · Experiment → Debugger（P0⬆，产品核心差异化）
    - L106 Sprint 5 · RAG 插进 Workflow（P1）
    - L113 Sprint 6 · Agent = Workflow 升级（P2）
  - L118 4 · 不变的铁律

### docs/产品原则.md（74 行）

- L1 AI Observatory 产品原则 · P1–P4 检验细则
  - L9 Principle 1 · Evidence First（证据优先）
  - L26 Principle 2 · Show, Don't Tell（展示数据，不替用户下结论）
  - L41 Principle 3 · Curiosity Before Explanation（先激发好奇，再解释原理）
  - L53 Principle 4 · Every Click Earns the Next Click（每次点击兑现承诺、制造下一次好奇）
  - L68 附：文案审查清单（发布前逐条打勾）

### docs/亲和层改版-首页与档案-开发计划.md（87 行）

- L1 亲和层改版：首页 + 档案（2026-07-24 创始人定调 · 规划）
  - L7 诊断（为什么现在看不懂）
  - L13 外部调研（2026-07-24 · 创始人要求「去看外面的讨论和案例」后补）
  - L28 Sprint C · 首页「10 秒看懂 AI」
  - L40 Sprint D · 档案卡片化 + 对话式档案页
  - L53 Sprint E（讨论稿）· 理解层：「AI 是怎么运行的」一条连贯旅程
  - L71 顺序与边界
  - L77 五闸自检
  - L84 完成定义

### docs/任务看板.md（133 行）

- L1 任务看板（AI 接续开发唯一入口 · 实时更新）
  - L7 本批次的体验护栏
  - L15 最近完成（倒序，保留最近约 10 条）
  - L45 主线定调（2026-07-24 创始人重构 · 最高优先）
    - L51 进度（2026-07-24 开工）
  - L63 待开发（方案已定，按序执行）
    - L68 Sprint 7 「思路地图」（✅ 已完成 2026-07-24，见最近完成表）
    - L75 Sprint 8 「没走的路」（✅ 已完成 2026-07-24；动态层待本机 WebGPU 实测）
    - L82 Sprint 9 「注意力聚光灯」（调研已完成；采集/UI 依赖重导出 ONNX，暂搁）
  - L89 Sprint 6 · Agent Team Visualization（创始人 2026-07-25 定调 · ✅ 已交付，待本机 WebGPU 复核）
  - L109 下一批次（创始人 2026-07-24 定调 · 方案已出，待确认后开工）
  - L113 待规划（方向已定，尚未出实施方案）
  - L122 小项待办
  - L128 完成定义

### docs/决策优先-AI思维可视化-重构设计稿.md（152 行）

- L1 决策优先 · AI 思维可视化重构设计稿 v2（已拍板 · S1–S6 已实施）
  - L8 0. 一句话定调
  - L24 1. 调研综述（借什么 / 不借什么）
  - L39 2. 六个重构（每项均通过四问检验，标注驱动字段）
    - L41 A. 决策流（Decision Stream）替代 Token 流
    - L57 B. 内心独白 → 决策日志（人话化）
    - L61 C. 词海 → 全词表投票场景
    - L70 D. 3D 柱林可读性 + 柱子生命体化
    - L87 E. RAG / Agent 决策舞台化
    - L91 F. 全流程「活着的数据流」（远期，依赖导出）
  - L97 3. 诚实边界（P9）
  - L104 4. 实施分期（拍板后执行）
  - L119 5. 创始人设计纲领合并裁决（v2 新增）
    - L123 5.1 直接吸收（并入对应分期）
    - L137 5.2 修正后吸收（与宪法/数据现实冲突，给出替代）
    - L149 5.3 分期修订（v2）

### docs/决策优先v2-实测报告.md（56 行）

- L1 决策优先 v2（S1–S6）浏览器实测报告
  - L6 结果总览
  - L16 T1 · 决策日志人话化 — PASS
  - L26 T2 · 标本台可读性 + 高光冻结 — PASS
  - L35 T3/T4/T5 · UNTESTED（环境限制，非代码缺陷）
  - L52 附加验证

### docs/决策优先v2-实现-设计决策卡.md（37 行）

- L1 决策优先 v2 实现 · 设计决策卡
  - L6 五闸
  - L16 交付清单（驱动字段全部真实）
  - L28 诚实缺席（P9）
  - L33 失效条件（P24）

### docs/前四层产品逻辑推演.md（283 行）

- L1 前四层深度推演（用户 × 顶尖 PM × UI 设计师三视角，批判版）
  - L13 先立三个用户，后面每层都用他们走查
- L28 第 0 层 · 宪法
  - L30 PM 自我攻击：四条原则里哪条最可能变成自欺？
  - L50 可证伪的失败判据
- L57 第 1 层 · 首屏叙事
  - L59 用户逐帧走查（这是定稿文案没做过的推演）
  - L94 PM 自我攻击
  - L119 UI 设计决策（可直接执行的规格）
  - L133 这一层最可能死掉的方式
- L140 第 2 层 · 存量能力（兑现层）
  - L142 用户逐帧走查：从按钮点击到"第一次干预"
  - L165 PM 自我攻击
  - L180 这一层最可能死掉的方式
- L189 第 3 层 · Evidence First 界面化
  - L191 用户走查：谁真的会点开"陈述"？
  - L199 PM 自我攻击
  - L216 UI 设计决策
  - L224 这一层最可能死掉的方式
- L232 第 4 层 · Benchmark 体系（D1–D6）
  - L234 为什么第 4 层的性质与前三层根本不同
  - L240 用户走查
  - L250 PM 自我攻击：第 4 层最可能死掉的三种方式
  - L264 递进关系的真实含义
- L272 全文的三个未决问题（诚实列出，不假装已解决）

### docs/前四批次开发计划.md（204 行）

- L1 前四批次详细开发计划（综合定稿 × 评审 × 批判版推演）
- L12 批次 1 · 首屏叙事（A1–A8 + A10）
  - L14 开发顺序总览（依赖关系决定）
  - L35 T0 · Spike：首屏深色化决策（≤半天，产出是决策不是代码）
  - L41 T1 · 构建期数据管道（A10）
  - L60 T2 · 犹豫点切片组件（A3）
  - L71 T3 · 首屏改版（A1/A2/A4/A7）
  - L83 T4 · 演示快进急停（A4 实现修正版）
  - L94 T5 · 暂停帧解释层（A5）
  - L104 T6 · 收束统计卡 + 15 瞬间列表 + 换 seed 出口（A6）
  - L117 T7 · 首访行为 trace + 设备页漏斗（A8）
  - L127 T8 · 全量验证与写回
- L140 批次 1.5 · A9 陌生人测试（用户执行，产品侧只做准备）
- L148 批次 2 · Evidence First 界面化 + 旅程收敛（C1–C2 + 推演补充项）
- L166 批次 3 · 犹豫点双结局 + 行为 Benchmark 起步（C3 + D3/D4 首期）
- L183 批次 4 · Benchmark 分层完整化（D1/D2 扩展）
- L196 全局纪律（四个批次通用）

### docs/合规速查表.md（89 行）

- L1 合规速查表（宪法一页版 · 开发时只查这张）
  - L11 0. 每次提交前 6 项自查（宪法自查模板）
  - L21 1. AI 语言宪章（文案白/黑名单）
  - L32 2. 31 条原则（一行速记；P1–P4 不可修订）
  - L40 3. Design Token 宪法值（DS0 目标）
  - L53 4. 图标规范（DS1）
  - L59 5. 交互语法与组件红线
  - L68 6. Benchmark / 分数纪律
  - L75 7. 品牌语气
  - L82 附：当前已知债务（批次 5 待清，写代码时顺手对齐）

### docs/定稿评审记录.md（76 行）

- L1 三视角严格评审记录（评审 → 修订对照）
  - L8 视角一 · AI 产品负责人
  - L33 视角二 · 老板（资源与执行）
  - L52 视角三 · 投资人（叙事与壁垒）
  - L72 未采纳意见（附理由）

### docs/宪法校验记录.md（100 行）

- L1 宪法校验记录 · 已有计划与已交付成果 对照 E5 四卷
  - L10 一、已交付成果（批次 1–4 代码）校验
    - L12 ✅ 合宪项（抽查确认）
    - L27 ❌ 违宪项（1 处，批次 5 必须修复）
    - L36 ⚠ 待修订项（不阻塞，归入 DS0/DS1 迁移）
  - L59 二、《直通E5完整规划》逐锚点校验
  - L84 三、《总体规划-锚点》《前四批次开发计划》校验
  - L93 四、结论

### docs/总体规划-锚点.md（114 行）

- L1 AI Observatory 总体规划（锚点版）
  - L13 定位声明（评审 V1 补）
  - L21 第 0 层 · 产品宪法
  - L31 第 1 层 · V1 首屏叙事（下一个开发批次）
  - L48 第 2 层 · 已完成的观察/实验能力（V0 存量，只列锚点不重述）
  - L64 第 3 层 · Evidence First 落地改造（第一屏之后的批次）
  - L74 第 4 层 · Benchmark 体系（承接 roadmap 文档）
  - L87 第 5 层 · 远期愿景（不写进产品承诺，只留锚点）
  - L100 开发顺序（当前共识）

### docs/批次2审查记录.md（44 行）

- L1 批次 2 审查记录 · Evidence First 界面化 + 旅程收敛
  - L6 C2 · EvidencedClaim 组件
  - L13 旅程收敛 · 完成态唯一主出口
  - L22 等待时教学
  - L27 C1 · 全站文案审查表
  - L40 遗留

### docs/批次3验收记录.md（45 行）

- L1 批次 3 验收记录 · 双结局 + 行为基准起步 + 规则包 V1
  - L6 C3 · 双结局
  - L16 D3 · 行为基准首期（自己和自己比）
  - L26 D4 · 规则包 V1（零新 DSL）
  - L33 云端走查（生产构建 preview）
  - L39 遗留（如实记录）

### docs/批次4验收记录.md（51 行）

- L1 批次 4 验收记录 · 官方引用层 + 系统基准口径
  - L6 D1 · 官方公开成绩引用层
  - L22 D2 · 系统基准口径扩展
  - L34 截图自解释验收（D1 验收标准）
  - L39 云端走查
  - L45 遗留（如实记录）

### docs/批次5-验收记录.md（38 行）

- L1 批次 5 验收记录 · 宪法清理（V-1 / W-4 / DS0 / DS1 / DS5）
  - L5 一、范围与交付
  - L15 二、改动文件（17）
  - L18 三、验证（代码层，无截图/视频）
  - L25 四、宪法自查（提交前 6 项）
  - L33 五、已知限制 / 待确认债务（未擅自执行，需人类拍板）

### docs/直通E5完整规划.md（358 行）

- L1 直通 E5 完整规划 · 锚点 + 设计系统
  - L10 第 0 部分 · 现状基线（已完成，不重复开发）
  - L35 第 1 部分 · 设计系统线（DS 锚点组，新增）
    - L37 为什么现在立这条线（产品逻辑）
    - L45 从三个参考源各取什么（明确取舍，不照抄）
    - L69 DS0 · 设计 token 固化
    - L81 DS1 · 图标语言统一
    - L98 DS2 · 基础组件沉淀（primitives）
    - L116 DS3 · 交互纪律组件化
    - L126 DS4 · 移动端规格补课
    - L134 DS5 · 视觉回归防线
  - L144 第 2 部分 · C3 完整版
    - L146 C3.1 · 犹豫点一键双跑
    - L163 C3.2 · 双结局分岔切片共享头
  - L175 第 3 部分 · D5/D6 Benchmark 完整化
    - L177 D5 · 官方成绩补录（其余 6 模型）
    - L187 D6 · Benchmark 独立页
  - L204 第 4 部分 · E 层（E1–E5）
    - L211 E1 · 规则包社区分享
    - L226 E2 · 实验分享链接
    - L244 E3 · 多模型对比观测
    - L260 E4 · Agent / 工具调用 instrumentation
    - L282 E5 · 内部状态观测（attention 级）
  - L308 第 5 部分 · 批次划分与顺序
  - L328 第 6 部分 · 三视角自评（写完先自我攻击）

### docs/视觉密度升级-开发计划.md（106 行）

- L1 视觉密度升级 · 开发计划（概率光渊 / 幽灵续句 / 注意力聚光灯）
  - L7 第 0 条铁律 · 产品是干什么的（负责人视角，凌驾一切视效决策）
  - L19 0 · 参考图的视觉语言拆解（世界级产品的三个共性）
  - L30 1 · Sprint 10「概率光渊」——主视效从柱阵升级为光丝束（P0）
  - L44 2 · Sprint 11「幽灵续句」——没走的路升级为参考图布局（P1）
  - L51 3 · Sprint 12「注意力聚光灯」——依赖数据落地，UI 规格先冻结（P2·暂搁待数据）
  - L57 3.5 · Sprint 13「双模型 Agent 工作流」——两个模型协作全程可观察（P1，可与 Sprint 11 并行规划）
    - L61 13.1 工作流设计（负责人视角的完整流程）
    - L77 13.2 匹配的可视化（每个环节选一个已验证的视觉语言）
    - L87 13.3 任务拆解
  - L95 4 · 设计基调（三个 Sprint 共用）
  - L101 5 · 风险与对策

### docs/首屏文案稿.md（92 行）

- L1 V1 首屏与演示文案稿（对应锚点 A1–A6）
  - L9 一、首屏（A1–A4）
  - L40 二、演示暂停帧（A5，机制第一次出场）
  - L62 三、演示收束语（A6，真实统计版）
  - L86 四、Evidence First 自查（发布前）
