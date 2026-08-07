/**
 * 审计服务 - 主张提取、可用性审计、语义一致性
 */

import type {
  GenerationTrace,
  ParsedDocument,
  AtomicClaim,
  UsabilityAudit,
  SemanticConsistencyResult,
  AnomalySeverity,
  Anomaly
} from '../types';
import { computeEmbedding, cosineSimilarity } from './embedding';

// ============================================================================
// 可用性审计
// ============================================================================

/**
 * 可用性审计 - 检测熵异常、事实性风险
 */
export function auditUsability(trace: GenerationTrace): UsabilityAudit {
  const entropyAnomalies: Anomaly[] = [];
  const timeSeriesAnomalies: Anomaly[] = [];
  const factualRiskMarkers: Anomaly[] = [];

  // 1. 熵异常检测
  const HIGH_ENTROPY_THRESHOLD = 3.5;
  trace.steps.forEach((step, idx) => {
    if (step.entropy > HIGH_ENTROPY_THRESHOLD) {
      entropyAnomalies.push({
        type: 'high_entropy',
        tokenIndex: idx,
        entropy: step.entropy,
        threshold: HIGH_ENTROPY_THRESHOLD,
        severity: 'high',
        explanation: `Token "${step.text}" 的熵值 ${step.entropy.toFixed(2)} 超过阈值 ${HIGH_ENTROPY_THRESHOLD}`
      });
    }
  });

  // 2. 时间序列异常检测
  const avgDt = trace.steps.reduce((sum, s) => sum + s.dt, 0) / trace.steps.length;
  const stdDt = Math.sqrt(
    trace.steps.reduce((sum, s) => sum + Math.pow(s.dt - avgDt, 2), 0) / trace.steps.length
  );

  trace.steps.forEach((step, idx) => {
    if (step.dt > avgDt + 2 * stdDt) {
      timeSeriesAnomalies.push({
        type: 'slow_generation',
        tokenIndex: idx,
        severity: 'medium',
        explanation: `Token "${step.text}" 生成时间 ${step.dt}ms 异常缓慢（平均 ${avgDt.toFixed(0)}ms）`
      });
    }
  });

  // 3. 事实性风险标记
  trace.steps.forEach((step, idx) => {
    // 检测数字
    if (/\d+/.test(step.text) && step.entropy < 0.5 && step.prob > 0.9) {
      factualRiskMarkers.push({
        type: 'confident_number',
        tokenIndex: idx,
        entropy: step.entropy,
        severity: 'medium',
        explanation: `数字 "${step.text}" 需要验证（高置信度但可能不准确）`
      });
    }

    // 检测引用
    if (/\[\d+\]|\(\d{4}\)/.test(step.text)) {
      factualRiskMarkers.push({
        type: 'citation',
        tokenIndex: idx,
        severity: 'low',
        explanation: `引用 "${step.text}" 需要核实来源`
      });
    }
  });

  // 4. 计算整体严重程度
  const overallSeverity: AnomalySeverity =
    entropyAnomalies.length > 5 || factualRiskMarkers.length > 10 ? 'high' :
    entropyAnomalies.length > 2 || factualRiskMarkers.length > 5 ? 'medium' : 'low';

  return {
    modelId: trace.modelId,
    totalTokens: trace.steps.length,
    entropyAnomalies,
    timeSeriesAnomalies,
    factualRiskMarkers,
    overallSeverity,
    summary: `发现 ${entropyAnomalies.length} 处熵异常，${factualRiskMarkers.length} 处事实性风险标记`
  };
}

// ============================================================================
// 主张提取
// ============================================================================

/**
 * 提取原子主张（简化版，不使用 LLM）
 */
export function extractAtomicClaims(trace: GenerationTrace, runId: number): AtomicClaim[] {
  const claims: AtomicClaim[] = [];
  const text = trace.steps.map(s => s.text).join('');

  // 按句子分割
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);

  let currentTokenIndex = 0;
  sentences.forEach((sentence, idx) => {
    const trimmed = sentence.trim();
    const category = categorizeClaim(trimmed);

    claims.push({
      id: `run${runId}_claim${idx}`,
      text: trimmed,
      startToken: currentTokenIndex,
      endToken: currentTokenIndex + trimmed.length,
      category,
      runId
    });

    currentTokenIndex += trimmed.length;
  });

  return claims;
}

/**
 * 分类主张
 */
function categorizeClaim(text: string): AtomicClaim['category'] {
  if (/\(\d{4}\)|\[\d+\]|et al\./i.test(text)) return 'citation';
  if (/\b(19|20)\d{2}\b/i.test(text)) return 'date';
  if (/\b\d+(\.\d+)?%?\b/i.test(text)) return 'number';
  if (/\b(I think|believe|might|could|should)\b/i.test(text)) return 'opinion';
  return 'fact';
}

// ============================================================================
// 语义一致性
// ============================================================================

/**
 * 检测语义一致性
 */
export async function checkSemanticConsistency(
  traces: GenerationTrace[],
  env: any
): Promise<SemanticConsistencyResult> {
  if (traces.length < 2) {
    return {
      runs: traces.length,
      totalClaims: 0,
      consistentClaims: 0,
      inconsistentClaims: 0,
      consistencyRate: 1.0,
      clusters: [],
      severity: 'low',
      explanation: '单次运行无法进行一致性分析'
    };
  }

  // 提取所有主张
  const allClaims: AtomicClaim[] = [];
  traces.forEach((trace, idx) => {
    const claims = extractAtomicClaims(trace, idx);
    allClaims.push(...claims);
  });

  if (allClaims.length === 0) {
    return {
      runs: traces.length,
      totalClaims: 0,
      consistentClaims: 0,
      inconsistentClaims: 0,
      consistencyRate: 1.0,
      clusters: [],
      severity: 'low',
      explanation: '未提取到主张'
    };
  }

  // 计算 embedding（简化：这里直接聚类）
  const clusters = clusterClaims(allClaims, traces.length);

  const consistentClusters = clusters.filter(c => c.runIds.size >= 2);
  const inconsistentClusters = clusters.filter(c => c.runIds.size === 1);

  const consistentClaims = consistentClusters.reduce((sum, c) => sum + c.members.length, 0);
  const inconsistentClaims = inconsistentClusters.length;

  const consistencyRate = allClaims.length > 0 ? consistentClaims / allClaims.length : 0;

  const severity: AnomalySeverity =
    consistencyRate >= 0.7 ? 'low' :
    consistencyRate >= 0.4 ? 'medium' : 'high';

  return {
    runs: traces.length,
    totalClaims: allClaims.length,
    consistentClaims,
    inconsistentClaims,
    consistencyRate,
    clusters,
    severity,
    explanation: `在 ${traces.length} 次运行中，${(consistencyRate * 100).toFixed(0)}% 的主张语义一致`
  };
}

/**
 * 聚类主张（简化版：按文本相似度）
 */
function clusterClaims(claims: AtomicClaim[], totalRuns: number): any[] {
  const clusters: any[] = [];
  const visited = new Set<string>();

  for (const claim of claims) {
    if (visited.has(claim.id)) continue;

    const cluster = {
      representative: claim,
      members: [{ claim, similarity: 1.0 }],
      runIds: new Set([claim.runId]),
      consistencyRate: 0
    };

    visited.add(claim.id);

    // 查找相似主张（简化：按文本长度和前缀匹配）
    for (const other of claims) {
      if (visited.has(other.id)) continue;
      if (other.runId === claim.runId) continue;

      const similarity = textSimilarity(claim.text, other.text);
      if (similarity >= 0.8) {
        cluster.members.push({ claim: other, similarity });
        cluster.runIds.add(other.runId);
        visited.add(other.id);
      }
    }

    cluster.consistencyRate = cluster.runIds.size / totalRuns;
    clusters.push(cluster);
  }

  return clusters;
}

/**
 * 简单文本相似度（字符级）
 */
function textSimilarity(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

// ============================================================================
// 来源追溯
// ============================================================================

/**
 * 为主张添加来源标注
 */
export async function addSourceTracing(
  claims: AtomicClaim[],
  documents: ParsedDocument[],
  env: any
): Promise<AtomicClaim[]> {
  if (documents.length === 0) return claims;

  // 计算文档页面的 embedding
  const pageEmbeddings: Map<string, number[]> = new Map();

  for (const doc of documents) {
    for (const page of doc.pages) {
      const embedding = await computeEmbedding(page.text, env);
      pageEmbeddings.set(`${doc.name}:${page.pageNumber}`, embedding);
    }
  }

  // 为每个主张查找最佳来源
  const claimsWithSource: AtomicClaim[] = [];

  for (const claim of claims) {
    const claimEmbedding = await computeEmbedding(claim.text, env);

    let bestMatch: AtomicClaim['source'] | undefined = undefined;
    let bestSimilarity = 0.7; // 阈值

    for (const doc of documents) {
      for (const page of doc.pages) {
        const pageKey = `${doc.name}:${page.pageNumber}`;
        const pageEmbedding = pageEmbeddings.get(pageKey);

        if (!pageEmbedding) continue;

        const similarity = cosineSimilarity(claimEmbedding, pageEmbedding);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            docName: doc.name,
            pageNumber: page.pageNumber,
            excerpt: page.text.substring(0, 200),
            similarity,
            charStart: page.charStart,
            charEnd: page.charEnd
          };
        }
      }
    }

    claimsWithSource.push({
      ...claim,
      source: bestMatch
    });
  }

  return claimsWithSource;
}
