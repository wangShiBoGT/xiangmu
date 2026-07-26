import { describe, expect, it } from "vitest";
import {
  counterfactualProbs,
  topPBoundary,
  type DeepCapture,
} from "./microscope";

const cap = (logits: number[]): DeepCapture => ({
  temperature: 1,
  entries: logits.map((logit, i) => ({ id: i, logit })),
  restCount: 0,
  restMass: 0,
});

describe("采样显微镜（E5a 纯函数）", () => {
  it("反事实重算：同一 logits，不同温度——低温更尖、高温更平", () => {
    const c = cap([2, 1, 0]);
    const t1 = counterfactualProbs(c, 1);
    const cold = counterfactualProbs(c, 0.3);
    const hot = counterfactualProbs(c, 3);
    expect(cold[0].p).toBeGreaterThan(t1[0].p);
    expect(hot[0].p).toBeLessThan(t1[0].p);
    for (const dist of [t1, cold, hot]) {
      const sum = dist.reduce((a, b) => a + b.p, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it("t=1 时与直接 softmax 一致", () => {
    const r = counterfactualProbs(cap([Math.log(3), Math.log(1)]), 1);
    expect(r[0].p).toBeCloseTo(0.75, 6);
    expect(r[1].p).toBeCloseTo(0.25, 6);
  });

  it("t<=0 视为贪心：argmax 概率 1", () => {
    const r = counterfactualProbs(cap([2, 1]), 0);
    expect(r[0].p).toBe(1);
    expect(r[1].p).toBe(0);
  });

  it("空快照返回空数组", () => {
    expect(counterfactualProbs(cap([]), 1)).toEqual([]);
  });

  it("topPBoundary：返回累计到 ≥p 的最小候选数", () => {
    expect(topPBoundary([0.5, 0.3, 0.2], 0.7)).toBe(2);
    expect(topPBoundary([0.5, 0.3, 0.2], 0.5)).toBe(1);
    expect(topPBoundary([0.5, 0.3, 0.2], 1)).toBe(3);
  });

  it("topPBoundary：截断集合盖不到 p 时返回 -1（边界在截断外）", () => {
    expect(topPBoundary([0.4, 0.3], 0.9)).toBe(-1);
  });
});
