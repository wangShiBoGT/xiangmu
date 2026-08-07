# 后端开发完整接口清单

> **目标**：后端开发完成后，前端只需修改环境变量即可接入  
> **状态**：✅ 前端已完成所有准备工作  
> **日期**：2026-08-06

---

## 📋 快速索引

| 接口 | 端点 | 用途 | 前端调用位置 | 状态 |
|------|------|------|-------------|------|
| API 代理 | `POST /api/proxy` | 代理 OpenAI/Anthropic 获取 logprobs | `apiClient.ts::proxyGeneration()` | 待开发 |
| 文档解析 | `POST /api/parse-document` | 解析 PDF/TXT，生成 embedding | `apiClient.ts::parseDocumentAPI()` | 待开发 |
| 审计分析 | `POST /api/audit` | 幻觉检测、主张提取、来源追溯 | `apiClient.ts::auditTracesAPI()` | 待开发 |
| 配额查询 | `GET /api/quota` | 查询用户配额和费用 | `apiClient.ts::getQuota()` | 待开发 |

---

## 📦 核心数据结构

### GenerationTrace（.aitrace 格式）
```typescript
interface GenerationTrace {
  modelId: string;
  params: {
    temperature: number;
    topP: number;
    seed?: number | null;
  };
  promptIds: number[];
  steps: TokenStep[];
  device: "webgpu" | "wasm";
  pipeline?: {
    tokenizeMs: number;
    prefillMs: number;
    decodeMs: number;
  };
}

interface TokenStep {
  id: number;
  text: string;
  prob: number;
  topk: TokenCandidate[];
  entropy: number;
  dt: number;
}
```

### ParsedDocument
```typescript
interface ParsedDocument {
  name: string;
  text: string;  // 全文拼接（兼容旧代码）
  truncated: boolean;
  pages: DocumentPage[];
  metadata: {
    totalPages: number;
    totalChars: number;
    parsedPages: number;
  };
}

interface DocumentPage {
  pageNumber: number;
  text: string;
  charStart: number;
  charEnd: number;
}
```

### AtomicClaimWithSource
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
    excerpt: string;        // 前 200 字
    similarity: number;     // 0-1
    charStart: number;
    charEnd: number;
  };
}
```

---

## 🔌 接口 1：API 代理

**端点**：`POST /api/proxy`

### 请求示例
```json
{
  "provider": "openai",
  "apiKey": "encrypted_key_here",
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "What is 2+2?" }
  ],
  "temperature": 0.7,
  "maxTokens": 100,
  "enableLogprobs": true
}
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "trace": {
      "modelId": "gpt-4",
      "params": { "temperature": 0.7, "topP": 1.0 },
      "promptIds": [],
      "steps": [
        { "id": 220, "text": "2", "prob": 0.98, "entropy": 0.1, "dt": 45, "topk": [] },
        { "id": 10, "text": "+", "prob": 0.95, "entropy": 0.2, "dt": 43, "topk": [] }
      ],
      "device": "webgpu"
    },
    "usage": {
      "promptTokens": 10,
      "completionTokens": 5,
      "totalTokens": 15
    },
    "cost": {
      "input": 0.00001,
      "output": 0.000015,
      "total": 0.000025
    }
  }
}
```

### 错误示例
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key provided"
  }
}
```

### 前端调用
```typescript
// src/lib/apiClient.ts::proxyGeneration()
const result = await proxyGeneration({
  provider: 'openai',
  apiKey: encryptedKey,
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
  enableLogprobs: true,
});

const trace = result.trace;  // 直接使用
```

### 安全要求
- API key 在后端内存中解密，用完立即销毁
- 不存储任何用户 API key
- 使用 HMAC 签名防重放攻击

---

## 🔌 接口 2：文档解析

**端点**：`POST /api/parse-document`

### 请求示例
```json
{
  "file": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAo...",
  "filename": "paper.pdf",
  "options": {
    "maxPages": 50,
    "enableEmbedding": true
  }
}
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "document": {
      "name": "paper.pdf",
      "text": "本文介绍 Transformer 架构...",
      "truncated": false,
      "pages": [
        {
          "pageNumber": 1,
          "text": "本文介绍 Transformer 架构。",
          "charStart": 0,
          "charEnd": 19
        },
        {
          "pageNumber": 2,
          "text": "该模型使用了 8 个注意力头。",
          "charStart": 20,
          "charEnd": 40
        }
      ],
      "metadata": {
        "totalPages": 2,
        "totalChars": 40,
        "parsedPages": 2
      }
    },
    "embeddings": [
      {
        "pageNumber": 1,
        "embedding": [0.1, 0.2, ..., 0.05]
      },
      {
        "pageNumber": 2,
        "embedding": [0.15, 0.18, ..., 0.03]
      }
    ],
    "cost": {
      "parsing": 0.0001,
      "embedding": 0.0005,
      "total": 0.0006
    }
  }
}
```

### 前端调用
```typescript
// src/lib/apiClient.ts::parseDocumentAPI()
const document = await parseDocumentAPI(file);

// 存储到状态
setUploadedDocuments([...uploadedDocuments, document]);
```

### 注意事项
- 文件通过 Base64 编码传输
- 后端解析后不存储原文件
- Embedding 可以缓存（7 天 TTL）

---

## 🔌 接口 3：审计分析（核心）

**端点**：`POST /api/audit`

### 请求示例
```json
{
  "traces": [
    {
      "modelId": "gpt-4",
      "params": { "temperature": 0.7, "topP": 1.0 },
      "promptIds": [],
      "steps": [...],
      "device": "webgpu"
    }
  ],
  "documents": [
    {
      "name": "paper.pdf",
      "text": "本文介绍...",
      "truncated": false,
      "pages": [...],
      "metadata": {...}
    }
  ],
  "options": {
    "enableClaimExtraction": true,
    "enableSourceTracing": true,
    "enableSemanticConsistency": true,
    "similarityThreshold": 0.7
  }
}
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "audit": {
      "modelId": "gpt-4",
      "totalTokens": 50,
      "entropyAnomalies": [
        {
          "type": "high_entropy",
          "tokenIndex": 15,
          "entropy": 4.2,
          "threshold": 3.5,
          "severity": "high",
          "explanation": "该词熵值异常高，模型极不确定"
        }
      ],
      "timeSeriesAnomalies": [],
      "factualRiskMarkers": [
        {
          "type": "confident_number",
          "tokenIndex": 20,
          "text": "8",
          "entropy": 0.3,
          "severity": "medium",
          "explanation": "数字需要验证"
        }
      ],
      "overallSeverity": "medium",
      "summary": "发现 1 处高熵异常，1 处事实性风险标记"
    },
    "claims": [
      {
        "id": "claim-1",
        "text": "Transformer 使用了 8 个注意力头",
        "startToken": 15,
        "endToken": 25,
        "category": "fact",
        "runId": 0,
        "source": {
          "docName": "paper.pdf",
          "pageNumber": 2,
          "excerpt": "该模型使用了 8 个注意力头（attention heads）来处理输入序列。",
          "similarity": 0.92,
          "charStart": 20,
          "charEnd": 57
        }
      },
      {
        "id": "claim-2",
        "text": "模型训练了 1000 个 epoch",
        "startToken": 30,
        "endToken": 38,
        "category": "number",
        "runId": 0
      }
    ],
    "semanticConsistency": {
      "runs": 1,
      "totalClaims": 2,
      "consistentClaims": 1,
      "inconsistentClaims": 0,
      "consistencyRate": 1.0,
      "clusters": [
        {
          "representative": {
            "id": "claim-1",
            "text": "Transformer 使用了 8 个注意力头",
            "category": "fact",
            "runId": 0,
            "source": {...}
          },
          "members": [
            {
              "claim": {...},
              "similarity": 1.0
            }
          ],
          "runIds": [0],
          "consistencyRate": 1.0
        }
      ],
      "severity": "low",
      "explanation": "所有主张语义一致"
    },
    "cost": {
      "claimExtraction": 0.005,
      "embedding": 0.002,
      "total": 0.007
    }
  }
}
```

### 前端调用
```typescript
// src/components/AuditReport.tsx
useEffect(() => {
  async function runAudit() {
    const result = await auditTracesAPI(
      [trace, ...additionalTraces],
      documents
    );
    
    setAuditResult(result.audit);
    setClaims(result.claims);  // 包含来源信息
    setSemanticConsistency(result.semanticConsistency);
  }
  
  runAudit();
}, [trace, additionalTraces, documents]);
```

### 核心逻辑
1. **主张提取**：使用 GPT-4-mini 从回答中提取原子主张
2. **来源追溯**：计算主张 embedding，与文档页面做余弦相似度匹配
3. **语义一致性**：对多次运行的主张做聚类分析
4. **可用性审计**：标记高熵 token、时间序列异常、事实性风险

---

## 🔌 接口 4：配额查询

**端点**：`GET /api/quota`

### 请求
```
GET /api/quota
Authorization: Bearer <user-token>
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "quota": {
      "daily": {
        "limit": 100,
        "used": 5,
        "remaining": 95,
        "resetAt": "2026-08-07T00:00:00Z"
      },
      "cost": {
        "total": 0.05,
        "thisMonth": 0.05
      }
    }
  }
}
```

### 前端调用
```typescript
// src/components/QuotaDisplay.tsx
const quota = await getQuota();

return (
  <div>
    今日剩余：{quota.quota.daily.remaining} / {quota.quota.daily.limit} 次
  </div>
);
```

---

## 🔐 安全实现要点

### API Key 加密传输
```typescript
// 前端
import CryptoJS from 'crypto-js';
const encryptedKey = CryptoJS.AES.encrypt(apiKey, 'secret').toString();

// 后端
const decryptedKey = CryptoJS.AES.decrypt(encryptedKey, 'secret').toString(CryptoJS.enc.Utf8);
// 使用后立即清除
```

### HMAC 签名
```typescript
// 前端
const timestamp = Date.now();
const signature = CryptoJS.HmacSHA256(
  `${timestamp}:${JSON.stringify(body)}`,
  'hmac-secret'
).toString();

// 请求头
headers: {
  'X-Timestamp': timestamp,
  'X-Signature': signature,
}
```

### 零知识设计
**不存储**：
- 用户 API key
- 对话内容
- 文档原文

**可缓存**（7 天 TTL）：
- GenerationTrace
- 审计结果
- 文档 embedding

---

## 💰 成本预算

### 单次审计成本
```
PDF 解析（5 页）：$0.001
Embedding 计算：$0.0005
主张提取（GPT-4-mini）：$0.005
语义一致性：$0.002
---
总计：$0.0085/次
```

### 月度成本（10 日活用户）
```
10 用户 × 3 次/天 × 30 天 = 900 次
900 × $0.0085 = $7.65/月
```

### Cloudflare 成本
```
免费额度：10 万次请求/天
预计：900 次/月 << 免费额度
成本：$0
```

**总计**：约 $8/月（10 日活用户）

---

## 📋 开发优先级

### 第 1 周（核心功能）
1. ✅ **接口 2**：文档解析（依赖最少）
2. ✅ **接口 3**：审计分析（核心功能）
3. 🔜 **接口 1**：API 代理（可选）
4. 🔜 **接口 4**：配额查询（简单）

### 第 2 周（联调测试）
1. 前后端联调
2. 错误处理完善
3. 性能优化
4. 部署到生产

---

## ✅ 验收清单

### 功能验收
- [ ] 文档解析成功率 > 95%
- [ ] 来源追溯准确率 > 80%
- [ ] 主张提取召回率 > 90%
- [ ] API 响应时间 < 3 秒

### 性能验收
- [ ] 并发 10 用户无错误
- [ ] P95 延迟 < 5 秒
- [ ] 缓存命中率 > 50%

### 安全验收
- [ ] API key 不存储
- [ ] HMAC 签名正常工作
- [ ] 配额限制生效

---

## 📞 联系方式

**前端负责人**：已完成  
**后端负责人**：待指定

**前端代码**：`src/lib/apiClient.ts`（已完成）  
**接口文档**：本文件

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**状态**：✅ 前端准备完毕，等待后端开发
