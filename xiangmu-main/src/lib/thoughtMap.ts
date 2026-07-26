/** 思路地图（Sprint 7）：把一次生成按真实证据分「站」——
 *  分界只用两类真实信号：① `<think>`/`</think>` 思考段边界（token 文本实测）；
 *  ② 思考段内平滑熵对全段均值的穿越点（熵拐点）。
 *  站名走谨慎措辞白名单（每个名字都锚定一个测量事实，不做拟人臆测）；
 *  trace 无 `</think>` 边界时返回 null（诚实缺席）。 */

import type { TokenStep } from "./trace";

/** 平滑窗口（步） */
export const SMOOTH_WINDOW = 7;
/** 站的最小长度（步），避免碎段 */
export const MIN_SEGMENT = 12;
/** 思考段内最多拆几站 */
export const MAX_THINK_STATIONS = 3;

export interface ThoughtStation {
  /** 步区间（含端点，0-based） */
  start: number;
  end: number;
  /** 白名单站名（锚定测量事实） */
  label: string;
  /** 该段全量 softmax 熵均值（nats） */
  meanEntropy: number;
  /** 段首原文代表片段 */
  excerpt: string;
  phase: "think" | "answer";
}

export interface ThoughtMapData {
  stations: ThoughtStation[];
  /** 一句人话总结（数字全部实算） */
  headline: string;
  /** `</think>` 所在步 */
  thinkEnd: number;
}

function smooth(xs: number[], w: number): number[] {
  const out = new Array<number>(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const a = Math.max(0, i - (w >> 1));
    const b = Math.min(xs.length, i + (w >> 1) + 1);
    let s = 0;
    for (let j = a; j < b; j++) s += xs[j];
    out[i] = s / (b - a);
  }
  return out;
}

/** 段内平滑熵穿越均值的位置（升/降都算），按出现顺序取前 n-1 个作为分界 */
function crossings(ent: number[], lo: number, hi: number, maxCuts: number): number[] {
  const seg = ent.slice(lo, hi + 1);
  const sm = smooth(seg, SMOOTH_WINDOW);
  const mean = sm.reduce((a, b) => a + b, 0) / sm.length;
  const cuts: number[] = [];
  let last = lo;
  for (let i = 1; i < sm.length; i++) {
    const wasAbove = sm[i - 1] > mean;
    const isAbove = sm[i] > mean;
    if (wasAbove !== isAbove) {
      const at = lo + i;
      if (at - last >= MIN_SEGMENT && hi + 1 - at >= MIN_SEGMENT) {
        cuts.push(at);
        last = at;
        if (cuts.length >= maxCuts) break;
      }
    }
  }
  return cuts;
}

function meanEntropy(steps: TokenStep[], a: number, b: number): number {
  let s = 0;
  for (let i = a; i <= b; i++) s += steps[i].entropy;
  return s / (b - a + 1);
}

function excerpt(steps: TokenStep[], a: number, b: number): string {
  let t = "";
  for (let i = a; i <= b && t.length < 24; i++) t += steps[i].text;
  return t.replace(/\s+/g, " ").trim().slice(0, 24);
}

export function buildThoughtMap(steps: TokenStep[]): ThoughtMapData | null {
  const closeIdx = steps.findIndex((s) => s.text.includes("</think>"));
  if (closeIdx < MIN_SEGMENT || steps.length - closeIdx - 1 < 1) return null;

  const stations: ThoughtStation[] = [];
  // 思考段：[tStart, closeIdx-1]，跳过开头的 <think> 标记步
  const tStart = steps[0].text.includes("<think>") ? 1 : 0;
  const cuts = crossings(
    steps.map((s) => s.entropy),
    tStart,
    closeIdx - 1,
    MAX_THINK_STATIONS - 1,
  );
  const bounds = [tStart, ...cuts, closeIdx];
  const thinkSegs: [number, number][] = [];
  for (let i = 0; i < bounds.length - 1; i++)
    thinkSegs.push([bounds[i], bounds[i + 1] - 1]);

  let peakSeg = 0;
  for (let i = 1; i < thinkSegs.length; i++)
    if (
      meanEntropy(steps, ...thinkSegs[i]) >
      meanEntropy(steps, ...thinkSegs[peakSeg])
    )
      peakSeg = i;

  thinkSegs.forEach(([a, b], i) => {
    const label =
      i === 0
        ? "审题"
        : i === peakSeg && thinkSegs.length > 1
          ? "反复权衡（熵最高段）"
          : "推理展开";
    stations.push({
      start: a,
      end: b,
      label,
      meanEntropy: meanEntropy(steps, a, b),
      excerpt: excerpt(steps, a, b),
      phase: "think",
    });
  });

  // 正文段：`</think>` 之后到结束，一站收束
  const aStart = Math.min(closeIdx + 1, steps.length - 1);
  stations.push({
    start: aStart,
    end: steps.length - 1,
    label: "收束作答",
    meanEntropy: meanEntropy(steps, aStart, steps.length - 1),
    excerpt: excerpt(steps, aStart, steps.length - 1),
    phase: "answer",
  });

  const peak = stations.find((s) => s.label.startsWith("反复权衡"));
  const headline = peak
    ? `它先想了 ${closeIdx - tStart} 步（第 ${peak.start + 1}–${peak.end + 1} 步分布最散），再用 ${steps.length - 1 - closeIdx} 步写下正式回答`
    : `它先想了 ${closeIdx - tStart} 步，再用 ${steps.length - 1 - closeIdx} 步写下正式回答`;

  return { stations, headline, thinkEnd: closeIdx };
}
