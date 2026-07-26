import { describe, expect, it } from "vitest";
import { hesitationBreakIndex } from "./breakpoints";
import type { TokenStep } from "./trace";

function mkStep(p1: number, p2: number): TokenStep {
  return {
    id: 1,
    text: "a",
    prob: p1,
    topk: [
      { id: 1, text: "a", prob: p1 },
      { id: 2, text: "b", prob: p2 },
    ],
    entropy: 0.5,
    dt: 10,
  };
}

describe("hesitationBreakIndex", () => {
  it("命中第一个 top-2 差距 < 阈值的步", () => {
    const steps = [mkStep(0.9, 0.05), mkStep(0.4, 0.38), mkStep(0.5, 0.49)];
    expect(hesitationBreakIndex(steps, 0)).toBe(1);
  });

  it("从 fromIndex 起扫描（不回头命中已检查过的步）", () => {
    const steps = [mkStep(0.4, 0.38), mkStep(0.9, 0.05), mkStep(0.5, 0.49)];
    expect(hesitationBreakIndex(steps, 1)).toBe(2);
  });

  it("无命中返回 null", () => {
    const steps = [mkStep(0.9, 0.05), mkStep(0.8, 0.1)];
    expect(hesitationBreakIndex(steps, 0)).toBeNull();
  });

  it("topk 不足两名不命中（无数据不判定）", () => {
    const one: TokenStep = {
      id: 1,
      text: "a",
      prob: 1,
      topk: [{ id: 1, text: "a", prob: 1 }],
      entropy: 0,
      dt: 1,
    };
    expect(hesitationBreakIndex([one], 0)).toBeNull();
  });
});
