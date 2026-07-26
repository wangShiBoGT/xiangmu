/** 亲和层共用口径：把握度分档 + 术语人话字典 + 回答摘录。
 *  所有分档只依据 trace 里的真实 prob，不做任何推断或美化。 */

import type { TokenStep } from "./trace";

/** 把握度分档（同类工具验证过的外行可读口径）：
 *  high ≥0.85 很有把握 / mid 0.5–0.85 / low 0.15–0.5 / guess <0.15 在猜 */
export type ConfidenceBucket = "high" | "mid" | "low" | "guess";

export function confidenceBucket(prob: number): ConfidenceBucket {
  if (prob >= 0.85) return "high";
  if (prob >= 0.5) return "mid";
  if (prob >= 0.15) return "low";
  return "guess";
}

/** 着色答案的统一视觉语言（首页 hero / 档案卡片 / 旅程共用） */
export const CONFIDENCE_CLASS: Record<ConfidenceBucket, string> = {
  high: "text-emerald-300",
  mid: "text-obs-ink",
  low: "text-amber-300",
  guess: "text-rose-400",
};

export const CONFIDENCE_LEGEND =
  "颜色 = 它写这个词时有多大把握：绿=很有把握 · 白=一般 · 琥珀=犹豫 · 红=在猜";

/** 正式回答的起始步：`</think>` 之后；无思考段则从 0 开始 */
export function answerStart(steps: TokenStep[]): number {
  const close = steps.findIndex((s) => s.text.includes("</think>"));
  return close === -1 ? 0 : close + 1;
}

/** 思考段步数（无思考段为 0） */
export function thinkingStepCount(steps: TokenStep[]): number {
  return answerStart(steps) === 0 ? 0 : answerStart(steps);
}

/** 回答摘录：从正式回答起，取不超过 maxChars 字符的连续步（含每步真实 prob，供着色） */
export function answerExcerpt(
  steps: TokenStep[],
  maxChars = 80,
): { from: number; to: number } | null {
  const start = answerStart(steps);
  if (start >= steps.length) return null;
  let chars = 0;
  let end = start;
  for (let i = start; i < steps.length; i++) {
    chars += steps[i].text.length;
    end = i;
    if (chars >= maxChars) break;
  }
  return { from: start, to: end };
}

/** 术语人话字典：界面主文案用人话，专业词保留在括号/tooltip，不删除 */
export const PLAIN = {
  seed: "随机种子（同种子可复现）",
  tps: "生成速度",
  trace: "运行档案",
  entropy: "犹豫程度",
  topk: "候选词",
  temperature: "随机性（temperature）",
} as const;

/** 人话速度：`x.x 词/秒`；无实测返回 null（诚实缺席） */
export function plainSpeed(avgTps: number | null): string | null {
  return avgTps === null ? null : `${avgTps.toFixed(1)} 词/秒`;
}
