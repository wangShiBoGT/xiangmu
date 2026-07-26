import { describe, expect, it } from "vitest";
import type { TokenStep } from "./trace";
import {
  ENTROPY_DZ,
  STEP_DX,
  isSoftwareRenderer,
  jitter,
  oceanColor,
  oceanLayout,
} from "./ocean";

function step(
  id: number,
  entropy: number,
  topk: { id: number; prob: number }[],
): TokenStep {
  return {
    id,
    text: `t${id}`,
    prob: topk.find((c) => c.id === id)?.prob ?? 0.001,
    topk: topk.map((c) => ({ ...c, text: `t${c.id}` })),
    entropy,
    dt: 10,
  };
}

describe("oceanLayout", () => {
  it("每步每个候选都成为一个节点，选中者进入主流 spine", () => {
    const steps = [
      step(1, 0.5, [
        { id: 1, prob: 0.6 },
        { id: 2, prob: 0.3 },
        { id: 3, prob: 0.1 },
      ]),
      step(9, 2.0, [
        { id: 9, prob: 0.25 },
        { id: 8, prob: 0.2 },
      ]),
    ];
    const l = oceanLayout(steps);
    expect(l.nodes).toHaveLength(5);
    expect(l.spine).toHaveLength(2);
    expect(l.nodes.filter((n) => n.chosen)).toHaveLength(2);
    expect(l.length).toBe(2 * STEP_DX);
  });

  it("X=时间步、Z=熵、缩放随概率单调", () => {
    const steps = [
      step(1, 1.0, [
        { id: 1, prob: 0.8 },
        { id: 2, prob: 0.05 },
      ]),
    ];
    const l = oceanLayout(steps);
    const chosen = l.nodes.find((n) => n.chosen)!;
    const other = l.nodes.find((n) => !n.chosen)!;
    expect(chosen.x).toBe(0);
    expect(chosen.z).toBeCloseTo(1.0 * ENTROPY_DZ);
    expect(chosen.scale).toBeGreaterThan(other.scale);
    expect(chosen.y).toBeCloseTo(0, 0);
  });

  it("heat 归一化到全序列最大熵", () => {
    const steps = [
      step(1, 1.0, [{ id: 1, prob: 0.9 }]),
      step(2, 4.0, [{ id: 2, prob: 0.2 }]),
    ];
    const l = oceanLayout(steps);
    expect(l.maxEntropy).toBe(4.0);
    expect(l.nodes.find((n) => n.step === 1)!.heat).toBe(1);
    expect(l.nodes.find((n) => n.step === 0)!.heat).toBeCloseTo(0.25);
  });

  it("选中 token 不在 top-k 时以真实 prob 单独成点", () => {
    const steps = [
      step(99, 3.0, [
        { id: 1, prob: 0.3 },
        { id: 2, prob: 0.2 },
      ]),
    ];
    const l = oceanLayout(steps);
    expect(l.nodes).toHaveLength(3);
    const chosen = l.nodes.find((n) => n.chosen)!;
    expect(chosen.prob).toBe(0.001);
    expect(l.spine).toHaveLength(1);
  });

  it("布局可复现：同一输入两次结果一致", () => {
    const steps = [
      step(1, 1.5, [
        { id: 1, prob: 0.5 },
        { id: 2, prob: 0.3 },
      ]),
    ];
    expect(oceanLayout(steps)).toEqual(oceanLayout(steps));
  });
});

describe("jitter", () => {
  it("确定性且在 [-0.5, 0.5) 内", () => {
    expect(jitter(42)).toBe(jitter(42));
    for (let i = 0; i < 200; i++) {
      const v = jitter(i);
      expect(v).toBeGreaterThanOrEqual(-0.5);
      expect(v).toBeLessThan(0.5);
    }
  });
});

describe("oceanColor", () => {
  it("犹豫越大色相越暖，选中者更亮", () => {
    const cold = oceanColor(0, true);
    const warm = oceanColor(1, true);
    expect(warm.h).toBeLessThan(cold.h);
    expect(oceanColor(0.5, true).l).toBeGreaterThan(oceanColor(0.5, false).l);
  });
});

describe("isSoftwareRenderer", () => {
  it("识别常见软件光栅", () => {
    expect(
      isSoftwareRenderer(
        "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
      ),
    ).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(
      isSoftwareRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 4080)"),
    ).toBe(false);
  });
});
