/** 本地统计面板：聚合 localStorage 会话历史和 IndexedDB 存档的性能指标 */

import type { ChatSession } from "./chatStore";
import type { ExperimentRecord } from "./experiments";
import type { TokenStep } from "./trace";

export interface SessionStats {
  /** 会话 ID */
  sessionId: string;
  /** 会话标题 */
  title: string;
  /** 创建时间 */
  createdAt: number;
  /** 消息数量 */
  messageCount: number;
  /** 用户消息数 */
  userMessages: number;
  /** 助手消息数 */
  assistantMessages: number;
}

export interface ModelStats {
  /** 模型 ID */
  modelId: string;
  /** 使用次数 */
  runCount: number;
  /** 总 token 数 */
  totalTokens: number;
  /** 平均 token 数/次 */
  avgTokens: number;
  /** 平均生成速度 (tokens/s) */
  avgTps: number | null;
  /** 平均熵 */
  avgEntropy: number;
  /** 最快速度 (tokens/s) */
  maxTps: number | null;
  /** 最慢速度 (tokens/s) */
  minTps: number | null;
}

export interface ParameterStats {
  /** 温度值 */
  temperature: number;
  /** Top-P 值 */
  topP: number;
  /** 使用次数 */
  runCount: number;
  /** 平均 token 数 */
  avgTokens: number;
  /** 平均熵 */
  avgEntropy: number;
}

export interface EntropyDistribution {
  /** 熵值区间 [min, max) */
  range: [number, number];
  /** 该区间的 token 数量 */
  count: number;
  /** 占比 */
  percentage: number;
}

export interface TemperatureDistribution {
  /** 温度值 */
  temperature: number;
  /** 使用次数 */
  count: number;
  /** 占比 */
  percentage: number;
}

export interface OverallStats {
  /** 总会话数 */
  totalSessions: number;
  /** 总实验存档数 */
  totalExperiments: number;
  /** 总 token 数 */
  totalTokens: number;
  /** 平均生成速度 (tokens/s) */
  avgTps: number | null;
  /** 按模型聚合 */
  byModel: ModelStats[];
  /** 按参数聚合 */
  byParams: ParameterStats[];
  /** 熵分布 */
  entropyDistribution: EntropyDistribution[];
  /** 温度分布 */
  temperatureDistribution: TemperatureDistribution[];
  /** 会话列表 */
  sessions: SessionStats[];
}

/** 计算熵分布：分 10 个区间 [0, 0.5), [0.5, 1.0), ..., [4.5, 5.0) */
function computeEntropyDistribution(steps: TokenStep[]): EntropyDistribution[] {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: [i * 0.5, (i + 1) * 0.5] as [number, number],
    count: 0,
    percentage: 0,
  }));

  for (const step of steps) {
    const idx = Math.min(9, Math.floor(step.entropy / 0.5));
    bins[idx].count++;
  }

  const total = steps.length;
  for (const bin of bins) {
    bin.percentage = total > 0 ? (bin.count / total) * 100 : 0;
  }

  return bins;
}

/** 计算温度分布 */
function computeTemperatureDistribution(
  experiments: ExperimentRecord[],
): TemperatureDistribution[] {
  const map = new Map<number, number>();

  for (const exp of experiments) {
    const temp = exp.params.temperature;
    map.set(temp, (map.get(temp) ?? 0) + 1);
  }

  const total = experiments.length;
  return Array.from(map.entries())
    .map(([temperature, count]) => ({
      temperature,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 按模型聚合统计 */
function aggregateByModel(experiments: ExperimentRecord[]): ModelStats[] {
  const map = new Map<string, {
    runCount: number;
    totalTokens: number;
    totalEntropy: number;
    tpsValues: number[];
  }>();

  for (const exp of experiments) {
    const modelId = exp.modelId;
    const stats = exp.stats;
    const existing = map.get(modelId) ?? {
      runCount: 0,
      totalTokens: 0,
      totalEntropy: 0,
      tpsValues: [],
    };

    existing.runCount++;
    existing.totalTokens += stats.tokens;
    existing.totalEntropy += stats.avgEntropy * stats.tokens;
    if (stats.avgTps !== null) {
      existing.tpsValues.push(stats.avgTps);
    }

    map.set(modelId, existing);
  }

  return Array.from(map.entries())
    .map(([modelId, data]) => ({
      modelId,
      runCount: data.runCount,
      totalTokens: data.totalTokens,
      avgTokens: data.totalTokens / data.runCount,
      avgEntropy: data.totalTokens > 0 ? data.totalEntropy / data.totalTokens : 0,
      avgTps:
        data.tpsValues.length > 0
          ? data.tpsValues.reduce((a, b) => a + b, 0) / data.tpsValues.length
          : null,
      maxTps: data.tpsValues.length > 0 ? Math.max(...data.tpsValues) : null,
      minTps: data.tpsValues.length > 0 ? Math.min(...data.tpsValues) : null,
    }))
    .sort((a, b) => b.runCount - a.runCount);
}

/** 按参数聚合统计 */
function aggregateByParams(experiments: ExperimentRecord[]): ParameterStats[] {
  const map = new Map<string, {
    temperature: number;
    topP: number;
    runCount: number;
    totalTokens: number;
    totalEntropy: number;
  }>();

  for (const exp of experiments) {
    const key = `${exp.params.temperature.toFixed(2)}-${exp.params.topP.toFixed(2)}`;
    const stats = exp.stats;
    const existing = map.get(key) ?? {
      temperature: exp.params.temperature,
      topP: exp.params.topP,
      runCount: 0,
      totalTokens: 0,
      totalEntropy: 0,
    };

    existing.runCount++;
    existing.totalTokens += stats.tokens;
    existing.totalEntropy += stats.avgEntropy * stats.tokens;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((data) => ({
      temperature: data.temperature,
      topP: data.topP,
      runCount: data.runCount,
      avgTokens: data.totalTokens / data.runCount,
      avgEntropy: data.totalTokens > 0 ? data.totalEntropy / data.totalTokens : 0,
    }))
    .sort((a, b) => b.runCount - a.runCount);
}

/** 从会话历史提取统计 */
function extractSessionStats(sessions: ChatSession[]): SessionStats[] {
  return sessions.map((session) => ({
    sessionId: session.id,
    title: session.title,
    createdAt: session.createdAt,
    messageCount: session.messages.length,
    userMessages: session.messages.filter((m) => m.role === "user").length,
    assistantMessages: session.messages.filter((m) => m.role === "assistant").length,
  }));
}

/** 计算总体统计 */
export function computeOverallStats(
  sessions: ChatSession[],
  experiments: ExperimentRecord[],
): OverallStats {
  const allSteps = experiments.flatMap((e) => e.root.trace?.steps ?? []);
  const totalTokens = allSteps.length;

  const tpsValues = experiments
    .map((e) => e.stats.avgTps)
    .filter((t): t is number => t !== null);
  const avgTps =
    tpsValues.length > 0
      ? tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length
      : null;

  return {
    totalSessions: sessions.length,
    totalExperiments: experiments.length,
    totalTokens,
    avgTps,
    byModel: aggregateByModel(experiments),
    byParams: aggregateByParams(experiments),
    entropyDistribution: computeEntropyDistribution(allSteps),
    temperatureDistribution: computeTemperatureDistribution(experiments),
    sessions: extractSessionStats(sessions),
  };
}

/** 导出为 CSV 格式 */
export function exportStatsToCSV(stats: OverallStats): string {
  const lines: string[] = [];

  // 总体统计
  lines.push("# 总体统计");
  lines.push("指标,数值");
  lines.push(`总会话数,${stats.totalSessions}`);
  lines.push(`总实验存档数,${stats.totalExperiments}`);
  lines.push(`总 Token 数,${stats.totalTokens}`);
  lines.push(`平均生成速度 (tok/s),${stats.avgTps?.toFixed(2) ?? "N/A"}`);
  lines.push("");

  // 按模型统计
  lines.push("# 按模型统计");
  lines.push("模型ID,运行次数,总Token数,平均Token数,平均速度(tok/s),最快速度,最慢速度,平均熵");
  for (const m of stats.byModel) {
    lines.push(
      `${m.modelId},${m.runCount},${m.totalTokens},${m.avgTokens.toFixed(1)},${m.avgTps?.toFixed(2) ?? "N/A"},${m.maxTps?.toFixed(2) ?? "N/A"},${m.minTps?.toFixed(2) ?? "N/A"},${m.avgEntropy.toFixed(3)}`,
    );
  }
  lines.push("");

  // 按参数统计
  lines.push("# 按参数统计");
  lines.push("温度,Top-P,运行次数,平均Token数,平均熵");
  for (const p of stats.byParams) {
    lines.push(
      `${p.temperature.toFixed(2)},${p.topP.toFixed(2)},${p.runCount},${p.avgTokens.toFixed(1)},${p.avgEntropy.toFixed(3)}`,
    );
  }
  lines.push("");

  // 熵分布
  lines.push("# 熵分布");
  lines.push("区间,数量,占比(%)");
  for (const e of stats.entropyDistribution) {
    lines.push(
      `[${e.range[0].toFixed(1)}, ${e.range[1].toFixed(1)}),${e.count},${e.percentage.toFixed(2)}`,
    );
  }
  lines.push("");

  // 温度分布
  lines.push("# 温度分布");
  lines.push("温度,使用次数,占比(%)");
  for (const t of stats.temperatureDistribution) {
    lines.push(`${t.temperature.toFixed(2)},${t.count},${t.percentage.toFixed(2)}`);
  }

  return lines.join("\n");
}

/** 导出为 JSON 格式 */
export function exportStatsToJSON(stats: OverallStats): string {
  return JSON.stringify(stats, null, 2);
}
