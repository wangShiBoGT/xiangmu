# 🧪 完整测试方案

> **目标**：前后端部署、功能测试、冒烟测试、集成测试  
> **范围**：后端 API + 前端集成 + 端到端流程  
> **日期**：2026-08-06

---

## 📋 测试清单总览

### 1. 后端部署测试
- [ ] Cloudflare 资源创建
- [ ] 后端服务部署
- [ ] 健康检查
- [ ] 环境变量验证

### 2. 后端单元测试
- [ ] API 代理接口
- [ ] 文档解析接口
- [ ] 审计分析接口
- [ ] 配额查询接口

### 3. 前端部署测试
- [ ] 环境变量配置
- [ ] 前端构建
- [ ] 前端部署

### 4. 集成测试
- [ ] 前后端对接
- [ ] CORS 验证
- [ ] 签名验证
- [ ] 配额限制

### 5. 功能测试
- [ ] 文档上传流程
- [ ] 生成回答流程
- [ ] 审计报告流程
- [ ] 来源追溯流程
- [ ] 导出功能

### 6. 冒烟测试
- [ ] 核心路径可用
- [ ] 无阻断性错误
- [ ] 性能基线达标

---

## 🚀 阶段 1：后端部署测试

### 步骤 1.1：安装 Wrangler CLI

```bash
npm install -g wrangler

# 验证安装
wrangler --version
```

**预期输出**：
```
⛅️ wrangler 3.x.x
```

---

### 步骤 1.2：登录 Cloudflare

```bash
wrangler login
```

**预期**：
- 浏览器打开授权页面
- 授权成功后返回终端

**验证**：
```bash
wrangler whoami
```

---

### 步骤 1.3：创建 KV 命名空间

```bash
cd backend

# 创建生产环境 KV
wrangler kv:namespace create "CACHE"

# 创建预览环境 KV
wrangler kv:namespace create "CACHE" --preview
```

**预期输出**：
```
✨ Success!
Add the following to your configuration file:
kv_namespaces = [
  { binding = "CACHE", id = "abc123..." }
]
```

**记录**：
- 生产 KV ID: `_________________`
- 预览 KV ID: `_________________`

**操作**：
编辑 `wrangler.toml`，更新 KV ID：
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."  # 替换为实际 ID
preview_id = "xyz789..."  # 替换为实际 ID
```

---

### 步骤 1.4：创建 D1 数据库

```bash
wrangler d1 create llm-chat-quota
```

**预期输出**：
```
✅ Successfully created DB 'llm-chat-quota'!
database_id = "def456..."
```

**记录**：
- D1 Database ID: `_________________`

**操作**：
编辑 `wrangler.toml`，更新 D1 ID：
```toml
[[d1_databases]]
binding = "DB"
database_name = "llm-chat-quota"
database_id = "def456..."  # 替换为实际 ID
```

---

### 步骤 1.5：初始化数据库表

```bash
wrangler d1 execute llm-chat-quota --file=./schema.sql
```

**预期输出**：
```
🌀 Executing on llm-chat-quota:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
✅ Executed 3 commands in 0.123s
```

**验证**：
```bash
wrangler d1 execute llm-chat-quota --command="SELECT name FROM sqlite_master WHERE type='table'"
```

**预期输出**：
```
name
quotas
```

---

### 步骤 1.6：配置环境变量

**生成强随机密钥**：
```bash
# 生成 ENCRYPTION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 HMAC_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**记录**：
- ENCRYPTION_SECRET: `_________________`
- HMAC_SECRET: `_________________`

**操作**：
编辑 `wrangler.toml`：
```toml
[vars]
ENCRYPTION_SECRET = "your-generated-key-here"
HMAC_SECRET = "your-generated-key-here"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
```

⚠️ **重要**：这两个密钥必须与前端保持一致！

---

### 步骤 1.7：安装依赖

```bash
npm install
```

**预期输出**：
```
added 123 packages in 5s
```

---

### 步骤 1.8：本地测试

```bash
npm run dev
```

**预期输出**：
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**测试**（新开终端）：

```bash
# 测试 1：健康检查
curl http://localhost:8787/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2026-08-06T..."
}
```

```bash
# 测试 2：配额查询
curl http://localhost:8787/api/quota

# 预期响应
{
  "success": true,
  "data": {
    "userId": "...",
    "quota": {
      "daily": {
        "limit": 100,
        "used": 0,
        "remaining": 100
      }
    }
  }
}
```

**✅ 通过标准**：
- [ ] 健康检查返回 200
- [ ] 配额查询返回正确格式
- [ ] 无 500 错误

---

### 步骤 1.9：部署到生产

```bash
npm run deploy
```

**预期输出**：
```
Total Upload: 1.23 MiB / gzip: 345.67 KiB
Uploaded webgpu-llm-chat-backend (2.34 sec)
Published webgpu-llm-chat-backend (0.56 sec)
  https://webgpu-llm-chat-backend.your-account.workers.dev
```

**记录生产 URL**：
```
https://______________________________.workers.dev
```

---

### 步骤 1.10：生产环境验证

```bash
# 设置环境变量
export BACKEND_URL="https://your-backend-url.workers.dev"

# 测试 1：健康检查
curl $BACKEND_URL/health

# 测试 2：配额查询
curl $BACKEND_URL/api/quota
```

**✅ 通过标准**：
- [ ] 健康检查正常
- [ ] 配额查询正常
- [ ] 响应时间 < 2 秒

---

## 🧪 阶段 2：后端单元测试

### 测试 2.1：配额查询接口

```bash
curl -X GET $BACKEND_URL/api/quota
```

**预期响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "quota": {
      "daily": {
        "limit": 100,
        "used": 0,
        "remaining": 100,
        "resetAt": "2026-08-07T00:00:00Z"
      },
      "cost": {
        "total": 0.0,
        "thisMonth": 0.0
      }
    }
  }
}
```

**验证**：
- [ ] `success` 为 `true`
- [ ] `quota.daily.limit` 为 `100`
- [ ] `quota.daily.remaining` 为 `100`
- [ ] `resetAt` 是明天的日期

---

### 测试 2.2：HMAC 签名验证

```bash
# 测试：无签名请求（应该失败）
curl -X POST $BACKEND_URL/api/audit \
  -H "Content-Type: application/json" \
  -d '{"traces": []}'
```

**预期响应**（403 Forbidden）：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Missing timestamp or signature"
  }
}
```

**验证**：
- [ ] 返回 403 状态码
- [ ] 错误码为 `INVALID_SIGNATURE`

---

### 测试 2.3：文档解析接口（简化测试）

创建测试脚本 `test-parse.sh`：

```bash
#!/bin/bash

# 创建测试文件
echo "This is a test document for parsing." > test.txt

# Base64 编码
BASE64_CONTENT=$(base64 test.txt)

# 生成签名
TIMESTAMP=$(date +%s)000
BODY="{\"file\":\"$BASE64_CONTENT\",\"filename\":\"test.txt\"}"

# 注意：实际需要使用正确的 HMAC_SECRET 生成签名
# 这里跳过签名，仅测试结构

curl -X POST $BACKEND_URL/api/parse-document \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: mock-signature" \
  -d "$BODY"

# 清理
rm test.txt
```

**注意**：由于需要正确的 HMAC 签名，这个测试在前端集成时进行更合适。

---

### 测试 2.4：健康检查持续监控

```bash
# 连续测试 10 次
for i in {1..10}; do
  echo "Test $i:"
  curl -s $BACKEND_URL/health | jq .status
  sleep 1
done
```

**预期输出**：
```
Test 1: "ok"
Test 2: "ok"
...
Test 10: "ok"
```

**✅ 通过标准**：
- [ ] 10 次测试全部成功
- [ ] 平均响应时间 < 500ms

---

## 🎨 阶段 3：前端部署测试

### 步骤 3.1：配置前端环境变量

```bash
cd ..  # 回到项目根目录

# 创建生产环境配置
cat > .env.production << 'EOF'
# 启用后端调用
VITE_USE_BACKEND=true

# 后端 URL
VITE_API_BASE_URL=https://your-backend-url.workers.dev
EOF
```

**操作**：
将 `your-backend-url.workers.dev` 替换为实际的后端 URL。

**验证配置**：
```bash
cat .env.production
```

**✅ 通过标准**：
- [ ] `VITE_USE_BACKEND=true`
- [ ] `VITE_API_BASE_URL` 正确

---

### 步骤 3.2：前端构建

```bash
npm run build
```

**预期输出**：
```
vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/index.html                  5.67 kB
dist/assets/index-xxxxx.css    136.88 kB
dist/assets/index-xxxxx.js     988.49 kB
✓ built in 12.34s
```

**验证**：
```bash
ls -lh dist/
```

**✅ 通过标准**：
- [ ] `dist/` 目录存在
- [ ] `index.html` 存在
- [ ] 无构建错误

---

### 步骤 3.3：本地预览

```bash
npm run preview
```

**预期输出**：
```
Local: http://localhost:4173/
```

**访问**：http://localhost:4173/

**✅ 通过标准**：
- [ ] 页面正常加载
- [ ] 无控制台错误
- [ ] UI 显示正常

---

### 步骤 3.4：前端部署

根据你的部署方式：

#### 方案 A：GitHub Pages

```bash
npm run deploy
```

#### 方案 B：Vercel

```bash
vercel --prod
```

#### 方案 C：Netlify

```bash
netlify deploy --prod
```

**记录前端 URL**：
```
https://____________________________
```

---

## 🔗 阶段 4：集成测试

### 测试 4.1：CORS 验证

打开前端应用，打开浏览器控制台（F12），查看 Network 标签。

**操作**：
1. 访问前端应用
2. 打开控制台
3. 刷新页面

**检查**：
- [ ] 无 CORS 错误
- [ ] API 请求正常

**如果有 CORS 错误**：

编辑 `backend/src/index.ts`：

```typescript
app.use('/*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://your-frontend-domain.com'  // 添加实际域名
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature']
}));
```

重新部署后端：
```bash
cd backend
npm run deploy
```

---

### 测试 4.2：前端配额查询

**操作**：
1. 打开前端应用
2. 打开控制台
3. 在控制台输入：

```javascript
// 测试配额查询
fetch('/api/quota')
  .then(r => r.json())
  .then(data => console.log('Quota:', data))
```

**预期输出**：
```javascript
Quota: {
  success: true,
  data: {
    userId: "...",
    quota: { daily: { limit: 100, used: 0, remaining: 100 } }
  }
}
```

**✅ 通过标准**：
- [ ] 请求成功（200）
- [ ] 返回正确格式
- [ ] 无 CORS 错误

---

### 测试 4.3：签名验证

前端应该自动生成签名。检查 `src/lib/apiClient.ts` 中的签名逻辑。

**验证**：
```bash
# 查看签名实现
grep -A 10 "HmacSHA256" src/lib/apiClient.ts
```

**如果未实现**，需要添加：

```typescript
// src/lib/apiClient.ts

import CryptoJS from 'crypto-js';

const HMAC_SECRET = 'your-hmac-secret';  // 与后端一致

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const timestamp = Date.now().toString();
  const body = options.body as string;

  // 生成 HMAC 签名
  const signature = CryptoJS.HmacSHA256(
    `${timestamp}:${body}`,
    HMAC_SECRET
  ).toString();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
}
```

---

## ✅ 阶段 5：功能测试

### 测试 5.1：首页加载

**操作**：
1. 访问前端应用
2. 等待页面加载完成

**验证**：
- [ ] 页面正常显示
- [ ] 无 JavaScript 错误
- [ ] 无 404 错误
- [ ] 加载时间 < 3 秒

---

### 测试 5.2：文档上传流程（当 Task 1 完成后）

⚠️ **注意**：此功能尚未实现，需要先完成 `docs/FRONTEND_TASKS.md` 中的 Task 1。

**操作**（预期流程）：
1. 点击"上传参考文档"按钮
2. 选择 PDF 或 TXT 文件
3. 等待上传和解析

**验证**：
- [ ] 上传成功
- [ ] 显示解析进度
- [ ] 显示文档页数和字数
- [ ] 文档出现在列表中

---

### 测试 5.3：生成回答流程（本地模式）

**操作**：
1. 在 ObservePage 输入问题："What is machine learning?"
2. 选择模型（例如 Qwen2.5-0.5B）
3. 点击"生成"

**验证**：
- [ ] 生成开始
- [ ] Token 逐个显示
- [ ] 生成完成后显示完整回答
- [ ] 无错误

---

### 测试 5.4：审计报告流程

**操作**：
1. 生成完成后
2. 滚动到审计报告部分

**验证**：
- [ ] 审计报告自动显示
- [ ] 显示熵异常
- [ ] 显示事实性风险标记
- [ ] 显示主张列表
- [ ] 显示语义一致性（如果有多次运行）

---

### 测试 5.5：来源追溯流程（当文档功能完成后）

⚠️ **注意**：需要先完成文档上传功能（Task 1-4）。

**操作**（预期流程）：
1. 上传参考文档
2. 输入与文档相关的问题
3. 生成回答
4. 查看审计报告中的主张列表

**验证**：
- [ ] 主张显示来源页码
- [ ] 显示相似度百分比
- [ ] 显示来源摘录（前 200 字）
- [ ] 未找到来源时显示警告

---

### 测试 5.6：导出功能

**操作**：
1. 生成完成后
2. 点击"导出 JSON"或"导出 Markdown"

**验证**：
- [ ] 文件下载成功
- [ ] JSON 格式正确
- [ ] 包含所有数据（trace、audit、claims）
- [ ] 如果有来源，包含来源信息

---

## 🔥 阶段 6：冒烟测试

### 测试 6.1：核心路径

**路径 1：本地生成 → 查看报告**

1. 访问首页
2. 输入问题
3. 生成回答
4. 查看审计报告
5. 导出报告

**✅ 通过标准**：
- [ ] 全流程无阻断性错误
- [ ] 每步响应时间合理
- [ ] 数据显示正确

---

**路径 2：配额查询**（API 模式）

1. 访问设置页面（如果有）
2. 查看配额信息

**✅ 通过标准**：
- [ ] 配额显示正常
- [ ] 剩余次数正确

---

### 测试 6.2：性能基线

```bash
# 使用 curl 测试后端响应时间
for i in {1..10}; do
  time curl -s $BACKEND_URL/health > /dev/null
done
```

**✅ 通过标准**：
- [ ] P50 < 500ms
- [ ] P95 < 2s
- [ ] 无超时

---

### 测试 6.3：并发测试

```bash
# 安装 Apache Bench（如果未安装）
# Ubuntu: sudo apt-get install apache2-utils
# Mac: brew install apache-bench

# 并发测试
ab -n 100 -c 10 $BACKEND_URL/health
```

**预期输出**：
```
Requests per second:    50.00 [#/sec]
Time per request:       200.000 [ms]
Failed requests:        0
```

**✅ 通过标准**：
- [ ] 0 个失败请求
- [ ] 平均响应时间 < 500ms

---

## 📊 测试报告模板

### 测试执行摘要

**日期**：2026-08-06  
**测试人员**：_____________  
**环境**：生产环境

### 测试结果

| 阶段 | 通过 | 失败 | 跳过 | 总计 |
|------|------|------|------|------|
| 1. 后端部署 | ___ | ___ | ___ | 10 |
| 2. 后端单元测试 | ___ | ___ | ___ | 4 |
| 3. 前端部署 | ___ | ___ | ___ | 4 |
| 4. 集成测试 | ___ | ___ | ___ | 3 |
| 5. 功能测试 | ___ | ___ | ___ | 6 |
| 6. 冒烟测试 | ___ | ___ | ___ | 3 |
| **总计** | ___ | ___ | ___ | **30** |

### 阻断性问题

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### 非阻断性问题

1. _______________________________________________
2. _______________________________________________

### 性能指标

- 后端健康检查响应时间：_______ms
- 配额查询响应时间：_______ms
- 前端首屏加载时间：_______s
- 生成回答时间（本地）：_______s

### 结论

- [ ] ✅ 所有测试通过，可以上线
- [ ] ⚠️ 有非阻断性问题，记录后可以上线
- [ ] ❌ 有阻断性问题，需要修复后重新测试

---

## 🔧 常见问题排查

### 问题 1：后端部署失败

**错误**：`Error: KV namespace not found`

**解决**：
1. 检查 `wrangler.toml` 中的 KV ID 是否正确
2. 运行 `wrangler kv:namespace list` 查看可用的命名空间
3. 更新配置文件

---

### 问题 2：前端 CORS 错误

**错误**：`Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解决**：
1. 编辑 `backend/src/index.ts`
2. 添加前端域名到 CORS 白名单
3. 重新部署后端

---

### 问题 3：签名验证失败

**错误**：`Invalid signature`

**解决**：
1. 确认前端和后端的 `HMAC_SECRET` 完全一致
2. 检查签名算法是否正确（HmacSHA256）
3. 检查时间戳格式（毫秒）

---

### 问题 4：配额立即用完

**错误**：`Daily quota exceeded`（但刚部署）

**解决**：
1. 检查 D1 数据库数据：
```bash
wrangler d1 execute llm-chat-quota --command="SELECT * FROM quotas"
```
2. 手动重置：
```bash
wrangler d1 execute llm-chat-quota --command="UPDATE quotas SET daily_used = 0"
```

---

## ✅ 验收标准

### 最低验收标准（MVP）

必须全部通过：

- [ ] 后端健康检查正常
- [ ] 配额查询正常
- [ ] 前端页面可以访问
- [ ] 本地生成功能正常
- [ ] 审计报告显示正常
- [ ] 无阻断性 CORS 错误
- [ ] 无阻断性 500 错误

### 完整验收标准

最低标准 + 以下项：

- [ ] 文档上传解析成功（Task 1-4 完成后）
- [ ] 来源追溯显示正确（Task 1-4 完成后）
- [ ] 导出功能包含来源信息
- [ ] API 模式正常工作
- [ ] 配额限制生效
- [ ] 性能达标（P95 < 5s）
- [ ] 并发测试通过（10 并发无错误）

---

## 📋 下一步

### 当测试通过后

1. **更新文档**：
   - 记录生产环境 URL
   - 更新部署日期
   - 记录配置参数

2. **监控设置**：
   - 设置 Cloudflare 预算提醒
   - 启用错误日志
   - 定期检查配额使用

3. **继续开发**：
   - 按 `docs/FRONTEND_TASKS.md` 完成剩余任务
   - Task 1-4（文档功能）
   - Task 5-7（增强功能）
   - Task 8-9（优化功能）

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**状态**：✅ 测试方案完成
