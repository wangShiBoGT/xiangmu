import { describe, it, expect } from "vitest";
import {
  detectEntropyAnomalies,
  detectTimeSeriesAnomalies,
  detectFactualRiskMarkers,
  checkSelfConsistency,
  computeSemanticDiversity,
  analyzeHallucination,
} from "./hallucinationDetection";
import type { TokenStep, GenerationTrace } from "./trace";

describe("hallucinationDetection", () => {
  const mockSteps: TokenStep[] = [
    { id: 0, text: "The", prob: 0.9, entropy: 1.2, dt: 10, topk: [] },
    { id: 1, text: " GDP", prob: 0.85, entropy: 2.1, dt: 12, topk: [] },
    { id: 2, text: " was", prob: 0.92, entropy: 0.8, dt: 8, topk: [] },
    { id: 3, text: " 18", prob: 0.95, entropy: 0.5, dt: 11, topk: [] },
    { id: 4, text: ".", prob: 0.88, entropy: 0.7, dt: 9, topk: [] },
    { id: 5, text: "5", prob: 0.9, entropy: 0.6, dt: 10, topk: [] },
    { id: 6, text: " trillion", prob: 0.7, entropy: 3.5, dt: 15, topk: [] },
    { id: 7, text: " in", prob: 0.25, entropy: 4.2, dt: 20, topk: [] },
    { id: 8, text: " 2023", prob: 0.8, entropy: 1.5, dt: 12, topk: [] },
    { id: 9, text: ".", prob: 0.95, entropy: 0.5, dt: 8, topk: [] },
  ];

  describe("detectEntropyAnomalies", () => {
    it("应该检测到高熵 token", () => {
      const anomalies = detectEntropyAnomalies(mockSteps, "test-model");
      const highEntropyAnomalies = anomalies.filter(a => a.type === "high_entropy");

      expect(highEntropyAnomalies.length).toBeGreaterThan(0);
      expect(highEntropyAnomalies.some(a => a.tokenIndex === 6)).toBe(true); // "trillion" 熵值 3.5
      expect(highEntropyAnomalies.some(a => a.tokenIndex === 7)).toBe(true); // "in" 熵值 4.2
    });

    it("应该检测到熵值突变", () => {
      const stepsWithSpike: TokenStep[] = [
        { id: 0, text: "Hello", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        { id: 1, text: " world", prob: 0.8, entropy: 1.2, dt: 12, topk: [] },
        { id: 2, text: "!", prob: 0.5, entropy: 4.5, dt: 15, topk: [] }, // 突变 +3.3
      ];

      const anomalies = detectEntropyAnomalies(stepsWithSpike, "test-model");
      const spikes = anomalies.filter(a => a.type === "entropy_spike");

      expect(spikes.length).toBe(1);
      expect(spikes[0].tokenIndex).toBe(2);
      expect(spikes[0].severity).toBe("high");
    });

    it("应该根据严重程度分类", () => {
      const anomalies = detectEntropyAnomalies(mockSteps, "test-model");
      const highSeverity = anomalies.filter(a => a.severity === "high");

      expect(highSeverity.some(a => a.entropy > 4.0)).toBe(true);
    });
  });

  describe("detectTimeSeriesAnomalies", () => {
    it("应该检测到概率突降", () => {
      const anomalies = detectTimeSeriesAnomalies(mockSteps);
      const probDrops = anomalies.filter(a => a.type === "prob_drop");

      // "in" 的概率是 0.25，前一个是 0.7，下降 0.45
      expect(probDrops.some(a => a.position === 7)).toBe(true);
    });

    it("应该检测到长期低概率区域", () => {
      const lowProbSteps: TokenStep[] = [
        { id: 0, text: "a", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        { id: 1, text: "b", prob: 0.2, entropy: 3.0, dt: 10, topk: [] },
        { id: 2, text: "c", prob: 0.25, entropy: 3.2, dt: 10, topk: [] },
        { id: 3, text: "d", prob: 0.15, entropy: 3.5, dt: 10, topk: [] },
        { id: 4, text: "e", prob: 0.28, entropy: 3.1, dt: 10, topk: [] },
        { id: 5, text: "f", prob: 0.22, entropy: 3.3, dt: 10, topk: [] },
        { id: 6, text: "g", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
      ];

      const anomalies = detectTimeSeriesAnomalies(lowProbSteps);
      const lowProbRegions = anomalies.filter(a => a.type === "low_prob_region");

      expect(lowProbRegions.length).toBeGreaterThan(0);
      expect(lowProbRegions[0].length).toBeGreaterThanOrEqual(5);
    });

    it("应该检测到高波动率", () => {
      const volatileSteps: TokenStep[] = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        text: String(i),
        prob: i % 2 === 0 ? 0.9 : 0.2, // 交替高低
        entropy: 2.0,
        dt: 10,
        topk: []
      }));

      const anomalies = detectTimeSeriesAnomalies(volatileSteps);
      const volatility = anomalies.filter(a => a.type === "high_volatility");

      expect(volatility.length).toBeGreaterThan(0);
    });
  });

  describe("detectFactualRiskMarkers", () => {
    it("应该检测到低熵数字", () => {
      const markers = detectFactualRiskMarkers(mockSteps);
      const numberMarkers = markers.filter(m => m.type === "confident_number");

      // "18.5" 熵值很低（0.5, 0.6）
      expect(numberMarkers.length).toBeGreaterThan(0);
    });

    it("应该检测到日期", () => {
      const markers = detectFactualRiskMarkers(mockSteps);
      const dateMarkers = markers.filter(m => m.type === "date");

      // "2023"
      expect(dateMarkers.some(m => m.text === "2023")).toBe(true);
    });

    it("应该检测到引用标记", () => {
      const stepsWithCitation: TokenStep[] = [
        { id: 0, text: "According", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        { id: 1, text: " to", prob: 0.95, entropy: 0.8, dt: 10, topk: [] },
        { id: 2, text: " [1", prob: 0.7, entropy: 2.0, dt: 10, topk: [] },
        { id: 3, text: "]", prob: 0.8, entropy: 1.5, dt: 10, topk: [] },
        { id: 4, text: " et", prob: 0.6, entropy: 2.5, dt: 10, topk: [] },
        { id: 5, text: " al", prob: 0.7, entropy: 2.2, dt: 10, topk: [] },
        { id: 6, text: ".", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
      ];

      const markers = detectFactualRiskMarkers(stepsWithCitation);
      const citationMarkers = markers.filter(m => m.type === "citation");

      expect(citationMarkers.length).toBeGreaterThan(0);
      expect(citationMarkers.some(m => m.severity === "high")).toBe(true);
    });
  });

  describe("checkSelfConsistency", () => {
    const baseTrace: GenerationTrace = {
      modelId: "test-model",
      params: { temperature: 0.7, topP: 0.9 },
      promptIds: [],
      steps: [
        { id: 0, text: "Hello", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        { id: 1, text: " world", prob: 0.85, entropy: 1.2, dt: 10, topk: [] },
        { id: 2, text: "!", prob: 0.95, entropy: 0.8, dt: 10, topk: [] },
      ],
      device: "webgpu"
    };

    it("应该返回 null 如果只有一个 trace", () => {
      const result = checkSelfConsistency([baseTrace]);
      expect(result).toBeNull();
    });

    it("应该检测到完全一致的运行", () => {
      const trace2 = { ...baseTrace };
      const result = checkSelfConsistency([baseTrace, trace2]);

      expect(result).not.toBeNull();
      expect(result!.consistencyRate).toBe(1.0);
      expect(result!.severity).toBe("low");
    });

    it("应该检测到分叉点", () => {
      const trace2: GenerationTrace = {
        ...baseTrace,
        steps: [
          { id: 0, text: "Hello", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
          { id: 1, text: " there", prob: 0.7, entropy: 2.0, dt: 10, topk: [] }, // 分叉
          { id: 2, text: "!", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        ]
      };

      const result = checkSelfConsistency([baseTrace, trace2]);

      expect(result).not.toBeNull();
      expect(result!.avgDivergencePoint).toBe(1);
      expect(result!.consistencyRate).toBe(0);
    });

    it("应该根据一致率确定严重程度", () => {
      const trace2 = { ...baseTrace };
      const trace3: GenerationTrace = {
        ...baseTrace,
        steps: [
          { id: 0, text: "Hello", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
          { id: 1, text: " there", prob: 0.7, entropy: 2.0, dt: 10, topk: [] },
        ]
      };

      const result = checkSelfConsistency([baseTrace, trace2, trace3]);

      expect(result).not.toBeNull();
      expect(result!.runs).toBe(3);
      expect(result!.consistencyRate).toBe(0.5); // 2 个 trace 中有 1 个分叉
      expect(result!.severity).toBe("medium");
    });
  });

  describe("computeSemanticDiversity", () => {
    const trace1: GenerationTrace = {
      modelId: "test-model",
      params: { temperature: 0.7, topP: 0.9 },
      promptIds: [],
      steps: [
        { id: 0, text: "Hello", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
        { id: 1, text: " world", prob: 0.85, entropy: 1.2, dt: 10, topk: [] },
        { id: 2, text: "!", prob: 0.95, entropy: 0.8, dt: 10, topk: [] },
      ],
      device: "webgpu"
    };

    it("应该返回 null 如果只有一个 trace", () => {
      const result = computeSemanticDiversity([trace1]);
      expect(result).toBeNull();
    });

    it("应该计算高度一致的多样性", () => {
      const trace2 = { ...trace1 };
      const result = computeSemanticDiversity([trace1, trace2]);

      expect(result).not.toBeNull();
      expect(result!.diversity).toBe(0); // 完全相同
      expect(result!.severity).toBe("low");
    });

    it("应该计算高度分散的多样性", () => {
      const trace2: GenerationTrace = {
        ...trace1,
        steps: [
          { id: 0, text: "Hi", prob: 0.9, entropy: 1.0, dt: 10, topk: [] },
          { id: 1, text: " there", prob: 0.85, entropy: 1.2, dt: 10, topk: [] },
          { id: 2, text: ".", prob: 0.95, entropy: 0.8, dt: 10, topk: [] },
        ]
      };

      const result = computeSemanticDiversity([trace1, trace2]);

      expect(result).not.toBeNull();
      expect(result!.diversity).toBeGreaterThan(0.5);
    });
  });

  describe("analyzeHallucination", () => {
    const trace: GenerationTrace = {
      modelId: "test-model",
      params: { temperature: 0.7, topP: 0.9 },
      promptIds: [],
      steps: mockSteps,
      device: "webgpu"
    };

    it("应该生成完整的分析报告", () => {
      const analysis = analyzeHallucination(trace);

      expect(analysis.modelId).toBe("test-model");
      expect(analysis.totalTokens).toBe(mockSteps.length);
      expect(analysis.avgEntropy).toBeGreaterThan(0);
      expect(analysis.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(analysis.confidenceScore).toBeLessThanOrEqual(100);
      expect(analysis.summary).toBeTruthy();
    });

    it("应该检测到所有维度的异常", () => {
      const analysis = analyzeHallucination(trace);

      expect(analysis.entropyAnomalies.length).toBeGreaterThan(0);
      expect(analysis.timeSeriesAnomalies.length).toBeGreaterThan(0);
      expect(analysis.factualRiskMarkers.length).toBeGreaterThan(0);
    });

    it("应该根据置信度评分确定严重程度", () => {
      const analysis = analyzeHallucination(trace);

      if (analysis.confidenceScore < 50) {
        expect(analysis.overallSeverity).toBe("high");
      } else if (analysis.confidenceScore < 70) {
        expect(["medium", "high"]).toContain(analysis.overallSeverity);
      }
    });

    it("应该处理多次运行的分析", () => {
      const trace2: GenerationTrace = {
        ...trace,
        steps: [
          { id: 0, text: "The", prob: 0.9, entropy: 1.2, dt: 10, topk: [] },
          { id: 1, text: " value", prob: 0.7, entropy: 2.5, dt: 12, topk: [] }, // 分叉
          { id: 2, text: " was", prob: 0.8, entropy: 1.5, dt: 10, topk: [] },
        ]
      };

      const analysis = analyzeHallucination(trace, [trace2]);

      expect(analysis.consistencyResult).toBeDefined();
      expect(analysis.semanticDiversity).toBeDefined();
      expect(analysis.summary).toContain("自洽性");
    });

    it("应该生成可读的摘要", () => {
      const analysis = analyzeHallucination(trace);

      expect(analysis.summary).toMatch(/置信度/);
      expect(analysis.summary).toMatch(/\d+ 分/);
      expect(analysis.summary).toMatch(/风险点/);
    });
  });
});
