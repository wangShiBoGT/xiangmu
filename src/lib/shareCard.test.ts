import { describe, expect, it } from "vitest";
import { buildShareCardData, resampleSeries } from "./shareCard";
import type { TokenStep } from "./trace";
import type { RuleMatch } from "./rules";

function step(text: string, entropy: number, dt = 100, prob = 0.5): TokenStep {
  return { id: 1, text, prob, topk: [], entropy, dt };
}

function match(label: string, severity: "info" | "warn"): RuleMatch {
  return {
    ruleId: `r/${label}`,
    label,
    severity,
    from: 0,
    to: 0,
    explain: "",
    values: [],
  };
}

const meta = {
  prompt: "为什么天空是蓝色的",
  modelName: "Qwen3 0.6B",
  device: "webgpu",
  temperature: 0.7,
  topP: 0.9,
  seed: 42,
  now: new Date(2026, 0, 5),
};

describe("buildShareCardData", () => {
  it("聚合真实统计：token 数、均熵、tok/s、答案拼接、日期", () => {
    const steps = [step("天", 1), step("空", 3, 200), step("蓝", 2)];
    const d = buildShareCardData(steps, [], meta);
    expect(d.tokens).toBe(3);
    expect(d.avgEntropy).toBeCloseTo(2);
    expect(d.answer).toBe("天空蓝");
    // 3 步共 400ms → 7.5 tok/s
    expect(d.avgTps).toBeCloseTo(7.5);
    expect(d.dateText).toBe("2026-01-05");
    expect(d.entropySeries).toEqual([1, 3, 2]);
  });

  it("找出熵最大的一步作为 peak", () => {
    const steps = [step("a", 0.5), step("b", 3.2), step("c", 1)];
    const d = buildShareCardData(steps, [], meta);
    expect(d.peak).toEqual({ index: 1, text: "b", entropy: 3.2 });
  });

  it("规则命中按 label 聚合并按次数降序", () => {
    const d = buildShareCardData(
      [step("a", 1)],
      [match("高犹豫点", "warn"), match("长尾采样", "warn"), match("高犹豫点", "warn")],
      meta,
    );
    expect(d.ruleHits).toEqual([
      { label: "高犹豫点", severity: "warn", count: 2 },
      { label: "长尾采样", severity: "warn", count: 1 },
    ]);
  });

  it("空 steps 不产生 NaN", () => {
    const d = buildShareCardData([], [], meta);
    expect(d.tokens).toBe(0);
    expect(d.avgEntropy).toBe(0);
    expect(d.avgTps).toBeNull();
    expect(d.peak).toBeNull();
  });
});

describe("resampleSeries", () => {
  it("短序列原样返回", () => {
    expect(resampleSeries([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it("长序列分桶取均值到目标长度", () => {
    const out = resampleSeries([0, 2, 4, 6], 2);
    expect(out).toEqual([1, 5]);
  });

  it("空序列与非法 n 返回空", () => {
    expect(resampleSeries([], 5)).toEqual([]);
    expect(resampleSeries([1], 0)).toEqual([]);
  });
});
