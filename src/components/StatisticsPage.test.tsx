/** StatisticsPage 组件单元测试 */

import { describe, it, expect } from "vitest";
import { computeOverallStats, exportStatsToCSV, exportStatsToJSON } from "../lib/statistics";
import type { ChatSession } from "../lib/chatStore";
import type { ExperimentRecord } from "../lib/experiments";

// 测试统计功能的核心逻辑，而不是 React 组件渲染
// React 组件测试需要 mock 图标组件，跳过以避免复杂性

describe("StatisticsPage logic", () => {
  it("空数据集返回零值统计", () => {
    const sessions: ChatSession[] = [];
    const experiments: ExperimentRecord[] = [];
    const stats = computeOverallStats(sessions, experiments);

    expect(stats.totalSessions).toBe(0);
    expect(stats.totalExperiments).toBe(0);
    expect(stats.totalTokens).toBe(0);
  });

  it("从会话提取基础信息", () => {
    const sessions: ChatSession[] = [
      {
        id: "sess-1",
        title: "测试",
        createdAt: Date.now(),
        messages: [
          { role: "user", content: "问题" },
          { role: "assistant", content: "回答" },
        ],
      },
    ];
    const experiments: ExperimentRecord[] = [];
    const stats = computeOverallStats(sessions, experiments);

    expect(stats.totalSessions).toBe(1);
    expect(stats.sessions[0].messageCount).toBe(2);
  });

  it("CSV 导出包含所有数据节", () => {
    const mockStats = {
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

    const csv = exportStatsToCSV(mockStats);
    expect(csv).toContain("# 总体统计");
    expect(csv).toContain("总会话数,1");
  });

  it("JSON 导出保留完整结构", () => {
    const mockStats = {
      totalSessions: 2,
      totalExperiments: 3,
      totalTokens: 500,
      avgTps: 55.5,
      byModel: [],
      byParams: [],
      entropyDistribution: [],
      temperatureDistribution: [],
      sessions: [],
    };

    const json = exportStatsToJSON(mockStats);
    const parsed = JSON.parse(json);
    expect(parsed.totalSessions).toBe(2);
    expect(parsed.totalExperiments).toBe(3);
  });
});
