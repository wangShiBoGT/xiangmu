/** Sprint 5/6 · 把真实检索与规划子运行记录成 agent 事件（插进 Workflow，不另造世界）。
 *  所有事件字段都来自实际发生的调用：查询原文、真实结果数、实测耗时、真实计划文本；
 *  没有发生的事不生成事件。 */
import type { AgentEvent } from "./agentTrace";
import type { SearchResult } from "./search";

/** 送入上下文的检索结果条数上限（上下文预算，落选项如实记为未采用） */
export const RETRIEVAL_KEEP = 4;

/** trace.extensions.retrieval：检索决策的完整证据（供 Decision 层下钻） */
export interface RetrievalRecord {
  query: string;
  results: SearchResult[];
  /** 送入上下文的结果下标（按返回顺序取前 K，理由=上下文预算） */
  selected: number[];
}

export function buildRetrievalEvents(
  query: string,
  results: SearchResult[],
  durationMs: number,
): { events: AgentEvent[]; record: RetrievalRecord } {
  const selected = results.slice(0, RETRIEVAL_KEEP).map((_, i) => i);
  const events: AgentEvent[] = [
    { type: "tool_call", atStep: 0, tool: "web_search", input: query },
    {
      type: "tool_result",
      atStep: 0,
      tool: "web_search",
      output: `${results.length} 条结果`,
      ok: true,
      durationMs,
    },
    {
      type: "decision_point",
      atStep: 0,
      note: `选用前 ${selected.length} 条进入上下文，其余 ${
        results.length - selected.length
      } 条因上下文预算未采用`,
      reason: "按返回顺序取前 K 条（无重排器，如实记录）",
    },
  ];
  return { events, record: { query, results, selected } };
}

export function buildRetrievalFailEvents(
  query: string,
  error: string,
  durationMs: number,
): AgentEvent[] {
  return [
    { type: "tool_call", atStep: 0, tool: "web_search", input: query },
    {
      type: "tool_result",
      atStep: 0,
      tool: "web_search",
      output: error,
      ok: false,
      durationMs,
    },
  ];
}

/** Agent 规划子运行：同一模型先产出行动计划（真实生成），再按计划作答 */
export function buildPlanPrompt(task: string): string {
  return `请为回答下面的问题列出一个不超过 60 字的行动计划（只输出计划本身，分点列出）：\n\n${task}`;
}

export function buildExecutePrompt(task: string, plan: string): string {
  return `按照以下行动计划回答问题。\n\n行动计划：\n${plan}\n\n问题：${task}`;
}

/** 双模型接力：规划模型交棒给执行模型（接力式：先卸载再加载，交接耗时如实记录） */
export function buildHandoffEvent(
  from: string,
  to: string,
  loadMs?: number,
): AgentEvent {
  return {
    type: "model_handoff",
    atStep: 0,
    from,
    to,
    note: loadMs !== undefined ? `接力加载 ${Math.round(loadMs)} ms` : undefined,
    reason: "接力式双模型：规划模型产出计划后交棒，正式回答由执行模型逐 token 产出",
  };
}

export function buildPlanEvents(
  task: string,
  plan: string,
  durationMs: number,
  modelId: string,
): AgentEvent[] {
  return [
    {
      type: "tool_call",
      atStep: 0,
      tool: "plan",
      input: task,
      model: modelId,
    },
    {
      type: "tool_result",
      atStep: 0,
      tool: "plan",
      output: plan,
      ok: true,
      durationMs,
      model: modelId,
    },
    {
      type: "decision_point",
      atStep: 0,
      note: "按上述计划开始作答",
      model: modelId,
      reason: "规划子运行完成（同一模型接力，真实生成的计划原文见工具结果）",
    },
  ];
}
