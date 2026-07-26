import { describe, it, expect } from "vitest";
import { buildMoments, stepMoments, runMoments } from "./moments";
import type { TokenStep } from "./trace";
import type { AgentEvent } from "./agentTrace";

const step = (over: Partial<TokenStep>): TokenStep => ({
  id: 1,
  text: "天",
  prob: 0.4,
  topk: [
    { id: 1, text: "天", prob: 0.4 },
    { id: 2, text: "空", prob: 0.1 },
  ],
  entropy: 1.0,
  dt: 50,
  ...over,
});

describe("stepMoments", () => {
  it("犹豫点：top-2 差距 <5% 生成 coinflip Moment（真实读数回填）", () => {
    const s = step({
      topk: [
        { id: 1, text: "天", prob: 0.31 },
        { id: 2, text: "空", prob: 0.29 },
      ],
      prob: 0.31,
    });
    const ms = stepMoments([s, step({}), step({})]);
    const coin = ms.find((m) => m.kind === "coinflip");
    expect(coin).toBeTruthy();
    if (coin?.kind === "coinflip") {
      expect(coin.winner).toBe("天");
      expect(coin.loser).toBe("空");
      expect(coin.gap).toBeCloseTo(0.02);
      expect(coin.index).toBe(0);
    }
  });

  it("温度改命：选中非第一名生成 temp_override（带 rank 与温度）", () => {
    const s = step({
      id: 2,
      text: "空",
      prob: 0.1,
      topk: [
        { id: 1, text: "天", prob: 0.6 },
        { id: 2, text: "空", prob: 0.1 },
      ],
    });
    const ms = stepMoments([s], { temperature: 0.9 });
    const m = ms.find((x) => x.kind === "temp_override");
    expect(m).toBeTruthy();
    if (m?.kind === "temp_override") {
      expect(m.rank).toBe(2);
      expect(m.rank1).toBe("天");
      expect(m.temperature).toBe(0.9);
    }
  });

  it("慢步：dt 超均值 3 倍生成 slow（倍数由真实 dt 算出）", () => {
    const steps = [
      ...Array.from({ length: 9 }, () => step({ dt: 10 })),
      step({ dt: 200 }),
    ];
    const ms = stepMoments(steps);
    const slow = ms.find((m) => m.kind === "slow");
    expect(slow).toBeTruthy();
    if (slow?.kind === "slow") {
      expect(slow.index).toBe(9);
      expect(slow.factor).toBeGreaterThan(2);
    }
  });

  it("确定性：同一 steps 两次调用结果一致", () => {
    const steps = [step({ dt: 10 }), step({ dt: 100 }), step({})];
    expect(stepMoments(steps)).toEqual(stepMoments(steps));
  });
});

describe("runMoments", () => {
  const agent: AgentEvent[] = [
    { type: "tool_call", atStep: 0, tool: "web_search", input: "why sky blue" },
    {
      type: "tool_result",
      atStep: 0,
      tool: "web_search",
      output: "8 条结果",
      ok: true,
      durationMs: 1200,
    },
    {
      type: "decision_point",
      atStep: 0,
      note: "选用前 4 条进入上下文，其余 4 条因上下文预算未采用",
    },
    { type: "tool_call", atStep: 0, tool: "plan", input: "q" },
    {
      type: "tool_result",
      atStep: 0,
      tool: "plan",
      output: "一、审题。二、分点作答。",
      ok: true,
      durationMs: 7300,
      model: "DeepSeek R1",
    },
  ];

  it("检索/规划事件 → retrieval/plan Moment（真实数字回填）", () => {
    const ms = runMoments(agent);
    const r = ms.find((m) => m.kind === "retrieval");
    const p = ms.find((m) => m.kind === "plan");
    expect(r?.kind === "retrieval" && r.query).toBe("why sky blue");
    expect(r?.kind === "retrieval" && r.resultCount).toBe(8);
    expect(r?.kind === "retrieval" && r.keptCount).toBe(4);
    expect(p?.kind === "plan" && p.planner).toBe("DeepSeek R1");
    expect(p?.kind === "plan" && p.chars).toBeGreaterThan(0);
  });

  it("失败事件如实入档（ok:false + 错误原文），不隐藏", () => {
    const fail: AgentEvent[] = [
      { type: "tool_call", atStep: 0, tool: "plan", input: "q" },
      {
        type: "tool_result",
        atStep: 0,
        tool: "plan",
        output: "worker crashed",
        ok: false,
        durationMs: 500,
      },
    ];
    const ms = runMoments(fail);
    expect(ms[0].kind).toBe("plan");
    expect(ms[0].ok).toBe(false);
    if (ms[0].kind === "plan") expect(ms[0].error).toBe("worker crashed");
  });

  it("buildMoments：子运行时刻在前，步内时刻按步序在后", () => {
    const ms = buildMoments([step({ dt: 10 }), step({ dt: 100 })], { agent });
    expect(ms[0].kind === "retrieval" || ms[0].kind === "plan").toBe(true);
    const lastRunIdx = ms.map((m) => m.kind).lastIndexOf("plan");
    const firstStepIdx = ms.findIndex(
      (m) => m.kind !== "plan" && m.kind !== "retrieval",
    );
    if (firstStepIdx >= 0) expect(firstStepIdx).toBeGreaterThan(lastRunIdx);
  });
});
