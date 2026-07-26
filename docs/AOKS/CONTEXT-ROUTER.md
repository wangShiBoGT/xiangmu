# AOKS · Context Router（上下文路由表）

> 先读 Kernel：`docs/合规速查表.md` + `docs/AODL/01-Cognitive-DNA.md` + `docs/AODL/02-Visual-DNA.md`。
> 接续、排期、问状态时加读 `docs/任务看板.md`。下表只列**额外**文件；未列文件一律不读。
>
> 路径以仓库根为准。`Design/Future/` 在仓库根，**不在** `docs/` 内。

## 1 · 按任务类型加载

| 任务 | 额外加载（按顺序） | 不自动加载 |
|---|---|---|
| 接续开发 / 查进度 / 排期 | `docs/任务看板.md` | 历史讨论、验收记录 |
| Bug / 类型 / 测试 / 构建 | `docs/任务看板.md` → 相关源码与测试 | 四卷、规划；除非问题涉及规范 |
| 视觉 / 组件外观 | `docs/E5-VolumeII-设计图谱.md` → `docs/E5-VolumeIII-交互圣经.md` → `docs/DS0-token对照表.md` → `docs/AOKS/DESIGN-REVIEW.md` | Vol IV、历史记录 |
| 交互 / Replay / Observe | `docs/E5-VolumeIII-交互圣经.md` → `docs/直通E5完整规划.md` 的对应锚点 → `docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md` | Vol IV、无关规划 |
| Motion / Three.js | `docs/E5-VolumeIII-交互圣经.md` §3 → `docs/DS0-token对照表.md` → `docs/AOKS/DESIGN-REVIEW.md` | 装饰性动效灵感、历史记录 |
| 文案 | `docs/E5-VolumeI-产品宪法.md` 第三章 → `docs/产品原则.md` | 全部规划 |
| 新模块 / 体验方案（未写代码） | `docs/E5-双轨开发计划.md` → `Design/Future/README.md` → `Design/Future/_模板-体验稿.md` → `docs/AOKS/PRODUCT-DELIVERY-WORKFLOW.md` | 验收记录 |
| Agent / 多模型 / Trace | `Design/Future/E4-Agent观察/体验稿.md` → `Design/Future/E4-Agent观察/Observation-Trace-v1.md` → `docs/直通E5完整规划.md` 对应锚点 | 假想演示数据、无关视觉稿 |
| 采样显微镜 | `docs/E5-VolumeIV-科学评测框架.md` → `Design/Future/E5-采样显微镜/体验稿.md` → 对应源码/测试 | 无关产品规划 |
| Benchmark | `docs/E5-VolumeIV-科学评测框架.md` → `Design/Future/D6-成绩单页/体验稿.md` | Vol II 细节、历史记录 |
| 权威冲突 / 文档治理 | `docs/AOKS/SOURCE-OF-TRUTH.md` → `docs/AOKS/DOCUMENT-LIFECYCLE.md` → `docs/AOKS/MIGRATION-MAP.md` | 先改事实源或批量搬文件 |

## 2 · 30 秒自检

1. 我属于哪一行？如果不属于，先写出任务边界，不扩大读取范围。
2. 我要改的是事实源、体验稿、任务状态，还是历史记录？角色不清时先查 `SOURCE-OF-TRUTH.md`。
3. UI 是否引入了一个没有 trace/测量来源的状态、关系或动画？是则停止并改为诚实缺席。
4. 是否能写明用户获得的理解？写不出就先做设计决策卡。
5. 任务完成时，是否需要更新 `docs/任务看板.md`、体验稿或测试？

## 3 · 规范住址速查

| 概念 | 唯一规范住址 |
|---|---|
| 世界观、P1–P24、词表、产品语法 | `docs/E5-VolumeI-产品宪法.md` |
| 认知语言与观察阶梯 | `docs/AODL/01-Cognitive-DNA.md` |
| 视觉性格、探索感、可观察不可装饰 | `docs/AODL/02-Visual-DNA.md` |
| 视觉哲学、排版、颜色、密度、图标哲学 | `docs/E5-VolumeII-设计图谱.md` |
| 交互、下潜、Replay、Motion、组件状态与 token | `docs/E5-VolumeIII-交互圣经.md` |
| 评测口径、来源分层与统计纪律 | `docs/E5-VolumeIV-科学评测框架.md` |
| 已实现设计 token 值 | `docs/DS0-token对照表.md` |
| 模块锚点 | `docs/直通E5完整规划.md` |
| 双轨、五闸与体验稿 | `docs/E5-双轨开发计划.md` + `Design/Future/` |
| 当前状态与下一步 | `docs/任务看板.md` |
| 权威/生命周期/交付流程 | `docs/AOKS/` |

冲突裁决见 `docs/AOKS/SOURCE-OF-TRUTH.md`。
