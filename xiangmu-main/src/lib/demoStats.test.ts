import { describe, expect, it } from "vitest";
import demoTrace from "../assets/demo.aitrace.json";
import { DEMO_STATS } from "./demoStats.generated";

interface RawStep {
  topk: { text: string; prob: number }[];
}

// 校验生成文件与真实 trace 一致（口径与 scripts/extract-demo-stats.mjs 相同）
describe("demoStats.generated", () => {
  const steps = (demoTrace as unknown as { steps: RawStep[] }).steps;

  it("总步数与 trace 一致", () => {
    expect(DEMO_STATS.totalSteps).toBe(steps.length);
  });

  it("closeSteps 口径正确且按 gap 升序", () => {
    const expected = steps
      .map((s, i) => ({ i, tk: s.topk }))
      .filter(
        ({ tk }) =>
          tk.length >= 2 && tk[0].prob > 0.05 && tk[0].prob - tk[1].prob < 0.05,
      );
    expect(DEMO_STATS.closeSteps.length).toBe(expected.length);
    for (let i = 1; i < DEMO_STATS.closeSteps.length; i++) {
      expect(DEMO_STATS.closeSteps[i].gap).toBeGreaterThanOrEqual(
        DEMO_STATS.closeSteps[i - 1].gap,
      );
    }
  });

  it("tightest 是差距最小的一步，且数据与原始 trace 一致", () => {
    const t = DEMO_STATS.tightest;
    expect(t).toEqual(DEMO_STATS.closeSteps[0]);
    const raw = steps[t.index].topk;
    expect(t.a).toEqual({ text: raw[0].text, prob: raw[0].prob });
    expect(t.b).toEqual({ text: raw[1].text, prob: raw[1].prob });
    expect(t.gap).toBeCloseTo(raw[0].prob - raw[1].prob, 12);
  });

  it("restMass = 1 − (top1+top2)，不制造二选一错觉", () => {
    for (const s of DEMO_STATS.closeSteps) {
      expect(s.restMass).toBeCloseTo(1 - (s.a.prob + s.b.prob), 12);
      expect(s.restMass).toBeGreaterThan(0);
      expect(s.topk.length).toBe(s.topkCount);
    }
  });

  it("采样参数来自 trace 顶层", () => {
    const raw = demoTrace as unknown as {
      prompt: string;
      modelId: string;
      params: { seed: number };
    };
    expect(DEMO_STATS.prompt).toBe(raw.prompt);
    expect(DEMO_STATS.modelId).toBe(raw.modelId);
    expect(DEMO_STATS.params.seed).toBe(raw.params.seed);
  });
});
