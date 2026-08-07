# 后端 API 接入完整手册

> 日期：2026-08-06  
> 目标：前端现在用 Mock 数据开发，后端开发完后直接替换调用  
> 原则：接口定义要准确，前端不需要改动代码

---

## 🎯 接口设计原则

1. **零知识设计**：后端不存 API key、不存对话内容
2. **幂等性**：相同输入返回相同结果（缓存 7 天）
3. **向后兼容**：新增字段不破坏旧版本
4. **错误统一**：所有错误返回统一格式

---

## 📡 接口清单（按优先级排序）

### Priority 1：核心审计功能 🔥

#### 1.1 API 代理 + logprobs 获取

**端点**：`POST /api/proxy`

**用途**：代理用户的 OpenAI/Anthropic API 请求，获取 logprobs 并转为 `.aitrace` 格式

**请求格式**：
```typescript
interface ProxyRequest {
  provider: "openai" | "anthropic" | "gemini";
  apiKey: string;  // 前端 AES 加密后传输
  model: string;   // 例如 "gpt-4", "claude-3-5-sonnet-20241022"
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  enableLogprobs: boolean;  // 必须为 true
}
```

**响应格式**：
```typescript
interface ProxyResponse {
  success: true;
  data: {
    trace: GenerationTrace;  // 标准 .aitrace 格式
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
  };
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: "INVALID_API_KEY" | "RATE_LIMIT" | "PROVIDER_ERROR" | "INTERNAL_ERROR";
    message: string;
    details?: any;
  };
}
```

**前端调用位置**：
- `src/lib/apiClient.ts` → `proxyGeneration()`（新建文件）
- `src/pages/ObservePage.tsx` → 用户点击"使用 API 模型"按钮时调用

**Mock 策略**：
```typescript
// src/lib/apiClient.mock.ts
export async function proxyGeneration(req: ProxyRequest): Promise<ProxyResponse> {
  // 模拟 2 秒延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 返回假数据（从本地模型的 trace 复制一份）
  return {
    success: true,
    data: {
      trace: mockGenerationTrace,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: { input: 0.0001, output: 0.00015, total: 0.00025 }
    }
  };
}
```

**接入检查清单**：
- [ ] 后端实现 `/api/proxy` 端点
- [ ] 前端替换 `apiClient.mock.ts` 为 `apiClient.ts`
- [ ] 测试 OpenAI API 调用
- [ ] 测试 Anthropic API 调用
- [ ] 测试错误处理（无效 API key、超额等）

---

#### 1.2 文档解析 + Embedding

**端点**：`POST /api/parse-document`

**用途**：上传 PDF/DOCX/TXT，后端解析并生成 embedding

**请求格式**：
```typescript
interface ParseDocumentRequest {
  file: string;      // Base64 编码的文件内容
  filename: string;  // 例如 "paper.pdf"
  options?: {
    maxPages?: number;     // 最多解析多少页（默认 50）
    enableEmbedding?: boolean;  // 是否生成 embedding（默认 true）
  };
}
```

**响应格式**：
```typescript
interface ParseDocumentResponse {
  success: true;
  data: {
    document: ParsedDocument;  // 标准 ParsedDocument 接口
    embeddings: Array<{
      pageNumber: number;
      embedding: number[];  // 768 维向量（OpenAI text-embedding-3-small）
    }>;
    cost: {
      parsing: number;   // 解析成本（通常为 0）
      embedding: number; // Embedding API 成本
      total: number;
    };
  };
}
```

**前端调用位置**：
- `src/lib/apiClient.ts` → `parseDocument()`（新建）
- `src/pages/ObservePage.tsx` → 用户上传文件时调用
- 现有逻辑：`src/lib/documents.ts` → `parseDocument()`（本地解析，保留作为备用）

**Mock 策略**：
```typescript
// 前端继续用现有的本地解析
// 后端就绪后，添加一个开关：useBackendParsing
export async function parseDocument(file: File, useBackend = false): Promise<ParsedDocument> {
  if (!useBackend) {
    // 使用现有的本地解析逻辑
    return parseDocumentLocal(file);
  }
  
  // 调用后端 API
  const base64 = await fileToBase64(file);
  const response = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: base64, filename: file.name })
  });
  
  return (await response.json()).data.document;
}
```

**接入检查清单**：
- [ ] 后端实现 `/api/parse-document` 端点
- [ ] 支持 PDF、DOCX、TXT 格式
- [ ] 生成 OpenAI embedding
- [ ] 前端添加 `useBackendParsing` 开关
- [ ] 测试大文件（50 页 PDF）

---

#### 1.3 幻觉检测与审计分析

**端点**：`POST /api/audit`

**用途**：对多次运行的 trace 进行幻觉检测、主张提取、语义一致性分析

**请求格式**：
```typescript
interface AuditRequest {
  traces: GenerationTrace[];  // 同一问题的多次运行
  documents?: ParsedDocument[];  // 用户上传的文档（用于来源追溯）
  options?: {
    enableClaimExtraction?: boolean;  // 是否提取主张（默认 true）
    enableSourceTracing?: boolean;    // 是否追溯来源（默认 true）
    enableSemanticConsistency?: boolean;  // 是否语义一致性检测（默认 true）
    similarityThreshold?: number;     // 来源相似度阈值（默认 0.7）
  };
}
```

**响应格式**：
```typescript
interface AuditResponse {
  success: true;
  data: {
    audit: UsabilityAudit;  // 可用性审计结果
    claims: Array<AtomicClaimWithSource>;  // 主张 + 来源
    semanticConsistency: SemanticConsistencyResult;  // 语义一致性
    cost: {
      claimExtraction: number;  // GPT-4-mini 成本
      embedding: number;        // Embedding 成本
      total: number;
    };
  };
}

interface AtomicClaimWithSource extends AtomicClaim {
  source?: {
    docName: string;
    pageNumber: number;
    excerpt: string;  // 原文摘录（前 200 字）
    similarity: number;  // 余弦相似度
  };
}
```

**前端调用位置**：
- `src/lib/apiClient.ts` → `auditTraces()`（新建）
- `src/pages/ObservePage.tsx` → 用户点击"查看审计报告"时调用
- 现有逻辑：`src/lib/usabilityAudit.ts` + `src/lib/semanticConsistency.ts`（本地分析，保留作为备用）

**Mock 策略**：
```typescript
// 前端继续用现有的本地审计逻辑
// 后端就绪后，添加一个开关：useBackendAudit
export async function auditTraces(
  traces: GenerationTrace[], 
  documents: ParsedDocument[],
  useBackend = false
): Promise<AuditResponse['data']> {
  if (!useBackend) {
    // 使用现有的本地审计逻辑
    const audit = await auditUsability(traces[0]);
    const semanticConsistency = await checkSemanticConsistency(traces, documents);
    
    return {
      audit,
      claims: semanticConsistency.clusters.flatMap(c => c.members.map(m => m.claim)),
      semanticConsistency,
      cost: { claimExtraction: 0, embedding: 0, total: 0 }
    };
  }
  
  // 调用后端 API
  const response = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ traces, documents })
  });
  
  return (await response.json()).data;
}
```

**接入检查清单**：
- [ ] 后端实现 `/api/audit` 端点
- [ ] 主张提取（使用 GPT-4-mini）
- [ ] 来源追溯（embedding 相似度检索）
- [ ] 语义一致性检测（聚类）
- [ ] 前端添加 `useBackendAudit` 开关
- [ ] 测试多次运行对比

---

### Priority 2：用户管理与配额 🟡

#### 2.1 用户配额查询

**端点**：`GET /api/quota`

**用途**：查询用户当前的 API 调用次数、token 消耗、费用

**请求格式**：
```typescript
// Query params
interface QuotaRequest {
  userId?: string;  // 用户 ID（可选，从 session 获取）
}
```

**响应格式**：
```typescript
interface QuotaResponse {
  success: true;
  data: {
    userId: string;
    quota: {
      daily: {
        limit: number;      // 每日限额（默认 100 次）
        used: number;       // 已使用次数
        remaining: number;  // 剩余次数
        resetAt: string;    // ISO 8601 时间戳
      };
      cost: {
        total: number;      // 累计消耗（美元）
        thisMonth: number;  // 本月消耗
      };
    };
  };
}
```

**前端调用位置**：
- `src/components/QuotaDisplay.tsx`（新建组件）
- `src/pages/ObservePage.tsx` → 页面加载时调用

**Mock 策略**：
```typescript
export async function getQuota(): Promise<QuotaResponse> {
  return {
    success: true,
    data: {
      userId: 'mock-user',
      quota: {
        daily: { limit: 100, used: 5, remaining: 95, resetAt: '2026-08-07T00:00:00Z' },
        cost: { total: 0.05, thisMonth: 0.05 }
      }
    }
  };
}
```

---

#### 2.2 配额设置

**端点**：`POST /api/quota/settings`

**用途**：用户设置自己的每日限额、单次最大消费

**请求格式**：
```typescript
interface QuotaSettingsRequest {
  dailyLimit?: number;      // 每日最多调用次数
  maxCostPerRequest?: number;  // 单次请求最大消费（美元）
}
```

**响应格式**：
```typescript
interface QuotaSettingsResponse {
  success: true;
  data: {
    settings: {
      dailyLimit: number;
      maxCostPerRequest: number;
    };
  };
}
```

---

### Priority 3：数据管理与导出 🟢

#### 3.1 Trace 缓存查询

**端点**：`GET /api/traces/:traceId`

**用途**：根据 trace ID 查询缓存的 trace 数据（避免重复生成）

**响应格式**：
```typescript
interface TraceCacheResponse {
  success: true;
  data: {
    trace: GenerationTrace;
    cachedAt: string;  // ISO 8601
    expiresAt: string;  // 7 天后
  };
}
```

---

#### 3.2 审计报告导出

**端点**：`POST /api/export`

**用途**：生成审计报告的 PDF/Markdown 格式（后端渲染）

**请求格式**：
```typescript
interface ExportRequest {
  format: "pdf" | "markdown" | "json";
  data: {
    audit: UsabilityAudit;
    claims: AtomicClaimWithSource[];
    semanticConsistency: SemanticConsistencyResult;
  };
}
```

**响应格式**：
```typescript
interface ExportResponse {
  success: true;
  data: {
    downloadUrl: string;  // 临时下载链接（1 小时有效）
    filename: string;
  };
}
```

---

## 🔧 前端接入代码模板

### src/lib/apiClient.ts（新建）

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
}

// 1. API 代理
export async function proxyGeneration(req: ProxyRequest): Promise<ProxyResponse['data']> {
  if (!USE_BACKEND) {
    // Mock 数据
    return {
      trace: mockGenerationTrace,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: { input: 0.0001, output: 0.00015, total: 0.00025 }
    };
  }

  return apiRequest<ProxyResponse['data']>('/api/proxy', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

// 2. 文档解析
export async function parseDocumentAPI(file: File): Promise<ParsedDocument> {
  if (!USE_BACKEND) {
    // 使用本地解析
    return parseDocumentLocal(file);
  }

  const base64 = await fileToBase64(file);
  const result = await apiRequest<ParseDocumentResponse['data']>('/api/parse-document', {
    method: 'POST',
    body: JSON.stringify({ file: base64, filename: file.name })
  });

  return result.document;
}

// 3. 审计分析
export async function auditTracesAPI(
  traces: GenerationTrace[],
  documents: ParsedDocument[]
): Promise<AuditResponse['data']> {
  if (!USE_BACKEND) {
    // 使用本地审计
    const audit = await auditUsability(traces[0]);
    const semanticConsistency = await checkSemanticConsistency(traces, documents);
    
    return {
      audit,
      claims: semanticConsistency.clusters.flatMap(c => c.members.map(m => m.claim)),
      semanticConsistency,
      cost: { claimExtraction: 0, embedding: 0, total: 0 }
    };
  }

  return apiRequest<AuditResponse['data']>('/api/audit', {
    method: 'POST',
    body: JSON.stringify({ traces, documents })
  });
}

// 4. 配额查询
export async function getQuota(): Promise<QuotaResponse['data']> {
  if (!USE_BACKEND) {
    return {
      userId: 'mock-user',
      quota: {
        daily: { limit: 100, used: 5, remaining: 95, resetAt: '2026-08-07T00:00:00Z' },
        cost: { total: 0.05, thisMonth: 0.05 }
      }
    };
  }

  return apiRequest<QuotaResponse['data']>('/api/quota');
}

// 工具函数
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);  // 移除 data:xxx;base64, 前缀
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

### .env 配置

```bash
# 开发环境
VITE_USE_BACKEND=false
VITE_API_BASE_URL=http://localhost:8787

# 生产环境
VITE_USE_BACKEND=true
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## 📊 后端开发优先级

| 优先级 | 端点 | 用途 | 预计工时 |
|--------|------|------|----------|
| 🔥 P0 | `/api/proxy` | API 代理 + logprobs 获取 | 2 天 |
| 🔥 P0 | `/api/audit` | 幻觉检测与审计分析 | 3 天 |
| 🟡 P1 | `/api/parse-document` | 文档解析 + Embedding | 2 天 |
| 🟡 P1 | `/api/quota` | 用户配额查询 | 1 天 |
| 🟢 P2 | `/api/quota/settings` | 配额设置 | 1 天 |
| 🟢 P2 | `/api/traces/:traceId` | Trace 缓存查询 | 1 天 |
| 🟢 P2 | `/api/export` | 审计报告导出 | 2 天 |

**总计**：12 天（P0+P1），15 天（全部）

---

## 🔐 安全设计

### API Key 加密流程

```typescript
// 前端：加密 API key
import CryptoJS from 'crypto-js';

function encryptApiKey(apiKey: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = CryptoJS.AES.encrypt(apiKey, salt.toString()).toString();
  return `${encrypted}:${salt.toString()}`;
}

// 后端：解密 API key（仅在内存中使用，不存储）
function decryptApiKey(encryptedKey: string): string {
  const [encrypted, salt] = encryptedKey.split(':');
  const decrypted = CryptoJS.AES.decrypt(encrypted, salt).toString(CryptoJS.enc.Utf8);
  return decrypted;
}
```

### 零知识设计

1. **不存 API key**：用户的 API key 加密后传输，后端解密使用后丢弃
2. **不存对话内容**：只缓存 trace（logprobs + token），不存 prompt/response 原文
3. **7 天 TTL**：所有缓存数据 7 天后自动删除
4. **用户可删除**：提供 `DELETE /api/traces/:traceId` 端点

---

## ✅ 接入验收清单

### 前端准备（当前）
- [x] 创建 `src/lib/apiClient.ts` 模板
- [x] 所有接口定义（TypeScript 类型）
- [x] Mock 数据策略
- [ ] 环境变量配置（`.env`）
- [ ] 错误处理 UI 组件
- [ ] 配额显示组件

### 后端开发（后续）
- [ ] Cloudflare Workers 项目初始化
- [ ] `/api/proxy` 端点
- [ ] `/api/audit` 端点
- [ ] `/api/parse-document` 端点
- [ ] `/api/quota` 端点
- [ ] 错误处理与日志
- [ ] 限流与安全（WAF）

### 联调测试
- [ ] 前端设置 `VITE_USE_BACKEND=true`
- [ ] 测试所有接口调用
- [ ] 测试错误场景（无效 API key、超额等）
- [ ] 性能测试（100 个并发请求）
- [ ] 成本验证（单次审计 < $0.01）

---

**文档生成时间**：2026-08-06  
**下一步**：前端开始开发，后端按此文档实现接口
