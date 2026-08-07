# WebGPU LLM Chat - 后端 API

基于 Cloudflare Workers 的边缘计算后端，提供 API 代理、文档解析、审计分析和配额管理。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境

编辑 `wrangler.toml`，更新以下配置：

```toml
[vars]
ENCRYPTION_SECRET = "your-encryption-secret-change-this"
HMAC_SECRET = "your-hmac-secret-change-this"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
```

### 3. 创建 KV 和 D1 资源

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CACHE"

# 创建 D1 数据库
wrangler d1 create llm-chat-quota

# 初始化数据库表
wrangler d1 execute llm-chat-quota --file=./schema.sql
```

将返回的 ID 更新到 `wrangler.toml` 中。

### 4. 本地开发

```bash
npm run dev
```

服务将运行在 `http://localhost:8787`

### 5. 部署到生产

```bash
npm run deploy
```

---

## 📡 API 接口

### 1. API 代理

**端点**: `POST /api/proxy`

**请求头**:
```
Content-Type: application/json
X-Timestamp: 1234567890000
X-Signature: hmac-sha256-signature
```

**请求体**:
```json
{
  "provider": "openai",
  "apiKey": "encrypted-api-key",
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "maxTokens": 1000,
  "enableLogprobs": true
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "trace": { "modelId": "gpt-4", "steps": [...] },
    "usage": { "promptTokens": 10, "completionTokens": 50, "totalTokens": 60 },
    "cost": { "input": 0.0001, "output": 0.00015, "total": 0.00025 }
  }
}
```

---

### 2. 文档解析

**端点**: `POST /api/parse-document`

**请求体**:
```json
{
  "file": "base64-encoded-file",
  "filename": "paper.pdf",
  "options": {
    "maxPages": 50,
    "enableEmbedding": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "document": {
      "name": "paper.pdf",
      "text": "...",
      "pages": [...]
    },
    "embeddings": [
      { "pageNumber": 1, "embedding": [...] }
    ],
    "cost": { "parsing": 0.0001, "embedding": 0.0005, "total": 0.0006 }
  }
}
```

---

### 3. 审计分析

**端点**: `POST /api/audit`

**请求体**:
```json
{
  "traces": [{ "modelId": "gpt-4", "steps": [...] }],
  "documents": [{ "name": "paper.pdf", "pages": [...] }],
  "options": {
    "enableClaimExtraction": true,
    "enableSourceTracing": true,
    "enableSemanticConsistency": true,
    "similarityThreshold": 0.7
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "audit": {
      "modelId": "gpt-4",
      "entropyAnomalies": [...],
      "factualRiskMarkers": [...]
    },
    "claims": [
      {
        "id": "claim-1",
        "text": "Transformer uses 8 attention heads",
        "category": "fact",
        "source": {
          "docName": "paper.pdf",
          "pageNumber": 2,
          "excerpt": "...",
          "similarity": 0.92
        }
      }
    ],
    "semanticConsistency": { "consistencyRate": 0.85 },
    "cost": { "total": 0.007 }
  }
}
```

---

### 4. 配额查询

**端点**: `GET /api/quota`

**响应**:
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

---

## 🔒 安全设计

### 1. API Key 加密

前端使用 AES 加密 API key：

```typescript
import CryptoJS from 'crypto-js';

const encryptedKey = CryptoJS.AES.encrypt(
  apiKey,
  'your-encryption-secret'
).toString();
```

后端解密后立即销毁：

```typescript
const apiKey = decryptApiKey(encryptedKey, env.ENCRYPTION_SECRET);
// 使用
await proxyGeneration({ ...req, apiKey });
// 立即清除
apiKey = '';
```

### 2. HMAC 签名

前端生成签名：

```typescript
const timestamp = Date.now();
const signature = CryptoJS.HmacSHA256(
  `${timestamp}:${JSON.stringify(body)}`,
  'your-hmac-secret'
).toString();
```

后端验证：
- 时间戳在 5 分钟内
- 签名匹配

### 3. 零知识设计

**不存储**:
- 用户 API key
- 对话内容
- 文档原文

**可缓存** (7 天 TTL):
- GenerationTrace
- 审计结果
- 文档 embedding

---

## 💰 成本估算

### 单次审计成本

```
PDF 解析（5 页）：    $0.001
Embedding 计算：      $0.0005
主张提取：            $0.005
语义一致性：          $0.002
----------------------------
总计：                $0.0085/次
```

### 月度成本（10 日活用户）

```
10 用户 × 3 次/天 × 30 天 = 900 次
900 × $0.0085 = $7.65/月
```

### Cloudflare 成本

```
免费额度：10 万次请求/天
预计：    900 次/月 << 免费额度
成本：    $0
```

**总计**: 约 $8/月

---

## 📁 项目结构

```
backend/
├── src/
│   ├── index.ts              # 主入口（Hono 路由）
│   ├── types.ts              # 类型定义
│   ├── services/
│   │   ├── apiProxy.ts       # API 代理（OpenAI/Anthropic）
│   │   ├── documentParser.ts # 文档解析（PDF/TXT）
│   │   ├── embedding.ts      # Embedding 计算
│   │   └── audit.ts          # 审计服务
│   └── utils/
│       ├── security.ts       # 加密、签名验证
│       └── quota.ts          # 配额管理
├── package.json
├── wrangler.toml
├── tsconfig.json
└── README.md
```

---

## 🧪 测试

```bash
# 健康检查
curl http://localhost:8787/health

# 配额查询
curl http://localhost:8787/api/quota

# API 代理（需要签名）
curl -X POST http://localhost:8787/api/proxy \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $(date +%s)000" \
  -H "X-Signature: your-signature" \
  -d '{"provider":"openai","apiKey":"...","model":"gpt-4","messages":[...]}'
```

---

## 📋 部署检查清单

### 1. 配置检查

- [ ] `wrangler.toml` 中的 secret 已修改
- [ ] KV namespace ID 已更新
- [ ] D1 database ID 已更新
- [ ] CORS origin 已配置

### 2. 资源创建

- [ ] KV namespace 已创建
- [ ] D1 数据库已创建
- [ ] 数据库表已初始化

### 3. 功能测试

- [ ] 健康检查正常
- [ ] 配额查询正常
- [ ] API 代理正常
- [ ] 文档解析正常
- [ ] 审计分析正常

### 4. 性能测试

- [ ] 并发 10 用户无错误
- [ ] P95 延迟 < 5 秒
- [ ] 缓存命中率 > 50%

### 5. 安全测试

- [ ] HMAC 签名验证生效
- [ ] 过期请求被拒绝
- [ ] 配额限制生效
- [ ] API key 不泄露

---

## 🔧 故障排查

### 问题 1: "Invalid signature"

**原因**: 时间戳或签名不正确

**解决**:
1. 检查前端和后端的 `HMAC_SECRET` 一致
2. 确保时间戳在 5 分钟内
3. 确保签名算法一致

### 问题 2: "Daily quota exceeded"

**原因**: 用户配额用完

**解决**:
1. 等待次日 00:00 UTC 自动重置
2. 或手动重置数据库：
```sql
UPDATE quotas SET daily_used = 0 WHERE user_id = 'xxx';
```

### 问题 3: "Decryption failed"

**原因**: 加密密钥不匹配

**解决**:
1. 确保前端和后端的 `ENCRYPTION_SECRET` 一致
2. 检查前端加密逻辑

---

## 📞 联系方式

**后端负责人**: [待指定]  
**前端负责人**: 已完成

**前端文档**: `docs/BACKEND_INTERFACE_CHECKLIST.md`  
**后端仓库**: 本项目

---

**版本**: v1.0  
**创建时间**: 2026-08-06  
**状态**: ✅ 开发完成，待部署测试
