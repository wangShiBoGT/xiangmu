/** Live-Debug 断点（Sprint 4 收尾）：生成中命中真实条件即自动暂停。
 *  条件只用 trace 已记录的真实数据（top-2 概率差距），不做任何估算。 */
import type { TokenStep } from "./trace";

/** 犹豫点断点口径：与 closeSteps 的犹豫点同源（top-2 差距 < 5%） */
export const HESITATION_GAP = 0.05;

/** 在 steps[fromIndex..] 中找到第一个命中犹豫断点的步；无命中返回 null */
export function hesitationBreakIndex(
  steps: TokenStep[],
  fromIndex: number,
  gapThreshold: number = HESITATION_GAP,
): number | null {
  for (let i = Math.max(0, fromIndex); i < steps.length; i++) {
    const tk = steps[i].topk;
    if (tk.length >= 2 && tk[0].prob - tk[1].prob < gapThreshold) return i;
  }
  return null;
}
