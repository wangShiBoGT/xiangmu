import type { TokenStep } from "./trace";

/** 句子分析结果 */
export interface Sentence {
  /** 句子索引 */
  index: number;
  /** 完整文本 */
  text: string;
  /** 包含的 token 步骤 */
  tokens: TokenStep[];
  /** 平均熵值 */
  avgEntropy: number;
  /** 高熵 token 数量（> 3.0） */
  highEntropyCount: number;
  /** token 起始索引（在完整 steps 数组中的位置） */
  startTokenIndex: number;
  /** token 结束索引（在完整 steps 数组中的位置） */
  endTokenIndex: number;
}

/** 置信度报告摘要统计 */
export interface ConfidenceSummary {
  /** 平均熵值 */
  avgEntropy: number;
  /** 最大熵值 */
  maxEntropy: number;
  /** 中位数熵值（P50） */
  p50Entropy: number;
  /** 90% 分位数熵值（P90） */
  p90Entropy: number;
}

/** 完整置信度报告 */
export interface ConfidenceReport {
  /** 生成时间 */
  generatedAt: string;
  /** 模型 ID */
  modelId: string;
  /** 总 token 数 */
  totalTokens: number;
  /** 高熵 token 数量 */
  highEntropyCount: number;
  /** 句子列表 */
  sentences: Sentence[];
  /** 统计摘要 */
  summary: ConfidenceSummary;
}

/** 句子结束标点符号（中英文） */
const SENTENCE_ENDINGS = /[.!?。！？]/;

/** 按句子拆分 token 流
 *  识别句子结束标点（. ! ? 。！？），将 token 分组为句子，计算每句平均熵值 */
export function splitSentences(steps: TokenStep[]): Sentence[] {
  if (steps.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentTokens: TokenStep[] = [];
  let currentStartIndex = 0;

  steps.forEach((step, i) => {
    currentTokens.push(step);

    // 检测句子结束标点
    if (SENTENCE_ENDINGS.test(step.text)) {
      // 计算当前句子的平均熵值
      const avgEntropy =
        currentTokens.reduce((sum, t) => sum + t.entropy, 0) / currentTokens.length;
      const highEntropyCount = currentTokens.filter(t => t.entropy > 3.0).length;
      const text = currentTokens.map(t => t.text).join("");

      sentences.push({
        index: sentences.length,
        text,
        tokens: currentTokens,
        avgEntropy,
        highEntropyCount,
        startTokenIndex: currentStartIndex,
        endTokenIndex: i,
      });

      currentTokens = [];
      currentStartIndex = i + 1;
    }
  });

  // 如果还有剩余 token（未以标点结束），作为最后一句
  if (currentTokens.length > 0) {
    const avgEntropy =
      currentTokens.reduce((sum, t) => sum + t.entropy, 0) / currentTokens.length;
    const highEntropyCount = currentTokens.filter(t => t.entropy > 3.0).length;
    const text = currentTokens.map(t => t.text).join("");

    sentences.push({
      index: sentences.length,
      text,
      tokens: currentTokens,
      avgEntropy,
      highEntropyCount,
      startTokenIndex: currentStartIndex,
      endTokenIndex: steps.length - 1,
    });
  }

  return sentences;
}

/** 计算置信度统计摘要 */
export function computeConfidenceSummary(steps: TokenStep[]): ConfidenceSummary {
  if (steps.length === 0) {
    return { avgEntropy: 0, maxEntropy: 0, p50Entropy: 0, p90Entropy: 0 };
  }

  const entropies = steps.map(s => s.entropy).sort((a, b) => a - b);
  const avgEntropy = entropies.reduce((sum, e) => sum + e, 0) / entropies.length;
  const maxEntropy = entropies[entropies.length - 1];
  const p50Entropy = entropies[Math.floor(entropies.length * 0.5)];
  const p90Entropy = entropies[Math.floor(entropies.length * 0.9)];

  return { avgEntropy, maxEntropy, p50Entropy, p90Entropy };
}

/** 生成完整置信度报告（用于导出） */
export function buildConfidenceReport(
  steps: TokenStep[],
  modelId: string,
): ConfidenceReport {
  const sentences = splitSentences(steps);
  const summary = computeConfidenceSummary(steps);
  const highEntropyCount = steps.filter(s => s.entropy > 3.0).length;

  return {
    generatedAt: new Date().toISOString(),
    modelId,
    totalTokens: steps.length,
    highEntropyCount,
    sentences,
    summary,
  };
}

/** 将置信度报告导出为 CSV 格式
 *  CSV 格式：句子索引,平均熵,Token数,高熵Token数,文本 */
export function exportReportAsCSV(report: ConfidenceReport): string {
  const headers = ["句子索引", "平均熵", "Token数", "高熵Token数", "文本"];
  const rows = report.sentences.map(s => [
    s.index.toString(),
    s.avgEntropy.toFixed(2),
    s.tokens.length.toString(),
    s.highEntropyCount.toString(),
    `"${s.text.replace(/"/g, '""')}"`, // CSV 转义
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}
