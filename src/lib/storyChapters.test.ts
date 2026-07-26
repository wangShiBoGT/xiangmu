import { describe, expect, it } from "vitest";
import { buildStoryChapters } from "./storyChapters";
import type { GenerationTrace, TokenStep } from "./trace";

function mkStep(text: string, entropy = 0.5, dt = 20): TokenStep {
  return {
    id: 1,
    text,
    prob: 0.9,
    topk: [
      { id: 1, text, prob: 0.9 },
      { id: 2, text: "x", prob: 0.05 },
    ],
    entropy,
    dt,
  };
}

function mkTrace(steps: TokenStep[], extra?: Partial<GenerationTrace>): GenerationTrace {
  return {
    modelId: "m",
    params: { temperature: 0.7, topP: 0.9, seed: 1 },
    promptIds: [1, 2],
    steps,
    device: "wasm",
    ...extra,
  };
}

describe("buildStoryChapters", () => {
  it("空 trace 返回空章节", () => {
    expect(buildStoryChapters(mkTrace([]))).toEqual([]);
  });

  it("最小 trace 也有关键抉择与收束章，数字全部实测", () => {
    const steps = [mkStep("天", 0.2, 10), mkStep("空", 1.5, 30)];
    const ch = buildStoryChapters(mkTrace(steps));
    const keys = ch.map((c) => c.key);
    expect(keys).toContain("moment-first-0");
    expect(keys).toContain("finish");
    const finish = ch.find((c) => c.key === "finish")!;
    expect(finish.narration).toContain("共 2 个 token");
    expect(finish.narration).toContain("40 ms");
    expect(finish.toStep).toBe(1);
  });

  it("无 pipeline 时启动章诚实缺席，有则含三段实测", () => {
    const steps = [mkStep("a"), mkStep("b")];
    expect(
      buildStoryChapters(mkTrace(steps)).some((c) => c.key === "launch"),
    ).toBe(false);
    const ch = buildStoryChapters(
      mkTrace(steps, {
        pipeline: { tokenizeMs: 12, prefillMs: 1500, decodeMs: 88 },
      }),
    );
    const launch = ch.find((c) => c.key === "launch")!;
    expect(launch.fromStep).toBeNull();
    expect(launch.narration).toContain("12 ms");
    expect(launch.narration).toContain("1.5 s");
    expect(ch[0].key).toBe("launch");
  });

  it("agent 事件生成检索与规划章（含失败与交接如实叙述）", () => {
    const steps = [mkStep("a"), mkStep("b")];
    const ch = buildStoryChapters(
      mkTrace(steps, {
        agent: [
          { type: "tool_call", atStep: 0, tool: "web_search", input: "q" },
          {
            type: "tool_result",
            atStep: 0,
            tool: "web_search",
            output: "err",
            ok: false,
            durationMs: 5,
          },
          { type: "model_handoff", atStep: 0, from: "p", to: "e" },
        ],
      }),
    );
    const agent = ch.find((c) => c.key === "agent")!;
    expect(agent.narration).toContain("web_search");
    expect(agent.narration).toContain("1 次失败");
    expect(agent.narration).toContain("p → e");
  });

  it("有 </think> 边界时输出思考章且区间与站一致", () => {
    const steps: TokenStep[] = [
      mkStep("<think>"),
      ...Array.from({ length: 30 }, (_, i) => mkStep(`t${i}`, 0.5 + (i % 5) * 0.2)),
      mkStep("</think>"),
      ...Array.from({ length: 5 }, (_, i) => mkStep(`a${i}`, 0.3)),
    ];
    const ch = buildStoryChapters(mkTrace(steps));
    const thinks = ch.filter((c) => c.key.startsWith("think-"));
    expect(thinks.length).toBeGreaterThan(0);
    expect(thinks[0].fromStep).toBe(1);
    expect(ch.find((c) => c.key === "finish")!.fromStep).toBe(32);
  });

  it("锚定章节按步区间升序排列", () => {
    const steps = Array.from({ length: 10 }, (_, i) =>
      mkStep(`s${i}`, i === 7 ? 2 : 0.4),
    );
    const ch = buildStoryChapters(mkTrace(steps));
    const anchored = ch.filter((c) => c.fromStep !== null);
    for (let i = 1; i < anchored.length; i++)
      expect(anchored[i].fromStep!).toBeGreaterThanOrEqual(
        anchored[i - 1].fromStep!,
      );
  });
});
