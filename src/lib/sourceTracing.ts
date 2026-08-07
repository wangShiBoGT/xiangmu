/**
 * RAG 来源追溯模块
 *
 * 功能：为每条主张（Atomic Claim）找到来源文档和页码
 * 方法：基于 embedding 的余弦相似度检索
 *
 * MVP 实现：前端简单版本
 * - 使用现有的 embedding 模块
 * - 简单的余弦相似度匹配
 * - 不依赖后端
 */

import type { ParsedDocument } from './documents';
import type { AtomicClaim } from './semanticConsistency';
import { textToEmbedding, computeSimilarity } from './embedding';

// ============================================================================
// 类型定义
// ============================================================================

/** 主张来源信息 */
export interface ClaimSource {
  docName: string;
  pageNumber: number;
  excerpt: string;  // 原文摘录（前 200 字）
  similarity: number;  // 余弦相似度 [0, 1]
  charStart: number;  // 在页面中的字符偏移（可选）
  charEnd: number;
}

/** 带来源的主张 */
export interface AtomicClaimWithSource extends AtomicClaim {
  // source 字段已经在 AtomicClaim 中定义为可选
}

/** 来源追溯配置 */
export interface SourceTracingOptions {
  /** 相似度阈值（默认 0.7） */
  similarityThreshold?: number;
  /** 是否返回最佳匹配（默认 true，否则返回所有超过阈值的） */
  returnBestOnly?: boolean;
  /** 最大返回数量（当 returnBestOnly=false 时生效） */
  maxResults?: number;
}

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 为单条主张找到来源
 *
 * @param claim 主张
 * @param documents 用户上传的文档
 * @param options 配置选项
 * @returns 来源信息（如果找到）
 */
export async function findClaimSource(
  claim: AtomicClaim,
  documents: ParsedDocument[],
  options: SourceTracingOptions = {}
): Promise<ClaimSource | null> {
  const {
    similarityThreshold = 0.7,
  } = options;

  // 如果没有文档，直接返回
  if (!documents || documents.length === 0) {
    return null;
  }

  // 为主张生成 embedding
  const claimEmbedding = await textToEmbedding(claim.text);

  let bestMatch: ClaimSource | null = null;
  let bestSimilarity = 0;

  // 遍历所有文档的所有页面
  for (const doc of documents) {
    if (!doc.pages || doc.pages.length === 0) {
      continue;
    }

    for (const page of doc.pages) {
      // 为页面文本生成 embedding
      const pageEmbedding = await textToEmbedding(page.text);

      // 计算余弦相似度
      const similarity = computeSimilarity(
        claimEmbedding.embedding,
        pageEmbedding.embedding
      ).cosine;

      // 如果相似度超过阈值且是目前最好的
      if (similarity > bestSimilarity && similarity >= similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = {
          docName: doc.name,
          pageNumber: page.pageNumber,
          excerpt: page.text.slice(0, 200),  // 取前 200 字作为摘录
          similarity,
          charStart: page.charStart,
          charEnd: page.charEnd,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * 批量为主张找到来源
 *
 * @param claims 主张列表
 * @param documents 用户上传的文档
 * @param options 配置选项
 * @param onProgress 进度回调
 * @returns 带来源的主张列表
 */
export async function findClaimSources(
  claims: AtomicClaim[],
  documents: ParsedDocument[],
  options: SourceTracingOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<AtomicClaimWithSource[]> {
  const results: AtomicClaimWithSource[] = [];

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const source = await findClaimSource(claim, documents, options);

    results.push({
      ...claim,
      source: source || undefined,
    });

    // 调用进度回调
    onProgress?.(i + 1, claims.length);
  }

  return results;
}

/**
 * 统计来源追溯结果
 *
 * @param claims 带来源的主张列表
 * @returns 统计信息
 */
export function analyzeSourceTracing(
  claims: AtomicClaimWithSource[]
): {
  total: number;
  withSource: number;
  withoutSource: number;
  coverageRate: number;
  avgSimilarity: number;
  sourceDistribution: Record<string, number>;  // 每个文档的引用次数
} {
  const total = claims.length;
  const withSource = claims.filter(c => c.source).length;
  const withoutSource = total - withSource;
  const coverageRate = total > 0 ? withSource / total : 0;

  // 计算平均相似度
  const similarities = claims
    .filter(c => c.source)
    .map(c => c.source!.similarity);
  const avgSimilarity = similarities.length > 0
    ? similarities.reduce((sum, s) => sum + s, 0) / similarities.length
    : 0;

  // 统计每个文档的引用次数
  const sourceDistribution: Record<string, number> = {};
  for (const claim of claims) {
    if (claim.source) {
      const key = `${claim.source.docName} 第 ${claim.source.pageNumber} 页`;
      sourceDistribution[key] = (sourceDistribution[key] || 0) + 1;
    }
  }

  return {
    total,
    withSource,
    withoutSource,
    coverageRate,
    avgSimilarity,
    sourceDistribution,
  };
}

/**
 * 为语义一致性结果添加来源追溯
 *
 * 这是与 semanticConsistency.ts 的集成函数
 *
 * @param clusters 主张簇列表
 * @param documents 用户上传的文档
 * @param options 配置选项
 * @param onProgress 进度回调
 */
export async function addSourceTracingToClusters(
  clusters: Array<{
    representative: AtomicClaim;
    members: Array<{ claim: AtomicClaim; similarity: number }>;
    runIds: Set<number>;
    consistencyRate: number;
  }>,
  documents: ParsedDocument[],
  options: SourceTracingOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<Array<{
  representative: AtomicClaim;
  members: Array<{ claim: AtomicClaim; similarity: number }>;
  runIds: Set<number>;
  consistencyRate: number;
}>> {
  // 提取所有唯一的主张
  const allClaims = new Map<string, AtomicClaim>();

  for (const cluster of clusters) {
    allClaims.set(cluster.representative.id, cluster.representative);
    for (const member of cluster.members) {
      allClaims.set(member.claim.id, member.claim);
    }
  }

  // 批量查找来源
  const claimsArray = Array.from(allClaims.values());
  const claimsWithSource = await findClaimSources(
    claimsArray,
    documents,
    options,
    onProgress
  );

  // 构建查找表
  const sourceMap = new Map<string, ClaimSource | undefined>();
  for (const claim of claimsWithSource) {
    sourceMap.set(claim.id, claim.source);
  }

  // 更新簇
  return clusters.map(cluster => ({
    ...cluster,
    representative: {
      ...cluster.representative,
      source: sourceMap.get(cluster.representative.id),
    },
    members: cluster.members.map(member => ({
      ...member,
      claim: {
        ...member.claim,
        source: sourceMap.get(member.claim.id),
      },
    })),
  }));
}

/**
 * 简化版：直接在文本中查找匹配（后备方案）
 *
 * 当 embedding 模型未加载时使用此方法
 * 方法：简单的文本包含检测
 */
export function findClaimSourceFallback(
  claim: AtomicClaim,
  documents: ParsedDocument[]
): ClaimSource | null {
  const claimText = claim.text.trim().toLowerCase();

  for (const doc of documents) {
    if (!doc.pages || doc.pages.length === 0) {
      continue;
    }

    for (const page of doc.pages) {
      const pageText = page.text.toLowerCase();

      // 简单的包含检测
      if (pageText.includes(claimText)) {
        return {
          docName: doc.name,
          pageNumber: page.pageNumber,
          excerpt: page.text.slice(0, 200),
          similarity: 1.0,  // 精确匹配
          charStart: page.charStart,
          charEnd: page.charEnd,
        };
      }

      // 模糊匹配：检查主张中的关键词（超过 5 个字符的词）
      const keywords = claimText
        .split(/\s+/)
        .filter(word => word.length > 5);

      if (keywords.length > 0) {
        const matchCount = keywords.filter(kw => pageText.includes(kw)).length;
        const matchRate = matchCount / keywords.length;

        if (matchRate >= 0.6) {  // 60% 的关键词匹配
          return {
            docName: doc.name,
            pageNumber: page.pageNumber,
            excerpt: page.text.slice(0, 200),
            similarity: matchRate,
            charStart: page.charStart,
            charEnd: page.charEnd,
          };
        }
      }
    }
  }

  return null;
}
