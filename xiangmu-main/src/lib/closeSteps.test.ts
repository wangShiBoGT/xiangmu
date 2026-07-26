import { describe, expect, it } from "vitest";
import { computeCloseSteps, formatGap } from "./closeSteps";

const step = (pairs: [string, number][]) => ({
  topk: pairs.map(([text, prob]) => ({ text, prob })),
});

describe("computeCloseSteps", () => {
  it("只收前两名差距 <5% 且 top-1 >5% 的步", () => {
    const steps = [
      step([["确", 0.9], ["定", 0.02]]), // 差距大，排除
      step([["本", 0.2], ["这", 0.18]]), // 差 2%，收
      step([["尾", 0.04], ["部", 0.039]]), // top-1 ≤5%，排除
      step([["。", 0.4], ["！", 0.399]]), // 差 0.1%，收
    ];
    const out = computeCloseSteps(steps);
    expect(out.map((s) => s.index)).toEqual([3, 1]); // 按差距升序
  });

  it("候选不足两个的步跳过", () => {
    expect(computeCloseSteps([step([["独", 1]])])).toEqual([]);
  });

  it("保留原始概率与文本", () => {
    const [s] = computeCloseSteps([step([["甲", 0.3], ["乙", 0.28]])]);
    expect(s).toMatchObject({ index: 0, a: "甲", ap: 0.3, b: "乙", bp: 0.28 });
    expect(s.gap).toBeCloseTo(0.02, 10);
  });
});

describe("formatGap", () => {
  it("极小差距显示为不到 0.01%", () => {
    expect(formatGap(0.00005)).toBe("不到 0.01%");
  });
  it("常规差距保留两位百分数", () => {
    expect(formatGap(0.0123)).toBe("仅 1.23%");
  });
});
