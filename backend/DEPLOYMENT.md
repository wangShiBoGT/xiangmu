# 后端部署指南

## 📋 前置准备

### 1. 安装 Cloudflare CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账户。

---

## 🚀 部署步骤

### 步骤 1：创建 KV 命名空间

```bash
cd backend

# 创建生产环境 KV
wrangler kv:namespace create "CACHE"

# 创建预览环境 KV
wrangler kv:namespace create "CACHE" --preview
```

**输出示例**：
```
🌀 Creating namespace with title "webgpu-llm-chat-backend-CACHE"
✨ Success!
Add the following to your configuration file:
kv_namespaces = [
  { binding = "CACHE", id = "abcdef1234567890" }
]
```

**复制 ID**，更新到 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abcdef1234567890"  # 替换为你的 ID
preview_id = "preview-id-here"  # 替换为预览 ID
```

---

### 步骤 2：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create llm-chat-quota
```

**输出示例**：
```
✅ Successfully created DB 'llm-chat-quota'!

Add the following to your wrangler.toml:
[[d1_databases]]
binding = "DB"
database_name = "llm-chat-quota"
database_id = "xyz-database-id-123"
```

**复制 ID**，更新到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "llm-chat-quota"
database_id = "xyz-database-id-123"  # 替换为你的 ID
```

---

### 步骤 3：初始化数据库表

```bash
# 本地执行（开发环境）
wrangler d1 execute llm-chat-quota --local --file=./schema.sql

# 生产环境执行
wrangler d1 execute llm-chat-quota --file=./schema.sql
```

**验证**：
```bash
# 查询表结构
wrangler d1 execute llm-chat-quota --command="SELECT * FROM quotas LIMIT 5"
```

---

### 步骤 4：配置环境变量

编辑 `wrangler.toml`，更新 secrets：

```toml
[vars]
ENCRYPTION_SECRET = "change-this-to-random-32-chars"
HMAC_SECRET = "change-this-to-another-random-32"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
```

**生成随机密钥**（推荐）：

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**重要**：
- ✅ 生产环境必须使用强随机密钥
- ✅ 不要提交到 Git
- ✅ 前端的 `ENCRYPTION_SECRET` 和 `HMAC_SECRET` 必须与后端一致

---

### 步骤 5：安装依赖

```bash
npm install
```

---

### 步骤 6：本地测试

```bash
npm run dev
```

**访问**：
- 健康检查：http://localhost:8787/health
- 配额查询：http://localhost:8787/api/quota

**测试命令**：

```bash
# 健康检查
curl http://localhost:8787/health

# 配额查询
curl http://localhost:8787/api/quota
```

---

### 步骤 7：部署到生产

```bash
# 部署
npm run deploy
```

**输出示例**：
```
Total Upload: 1.23 MiB / gzip: 345.67 KiB
Uploaded webgpu-llm-chat-backend (2.34 sec)
Published webgpu-llm-chat-backend (0.56 sec)
  https://webgpu-llm-chat-backend.your-account.workers.dev
Current Deployment ID: abcd1234-5678-90ef-ghij-klmnopqrstuv
```

**复制生产 URL**，例如：
```
https://webgpu-llm-chat-backend.your-account.workers.dev
```

---

### 步骤 8：配置自定义域名（可选）

在 Cloudflare Dashboard：

1. 进入 Workers & Pages
2. 选择你的 Worker
3. 点击 "Triggers" → "Add Custom Domain"
4. 输入域名（例如 `api.yourdomain.com`）
5. 等待 DNS 生效

**更新前端配置**：

```bash
# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

### 步骤 9：前端集成

**修改前端环境变量**：

```bash
cd ..  # 回到项目根目录
```

编辑 `.env.production`：

```bash
# 启用后端调用
VITE_USE_BACKEND=true

# 后端 URL（使用步骤 7 的 URL）
VITE_API_BASE_URL=https://webgpu-llm-chat-backend.your-account.workers.dev
```

**重新构建前端**：

```bash
npm run build
```

---

### 步骤 10：端到端测试

#### 测试 1：配额查询

```bash
curl https://your-backend-url.workers.dev/api/quota
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "quota": {
      "daily": { "limit": 100, "used": 0, "remaining": 100 }
    }
  }
}
```

#### 测试 2：文档解析

```bash
# 创建测试文件
echo "This is a test document." > test.txt
base64 test.txt > test.b64

# 发送请求（需要签名）
# 使用前端 UI 测试更方便
```

#### 测试 3：前端集成

1. 访问前端应用
2. 上传 PDF 文档
3. 输入问题并生成回答
4. 查看审计报告
5. 验证来源页码显示正确

---

## 🔒 安全检查

### 1. 验证 HMAC 签名

```bash
# 尝试无签名请求（应该失败）
curl -X POST https://your-backend-url.workers.dev/api/quota \
  -H "Content-Type: application/json"

# 预期：403 Forbidden
```

### 2. 验证配额限制

```bash
# 查询配额
curl https://your-backend-url.workers.dev/api/quota

# 多次调用直到超出配额
# 预期：429 Too Many Requests
```

### 3. 验证 API Key 不泄露

```bash
# 检查日志中没有明文 API key
wrangler tail
```

---

## 📊 监控和日志

### 实时日志

```bash
wrangler tail
```

### Cloudflare Dashboard

1. 进入 Workers & Pages
2. 选择你的 Worker
3. 查看 Analytics：
   - 请求数
   - 错误率
   - CPU 时间
   - 成本估算

---

## 🔧 故障排查

### 问题 1：部署失败 - "KV namespace not found"

**原因**：`wrangler.toml` 中的 KV ID 不正确

**解决**：
```bash
# 查看所有 KV
wrangler kv:namespace list

# 更新 wrangler.toml
```

### 问题 2：数据库查询失败

**原因**：表未创建或 D1 ID 不正确

**解决**：
```bash
# 重新执行初始化
wrangler d1 execute llm-chat-quota --file=./schema.sql

# 验证表存在
wrangler d1 execute llm-chat-quota --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 问题 3：CORS 错误

**原因**：前端域名未添加到 CORS 白名单

**解决**：

编辑 `src/index.ts`：

```typescript
app.use('/*', cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.com'  // 添加你的前端域名
  ]
}));
```

重新部署：
```bash
npm run deploy
```

### 问题 4：Embedding 失败

**原因**：Cloudflare AI 未启用或模型不可用

**解决**：

1. 检查 Cloudflare 账户是否启用了 Workers AI
2. 或使用外部 Embedding API（例如 OpenAI）

---

## 💰 成本监控

### 查看使用量

```bash
# 查看 Workers 使用统计
wrangler metrics

# 查看 D1 使用统计
wrangler d1 info llm-chat-quota
```

### 成本预警

在 Cloudflare Dashboard 设置：

1. Billing → Usage
2. 设置预算提醒（例如 $10/月）
3. 启用邮件通知

---

## 📋 部署检查清单

部署前请确认：

- [ ] KV 命名空间已创建
- [ ] D1 数据库已创建并初始化
- [ ] `wrangler.toml` 中的 ID 已更新
- [ ] 环境变量已配置（强随机密钥）
- [ ] CORS origin 包含前端域名
- [ ] 本地测试通过
- [ ] 生产环境部署成功
- [ ] 健康检查正常
- [ ] 前端环境变量已更新
- [ ] 端到端测试通过
- [ ] 监控和日志正常
- [ ] 成本预警已设置

---

## 🎉 部署完成

后端现已部署到 Cloudflare Workers 边缘网络！

**下一步**：
1. 前端修改 `.env.production` 启用后端
2. 重新构建并部署前端
3. 测试完整流程
4. 监控成本和性能

**访问地址**：
- 后端 API：https://your-backend-url.workers.dev
- 前端应用：https://your-frontend-url.com

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**状态**：✅ 部署指南完成
