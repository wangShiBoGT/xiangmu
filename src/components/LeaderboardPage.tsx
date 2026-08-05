import { useState, useEffect } from "react";
import { IconStar, IconArrowUp, IconGlobe } from "./icons";
import LeaderboardSubmitDialog, { type SubmitData } from "./LeaderboardSubmitDialog";
import type { LeaderboardEntry } from "../lib/leaderboard";


export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // 阶段 1: 从 GitHub Discussions 读取
      const { fetchLeaderboard } = await import('../lib/leaderboard');
      const data = await fetchLeaderboard();
      setRankings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rankings.filter(
    (r) => filter === "all" || r.device_tier === filter
  );

  const handleSubmit = async (data: SubmitData) => {
    const { submitToLeaderboard } = await import('../lib/leaderboard');

    const result = await submitToLeaderboard({
      nickname: data.nickname,
      deviceName: data.deviceName,
      deviceTier: data.deviceTier,
      gpuName: data.gpuName,
      modelId: data.modelId,
      speed: data.speed,
      traceData: data.traceData,
    });

    if (!result.success) {
      throw new Error(result.error || '提交失败');
    }

    // 提交成功，刷新排行榜
    await loadLeaderboard();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-obs">
      {/* 头部 */}
      <div className="border-b border-obs-line bg-obs-1 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconStar className="h-6 w-6 text-amber-500" filled />
            <h1 className="text-xl font-semibold text-obs-ink">
              🏆 全球性能排行榜
            </h1>
          </div>

          <button
            onClick={() => setShowSubmitDialog(true)}
            className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <IconArrowUp className="h-4 w-4" />
            提交我的成绩
          </button>
        </div>

        {/* 设备分类过滤 */}
        <div className="mt-4 flex gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            全部设备
          </FilterButton>
          <FilterButton
            active={filter === 1}
            onClick={() => setFilter(1)}
          >
            集显组
          </FilterButton>
          <FilterButton
            active={filter === 2}
            onClick={() => setFilter(2)}
          >
            中端独显组
          </FilterButton>
          <FilterButton
            active={filter === 3}
            onClick={() => setFilter(3)}
          >
            高端显卡组
          </FilterButton>
        </div>
      </div>

      {/* 排行榜内容 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <div className="flex h-full items-center justify-center text-obs-ink2">
            加载中...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-obs-ink2">
            <IconStar className="h-16 w-16 opacity-50" filled />
            <div className="text-center">
              <p className="text-lg font-medium">暂无提交记录</p>
              <p className="mt-1 text-sm">
                成为第一个提交性能成绩的贡献者！
              </p>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-obs-line text-left text-sm text-obs-ink2">
                  <th className="pb-3 pr-4 font-medium">排名</th>
                  <th className="pb-3 pr-4 font-medium">贡献者</th>
                  <th className="pb-3 pr-4 font-medium">设备信息</th>
                  <th className="pb-3 pr-4 font-medium">模型</th>
                  <th className="pb-3 pr-4 font-medium">速度 (tokens/s)</th>
                  <th className="pb-3 font-medium">验证</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className="border-b border-obs-line/50 transition-colors hover:bg-obs-1/50"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="text-2xl">🥇</span>
                        )}
                        {index === 1 && (
                          <span className="text-2xl">🥈</span>
                        )}
                        {index === 2 && (
                          <span className="text-2xl">🥉</span>
                        )}
                        {index > 2 && (
                          <span className="font-mono text-obs-ink2">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        {entry.avatar_url && (
                          <img
                            src={entry.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <span className="font-medium text-obs-ink">
                          {entry.nickname}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-sm">
                        <div className="text-obs-ink">{entry.device_name}</div>
                        <div className="text-obs-ink2">{entry.gpu_name}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <code className="text-sm text-obs-ink">
                        {entry.model_id}
                      </code>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-mono text-lg font-semibold text-brand">
                        {entry.speed.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-4">
                      <a
                        href={entry.trace_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-brand transition-colors hover:text-brand/80"
                      >
                        查看 Trace
                        <IconGlobe className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 提交对话框 */}
      {showSubmitDialog && (
        <LeaderboardSubmitDialog
          onClose={() => setShowSubmitDialog(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-brand text-white"
          : "bg-obs-1 text-obs-ink2 hover:bg-obs-2 hover:text-obs-ink"
      }`}
    >
      {children}
    </button>
  );
}
