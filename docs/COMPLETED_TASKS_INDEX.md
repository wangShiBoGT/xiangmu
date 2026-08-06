# 已完成任务索引

> 完整内容见 [COMPLETED_TASKS.md](./COMPLETED_TASKS.md)（826 行）
> 本文件为快速索引，方便 AI 快速定位已完成功能

---

## 核心功能（已完成）

### Phase 0: 颜色系统重构 ✅
- 移除 AI 风格青紫色系（indigo/violet/purple）
- 统一测量色：观测蓝 #10A0FF + 琥珀 #b98430 + 红色 #c94b4b
- 5-7 层灰阶梯（#0a0a0a → #2a2a2a）

### Task #1: WebGPU 性能与兼容性 ✅
- WebGPU 自动降级机制
- 设备探测与优化建议
- WASM 模式中断检查改进
- DeviceCompatibilityBanner 组件

### Task #2: Trace 系统完善 ✅
- TokenStep 数据结构（id/text/prob/topk/entropy/dt/deep）
- .aitrace v2 格式导入/导出
- IndexedDB 持久化存储（ExperimentRecord）
- 分岔树支持（BranchNode，最多 8 节点）
- Agent 事件扩展（AgentEvent）

### Task #3: SamplingChamber 交互增强 ✅
- 候选词点击下钻（完整 topk 分布）
- 时间轴回溯（上一步/下一步/slider）
- 概率阈值可视化标线（10%）
- 参数对比（compareParams 实时对比不同温度）

### Task #4: 思考链改进 ✅
- 流式渲染性能优化（useMemo + 虚拟滚动）
- ThinkingTimeline 可视化时间轴
- 语义高亮（推理/假设/结论/疑问）
- 逐步展开动画（ActivityCard）

### Task #5: 文档理解增强 ✅
- PDF 解析（pdfjs-dist）
- Word 解析（mammoth）
- Excel 解析（xlsx）
- 多文档同时加载（buildDocPrompt）
- 语义分块（truncateDoc，MAX_DOC_CHARS=6000）

### Task #6: 图像理解集成 ✅
- SmolVLM-256M-Instruct 集成
- VisionPipeline 独立管线
- 图像预处理（MAX_IMAGE_EDGE=512px）
- 图文混排展示（ChatMessage）

### Task #7: 响应式布局优化 ✅
- Sidebar 汉堡菜单（移动端抽屉式）
- SamplingChamber 容器查询
- LandingHero 响应式网格
- 横屏模式优化（高度<600px）

### Task #8: 无障碍访问（A11y）✅
- ARIA 标签（8 个核心组件）
- 键盘导航（Dropdown 完整支持）
- 色彩对比度修复（WCAG AA）
- 用户消息气泡从荧光绿改为深石墨（对比度 >4.5:1）

### Task #9: 本地统计面板 ✅
- computeOverallStats（会话/模型/参数/熵分布/温度分布）
- StatisticsPage 四个标签页
- 导出功能（CSV/JSON）
- 数据来源：localStorage 会话历史 + IndexedDB 实验存档

### Task #10: Benchmark 页面数据更新 ✅
- 扩展 Phi-3.5-mini 官方成绩（7 项基准）
- 新增 DeepSeek-R1-Distill-Qwen-7B 完整评测
- 新增 DeepSeek-R1-Distill-Llama-8B 完整评测
- 所有数据从 HuggingFace 官方模型卡核实

### Task #11: 测试覆盖率提升 ✅
- 单元测试：57 个测试文件
- E2E 测试：6 个测试套件（Playwright）
- Trace 回归测试：11 个数据结构验证
- 视觉回归测试：30+ 个截图对比

### Task #12: 文档体系完善 ✅
- docs/任务看板.md
- docs/合规速查表.md
- docs/00-START-HERE.md
- docs/API文档.md

### Task #13: 构建优化 ✅
- Bundle 拆分（vendor-three/office/pdf）
- Lazy Loading 粒度优化（单文件 <30KB）
- Service Worker 离线支持
- 模型文件增量更新（断点续传）

### Task #14: 监控与错误追踪 ✅
- Core Web Vitals 性能监控（LCP/FID/CLS/FCP/TTFB/INP）
- 客户端错误追踪（window.error + unhandledrejection）
- WebGPU 初始化失败详细记录
- 开发模式性能 Profiler（window.__profiler__）

### Task #17: Tooltip 系统 ✅
- Tooltip.tsx 组件（桌面悬停 + 移动点击）
- Term.tsx 术语包装器
- glossary.ts 术语数据库（40+ 术语）
- GLOSSARY.md 完整术语表
- 已集成：SettingsPanel（温度/Top-P）、SamplingChamber（概率/熵）

### Task #24: Replay 模式增强 ✅
- ReplayController 类（播放/暂停/速度/步进/循环）
- 书签管理（addBookmark/jumpToBookmark）
- Fork Point 检测（自动检测犹豫点）
- ReplayControlPanel 组件
- 集成到 ObservePage

### Task #25: 性能排行榜（阶段 1）✅
- LeaderboardPage 组件
- LeaderboardSubmitDialog 组件
- 零密钥方案（预填 GitHub Discussion）
- leaderboard.ts 模块（fetchLeaderboard/buildSubmissionUrl）
- 防作弊：trace 文件验证

---

## 已实现但当前不改动的功能

### EmbeddingPage ✅
- 文本向量化（all-MiniLM-L6-v2）
- t-SNE/UMAP 降维
- 3D 可视化
- 相似度计算

### RAGPage ✅
- 向量数据库（IndexedDB）
- 混合检索（BM25 + Vector）
- 文档分块
- 知识库管理

### PerformancePage ✅
- 推理性能测试
- 批量基准测试
- 性能报告导出（JSON/CSV）

### AgentPage ✅
- Agent 协作流程可视化
- 工具调用追踪
- 决策点标注

### JourneyPage ✅
- "一个词的旅程"教育演示
- 注意力可视化
- 四幕接力

### FindingsPage ✅
- 自动发现分析
- 分叉检测
- 性能异常
- 证据视图

---

## 技术架构要点

### 设计系统
- 颜色：measure（蓝）/caution（琥珀）/alert（红）/brand（绿）
- 布局：Grid 优先，token 化间距/圆角
- 字号：流式 clamp()，var() 引用字体栈
- 状态：7 种（默认/hover/展开/加载中/失败/空态/禁用）

### 数据流
- worker.ts → TraceRecorder → GenerationTrace → IndexedDB → .aitrace
- 真实数据原则：不伪造、不估算、不编造

### 存储策略
- localStorage：会话历史、用户设置、Web Vitals
- IndexedDB：实验存档（MAX_EXPERIMENTS=200）
- CacheStorage：模型文件、Service Worker 缓存

### 测试策略
- vitest：单元测试和组件测试
- Playwright：E2E 测试和视觉回归
- 覆盖率：约 40% 源文件（持续提升中）

---

**快速跳转**：
- 完整已完成任务列表：[COMPLETED_TASKS.md](./COMPLETED_TASKS.md)
- 当前开发计划：[../TASKS.md](../TASKS.md)
- 设计规范：[合规速查表.md](./合规速查表.md)
