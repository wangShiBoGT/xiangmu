/** Moment Engine（ACDL Sprint 2）：Trace → Moment 的统一数据层。
 *  把一次运行里真实发生的「值得讲」时刻（犹豫/改命/发散/慢步/检索/规划）
 *  收敛成带类型的 Moment 对象，全部由真实字段确定性生成：
 *  步内时刻复用 lib/decisions 的同源阈值（犹豫 <5%、发散 entropyLevel≥0.7、慢步 3×均值），
 *  子运行时刻只消费真实 agent 事件——没发生的不生成，失败如实入档。 */

import { decisionEvents, type DecisionOptions } from "./decisions";
import type { TokenStep } from "./trace";
import type { AgentEvent } from "./agentTrace";

export interface MomentCandidate {
  text: string;
  prob: number;
}

/** 步内时刻：锚定某个 token 步，携带模板填空所需的真实读数 */
export type StepMoment =
  | {
      kind: "coinflip";
      index: number;
      winner: string;
      loser: string;
      winnerProb: number;
      loserProb: number;
      gap: number;
      losers: MomentCandidate[];
    }
  | {
      kind: "temp_override";
      index: number;
      chosen: string;
      chosenProb: number;
      rank: number;
      rank1: string;
      rank1Prob: number;
      temperature?: number;
      losers: MomentCandidate[];
    }
  | {
      kind: "scattered";
      index: number;
      chosen: string;
      entropy: number;
      candidateCount: number;
      losers: MomentCandidate[];
    }
  | {
      kind: "slow";
      index: number;
      token: string;
      factor: number;
      dtMs: number;
      meanMs: number;
      losers: MomentCandidate[];
    };

/** 子运行时刻：来自真实 agent 事件（检索/规划），index 为事件锚定步 */
export type RunMoment =
  | {
      kind: "retrieval";
      index: number;
      ok: boolean;
      query: string;
      resultCount: number;
      keptCount: number;
      durationMs: number;
      error?: string;
    }
  | {
      kind: "plan";
      index: number;
      ok: boolean;
      planner?: string;
      chars: number;
      durationMs: number;
      error?: string;
    };

export type Moment = StepMoment | RunMoment;
export type MomentKind = Moment["kind"];

const t = (s: string) => s.trim() || "␣";

function losersOf(s: TokenStep): MomentCandidate[] {
  return s.topk
    .filter((c) => c.id !== s.id)
    .map((c) => ({ text: t(c.text), prob: c.prob }));
}

/** 步内时刻：复用 decisions 的判定与显著度截取，回填成带类型的 Moment */
export function stepMoments(
  steps: TokenStep[],
  opts?: DecisionOptions & { temperature?: number },
): StepMoment[] {
  const events = decisionEvents(steps, opts);
  const meanDt =
    steps.length > 0 ? steps.reduce((a, s) => a + s.dt, 0) / steps.length : 0;
  const out: StepMoment[] = [];
  for (const e of events) {
    const s = steps[e.index];
    if (!s) continue;
    switch (e.kind) {
      case "coinflip":
        out.push({
          kind: "coinflip",
          index: e.index,
          winner: t(s.text),
          loser: t(s.topk.find((c) => c.id !== s.id)?.text ?? ""),
          winnerProb: s.prob,
          loserProb: s.topk.find((c) => c.id !== s.id)?.prob ?? 0,
          gap: s.topk.length >= 2 ? s.topk[0].prob - s.topk[1].prob : 0,
          losers: losersOf(s),
        });
        break;
      case "temp_override": {
        const rank = s.topk.findIndex((c) => c.id === s.id) + 1;
        out.push({
          kind: "temp_override",
          index: e.index,
          chosen: t(s.text),
          chosenProb: s.prob,
          rank,
          rank1: t(s.topk[0]?.text ?? ""),
          rank1Prob: s.topk[0]?.prob ?? 0,
          temperature: opts?.temperature,
          losers: losersOf(s),
        });
        break;
      }
      case "scattered":
        out.push({
          kind: "scattered",
          index: e.index,
          chosen: t(s.text),
          entropy: s.entropy,
          candidateCount: s.topk.length,
          losers: losersOf(s),
        });
        break;
      case "slow":
        out.push({
          kind: "slow",
          index: e.index,
          token: t(s.text),
          factor: meanDt > 0 ? s.dt / meanDt : 0,
          dtMs: s.dt,
          meanMs: meanDt,
          losers: losersOf(s),
        });
        break;
    }
  }
  return out;
}

/** 子运行时刻：只消费真实 tool_result 事件（web_search / plan），失败如实保留 */
export function runMoments(agent: AgentEvent[]): RunMoment[] {
  const out: RunMoment[] = [];
  for (const e of agent) {
    if (e.type !== "tool_result") continue;
    if (e.tool === "web_search") {
      const call = agent.find(
        (x) => x.type === "tool_call" && x.tool === "web_search",
      );
      const decision = agent.find((x) => x.type === "decision_point");
      const nums = e.ok ? e.output.match(/\d+/) : null;
      const keptNums =
        decision?.type === "decision_point" && decision.note
          ? decision.note.match(/\d+/)
          : null;
      out.push({
        kind: "retrieval",
        index: e.atStep,
        ok: e.ok,
        query: call?.type === "tool_call" ? call.input : "",
        resultCount: nums ? Number(nums[0]) : 0,
        keptCount: keptNums ? Number(keptNums[0]) : 0,
        durationMs: e.durationMs,
        error: e.ok ? undefined : e.output,
      });
    } else if (e.tool === "plan") {
      out.push({
        kind: "plan",
        index: e.atStep,
        ok: e.ok,
        planner: e.model,
        chars: e.ok ? e.output.length : 0,
        durationMs: e.durationMs,
        error: e.ok ? undefined : e.output,
      });
    }
  }
  return out;
}

/** 整次运行的 Moment 流：子运行时刻在前（发生在生成之前），步内时刻按步序排列 */
export function buildMoments(
  steps: TokenStep[],
  opts?: DecisionOptions & { temperature?: number; agent?: AgentEvent[] },
): Moment[] {
  const runs = opts?.agent ? runMoments(opts.agent) : [];
  return [...runs, ...stepMoments(steps, opts)];
}
