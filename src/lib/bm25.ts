/**
 * BM25 算法实现（关键词检索）
 * 用于混合检索的关键词匹配部分
 */

export interface BM25Document {
  id: string;
  text: string;
  tokens: string[];
}

export interface BM25Result {
  id: string;
  score: number;
}

/**
 * 简单的分词器（基于空格和标点）
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * BM25 算法实现
 */
export class BM25 {
  private documents: BM25Document[];
  private avgDocLength: number;
  private docFreq: Map<string, number>; // 包含某词的文档数
  private k1 = 1.5; // 词频饱和参数
  private b = 0.75; // 长度归一化参数

  constructor(documents: Array<{ id: string; text: string }>) {
    // 分词
    this.documents = documents.map((doc) => ({
      id: doc.id,
      text: doc.text,
      tokens: tokenize(doc.text),
    }));

    // 计算平均文档长度
    const totalLength = this.documents.reduce((sum, doc) => sum + doc.tokens.length, 0);
    this.avgDocLength = totalLength / this.documents.length;

    // 计算文档频率（DF）
    this.docFreq = new Map();
    for (const doc of this.documents) {
      const uniqueTokens = new Set(doc.tokens);
      for (const token of uniqueTokens) {
        this.docFreq.set(token, (this.docFreq.get(token) ?? 0) + 1);
      }
    }
  }

  /**
   * 计算 IDF（逆文档频率）
   */
  private idf(token: string): number {
    const df = this.docFreq.get(token) ?? 0;
    const N = this.documents.length;
    // IDF = log((N - df + 0.5) / (df + 0.5) + 1)
    return Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  /**
   * 计算词频
   */
  private termFreq(token: string, tokens: string[]): number {
    return tokens.filter((t) => t === token).length;
  }

  /**
   * 计算单个文档的 BM25 分数
   */
  private score(queryTokens: string[], doc: BM25Document): number {
    let score = 0;
    const docLength = doc.tokens.length;

    for (const token of queryTokens) {
      const tf = this.termFreq(token, doc.tokens);
      if (tf === 0) continue;

      const idf = this.idf(token);
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * 搜索并返回最相关的文档
   */
  search(query: string, k = 5): BM25Result[] {
    const queryTokens = tokenize(query);

    const results = this.documents.map((doc) => ({
      id: doc.id,
      score: this.score(queryTokens, doc),
    }));

    // 按分数降序排序，取前 K 个
    return results
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
