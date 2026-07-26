/** 复现验证：把两次真实 trace 逐 token 对齐比较。
 *  用途 = 把"同 seed 下可复现"从文字承诺变成可看见的证据（Evidence First）。
 *  只比较真实记录的 token id，不伪造、不解释；差异如实呈现。 */

import type { GenerationTrace } from "./trace";

export interface ReplayDiff {
  /** 差异步序号（0 基） */
  index: number;
  a: { text: string; prob: number };
  b: { text: string; prob: number };
}

export interface ReplayCompare {
  /** 逐 token 对齐比较的步数 = 两次 run 步数的较小值 */
  total: number;
  /** 完全一致：步数相同、每步选中 token id 相同、且同一后端 */
  identical: boolean;
  /** 前 total 步中选中 token id 相同的步数 */
  matched: number;
  /** 首个 id 不同的步序号；无差异为 null */
  firstDiff: number | null;
  /** id 不同的步明细（最多保留前 8 个） */
  diffs: ReplayDiff[];
  lenA: number;
  lenB: number;
  sameDevice: boolean;
  deviceA: string;
  deviceB: string;
}

const MAX_DIFFS = 8;

/** 比较两次生成 trace。a = 原始 run，b = 同 seed 再跑的 run。 */
export function compareTraces(
  a: GenerationTrace,
  b: GenerationTrace,
): ReplayCompare {
  const total = Math.min(a.steps.length, b.steps.length);
  let matched = 0;
  let firstDiff: number | null = null;
  const diffs: ReplayDiff[] = [];
  for (let i = 0; i < total; i++) {
    const sa = a.steps[i];
    const sb = b.steps[i];
    if (sa.id === sb.id) {
      matched++;
    } else {
      if (firstDiff === null) firstDiff = i;
      if (diffs.length < MAX_DIFFS) {
        diffs.push({
          index: i,
          a: { text: sa.text, prob: sa.prob },
          b: { text: sb.text, prob: sb.prob },
        });
      }
    }
  }
  const sameDevice = a.device === b.device;
  const sameLen = a.steps.length === b.steps.length;
  const identical = sameLen && matched === total && sameDevice;
  // 长度不同也是一种差异：把首个"越界步"记为 firstDiff（若前缀全一致）
  if (firstDiff === null && !sameLen) firstDiff = total;
  return {
    total,
    identical,
    matched,
    firstDiff,
    diffs,
    lenA: a.steps.length,
    lenB: b.steps.length,
    sameDevice,
    deviceA: a.device,
    deviceB: b.device,
  };
}
