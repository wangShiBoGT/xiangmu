import type { TokenStep, GenerationTrace } from "./trace";
import { checkSemanticConsistency, type SemanticConsistencyResult } from "./semanticConsistency";

/**
 * AI 可用性审计模块（重构版）
 *
 * 定位：不确定性和风险点标记工具，不是幻觉检测器
 *
 * 核心原则：
 * 1. 不判断真假，只标记不确定性
 * 2. 不给"置信度评分"，只提供多维度标记
 * 3. 辅助人工审计，不替代人工判断
 *
 * 基于真实案例分析：docs/REAL_HALLUCINATION_CASES.md
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

/** 原子主张（Atomic Claim）*/
export interface AtomicClaim {
  id: string;
  text: string;
  startToken: number;
  endToken: number;
  category: "fact" | "opinion" | "citation" | "number" | "date";
}

/** 原子主张一致性 */
export interface ClaimConsistency {
  claim: string;
  occurrences: Array<{
    runId: number;
    exactMatch: boolean;
    similarityScore: number;
    variant?: string;
  }>;
  consistencyRate: number;
  status: "consistent" | "partial" | "inconsistent";
}

/** 可用性审计结果 */
export interface UsabilityAudit {
  modelId: string;
  totalTokens: number;
  avgEntropy: number;

  // 各维度检测结果
  entropyAnomalies: EntropyAnomaly[];
  timeSeriesAnomalies: TimeSeriesAnomaly[];
  factualRiskMarkers: FactualRiskMarker[];
  consistencyResult?: ConsistencyResult;

  // 语义一致性结果（新增）
  semanticConsistency?: SemanticConsistencyResult;

  // 综合评估（不是评分，是描述）
  uncertaintyLevel: "low" | "medium" | "high";
  riskCount: number;
  summary: string;
}

// ============================================================================
// 维度 1：熵值异常检测
// ============================================================================

/**
 * 获取动态熵值阈值
 */
function getDynamicThreshold(modelId: string): number {
  let baseThreshold = 3.0;

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
 * 解释：高熵表示模型不确定，但不等于幻觉
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

  // 2. 检测熵值突变
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
 */
export function detectTimeSeriesAnomalies(
  steps: TokenStep[]
): TimeSeriesAnomaly[] {
  const anomalies: TimeSeriesAnomaly[] = [];
  const probs = steps.map(s => s.prob);

  // 1. 检测概率突降
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

  // 2. 检测长期低概率区域
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
 * 解释：这些是"容易被编造"的内容类型，需要人工核实
 */
export function detectFactualRiskMarkers(
  steps: TokenStep[]
): FactualRiskMarker[] {
  const markers: FactualRiskMarker[] = [];
  const text = steps.map(s => s.text).join("");

  // 1. 检测具体数字
  const numberRegex = /\d+(\.\d+)?%?/g;
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(text)) !== null) {
    const tokenIndex = findTokenIndex(steps, match.index);
    if (tokenIndex >= 0 && tokenIndex < steps.length) {
      const entropy = steps[tokenIndex].entropy;

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
        hint: "模型经常编造不存在的论文引用，这是学术场景中最危险的风险类型"
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
 * 检查自洽性
 *
 * 解释：多次运行一致 ≠ 正确，但不一致肯定说明模型不确定
 */
export function checkSelfConsistency(
  traces: GenerationTrace[]
): ConsistencyResult | null {
  if (traces.length < 2) return null;

  const divergences: number[] = [];
  for (let i = 1; i < traces.length; i++) {
    const div = firstDivergence(traces[0].steps, traces[i].steps);
    if (div >= 0) {
      divergences.push(div);
    }
  }

  if (divergences.length === 0) {
    return {
      runs: traces.length,
      consistencyRate: 1.0,
      avgDivergencePoint: traces[0].steps.length,
      severity: "low",
      explanation: `在 ${traces.length} 次运行中，所有结果完全一致，模型输出高度稳定（但不保证正确）`
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
// 综合分析（重构版）
// ============================================================================

/**
 * 可用性审计（不是幻觉检测）
 */
export async function auditUsability(
  trace: GenerationTrace,
  additionalTraces?: GenerationTrace[]
): Promise<UsabilityAudit> {
  const { modelId, steps } = trace;

  // 计算平均熵
  const avgEntropy = steps.reduce((sum, s) => sum + s.entropy, 0) / steps.length;

  // 各维度检测
  const entropyAnomalies = detectEntropyAnomalies(steps, modelId);
  const timeSeriesAnomalies = detectTimeSeriesAnomalies(steps);
  const factualRiskMarkers = detectFactualRiskMarkers(steps);

  // 多次运行分析
  const allTraces = additionalTraces ? [trace, ...additionalTraces] : [trace];

  // 旧版 token 级别一致性（保留用于兼容）
  const consistencyResult = allTraces.length >= 2 ? checkSelfConsistency(allTraces) ?? undefined : undefined;

  // 新版语义一致性（优先使用）
  let semanticConsistency: SemanticConsistencyResult | undefined;
  if (allTraces.length >= 2) {
    try {
      semanticConsistency = await checkSemanticConsistency(allTraces) ?? undefined;
    } catch (error) {
      console.warn("Semantic consistency check failed:", error);
      // 降级到旧版 token 级别检测
      semanticConsistency = undefined;
    }
  }

  // 计算风险点总数
  const riskCount = entropyAnomalies.length + timeSeriesAnomalies.length + factualRiskMarkers.length;
  const highRiskCount = [
    ...entropyAnomalies.filter(a => a.severity === "high"),
    ...timeSeriesAnomalies.filter(a => a.severity === "high"),
    ...factualRiskMarkers.filter(m => m.severity === "high")
  ].length;

  // 确定不确定性等级（不是置信度）
  // 优先使用语义一致性结果
  const effectiveConsistency = semanticConsistency || consistencyResult;

  let uncertaintyLevel: "low" | "medium" | "high";
  if (avgEntropy > 3.5 || highRiskCount >= 3 || (effectiveConsistency && effectiveConsistency.consistencyRate < 0.3)) {
    uncertaintyLevel = "high";
  } else if (avgEntropy > 2.5 || highRiskCount >= 1 || (effectiveConsistency && effectiveConsistency.consistencyRate < 0.6)) {
    uncertaintyLevel = "medium";
  } else {
    uncertaintyLevel = "low";
  }

  // 生成摘要
  const uncertaintyLabel =
    uncertaintyLevel === "low" ? "低不确定性" :
    uncertaintyLevel === "medium" ? "中等不确定性" : "高不确定性";

  const summary = `${uncertaintyLabel}，检测到 ${riskCount} 个潜在风险点${effectiveConsistency ? `，一致性 ${(effectiveConsistency.consistencyRate * 100).toFixed(0)}%` : ""}。建议重点核实标记的风险点。`;

  return {
    modelId,
    totalTokens: steps.length,
    avgEntropy,
    entropyAnomalies,
    timeSeriesAnomalies,
    factualRiskMarkers,
    consistencyResult,
    semanticConsistency,
    uncertaintyLevel,
    riskCount,
    summary
  };
}

// 兼容性：保留旧函数名但标记为 deprecated
/** @deprecated 使用 auditUsability() 代替 */
export function analyzeHallucination(
  trace: GenerationTrace,
  additionalTraces?: GenerationTrace[]
): Promise<UsabilityAudit> {
  return auditUsability(trace, additionalTraces);
}
