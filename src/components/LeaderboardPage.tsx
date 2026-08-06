/** 排行榜页：只读由 Actions 生成的静态 leaderboard.json。
 *  本页不做任何测量、不产生任何新数字；榜单文件不存在时如实说「还没生成」，
 *  不用空表假装「暂无提交」。 */

import { useCallback, useEffect, useState } from "react";
import { IconStar, IconArrowUp, IconGlobe } from "./icons";
import LeaderboardSubmitDialog from "./LeaderboardSubmitDialog";
import {
  DEVICE_TIER_LABEL,
  DISCUSSIONS_URL,
  VERIFY_LABEL,
  fetchLeaderboard,
  type LeaderboardState,
} from "../lib/leaderboard";

export default function LeaderboardPage() {
  const [state, setState] = useState<LeaderboardState | null>(null);
  const [filter, setFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await fetchLeaderboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = state?.status === "ok" ? state.entries : [];
  const filtered = entries.filter(
    (r) => filter === "all" || r.deviceTier === filter,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-obs">
      <div className="border-b border-obs-line bg-obs-1 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconStar className="h-6 w-6 text-amber-500" filled />
            <div>
              <h1 className="text-xl font-semibold text-obs-ink">性能排行榜</h1>
              <p className="mt-0.5 text-[12px] text-obs-ink2">
                成绩由参与者用自己的 GitHub 账号发布 · 数值自报，同模型同后端才可比
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitDialog(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <IconArrowUp className="h-4 w-4" />
            提交我的成绩
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            全部设备
          </FilterButton>
          {([1, 2, 3] as const).map((t) => (
            <FilterButton
              key={t}
              active={filter === t}
              onClick={() => setFilter(t)}
            >
              {DEVICE_TIER_LABEL[t]}
            </FilterButton>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <div className="flex h-full items-center justify-center text-obs-ink2">
            加载中…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-500">
            {error}
            <button
              onClick={() => void load()}
              className="ml-3 underline hover:no-underline"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && state?.status === "absent" && (
          <div className="mx-auto max-w-md py-12 text-center">
            <IconStar className="mx-auto h-12 w-12 text-obs-ink2/40" filled />
            <p className="mt-4 text-[15px] font-medium text-obs-ink">
              榜单还没有生成
            </p>
            <p className="mt-2 text-[13px] leading-[1.8] text-obs-ink2">
              榜单由定时任务从仓库 Discussions 汇总成静态文件。文件还不存在，
              说明任务尚未跑过或还没有任何提交——没有数据就是没有数据，不编空榜。
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setShowSubmitDialog(true)}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
              >
                提交第一条成绩
              </button>
              <a
                href={DISCUSSIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-obs-line px-4 py-2 text-sm font-medium text-obs-ink transition-colors hover:bg-obs-1"
              >
                去 Discussions 看看
              </a>
            </div>
          </div>
        )}

        {!loading && !error && state?.status === "ok" && (
          <>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-obs-ink2">
                <p className="text-[15px] font-medium text-obs-ink">
                  这个档位还没有成绩
                </p>
                <p className="mt-1.5 text-[13px]">
                  榜单共 {entries.length} 条，换个档位或提交你的成绩。
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-obs-line text-left text-sm text-obs-ink2">
                      <th className="pb-3 pr-4 font-medium">排名</th>
                      <th className="pb-3 pr-4 font-medium">提交者</th>
                      <th className="pb-3 pr-4 font-medium">设备</th>
                      <th className="pb-3 pr-4 font-medium">模型 · 后端</th>
                      <th className="pb-3 pr-4 font-medium">tok/s（自报）</th>
                      <th className="pb-3 font-medium">可信程度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b border-obs-line/50 transition-colors hover:bg-obs-1/50"
                      >
                        <td className="py-4 pr-4">
                          <span className="font-mono text-obs-ink2">
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            {entry.avatarUrl && (
                              <img
                                src={entry.avatarUrl}
                                alt=""
                                className="h-8 w-8 rounded-full"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium text-obs-ink">
                                {entry.nickname}
                              </div>
                              <div className="truncate text-xs text-obs-ink2">
                                @{entry.author}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="text-sm">
                            <div className="text-obs-ink">{entry.deviceName}</div>
                            <div className="text-obs-ink2">{entry.gpuName}</div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="text-sm">
                            <code className="text-obs-ink">{entry.modelId}</code>
                            <div className="text-xs text-obs-ink2">
                              {entry.device === "webgpu"
                                ? "WebGPU"
                                : "CPU (WASM)"}
                              {entry.machineScore &&
                                ` · Score ${entry.machineScore.total} ${entry.machineScore.grade}`}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="font-mono text-lg font-semibold text-brand tabular-nums">
                            {entry.tps.toFixed(1)}
                          </span>
                          <div className="text-xs text-obs-ink2 tabular-nums">
                            {entry.tokens} tokens
                          </div>
                        </td>
                        <td className="py-4">
                          <a
                            href={entry.discussionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80"
                            title={VERIFY_LABEL[entry.verify]}
                          >
                            {entry.verify === "trace-attached"
                              ? "已附 trace"
                              : "仅账号"}
                            <IconGlobe className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-[12px] leading-[1.7] text-obs-ink2">
                  榜单生成于 {new Date(state.generatedAt).toLocaleString()}
                  ，由定时任务汇总 Discussions 得到。「已附 trace」只表示帖子里有
                  .aitrace 附件，未复核其内容；吞吐为提交方自报，跨模型或跨后端不可比。
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {showSubmitDialog && (
        <LeaderboardSubmitDialog onClose={() => setShowSubmitDialog(false)} />
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
