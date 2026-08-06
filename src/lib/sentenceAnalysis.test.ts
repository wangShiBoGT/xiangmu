import { describe, it, expect } from "vitest";
import {
  splitSentences,
  computeConfidenceSummary,
  buildConfidenceReport,
  exportReportAsCSV,
} from "./sentenceAnalysis";
import type { TokenStep } from "./trace";

describe("sentenceAnalysis", () => {
  const mockSteps: TokenStep[] = [
    { id: 0, text: "Hello", prob: 0.9, entropy: 1.5, dt: 10, topk: [] },
    { id: 1, text: " world", prob: 0.85, entropy: 2.0, dt: 12, topk: [] },
    { id: 2, text: ".", prob: 0.95, entropy: 0.8, dt: 8, topk: [] },
    { id: 3, text: " This", prob: 0.7, entropy: 3.2, dt: 15, topk: [] },
    { id: 4, text: " is", prob: 0.8, entropy: 2.5, dt: 11, topk: [] },
    { id: 5, text: " uncertain", prob: 0.5, entropy: 4.5, dt: 20, topk: [] },
    { id: 6, text: "!", prob: 0.9, entropy: 1.0, dt: 9, topk: [] },
  ];

  describe("splitSentences", () => {
    it("应该按句子结束标点拆分 token 流", () => {
      const sentences = splitSentences(mockSteps);
      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe("Hello world.");
      expect(sentences[1].text).toBe(" This is uncertain!");
    });

    it("应该正确计算每句的平均熵值", () => {
      const sentences = splitSentences(mockSteps);
      const firstAvg = (1.5 + 2.0 + 0.8) / 3;
      const secondAvg = (3.2 + 2.5 + 4.5 + 1.0) / 4;
      expect(sentences[0].avgEntropy).toBeCloseTo(firstAvg, 2);
      expect(sentences[1].avgEntropy).toBeCloseTo(secondAvg, 2);
    });

    it("应该正确统计高熵 token 数量", () => {
      const sentences = splitSentences(mockSteps);
      expect(sentences[0].highEntropyCount).toBe(0);
      expect(sentences[1].highEntropyCount).toBe(2); // 3.2 和 4.5
    });

    it("应该处理没有句子结束标点的情况", () => {
      const noEnding: TokenStep[] = [
        { id: 0, text: "Hello", prob: 0.9, entropy: 1.5, dt: 10, topk: [] },
        { id: 1, text: " world", prob: 0.85, entropy: 2.0, dt: 12, topk: [] },
      ];
      const sentences = splitSentences(noEnding);
      expect(sentences).toHaveLength(1);
      expect(sentences[0].text).toBe("Hello world");
    });

    it("应该正确记录 token 索引范围", () => {
      const sentences = splitSentences(mockSteps);
      expect(sentences[0].startTokenIndex).toBe(0);
      expect(sentences[0].endTokenIndex).toBe(2);
      expect(sentences[1].startTokenIndex).toBe(3);
      expect(sentences[1].endTokenIndex).toBe(6);
    });
  });

  describe("computeConfidenceSummary", () => {
    it("应该正确计算统计摘要", () => {
      const summary = computeConfidenceSummary(mockSteps);
      expect(summary.maxEntropy).toBe(4.5);
      expect(summary.avgEntropy).toBeCloseTo(2.214, 2);
    });

    it("应该处理空数组", () => {
      const summary = computeConfidenceSummary([]);
      expect(summary.avgEntropy).toBe(0);
      expect(summary.maxEntropy).toBe(0);
    });
  });

  describe("buildConfidenceReport", () => {
    it("应该生成完整的置信度报告", () => {
      const report = buildConfidenceReport(mockSteps, "test-model");
      expect(report.modelId).toBe("test-model");
      expect(report.totalTokens).toBe(7);
      expect(report.highEntropyCount).toBe(2);
      expect(report.sentences).toHaveLength(2);
      expect(report.summary).toBeDefined();
    });
  });

  describe("exportReportAsCSV", () => {
    it("应该生成正确的 CSV 格式", () => {
      const report = buildConfidenceReport(mockSteps, "test-model");
      const csv = exportReportAsCSV(report);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("句子索引,平均熵,Token数,高熵Token数,文本");
      expect(lines).toHaveLength(3); // header + 2 sentences
    });

    it("应该正确转义 CSV 中的引号", () => {
      const stepsWithQuote: TokenStep[] = [
        { id: 0, text: 'Say "hello"', prob: 0.9, entropy: 1.5, dt: 10, topk: [] },
        { id: 1, text: ".", prob: 0.95, entropy: 0.8, dt: 8, topk: [] },
      ];
      const report = buildConfidenceReport(stepsWithQuote, "test-model");
      const csv = exportReportAsCSV(report);
      expect(csv).toContain('""hello""'); // 双引号应该被转义为两个双引号
    });
  });
});
