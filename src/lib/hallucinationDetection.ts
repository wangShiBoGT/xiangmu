import type { TokenStep, GenerationTrace } from "./trace";

/**
 * 幻觉检测模块
 *
 * 基于学术研究和工业最佳实践，实现多维度幻觉检测：
 * 1. 熵值异常检测（Token-level Entropy Anomaly）
 * 2. 时间序列异常（Probability Time Series）
 * 3. 事实性风险标记（Factual Risk Markers）
 * 4. 自洽性评分（Self-Consistency）
 * 5. 语义多样性（Semantic Diversity）
 *
 * 学术依据详见：docs/HALLUCINATION_DETECTION_RESEARCH.md
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 异常严重程度 */
export type AnomalySeverity = "low" | "medium" | "high";

/** 熵值异常类型 */
export interface EntropyAnomaly {
  type: "high_entropy" | "entropy_spike" | "unstable_distribution";
  tokenIndex: number;
  entropy: number;
  threshold: number;
  severity: AnomalySeverity;
  explanation: string;
}

/** 时间序列异常类型 */
export interface TimeSeriesAnomaly {
  type: "prob_drop" | "low_prob_region" | "high_volatility";
  position: number;
  length?: number;
  severity: AnomalySeverity;
  explanation: string;
  value?: number;
}

/** 事实性风险标记 */
export interface FactualRiskMarker {
  type: "confident_number" | "date" | "citation" | "proper_noun";
  tokenIndex: number;
  text: string;
  entropy: number;
  severity: AnomalySeverity;
  hint: string;
}

/** 自洽性检查结果 */
export interface ConsistencyResult {
  runs: number;
  consistencyRate: number;
  avgDivergencePoint: number;
  severity: AnomalySeverity;
  explanation: string;
}

/** 语义多样性结果 */
export interface SemanticDiversityResult {
  diversity: number;
  severity: AnomalySeverity;
  explanation: string;
}

/** 综合幻觉分析结果 */
export interface HallucinationAnalysis {
  modelId: string;
  totalTokens: number;
  avgEntropy: number;

  // 各维度检测结果
  entropyAnomalies: EntropyAnomaly[];
  timeSeriesAnomalies: TimeSeriesAnomaly[];
  factualRiskMarkers: FactualRiskMarker[];
  consistencyResult?: ConsistencyResult;
  semanticDiversity?: SemanticDiversityResult;

  // 综合评分
  confidenceScore: number;
  overallSeverity: AnomalySeverity;
  summary: string;
}

// ============================================================================
// 维度 1：熵值异常检测
// ============================================================================

/**
 * 获取动态熵值阈值
 * 不同模型和语言的阈值可能不同
 */
function getDynamicThreshold(modelId: string): number {
  // 默认阈值
  let baseThreshold = 3.0;

  // 根据模型类型调整（未来可扩展）
  if (modelId.includes("7B")) {
    baseThreshold = 3.0;
  } else if (modelId.includes("14B")) {
    baseThreshold = 3.2;
  }

  return baseThreshold;
}

/**
 * 检测熵值异常
 *
 * 学术依据：
 * - Shannon Entropy 理论
 * - 经验阈值（基于 WebGPU LLM 实测数据）
 */
export function detectEntropyAnomalies(
  steps: TokenStep[],
  modelId: string
): EntropyAnomaly[] {
  const anomalies: EntropyAnomaly[] = [];
  const threshold = getDynamicThreshold(modelId);

  // 1. 检测高熵 token
  steps.forEach((step, i) => {
    if (step.entropy > threshold) {
      anomalies.push({
        type: "high_entropy",
        tokenIndex: i,
        entropy: step.entropy,
        threshold,
        severity: step.entropy > threshold * 1.33 ? "high" : "medium",
        explanation: `该词的候选分布熵值为 ${step.entropy.toFixed(2)}，超过阈值 ${threshold.toFixed(2)}，表示模型在此处较为不确定`
      });
    }
  });

  // 2. 检测熵值突变（相邻步骤熵值差 > 2.0）
  for (let i = 1; i < steps.length; i++) {
    const delta = steps[i].entropy - steps[i - 1].entropy;
    if (delta > 2.0) {
      anomalies.push({
        type: "entropy_spike",
        tokenIndex: i,
        entropy: steps[i].entropy,
        threshold: steps[i - 1].entropy + 2.0,
        severity: delta > 3.0 ? "high" : "medium",
        explanation: `该词熵值突然升高 ${delta.toFixed(2)}，可能表示生成方向出现分叉`
      });
    }
  }

  return anomalies;
}

// ============================================================================
// 维度 2：时间序列异常检测
// ============================================================================

/**
 * 检测时间序列异常
 *
 * 学术依据：
 * - HALT 论文（ArXiv 2602.02888）
 * - "Hallucination Assessment via Log-probs as Time series"
 */
export function detectTimeSeriesAnomalies(
  steps: TokenStep[]
): TimeSeriesAnomaly[] {
  const anomalies: TimeSeriesAnomaly[] = [];
  const probs = steps.map(s => s.prob);

  // 1. 检测概率突降（> 0.3 的下降）
  for (let i = 1; i < probs.length; i++) {
    const drop = probs[i - 1] - probs[i];
    if (drop > 0.3) {
      anomalies.push({
        type: "prob_drop",
        position: i,
        severity: drop > 0.5 ? "high" : "medium",
        value: drop,
        explanation: `概率突降 ${(drop * 100).toFixed(0)}%，从 ${(probs[i - 1] * 100).toFixed(1)}% 降至 ${(probs[i] * 100).toFixed(1)}%`
      });
    }
  }

  // 2. 检测长期低概率区域（连续 5+ tokens prob < 0.3）
  let lowProbCount = 0;
  let lowProbStart = -1;

  for (let i = 0; i < probs.length; i++) {
    if (probs[i] < 0.3) {
      if (lowProbCount === 0) {
        lowProbStart = i;
      }
      lowProbCount++;
    } else {
      if (lowProbCount >= 5) {
        anomalies.push({
          type: "low_prob_region",
          position: lowProbStart,
          length: lowProbCount,
          severity: "high",
          explanation: `连续 ${lowProbCount} 个低概率 token（< 30%），模型在此区域高度不确定`
        });
      }
      lowProbCount = 0;
    }
  }

  // 处理结尾的低概率区域
  if (lowProbCount >= 5) {
    anomalies.push({
      type: "low_prob_region",
      position: lowProbStart,
      length: lowProbCount,
      severity: "high",
      explanation: `连续 ${lowProbCount} 个低概率 token（< 30%），模型在此区域高度不确定`
    });
  }

  // 3. 检测高波动率
  if (probs.length >= 10) {
    const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
    const variance = probs.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probs.length;
    const std = Math.sqrt(variance);

    if (std > 0.25) {
      anomalies.push({
        type: "high_volatility",
        position: 0,
        length: probs.length,
        severity: std > 0.35 ? "high" : "medium",
        value: std,
        explanation: `整体概率波动率 ${(std * 100).toFixed(1)}%，表示模型生成过程不稳定`
      });
    }
  }

  return anomalies;
}

// ============================================================================
// 维度 3：事实性风险标记
// ============================================================================

/**
 * 查找字符串中某个位置对应的 token 索引
 */
function findTokenIndex(steps: TokenStep[], charIndex: number): number {
  let currentPos = 0;
  for (let i = 0; i < steps.length; i++) {
    const tokenLength = steps[i].text.length;
    if (currentPos <= charIndex && charIndex < currentPos + tokenLength) {
      return i;
    }
    currentPos += tokenLength;
  }
  return -1;
}

/**
 * 检测事实性风险标记
 *
 * 学术依据：
 * - OpenAI 最佳实践：标记需要验证的内容
 * - 经验观察：LLM 幻觉常发生在具体事实
 */
export function detectFactualRiskMarkers(
  steps: TokenStep[]
): FactualRiskMarker[] {
  const markers: FactualRiskMarker[] = [];
  const text = steps.map(s => s.text).join("");

  // 1. 检测具体数字（特别是百分比、具体数值）
  const numberRegex = /\d+(\.\d+)?%?/g;
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0 && tokenIndex < steps.length) {
      const entropy = steps[tokenIndex].entropy;

      // 低熵数字特别危险（模型很确信但可能是编造的）
      if (entropy < 1.5) {
        markers.push({
          type: "confident_number",
          tokenIndex,
          text: match[0],
          entropy,
          severity: entropy < 1.0 ? "high" : "medium",
          hint: `模型对该数字很确信（熵值 ${entropy.toFixed(2)}），但具体数字易被编造，建议核实`
        });
      }
    }
  }

  // 2. 检测日期
  const dateRegex = /\d{4}年|\d{1,2}月\d{1,2}日|20\d{2}-\d{2}-\d{2}|20\d{2}\/\d{1,2}\/\d{1,2}|\b20\d{2}\b/g;

  while ((match = dateRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0 && tokenIndex < steps.length) {
      markers.push({
        type: "date",
        tokenIndex,
        text: match[0],
        entropy: steps[tokenIndex].entropy,
        severity: "medium",
        hint: "模型的时间知识截止于训练数据，可能生成错误或过时的日期"
      });
    }
  }

  // 3. 检测论文引用格式
  const citationRegex = /\[\d+\]|\(\d{4}\)|et al\.|DOI:|arXiv:/gi;

  while ((match = citationRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0 && tokenIndex < steps.length) {
      markers.push({
        type: "citation",
        tokenIndex,
        text: match[0],
        entropy: steps[tokenIndex].entropy,
        severity: "high",
        hint: "模型经常编造不存在的论文引用，这是学术场景中最危险的幻觉类型"
      });
    }
  }

  return markers;
}

// ============================================================================
// 维度 4：自洽性检查
// ============================================================================

/**
 * 找到两个 trace 的首次分叉点
 */
function firstDivergence(steps1: TokenStep[], steps2: TokenStep[]): number {
  const minLen = Math.min(steps1.length, steps2.length);
  for (let i = 0; i < minLen; i++) {
    if (steps1[i].text !== steps2[i].text) {
      return i;
    }
  }
  return -1;
}

/**
 * 检查自洽性（需要多次运行同一 prompt）
 *
 * 学术依据：
 * - Wang et al. (2022) "Self-Consistency Improves Chain of Thought Reasoning"
 * - OpenAI Cookbook 推荐实践
 */
export function checkSelfConsistency(
  traces: GenerationTrace[]
): ConsistencyResult | null {
  if (traces.length < 2) return null;

  // 计算所有 trace 的首次分叉点
  const divergences: number[] = [];
  for (let i = 1; i < traces.length; i++) {
    const div = firstDivergence(traces[0].steps, traces[i].steps);
    if (div >= 0) {
      divergences.push(div);
    }
  }

  if (divergences.length === 0) {
    // 所有运行完全一致
    return {
      runs: traces.length,
      consistencyRate: 1.0,
      avgDivergencePoint: traces[0].steps.length,
      severity: "low",
      explanation: `在 ${traces.length} 次运行中，所有结果完全一致，模型输出高度稳定`
    };
  }

  const avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;
  const consistencyRate = 1 - (divergences.length / (traces.length - 1));

  return {
    runs: traces.length,
    consistencyRate,
    avgDivergencePoint: Math.round(avgDivergence),
    severity: consistencyRate < 0.3 ? "high" : consistencyRate < 0.6 ? "medium" : "low",
    explanation: `在 ${traces.length} 次运行中，${(consistencyRate * 100).toFixed(0)}% 的结果一致。平均在第 ${Math.round(avgDivergence)} 个 token 出现分叉，表示模型在此处存在不确定性。`
  };
}

// ============================================================================
// 维度 5：语义多样性（简化版）
// ============================================================================

/**
 * 提取 n-gram
 */
function extractNgrams(steps: TokenStep[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= steps.length - n; i++) {
    const gram = steps.slice(i, i + n).map(s => s.text).join("");
    ngrams.add(gram);
  }
  return ngrams;
}

/**
 * 计算 Jaccard 相似度
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * 计算语义多样性（简化版：基于 n-gram overlap）
 *
 * 学术依据：
 * - Farquhar et al. (2024) Semantic Entropy（简化版）
 * - Jaccard Similarity for text diversity
 */
export function computeSemanticDiversity(
  traces: GenerationTrace[]
): SemanticDiversityResult | null {
  if (traces.length < 2) return null;

  const allNgrams = traces.map(t => extractNgrams(t.steps, 3));

  let totalOverlap = 0;
  let pairs = 0;

  for (let i = 0; i < traces.length; i++) {
    for (let j = i + 1; j < traces.length; j++) {
      const overlap = jaccardSimilarity(allNgrams[i], allNgrams[j]);
      totalOverlap += overlap;
      pairs++;
    }
  }

  const avgOverlap = totalOverlap / pairs;
  const diversity = 1 - avgOverlap;

  return {
    diversity,
    severity: diversity > 0.7 ? "high" : diversity > 0.4 ? "medium" : "low",
    explanation: `在 ${traces.length} 次运行中，平均 n-gram 重叠率为 ${(avgOverlap * 100).toFixed(1)}%，多样性评分 ${(diversity * 100).toFixed(1)}%${diversity > 0.7 ? "（高度分散，需警惕）" : diversity < 0.3 ? "（高度一致）" : ""}`
  };
}

// ============================================================================
// 综合分析
// ============================================================================

/**
 * 计算置信度评分（0-100）
 *
 * 公式：
 * - 单次运行：40% 熵值 + 30% 时间序列 + 30% 事实性
 * - 多次运行：30% 熵值 + 20% 时间序列 + 20% 事实性 + 30% 自洽性
 */
function computeConfidenceScore(analysis: HallucinationAnalysis): number {
  // 1. 熵值评分
  const entropyScore = 100 * (1 - Math.min(analysis.avgEntropy / 5, 1));

  // 2. 时间序列评分
  const tsAnomalyRatio = analysis.timeSeriesAnomalies.length / Math.max(analysis.totalTokens, 1);
  const timeSeriesScore = 100 * (1 - Math.min(tsAnomalyRatio * 10, 1));

  // 3. 事实性评分
  const factualRiskRatio = analysis.factualRiskMarkers.length / Math.max(analysis.totalTokens, 1);
  const factualityScore = 100 * (1 - Math.min(factualRiskRatio * 5, 1));

  // 4. 自洽性评分（如果有）
  const consistencyScore = analysis.consistencyResult
    ? analysis.consistencyResult.consistencyRate * 100
    : null;

  // 加权平均
  if (consistencyScore !== null) {
    return (
      0.3 * entropyScore +
      0.2 * timeSeriesScore +
      0.2 * factualityScore +
      0.3 * consistencyScore
    );
  } else {
    return (
      0.4 * entropyScore +
      0.3 * timeSeriesScore +
      0.3 * factualityScore
    );
  }
}

/**
 * 综合幻觉分析
 */
export function analyzeHallucination(
  trace: GenerationTrace,
  additionalTraces?: GenerationTrace[]
): HallucinationAnalysis {
  const { modelId, steps } = trace;

  // 计算平均熵
  const avgEntropy = steps.reduce((sum, s) => sum + s.entropy, 0) / steps.length;

  // 各维度检测
  const entropyAnomalies = detectEntropyAnomalies(steps, modelId);
  const timeSeriesAnomalies = detectTimeSeriesAnomalies(steps);
  const factualRiskMarkers = detectFactualRiskMarkers(steps);

  // 多次运行分析（如果有）
  const allTraces = additionalTraces ? [trace, ...additionalTraces] : [trace];
  const consistencyResult = allTraces.length >= 2 ? checkSelfConsistency(allTraces) ?? undefined : undefined;
  const semanticDiversity = allTraces.length >= 2 ? computeSemanticDiversity(allTraces) ?? undefined : undefined;

  // 构建初步分析结果
  const analysis: HallucinationAnalysis = {
    modelId,
    totalTokens: steps.length,
    avgEntropy,
    entropyAnomalies,
    timeSeriesAnomalies,
    factualRiskMarkers,
    consistencyResult,
    semanticDiversity,
    confidenceScore: 0,
    overallSeverity: "low",
    summary: ""
  };

  // 计算置信度评分
  analysis.confidenceScore = computeConfidenceScore(analysis);

  // 确定总体严重程度
  const highSeverityCount = [
    ...entropyAnomalies.filter(a => a.severity === "high"),
    ...timeSeriesAnomalies.filter(a => a.severity === "high"),
    ...factualRiskMarkers.filter(m => m.severity === "high")
  ].length;

  if (analysis.confidenceScore < 50 || highSeverityCount >= 3) {
    analysis.overallSeverity = "high";
  } else if (analysis.confidenceScore < 70 || highSeverityCount >= 1) {
    analysis.overallSeverity = "medium";
  } else {
    analysis.overallSeverity = "low";
  }

  // 生成摘要
  const scoreLabel =
    analysis.confidenceScore >= 90 ? "高置信度" :
    analysis.confidenceScore >= 70 ? "中等置信度" :
    analysis.confidenceScore >= 50 ? "低置信度" : "极低置信度";

  const anomalyCount = entropyAnomalies.length + timeSeriesAnomalies.length + factualRiskMarkers.length;

  analysis.summary = `${scoreLabel}（${analysis.confidenceScore.toFixed(0)} 分），检测到 ${anomalyCount} 个潜在风险点${consistencyResult ? `，自洽性 ${(consistencyResult.consistencyRate * 100).toFixed(0)}%` : ""}`;

  return analysis;
}
