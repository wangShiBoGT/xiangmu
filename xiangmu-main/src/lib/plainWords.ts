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

/** 着色答案的统一视觉语言（首页 hero / 档案卡片 / 旅程共用）。
 *
 *  单色明度阶，不是多色系。依据 design-system.md §1.3：
 *  「连续量（概率/熵）用单一测量色的明度阶（5 档），禁止多色梯度」。
 *
 *  为什么放弃原来的绿/白/琥珀/红四色：把握度是**一个**连续量，四个色相要求
 *  用户记住四条对应关系才能读图；明度阶只要求记住一条「越淡＝越不确定」。
 *  AODL 03-Visualization-Grammar V3 把这条定为语法：不确定性用明度，不用色相、不用辉光。
 *
 *  「在猜」不靠变色相强调，而由 `guessMark` 的 caution 点式下划线单独标记——
 *  颜色只承载一个量，标记承载「需要注意」，两者不混用。 */
export const CONFIDENCE_CLASS: Record<ConfidenceBucket, string> = {
  high: "text-[color:var(--color-conf-5)]",
  mid: "text-[color:var(--color-conf-3)]",
  low: "text-[color:var(--color-conf-2)]",
  guess: "text-[color:var(--color-conf-1)]",
};

/** 低把握档附加的注意标记（琥珀点式下划线，静态无辉光） */
export const CONFIDENCE_MARK: Record<ConfidenceBucket, string> = {
  high: "",
  mid: "",
  low: "",
  guess: "token-anomaly",
};

export const CONFIDENCE_LEGEND =
  "颜色深浅 = 它写这个词时有多大把握：越亮越有把握，越暗越接近在猜；虚线标出的是把握最低的词";

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
