# 前端开发任务清单

> 日期：2026-08-06  
> 状态：✅ 后端接口规范已完成  
> 下一步：开始前端开发

---

## ✅ 已完成：后端接口清单

**文档位置**：[`docs/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md)

**包含内容**：
1. ✅ 4 个完整的 API 接口定义（请求/响应格式）
2. ✅ 前端调用位置标注（文件名 + 函数名）
3. ✅ Mock 策略（开发模式 vs 生产模式）
4. ✅ 安全设计（API key 加密、HMAC 签名、零知识）
5. ✅ 成本估算（$9/月支撑 10 个日活用户）
6. ✅ 环境变量配置
7. ✅ 部署流程
8. ✅ 测试策略

**核心要点**：
- 前端已完成所有准备工作
- 使用环境变量 `VITE_USE_BACKEND` 切换模式
- 后端开发完成后只需修改 `.env.production` 即可接入
- 所有接口都有 Mock 实现，前端可以独立开发测试

---

## 📋 前端开发任务（按优先级）

### 🔥 P0 - 核心功能（2 周内完成）

#### Task 1：文档上传与管理
**预计工时**：1 天  
**优先级**：🔥 极高

**功能需求**：
- [ ] 文件上传组件（拖拽 + 点击上传）
- [ ] 支持 PDF/TXT 格式
- [ ] 文件大小限制（10 MB）
- [ ] 解析进度显示
- [ ] 已上传文档列表
- [ ] 删除文档功能

**技术实现**：
```typescript
// 新建文件：src/components/DocumentUpload.tsx
interface DocumentUploadProps {
  onDocumentParsed: (doc: ParsedDocument) => void;
  onError: (error: string) => void;
}
```

**调用后端 API**：
```typescript
import { parseDocumentAPI } from '@/lib/apiClient';

async function handleFileUpload(file: File) {
  try {
    setLoading(true);
    const document = await parseDocumentAPI(file);
    onDocumentParsed(document);
  } catch (error) {
    onError(error.message);
  } finally {
    setLoading(false);
  }
}
```

**UI 位置**：
- ObservePage：问题输入框上方
- 新增"上传参考文档"按钮

**验收标准**：
- ✅ 用户可以拖拽上传 PDF
- ✅ 解析成功后显示页数和字数
- ✅ 解析失败显示错误提示
- ✅ 已上传文档显示在列表中

---

#### Task 2：ObservePage 集成文档管理
**预计工时**：半天  
**优先级**：🔥 极高

**功能需求**：
- [ ] 在 ObservePage 添加文档状态管理
- [ ] 传递文档到 AuditReport 组件
- [ ] 生成完成后自动触发审计

**技术实现**：
```typescript
// src/components/ObservePage.tsx

const [uploadedDocuments, setUploadedDocuments] = useState<ParsedDocument[]>([]);

// 传递给 AuditReport
<AuditReport
  trace={root.trace}
  additionalTraces={root.children.map(c => c.trace).filter(Boolean)}
  documents={uploadedDocuments}  // ✅ 已修改
  onJumpToToken={jumpToToken}
/>
```

**验收标准**：
- ✅ 文档状态在 ObservePage 中正确管理
- ✅ AuditReport 收到文档数据
- ✅ 生成完成后自动显示审计报告

---

#### Task 3：AuditReport 显示来源标注
**预计工时**：1 天  
**优先级**：🔥 极高

**功能需求**：
- [ ] 每条主张显示来源页码
- [ ] 来源摘录（前 200 字）
- [ ] 相似度百分比
- [ ] 未找到来源时显示提示

**技术实现**：
```typescript
// src/components/AuditReport.tsx 已有基础，需完善

{member.claim.source && (
  <div className="mt-2 rounded-md bg-obs px-3 py-2">
    <p className="text-xs text-obs-ink2">
      📄 来源：{member.claim.source.docName} 第 {member.claim.source.pageNumber} 页
      （相似度 {(member.claim.source.similarity * 100).toFixed(0)}%）
    </p>
    <p className="mt-1 text-xs text-obs-ink2/70">
      "{member.claim.source.excerpt}"
    </p>
  </div>
)}

{!member.claim.source && (
  <p className="mt-2 text-xs text-obs-ink2/50">
    ⚠ 未找到明确来源，建议人工核查
  </p>
)}
```

**UI 规范**：
- 来源信息用浅色背景区分
- 摘录文本用引号包裹
- 相似度用百分比显示（0-100%）

**验收标准**：
- ✅ 有来源的主张显示页码和摘录
- ✅ 无来源的主张显示警告
- ✅ 点击来源可以跳转（可选）

---

#### Task 4：来源追溯自动触发
**预计工时**：半天  
**优先级**：🔥 极高

**功能需求**：
- [ ] 调用 `auditTracesAPI()` 时传入文档
- [ ] 后端返回带来源的主张
- [ ] 前端正确展示

**技术实现**：
```typescript
// src/components/AuditReport.tsx

useEffect(() => {
  if (!trace) return;

  async function runAudit() {
    setLoading(true);
    try {
      const result = await auditTracesAPI(
        [trace, ...additionalTraces],
        documents  // ✅ 传入文档
      );
      
      setAuditResult(result.audit);
      setClaims(result.claims);  // ✅ 包含来源信息
      setSemanticConsistency(result.semanticConsistency);
    } catch (error) {
      console.error('Audit failed:', error);
    } finally {
      setLoading(false);
    }
  }

  runAudit();
}, [trace, additionalTraces, documents]);
```

**验收标准**：
- ✅ 有文档时自动触发来源追溯
- ✅ 无文档时正常显示审计报告（不追溯来源）
- ✅ 加载中显示进度提示

---

### 🟡 P1 - 增强功能（1 周内完成）

#### Task 5：导出功能增强
**预计工时**：半天  
**优先级**：中

**功能需求**：
- [ ] 导出时包含来源信息
- [ ] JSON 格式完整
- [ ] Markdown 格式可读

**技术实现**：
```typescript
// src/components/AuditReport.tsx

function exportToJSON() {
  const data = {
    generatedAt: new Date().toISOString(),
    modelId: trace.modelId,
    audit: auditResult,
    claims: claims.map(claim => ({
      ...claim,
      source: claim.source ? {
        document: claim.source.docName,
        page: claim.source.pageNumber,
        excerpt: claim.source.excerpt,
        similarity: claim.source.similarity,
      } : null,
    })),
    semanticConsistency,
  };

  downloadJSON(data, 'audit-report.json');
}

function exportToMarkdown() {
  let md = '# AI 审计报告\n\n';
  md += `**生成时间**：${new Date().toLocaleString()}\n\n`;
  
  md += '## 主张列表\n\n';
  claims.forEach((claim, i) => {
    md += `### ${i + 1}. ${claim.text}\n\n`;
    if (claim.source) {
      md += `**来源**：${claim.source.docName} 第 ${claim.source.pageNumber} 页（相似度 ${(claim.source.similarity * 100).toFixed(0)}%）\n\n`;
      md += `> ${claim.source.excerpt}\n\n`;
    } else {
      md += `**来源**：未找到明确来源\n\n`;
    }
  });

  downloadText(md, 'audit-report.md');
}
```

**验收标准**：
- ✅ JSON 包含完整来源信息
- ✅ Markdown 格式易读
- ✅ 可以直接在 VS Code 预览

---

#### Task 6：API 模式选择 UI
**预计工时**：1 天  
**优先级**：中

**功能需求**：
- [ ] 设置页面添加"API 模式"开关
- [ ] 用户输入 API key（加密存储）
- [ ] 选择 Provider（OpenAI/Anthropic）
- [ ] 配额显示

**技术实现**：
```typescript
// 新建文件：src/components/APISettings.tsx

interface APISettingsProps {
  onSave: (config: APIConfig) => void;
}

interface APIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
}

// 加密存储到 localStorage
import CryptoJS from 'crypto-js';

function saveAPIKey(key: string) {
  const encrypted = CryptoJS.AES.encrypt(key, 'user-secret').toString();
  localStorage.setItem('api_key_encrypted', encrypted);
}

function loadAPIKey(): string | null {
  const encrypted = localStorage.getItem('api_key_encrypted');
  if (!encrypted) return null;
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, 'user-secret');
  return decrypted.toString(CryptoJS.enc.Utf8);
}
```

**UI 位置**：
- 设置页面新增"API 模式"标签页
- ObservePage 顶部显示当前模式（本地 / API）

**验收标准**：
- ✅ 用户可以输入 API key
- ✅ API key 加密存储
- ✅ 切换 Provider 时更新可用模型列表
- ✅ 显示剩余配额

---

#### Task 7：配额监控 UI
**预计工时**：半天  
**优先级**：中

**功能需求**：
- [ ] 页面顶部显示剩余次数
- [ ] 每次 API 调用后更新
- [ ] 超出配额时禁用生成按钮

**技术实现**：
```typescript
// 新建组件：src/components/QuotaDisplay.tsx

function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaResponse['data'] | null>(null);

  useEffect(() => {
    async function fetchQuota() {
      try {
        const data = await getQuota();
        setQuota(data);
      } catch (error) {
        console.error('Failed to fetch quota:', error);
      }
    }

    fetchQuota();
    
    // 每分钟刷新一次
    const interval = setInterval(fetchQuota, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!quota) return null;

  return (
    <div className="text-xs text-obs-ink2">
      今日剩余：{quota.quota.daily.remaining} / {quota.quota.daily.limit} 次
      {quota.quota.daily.remaining === 0 && (
        <span className="ml-2 text-alert-500">配额已用完</span>
      )}
    </div>
  );
}
```

**验收标准**：
- ✅ 实时显示剩余配额
- ✅ 配额用完时禁用按钮
- ✅ 显示重置时间

---

### 🟢 P2 - 优化功能（2 周内完成）

#### Task 8：错误处理优化
**预计工时**：半天  
**优先级**：低

**功能需求**：
- [ ] API 调用失败时友好提示
- [ ] 自动重试（3 次）
- [ ] 错误日志上报

**技术实现**：
```typescript
// src/lib/apiClient.ts

async function apiRequestWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

**验收标准**：
- ✅ 网络错误自动重试
- ✅ 失败后显示友好提示
- ✅ 错误日志上报到监控平台

---

#### Task 9：性能优化
**预计工时**：1 天  
**优先级**：低

**功能需求**：
- [ ] 文档解析结果缓存
- [ ] Embedding 计算结果缓存
- [ ] 审计结果缓存

**技术实现**：
```typescript
// src/lib/cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LocalCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttl: number = 7 * 24 * 60 * 60 * 1000) {
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
}

export const documentCache = new LocalCache<ParsedDocument>();
export const auditCache = new LocalCache<AuditResponse['data']>();
```

**验收标准**：
- ✅ 相同文档不重复解析
- ✅ 缓存有效期 7 天
- ✅ 缓存命中率 > 50%

---

## 📊 开发进度追踪

### Week 1（Day 1-5）
- [x] Day 1：后端接口规范完成
- [ ] Day 2：Task 1 - 文档上传组件
- [ ] Day 3：Task 2 + Task 3 - ObservePage 集成 + 来源显示
- [ ] Day 4：Task 4 - 自动触发审计
- [ ] Day 5：端到端测试 + Bug 修复

### Week 2（Day 6-10）
- [ ] Day 6：Task 5 - 导出功能增强
- [ ] Day 7：Task 6 - API 模式选择 UI
- [ ] Day 8：Task 7 - 配额监控 UI
- [ ] Day 9：Task 8 + Task 9 - 错误处理 + 性能优化
- [ ] Day 10：集成测试 + 文档更新

---

## ✅ 验收标准（2 周后）

### 功能完整性
- [x] 后端接口规范完整且准确
- [ ] 用户可以上传 PDF 文档
- [ ] 用户可以查看审计报告
- [ ] 每条主张显示来源页码
- [ ] 可以导出完整报告（JSON/Markdown）
- [ ] API 模式可以正常切换
- [ ] 配额监控正常工作

### 质量标准
- [ ] 所有功能测试通过
- [ ] 无阻断性 Bug
- [ ] TypeScript 编译无错误
- [ ] 代码风格统一

### 文档完整性
- [x] 后端 API 规范文档
- [ ] 前端组件使用文档
- [ ] 部署指南更新

---

## 🚀 立即开始

**下一步**：Task 1 - 文档上传组件

**今天要完成的**（Day 2）：
1. 创建 `src/components/DocumentUpload.tsx`
2. 实现拖拽上传功能
3. 调用 `parseDocumentAPI()` 解析文档
4. 显示解析进度
5. 测试本地 Mock 模式

**预期产出**：
- ✅ 可以上传 PDF 并解析
- ✅ 显示文档页数和字数
- ✅ 错误处理正常

---

**文档版本**：v1.0  
**创建时间**：2026-08-06  
**负责人**：[你的名字]
