import { describe, expect, it } from "vitest";
import {
  alignTraces,
  tickPositions,
  divergenceNarration,
} from "./compareReplay";
import type { TokenStep } from "./trace";

function mk(ids: number[]): TokenStep[] {
  return ids.map((id) => ({
    id,
    text: `t${id}`,
    prob: 0.6,
    topk: [{ id, text: `t${id}`, prob: 0.6 }],
    entropy: 0.5,
    dt: 10,
  }));
}

describe("alignTraces", () => {
  it("空 trace：前缀 0，总拍数取较长者", () => {
    expect(alignTraces([], [])).toEqual({
      prefixLen: 0,
      divergeAt: -1,
      totalTicks: 0,
    });
    expect(alignTraces(mk([1, 2]), [])).toEqual({
      prefixLen: 0,
      divergeAt: 0,
      totalTicks: 2,
    });
  });

  it("完全相同：divergeAt=-1，前缀=全长", () => {
    expect(alignTraces(mk([1, 2, 3]), mk([1, 2, 3]))).toEqual({
      prefixLen: 3,
      divergeAt: -1,
      totalTicks: 3,
    });
  });

  it("首步即分歧：前缀 0", () => {
    expect(alignTraces(mk([9, 2]), mk([1, 2]))).toMatchObject({
      prefixLen: 0,
      divergeAt: 0,
    });
  });

  it("中途分歧：前缀=分歧步", () => {
    expect(alignTraces(mk([1, 2, 7, 8]), mk([1, 2, 9]))).toEqual({
      prefixLen: 2,
      divergeAt: 2,
      totalTicks: 4,
    });
  });

  it("一条是另一条的前缀：分歧在较短长度处", () => {
    expect(alignTraces(mk([1, 2]), mk([1, 2, 3]))).toEqual({
      prefixLen: 2,
      divergeAt: 2,
      totalTicks: 3,
    });
  });
});

describe("tickPositions", () => {
  it("前缀段两边同步，先结束的一边返回 null", () => {
    const a = mk([1, 2, 7]);
    const b = mk([1, 2]);
    expect(tickPositions(a, b, 1)).toEqual({ a: 1, b: 1 });
    expect(tickPositions(a, b, 2)).toEqual({ a: 2, b: null });
    expect(tickPositions(a, b, 5)).toEqual({ a: null, b: null });
  });
});

describe("divergenceNarration", () => {
  it("无分歧返回 null", () => {
    expect(divergenceNarration(mk([1]), mk([1]))).toBeNull();
  });

  it("双边分歧：含双方真实 token 与概率", () => {
    const n = divergenceNarration(mk([1, 2]), mk([1, 3]))!;
    expect(n).toContain("第 2 步");
    expect(n).toContain("t2");
    expect(n).toContain("t3");
    expect(n).toContain("60.0%");
  });

  it("一边先结束：如实说明", () => {
    const n = divergenceNarration(mk([1, 2]), mk([1]))!;
    expect(n).toContain("已在此前结束");
  });
});
