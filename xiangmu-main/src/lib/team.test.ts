import { describe, it, expect } from "vitest";
import {
  buildLiveTeam,
  teamFromTrace,
  retrievalSummary,
  type LiveTeamInput,
} from "./team";
import type { AgentEvent } from "./agentTrace";

const exec = (
  phase: "waiting" | "running" | "done",
  steps = 0,
): LiveTeamInput["executor"] => ({ model: "Qwen3 0.6B", steps, phase });

describe("buildLiveTeam", () => {
  it("单模型运行：只有 Executor，不虚构队友", () => {
    const t = buildLiveTeam({ executor: exec("running", 5) });
    expect(t.workers.map((w) => w.id)).toEqual(["executor"]);
    expect(t.currentOwner).toBe("executor");
    expect(t.artifacts).toHaveLength(0);
    expect(t.handoffs).toHaveLength(0);
  });

  it("规划运行中：Planner running 为当前执行者，Executor waiting，双方同时在场", () => {
    const t = buildLiveTeam({
      plan: {
        status: "running",
        planner: "DeepSeek R1",
        text: "1. 审题",
        durationMs: null,
      },
      executor: exec("waiting"),
    });
    expect(t.workers.map((w) => w.id)).toEqual(["planner", "executor"]);
    expect(t.currentOwner).toBe("planner");
    expect(t.workers[1].status).toBe("waiting");
  });

  it("规划完成：产出 Artifact(plan) 并带 reason 交给 Executor；Planner 永不消失（finished）", () => {
    const t = buildLiveTeam({
      plan: {
        status: "done",
        planner: "DeepSeek R1",
        text: "1. 审题 2. 作答",
        durationMs: 7321,
      },
      executor: exec("running", 12),
    });
    const planner = t.workers.find((w) => w.id === "planner");
    expect(planner?.status).toBe("finished");
    const a = t.artifacts.find((x) => x.type === "plan");
    expect(a?.content).toBe("1. 审题 2. 作答");
    expect(a?.ok).toBe(true);
    const h = t.handoffs.find((x) => x.from === "planner");
    expect(h?.to).toBe("executor");
    expect(h?.reason).toContain("计划完成");
    expect(h?.artifactId).toBe(a?.id);
    expect(t.currentOwner).toBe("executor");
  });

  it("规划失败：Planner failed、Artifact ok:false、降级原因如实", () => {
    const t = buildLiveTeam({
      plan: {
        status: "failed",
        planner: "Qwen3 0.6B",
        text: "",
        durationMs: 900,
        error: "worker crashed",
      },
      executor: exec("running", 1),
    });
    expect(t.workers[0].status).toBe("failed");
    const a = t.artifacts[0];
    expect(a.ok).toBe(false);
    expect(a.content).toContain("worker crashed");
    expect(t.handoffs[0].reason).toContain("失败");
  });

  it("检索完成：Researcher 产出 search_result，交给 Planner（若有规划）", () => {
    const t = buildLiveTeam({
      research: {
        status: "done",
        query: "什么是熵",
        resultCount: 8,
        keptCount: 4,
        durationMs: 1500,
      },
      plan: {
        status: "running",
        planner: "Qwen3 0.6B",
        text: "",
        durationMs: null,
      },
      executor: exec("waiting"),
    });
    expect(t.workers.map((w) => w.id)).toEqual([
      "researcher",
      "planner",
      "executor",
    ]);
    const h = t.handoffs.find((x) => x.from === "researcher");
    expect(h?.to).toBe("planner");
    expect(t.artifacts[0].content).toContain("什么是熵");
  });

  it("Mission：阶段由真实子运行推导，无检索/规划则不出现对应阶段", () => {
    const bare = buildLiveTeam({ executor: exec("done", 30) });
    expect(bare.mission.map((m) => m.key)).toEqual(["write", "finish"]);
    expect(bare.mission.every((m) => m.status === "done")).toBe(true);
    const full = buildLiveTeam({
      research: { status: "running", query: "q" },
      executor: exec("waiting"),
    });
    expect(full.mission.map((m) => m.key)).toEqual([
      "search",
      "write",
      "finish",
    ]);
    expect(full.mission[0].status).toBe("active");
  });
});

describe("teamFromTrace", () => {
  it("从真实 plan/handoff 事件重建：Planner+Artifact(plan)+Handoff（reason 原文优先）", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", atStep: 0, tool: "plan", input: "q", model: "ds" },
      {
        type: "tool_result",
        atStep: 0,
        tool: "plan",
        output: "计划原文",
        ok: true,
        durationMs: 5000,
        model: "ds",
      },
      {
        type: "model_handoff",
        atStep: 0,
        from: "ds",
        to: "qwen",
        reason: "接力式双模型",
      },
    ];
    const t = teamFromTrace(events, { executorModel: "qwen", steps: 40 });
    expect(t.workers.map((w) => w.id)).toEqual(["planner", "executor"]);
    expect(t.artifacts[0].content).toBe("计划原文");
    expect(t.handoffs[0].reason).toBe("接力式双模型");
    expect(t.currentOwner).toBeNull();
  });

  it("检索失败事件：Researcher failed、Artifact ok:false，如实不隐藏", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", atStep: 0, tool: "web_search", input: "q" },
      {
        type: "tool_result",
        atStep: 0,
        tool: "web_search",
        output: "HTTP 500",
        ok: false,
        durationMs: 300,
      },
    ];
    const t = teamFromTrace(events, { executorModel: "qwen", steps: 10 });
    const r = t.workers.find((w) => w.id === "researcher");
    expect(r?.status).toBe("failed");
    expect(t.artifacts[0].ok).toBe(false);
    expect(t.mission.find((m) => m.key === "search")?.status).toBe("failed");
  });

  it("无 agent 事件：只有 Executor（诚实缺席）", () => {
    const t = teamFromTrace([], { executorModel: "qwen", steps: 3 });
    expect(t.workers.map((w) => w.id)).toEqual(["executor"]);
  });
});

describe("retrievalSummary", () => {
  it("列出选用与未采用的真实文档标题", () => {
    const s = retrievalSummary({
      query: "q",
      results: [
        { title: "A", url: "u1", snippet: "" },
        { title: "B", url: "u2", snippet: "" },
      ],
      selected: [0],
    });
    expect(s).toContain("✔ 选用 A");
    expect(s).toContain("✗ 未采用 B");
  });
});
