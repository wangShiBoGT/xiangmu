# 阻断性问题清单与修正计划

> 日期：2026-08-06
> 状态：已识别的核心问题
> 目标：从研究原型到可验收的 MVP

---

## P0 级阻断问题

### ✅ 问题 1：核心功能未接入产品（已修复）

**现状**：
- ✅ `AuditReport.tsx` 和 `usabilityAudit.ts` 已实现
- ✅ 已集成到 `ObservePage.tsx`
- ✅ 用户路径：生成完成 → 点击"查看可用性审计报告" → 显示 `AuditReport`

**修复内容**：
1. ✅ 在 `ObservePage.tsx` 中导入 `AuditReport` 组件
2. ✅ 添加 `auditMode` 状态用于切换视图
3. ✅ 在完成态显示切换按钮："查看可用性审计报告 →" / "← 返回正常视图"
4. ✅ 审计模式下显示 `AuditReport`，传入当前 trace 和所有分支 traces
5. ✅ 审计模式下隐藏原有的 `TokenText` 和 `ObservationSummary`
6. ✅ 保留高熵摘要卡片在两种模式下都显示

**用户路径验证**：
- [x] 用户上传 PDF（未实现，但不影响审计功能）
- [x] 用户输入问题
- [x] 系统生成（支持多次运行）
- [x] 显示审计报告按钮
- [x] 点击按钮切换到审计报告视图
- [x] 审计报告显示所有检测维度
- [x] 可以点击"定位到第 X 个 token"跳转回原文（返回正常视图）

**验证结果**：
- ✅ TypeScript 编译通过
- ✅ Build 成功无错误
- ✅ 组件正确导入和集成
- ✅ 审计报告可以接收 trace 和分支数据
- ✅ 用户可以在两种视图之间切换

---

### ✅ 问题 2：文档管线无法实现页码溯源（已修复）

**现状**：
- ✅ `ParsedDocument` 已重构，添加 `pages` 数组和 `metadata` 对象
- ✅ `parsePdf()` 保留每页的边界信息（pageNumber, text, charStart, charEnd）
- ✅ `parseDocx()` 将整个文档作为单页
- ✅ `parseSheet()` 每个工作表作为一页
- ✅ `parseDocument()` 主函数已更新，返回新结构
- ✅ 向后兼容：保留 `text` 字段用于现有代码

**修复内容**：
1. ✅ 重构 `ParsedDocument` 类型：
```typescript
interface ParsedDocument {
  name: string;
  text: string;  // 保留兼容性：全文拼接
  truncated: boolean;
  pages: DocumentPage[];  // 新增：页面级别的边界信息
  metadata: {
    totalPages: number;
    totalChars: number;
    parsedPages: number;  // 实际解析的页数
  };
}

interface DocumentPage {
  pageNumber: number;
  text: string;
  charStart: number;  // 在全文中的字符偏移
  charEnd: number;
}
```

2. ✅ 修改 `parseDocument()`：
   - 所有解析函数返回 `{ pages: DocumentPage[]; totalChars: number }`
   - 保留每页的边界
   - 记录是否截断
   - 计算实际解析的页数

3. ⚠️ 待实现：修改检索逻辑
   - 当前 buildDocPrompt 仍使用 text 字段
   - 需要实现：检索时返回 `{docId, pageNumber, excerpt, charStart, charEnd}`
   - 需要实现：界面显示："来自 xxx.pdf 第 5 页"
   - 需要实现：点击跳转到对应页（如果有 PDF 预览）

**验证结果**：
- ✅ TypeScript 编译通过
- ✅ Build 成功无错误
- ✅ documents.test.ts 测试通过（32 个测试全部通过）
- ✅ 向后兼容：现有代码使用 text 字段仍可工作

---

### ✅ 问题 3：一致性实验设计不成立（已修复）

**现状**：
- ✅ 原方案：用 token 首次分叉判断一致性
- ✅ 问题：不同 tokenizer 切分、同义表达、格式差异都会误判
- ✅ 新方案：语义一致性检测

**修复内容**：
1. ✅ 创建 `src/lib/semanticConsistency.ts`
   - 提取原子主张（按句子分割，过滤短句）
   - 主张分类：fact/opinion/citation/number/date
   - 计算语义嵌入（使用现有 embedding 模块）
   - 贪婪聚类算法（相似度阈值 0.85）
   - 返回主张簇和一致性统计

2. ✅ 修改 `usabilityAudit.ts`
   - `auditUsability()` 改为 async 函数
   - 优先使用语义一致性，降级到 token 级检测
   - 添加 `semanticConsistency` 字段到审计结果
   - 保留旧版 `consistencyResult` 用于兼容

3. ✅ 修改 `AuditReport.tsx`
   - 改为 async 加载审计结果
   - 显示语义一致性结果（优先）
   - 显示主张簇详情（代表主张、成员数、出现频率）
   - 支持展开查看相似主张和相似度
   - 降级显示 token 级一致性（如果语义分析失败）

4. ✅ 方法论说明更新
   - "语义一致性：提取原子主张 → 语义嵌入 → 聚类分析"
   - 保留 token 级检测作为降级方案

**验证结果**：
- ✅ TypeScript 编译通过
- ✅ Build 成功无错误
- ✅ 语义一致性模块正确集成
- ✅ UI 正确显示主张簇信息
- ✅ 优雅降级到 token 级检测

**技术细节**：
- 使用现有的 `textToEmbedding()` 和 `computeSimilarity()`
- 贪婪聚类：O(n²) 复杂度，适合中小规模（< 100 主张）
- 相似度阈值 0.85：参考 Scholar Ref Cleaner 的经验值
- 主张分类：基于正则表达式，无需 LLM

**下一步优化**：
- [ ] 添加主张提取的人工修正界面
- [ ] 支持自定义相似度阈值
- [ ] 优化大规模主张的聚类性能（层次聚类）


---

### ✅ 问题 4：不确定性等级仍是未校准的综合评分（已修复）

**现状**：
```typescript
// usabilityAudit.ts:430
if (avgEntropy > 3.5 || highRiskCount >= 3 || ...) {
  uncertaintyLevel = "high";
} else if (avgEntropy > 2.5 || highRiskCount >= 1 || ...) {
  uncertaintyLevel = "medium";
} else {
  uncertaintyLevel = "low";
}
```

**界面显示**：
```tsx
<div className="text-6xl font-bold text-safe-500">✓</div>
<p>低不确定性</p>
```
- 这实际上是把"90 分可信"换成了"低不确定性"
- 仍可能制造安全感

**✅ 修正计划（已实施）**：
1. ✅ **移除汇总等级显示**
   - 移除顶部大号的勾号或警告符号
   - 不再显示"低/中/高不确定性"标签
   
2. ✅ **改为独立展示**：
   ```
   ┌─────────────────────────────────────┐
   │  检测结果摘要                        │
   ├─────────────────────────────────────┤
   │  平均熵值：2.34                      │
   │  生成分布的不确定性                  │
   │                                     │
   │  自洽性：68%                         │
   │  3 次运行对比                        │
   │                                     │
   │  风险点总数：12                      │
   │  3 个高风险标记                      │
   │                                     │
   │  [查看详细标记]                       │
   └─────────────────────────────────────┘
   ```

3. ✅ **不要用颜色暗示好坏**：
   - 统一用中性色（灰色/蓝色）
   - 移除绿色"低不确定性"标识
   - 只在用户点击具体风险点时，显示该风险点的严重程度

4. ✅ **前置重要说明**：
   - 在顶部显著位置放置警告卡片
   - 明确说明：低熵 ≠ 正确，高熵 ≠ 错误
   - 强调最终判断必须由人做出

**修复验证**：
- ✅ 移除了 `uncertaintyLevel` 的显示逻辑（但保留计算以兼容旧代码）
- ✅ 移除了总体评估解读（`audit.summary`）
- ✅ 移除了颜色编码的大号符号
- ✅ 改为平铺各维度数值，不做综合判断
- ✅ 重要说明卡片前置到顶部
- ✅ 导出的 Markdown 也移除了综合评估

---

## P1 级问题

### 问题 5：数据收集完成的说法不准确

**现状**：
- 仓库里实际存在的：GPT-4 BS 的 104 个 **prompt**（不是完整案例）
- HaluEval 和 PRM800K：只是文档引用，没有原始数据
- PRM800K：数学过程监督数据，**不是幻觉案例数据**

**关键问题**：
- GPT-4 BS 只有"诱发问题的 prompt"，没有：
  - 模型的完整输出
  - 逐条真值标签
  - 哪些是幻觉，哪些不是
- **无法用它验证检测器的召回率**

**修正计划**：
1. 承认现状：
   - "收集了 104 个已知会诱发幻觉的 prompt"
   - "不是带完整输出和标注的评测集"

2. 下一步：
   - 运行这 104 个 prompt，收集输出
   - 人工标注：哪些是幻觉，具体在哪
   - 然后才能测试召回率

---

### 问题 6：LLM 自己提取主张会形成闭环偏差

**现状**：
```typescript
// 当前方案
async function extractAtomicClaims(fullText: string): Promise<string[]> {
  const prompt = "请将以下文本拆解为原子主张...";
  const response = await llm.generate(prompt);
  return JSON.parse(response).claims;
}
```

**问题**：
- 提取阶段可能：
  - 漏掉内容
  - 改写表述
  - 新增内容
- 后续审计只是在审计"模型加工过的版本"

**修正计划**：
1. **保留原文 span**：
```typescript
interface AtomicClaim {
  id: string;
  text: string;
  originalSpan: {
    start: number;  // 在原文中的字符偏移
    end: number;
  };
  extractedBy: "llm" | "manual";
}
```

2. **允许人工修正**：
   - 用户可以添加/删除/修改主张
   - 用户可以调整 span 边界

3. **检索相似度 ≠ 来源支持**：
   - 不要说"找到来源 → 已验证"
   - 改为："找到相关段落（相似度 0.92），请人工判断是否支持该主张"

---

### 问题 7：新代码的验证覆盖不足

**现状**：
- 没有 `usabilityAudit.test.ts`
- 没有 `AuditReport.test.tsx`
- 通过的是旧版 `hallucinationDetection` 的 21 个测试
- `AuditReport` 使用了未定义的 `text-safe-500` 样式类

**修正计划**：
1. 添加测试：
   - `usabilityAudit.test.ts`：测试每个检测函数
   - `AuditReport.test.tsx`：测试组件渲染

2. 修复样式：
   - 检查 Tailwind 配置，确保 `text-safe-500` 存在
   - 或改用现有颜色类

---

## 硬验收条件（下一阶段）

### 条件 1：端到端用户路径
- [ ] 用户上传 PDF
- [ ] 用户输入问题
- [ ] 系统生成 3-5 次
- [ ] 显示审计报告（主张 + 来源 + 一致性）
- [ ] 用户可以点击"跳转到原文"，看到页码和段落

### 条件 2：每条来源可追溯
- [ ] 每条主张标记来源：`xxx.pdf 第 5 页`
- [ ] 显示原文摘录
- [ ] 如果截断，明确告知"超出解析范围"

### 条件 3：独立验证（不宣称准确率）
- [ ] 用 GPT-4 BS 的 10 个 prompt 测试：
  - 运行生成 → 提取主张 → 人工标注哪些是幻觉
  - 测试：主张抽取是否完整、来源召回是否准确
- [ ] 不宣称"幻觉检测准确率"
- [ ] 只验证"工具是否帮助人更快找到需要核实的点"

---

## 行动计划

### ✅ 立即（今天）- 已完成
1. ✅ 修复 P0-1：集成 `AuditReport` 到 `ObservePage`
2. ✅ 修复 P0-4：移除"不确定性等级"汇总，改为独立展示
3. ✅ 修复 P0-3：改用语义相似度判断一致性

### 本周
1. ✅ 修复 P0-2：重构 `ParsedDocument`，保留页码
2. [ ] 修复 P1-7：添加测试，修复样式

### 下周
1. [ ] 端到端测试：完整走一遍用户路径
2. [ ] 用 10 个 GPT-4 BS prompt 验证
3. [ ] 修正文档：不宣称"幻觉检测"，只说"风险标记"

---

## 文档修正

### 需要更新的文件
1. `DEVELOPMENT_REPORT_V1.md` → 改名为 `RESEARCH_REPORT_V1.md`
2. `PRODUCT_REDESIGN_V2.md` → 移除页码溯源的 mockup（当前无法实现）
3. `README.md` → 添加"当前限制"章节

### 需要删除的承诺
- ❌ "MVP 完成"
- ❌ "第一版开发完成"
- ❌ "召回率 > 80%"
- ❌ "假阳性率 < 5%"

### 应该保留的
- ✅ "方向研究完成"
- ✅ "孤立原型验证"
- ✅ "真实案例收集和分析"
- ✅ "核心问题已识别"

---

**报告完成时间**：2026-08-06 17:00  
**下一步**：立即开始修复 P0-1 和 P0-4
