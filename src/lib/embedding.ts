/**
 * Embedding 向量化模块
 * 使用 @huggingface/transformers 的 feature-extraction pipeline
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

export interface EmbeddingOptions {
  /** 池化策略：mean (默认) | cls */
  pooling?: 'mean' | 'cls';
  /** 是否归一化（用于余弦相似度） */
  normalize?: boolean;
}

export interface EmbeddingResult {
  /** 向量维度（通常为 384 或 768） */
  dimensions: number;
  /** 向量数据 */
  embedding: Float32Array;
  /** 处理耗时（毫秒） */
  durationMs: number;
}

export interface SimilarityResult {
  /** 余弦相似度 [0, 1] */
  cosine: number;
  /** 欧氏距离 */
  euclidean: number;
  /** 点积 */
  dotProduct: number;
}

/**
 * 加载 embedding 模型
 * 默认使用 Xenova/all-MiniLM-L6-v2（384 维，22MB）
 */
export async function loadEmbeddingModel(
  modelId = 'Xenova/all-MiniLM-L6-v2',
  onProgress?: (progress: number) => void
): Promise<void> {
  if (embeddingPipeline) return;
  if (loadingPromise) return loadingPromise.then(() => {});

  loadingPromise = (async () => {
    const pipe = await pipeline('feature-extraction', modelId, {
      progress_callback: onProgress
        ? (data: any) => {
            if ('progress' in data && typeof data.progress === 'number') {
              onProgress(data.progress);
            }
          }
        : undefined,
    });
    embeddingPipeline = pipe;
    return pipe;
  })();

  await loadingPromise;
  loadingPromise = null;
}

/**
 * 将文本转换为向量
 */
export async function textToEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
  if (!embeddingPipeline) {
    throw new Error('Embedding model not loaded. Call loadEmbeddingModel() first.');
  }

  const startTime = performance.now();

  const { pooling = 'mean', normalize = true } = options;

  // 调用 pipeline 获取向量
  const output = await embeddingPipeline(text, {
    pooling,
    normalize,
  });

  // 提取向量数据
  const embedding = new Float32Array(output.data as number[]);
  const durationMs = performance.now() - startTime;

  return {
    dimensions: embedding.length,
    embedding,
    durationMs,
  };
}

/**
 * 批量向量化
 */
export async function batchTextToEmbedding(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult[]> {
  if (!embeddingPipeline) {
    throw new Error('Embedding model not loaded. Call loadEmbeddingModel() first.');
  }

  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const result = await textToEmbedding(text, options);
    results.push(result);
  }

  return results;
}

/**
 * 计算两个向量的相似度
 */
export function computeSimilarity(
  vecA: Float32Array,
  vecB: Float32Array
): SimilarityResult {
  if (vecA.length !== vecB.length) {
    throw new Error(
      `Vector dimensions mismatch: ${vecA.length} vs ${vecB.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // 余弦相似度
  const cosine = normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;

  // 欧氏距离
  let euclidean = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    euclidean += diff * diff;
  }
  euclidean = Math.sqrt(euclidean);

  return {
    cosine,
    euclidean,
    dotProduct,
  };
}

/**
 * 查找最相似的 K 个文本
 */
export function findTopKSimilar(
  queryEmbedding: Float32Array,
  corpus: Array<{ text: string; embedding: Float32Array }>,
  k: number
): Array<{ text: string; similarity: number; index: number }> {
  const similarities = corpus.map((item, index) => {
    const sim = computeSimilarity(queryEmbedding, item.embedding);
    return {
      text: item.text,
      similarity: sim.cosine,
      index,
    };
  });

  // 按相似度降序排序
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, k);
}

/**
 * 卸载模型释放内存
 */
export function unloadEmbeddingModel(): void {
  embeddingPipeline = null;
}

/**
 * 检查模型是否已加载
 */
export function isEmbeddingModelLoaded(): boolean {
  return embeddingPipeline !== null;
}
