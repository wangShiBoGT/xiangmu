/** Decision Observatory（Sprint 3）：把一次生成里「AI 真正做了选择」的时刻
 *  统一成一份可跳转清单——首字 / 最高熵步 / 犹豫点。
 *  全部由真实 trace 逐步计算（steps[].entropy / topk），无 AI 解读、无估算；
 *  规则命中不在此重复（事件表已有住址，见 ObservationSummary）。 */

import { computeCloseSteps } from "./closeSteps";
import type { TokenStep } from "./trace";

export interface DecisionMoment {
  kind: "first" | "entropy_peak" | "hesitation";
  index: number;
  /** 展示名（含真实 token 文本） */
  label: string;
  /** 真实读数（概率 / 熵 / 差距） */
  metric: string;
}

/** 犹豫点最多列出的个数（差距升序取最险的几个） */
export const MAX_HESITATIONS = 3;

export function decisionMoments(steps: TokenStep[]): DecisionMoment[] {
  if (steps.length === 0) return [];
  const out: DecisionMoment[] = [];
  const seen = new Set<number>();
  const push = (m: DecisionMoment) => {
    if (seen.has(m.index)) return;
    seen.add(m.index);
    out.push(m);
  };
  const text = (i: number) => steps[i].text.trim() || steps[i].text;

  push({
    kind: "first",
    index: 0,
    label: `首字「${text(0)}」`,
    metric: `${(steps[0].prob * 100).toFixed(1)}%`,
  });

  let peak = 0;
  for (let i = 1; i < steps.length; i++)
    if (steps[i].entropy > steps[peak].entropy) peak = i;
  push({
    kind: "entropy_peak",
    index: peak,
    label: `最分散「${text(peak)}」`,
    metric: `熵 ${steps[peak].entropy.toFixed(2)}`,
  });

  for (const c of computeCloseSteps(steps).slice(0, MAX_HESITATIONS))
    push({
      kind: "hesitation",
      index: c.index,
      label: `犹豫「${text(c.index)}」`,
      metric: `差 ${(c.gap * 100).toFixed(2)}%`,
    });

  return out.sort((a, b) => a.index - b.index);
}
