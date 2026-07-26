/** 行为基准首期（锚点 D3）：定位是"自己和自己比"的回归工具。
 *  同一严格可比较组（模型·prompt·参数·后端）内的多 seed 运行，
 *  分数定死为分布而非单值：{seeds, values, median, range}。
 *  首个指标：规则命中率（每 100 token 的命中数，用统一 Core Rules 求值）。 */

import { compatKey, type ExperimentRecord } from "./experiments";
import { evaluateRules, type Rule } from "./rules";
import type { TokenStep } from "./trace";

export interface BenchScore {
  metric: "rule-hit-rate";
  /** 每 100 token 的规则命中数，按 run 时间顺序 */
  values: number[];
  seeds: (number | null)[];
  median: number;
  range: [number, number];
}

export interface BenchGroup {
  key: string;
  prompt: string;
  modelId: string;
  device: string | null;
  /** 参与打分的 run（时间升序） */
  recIds: string[];
  score: BenchScore;
}

/** 规则命中率：每 100 token 的命中数（主干 trace） */
export function ruleHitRate(steps: TokenStep[], rules: Rule[]): number {
  if (steps.length === 0) return 0;
  return (evaluateRules(steps, rules).length / steps.length) * 100;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 从存档提取行为基准分布：只在严格可比较组内比较，且组内 ≥2 次运行才产生分数。
 *  所有 run 用同一套规则求值，保证组内可比。 */
export function benchComparableGroups(
  records: ExperimentRecord[],
  rules: Rule[],
): BenchGroup[] {
  const byGroup = new Map<string, ExperimentRecord[]>();
  for (const r of [...records].sort((a, b) => a.createdAt - b.createdAt)) {
    const k = compatKey(r);
    const list = byGroup.get(k) ?? [];
    list.push(r);
    byGroup.set(k, list);
  }
  const out: BenchGroup[] = [];
  for (const [key, runs] of byGroup) {
    if (runs.length < 2) continue;
    const values: number[] = [];
    const seeds: (number | null)[] = [];
    const recIds: string[] = [];
    for (const r of runs) {
      const steps = r.root.trace?.steps ?? [];
      if (steps.length === 0) continue;
      values.push(ruleHitRate(steps, rules));
      seeds.push(r.seed);
      recIds.push(r.id);
    }
    if (values.length < 2) continue;
    out.push({
      key,
      prompt: runs[0].prompt,
      modelId: runs[0].modelId,
      device: runs[0].device,
      recIds,
      score: {
        metric: "rule-hit-rate",
        values,
        seeds,
        median: median(values),
        range: [Math.min(...values), Math.max(...values)],
      },
    });
  }
  // 样本多的组排前
  out.sort((a, b) => b.score.values.length - a.score.values.length);
  return out;
}
