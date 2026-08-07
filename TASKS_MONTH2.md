# 第二个月开发计划：权威审计功能 + 幻觉检测

> 目标：成为 AI 置信度审计的世界 Top 1 工具
> 时间：Week 5-8（第二个月）
> 战略：A（完善功能）+ B（用户验证）+ C（深化审计）组合

---

## 核心原则

**权威性标准**：
- 每个判断都有学术论文支撑
- 数值计算可溯源、可复现
- 方法论透明（不做黑盒评分）
- 假阳性率 < 5%（不能误报太多，否则失去信任）

**说服力标准**：
- 直观可视化：非技术用户 30 秒看懂
- 数据支撑：每个警示都显示"为什么"
- 对比验证：能证明"我们发现的问题确实是问题"

---

## Week 5-6：幻觉检测方法论调研 + 实现

### Task 2.2：AI 幻觉检测方法论调研与标准建立

**调研范围**：
1. **学术界主流方法**：
   - Entropy-based detection（熵值检测，已实现基础版）
   - Semantic consistency checking（语义一致性检查）
   - Self-consistency prompting（自我一致性验证）
   - Factuality scoring（事实性评分）
   - Perplexity analysis（困惑度分析）

2. **工业界实践**：
   - OpenAI 的 logprobs 最佳实践
   - Anthropic 的 Constitutional AI 安全指标
   - Google 的 Factuality benchmarks
   - Meta 的 COVE (Chain of Verification)

3. **竞品分析**：
   - Galileo (galileo.ai): Hallucination Index
   - Arthur AI: Confidence Scores
   - WhyLabs: AI Observability
   - Arize AI: Model Monitoring

**输出物**：
- `docs/HALLUCINATION_DETECTION.md`（方法论白皮书）
- `docs/RESEARCH_REFERENCES.md`（引用的学术论文列表）

**调研重点问题**：
1. 熵值阈值如何确定？（3.0 是否有学术依据？）
2. 如何区分"合理的不确定"和"危险的幻觉"？
3. 如何检测"高置信度的错误回答"（模型很确信但其实是错的）？
4. 如何处理多语言场景（中文/英文熵值分布不同）？
5. 如何量化"事实性错误"vs"创意发散"？

---

### Task 2.3：多维度幻觉检测系统

基于调研结果，实现多维度检测系统（不只是熵值）。

#### 检测维度 1：熵值异常检测（已有基础）

**优化点**：
- 动态阈值：根据模型类型和 prompt 类型调整
- 局部熵值突变检测：相邻 token 熵值突然升高 > 2.0
- 熵值分布异常：整体熵值过高或过低

**实现**：
```typescript
// src/lib/hallucinationDetection.ts

interface EntropyAnomaly {
  type: "high_entropy" | "entropy_spike" | "unstable_distribution";
  tokenIndex: number;
  entropy: number;
  threshold: number;
  severity: "low" | "medium" | "high";
  explanation: string;
}

function detectEntropyAnomalies(
  steps: TokenStep[],
  modelId: string
): EntropyAnomaly[] {
  // 1. 动态阈值（根据模型类型）
  const threshold = getDynamicThreshold(modelId);
  
  // 2. 检测高熵 token
  const highEntropy = steps
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.entropy > threshold)
    .map(({ s, i }) => ({
      type: "high_entropy",
      tokenIndex: i,
      entropy: s.entropy,
      threshold,
      severity: s.entropy > threshold * 1.5 ? "high" : "medium",
      explanation: `该词的候选分布熵值为 ${s.entropy.toFixed(2)}，超过阈值 ${threshold.toFixed(2)}，表示模型在此处较为不确定`
    }));
  
  // 3. 检测熵值突变（相邻步骤熵值差 > 2.0）
  const spikes = [];
  for (let i = 1; i < steps.length; i++) {
    const delta = steps[i].entropy - steps[i - 1].entropy;
    if (delta > 2.0) {
      spikes.push({
        type: "entropy_spike",
        tokenIndex: i,
        entropy: steps[i].entropy,
        threshold: steps[i - 1].entropy + 2.0,
        severity: delta > 3.0 ? "high" : "medium",
        explanation: `该词熵值突然升高 ${delta.toFixed(2)}，可能表示生成方向出现分叉`
      });
    }
  }
  
  return [...highEntropy, ...spikes];
}
```

---

#### 检测维度 2：自洽性检查（Self-Consistency）

**原理**：同一问题多次生成，如果答案差异很大，说明模型不确定。

**实现**：
```typescript
interface ConsistencyCheck {
  type: "inconsistent_answers";
  runs: number;
  agreementRate: number;  // 0-1，越低越不一致
  divergencePoint: number; // 首次分叉的 token 位置
  severity: "low" | "medium" | "high";
  explanation: string;
}

function checkSelfConsistency(
  traces: GenerationTrace[]
): ConsistencyCheck | null {
  if (traces.length < 2) return null;
  
  // 计算所有 trace 的首次分叉点
  const divergences = [];
  for (let i = 1; i < traces.length; i++) {
    const div = firstDivergence(traces[0].steps, traces[i].steps);
    if (div >= 0) divergences.push(div);
  }
  
  if (divergences.length === 0) return null;
  
  const avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;
  const agreementRate = 1 - (divergences.length / (traces.length - 1));
  
  return {
    type: "inconsistent_answers",
    runs: traces.length,
    agreementRate,
    divergencePoint: Math.round(avgDivergence),
    severity: agreementRate < 0.3 ? "high" : agreementRate < 0.6 ? "medium" : "low",
    explanation: `在 ${traces.length} 次生成中，${(agreementRate * 100).toFixed(0)}% 的结果一致。平均在第 ${Math.round(avgDivergence)} 个 token 出现分叉，表示模型在此处存在不确定性。`
  };
}
```

---

#### 检测维度 3：语义重复检测（Repetition Anomaly）

**原理**：幻觉常表现为循环重复、卡死在某个话题。

**实现**：
```typescript
interface RepetitionAnomaly {
  type: "repetition";
  pattern: string;
  occurrences: number;
  positions: number[];
  severity: "low" | "medium" | "high";
  explanation: string;
}

function detectRepetition(steps: TokenStep[]): RepetitionAnomaly[] {
  const text = steps.map(s => s.text).join("");
  const anomalies: RepetitionAnomaly[] = [];
  
  // 检测 n-gram 重复（n=3,4,5）
  for (let n = 3; n <= 5; n++) {
    const ngrams = new Map<string, number[]>();
    
    for (let i = 0; i <= steps.length - n; i++) {
      const gram = steps.slice(i, i + n).map(s => s.text).join("");
      if (!ngrams.has(gram)) ngrams.set(gram, []);
      ngrams.get(gram)!.push(i);
    }
    
    // 找到重复 >= 3 次的 n-gram
    for (const [gram, positions] of ngrams.entries()) {
      if (positions.length >= 3 && gram.trim().length > 5) {
        anomalies.push({
          type: "repetition",
          pattern: gram,
          occurrences: positions.length,
          positions,
          severity: positions.length >= 5 ? "high" : "medium",
          explanation: `检测到短语「${gram.trim()}」重复出现 ${positions.length} 次，可能表示模型陷入循环`
        });
      }
    }
  }
  
  return anomalies;
}
```

---

#### 检测维度 4：数字/日期/引用幻觉检测

**原理**：模型容易编造具体数字、日期、论文引用。这些内容熵值可能很低（模型很确信），但可能是错的。

**实现**：
```typescript
interface FactualAnomaly {
  type: "suspicious_number" | "suspicious_date" | "suspicious_citation";
  tokenIndex: number;
  text: string;
  entropy: number;
  severity: "low" | "medium" | "high";
  explanation: string;
  verificationHint: string;
}

function detectFactualAnomalies(steps: TokenStep[]): FactualAnomaly[] {
  const anomalies: FactualAnomaly[] = [];
  const text = steps.map(s => s.text).join("");
  
  // 检测数字（特别是百分比、具体数值）
  const numberRegex = /\d+(\.\d+)?%?/g;
  let match;
  while ((match = numberRegex.exec(text)) !== null) {
    // 找到对应的 token 位置
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0) {
      anomalies.push({
        type: "suspicious_number",
        tokenIndex,
        text: match[0],
        entropy: steps[tokenIndex].entropy,
        severity: steps[tokenIndex].entropy < 1.0 ? "high" : "low",
        explanation: `模型生成了具体数字「${match[0]}」，熵值为 ${steps[tokenIndex].entropy.toFixed(2)}。如果这是关键事实，建议人工核实。`,
        verificationHint: "具体数字容易被模型编造，特别是当熵值很低（< 1.0）时，模型可能过度自信。"
      });
    }
  }
  
  // 检测日期
  const dateRegex = /\d{4}年|\d{1,2}月\d{1,2}日|20\d{2}-\d{2}-\d{2}/g;
  while ((match = dateRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0) {
      anomalies.push({
        type: "suspicious_date",
        tokenIndex,
        text: match[0],
        entropy: steps[tokenIndex].entropy,
        severity: "medium",
        explanation: `模型生成了具体日期「${match[0]}」，建议核实时间准确性。`,
        verificationHint: "模型的时间知识截止于训练数据，可能生成错误的日期。"
      });
    }
  }
  
  // 检测论文引用格式（简化版）
  const citationRegex = /\[?\d+\]?|\(\d{4}\)|et al\./gi;
  while ((match = citationRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0) {
      anomalies.push({
        type: "suspicious_citation",
        tokenIndex,
        text: match[0],
        entropy: steps[tokenIndex].entropy,
        severity: "high",
        explanation: `检测到疑似引用标记「${match[0]}」，请核实引用的真实性。`,
        verificationHint: "模型经常编造不存在的论文引用，这是学术场景中最危险的幻觉类型。"
      });
    }
  }
  
  return anomalies;
}
```

---

### Task 2.4：审计报告页面（HallucinationReport.tsx）

**功能描述**：
- 汇总所有检测维度的结果
- 按严重程度排序
- 提供一键导出审计报告（PDF/Markdown）
- 显示"置信度评分"（0-100，越高越可信）

**UI 规范**：
```typescript
<div className="space-y-6">
  {/* 总体评分卡片 */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-obs-ink">置信度评分</h2>
        <p className="text-sm text-obs-ink2 mt-1">基于多维度幻觉检测</p>
      </div>
      <div className="text-center">
        <div className="text-6xl font-bold text-brand-500">{score}</div>
        <p className="text-xs text-obs-ink2 mt-1">满分 100</p>
      </div>
    </div>
    
    {/* 评分维度细分 */}
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div className="rounded-md border border-obs-line bg-obs p-3">
        <p className="text-xs text-obs-ink2">熵值稳定性</p>
        <p className="text-2xl font-semibold text-obs-ink mt-1">{entropyScore}</p>
      </div>
      <div className="rounded-md border border-obs-line bg-obs p-3">
        <p className="text-xs text-obs-ink2">自洽性</p>
        <p className="text-2xl font-semibold text-obs-ink mt-1">{consistencyScore}</p>
      </div>
      <div className="rounded-md border border-obs-line bg-obs p-3">
        <p className="text-xs text-obs-ink2">事实准确性</p>
        <p className="text-2xl font-semibold text-obs-ink mt-1">{factualityScore}</p>
      </div>
    </div>
  </div>
  
  {/* 检测到的异常列表 */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
    <h3 className="text-lg font-semibold text-obs-ink mb-4">检测到的异常</h3>
    {anomalies.length === 0 ? (
      <p className="text-sm text-obs-ink2">✓ 未检测到明显异常</p>
    ) : (
      <div className="space-y-3">
        {anomalies.map((anomaly, i) => (
          <div 
            key={i}
            className={`rounded-md border p-4 ${
              anomaly.severity === "high" 
                ? "border-alert-500/30 bg-alert-500/10" 
                : anomaly.severity === "medium"
                  ? "border-caution-500/30 bg-caution-500/10"
                  : "border-obs-line bg-obs"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`
                inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                ${anomaly.severity === "high" ? "bg-alert-500 text-white" : ""}
                ${anomaly.severity === "medium" ? "bg-caution-500 text-white" : ""}
                ${anomaly.severity === "low" ? "bg-obs-line text-obs-ink2" : ""}
              `}>
                !
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-obs-ink">{anomaly.type}</p>
                <p className="text-sm text-obs-ink2 mt-1">{anomaly.explanation}</p>
                {anomaly.verificationHint && (
                  <p className="text-xs text-obs-ink2/70 mt-2 italic">
                    💡 {anomaly.verificationHint}
                  </p>
                )}
                <button 
                  className="text-xs text-measure-500 hover:underline mt-2"
                  onClick={() => jumpToToken(anomaly.tokenIndex)}
                >
                  定位到第 {anomaly.tokenIndex + 1} 个 token →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  
  {/* 导出按钮 */}
  <div className="flex gap-3">
    <button className="btn-primary">导出 PDF 报告</button>
    <button className="btn-secondary">导出 Markdown</button>
    <button className="btn-secondary">复制引用格式</button>
  </div>
</div>
```

---

## Week 7-8：用户验证准备 + 文档完善

### Task 2.5：方法论透明化文档

**输出物**：
- `docs/METHODOLOGY.md`（方法论白皮书，中英文）
- `docs/FAQ.md`（常见问题解答）
- `docs/ACADEMIC_USE.md`（学术使用指南）

**METHODOLOGY.md 结构**：
```markdown
# AI 置信度审计方法论

## 1. 核心原则
- 透明性：所有检测方法公开
- 可复现性：相同输入产生相同结果
- 学术严谨：每个方法都有论文支撑

## 2. 检测维度

### 2.1 熵值异常检测
- **理论依据**：[论文引用]
- **计算方法**：H(p) = -Σ p_i * log(p_i)
- **阈值确定**：基于 [数据集] 的经验分布
- **局限性**：熵值高不一定是幻觉，可能是合理的创意发散

### 2.2 自洽性检查
- **理论依据**：Wang et al. (2022) "Self-Consistency Improves Chain of Thought Reasoning"
- **计算方法**：多次采样，计算答案一致率
- **局限性**：需要多次运行，计算成本较高

### 2.3 语义重复检测
- **理论依据**：重复是幻觉的常见表现
- **计算方法**：n-gram 频率统计
- **局限性**：合理的强调也可能触发

### 2.4 事实性检测
- **理论依据**：数字、日期、引用是高风险区域
- **计算方法**：正则匹配 + 熵值交叉验证
- **局限性**：无法验证事实真伪，只能标记风险

## 3. 评分算法

### 置信度评分公式
```
Score = w1 * EntropyScore + w2 * ConsistencyScore + w3 * FactualityScore

其中：
- EntropyScore = 100 * (1 - avgEntropy / 5)
- ConsistencyScore = 100 * agreementRate
- FactualityScore = 100 * (1 - riskFactCount / totalTokens)
- w1 = 0.4, w2 = 0.4, w3 = 0.2（权重可调）
```

## 4. 验证与标定

### 4.1 假阳性率测试
- 在高质量人工标注数据集上测试
- 目标：假阳性率 < 5%

### 4.2 召回率测试
- 在已知幻觉数据集上测试
- 目标：召回率 > 80%

## 5. 引用本工具

如果您在学术论文中使用本工具，请引用：

```bibtex
@software{webgpu_llm_observe,
  title = {WebGPU LLM Observe: AI Confidence Auditing Tool},
  author = {Wang, Shibo},
  year = {2027},
  url = {https://github.com/wangshibo/webgpu-llm-chat},
  note = {Version 1.0}
}
```

## 6. 参考文献

[完整的学术论文引用列表]
```

---

### Task 2.6：演示案例库

**功能描述**：
- 收集 10+ 个真实幻觉案例
- 每个案例展示检测结果和人工验证结果
- 证明"我们发现的问题确实是问题"

**案例类型**：
1. 编造数字（GDP、人口统计）
2. 错误日期（历史事件）
3. 虚假引用（不存在的论文）
4. 自相矛盾（前后矛盾的陈述）
5. 循环重复（卡死话题）

**展示格式**：
```markdown
## 案例 1：编造 GDP 数据

**Prompt**: "2023年中国GDP是多少？"

**模型回答**: "2023年中国GDP约为18.5万亿美元。"

**检测结果**：
- 数字「18.5万亿」熵值：0.82（低熵，模型很确信）
- 风险等级：高
- 原因：具体数字 + 低熵 = 可能过度自信

**人工核实**：
- 真实数据：17.89万亿美元（IMF 2023）
- 结论：模型编造了不准确的数字

**说明**：
这是"高置信度错误"的典型案例。模型熵值很低，看起来很确定，但数字是错的。这种幻觉最危险，因为它不会触发传统的"不确定性"警报。

我们的检测系统通过"事实性检测"维度捕获了这个风险点，提醒用户核实。
```

---

### Task 2.7：高熵标红颜色对比度优化

**修复位置**：`src/components/TokenText.tsx`

**修改内容**：
```typescript
const entropyStyle = !heat && isHighEntropy
  ? {
      backgroundColor: isCriticalEntropy
        ? 'rgba(201, 75, 75, 0.2)'  // alert-500/20
        : 'rgba(185, 132, 48, 0.2)',  // caution-500/20
      borderBottom: isCriticalEntropy
        ? '2px solid rgb(201, 75, 75)'  // alert-500
        : '2px solid rgb(185, 132, 48)',  // caution-500
      color: isCriticalEntropy
        ? '#7a2020'  // alert-900（深红色，对比度 > 4.5:1）
        : '#6b4423',  // caution-900（深棕色，对比度 > 4.5:1）
    }
  : undefined;
```

---

## Week 8：批量实验对比功能

### Task 2.8：批量对比视图（CompareMultipleView.tsx）

**功能描述**：
- 对比 3-5 个相同 prompt 的实验
- 计算自洽性评分
- 可视化分叉点分布
- 生成"稳定性报告"

**UI 规范**：
```typescript
<div className="space-y-6">
  {/* 自洽性评分 */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
    <h3 className="text-lg font-semibold text-obs-ink">自洽性评分</h3>
    <div className="mt-4 text-4xl font-bold text-brand-500">{consistencyScore}%</div>
    <p className="text-sm text-obs-ink2 mt-2">
      在 {runs.length} 次运行中，{agreementCount} 次结果一致
    </p>
  </div>
  
  {/* 分叉点热力图 */}
  <div className="rounded-xl border border-obs-line bg-obs-2 p-6">
    <h3 className="text-lg font-semibold text-obs-ink mb-4">分叉点分布</h3>
    <DivergenceHeatmap runs={runs} />
  </div>
  
  {/* 并排文本对比（最多 5 列）*/}
  <div className="grid grid-cols-5 gap-3">
    {runs.map((run, i) => (
      <div key={i} className="rounded-md border border-obs-line bg-obs-2 p-3">
        <p className="text-xs text-obs-ink2 mb-2">运行 {i + 1}</p>
        <TokenText steps={run.steps} mini />
      </div>
    ))}
  </div>
</div>
```

---

## 成果验收标准

### Week 5-6 完成后：
- ✅ `docs/HALLUCINATION_DETECTION.md` 方法论白皮书完成
- ✅ 至少 3 个学术论文引用支撑每个检测维度
- ✅ `HallucinationReport.tsx` 审计报告页面完成
- ✅ 置信度评分算法实现并测试
- ✅ 假阳性率 < 5%，召回率 > 80%（在标注数据集上）

### Week 7-8 完成后：
- ✅ `docs/METHODOLOGY.md` 完整方法论文档（中英文）
- ✅ 10+ 个真实幻觉案例收集和验证
- ✅ 高熵标红颜色对比度优化完成
- ✅ 批量对比功能完成
- ✅ 演示视频录制完成
- ✅ 准备好在 Reddit r/MachineLearning 发布

---

## 技术栈补充

**新增依赖**：
- `jsPDF`：生成 PDF 报告
- `marked`：生成 Markdown 报告
- `recharts` 或 `d3.js`：复杂数据可视化（分叉点热力图）

**测试覆盖**：
- `hallucinationDetection.test.ts`：单元测试
- `HallucinationReport.test.tsx`：组件测试
- E2E 测试：完整审计流程

---

## 竞争优势（为什么我们是 Top 1）

1. **透明性**：所有方法公开，不做黑盒评分
2. **学术严谨**：每个维度都有论文支撑
3. **多维度**：不只是熵值，还有自洽性、语义重复、事实性
4. **可复现**：相同输入永远产生相同结果
5. **直观可视化**：非技术用户 30 秒看懂
6. **零成本**：浏览器本地运行，不需要付费 API

**对标竞品**：
- Galileo：闭源黑盒，定价昂贵（$500+/月）
- Arthur AI：企业级，复杂度高
- WhyLabs：监控为主，审计功能较弱

**我们的定位**：
- 科研机构首选（透明 + 可引用）
- 完全开源（可审计、可改进）
- 零成本运行（本地浏览器）

---

## 立即开始调研

我现在开始调研 AI 幻觉检测的学术和工业界方法，完成后直接开始开发。

调研清单：
1. [ ] Google Scholar 搜索："LLM hallucination detection"
2. [ ] 阅读 OpenAI/Anthropic 官方文档关于 logprobs 的最佳实践
3. [ ] 分析 Galileo AI 的公开材料
4. [ ] 查找 "Self-Consistency" 相关论文
5. [ ] 整理所有引用到 `docs/RESEARCH_REFERENCES.md`
