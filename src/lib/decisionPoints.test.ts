import { describe, expect, it } from "vitest";
import { decisionMoments } from "./decisionPoints";
import type { TokenStep } from "./trace";

function step(
  text: string,
  prob: number,
  entropy: number,
  second?: number,
): TokenStep {
  return {
    id: 1,
    text,
    prob,
    entropy,
    dt: 10,
    topk: [
      { id: 1, text, prob },
      { id: 2, text: "另", prob: second ?? prob / 2 },
    ],
  };
}

describe("decisionMoments", () => {
  it("空 trace 返回空表，不估造", () => {
    expect(decisionMoments([])).toEqual([]);
  });

  it("统一列出首字、最高熵步、犹豫点，并按步序排列", () => {
    const steps = [
      step("天", 0.9, 1.0),
      step("空", 0.8, 4.2),
      step("是", 0.3, 2.0, 0.29), // 犹豫点：差距 1%
      step("蓝", 0.95, 0.5),
    ];
    const ms = decisionMoments(steps);
    expect(ms.map((m) => m.kind)).toEqual(["first", "entropy_peak", "hesitation"]);
    expect(ms.map((m) => m.index)).toEqual([0, 1, 2]);
    expect(ms[0].metric).toBe("90.0%");
    expect(ms[1].metric).toBe("熵 4.20");
    expect(ms[2].metric).toBe("差 1.00%");
  });

  it("同一步兼任多个角色时去重（首字即最高熵步只列一次）", () => {
    const steps = [step("天", 0.9, 5.0), step("空", 0.8, 1.0)];
    const ms = decisionMoments(steps);
    expect(ms.filter((m) => m.index === 0)).toHaveLength(1);
    expect(ms[0].kind).toBe("first");
  });
});
