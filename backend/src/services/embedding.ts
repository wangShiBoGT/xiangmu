/**
 * Embedding 服务 - 文本向量化
 */

/**
 * 计算文本 Embedding（使用 Cloudflare AI）
 *
 * 注意：Cloudflare Workers AI 支持 embedding 模型
 * 文档：https://developers.cloudflare.com/workers-ai/models/text-embeddings/
 */
export async function computeEmbedding(
  text: string,
  env: any
): Promise<number[]> {
  try {
    // 使用 Cloudflare Workers AI
    // @ts-ignore - Cloudflare AI 类型暂不完整
    const response = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      {
        text: text.substring(0, 512) // 截断到 512 字符
      }
    );

    return response.data[0] as number[];
  } catch (error) {
    console.error('Embedding failed:', error);
    // 失败时返回零向量
    return new Array(768).fill(0);
  }
}

/**
 * 批量计算 Embedding
 */
export async function computeEmbeddings(
  texts: string[],
  env: any
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await computeEmbedding(text, env);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
