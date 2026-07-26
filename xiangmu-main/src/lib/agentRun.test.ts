import { describe, it, expect } from "vitest";
import {
  buildRetrievalEvents,
  buildRetrievalFailEvents,
  buildPlanEvents,
  buildHandoffEvent,
  buildPlanPrompt,
  buildExecutePrompt,
  RETRIEVAL_KEEP,
} from "./agentRun";
import { sanitizeAgentEvents } from "./agentTrace";
import type { SearchResult } from "./search";

const mkResults = (n: number): SearchResult[] =>
  Array.from({ length: n }, (_, i) => ({
    title: `t${i}`,
    url: `https://x/${i}`,
    snippet: `s${i}`,
  }));

describe("buildRetrievalEvents", () => {
  it("生成 call/result/decision 三事件并如实记录选用与未采用数", () => {
    const { events, record } = buildRetrievalEvents("q", mkResults(9), 321);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ type: "tool_call", tool: "web_search" });
    expect(events[1]).toMatchObject({
      type: "tool_result",
      ok: true,
      durationMs: 321,
      output: "9 条结果",
    });
    expect(events[2].type).toBe("decision_point");
    expect((events[2] as { note?: string }).note).toContain(
      `前 ${RETRIEVAL_KEEP} 条`,
    );
    expect((events[2] as { note?: string }).note).toContain("5 条");
    expect(record.selected).toEqual([0, 1, 2, 3]);
  });

  it("结果少于 K 时选用全部", () => {
    const { events, record } = buildRetrievalEvents("q", mkResults(2), 10);
    expect(record.selected).toEqual([0, 1]);
    expect((events[2] as { note?: string }).note).toContain("其余 0 条");
  });

  it("事件通过 trace 的 sanitize 校验", () => {
    const { events } = buildRetrievalEvents("q", mkResults(3), 5);
    expect(sanitizeAgentEvents(events, 100)).toHaveLength(3);
  });
});

describe("buildRetrievalFailEvents", () => {
  it("失败时记 ok:false 与错误原文", () => {
    const events = buildRetrievalFailEvents("q", "HTTP 500", 88);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ ok: false, output: "HTTP 500" });
  });
});

describe("plan run builders", () => {
  it("规划事件含真实计划原文与模型归属", () => {
    const events = buildPlanEvents("任务", "1. 先想 2. 再答", 456, "qwen3");
    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      tool: "plan",
      output: "1. 先想 2. 再答",
      durationMs: 456,
      model: "qwen3",
    });
    expect(sanitizeAgentEvents(events, 10)).toHaveLength(3);
  });

  it("提示词模板包含任务与计划原文", () => {
    expect(buildPlanPrompt("为什么天空是蓝的")).toContain("为什么天空是蓝的");
    const ex = buildExecutePrompt("问", "计划");
    expect(ex).toContain("问");
    expect(ex).toContain("计划");
  });
});

describe("buildHandoffEvent", () => {
  it("记录 from/to 与真实接力加载耗时", () => {
    const e = buildHandoffEvent("planner", "executor", 1234.6);
    expect(e).toMatchObject({
      type: "model_handoff",
      atStep: 0,
      from: "planner",
      to: "executor",
    });
    expect((e as { note?: string }).note).toContain("1235 ms");
    expect(sanitizeAgentEvents([e], 10)).toHaveLength(1);
  });

  it("无耗时则不编造 note", () => {
    const e = buildHandoffEvent("a", "b");
    expect((e as { note?: string }).note).toBeUndefined();
  });
});
