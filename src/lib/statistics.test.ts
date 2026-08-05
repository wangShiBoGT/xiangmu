/** 统计功能单元测试 */

import { describe, it, expect } from "vitest";
import {
  computeOverallStats,
  exportStatsToCSV,
  exportStatsToJSON,
  type OverallStats,
} from "./statistics";
import type { ChatSession } from "./chatStore";
import type { ExperimentRecord } from "./experiments";

describe("computeOverallStats", () => {
  it("计算空数据集的统计结果", () => {
    const sessions: ChatSession[] = [];
    const experiments: ExperimentRecord[] = [];
    const stats = computeOverallStats(sessions, experiments);

    expect(stats.totalSessions).toBe(0);
    expect(stats.totalExperiments).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(stats.avgTps).toBeNull();
    expect(stats.byModel).toEqual([]);
    expect(stats.byParams).toEqual([]);
    expect(stats.sessions).toEqual([]);
  });

  it("从会话历史提取基础统计", () => {
    const sessions: ChatSession[] = [
      {
        id: "sess-1",
        title: "测试会话",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          { role: "user", content: "你好" },
          { role: "assistant", content: "你好！" },
          { role: "user", content: "再见" },
        ],
      },
    ];
    const experiments: ExperimentRecord[] = [];
    const stats = computeOverallStats(sessions, experiments);

    expect(stats.totalSessions).toBe(1);
    expect(stats.sessions).toHaveLength(1);
    expect(stats.sessions[0].sessionId).toBe("sess-1");
    expect(stats.sessions[0].messageCount).toBe(3);
    expect(stats.sessions[0].userMessages).toBe(2);
    expect(stats.sessions[0].assistantMessages).toBe(1);
  });

  it("按模型聚合实验统计", () => {
    const mockExperiment = (
      modelId: string,
      tokens: number,
      avgTps: number,
      avgEntropy: number,
    ): ExperimentRecord => ({
      id: `exp-${Math.random()}`,
      createdAt: Date.now(),
      name: "测试实验",
      starred: false,
      source: "run" as const,
      prompt: "测试提示",
      modelId,
      params: { temperature: 0.7, topP: 0.9 },
      seed: null,
      device: "webgpu",
      root: {
        forkStep: 0,
        forcedId: -1,
        forcedText: "",
        children: [],
        trace: {
          modelId,
          params: { temperature: 0.7, topP: 0.9 },
          promptIds: [],
          device: "webgpu",
          steps: Array(tokens)
            .fill(null)
            .map((_, i) => ({
              id: i,
              text: "词",
              prob: 0.5,
              topk: [],
              entropy: avgEntropy,
              dt: 10,
            })),
          pipeline: undefined,
          agent: undefined,
          extensions: {},
        },
      },
      stats: {
        tokens,
        avgTps,
        avgEntropy,
        branches: 1,
      },
      ruleset: undefined,
    });

    const sessions: ChatSession[] = [];
    const experiments: ExperimentRecord[] = [
      mockExperiment("model-a", 100, 50, 2.5),
      mockExperiment("model-a", 200, 60, 2.3),
      mockExperiment("model-b", 150, 40, 2.8),
    ];

    const stats = computeOverallStats(sessions, experiments);

    expect(stats.byModel).toHaveLength(2);

    const modelA = stats.byModel.find((m) => m.modelId === "model-a");
    expect(modelA).toBeDefined();
    expect(modelA!.runCount).toBe(2);
    expect(modelA!.totalTokens).toBe(300);
    expect(modelA!.avgTokens).toBe(150);
    expect(modelA!.avgTps).toBeCloseTo(55, 1);
    expect(modelA!.maxTps).toBe(60);
    expect(modelA!.minTps).toBe(50);

    const modelB = stats.byModel.find((m) => m.modelId === "model-b");
    expect(modelB).toBeDefined();
    expect(modelB!.runCount).toBe(1);
    expect(modelB!.totalTokens).toBe(150);
  });

  it("按参数组合聚合统计", () => {
    const mockExperiment = (
      temp: number,
      topP: number,
      tokens: number,
    ): ExperimentRecord => ({
      id: `exp-${Math.random()}`,
      createdAt: Date.now(),
      name: "测试",
      starred: false,
      source: "run" as const,
      prompt: "测试",
      modelId: "test-model",
      params: { temperature: temp, topP },
      seed: null,
      device: "webgpu",
      root: {
        forkStep: 0,
        forcedId: -1,
        forcedText: "",
        children: [],
        trace: {
          modelId: "test-model",
          params: { temperature: temp, topP },
          promptIds: [],
          device: "webgpu",
          steps: Array(tokens)
            .fill(null)
            .map((_, i) => ({
              id: i,
              text: "词",
              prob: 0.5,
              topk: [],
              entropy: 2.0,
              dt: 10,
            })),
          pipeline: undefined,
          agent: undefined,
          extensions: {},
        },
      },
      stats: { tokens, avgTps: 50, avgEntropy: 2.0, branches: 1 },
      ruleset: undefined,
    });

    const sessions: ChatSession[] = [];
    const experiments: ExperimentRecord[] = [
      mockExperiment(0.7, 0.9, 100),
      mockExperiment(0.7, 0.9, 150),
      mockExperiment(1.0, 0.95, 200),
    ];

    const stats = computeOverallStats(sessions, experiments);

    expect(stats.byParams).toHaveLength(2);

    const params1 = stats.byParams.find(
      (p) => p.temperature === 0.7 && p.topP === 0.9,
    );
    expect(params1).toBeDefined();
    expect(params1!.runCount).toBe(2);
    expect(params1!.avgTokens).toBe(125);

    const params2 = stats.byParams.find(
      (p) => p.temperature === 1.0 && p.topP === 0.95,
    );
    expect(params2).toBeDefined();
    expect(params2!.runCount).toBe(1);
    expect(params2!.avgTokens).toBe(200);
  });

  it("计算熵分布区间", () => {
    const mockExperiment = (entropies: number[]): ExperimentRecord => ({
      id: `exp-${Math.random()}`,
      createdAt: Date.now(),
      name: "测试",
      starred: false,
      source: "run" as const,
      prompt: "测试",
      modelId: "test-model",
      params: { temperature: 0.7, topP: 0.9 },
      seed: null,
      device: "webgpu",
      root: {
        forkStep: 0,
        forcedId: -1,
        forcedText: "",
        children: [],
        trace: {
          modelId: "test-model",
          params: { temperature: 0.7, topP: 0.9 },
          promptIds: [],
          device: "webgpu",
          steps: entropies.map((entropy, i) => ({
            id: i,
            text: "词",
            prob: 0.5,
            topk: [],
            entropy,
            dt: 10,
          })),
          pipeline: undefined,
          agent: undefined,
          extensions: {},
        },
      },
      stats: {
        tokens: entropies.length,
        avgTps: 50,
        avgEntropy: entropies.reduce((a, b) => a + b, 0) / entropies.length,
        branches: 1,
      },
      ruleset: undefined,
    });

    const sessions: ChatSession[] = [];
    const experiments: ExperimentRecord[] = [
      mockExperiment([0.2, 0.7, 1.3, 2.5, 3.8, 4.2]),
    ];

    const stats = computeOverallStats(sessions, experiments);

    expect(stats.entropyDistribution).toHaveLength(10);
    expect(stats.entropyDistribution[0].range).toEqual([0, 0.5]);
    expect(stats.entropyDistribution[0].count).toBe(1); // 0.2
    expect(stats.entropyDistribution[1].range).toEqual([0.5, 1.0]);
    expect(stats.entropyDistribution[1].count).toBe(1); // 0.7
  });
});

describe("exportStatsToCSV", () => {
  it("导出为 CSV 格式，包含所有统计节", () => {
    const stats: OverallStats = {
      totalSessions: 2,
      totalExperiments: 3,
      totalTokens: 500,
      avgTps: 55.5,
      byModel: [
        {
          modelId: "model-a",
          runCount: 2,
          totalTokens: 300,
          avgTokens: 150,
          avgTps: 50,
          maxTps: 60,
          minTps: 40,
          avgEntropy: 2.5,
        },
      ],
      byParams: [
        {
          temperature: 0.7,
          topP: 0.9,
          runCount: 2,
          avgTokens: 150,
          avgEntropy: 2.4,
        },
      ],
      entropyDistribution: [
        { range: [0, 0.5], count: 10, percentage: 20 },
        { range: [0.5, 1.0], count: 15, percentage: 30 },
      ],
      temperatureDistribution: [
        { temperature: 0.7, count: 2, percentage: 66.67 },
        { temperature: 1.0, count: 1, percentage: 33.33 },
      ],
      sessions: [],
    };

    const csv = exportStatsToCSV(stats);

    expect(csv).toContain("# 总体统计");
    expect(csv).toContain("总会话数,2");
    expect(csv).toContain("总实验存档数,3");
    expect(csv).toContain("总 Token 数,500");
    expect(csv).toContain("平均生成速度 (tok/s),55.50");
    expect(csv).toContain("# 按模型统计");
    expect(csv).toContain("model-a,2,300");
    expect(csv).toContain("# 按参数统计");
    expect(csv).toContain("0.70,0.90,2");
    expect(csv).toContain("# 熵分布");
    expect(csv).toContain("[0.0, 0.5),10,20.00");
    expect(csv).toContain("# 温度分布");
    expect(csv).toContain("0.70,2,66.67");
  });
});

describe("exportStatsToJSON", () => {
  it("导出为 JSON 格式，保留完整数据结构", () => {
    const stats: OverallStats = {
      totalSessions: 1,
      totalExperiments: 1,
      totalTokens: 100,
      avgTps: 50,
      byModel: [],
      byParams: [],
      entropyDistribution: [],
      temperatureDistribution: [],
      sessions: [],
    };

    const json = exportStatsToJSON(stats);
    const parsed = JSON.parse(json);

    expect(parsed.totalSessions).toBe(1);
    expect(parsed.totalExperiments).toBe(1);
    expect(parsed.totalTokens).toBe(100);
    expect(parsed.avgTps).toBe(50);
  });
});
