import { describe, it, expect } from "vitest";
import { compareTraces } from "./replayVerify";
import type { GenerationTrace, TokenStep } from "./trace";

function step(id: number, text: string, prob = 0.5): TokenStep {
  return { id, text, prob, topk: [{ id, text, prob }], entropy: 0.1, dt: 1 };
}

function trace(
  ids: [number, string][],
  device: "webgpu" | "wasm" = "webgpu",
): GenerationTrace {
  return {
    modelId: "m",
    params: { temperature: 0.7, topP: 1, seed: 42 },
    promptIds: [1, 2],
    steps: ids.map(([id, t]) => step(id, t)),
    device,
  };
}

describe("compareTraces", () => {
  it("同 seed 同后端逐 token 一致 → identical", () => {
    const a = trace([[10, "本"], [11, "身"], [12, "。"]]);
    const b = trace([[10, "本"], [11, "身"], [12, "。"]]);
    const r = compareTraces(a, b);
    expect(r.identical).toBe(true);
    expect(r.matched).toBe(3);
    expect(r.total).toBe(3);
    expect(r.firstDiff).toBeNull();
    expect(r.diffs).toHaveLength(0);
  });

  it("中途某步 token 不同 → 记录首个差异与明细", () => {
    const a = trace([[10, "本"], [11, "身"], [12, "。"]]);
    const b = trace([[10, "本"], [99, "人"], [12, "。"]]);
    const r = compareTraces(a, b);
    expect(r.identical).toBe(false);
    expect(r.firstDiff).toBe(1);
    expect(r.matched).toBe(2);
    expect(r.diffs[0]).toMatchObject({
      index: 1,
      a: { text: "身" },
      b: { text: "人" },
    });
  });

  it("后端不同即使 token 全同也不算完全一致", () => {
    const a = trace([[10, "本"], [11, "身"]], "webgpu");
    const b = trace([[10, "本"], [11, "身"]], "wasm");
    const r = compareTraces(a, b);
    expect(r.identical).toBe(false);
    expect(r.sameDevice).toBe(false);
    expect(r.matched).toBe(2);
  });

  it("长度不同：前缀一致仍标记 firstDiff 为越界步", () => {
    const a = trace([[10, "本"], [11, "身"], [12, "。"]]);
    const b = trace([[10, "本"], [11, "身"]]);
    const r = compareTraces(a, b);
    expect(r.identical).toBe(false);
    expect(r.total).toBe(2);
    expect(r.matched).toBe(2);
    expect(r.firstDiff).toBe(2);
  });

  it("差异明细最多保留 8 个", () => {
    const a = trace(Array.from({ length: 20 }, (_, i) => [i, `a${i}`]));
    const b = trace(Array.from({ length: 20 }, (_, i) => [i + 100, `b${i}`]));
    const r = compareTraces(a, b);
    expect(r.matched).toBe(0);
    expect(r.diffs).toHaveLength(8);
    expect(r.firstDiff).toBe(0);
  });
});
