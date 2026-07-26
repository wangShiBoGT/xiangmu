/** 决策事件引擎（决策优先 v2 · S1）：把一次生成翻译成「决策事件」流。
 *  每个事件 = 一句普通人能读的话 + 真实证据读数；全部由 trace 真实字段
 *  （prob / topk / entropy / dt）确定性判定，无随机数、无 AI 解读。
 *  口径与既有系统同源：犹豫 = closeSteps（差<5% 且 top1>5%）；
 *  分散 = entropyLevel ≥ 0.7（与 director.birthAt 同阈值）。 */

import { entropyLevel } from "./trace";
import type { TokenStep } from "./trace";

export type DecisionKind =
  | "coinflip" // 掷硬币：前两名几乎并列
  | "temp_override" // 温度改命：抽中的不是第一名
  | "scattered" // 想法很散：候选分布高熵
  | "slow"; // 卡住了：这一步耗时远超均值

export interface DecisionEvent {
  kind: DecisionKind;
  index: number;
  /** 人话一句（含真实 token 原文与真实读数） */
  text: string;
  /** 证据读数（口径+单位），供展开层显示 */
  evidence: string;
  /** 该步放弃的候选（真实 topk 去掉选中者），供展开层显示 */
  losers: { text: string; prob: number }[];
}

export interface DecisionOptions {
  /** 犹豫判定：top-2 差距上限（与 closeSteps 同源） */
  closeGap?: number;
  /** 分散判定：entropyLevel 下限（与 director.birthAt 同源） */
  scatteredAt?: number;
  /** 卡住判定：dt 超过全程均值的倍数 */
  slowFactor?: number;
  /** 每类事件最多保留个数（按显著程度取最险的几个），0 = 不限 */
  maxPerKind?: number;
}

const DEFAULTS: Required<DecisionOptions> = {
  closeGap: 0.05,
  scatteredAt: 0.7,
  slowFactor: 3,
  maxPerKind: 3,
};

const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
const tokenText = (s: TokenStep) => s.text.trim() || s.text || "␣";

function selectedRank(s: TokenStep): number {
  const i = s.topk.findIndex((c) => c.id === s.id);
  return i < 0 ? -1 : i + 1;
}

function losersOf(s: TokenStep): { text: string; prob: number }[] {
  return s.topk
    .filter((c) => c.id !== s.id)
    .map((c) => ({ text: c.text.trim() || "␣", prob: c.prob }));
}

/** 单步判定（一个步可能同时命中多类，全部保留——它们互相独立成立）。 */
function eventsAt(
  s: TokenStep,
  i: number,
  meanDt: number,
  o: Required<DecisionOptions>,
  temperature?: number,
): DecisionEvent[] {
  const out: DecisionEvent[] = [];
  const tk = s.topk;
  const word = tokenText(s);

  if (tk.length >= 2 && tk[0].prob > 0.05 && tk[0].prob - tk[1].prob < o.closeGap) {
    const a = tk[0].text.trim() || "␣";
    const b = tk[1].text.trim() || "␣";
    out.push({
      kind: "coinflip",
      index: i,
      text: `它几乎是掷硬币：「${a}」${pct(tk[0].prob)} 对「${b}」${pct(tk[1].prob)}，这次抽中了「${word}」`,
      evidence: `top-2 差距 ${pct(tk[0].prob - tk[1].prob)} · 口径 P(vocab)`,
      losers: losersOf(s),
    });
  }

  const rank = selectedRank(s);
  if (rank > 1) {
    const first = tk[0].text.trim() || "␣";
    const t = temperature != null ? `温度 ${temperature} ` : "抽签";
    out.push({
      kind: "temp_override",
      index: i,
      text: `${t}让它没选第一名「${first}」(${pct(tk[0].prob)})，抽中了第 ${rank} 名「${word}」(${pct(s.prob)})`,
      evidence: `选中 rank ${rank} · 采样自完整 softmax 分布`,
      losers: losersOf(s),
    });
  }

  if (entropyLevel(s.entropy) >= o.scatteredAt) {
    out.push({
      kind: "scattered",
      index: i,
      text: `这一步它的候选最分散，很多词都有机会，最终写下「${word}」`,
      evidence: `熵 ${s.entropy.toFixed(2)} nats（全量 softmax）`,
      losers: losersOf(s),
    });
  }

  if (meanDt > 0 && s.dt > meanDt * o.slowFactor) {
    out.push({
      kind: "slow",
      index: i,
      text: `写「${word}」这一步花了平时 ${(s.dt / meanDt).toFixed(1)} 倍的时间`,
      evidence: `本步 ${s.dt.toFixed(0)} ms · 全程均值 ${meanDt.toFixed(0)} ms`,
      losers: losersOf(s),
    });
  }

  return out;
}

/** 全量决策事件（增量安全：只依赖已给的 steps）。
 *  maxPerKind>0 时每类按显著程度截取，避免日志刷屏——一直爆就是没有爆。 */
export function decisionEvents(
  steps: TokenStep[],
  opts?: DecisionOptions & { temperature?: number },
): DecisionEvent[] {
  const o = { ...DEFAULTS, ...opts };
  if (steps.length === 0) return [];
  const meanDt = steps.reduce((a, s) => a + s.dt, 0) / steps.length;
  const all: DecisionEvent[] = [];
  for (let i = 0; i < steps.length; i++)
    all.push(...eventsAt(steps[i], i, meanDt, o, opts?.temperature));
  if (o.maxPerKind <= 0) return all;

  const salience = (e: DecisionEvent): number => {
    const s = steps[e.index];
    switch (e.kind) {
      case "coinflip":
        // 差距越小越险
        return 1 - (s.topk[0].prob - s.topk[1].prob);
      case "temp_override":
        // 落差越大越意外
        return s.topk[0].prob - s.prob;
      case "scattered":
        return s.entropy;
      case "slow":
        return s.dt;
    }
  };
  const kept = new Set<DecisionEvent>();
  for (const kind of ["coinflip", "temp_override", "scattered", "slow"] as const) {
    all
      .filter((e) => e.kind === kind)
      .sort((a, b) => salience(b) - salience(a))
      .slice(0, o.maxPerKind)
      .forEach((e) => kept.add(e));
  }
  return all.filter((e) => kept.has(e)).sort((a, b) => a.index - b.index);
}
