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

  it("DeepSeek-R1 系列三个模型均已录入", () => {
    const qwen1_5b = officialBenchFor(
      "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
    );
    const qwen7b = officialBenchFor(
      "onnx-community/DeepSeek-R1-Distill-Qwen-7B-ONNX",
    );
    const llama8b = officialBenchFor(
      "onnx-community/DeepSeek-R1-Distill-Llama-8B-ONNX",
    );

    expect(qwen1_5b).not.toBeNull();
    expect(qwen7b).not.toBeNull();
    expect(llama8b).not.toBeNull();

    // 验证 AIME 2024 pass@1 成绩符合预期
    const aime1_5b = qwen1_5b!.scores.find(
      (s) => s.benchmark === "AIME 2024" && s.metric === "pass@1",
    );
    const aime7b = qwen7b!.scores.find(
      (s) => s.benchmark === "AIME 2024" && s.metric === "pass@1",
    );
    const aime8b = llama8b!.scores.find(
      (s) => s.benchmark === "AIME 2024" && s.metric === "pass@1",
    );

    expect(aime1_5b?.value).toBe(28.9);
    expect(aime7b?.value).toBe(55.5);
    expect(aime8b?.value).toBe(50.4);
  });

  it("Phi-3.5-mini 已扩展至 11 项基准测试", () => {
    const phi = officialBenchFor(
      "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    );
    expect(phi).not.toBeNull();
    expect(phi!.scores.length).toBeGreaterThanOrEqual(11);

    const benchmarks = phi!.scores.map((s) => s.benchmark);
    expect(benchmarks).toContain("MMLU");
    expect(benchmarks).toContain("GSM8K");
    expect(benchmarks).toContain("HumanEval");
    expect(benchmarks).toContain("MBPP");
    expect(benchmarks).toContain("ARC Challenge");
    expect(benchmarks).toContain("Arena Hard");
  });

  it("所有条目的 verifiedAt 日期为 2026-08-05", () => {
    for (const e of OFFICIAL_BENCH) {
      expect(e.verifiedAt).toBe("2026-08-05");
    }
  });
});
