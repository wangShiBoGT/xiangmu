import { describe, expect, it } from "vitest";
import {
  agentEventsByStep,
  modelSegments,
  sanitizeAgentEvents,
  type AgentEvent,
} from "./agentTrace";

const call: AgentEvent = { type: "tool_call", atStep: 2, tool: "calc", input: "1+1" };
const res: AgentEvent = {
  type: "tool_result",
  atStep: 3,
  tool: "calc",
  output: "2",
  ok: true,
  durationMs: 5,
};
const fail: AgentEvent = {
  type: "tool_result",
  atStep: 4,
  tool: "calc",
  output: "SyntaxError: unexpected token",
  ok: false,
  durationMs: 3,
};
const dp: AgentEvent = { type: "decision_point", atStep: 2, note: "要不要用工具" };

describe("Agent 事件（E4a 加法式扩展）", () => {
  it("合法事件全部保留，失败结果原样通过（失败也是数据）", () => {
    const r = sanitizeAgentEvents([call, res, fail, dp], 10);
    expect(r).toEqual([call, res, fail, dp]);
  });

  it("整体不是数组返回 null；坏事件被逐条过滤而非整体失败", () => {
    expect(sanitizeAgentEvents("x", 10)).toBeNull();
    const r = sanitizeAgentEvents(
      [call, { type: "tool_call", atStep: 99, tool: "t", input: "" }, { type: "alien" }, 7],
      10,
    );
    expect(r).toEqual([call]);
  });

  it("atStep 必须落在 steps 范围内", () => {
    expect(sanitizeAgentEvents([{ ...call, atStep: -1 }], 10)).toEqual([]);
    expect(sanitizeAgentEvents([{ ...call, atStep: 10 }], 10)).toEqual([]);
  });

  it("多模型串联：model 徽标与 model_handoff 交接事件合法通过，坏 model/to 被过滤", () => {
    const withModel: AgentEvent = { ...call, model: "planner-1.5b" };
    const handoff: AgentEvent = {
      type: "model_handoff",
      atStep: 5,
      from: "planner-1.5b",
      to: "coder-0.6b",
      note: "规划完成，交给执行模型",
    };
    const firstSeg: AgentEvent = { type: "model_handoff", atStep: 0, to: "planner-1.5b" };
    expect(sanitizeAgentEvents([withModel, handoff, firstSeg], 10)).toEqual([
      withModel,
      handoff,
      firstSeg,
    ]);
    expect(
      sanitizeAgentEvents(
        [
          { ...call, model: 7 },
          { type: "model_handoff", atStep: 1 },
          { type: "model_handoff", atStep: 1, to: 3 },
        ],
        10,
      ),
    ).toEqual([]);
  });

  it("决策层字段：reason/confidence/evidence 合法通过，越界 confidence 被过滤", () => {
    const withDecision: AgentEvent = {
      ...call,
      reason: "知识截止，需要最新信息",
      confidence: 0.42,
    };
    const dpEv: AgentEvent = {
      type: "decision_point",
      atStep: 1,
      note: "是否检索",
      evidence: "找到 3 篇网页",
      confidence: 0.9,
    };
    expect(sanitizeAgentEvents([withDecision, dpEv], 10)).toEqual([
      withDecision,
      dpEv,
    ]);
    expect(
      sanitizeAgentEvents(
        [
          { ...call, confidence: 1.5 },
          { ...call, confidence: Number.NaN },
          { ...call, reason: 7 },
        ],
        10,
      ),
    ).toEqual([]);
  });

  it("modelSegments：交接是责任边界，首段未记录归属如实为 null", () => {
    const h1: AgentEvent = { type: "model_handoff", atStep: 3, to: "planner" };
    const h2: AgentEvent = {
      type: "model_handoff",
      atStep: 7,
      from: "planner",
      to: "coder",
    };
    expect(modelSegments([call, h2, h1], 10)).toEqual([
      { model: null, fromStep: 0, toStep: 2 },
      { model: "planner", fromStep: 3, toStep: 6 },
      { model: "coder", fromStep: 7, toStep: 9 },
    ]);
    expect(modelSegments([call], 10)).toEqual([]);
    expect(modelSegments([h1], 0)).toEqual([]);
  });

  it("agentEventsByStep 按步分组并保序", () => {
    const m = agentEventsByStep([call, dp, res]);
    expect(m.get(2)).toEqual([call, dp]);
    expect(m.get(3)).toEqual([res]);
  });
});
