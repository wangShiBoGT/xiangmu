/**
 * 文档分块策略
 * 将长文本切分为适合向量化的片段
 */

export interface ChunkOptions {
  /** 每块最大字符数 */
  maxChunkSize?: number;
  /** 块之间的重叠字符数 */
  overlap?: number;
  /** 分块策略 */
  strategy?: 'fixed' | 'sentence' | 'paragraph';
}

export interface TextChunk {
  /** 块索引 */
  index: number;
  /** 块内容 */
  text: string;
  /** 在原文中的起始位置 */
  start: number;
  /** 在原文中的结束位置 */
  end: number;
}

/**
 * 固定长度分块
 */
function chunkByFixedSize(
  text: string,
  maxSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    const chunk = text.slice(start, end);

    chunks.push({
      index,
      text: chunk,
      start,
      end,
    });

    start += maxSize - overlap;
    index++;
  }

  return chunks;
}

/**
 * 按句子分块
 */
function chunkBySentence(
  text: string,
  maxSize: number,
  overlap: number
): TextChunk[] {
  // 简单的句子分割（中英文）
  const sentences = text
    .split(/([。！？.!?]+[\s\n]*)/g)
    .reduce((acc, part, i, arr) => {
      if (i % 2 === 0 && part) {
        const punct = arr[i + 1] || '';
        acc.push(part + punct);
      }
      return acc;
    }, [] as string[]);

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let currentStart = 0;
  let index = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
      // 当前块已满，保存并开始新块
      chunks.push({
        index,
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length,
      });

      // 重叠：回退几个句子
      const overlapSentences = [];
      let overlapLength = 0;
      for (let j = i - 1; j >= 0 && overlapLength < overlap; j--) {
        overlapSentences.unshift(sentences[j]);
        overlapLength += sentences[j].length;
      }

      currentChunk = overlapSentences.join('');
      currentStart = currentStart + currentChunk.length - overlapLength;
      index++;
    }

    currentChunk += sentence;
  }

  // 保存最后一块
  if (currentChunk.trim().length > 0) {
    chunks.push({
      index,
      text: currentChunk.trim(),
      start: currentStart,
      end: currentStart + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * 按段落分块
 */
function chunkByParagraph(
  text: string,
  maxSize: number,
  overlap: number
): TextChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let currentStart = 0;
  let index = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];

    if (currentChunk.length + para.length > maxSize && currentChunk.length > 0) {
      chunks.push({
        index,
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length,
      });

      // 重叠处理
      const overlapParas = [];
      let overlapLength = 0;
      for (let j = i - 1; j >= 0 && overlapLength < overlap; j--) {
        overlapParas.unshift(paragraphs[j]);
        overlapLength += paragraphs[j].length;
      }

      currentChunk = overlapParas.join('\n\n');
      currentStart = currentStart + currentChunk.length - overlapLength;
      index++;
    }

    currentChunk += (currentChunk ? '\n\n' : '') + para;
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      index,
      text: currentChunk.trim(),
      start: currentStart,
      end: currentStart + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * 文档分块主函数
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    maxChunkSize = 500,
    overlap = 50,
    strategy = 'sentence',
  } = options;

  if (text.length <= maxChunkSize) {
    return [{ index: 0, text, start: 0, end: text.length }];
  }

  switch (strategy) {
    case 'fixed':
      return chunkByFixedSize(text, maxChunkSize, overlap);
    case 'sentence':
      return chunkBySentence(text, maxChunkSize, overlap);
    case 'paragraph':
      return chunkByParagraph(text, maxChunkSize, overlap);
    default:
      return chunkBySentence(text, maxChunkSize, overlap);
  }
}
