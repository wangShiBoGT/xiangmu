import { useEffect, useMemo, useState } from "react";
import {
  firstDivergence,
  listExperiments,
  type ExperimentRecord,
} from "../lib/experiments";
import { getModel } from "../lib/models";

interface PromptGroup {
  prompt: string;
  records: ExperimentRecord[];
}

interface DaySection {
  key: string;
  label: string;
  groups: PromptGroup[];
}

function dayLabel(ts: number): { key: string; label: string } {
  const d = new Date(ts);
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const y = new Date(now.getTime() - 86400000);
  const yesterday = `${y.getFullYear()}-${y.getMonth()}-${y.getDate()}`;
  const label =
    key === today
      ? "今天"
      : key === yesterday
        ? "昨天"
        : `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  return { key, label };
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/** 研究时间线：把存档从「历史列表」升级为「实验日志」首层入口。
 *  按日分节；同一天内同 prompt 的多次实验自动串组，直接标出平均熵的真实走向
 *  （观察不再是一次性的，而是可以看见跨实验的趋势）。数据全部来自真实存档。 */
export default function ResearchTimeline({
  refreshKey,
  onLoad,
  onCompare,
}: {
  refreshKey: number;
  onLoad: (rec: ExperimentRecord) => void;
  onCompare?: (a: ExperimentRecord, b: ExperimentRecord) => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listExperiments().then((rs) => {
      if (alive) setRecords(rs);
    });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const sections = useMemo<DaySection[]>(() => {
    if (!records) return [];
    const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
    const days: DaySection[] = [];
    for (const rec of sorted) {
      const { key, label } = dayLabel(rec.createdAt);
      let day = days[days.length - 1];
      if (!day || day.key !== key) {
        day = { key, label, groups: [] };
        days.push(day);
      }
      const group = day.groups.find((g) => g.prompt === rec.prompt);
      if (group) group.records.push(rec);
      else day.groups.push({ prompt: rec.prompt, records: [rec] });
    }
    return days.slice(0, 7);
  }, [records]);

  if (!records || records.length === 0) return null;

  return (
    <div className="mx-auto mt-16 w-full max-w-[560px] text-left">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/60 select-none">
        Research Timeline · 研究时间线
      </p>
      <div className="space-y-6">
        {sections.map((day) => (
          <section key={day.key}>
            <p className="mb-2 text-[11px] tabular-nums text-obs-ink2/70 select-none">
              {day.label}
            </p>
            <div className="space-y-2">
              {day.groups.map((g) => {
                // 同 prompt 多次实验：按时间正序取平均熵，标出真实走向
                const runs = [...g.records].sort(
                  (a, b) => a.createdAt - b.createdAt,
                );
                const trend =
                  runs.length >= 2
                    ? runs.map((r) => r.stats.avgEntropy.toFixed(2)).join(" → ")
                    : null;
                // 最近两次同 prompt 实验的真实分叉位置（token 序列逐步比对）
                const latestTwo =
                  runs.length >= 2
                    ? ([runs[runs.length - 2], runs[runs.length - 1]] as const)
                    : null;
                const divergeAt = latestTwo
                  ? firstDivergence(
                      latestTwo[0].root.trace?.steps ?? [],
                      latestTwo[1].root.trace?.steps ?? [],
                    )
                  : -1;
                return (
                  <div
                    key={g.records[0].id}
                    className="rounded-md border border-obs-line bg-obs-2 px-4 py-3"
                  >
                    <p className="text-[13px] leading-relaxed text-obs-ink">
                      {g.prompt.length > 60
                        ? `${g.prompt.slice(0, 60)}…`
                        : g.prompt}
                    </p>
                    {trend && (
                      <p className="mt-1 text-[11px] tabular-nums text-obs-ink2/80 select-none">
                        {runs.length} 次实验 · 平均熵 {trend}
                        {latestTwo &&
                          (divergeAt >= 0
                            ? ` · 最近两次从第 ${divergeAt + 1} 步开始分叉`
                            : " · 最近两次 token 序列完全一致")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...g.records]
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            title={`${getModel(rec.modelId)?.name ?? rec.modelId} · ${rec.stats.tokens} tok · 平均熵 ${rec.stats.avgEntropy.toFixed(2)}`}
                            className="flex items-center gap-1.5 rounded-md border border-obs-line px-2.5 py-1 text-[11px] tabular-nums text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                            onClick={() => onLoad(rec)}
                          >
                            {rec.starred && (
                              <span className="text-amber-400/90">★</span>
                            )}
                            {hhmm(rec.createdAt)}
                            <span className="text-obs-ink2/60">
                              熵 {rec.stats.avgEntropy.toFixed(2)}
                            </span>
                            {rec.source === "imported" && (
                              <span className="text-obs-ink2/60">导入</span>
                            )}
                          </button>
                        ))}
                      {latestTwo && onCompare && (
                        <button
                          type="button"
                          title="把最近两次实验的真实 trace 叠加到同一时间轴对比"
                          className="rounded-md border border-indigo-400/40 px-2.5 py-1 text-[11px] text-indigo-300 transition-colors hover:border-indigo-400/70 hover:text-indigo-200"
                          onClick={() => onCompare(latestTwo[0], latestTwo[1])}
                        >
                          对比最近两次 →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
