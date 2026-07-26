/** 此刻卡（Sprint 5）：把当前步的真实读数翻译成三行人话——
 *  确定度（top-1 概率分档）/ 候选关系（top-1 与 top-2 差距）/ 节奏（当步耗时 vs 全程中位数）。
 *  全部由 trace 字段换算，措辞与阈值一一对应；无耗时字段时节奏行诚实缺席。 */

import type { TokenStep } from "./trace";

/** 确定度分档阈值（与 explainStep 的 0.8 高集中口径一致） */
export const CERTAINTY_HIGH = 0.8;
export const CERTAINTY_MID = 0.4;
/** 「几乎并列」阈值（与 closeSteps 犹豫口径 0.05 一致） */
export const NECK_AND_NECK_GAP = 0.05;
/** 节奏倍率：超过此倍数才说「变慢」，低于其倒数才说「变快」 */
export const PACE_RATIO = 2;

export interface MomentReadout {
  /** 确定度：分档 + 四格量条（1–4）+ 真实百分比 */
  certainty: { level: "高" | "中" | "低"; bars: number; pct: string };
  /** 候选：top-k 数量 + 关系人话（每句都有字段依据） */
  candidates: { count: number; relation: string };
  /** 节奏：当步耗时 vs 全程中位数；无 dt 记录时为 null（诚实缺席） */
  pace: { ratio: number; text: string } | null;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const pct = (p: number) => `${(p * 100).toFixed(p >= 0.1 ? 0 : 1)}%`;

export function momentReadout(
  steps: TokenStep[],
  index: number,
): MomentReadout | null {
  const step = steps[index];
  if (!step) return null;

  const p = step.prob;
  const level = p >= CERTAINTY_HIGH ? "高" : p >= CERTAINTY_MID ? "中" : "低";
  const bars = Math.min(4, Math.max(1, Math.ceil(p * 4)));

  const top = step.topk;
  let relation: string;
  if (top.length >= 2) {
    const gap = top[0].prob - top[1].prob;
    if (gap < NECK_AND_NECK_GAP) {
      relation = `前两名几乎并列（差 ${(gap * 100).toFixed(1)}%）`;
    } else if (top[0].prob >= CERTAINTY_HIGH) {
      relation = `第一名独占 ${pct(top[0].prob)}，几乎没有悬念`;
    } else {
      relation = `第一名领先明显（差 ${(gap * 100).toFixed(1)}%）`;
    }
  } else {
    relation = "仅记录一个候选";
  }

  let pace: MomentReadout["pace"] = null;
  const dts = steps.filter((s) => s.dt > 0).map((s) => s.dt);
  const med = median(dts);
  if (step.dt > 0 && med > 0) {
    const ratio = step.dt / med;
    const text =
      ratio >= PACE_RATIO
        ? `变慢了 ${ratio.toFixed(1)} 倍 —— 它在难点上`
        : ratio <= 1 / PACE_RATIO
          ? `比平常快 ${(1 / ratio).toFixed(1)} 倍`
          : "与全程节奏相当";
    pace = { ratio, text };
  }

  return {
    certainty: { level, bars, pct: pct(p) },
    candidates: { count: top.length, relation },
    pace,
  };
}
