import { describe, expect, it } from "vitest";
import { thinkingCaption } from "./thinkingCaption";
import type { TokenStep } from "./trace";

const step = (
  prob: number,
  top2: number,
  chosenId = 1,
  entropy = 2.5,
): TokenStep => ({
  id: chosenId,
  text: "蓝",
  prob,
  topk: [
    { id: 1, text: "蓝", prob: Math.max(prob, top2) },
    { id: 2, text: "绿", prob: Math.min(prob, top2) },
  ],
  entropy,
  dt: 10,
});

describe("thinkingCaption", () => {
  it("空/越界返回 null", () => {
    expect(thinkingCaption([], 0, 1)).toBeNull();
  });

  it("温度 0 → 贪心文案", () => {
    const c = thinkingCaption([step(0.9, 0.05)], 0, 0)!;
    expect(c.text).toContain("贪心模式");
  });

  it("差距 < 2% → 抽签文案（依据实测差距）", () => {
    const c = thinkingCaption([step(0.31, 0.30)], 0, 1)!;
    expect(c.text).toContain("一次抽签决定走向");
    expect(c.meta.gap).toBeCloseTo(0.01);
  });

  it("没选第一名 → 温度抽签文案含真实 rank", () => {
    const c = thinkingCaption([step(0.2, 0.5, 2)], 0, 1)!;
    expect(c.text).toContain("第 2 名");
  });

  it("独占 ≥90% → 没有悬念文案", () => {
    const c = thinkingCaption([step(0.95, 0.02)], 0, 1)!;
    expect(c.text).toContain("几乎没有悬念");
  });

  it("meta 携带 step/熵/差距真实读数", () => {
    const c = thinkingCaption([step(0.6, 0.2)], 0, 1)!;
    expect(c.meta).toEqual({ step: 1, entropy: 2.5, gap: expect.closeTo(0.4) });
  });
});
