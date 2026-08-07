# 任务看板统一方案

> 日期：2026-08-06  
> 目标：统一 TASKS.md 和 BLOCKING_ISSUES.md，明确前后端边界

---

## 🎯 核心决策：后端优先策略

### 战略调整原因

1. **计算密集型任务应该在后端**
   - RAG 检索、主张提取、embedding 计算
   - 前端 WebGPU 模型太小，检索质量不够
   - 后端可以用更强的模型（GPT-4、Claude）

2. **避免重复开发**
   - 前端已实现的审计功能（usabilityAudit.ts、semanticConsistency.ts）是原型
   - 后端重写，提供完整的审计 API
   - 前端简化为"调用 API + 展示结果"

3. **用户体验优化**
   - 后端处理更快（服务器性能 > 浏览器）
   - 支持更大的文档（不受浏览器内存限制）
   - 可以缓存结果（7 天 TTL）

---

## 📋 统一后的任务优先级

### 立即启动（Week 11-12）

#### Task 2.2：后端架构设计与实现
**优先级**：🔥 极高 | **预计工期**：5-7 天

**Phase 1: 架构设计（2 天）**
- [ ] 撰写 `docs/API_BRIDGE_DESIGN.md`
- [ ] 明确前后端接口契约
- [ ] 技术栈选型确认
- [ ] 成本估算

**Phase 2: 后端核心功能（3-5 天）**
- [ ] Cloudflare Workers 项目初始化
- [ ] API 代理端点：`/api/proxy`（代理 OpenAI/Anthropic）
- [ ] logprobs 规范化：返回 `.aitrace` 格式
- [ ] 审计分析端点：`/api/audit`

**Phase 3: 前端集成（1 天）**
- [ ] 前端调用后端 API
- [ ] AuditReport 展示后端返回的审计结果
- [ ] 错误处理与重试逻辑

---

### 后端功能清单（明确边界）

#### 后端负责（新开发）

1. **API 代理与 logprobs 获取**
   ```
   POST /api/proxy
   Body: { provider: "openai", apiKey: "encrypted", prompt: "..." }
   Response: { trace: GenerationTrace }
   ```

2. **文档解析与 RAG**（从前端迁移）
   ```
   POST /api/parse-document
   Body: { file: base64, filename: "xxx.pdf" }
   Response: { 
     pages: DocumentPage[], 
     embeddings: Float32Array[] 
   }
   ```

3. **幻觉检测与审计分析**（从前端迁移）
   ```
   POST /api/audit
   Body: { 
     traces: GenerationTrace[], 
     documents?: ParsedDocument[] 
   }
   Response: {
     audit: UsabilityAudit,
     claims: AtomicClaimWithSource[],
     semanticConsistency: SemanticConsistencyResult
   }
   ```

4. **零知识设计**
   - 后端不存 API key、不存对话内容
   - 只缓存 logprobs 和审计结果（CF KV，7 天 TTL）
   - 用户可删除自己的缓存数据

#### 前端负责（简化）

1. **用户交互**
   - 上传文档
   - 输入问题
   - 管理 API key（加密存 localStorage）

2. **调用后端 API**
   - 封装 API 客户端（`src/lib/apiClient.ts`）
   - 错误处理与重试
   - 费用限额检查

3. **展示审计结果**
   - `AuditReport` 组件（已有）
   - `TokenText` 熵值可视化（已有）
   - `CompareView` 对比视图（已有）

4. **本地模型支持**（保留）
   - WebGPU 本地推理（已有）
   - 本地模型的审计功能继续用前端 `usabilityAudit.ts`

---

### 前端功能冻结列表

以下前端功能暂停开发，等后端就绪后再决定：

- ❌ Task #19：测试覆盖和样式修复（P1-7）→ 后端实现后再补充测试
- ❌ Task #20：RAG 来源追溯 → 后端实现
- ❌ Task #21：端到端用户路径验证 → 后端实现后再测试
- ❌ 硬验收条件 1+2：来源可追溯 → 后端实现

**原因**：避免前端重复开发，后端一次性提供完整功能

---

## 🗺️ 更新后的技术路线图

### 阶段 1A：前端原型（已完成）✅
- Week 1-10：核心审计功能 + P0 问题修复
- **输出**：可用的前端原型，证明技术可行性

### 阶段 1B：后端开发（当前）🚧
- Week 11-14：后端架构设计 + 核心 API 实现
- Week 15-16：前后端联调 + 端到端测试
- **输出**：生产级后端 API，支持 OpenAI/Anthropic

### 阶段 2：开放标准推广（Q2 2027）
- API 桥接完善（多 API 适配）
- .aitrace 标准推广
- 第三方工具对接

### 阶段 3：工作流集成（Q3 2027 - Q2 2028）
- 浏览器插件
- Jupyter/Notion/Zotero 集成

---

## 📊 成本估算（后端）

### Cloudflare Workers
- 免费额度：10 万次请求/天
- 超出后：$0.50/百万次请求

### OpenAI API（审计分析）
- Embedding API：$0.0001/1K tokens
- GPT-4-mini（主张提取）：$0.15/1M input tokens

### 单次审计成本
```
1 个 PDF (5 页) → 解析 + embedding：$0.001
5 次运行 → logprobs 获取：$0（用户自己的 API key）
主张提取 (GPT-4-mini)：$0.005
语义一致性检测：$0.002
---
总计：约 $0.01/次
```

### 月度成本估算
- 10 个日活用户，每人 3 次审计/天
- 月度请求：10 × 3 × 30 = 900 次
- 月度成本：900 × $0.01 = **$9/月**

到 100 个日活之前，成本 < $100/月 ✅

---

## 🔧 技术栈确认

### 后端
- **运行环境**：Cloudflare Workers（边缘计算）
- **存储**：
  - CF KV：Trace 和审计结果缓存（7 天 TTL）
  - CF D1：用户配额管理（SQLite）
- **依赖**：
  - `pdf-parse`：PDF 解析
  - `openai`：OpenAI API 客户端
  - `@anthropic-ai/sdk`：Anthropic API 客户端
- **安全**：
  - 用户 API key AES 加密（前端）
  - HMAC 签名防重放攻击
  - CF WAF 限流（每 IP 10 次/分钟）

### 前端（保持不变）
- **框架**：React + TypeScript + Vite
- **本地模型**：WebGPU + Transformers.js
- **新增**：API 客户端（`src/lib/apiClient.ts`）

---

## 📝 下一步行动

### 立即（今天）
1. ✅ 统一任务看板（本文档）
2. 📋 开始撰写 `docs/API_BRIDGE_DESIGN.md`

### Week 11
1. 完成后端架构设计文档
2. Cloudflare Workers 项目初始化
3. 实现 `/api/proxy` 端点

### Week 12
1. 实现 `/api/audit` 端点
2. 迁移 `usabilityAudit.ts` 到后端
3. 前端集成测试

### Week 13-14
1. 实现 `/api/parse-document` 端点
2. RAG 来源追溯功能
3. 端到端测试

---

## 🗂️ 文档更新清单

- [x] `docs/NEXT_PHASE_TASKS.md` - 已创建（临时文档，可归档）
- [ ] `docs/API_BRIDGE_DESIGN.md` - 待创建（核心设计文档）
- [ ] `TASKS.md` - 需要更新（添加后端任务，标记前端冻结）
- [ ] `BLOCKING_ISSUES.md` - 可归档（P0 问题已全部完成）
- [ ] `README.md` - 需要更新（添加后端架构说明）

---

**统一完成时间**：2026-08-06 21:00  
**下一步**：开始撰写后端架构设计文档
