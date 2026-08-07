# 后端 API 接口规范

> 版本：v1.0  
> 日期：2026-08-06  
> 状态：待开发

---

## 📋 概述

本文档定义前端与后端的完整接口契约。后端开发完成后，前端只需修改环境变量即可接入。

**开发模式**：
- 环境变量 `VITE_USE_BACKEND=false`（默认）
- 前端使用本地 Mock 数据和本地计算
- 所有审计功能在浏览器中运行

**生产模式**：
- 环境变量 `VITE_USE_BACKEND=true`
- 前端调用后端 API
- 计算密集型任务在后端完成

---

## 🔧 环境变量

### `.env.development`（开发环境）
```bash
# 使用本地 Mock，不调用后端
VITE_USE_BACKEND=false
```

### `.env.production`（生产环境）
```bash
# 调用后端 API
VITE_USE_BACKEND=true
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## 📡 接口清单

### 1. API 代理接口

**用途**：代理用户的 OpenAI/Anthropic API 请求，获取 logprobs 并转换为 .aitrace 格式

**端点**：`POST /api/proxy`

**请求体**：
```typescript
{
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;  // 前端 AES 加密后传输
  model: string;   // 例如 "gpt-4", "claude-3-5-sonnet-20241022"
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  enableLogprobs: true;  // 必须为 true
}
```

**响应**：
```typescript
{
  success: true;
  data: {
    trace: GenerationTrace;  // .aitrace 格式
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cost: {
      input: number;   // 美元
      output: number;
      total: number;
    };
  }
}
```

**错误响应**：
```typescript
{
  success: false;
  error: {
    code: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'INTERNAL_ERROR';
    message: string;
    details?: any;
  }
}
```

**前端调用位置**：
- 文件：`src/lib/apiClient.ts`
- 函数：`proxyGeneration()`
- 触发时机：用户选择 API 模式生成时

**安全要求**：
- 后端不存储用户 API key
- API key 仅在内存中解密，单次请求后销毁
- 使用 HMAC 签名防重放攻击

---

### 2. 文档解析接口

**用途**：解析上传的 PDF/TXT 文件，提取文本并生成 embedding

**端点**：`POST /api/parse-document`

**请求体**：
```typescript
{
  file: string;      // Base64 编码的文件内容
  filename: string;  // 原始文件名
  options?: {
    maxPages?: number;          // 最大解析页数（默认 50）
    enableEmbedding?: boolean;  // 是否生成 embedding（默认 true）
  };
}
```

**响应**：
```typescript
{
  success: true;
  data: {
    document: ParsedDocument;  // 包含 pages 数组和 metadata
    embeddings: Array<{
      pageNumber: number;
      embedding: number[];  // 384 维向量
    }>;
    cost: {
      parsing: number;   // 解析成本
      embedding: number; // embedding 成本
      total: number;
    };
  }
}
```

**前端调用位置**：
- 文件：`src/lib/apiClient.ts`
- 函数：`parseDocumentAPI()`
- 触发时机：用户上传文档时（API 模式）

**注意事项**：
- 开发模式使用前端本地解析（`src/lib/documents.ts`）
- 生产模式调用后端 API
- 前端代码已准备好两种路径切换

---

### 3. 审计分析接口

**用途**：幻觉检测、主张提取、语义一致性分析、来源追溯

**端点**：`POST /api/audit`

**请求体**：
```typescript
{
  traces: GenerationTrace[];  // 1-5 次运行的 trace
  documents?: ParsedDocument[];  // 可选：参考文档
  options?: {
    enableClaimExtraction?: boolean;      // 是否提取主张（默认 true）
    enableSourceTracing?: boolean;        // 是否追溯来源（默认 true）
    enableSemanticConsistency?: boolean;  // 是否检测一致性（默认 true）
    similarityThreshold?: number;         // 相似度阈值（默认 0.7）
  };
}
```

**响应**：
```typescript
{
  success: true;
  data: {
    audit: UsabilityAudit;  // 可用性审计结果
    claims: AtomicClaimWithSource[];  // 提取的主张（带来源标注）
    semanticConsistency: SemanticConsistencyResult;  // 一致性分析
    cost: {
      claimExtraction: number;
      embedding: number;
      total: number;
    };
  }
}
```

**AtomicClaimWithSource 定义**：
```typescript
interface AtomicClaimWithSource {
  id: string;
  text: string;
  startToken: number;
  endToken: number;
  category: "fact" | "opinion" | "citation" | "number" | "date";
  runId: number;
  source?: {
    docName: string;
    pageNumber: number;
    excerpt: string;        // 来源段落摘录（前 200 字）
    similarity: number;     // 相似度 0-1
    charStart: number;      // 在文档中的字符偏移
    charEnd: number;
  };
}
```

**前端调用位置**：
- 文件：`src/lib/apiClient.ts`
- 函数：`auditTracesAPI()`
- 触发时机：
  - 用户点击"查看审计报告"
  - 生成完成后自动触发（如果启用自动审计）

**前端展示位置**：
- 文件：`src/components/AuditReport.tsx`
- 显示内容：
  - 可用性审计摘要
  - 主张列表（每条显示来源页码）
  - 语义一致性分析
  - 导出功能（JSON/Markdown）

**注意事项**：
- 开发模式使用本地审计（`src/lib/usabilityAudit.ts` + `src/lib/semanticConsistency.ts`）
- 来源追溯使用 `src/lib/sourceTracing.ts`
- 生产模式调用后端 API
- 后端应使用更强的模型（GPT-4-mini）做主张提取

---

### 4. 配额查询接口

**用途**：查询用户的 API 使用配额和费用

**端点**：`GET /api/quota`

**请求头**：
```
Authorization: Bearer <user-token>
```

**响应**：
```typescript
{
  success: true;
  data: {
    userId: string;
    quota: {
      daily: {
        limit: number;      // 每日限额（次数）
        used: number;       // 已使用
        remaining: number;  // 剩余
        resetAt: string;    // 重置时间（ISO 8601）
      };
      cost: {
        total: number;       // 总花费（美元）
        thisMonth: number;   // 本月花费
      };
    };
  }
}
```

**前端调用位置**：
- 文件：`src/lib/apiClient.ts`
- 函数：`getQuota()`
- 触发时机：
  - 页面加载时
  - 每次 API 调用后

**前端展示位置**：
- 设置页面：显示配额和费用
- 生成按钮旁：显示剩余次数

---

## 🔒 安全设计

### API Key 加密传输

**前端**：
```typescript
import CryptoJS from 'crypto-js';

// 用户输入 API key 后，前端 AES 加密
const encryptedKey = CryptoJS.AES.encrypt(
  apiKey,
  'your-encryption-secret'
).toString();

// 传输给后端
await proxyGeneration({
  apiKey: encryptedKey,
  // ...
});
```

**后端**：
```typescript
// 后端解密（仅在内存中，单次请求后销毁）
const decryptedKey = CryptoJS.AES.decrypt(
  encryptedKey,
  'your-encryption-secret'
).toString(CryptoJS.enc.Utf8);

// 使用后立即清除
// ...
decryptedKey = null;
```

### HMAC 签名防重放攻击

**前端**：
```typescript
const timestamp = Date.now();
const signature = CryptoJS.HmacSHA256(
  `${timestamp}:${JSON.stringify(requestBody)}`,
  'your-hmac-secret'
).toString();

headers: {
  'X-Timestamp': timestamp,
  'X-Signature': signature,
}
```

**后端**：
```typescript
// 验证时间戳（5 分钟内有效）
if (Date.now() - timestamp > 5 * 60 * 1000) {
  return { success: false, error: { code: 'EXPIRED', message: 'Request expired' } };
}

// 验证签名
const expectedSignature = HmacSHA256(`${timestamp}:${requestBody}`, secret);
if (signature !== expectedSignature) {
  return { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } };
}
```

### 零知识设计

**不存储的数据**：
- 用户 API key（只在内存中短暂存在）
- 用户对话内容（不持久化）
- 用户上传的文档内容（解析后立即删除）

**可以缓存的数据**（7 天 TTL）：
- GenerationTrace（.aitrace 格式）
- 审计结果（UsabilityAudit + SemanticConsistencyResult）
- 文档 embedding（减少重复计算）

**存储方案**：
- Cloudflare KV：缓存数据（7 天 TTL）
- Cloudflare D1：用户配额管理（SQLite）

---

## 💰 成本估算

### Cloudflare Workers
- **免费额度**：10 万次请求/天
- **超出后**：$0.50/百万次请求

### OpenAI API（后端使用）
- **Embedding API**：$0.0001/1K tokens
- **GPT-4-mini（主张提取）**：$0.15/1M input tokens

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

## 📝 前端接入清单

### 已完成 ✅
1. [x] API Client 实现（`src/lib/apiClient.ts`）
2. [x] 环境变量切换逻辑
3. [x] Mock 数据策略
4. [x] 类型定义完整
5. [x] AuditReport 组件支持 documents 参数
6. [x] 来源追溯逻辑（`src/lib/sourceTracing.ts`）

### 待后端完成后接入 🔜
1. [ ] 修改 `.env.production`：`VITE_USE_BACKEND=true`
2. [ ] 配置 `VITE_API_BASE_URL`
3. [ ] 测试 API 代理功能
4. [ ] 测试文档解析功能
5. [ ] 测试审计分析功能
6. [ ] 测试配额查询功能
7. [ ] 错误处理和重试逻辑
8. [ ] 性能监控和日志上报

---

## 🧪 测试策略

### 前端测试（当前）
- 使用 Mock 数据测试所有功能
- 验证 UI 组件正确渲染
- 验证来源追溯逻辑正确

### 后端测试（待开发）
- API 端点单元测试
- 集成测试（前后端联调）
- 压力测试（模拟 100 并发用户）
- 成本监控测试

### 端到端测试
1. 用户上传 PDF
2. 用户输入问题
3. 调用 API 生成回答
4. 查看审计报告
5. 验证来源页码正确
6. 导出报告

---

## 🚀 部署流程

### 前端部署
1. 构建生产版本：`npm run build`
2. 配置环境变量：`VITE_USE_BACKEND=true`
3. 部署到 GitHub Pages / Vercel

### 后端部署
1. Cloudflare Workers 项目初始化
2. 配置 KV 存储
3. 配置 D1 数据库
4. 部署到边缘节点
5. 配置自定义域名

### 联调验证
1. 前端切换到生产模式
2. 测试所有 API 端点
3. 监控错误日志
4. 验证成本符合预期

---

## 📞 联系方式

**前端负责人**：[你的名字]  
**后端负责人**：[待定]

**前端代码仓库**：[GitHub 链接]  
**后端代码仓库**：[待创建]

---

**文档版本**：v1.0  
**最后更新**：2026-08-06  
**下次审查**：后端开发启动时
