import { describe, expect, it } from "vitest";
import { MODELS } from "./models";
import { OFFICIAL_BENCH, officialBenchFor } from "./officialBench";

describe("officialBench", () => {
  it("每条引用都有来源链接、来源描述与核实日期", () => {
    for (const e of OFFICIAL_BENCH) {
      expect(e.sourceUrl).toMatch(/^https:\/\//);
      expect(e.sourceLabel.length).toBeGreaterThan(0);
      expect(e.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.upstream.length).toBeGreaterThan(0);
      expect(e.scores.length).toBeGreaterThan(0);
    }
  });

  it("modelId 必须对应模型注册表里的真实条目（防悬空引用）", () => {
    const ids = new Set(MODELS.map((m) => m.id));
    for (const e of OFFICIAL_BENCH) expect(ids.has(e.modelId)).toBe(true);
  });

  it("每个分数都有基准名与计分口径", () => {
    for (const e of OFFICIAL_BENCH)
      for (const s of e.scores) {
        expect(s.benchmark.length).toBeGreaterThan(0);
        expect(s.metric.length).toBeGreaterThan(0);
        expect(Number.isFinite(s.value)).toBe(true);
      }
  });

  it("已核实模型可查到、未录入模型返回 null", () => {
    expect(
      officialBenchFor("onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX"),
    ).not.toBeNull();
    expect(officialBenchFor("onnx-community/Qwen3-0.6B-ONNX")).toBeNull();
  });
});
