/** 犹豫步统计（锚点 A6/A10 共用口径）：
 *  close = topk[0].prob − topk[1].prob < 0.05 且 topk[0].prob > 0.05，按差距升序。
 *  只依赖 topk 前两名，可用于任意来源的 trace steps。 */

export interface CloseStep {
  /** 0-based 步号 */
  index: number;
  /** top-1 与 top-2 概率差（0–1） */
  gap: number;
  a: string;
  ap: number;
  b: string;
  bp: number;
}

export function computeCloseSteps(
  steps: { topk: { text: string; prob: number }[] }[],
): CloseStep[] {
  const out: CloseStep[] = [];
  for (let i = 0; i < steps.length; i++) {
    const tk = steps[i].topk;
    if (tk.length < 2 || tk[0].prob <= 0.05) continue;
    const gap = tk[0].prob - tk[1].prob;
    if (gap < 0.05)
      out.push({
        index: i,
        gap,
        a: tk[0].text,
        ap: tk[0].prob,
        b: tk[1].text,
        bp: tk[1].prob,
      });
  }
  out.sort((x, y) => x.gap - y.gap);
  return out;
}

export function formatGap(gap: number): string {
  return gap * 100 < 0.01 ? "不到 0.01%" : `仅 ${(gap * 100).toFixed(2)}%`;
}
