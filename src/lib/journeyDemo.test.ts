import { describe, expect, it } from "vitest";
import { loadJourney, topAttention } from "./journeyDemo";

describe("topAttention", () => {
  it("按真实权重降序取前 n 个序号", () => {
    expect(topAttention([0.1, 0.5, 0.2, 0.2], 2)).toEqual([1, 2]);
  });
  it("n 超过长度时全部返回", () => {
    expect(topAttention([0.3, 0.7], 5)).toEqual([1, 0]);
  });
});

describe("journey 演示数据完整性", () => {
  it.each(["zh", "en"] as const)("%s：注意力长度与 prompt 一致且归一", async (lang) => {
    const d = await loadJourney(lang);
    expect(d.promptTokens.length).toBeGreaterThan(0);
    expect(d.steps.length).toBeGreaterThan(0);
    for (const s of d.steps) {
      expect(s.attention.length).toBe(d.promptTokens.length);
      const sum = s.attention.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
      expect(s.topk.length).toBeGreaterThan(0);
      // 候选按概率降序
      for (let i = 1; i < s.topk.length; i++)
        expect(s.topk[i].prob).toBeLessThanOrEqual(s.topk[i - 1].prob);
    }
  });
});
