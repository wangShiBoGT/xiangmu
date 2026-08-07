# 🚀 手动部署指南

由于自动部署需要交互式登录，这里提供手动部署步骤。

## 前置条件

✅ Wrangler 已安装：`4.119.0`
✅ 依赖已安装：`npm install` 完成
✅ 密钥已生成并配置在 `wrangler.toml`

---

## 步骤 1：登录 Cloudflare

```bash
wrangler login
```

**操作**：
1. 浏览器会自动打开授权页面
2. 登录你的 Cloudflare 账号
3. 点击"授权"
4. 返回终端确认登录成功

**验证**：
```bash
wrangler whoami
```

---

## 步骤 2：创建 KV 命名空间

```bash
# 创建生产环境 KV
wrangler kv namespace create "CACHE"

# 创建预览环境 KV
wrangler kv namespace create "CACHE" --preview
```

**记录输出的 ID**，例如：
```
✨ Success!
Add the following to your wrangler.toml:
kv_namespaces = [
  { binding = "CACHE", id = "abc123..." }
]
```

**更新 wrangler.toml**：
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."              # 替换为实际生产 ID
preview_id = "xyz789..."      # 替换为实际预览 ID
```

---

## 步骤 3：创建 D1 数据库

```bash
wrangler d1 create llm-chat-quota
```

**记录输出的 database_id**，例如：
```
✅ Successfully created DB 'llm-chat-quota'!
database_id = "def456..."
```

**更新 wrangler.toml**：
```toml
[[d1_databases]]
binding = "DB"
database_name = "llm-chat-quota"
database_id = "def456..."     # 替换为实际 ID
```

---

## 步骤 4：初始化数据库表

```bash
wrangler d1 execute llm-chat-quota --file=./schema.sql --remote
```

**验证**：
```bash
wrangler d1 execute llm-chat-quota --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```

**预期输出**：
```
name
----
quotas
```

---

## 步骤 5：部署到生产

```bash
wrangler deploy
```

**预期输出**：
```
Total Upload: ~1 MB
Published webgpu-llm-chat-backend
  https://webgpu-llm-chat-backend.your-account.workers.dev
```

**记录生产 URL** ✅

---

## 步骤 6：验证部署

```bash
# 设置环境变量
export BACKEND_URL="https://your-backend-url.workers.dev"

# 测试健康检查
curl $BACKEND_URL/health
```

**预期响应**：
```json
{
  "status": "ok",
  "timestamp": "2026-08-06T..."
}
```

```bash
# 测试配额查询
curl $BACKEND_URL/api/quota
```

**预期响应**：
```json
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

---

## 步骤 7：运行冒烟测试

```bash
chmod +x smoke-test.sh
./smoke-test.sh https://your-backend-url.workers.dev
```

**预期输出**：
```
================================
🔥 后端冒烟测试
================================

✅ PASS - 健康检查正常
✅ PASS - 配额查询正常
✅ PASS - 签名验证正常工作
✅ PASS - 响应时间: 350ms (< 2000ms)
✅ PASS - 5/5 请求成功

================================
📊 测试结果汇总
================================
通过: 5 / 5
失败: 0 / 5

🎉 所有测试通过！后端工作正常。
```

---

## 故障排查

### 问题 1：KV 命名空间已存在

**错误**：`Namespace already exists`

**解决**：
```bash
# 列出现有命名空间
wrangler kv namespace list

# 使用现有 ID 更新 wrangler.toml
```

---

### 问题 2：D1 数据库已存在

**错误**：`Database already exists`

**解决**：
```bash
# 列出现有数据库
wrangler d1 list

# 使用现有 database_id 更新 wrangler.toml
```

---

### 问题 3：部署失败 - 环境变量错误

**错误**：`Environment variable not set`

**解决**：
检查 `wrangler.toml` 中的：
- ENCRYPTION_SECRET（已设置）✅
- HMAC_SECRET（已设置）✅
- EMBEDDING_MODEL（已设置）✅

---

### 问题 4：CORS 错误

**解决**：
编辑 `src/index.ts`，在 CORS 配置中添加你的前端域名：

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

重新部署：
```bash
wrangler deploy
```

---

## 环境变量说明

当前已配置的密钥：

```
ENCRYPTION_SECRET = "b54dc29516c2efe72b9be50962ab574c2a8d5146e777049041ca997c456ceffc"
HMAC_SECRET = "7abdf7ccdbfc3022b798c04fac2af0b15e34c9e08d1d2c0727b2bd1249580e20"
```

⚠️ **重要**：这两个密钥必须与前端保持一致！

前端配置时需要在 `.env.production` 中设置相同的值。

---

## 下一步

部署成功后：

1. ✅ 记录后端 URL
2. ✅ 配置前端环境变量
3. ✅ 运行冒烟测试
4. ✅ 部署前端

详见：[`../TEST_PLAN.md`](../TEST_PLAN.md)

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**状态**：✅ 就绪
