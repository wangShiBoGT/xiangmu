/**
 * 向量数据库（基于 IndexedDB）
 * 支持向量存储、检索和持久化
 */

export interface VectorDocument {
  /** 文档唯一标识 */
  id: string;
  /** 原始文本内容 */
  text: string;
  /** 向量表示 */
  embedding: Float32Array;
  /** 元数据（可选） */
  metadata?: Record<string, any>;
  /** 创建时间戳 */
  createdAt: number;
}

export interface SearchResult {
  /** 文档 */
  document: VectorDocument;
  /** 余弦相似度 [0, 1] */
  similarity: number;
}

/**
 * 向量数据库类
 */
export class VectorStore {
  private dbName: string;
  private storeName = 'documents';
  private db: IDBDatabase | null = null;

  constructor(dbName = 'vectorStore') {
    this.dbName = dbName;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 添加文档
   */
  async addDocument(doc: Omit<VectorDocument, 'createdAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fullDoc: VectorDocument = {
      ...doc,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      // IndexedDB 不支持直接存储 TypedArray，需要转换
      const serialized = {
        ...fullDoc,
        embedding: Array.from(fullDoc.embedding),
      };

      const request = store.put(serialized);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 批量添加文档
   */
  async addDocuments(docs: Omit<VectorDocument, 'createdAt'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      let completed = 0;
      const total = docs.length;

      for (const doc of docs) {
        const fullDoc: VectorDocument = {
          ...doc,
          createdAt: Date.now(),
        };

        const serialized = {
          ...fullDoc,
          embedding: Array.from(fullDoc.embedding),
        };

        const request = store.put(serialized);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * 获取所有文档
   */
  async getAllDocuments(): Promise<VectorDocument[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const docs = request.result.map((item: any) => ({
          ...item,
          embedding: new Float32Array(item.embedding),
        }));
        resolve(docs);
      };
    });
  }

  /**
   * 向量相似度搜索（余弦相似度）
   */
  async search(
    queryEmbedding: Float32Array,
    k = 5,
    threshold = 0.0
  ): Promise<SearchResult[]> {
    const docs = await this.getAllDocuments();

    const results = docs.map((doc) => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return { document: doc, similarity };
    });

    // 按相似度降序排序，过滤阈值，取前 K 个
    return results
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

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

    return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 清空所有文档
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 获取文档数量
   */
  async count(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
