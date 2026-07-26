/** 系统基准延迟口径（锚点 D2）：全部来自真实逐 token 耗时序列（trace 的 dt），
 *  不估不编。样本不足时返回 null 而不是硬算。 */

export interface LatencyStats {
  /** 中位延迟（ms/token） */
  p50: number;
  /** 尾延迟（ms/token） */
  p95: number;
  /** 有效样本数（dt>0） */
  n: number;
}

/** 线性插值分位数（样本已升序） */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function latencyStats(dts: number[]): LatencyStats | null {
  const valid = dts.filter((d) => d > 0).sort((a, b) => a - b);
  if (valid.length < 8) return null;
  return {
    p50: quantile(valid, 0.5),
    p95: quantile(valid, 0.95),
    n: valid.length,
  };
}

export interface DecaySample {
  /** 窗口标签（如 1–64） */
  label: string;
  /** 该窗口的平均吞吐（tok/s） */
  tps: number;
}

export interface DecaySummary {
  samples: DecaySample[];
  /** 末窗口相对首窗口的减速比（>1 表示变慢），窗口不足为 null */
  slowdown: number | null;
}

/** 上下文衰减多点采样：把逐 token 耗时按四等分窗口取平均吞吐。
 *  每个点都是一段真实生成的均值，不是拟合曲线。 */
export function decaySummary(dts: number[]): DecaySummary | null {
  const valid = dts.filter((d) => d > 0);
  if (valid.length < 32) return null;
  const w = Math.floor(valid.length / 4);
  const samples: DecaySample[] = [];
  for (let i = 0; i < 4; i++) {
    const win = valid.slice(i * w, i === 3 ? valid.length : (i + 1) * w);
    const meanDt = win.reduce((a, b) => a + b, 0) / win.length;
    samples.push({
      label: `${i * w + 1}–${i === 3 ? valid.length : (i + 1) * w}`,
      tps: 1000 / meanDt,
    });
  }
  const first = samples[0].tps;
  const last = samples[3].tps;
  return { samples, slowdown: last > 0 ? first / last : null };
}
