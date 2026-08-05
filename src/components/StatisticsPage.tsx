/**
 * 统计面板：可视化会话历史和实验存档的性能指标
 */

import { useEffect, useState } from "react";
import { loadSessions } from "../lib/chatStore";
import { listExperiments } from "../lib/experiments";
import {
  computeOverallStats,
  exportStatsToCSV,
  exportStatsToJSON,
  type OverallStats,
  type ModelStats,
  type ParameterStats,
  type EntropyDistribution,
} from "../lib/statistics";
import { IconDownload, IconBarChart } from "./icons";

export default function StatisticsPage() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"overview" | "models" | "params" | "distributions">("overview");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const sessions = loadSessions();
        const experiments = await listExperiments();
        const computed = computeOverallStats(sessions, experiments);
        setStats(computed);
      } catch (error) {
        console.error("加载统计数据失败:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleExport = (format: "csv" | "json") => {
    if (!stats) return;

    const content = format === "csv" ? exportStatsToCSV(stats) : exportStatsToJSON(stats);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statistics-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-obs-ink3">加载统计数据中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-obs-ink3">无法加载统计数据</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* 标题栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBarChart className="h-6 w-6 text-[#10A0FF]" />
          <h1 className="text-[24px] font-semibold text-obs-ink">本地统计</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 rounded-lg border border-obs-line bg-obs-2 px-4 py-2 text-[14px] text-obs-ink2 transition-colors hover:bg-obs-3"
          >
            <IconDownload className="h-4 w-4" />
            导出 CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-2 rounded-lg border border-obs-line bg-obs-2 px-4 py-2 text-[14px] text-obs-ink2 transition-colors hover:bg-obs-3"
          >
            <IconDownload className="h-4 w-4" />
            导出 JSON
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="mb-6 flex gap-1 border-b border-obs-line">
        {[
          { key: "overview", label: "总览" },
          { key: "models", label: "按模型" },
          { key: "params", label: "按参数" },
          { key: "distributions", label: "分布统计" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
            className={`px-4 py-2 text-[14px] transition-colors ${
              selectedTab === tab.key
                ? "border-b-2 border-[#10A0FF] text-[#10A0FF]"
                : "text-obs-ink3 hover:text-obs-ink2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="space-y-6">
        {selectedTab === "overview" && <OverviewTab stats={stats} />}
        {selectedTab === "models" && <ModelsTab models={stats.byModel} />}
        {selectedTab === "params" && <ParamsTab params={stats.byParams} />}
        {selectedTab === "distributions" && (
          <DistributionsTab
            entropyDistribution={stats.entropyDistribution}
            temperatureDistribution={stats.temperatureDistribution}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: OverallStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard label="总会话数" value={stats.totalSessions.toString()} />
      <StatCard label="总实验存档数" value={stats.totalExperiments.toString()} />
      <StatCard label="总 Token 数" value={stats.totalTokens.toLocaleString()} />
      <StatCard
        label="平均生成速度"
        value={stats.avgTps !== null ? `${stats.avgTps.toFixed(1)} tok/s` : "N/A"}
      />
    </div>
  );
}

function ModelsTab({ models }: { models: ModelStats[] }) {
  if (models.length === 0) {
    return <div className="text-center text-obs-ink3">暂无数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-obs-line text-left text-obs-ink3">
            <th className="pb-2">模型</th>
            <th className="pb-2 text-right">运行次数</th>
            <th className="pb-2 text-right">总 Token</th>
            <th className="pb-2 text-right">平均 Token</th>
            <th className="pb-2 text-right">平均速度</th>
            <th className="pb-2 text-right">最快/最慢</th>
            <th className="pb-2 text-right">平均熵</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.modelId} className="border-b border-obs-line/50">
              <td className="py-3 text-obs-ink">{m.modelId}</td>
              <td className="py-3 text-right text-obs-ink2">{m.runCount}</td>
              <td className="py-3 text-right text-obs-ink2">{m.totalTokens.toLocaleString()}</td>
              <td className="py-3 text-right text-obs-ink2">{m.avgTokens.toFixed(0)}</td>
              <td className="py-3 text-right text-obs-ink2">
                {m.avgTps !== null ? `${m.avgTps.toFixed(1)} tok/s` : "N/A"}
              </td>
              <td className="py-3 text-right text-obs-ink2">
                {m.maxTps !== null && m.minTps !== null
                  ? `${m.maxTps.toFixed(1)} / ${m.minTps.toFixed(1)}`
                  : "N/A"}
              </td>
              <td className="py-3 text-right text-obs-ink2">{m.avgEntropy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ParamsTab({ params }: { params: ParameterStats[] }) {
  if (params.length === 0) {
    return <div className="text-center text-obs-ink3">暂无数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-obs-line text-left text-obs-ink3">
            <th className="pb-2">温度</th>
            <th className="pb-2">Top-P</th>
            <th className="pb-2 text-right">运行次数</th>
            <th className="pb-2 text-right">平均 Token</th>
            <th className="pb-2 text-right">平均熵</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, idx) => (
            <tr key={idx} className="border-b border-obs-line/50">
              <td className="py-3 text-obs-ink">{p.temperature.toFixed(2)}</td>
              <td className="py-3 text-obs-ink">{p.topP.toFixed(2)}</td>
              <td className="py-3 text-right text-obs-ink2">{p.runCount}</td>
              <td className="py-3 text-right text-obs-ink2">{p.avgTokens.toFixed(0)}</td>
              <td className="py-3 text-right text-obs-ink2">{p.avgEntropy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionsTab({
  entropyDistribution,
  temperatureDistribution,
}: {
  entropyDistribution: EntropyDistribution[];
  temperatureDistribution: { temperature: number; count: number; percentage: number }[];
}) {
  const maxEntropyCount = Math.max(...entropyDistribution.map((e) => e.count), 1);
  const maxTempCount = Math.max(...temperatureDistribution.map((t) => t.count), 1);

  return (
    <div className="space-y-8">
      {/* 熵分布 */}
      <div>
        <h2 className="mb-4 text-[18px] font-medium text-obs-ink">熵分布</h2>
        <div className="space-y-2">
          {entropyDistribution.map((e, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-24 text-[13px] text-obs-ink3">
                [{e.range[0].toFixed(1)}, {e.range[1].toFixed(1)})
              </div>
              <div className="flex-1">
                <div className="h-6 rounded bg-obs-2">
                  <div
                    className="h-full rounded bg-[#10A0FF]/60"
                    style={{ width: `${(e.count / maxEntropyCount) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right text-[13px] text-obs-ink2">
                {e.count} ({e.percentage.toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 温度分布 */}
      <div>
        <h2 className="mb-4 text-[18px] font-medium text-obs-ink">温度分布</h2>
        <div className="space-y-2">
          {temperatureDistribution.map((t, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-16 text-[13px] text-obs-ink3">{t.temperature.toFixed(2)}</div>
              <div className="flex-1">
                <div className="h-6 rounded bg-obs-2">
                  <div
                    className="h-full rounded bg-[#ffa726]/60"
                    style={{ width: `${(t.count / maxTempCount) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right text-[13px] text-obs-ink2">
                {t.count} ({t.percentage.toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-obs-line bg-obs-2 p-4">
      <div className="text-[13px] text-obs-ink3">{label}</div>
      <div className="mt-2 text-[24px] font-semibold text-obs-ink">{value}</div>
    </div>
  );
}
