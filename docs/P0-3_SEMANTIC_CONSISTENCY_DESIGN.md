# P0-3: 改用语义相似度判断一致性

> 日期：2026-08-06
> 状态：设计阶段
> 目标：从 token 级别分叉检测改为语义级别主张聚类

---

## 当前问题

### 现有实现（token 首次分叉）
```typescript
function firstDivergence(steps1: TokenStep[], steps2: TokenStep[]): number {
  const minLen = Math.min(steps1.length, steps2.length);
  for (let i = 0; i < minLen; i++) {
    if (steps1[i].text !== steps2[i].text) {
      return i;
    }
  }
  return -1;
}
```

### 问题
1. **不同 tokenizer 切分 → 误判不一致**
   - 运行 1：`["The", " Transformer", " uses", " h", "=", "8", " attention", " heads"]`
   - 运行 2：`["The", " Transformer", " uses", " h=8", " attention", " heads"]`
   - 结果：在 token 3 处判定为"不一致"，但语义完全相同

2. **同义表达 → 误判不一致**
   - 运行 1：`"The model uses 8 attention heads"`
   - 运行 2：`"The model employs 8 attention heads"`
   - 结果：在 token 2 处判定为"不一致"，但语义一致

3. **格式差异 → 误判不一致**
   - 运行 1：`"The paper was published in 2017"`
   - 运行 2：`"The paper was published in 2017."`
   - 结果：标点符号差异被判定为"不一致"

4. **顺序变化 → 误判不一致**
   - 运行 1：`"The model uses 8 heads and 512 dimensions"`
   - 运行 2：`"The model uses 512 dimensions and 8 heads"`
   - 结果：语义一致但结构不同

---

## 参考项目设计

### NabaOS - Anumāna（比量）分类
- **比量**：从工具数据推断出的内容
- **验证方法**：独立重新获取数据、重放计算、交叉检查
- **关键洞察**：不要直接比对文本，而是验证推断的逻辑链条

### Scholar Ref Cleaner - 相似度阈值
- **>85%**：已验证（Verified）
- **50-85%**：存疑（Ambiguous）
- **<50%**：风险（Not Found）
- **关键洞察**：宽容的匹配策略，容忍小幅差异

### FactLite Issue #1 的批评
- **Self-bias 问题**：用 LLM 判断 LLM 的一致性是不可靠的
- **改进建议**：提取原子主张 → 语义嵌入 → 聚类
- **关键洞察**：不要用 LLM 判断，用确定性算法（嵌入 + 余弦相似度）

---

## 新设计：语义一致性检测

### 核心流程
```
1. 提取原子主张（Atomic Claims）
   ↓
2. 计算语义嵌入（Embeddings）
   ↓
3. 聚类相似主张（Clustering）
   ↓
4. 统计一致性率（Consistency Rate）
```

### 步骤 1: 提取原子主张

#### 原子主张定义
```typescript
interface AtomicClaim {
  id: string;               // 唯一标识
  text: string;             // 主张文本
  startToken: number;       // 起始 token 索引
  endToken: number;         // 结束 token 索引
  category: "fact" | "opinion" | "citation" | "number" | "date";
  runId: number;            // 来自第几次运行
}
```

#### 提取策略（无需 LLM）
```typescript
function extractAtomicClaims(trace: GenerationTrace, runId: number): AtomicClaim[] {
  const claims: AtomicClaim[] = [];
  const text = trace.steps.map(s => s.text).join("");
  
  // 1. 按句子分割（简单规则）
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentTokenIndex = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) continue; // 太短的句子跳过
    
    // 计算 token 范围
    const startToken = currentTokenIndex;
    const endToken = findTokenEnd(trace.steps, currentTokenIndex, trimmed);
    
    // 分类
    const category = categorizeClaim(trimmed);
    
    claims.push({
      id: `run${runId}_claim${claims.length}`,
      text: trimmed,
      startToken,
      endToken,
      category,
      runId
    });
    
    currentTokenIndex = endToken + 1;
  }
  
  return claims;
}

function categorizeClaim(text: string): AtomicClaim["category"] {
  // 引用模式
  if (/\(\d{4}\)|\[\d+\]|et al\./i.test(text)) {
    return "citation";
  }
  
  // 日期模式
  if (/\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b/i.test(text)) {
    return "date";
  }
  
  // 数字模式
  if (/\b\d+(\.\d+)?%?(\s*(million|billion|thousand))?\b/i.test(text)) {
    return "number";
  }
  
  // 意见模式（主观词）
  if (/\b(I think|believe|feel|suggest|might|could|should|probably|possibly)\b/i.test(text)) {
    return "opinion";
  }
  
  // 默认为事实性陈述
  return "fact";
}
```

### 步骤 2: 计算语义嵌入

#### 使用现有的 Embedding 模型
```typescript
// 利用项目中已有的 ONNX Embedding 模型
import { computeEmbedding } from "./embedding";

async function computeClaimEmbeddings(claims: AtomicClaim[]): Promise<Map<string, Float32Array>> {
  const embeddings = new Map<string, Float32Array>();
  
  for (const claim of claims) {
    const embedding = await computeEmbedding(claim.text);
    embeddings.set(claim.id, embedding);
  }
  
  return embeddings;
}

// 余弦相似度
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 步骤 3: 聚类相似主张

#### 聚类算法（简单贪婪算法）
```typescript
interface ClaimCluster {
  representative: AtomicClaim;
  members: Array<{
    claim: AtomicClaim;
    similarity: number;
  }>;
  consistencyRate: number;
}

function clusterClaims(
  claims: AtomicClaim[],
  embeddings: Map<string, Float32Array>,
  similarityThreshold: number = 0.85
): ClaimCluster[] {
  const clusters: ClaimCluster[] = [];
  const visited = new Set<string>();
  
  for (const claim of claims) {
    if (visited.has(claim.id)) continue;
    
    const embedding = embeddings.get(claim.id)!;
    const cluster: ClaimCluster = {
      representative: claim,
      members: [{ claim, similarity: 1.0 }],
      consistencyRate: 0
    };
    
    visited.add(claim.id);
    
    // 找到所有相似的主张
    for (const otherClaim of claims) {
      if (visited.has(otherClaim.id)) continue;
      if (otherClaim.runId === claim.runId) continue; // 同一次运行不比较
      
      const otherEmbedding = embeddings.get(otherClaim.id)!;
      const similarity = cosineSimilarity(embedding, otherEmbedding);
      
      if (similarity >= similarityThreshold) {
        cluster.members.push({ claim: otherClaim, similarity });
        visited.add(otherClaim.id);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}
```

### 步骤 4: 统计一致性率

#### 计算整体一致性
```typescript
interface SemanticConsistencyResult {
  runs: number;
  totalClaims: number;
  consistentClaims: number;  // 出现在多次运行中的主张
  inconsistentClaims: number; // 只出现在一次运行中的主张
  consistencyRate: number;
  clusters: ClaimCluster[];
  severity: AnomalySeverity;
  explanation: string;
}

function computeSemanticConsistency(
  traces: GenerationTrace[],
  similarityThreshold: number = 0.85
): SemanticConsistencyResult {
  // 1. 提取所有运行的主张
  const allClaims: AtomicClaim[] = [];
  for (let i = 0; i < traces.length; i++) {
    const claims = extractAtomicClaims(traces[i], i);
    allClaims.push(...claims);
  }
  
  // 2. 计算嵌入
  const embeddings = await computeClaimEmbeddings(allClaims);
  
  // 3. 聚类
  const clusters = clusterClaims(allClaims, embeddings, similarityThreshold);
  
  // 4. 统计
  const consistentClusters = clusters.filter(c => c.members.length >= 2);
  const inconsistentClusters = clusters.filter(c => c.members.length === 1);
  
  const consistentClaims = consistentClusters.reduce((sum, c) => sum + c.members.length, 0);
  const inconsistentClaims = inconsistentClusters.length;
  
  const consistencyRate = consistentClaims / allClaims.length;
  
  // 5. 生成解释
  const severity: AnomalySeverity = 
    consistencyRate >= 0.7 ? "low" :
    consistencyRate >= 0.4 ? "medium" : "high";
  
  const explanation = `在 ${traces.length} 次运行中，${consistentClaims} 条主张（${(consistencyRate * 100).toFixed(0)}%）在多次运行中语义一致，${inconsistentClaims} 条主张仅在单次运行中出现。`;
  
  return {
    runs: traces.length,
    totalClaims: allClaims.length,
    consistentClaims,
    inconsistentClaims,
    consistencyRate,
    clusters,
    severity,
    explanation
  };
}
```

---

## 实现计划

### Phase 1: 基础功能（本周）
1. ✅ 设计文档完成
2. [ ] 实现 `extractAtomicClaims()`
3. [ ] 实现 `computeClaimEmbeddings()`（复用现有 embedding 模块）
4. [ ] 实现 `clusterClaims()`
5. [ ] 实现 `computeSemanticConsistency()`

### Phase 2: 集成到审计模块（本周）
6. [ ] 修改 `usabilityAudit.ts`：
   - 保留旧的 `checkSelfConsistency()` 标记为 deprecated
   - 添加新的 `checkSemanticConsistency()`
   - `auditUsability()` 切换到新方法
7. [ ] 修改 `AuditReport.tsx`：
   - 显示语义一致性结果
   - 显示聚类详情（可展开查看每个簇）

### Phase 3: 测试和优化（下周）
8. [ ] 添加测试用例：
   - 同义表达应该被识别为一致
   - 格式差异应该被容忍
   - 顺序变化应该正确处理
9. [ ] 性能优化：
   - 缓存 embedding 结果
   - 批量计算相似度
10. [ ] 用户反馈：
    - 相似度阈值是否合理？
    - 簇展示是否清晰？

---

## 技术决策

### 为什么不用 LLM 判断？
- **Self-bias 问题**：验证 LLM 和生成 LLM 能力相当时，共享知识盲区
- **成本问题**：每次审计调用 LLM 会增加延迟和成本
- **确定性问题**：LLM 的判断不稳定，同样的输入可能得到不同结果
- **FactLite Issue #1 的教训**：确定性算法优于 LLM 判断

### 为什么用语义嵌入？
- **项目已有基础**：已有 ONNX Embedding 模型
- **确定性**：相同输入总是得到相同嵌入
- **成本低**：本地计算，无需调用 API
- **速度快**：嵌入计算 < 100ms

### 相似度阈值如何选择？
- **参考 Scholar Ref Cleaner**：>85% 视为已验证
- **初始值**：0.85
- **可调整**：在界面提供滑块让用户调整
- **未来优化**：收集用户反馈后动态调整

---

**设计完成时间**：2026-08-06 21:00  
**状态**：设计完成，等待实现
