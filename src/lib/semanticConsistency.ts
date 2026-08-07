/**
 * 语义一致性检测模块
 *
 * 解决 token 级别分叉检测的问题：
 * - 不同 tokenizer 切分 → 误判
 * - 同义表达 → 误判
 * - 格式差异 → 误判
 *
 * 新方法：提取原子主张 → 语义嵌入 → 聚类
 * 参考：NabaOS 的 Anumāna（比量）分类、Scholar Ref Cleaner 的相似度阈值
 */

import type { GenerationTrace, TokenStep } from "./trace";
import { textToEmbedding, computeSimilarity, isEmbeddingModelLoaded } from "./embedding";
import type { AnomalySeverity } from "./usabilityAudit";
import type { ParsedDocument } from "./documents";

// ============================================================================
// 类型定义
// ============================================================================

/** 原子主张（Atomic Claim）*/
export interface AtomicClaim {
  id: string;
  text: string;
  startToken: number;
  endToken: number;
  category: "fact" | "opinion" | "citation" | "number" | "date";
  runId: number;
  source?: {
    docName: string;
    pageNumber: number;
    excerpt: string;
    similarity: number;
    charStart: number;
    charEnd: number;
  };
}

/** 主张簇 */
export interface ClaimCluster {
  representative: AtomicClaim;
  members: Array<{
    claim: AtomicClaim;
    similarity: number;
  }>;
  runIds: Set<number>;
  consistencyRate: number;
}

/** 语义一致性结果 */
export interface SemanticConsistencyResult {
  runs: number;
  totalClaims: number;
  consistentClaims: number;
  inconsistentClaims: number;
  consistencyRate: number;
  clusters: ClaimCluster[];
  severity: AnomalySeverity;
  explanation: string;
}

// ============================================================================
// 原子主张提取
// ============================================================================

/**
 * 查找 token 结束位置
 */
function findTokenEnd(steps: TokenStep[], startToken: number, targetText: string): number {
  let accumulated = "";
  for (let i = startToken; i < steps.length; i++) {
    accumulated += steps[i].text;
    if (accumulated.includes(targetText)) {
      return i;
    }
  }
  return steps.length - 1;
}

/**
 * 分类主张类型
 */
function categorizeClaim(text: string): AtomicClaim["category"] {
  // 引用模式：(2017) [1] et al.
  if (/\(\d{4}\)|\[\d+\]|et al\./i.test(text)) {
    return "citation";
  }

  // 日期模式：2017, Jan 1 2017, January 1st 2017
  if (/\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b/i.test(text)) {
    return "date";
  }

  // 数字模式：42, 3.14, 50%, 1 million
  if (/\b\d+(\.\d+)?%?(\s*(million|billion|thousand|k))?\b/i.test(text)) {
    return "number";
  }

  // 意见模式：I think, believe, might, could, should
  if (/\b(I think|believe|feel|suggest|might|could|should|probably|possibly)\b/i.test(text)) {
    return "opinion";
  }

  // 默认为事实性陈述
  return "fact";
}

/**
 * 提取原子主张（无需 LLM）
 *
 * 策略：按句子分割，过滤太短的句子
 */
export function extractAtomicClaims(trace: GenerationTrace, runId: number): AtomicClaim[] {
  const claims: AtomicClaim[] = [];
  const text = trace.steps.map(s => s.text).join("");

  // 按句子分割（支持中英文）
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);

  let currentTokenIndex = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();

    // 跳过太短的句子（< 10 个字符）
    if (trimmed.length < 10) {
      continue;
    }

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

// ============================================================================
// 语义嵌入和聚类
// ============================================================================

/**
 * 计算主张的语义嵌入
 */
async function computeClaimEmbeddings(claims: AtomicClaim[]): Promise<Map<string, Float32Array>> {
  const embeddings = new Map<string, Float32Array>();

  for (const claim of claims) {
    try {
      const result = await textToEmbedding(claim.text, {
        pooling: 'mean',
        normalize: true
      });
      embeddings.set(claim.id, result.embedding);
    } catch (error) {
      console.error(`Failed to compute embedding for claim ${claim.id}:`, error);
      // 失败时使用零向量
      embeddings.set(claim.id, new Float32Array(384));
    }
  }

  return embeddings;
}

/**
 * 聚类相似主张（贪婪算法）
 *
 * @param claims 所有主张
 * @param embeddings 主张的嵌入向量
 * @param similarityThreshold 相似度阈值（默认 0.85）
 */
function clusterClaims(
  claims: AtomicClaim[],
  embeddings: Map<string, Float32Array>,
  similarityThreshold: number = 0.85
): ClaimCluster[] {
  const clusters: ClaimCluster[] = [];
  const visited = new Set<string>();

  for (const claim of claims) {
    if (visited.has(claim.id)) continue;

    const embedding = embeddings.get(claim.id);
    if (!embedding) continue;

    const cluster: ClaimCluster = {
      representative: claim,
      members: [{ claim, similarity: 1.0 }],
      runIds: new Set([claim.runId]),
      consistencyRate: 0
    };

    visited.add(claim.id);

    // 找到所有相似的主张
    for (const otherClaim of claims) {
      if (visited.has(otherClaim.id)) continue;
      if (otherClaim.runId === claim.runId) continue; // 同一次运行不比较

      const otherEmbedding = embeddings.get(otherClaim.id);
      if (!otherEmbedding) continue;

      const similarity = computeSimilarity(embedding, otherEmbedding).cosine;

      if (similarity >= similarityThreshold) {
        cluster.members.push({ claim: otherClaim, similarity });
        cluster.runIds.add(otherClaim.runId);
        visited.add(otherClaim.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// ============================================================================
// 语义一致性检测（主入口）
// ============================================================================

/**
 * 检测语义一致性
 *
 * @param traces 多次运行的 trace
 * @param _documents 参考文档（可选，用于来源追溯 - 预留参数）
 * @param similarityThreshold 相似度阈值（默认 0.85）
 * @returns 语义一致性结果
 */
export async function checkSemanticConsistency(
  traces: GenerationTrace[],
  _documents: ParsedDocument[] = [],
  similarityThreshold: number = 0.85
): Promise<SemanticConsistencyResult | null> {
  if (traces.length < 2) return null;

  // 检查 embedding 模型是否已加载
  if (!isEmbeddingModelLoaded()) {
    console.warn("Embedding model not loaded. Semantic consistency check skipped.");
    return null;
  }

  // 1. 提取所有运行的主张
  const allClaims: AtomicClaim[] = [];
  for (let i = 0; i < traces.length; i++) {
    const claims = extractAtomicClaims(traces[i], i);
    allClaims.push(...claims);
  }

  if (allClaims.length === 0) {
    return {
      runs: traces.length,
      totalClaims: 0,
      consistentClaims: 0,
      inconsistentClaims: 0,
      consistencyRate: 1.0,
      clusters: [],
      severity: "low",
      explanation: "未提取到主张，无法进行一致性分析"
    };
  }

  // 2. 计算嵌入
  const embeddings = await computeClaimEmbeddings(allClaims);

  // 3. 聚类
  const clusters = clusterClaims(allClaims, embeddings, similarityThreshold);

  // 4. 统计
  const consistentClusters = clusters.filter(c => c.runIds.size >= 2);
  const inconsistentClusters = clusters.filter(c => c.runIds.size === 1);

  const consistentClaims = consistentClusters.reduce((sum, c) => sum + c.members.length, 0);
  const inconsistentClaims = inconsistentClusters.length;

  const consistencyRate = allClaims.length > 0 ? consistentClaims / allClaims.length : 0;

  // 5. 计算每个簇的一致性率
  for (const cluster of clusters) {
    cluster.consistencyRate = cluster.runIds.size / traces.length;
  }

  // 6. 生成解释
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
