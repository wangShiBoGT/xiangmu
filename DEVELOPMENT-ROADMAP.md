# WebGPU LLM Chat - 开发路线图

> **版本**: v1.0 (2026-08-04)  
> **状态**: 基于 Langfuse、Impeccable、OpenLLMetry 等开源项目最佳实践制定  
> **权威级别**: 低于 AI_DESIGN_CONSTITUTION.md，高于具体实现代码

---

## 项目定位与愿景

### 当前状态
纯前端 WebGPU 大模型推理工具，支持本地运行 DeepSeek-R1-Distill-Qwen-1.5B，零后端、零 API Key，数据不出设备。

### 目标演进
**从"聊天工具"到"AI 运行观测台 (AI Microscope)"**

参考项目定位：
- **Langfuse** 定位：LLM Engineering Platform (observability + evaluation + prompt management)
- **Phoenix (Arize)** 定位：AI Observability & Evaluation
- **本项目定位**：Browser-Native AI Microscope (客户端 AI 运行时的科学仪器)

### 核心差异化
1. **纯客户端架构** - 无需后端，所有计算在浏览器完成
2. **WebGPU 原生** - 直接利用本地 GPU，不依赖云服务
3. **科学仪器范式** - 像 Chrome DevTools/Figma 一样的专业工具，而非聊天应用
4. **实时可视化** - 思考过程、token 生成、性能指标的即时展现

---

## 一、架构演进计划

### 阶段 1: 基础设施完善 (P0 - 当前)

#### 1.1 统一图标系统 ✅
**状态**: 已完成
- 所有图标遵循 24 viewBox / 1.5px stroke / round cap+join 规范
- 新增思考呼吸动画 (IconThinking)
- 后续添加图标参考 icons.tsx 统一风格

**借鉴**: Impeccable 的设计系统一致性原则

#### 1.2 活动卡片系统 ✅
**状态**: 已实现基础组件
- ActivityCard 组件支持多种类型 (thinking/command/file-read/file-write/result)
- 可折叠、带时间戳、状态图标、进度条
- 待集成到实际对话流程

**借鉴**: Devin 的结构化活动展示、Langfuse 的 trace → span → generation 层级

#### 1.3 AI Nexus 面板升级 ✅
**状态**: 已完成
- 现代化玻璃态设计
- 指标卡片化展示
- 实时性能监控
- 状态光晕效果

**待优化**:
- 添加历史性能曲线图 (参考 OpenObserve 的时间序列可视化)
- GPU 利用率实时图表
- 内存占用趋势

#### 1.4 实时推理段显示 ✅
**状态**: 已完成
- 使用 ActivityCard 展示思考过程
- 运行中自动展开，实时流式显示
- 完成后自动折叠，显示用时

---

### 阶段 2: 可观测性核心 (P1 - 2-3 周)

#### 2.1 Token 级别追踪系统

**目标**: 实现类似 Langfuse 的 trace → span → generation 结构

**实现要点**:
```typescript
interface TokenTrace {
  traceId: string;           // 整个对话的追踪 ID
  spanId: string;            // 当前生成任务的 span
  timestamp: number;         // token 生成时间戳
  token: string;             // token 内容
  logprob?: number;          // log 概率 (如果模型支持)
  latency: number;           // 生成延迟 (ms)
  metadata: {
    position: number;        // token 位置
    isThinking: boolean;     // 是否在思考段
    累积tokens: number;      // 累积 token 数
  };
}
```

**存储策略**:
- IndexedDB 存储完整 trace (参考 Langfuse 的 ClickHouse 持久化思路)
- 内存缓存当前会话的 trace
- 支持导出为 JSON (符合 OpenTelemetry 标准)

**借鉴**:
- **Langfuse**: trace/span/generation 三层结构
- **OpenLLMetry**: OpenTelemetry 标准化 span
- **Phoenix**: token-level observability

#### 2.2 性能指标采集

**核心指标** (参考 Langfuse Metrics):
- Time to First Token (TTFT)
- Tokens per Second (TPS)
- Total Latency
- Token Count (input/output)
- Cost (虽然本地免费，但可显示"等价云端成本")

**GPU 指标** (WebGPU 特有):
- GPU 利用率
- 显存占用
- 计算单元占用率
- 批处理效率

**实现**:
```typescript
interface PerformanceMetrics {
  session: {
    ttft: number;              // ms
    tps: number;               // tokens/s
    totalLatency: number;      // ms
    totalTokens: number;
  };
  gpu: {
    utilization: number;       // 0-100%
    memoryUsed: number;        // MB
    memoryTotal: number;       // MB
    computeUnits: number;
  };
  system: {
    cpuUsage: number;          // %
    ramUsage: number;          // MB
  };
}
```

#### 2.3 思考链可视化增强

**当前状态**: 简单的文本展示
**目标**: 结构化思考树

**参考设计**:
- **Devin**: 思考 → 操作 → 结果的时间线
- **思考链论文**: Chain-of-Thought 的可视化最佳实践

**实现**:
```typescript
interface ThinkingNode {
  id: string;
  type: 'analysis' | 'planning' | 'reasoning' | 'conclusion';
  content: string;
  timestamp: number;
  children: ThinkingNode[];
  confidence?: number;       // 推理置信度
  alternatives?: string[];   // 考虑过的其他路径
}
```

**UI 展示**:
- 树状图展示思考结构
- 可折叠的思考分支
- 高亮当前思考路径
- 显示被放弃的思考路径（"Roads Not Taken"概念）

---

### 阶段 3: 交互体验升级 (P2 - 3-4 周)

#### 3.1 Agent 活动时间线

**参考**: Devin 的命令执行卡片、Langfuse 的 trace timeline

**设计要点**:
1. **时间线结构**
   - 用户输入 → AI 思考 → 生成回答 → 完成
   - 每个阶段显示用时和状态
   - 可点击展开查看详情

2. **活动类型**
   ```typescript
   type ActivityType = 
     | 'user-input'      // 用户输入
     | 'thinking'        // 思考过程
     | 'generating'      // 生成回答
     | 'tool-call'       // 工具调用 (未来扩展)
     | 'error'           // 错误状态
     | 'completed';      // 完成
   ```

3. **卡片内容**
   - 思考卡片：显示思考内容 + 用时
   - 生成卡片：显示生成速度曲线
   - 错误卡片：显示错误信息 + 重试按钮

**实现优先级**: P2 (依赖 Token 追踪系统)

#### 3.2 实时性能图表

**目标**: 在对话过程中实时显示性能曲线

**图表类型**:
1. **Token 生成速度曲线** (折线图)
   - X 轴：时间
   - Y 轴：tokens/s
   - 实时更新

2. **GPU 利用率曲线** (面积图)
   - 显示 GPU 占用率变化
   - 标记高负载区域

3. **延迟分布** (直方图)
   - 显示每个 token 的生成延迟
   - 识别异常延迟点

**技术选型**:
- 考虑使用轻量级图表库 (如 uPlot, 参考 OpenObserve)
- 或使用 Canvas 自绘 (更轻量，性能更好)

#### 3.3 多会话对比

**参考**: Langfuse 的 dataset + benchmark 功能

**功能**:
- 并排对比两个会话的回答
- 对比性能指标
- 对比思考路径

**UI 设计**:
```
┌─────────────┬─────────────┐
│  会话 A     │  会话 B     │
├─────────────┼─────────────┤
│  思考 10s   │  思考 5s    │
│  回答内容   │  回答内容   │
│  TPS: 12.3  │  TPS: 15.8  │
└─────────────┴─────────────┘
```

---

### 阶段 4: 高级功能 (P3 - 4-6 周)

#### 4.1 Prompt 版本管理

**参考**: Langfuse Prompt Management

**功能**:
- 保存常用 prompt 模板
- 版本控制 (v1, v2, v3...)
- A/B 测试不同 prompt
- 统计哪个 prompt 效果最好

**数据结构**:
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  version: number;
  tags: string[];
  stats: {
    使用次数: number;
    平均用时: number;
    平均token数: number;
    用户评分: number;  // 1-5 星
  };
  createdAt: number;
  updatedAt: number;
}
```

#### 4.2 评估系统

**参考**: Langfuse Evaluations, Phoenix Evals

**评估维度**:
1. **自动评估**
   - 回答长度是否合适
   - 是否包含思考链
   - 生成速度是否达标
   - 是否出现重复内容

2. **用户反馈**
   - 👍👎 点赞/点踩
   - 五星评分
   - 具体反馈文本

3. **对比评估**
   - 同一问题的不同回答对比
   - 不同模型参数的效果对比

**实现**:
```typescript
interface Evaluation {
  sessionId: string;
  messageId: string;
  type: 'auto' | 'user' | 'comparative';
  metrics: {
    relevance?: number;      // 0-1
    coherence?: number;      // 0-1
    speed?: 'fast' | 'normal' | 'slow';
  };
  userFeedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  };
  timestamp: number;
}
```

#### 4.3 数据集管理

**参考**: Langfuse Datasets

**功能**:
- 创建测试数据集
- 批量运行测试
- 对比不同参数配置的效果

**使用场景**:
- 回归测试：确保新版本没有降低质量
- 参数调优：找到最佳 temperature/top-p
- 模型对比：对比不同模型的效果

---

### 阶段 5: 开发者工具 (P4 - 长期)

#### 5.1 Debug 工具

**参考**: Chrome DevTools

**功能**:
1. **Token Inspector**
   - 查看每个 token 的详细信息
   - logprob 分布
   - 采样过程可视化

2. **Performance Profiler**
   - 火焰图展示推理耗时
   - 识别性能瓶颈
   - GPU kernel 执行时间

3. **Memory Inspector**
   - 显存占用详情
   - 内存泄漏检测
   - 缓存命中率

#### 5.2 导出与分享

**功能**:
- 导出完整 trace 为 JSON
- 生成性能报告 (Markdown/PDF)
- 分享会话链接 (本地加密存储)

**格式标准**:
- 兼容 OpenTelemetry trace 格式
- 可导入 Langfuse/Phoenix 等平台

---

## 二、技术债务清理

### 2.1 组件重构

**当前问题**:
- 部分组件职责不清晰
- props 传递层级过深
- 状态管理分散

**重构计划**:
1. **状态管理升级**
   - 考虑引入 Zustand (轻量级状态管理)
   - 集中管理 session/trace/metrics 状态

2. **组件库整理**
   - 建立 components/ui/ 基础组件库
   - components/features/ 业务组件
   - components/layouts/ 布局组件

**参考**: Impeccable 的设计系统分层

### 2.2 性能优化

**优化点**:
1. **渲染优化**
   - 使用 React.memo 避免不必要的重渲染
   - 虚拟滚动处理长对话历史
   - 代码分割 (lazy load 非核心功能)

2. **Worker 优化**
   - 减少 main thread 与 worker 通信频率
   - 批量传输 token (而非逐个)
   - SharedArrayBuffer 优化大数据传输

3. **存储优化**
   - IndexedDB 分批写入
   - 压缩历史 trace 数据
   - 定期清理过期数据

### 2.3 测试覆盖

**当前**: 28 项单元测试

**目标**: 提升到 80%+ 覆盖率

**测试策略**:
1. **单元测试**
   - 所有工具函数 100% 覆盖
   - 组件逻辑测试

2. **集成测试**
   - 完整对话流程测试
   - Worker 通信测试
   - 存储持久化测试

3. **E2E 测试**
   - 关键用户路径
   - 性能回归测试

**参考**: Langfuse 的测试策略 (vitest workspace)

---

## 三、文档体系建设

### 3.1 用户文档

**参考**: Langfuse 的文档结构

1. **快速开始** ✅
   - 5 分钟上手指南
   - 常见问题 FAQ

2. **功能文档** (待补充)
   - 每个功能的详细说明
   - 使用场景和最佳实践
   - 截图和视频演示

3. **性能优化指南** (新增)
   - GPU 选择建议
   - 浏览器配置优化
   - 模型参数调优

### 3.2 开发者文档

**当前**: 基础架构说明

**待补充**:
1. **贡献指南**
   - 如何提 issue
   - 如何提交 PR
   - 代码规范

2. **架构文档**
   - 整体架构图
   - 数据流向
   - 关键模块说明

3. **API 文档**
   - Worker API
   - 组件 API
   - 工具函数 API

### 3.3 设计文档

**当前**: AI_DESIGN_CONSTITUTION.md ✅

**待补充**:
- 设计决策记录 (ADR - Architecture Decision Records)
- 组件设计规范详细说明
- 可访问性指南

**参考**: Impeccable 的 DESIGN.md + PRODUCT.md 模式

---

## 四、社区与生态

### 4.1 开源策略

**当前**: MIT 许可证 ✅

**未来考虑**:
- 是否需要企业版功能 (参考 Langfuse 的 ee/ 目录)
- 插件系统设计
- 第三方集成支持

### 4.2 集成生态

**可能的集成方向**:
1. **模型支持**
   - 更多 WebGPU 优化模型
   - 动态模型切换
   - 模型下载管理器

2. **工具集成**
   - 代码解释器
   - 文件分析器
   - 网页搜索 (可选)

3. **导出集成**
   - 导出到 Langfuse
   - 导出到 Phoenix
   - 导出到 OpenTelemetry 收集器

### 4.3 社区建设

**渠道**:
- GitHub Discussions
- Discord/Slack 社区
- 定期 Changelog

**内容**:
- 使用案例分享
- 性能对比测试
- 最佳实践总结

---

## 五、开发工作流

### 5.1 版本管理

**策略**: 语义化版本 (Semantic Versioning)

```
v0.x.x - 当前阶段，快速迭代
v1.0.0 - 第一个稳定版本，基础功能完整
v1.x.x - 功能增强
v2.0.0 - 重大架构升级
```

**发布节奏**:
- 每 2-3 周一个小版本
- 每 3 个月一个大版本
- 热修复随时发布

### 5.2 Issue 管理

**参考**: Langfuse 的分类体系

**标签系统**:
- `bug` - 错误修复
- `feature` - 新功能
- `enhancement` - 功能增强
- `performance` - 性能优化
- `docs` - 文档改进
- `design` - 设计改进
- `good-first-issue` - 新手友好

**优先级**:
- P0 - 阻塞性问题，立即修复
- P1 - 重要功能，本周内
- P2 - 一般功能，本月内
- P3 - 未来规划

### 5.3 代码审查

**检查项**:
1. ✅ `tsc -b` 通过
2. ✅ `npm run lint` 通过
3. ✅ `npm test` 全部通过
4. ✅ `npm run build` 成功
5. ✅ 符合设计宪法
6. ✅ 有对应的测试
7. ✅ 文档已更新

**参考**: Impeccable 的 hook 系统思路

---

## 六、里程碑与时间线

### Phase 1: 基础完善 (已完成)
- [x] 统一图标系统
- [x] AI Nexus 面板升级
- [x] 活动卡片组件
- [x] 推理段实时显示

### Phase 2: 可观测性核心 (2-3 周)
- [ ] Token 级别追踪系统
- [ ] 性能指标采集
- [ ] 思考链可视化增强
- [ ] IndexedDB 存储实现

### Phase 3: 交互升级 (3-4 周)
- [ ] Agent 活动时间线
- [ ] 实时性能图表
- [ ] 多会话对比
- [ ] 导出功能

### Phase 4: 高级功能 (4-6 周)
- [ ] Prompt 版本管理
- [ ] 评估系统
- [ ] 数据集管理
- [ ] Debug 工具

### Phase 5: 生态建设 (持续)
- [ ] 文档完善
- [ ] 社区建设
- [ ] 插件系统
- [ ] 第三方集成

---

## 七、成功指标

### 用户体验指标
- **首次加载时间** < 10s
- **Token 生成延迟** < 100ms/token (GPU)
- **界面响应时间** < 16ms (60fps)
- **内存占用** < 2GB (含模型)

### 开发质量指标
- **测试覆盖率** > 80%
- **TypeScript 严格模式** 100%
- **Zero Lint 警告**
- **Bundle 大小** < 500KB (不含模型)

### 社区指标
- **GitHub Stars** > 1000
- **Weekly Active Users** > 100
- **文档完整度** > 90%
- **Issue 响应时间** < 24h

---

## 八、风险与应对

### 技术风险
1. **WebGPU 兼容性**
   - 风险：浏览器支持不完整
   - 应对：完善 WASM 降级方案

2. **性能瓶颈**
   - 风险：大模型推理速度慢
   - 应对：持续优化、提供性能分析工具

3. **浏览器限制**
   - 风险：内存/存储限制
   - 应对：分批加载、压缩存储

### 产品风险
1. **用户定位不清**
   - 风险：既不像聊天工具，又不够专业
   - 应对：明确"科学仪器"定位，渐进式认知

2. **功能过载**
   - 风险：功能太多，用户学习成本高
   - 应对：分层设计，基础用户看到简单界面

---

## 九、参考资源

### 开源项目
- [Langfuse](https://github.com/langfuse/langfuse) - LLM Observability Platform
- [Impeccable](https://github.com/pbakaus/impeccable) - Design System for AI Agents
- [OpenLLMetry](https://github.com/traceloop/openllmetry) - OpenTelemetry for LLM
- [Phoenix (Arize)](https://github.com/Arize-ai/phoenix) - AI Observability
- [OpenObserve](https://github.com/openobserve/openobserve) - Observability Platform

### 设计参考
- [Devin AI](https://devin.ai) - Agent UX Patterns
- [AI Agent UX Guide](https://hatchworks.com/blog/ai-agents/agent-ux-patterns/)
- [AI Chatbot UI Design](https://www.lazarev.agency/articles/ai-chatbot-ui-design)

### 技术标准
- [OpenTelemetry](https://opentelemetry.io/) - Observability Standard
- [WebGPU Spec](https://www.w3.org/TR/webgpu/) - GPU API Standard
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility Standard

---

## 附录：开发检查清单

### 每次开发前
- [ ] 已读 AI_DESIGN_CONSTITUTION.md
- [ ] 已确认任务不违反十条原则
- [ ] 已检查是否有现有组件可复用
- [ ] 已规划好数据结构

### 开发过程中
- [ ] 遵循单文件 ≤500 行原则
- [ ] 不伪造数据，所有可视化来自真实数据
- [ ] 新组件符合设计系统规范
- [ ] 及时编写测试

### 提交前
- [ ] `tsc -b` 零错误
- [ ] `npm run lint` 零警告
- [ ] `npx vitest run` 全部通过
- [ ] `npm run build` 构建成功
- [ ] 浏览器实测验证
- [ ] 更新相关文档

---

**最后更新**: 2026-08-04  
**下一次审查**: 完成 Phase 2 后
