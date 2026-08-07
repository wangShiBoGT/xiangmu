# MVP 交付计划 - 明确的完成线

> 目标：2 周内交付一个**可上线、可演示、功能完整**的产品  
> 完成标准：用户能从头到尾走完一个完整流程，看到有价值的结果

---

## 🎯 MVP 核心价值

**一句话定位**：让用户看到 AI 哪句话在瞎猜，有数据支撑

**用户故事**：
```
作为研究者
我上传一个 PDF，问 AI 一个问题
AI 回答后，我能看到：
- 哪些词是瞎猜的（高熵标红）
- 哪些主张是编造的（引用、数字、日期）
- 多次运行是否一致（语义对比）
- 每条主张来自 PDF 的哪一页（来源追溯）

然后我能导出报告，用于论文的 Methods 章节
```

---

## ✅ MVP 功能清单（砍掉所有不必要的）

### 前端（已有 90%）
- [x] 用户上传 PDF
- [x] 用户输入问题
- [x] AI 生成回答（本地模型）
- [x] 显示审计报告（AuditReport 组件）
- [x] 高熵 token 标红
- [x] 导出 JSON/Markdown 报告
- [ ] **缺失**：来源追溯 UI（显示"来自 xxx.pdf 第 5 页"）

### 后端（0%，但非必需）
- ❌ API 代理（砍掉，MVP 只支持本地模型）
- ❌ 文档解析（前端已有，用现成的）
- ❌ RAG 检索（前端实现简单版）

---

## 🚫 MVP 不做的事（砍掉 80% 功能）

| 功能 | 决策 | 原因 |
|------|------|------|
| API 代理 | ❌ 不做 | 增加复杂度，MVP 只支持本地模型 |
| 后端开发 | ❌ 不做 | 前端已能跑通完整流程 |
| 多 API 适配 | ❌ 不做 | MVP 只支持 Qwen/Llama |
| 浏览器插件 | ❌ 不做 | 6 个月后再说 |
| 社区运营 | ❌ 不做 | 只做工具，不做社群 |
| 3D 可视化 | ❌ 不做 | 研究者要数字，不是动画 |
| Agent/RAG 页面迭代 | ❌ 不做 | 冻结现有功能 |

---

## 📋 MVP 最终任务清单（2 周完成）

### Week 1（3 个任务，5 天）

#### Task MVP-1：RAG 来源追溯（前端简单版）
**工期**：2 天 | **优先级**：🔥 P0

**目标**：每条主张能显示"来自 xxx.pdf 第 5 页"

**实现方案（前端，不依赖后端）**：
```typescript
// 1. 用现有的 embedding 模块（已有）
// 2. 简单的余弦相似度检索
async function findClaimSource(
  claim: AtomicClaim,
  documents: ParsedDocument[]
): Promise<ClaimSource | null> {
  const claimEmbedding = await textToEmbedding(claim.text);
  
  let bestMatch: ClaimSource | null = null;
  let bestSimilarity = 0;
  
  for (const doc of documents) {
    for (const page of doc.pages) {
      const pageEmbedding = await textToEmbedding(page.text);
      const similarity = computeSimilarity(claimEmbedding, pageEmbedding).cosine;
      
      if (similarity > bestSimilarity && similarity > 0.7) {
        bestSimilarity = similarity;
        bestMatch = {
          docName: doc.name,
          pageNumber: page.pageNumber,
          excerpt: page.text.slice(0, 200),
          similarity
        };
      }
    }
  }
  
  return bestMatch;
}
```

**UI 修改**（AuditReport.tsx）：
```tsx
{cluster.members.map((member) => (
  <div>
    <p>{member.claim.text}</p>
    {member.claim.source && (
      <p className="text-xs text-obs-ink2 mt-1">
        📄 来源：{member.claim.source.docName} 第 {member.claim.source.pageNumber} 页
        （相似度 {(member.claim.source.similarity * 100).toFixed(0)}%）
      </p>
    )}
  </div>
))}
```

**验收标准**：
- ✅ 用户上传 PDF + 提问
- ✅ 审计报告中每条主张显示来源页码
- ✅ 点击"查看原文"高亮对应段落（可选）

---

#### Task MVP-2：端到端测试与 Bug 修复
**工期**：2 天 | **优先级**：🔥 P0

**测试清单**：
1. [ ] 上传 PDF → 解析成功，显示页数
2. [ ] 输入问题 → 生成回答
3. [ ] 点击"查看审计报告" → 显示完整报告
4. [ ] 主张显示来源页码 → 数据准确
5. [ ] 导出 JSON/Markdown → 格式正确
6. [ ] 多次运行 → 语义一致性检测正常

**Bug 修复**：
- [ ] 修复所有测试失败（18 个）
- [ ] 修复样式问题（未定义的 Tailwind 类）
- [ ] 性能优化（embedding 计算慢）

---

#### Task MVP-3：文档与演示准备
**工期**：1 天 | **优先级**：高

**输出物**：
1. `README.md` 更新
   - 添加"快速开始"章节
   - 添加演示 GIF
   - 添加"当前限制"章节

2. `docs/USER_GUIDE.md`（用户手册）
   - 如何上传 PDF
   - 如何查看审计报告
   - 如何解读结果

3. 演示视频（3 分钟）
   - 上传论文 PDF
   - 问："Transformer 用了多少个注意力头？"
   - 展示审计报告：来源第 5 页、置信度分析

---

### Week 2（2 个任务，3 天）

#### Task MVP-4：部署准备
**工期**：2 天 | **优先级**：🔥 P0

**部署清单**：
1. [ ] GitHub Pages 部署配置
2. [ ] CNAME 配置（如果有自定义域名）
3. [ ] 生产环境构建优化
4. [ ] 错误监控（Sentry 可选）
5. [ ] 使用文档链接检查

**验收标准**：
- ✅ 部署成功，用户能访问
- ✅ PDF 上传正常工作
- ✅ 模型加载速度可接受（< 30 秒）

---

#### Task MVP-5：发布与推广准备
**工期**：1 天 | **优先级**：中

**发布清单**：
1. [ ] 撰写发布帖（HN / Reddit r/LocalLLaMA）
   - 标题："Show HN: AI Confidence Visualization - See which words your LLM is guessing"
   - 正文：问题 + 解决方案 + 演示链接
   
2. [ ] GitHub README 优化
   - 添加 badges（build status, license）
   - 添加 star 请求（"如果觉得有用，请给个 star"）

3. [ ] Twitter/X 发布
   - 演示 GIF + 一句话介绍
   - @ 相关账号（AI 研究者）

---

## ✅ MVP 完成标准（明确的结束线）

### 功能完整性
- [x] 用户能上传 PDF
- [x] 用户能输入问题
- [x] AI 能生成回答（本地模型）
- [x] 用户能查看审计报告
- [ ] **每条主张显示来源页码**（唯一缺失的功能）
- [x] 用户能导出报告

### 质量标准
- [ ] 端到端测试全部通过
- [ ] 无阻断性 Bug
- [ ] 部署成功，可公开访问

### 文档完整性
- [ ] README.md 有"快速开始"
- [ ] 有用户手册
- [ ] 有演示视频或 GIF

### 推广准备
- [ ] 发布帖撰写完成
- [ ] GitHub README 优化完成

---

## 📅 2 周时间表

```
Week 1
│
├─ Day 1-2: Task MVP-1 - RAG 来源追溯（前端简单版）
├─ Day 3-4: Task MVP-2 - 端到端测试 + Bug 修复
└─ Day 5:   Task MVP-3 - 文档与演示准备

Week 2
│
├─ Day 1-2: Task MVP-4 - 部署准备
└─ Day 3:   Task MVP-5 - 发布与推广准备

🎉 Day 3 下午：MVP 上线！
```

---

## 🎯 MVP 之后的路线图（不在本次范围）

### 阶段 2：API 桥接（3 个月后）
- 支持 OpenAI/Anthropic API
- 后端开发
- 付费用户支持

### 阶段 3：工作流集成（6 个月后）
- 浏览器插件
- Jupyter/Notion 集成

---

## 🚀 立即行动

**今天开始：Task MVP-1 - RAG 来源追溯**

**验收标准（2 天后）**：
- ✅ 用户上传 PDF 后，审计报告中每条主张显示"来自 xxx.pdf 第 X 页"
- ✅ 相似度 > 70% 才显示来源
- ✅ 如果找不到来源，显示"未找到明确来源"

**代码修改清单**：
1. `src/lib/rag.ts`（新建）- 检索逻辑
2. `src/lib/usabilityAudit.ts`（修改）- 调用检索
3. `src/components/AuditReport.tsx`（修改）- 显示来源

---

**这就是完整的 MVP 计划，2 周后有明确的完成线：产品上线 ✅**

需要我立即开始 Task MVP-1 吗？
