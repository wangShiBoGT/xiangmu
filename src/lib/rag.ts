/**
 * 混合检索系统（Hybrid Retrieval）
 * 结合向量相似度搜索和 BM25 关键词搜索
 */

import { VectorStore, type VectorDocument, type SearchResult } from './vectorStore';
import { BM25 } from './bm25';
import { textToEmbedding, type EmbeddingOptions } from './embedding';
import { chunkText, type ChunkOptions } from './chunking';

export interface HybridSearchOptions {
  /** 返回结果数量 */
  k?: number;
  /** 向量搜索权重 [0, 1] */
  vectorWeight?: number;
  /** BM25 搜索权重 [0, 1] */
  bm25Weight?: number;
  /** 最小相似度阈值 */
  threshold?: number;
}

export interface HybridSearchResult {
  document: VectorDocument;
  /** 混合分数 */
  score: number;
  /** 向量相似度分数 */
  vectorScore: number;
  /** BM25 分数 */
  bm25Score: number;
}

/**
 * RAG 检索器
 */
export class RAGRetriever {
  private vectorStore: VectorStore;
  private bm25: BM25 | null = null;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * 索引文档（向量化 + 构建 BM25 索引）
   */
  async indexDocument(
    id: string,
    text: string,
    embeddingOptions?: EmbeddingOptions,
    chunkOptions?: ChunkOptions,
    metadata?: Record<string, any>
  ): Promise<number> {
    // 分块
    const chunks = chunkText(text, chunkOptions);

    // 向量化每个块并存储
    for (const chunk of chunks) {
      const result = await textToEmbedding(chunk.text, embeddingOptions);
      await this.vectorStore.addDocument({
        id: `${id}_chunk_${chunk.index}`,
        text: chunk.text,
        embedding: result.embedding,
        metadata: {
          ...metadata,
          parentId: id,
          chunkIndex: chunk.index,
          chunkStart: chunk.start,
          chunkEnd: chunk.end,
        },
      });
    }

    // 重建 BM25 索引
    await this.rebuildBM25Index();

    return chunks.length;
  }

  /**
   * 批量索引文档
   */
  async indexDocuments(
    documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>,
    embeddingOptions?: EmbeddingOptions,
    chunkOptions?: ChunkOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      await this.indexDocument(
        doc.id,
        doc.text,
        embeddingOptions,
        chunkOptions,
        doc.metadata
      );
      onProgress?.(i + 1, documents.length);
    }
  }

  /**
   * 重建 BM25 索引
   */
  private async rebuildBM25Index(): Promise<void> {
    const docs = await this.vectorStore.getAllDocuments();
    this.bm25 = new BM25(docs.map((d) => ({ id: d.id, text: d.text })));
  }

  /**
   * 混合搜索
   */
  async search(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      k = 5,
      vectorWeight = 0.7,
      bm25Weight = 0.3,
      threshold = 0.0,
    } = options;

    // 向量搜索
    const queryEmbedding = await textToEmbedding(query);
    const vectorResults = await this.vectorStore.search(
      queryEmbedding.embedding,
      k * 2,
      threshold
    );

    // BM25 搜索
    const bm25Results = this.bm25
      ? this.bm25.search(query, k * 2)
      : [];

    // 归一化分数
    const maxVectorScore = Math.max(...vectorResults.map((r) => r.similarity), 1);
    const maxBM25Score = Math.max(...bm25Results.map((r) => r.score), 1);

    // 合并结果
    const combinedMap = new Map<string, HybridSearchResult>();

    for (const result of vectorResults) {
      const normalizedVector = result.similarity / maxVectorScore;
      combinedMap.set(result.document.id, {
        document: result.document,
        score: vectorWeight * normalizedVector,
        vectorScore: normalizedVector,
        bm25Score: 0,
      });
    }

    for (const result of bm25Results) {
      const normalizedBM25 = result.score / maxBM25Score;
      const existing = combinedMap.get(result.id);

      if (existing) {
        existing.score += bm25Weight * normalizedBM25;
        existing.bm25Score = normalizedBM25;
      } else {
        const doc = vectorResults.find((r) => r.document.id === result.id)?.document;
        if (doc) {
          combinedMap.set(result.id, {
            document: doc,
            score: bm25Weight * normalizedBM25,
            vectorScore: 0,
            bm25Score: normalizedBM25,
          });
        }
      }
    }

    // 按混合分数排序
    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * 纯向量搜索
   */
  async vectorSearch(
    query: string,
    k = 5,
    threshold = 0.0
  ): Promise<SearchResult[]> {
    const queryEmbedding = await textToEmbedding(query);
    return this.vectorStore.search(queryEmbedding.embedding, k, threshold);
  }

  /**
   * 纯 BM25 搜索
   */
  bm25Search(query: string, k = 5): Array<{ id: string; score: number }> {
    if (!this.bm25) return [];
    return this.bm25.search(query, k);
  }

  /**
   * 获取文档数量
   */
  async getDocumentCount(): Promise<number> {
    return this.vectorStore.count();
  }

  /**
   * 清空索引
   */
  async clear(): Promise<void> {
    await this.vectorStore.clear();
    this.bm25 = null;
  }
}
