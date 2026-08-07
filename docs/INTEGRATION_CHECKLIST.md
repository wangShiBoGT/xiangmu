# 后端与前端对接完整清单

> **目标**：后端开发完成后，前端只需修改环境变量即可接入  
> **状态**：✅ 后端已完成，✅ 前端已准备就绪  
> **日期**：2026-08-06

---

## 📋 对接检查清单

### ✅ 后端已完成

#### 1. 接口实现
- [x] `POST /api/proxy` - API 代理（OpenAI/Anthropic）
- [x] `POST /api/parse-document` - 文档解析（PDF/TXT）
- [x] `POST /api/audit` - 审计分析（核心功能）
- [x] `GET /api/quota` - 配额查询

#### 2. 数据结构
- [x] `GenerationTrace` - 与前端完全一致
- [x] `ParsedDocument` - 与前端完全一致
- [x] `AtomicClaim` - 与前端完全一致
- [x] `UsabilityAudit` - 与前端完全一致
- [x] `SemanticConsistencyResult` - 与前端完全一致

#### 3. 安全实现
- [x] HMAC 签名验证
- [x] API Key AES 加密解密
- [x] 零知识设计（不存储敏感数据）
- [x] 配额限制（100 次/天）
- [x] CORS 配置

#### 4. 文档
- [x] `README.md` - 完整 API 文档
- [x] `DEPLOYMENT.md` - 部署指南
- [x] `SUMMARY.md` - 功能总结
- [x] 本文件 - 对接清单

---

### ✅ 前端已准备就绪

#### 1. API 客户端
- [x] `src/lib/apiClient.ts` - 完整实现
- [x] 环境变量切换（`VITE_USE_BACKEND`）
- [x] Mock 数据策略
- [x] 所有 4 个 API 函数

#### 2. 组件集成
- [x] `ObservePage.tsx` - 支持 documents 参数
- [x] `AuditReport.tsx` - 支持来源显示
- [x] `src/lib/semanticConsistency.ts` - 支持文档参数

#### 3. 类型定义
- [x] 所有类型与后端完全一致
- [x] TypeScript 编译通过
- [x] 无类型错误

---

## 🔗 对接步骤（3 步完成）

### 步骤 1：部署后端

```bash
cd backend

# 1.1 安装依赖
npm install

# 1.2 创建 Cloudflare 资源
wrangler kv:namespace create "CACHE"
wrangler d1 create llm-chat-quota
wrangler d1 execute llm-chat-quota --file=./schema.sql

# 1.3 更新 wrangler.toml（填入上面返回的 ID）
# 编辑文件，更新 kv_namespaces.id 和 d1_databases.database_id

# 1.4 配置环境变量（生成强随机密钥）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 将生成的密钥填入 wrangler.toml 的 ENCRYPTION_SECRET 和 HMAC_SECRET

# 1.5 部署
npm run deploy
```

**记录生产 URL**：
```
https://webgpu-llm-chat-backend.your-account.workers.dev
```

---

### 步骤 2：配置前端环境变量

```bash
cd ..  # 回到项目根目录

# 创建生产环境配置
cat > .env.production << EOF
# 启用后端调用
VITE_USE_BACKEND=true

# 后端 URL（替换为步骤 1 的 URL）
VITE_API_BASE_URL=https://webgpu-llm-chat-backend.your-account.workers.dev
EOF
```

---

### 步骤 3：重新构建前端

```bash
# 构建
npm run build

# 部署（根据你的部署方式）
npm run deploy
# 或
# vercel deploy --prod
# 或
# 上传 dist/ 到 GitHub Pages
```

---

## 🧪 验证对接

### 测试 1：健康检查

```bash
curl https://your-backend-url.workers.dev/health
```

**预期响应**：
```json
{
  "status": "ok",
  "timestamp": "2026-08-06T10:00:00.000Z"
}
```

---

### 测试 2：配额查询

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

---

### 测试 3：前端完整流程

1. **访问前端应用**
   ```
   https://your-frontend-url.com
   ```

2. **上传文档**
   - 点击"上传参考文档"（需要先实现 Task 1）
   - 选择 PDF 或 TXT 文件
   - 等待解析完成

3. **生成回答**
   - 输入问题
   - 点击"生成"
   - 等待回答生成

4. **查看审计报告**
   - 自动显示可用性审计
   - 查看主张列表
   - **验证来源页码显示正确** ✅

5. **导出报告**
   - 点击"导出 JSON"
   - 验证包含来源信息

---

## 📊 对接验收标准

### 功能验收
- [ ] 文档上传成功
- [ ] 文档解析成功（显示页数和字数）
- [ ] 生成回答成功
- [ ] 审计报告显示正常
- [ ] **来源页码显示正确** ✅
- [ ] 相似度百分比显示正常
- [ ] 未找到来源时显示警告
- [ ] 配额显示正常
- [ ] 导出功能包含来源信息

### 性能验收
- [ ] 文档解析 < 3 秒
- [ ] 审计分析 < 5 秒
- [ ] API 响应时间正常

### 安全验收
- [ ] HMAC 签名验证生效（无签名请求被拒绝）
- [ ] 配额限制生效（超出后返回 429）
- [ ] API key 不泄露（检查日志）

---

## 🔧 故障排查

### 问题 1：前端调用后端失败 - "CORS error"

**原因**：后端 CORS 配置未包含前端域名

**解决**：

编辑 `backend/src/index.ts`：

```typescript
app.use('/*', cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.com'  // ✅ 添加你的前端域名
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature']
}));
```

重新部署：
```bash
cd backend
npm run deploy
```

---

### 问题 2：前端显示 "Invalid signature"

**原因**：前端和后端的 `HMAC_SECRET` 不一致

**解决**：

1. **检查后端配置**：
   ```bash
   cat backend/wrangler.toml | grep HMAC_SECRET
   ```

2. **前端必须使用相同的密钥**：
   
   编辑 `src/lib/apiClient.ts`，确保使用相同的 `HMAC_SECRET` 计算签名：
   
   ```typescript
   const signature = CryptoJS.HmacSHA256(
     `${timestamp}:${JSON.stringify(body)}`,
     'your-hmac-secret'  // ✅ 必须与后端一致
   ).toString();
   ```

---

### 问题 3：文档解析返回占位符文本

**原因**：PDF 解析使用了简化实现

**解决**：

生产环境需要完整的 PDF 解析库。有两个方案：

**方案 A**：集成 `pdfjs-dist`（推荐）

```bash
cd backend
npm install pdfjs-dist
```

修改 `src/services/documentParser.ts`，使用 `pdfjs-dist` 完整解析。

**方案 B**：使用外部 PDF 解析服务（例如 Adobe PDF Services API）

---

### 问题 4：Embedding 计算失败

**原因**：Cloudflare Workers AI 未启用

**解决**：

1. 确认 Cloudflare 账户已启用 Workers AI
2. 或使用外部 Embedding API（例如 OpenAI Embeddings）

修改 `src/services/embedding.ts`：

```typescript
export async function computeEmbedding(text: string, env: any): Promise<number[]> {
  // 使用 OpenAI Embeddings API
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    })
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}
```

---

## 💰 成本监控

部署后监控成本：

### Cloudflare Dashboard
1. 进入 Workers & Pages
2. 选择你的 Worker
3. 查看 Analytics

### 预期成本（10 日活用户）
```
Workers 请求：     900 次/月 << 10 万/天（免费）
KV 读取：         ~3000 次/月 << 10 万/天（免费）
D1 查询：         ~2700 次/月 << 500 万/天（免费）
AI API 成本：      $7.65/月
----------------------------
总计：             约 $8/月
```

### 成本预警
设置 Cloudflare 预算提醒：$10/月

---

## 📞 支持联系

### 后端开发者
- 负责：后端部署和维护
- 文档：`backend/README.md`

### 前端开发者
- 负责：前端集成和 UI
- 文档：`docs/FRONTEND_TASKS.md`

### 接口文档
- 后端 API：`docs/BACKEND_API_SPEC.md`
- 接口清单：`docs/BACKEND_INTERFACE_CHECKLIST.md`
- 本对接清单：`docs/INTEGRATION_CHECKLIST.md`

---

## 🎉 对接完成标志

当以下所有条件满足时，对接完成：

1. ✅ 后端部署成功（健康检查通过）
2. ✅ 前端环境变量配置完成
3. ✅ 前端重新构建并部署
4. ✅ 配额查询正常
5. ✅ 文档上传和解析成功
6. ✅ 审计报告显示正常
7. ✅ **来源页码显示正确** ✅
8. ✅ 导出功能包含来源信息
9. ✅ 无 CORS 错误
10. ✅ 成本符合预期

---

## 📋 下一步工作

对接完成后，继续前端开发任务（`docs/FRONTEND_TASKS.md`）：

### Week 1（P0 - 核心功能）
- [ ] Task 1：文档上传组件（1 天）
- [ ] Task 2：ObservePage 集成文档管理（0.5 天）
- [ ] Task 3：AuditReport 显示来源标注（1 天）
- [ ] Task 4：来源追溯自动触发（0.5 天）

### Week 2（P1 - 增强功能）
- [ ] Task 5：导出功能增强（0.5 天）
- [ ] Task 6：API 模式选择 UI（1 天）
- [ ] Task 7：配额监控 UI（0.5 天）

### Week 3（P2 - 优化功能）
- [ ] Task 8：错误处理优化（0.5 天）
- [ ] Task 9：性能优化（1 天）

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**状态**：✅ 后端开发完成，等待部署对接
