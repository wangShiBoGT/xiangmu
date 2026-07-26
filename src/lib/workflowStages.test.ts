import { describe, it, expect } from "vitest";
import { buildWorkflowStages, EVIDENCE_LABEL } from "./workflowStages";
import type { TokenStep } from "./trace";
import type { AgentEvent } from "./agentTrace";

function mkStep(text: string, i: number): TokenStep {
  return { id: i, text, prob: 0.5, topk: [], entropy: 1, dt: 10 };
}

describe("buildWorkflowStages", () => {
  it("idle 且无步数返回空（诚实缺席）", () => {
    expect(buildWorkflowStages({ phase: "idle", steps: [] })).toEqual([]);
  });

  it("运行级兜底：无 think 边界时有 tokenize/prefill/decode/finish", () => {
    const steps = Array.from({ length: 5 }, (_, i) => mkStep("a", i));
    const stages = buildWorkflowStages({ phase: "done", steps });
    expect(stages.map((s) => s.key)).toEqual([
      "tokenize",
      "prefill",
      "decode",
      "finish",
    ]);
    expect(stages.every((s) => s.evidence === "runtime")).toBe(true);
  });

  it("运行中 decode 为 active，finish 为 pending", () => {
    const steps = [mkStep("a", 0)];
    const stages = buildWorkflowStages({ phase: "running", steps, tps: 12.3 });
    expect(stages.find((s) => s.key === "decode")?.status).toBe("active");
    expect(stages.find((s) => s.key === "decode")?.detail).toContain(
      "12.3 tokens/s",
    );
    expect(stages.find((s) => s.key === "finish")?.status).toBe("pending");
  });

  it("结构级：</think> 边界切出思考段/作答段并带步区间", () => {
    const steps = [
      mkStep("<think>", 0),
      mkStep("嗯", 1),
      mkStep("</think>", 2),
      mkStep("答", 3),
    ];
    const stages = buildWorkflowStages({ phase: "done", steps });
    const think = stages.find((s) => s.key === "think");
    const answer = stages.find((s) => s.key === "answer");
    expect(think?.evidence).toBe("structure");
    expect(think?.fromStep).toBe(0);
    expect(think?.toStep).toBe(2);
    expect(answer?.fromStep).toBe(3);
    expect(stages.find((s) => s.key === "decode")).toBeUndefined();
  });

  it("事件级：agent 事件按原文插入并标为 event", () => {
    const steps = Array.from({ length: 10 }, (_, i) => mkStep("a", i));
    const agent: AgentEvent[] = [
      { type: "tool_call", atStep: 3, tool: "search", input: "q" },
      {
        type: "tool_result",
        atStep: 5,
        tool: "search",
        output: "r",
        ok: true,
        durationMs: 120,
      },
      { type: "model_handoff", atStep: 7, to: "glm-edge" },
    ];
    const stages = buildWorkflowStages({ phase: "done", steps, agent });
    const events = stages.filter((s) => s.evidence === "event");
    expect(events.map((s) => s.label)).toEqual([
      "调用工具 search",
      "工具 search 返回",
      "模型交接 → glm-edge",
    ]);
  });

  it("越界的 agent 事件不产生阶段", () => {
    const steps = [mkStep("a", 0)];
    const agent: AgentEvent[] = [
      { type: "tool_call", atStep: 5, tool: "x", input: "" },
    ];
    const stages = buildWorkflowStages({ phase: "done", steps, agent });
    expect(stages.filter((s) => s.evidence === "event")).toEqual([]);
  });

  it("pipeline 实测进入 detail（单位齐全）", () => {
    const steps = [mkStep("a", 0)];
    const stages = buildWorkflowStages({
      phase: "done",
      steps,
      pipeline: { tokenizeMs: 12, prefillMs: 340, decodeMs: 1500 },
    });
    expect(stages.find((s) => s.key === "tokenize")?.detail).toBe("12 ms");
    expect(stages.find((s) => s.key === "finish")?.detail).toContain("1.9 s");
  });

  it("证据徽章文案齐全", () => {
    expect(EVIDENCE_LABEL.event).toBe("事件记录");
    expect(EVIDENCE_LABEL.structure).toBe("结构边界");
    expect(EVIDENCE_LABEL.runtime).toBe("运行实测");
  });
});
