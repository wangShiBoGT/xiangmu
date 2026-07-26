/** 采样显微镜（锚点 E5a）：对采样前 logits 的截断快照做纯函数重算。
 *  诚实边界：只有 logits 级观察——本运行时不暴露 attention，这里不做也不假装做注意力图。
 *  快照默认关闭（深度采集会把每步 trace 体积放大约两个数量级），开启才记录。 */

export interface DeepEntry {
  id: number;
  /** 采样前 logit（已按采集温度换算回温度缩放前，含重复惩罚等前置处理） */
  logit: number;
  /** 只为头部候选解码文本，尾部候选仅存 id（控制体积） */
  text?: string;
}

/** 单步深度快照：top-256 采样前 logits + 截断外聚合 */
export interface DeepCapture {
  /** 采集时的实际采样温度 */
  temperature: number;
  /** 按 logit 降序，最多 256 条 */
  entries: DeepEntry[];
  /** 截断外候选个数 */
  restCount: number;
  /** 截断外概率质量（采集温度下的真实采样分布） */
  restMass: number;
}

/** 反事实重算：同一 logits，不同温度。只在截断集合内重算并归一，
 *  返回值附带 coverage 提醒这是截断内分布（t<=0 视为贪心=argmax）。 */
export function counterfactualProbs(
  cap: DeepCapture,
  t: number,
): { id: number; text?: string; p: number }[] {
  if (cap.entries.length === 0) return [];
  if (t <= 0) {
    return cap.entries.map((e, i) => ({ id: e.id, text: e.text, p: i === 0 ? 1 : 0 }));
  }
  const max = cap.entries[0].logit;
  const exps = cap.entries.map((e) => Math.exp((e.logit - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return cap.entries.map((e, i) => ({ id: e.id, text: e.text, p: exps[i] / sum }));
}

/** Top-P 边界：按降序概率累计到 ≥p 的最小候选数；
 *  截断集合覆盖不到 p 时返回 -1（边界在截断外）。 */
export function topPBoundary(probs: number[], topP: number): number {
  if (topP >= 1) return probs.length;
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (cum >= topP) return i + 1;
  }
  return -1;
}
