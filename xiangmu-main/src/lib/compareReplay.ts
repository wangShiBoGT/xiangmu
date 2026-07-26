/** Compare Replay（Sprint B）：两条 trace 的同步回放对齐口径。
 *  共同前缀（逐 token id 相同段）一对一同步；分歧后两边按各自序列继续，
 *  先结束的一边如实标注「已结束」。分歧判定复用 firstDivergence（NRP）。 */

import { firstDivergence } from "./experiments";
import type { TokenStep } from "./trace";

export interface CompareAlignment {
  /** 共同前缀长度（步）；两条完全一致时 = 共同长度 */
  prefixLen: number;
  /** 首个分歧步（firstDivergence 口径；完全一致 = -1） */
  divergeAt: number;
  /** 同步播放总拍数 = 两条中较长的步数 */
  totalTicks: number;
}

export function alignTraces(a: TokenStep[], b: TokenStep[]): CompareAlignment {
  const divergeAt = firstDivergence(a, b);
  const prefixLen = divergeAt === -1 ? Math.min(a.length, b.length) : divergeAt;
  return { prefixLen, divergeAt, totalTicks: Math.max(a.length, b.length) };
}

/** 第 tick 拍两边各自所在的步；已结束的一边返回 null */
export function tickPositions(
  a: TokenStep[],
  b: TokenStep[],
  tick: number,
): { a: number | null; b: number | null } {
  return {
    a: tick < a.length ? tick : null,
    b: tick < b.length ? tick : null,
  };
}

/** 分歧步的一句人话：两边真实选中 token 与实录概率；无分歧返回 null */
export function divergenceNarration(
  a: TokenStep[],
  b: TokenStep[],
): string | null {
  const at = firstDivergence(a, b);
  if (at === -1) return null;
  const sa = a[at];
  const sb = b[at];
  if (sa && sb)
    return `第 ${at + 1} 步走向不同：A 选了「${sa.text.trim() || sa.text}」（${(sa.prob * 100).toFixed(1)}%），B 选了「${sb.text.trim() || sb.text}」（${(sb.prob * 100).toFixed(1)}%）`;
  const alive = sa ? "A" : "B";
  const s = sa ?? sb;
  if (!s) return null;
  return `第 ${at + 1} 步走向不同：${alive} 选了「${s.text.trim() || s.text}」（${(s.prob * 100).toFixed(1)}%），另一条已在此前结束`;
}
