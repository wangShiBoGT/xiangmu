import { useMemo, useState } from "react";
import type { ExperimentRecord } from "../lib/experiments";
import { getModel } from "../lib/models";
import { answerExcerpt, plainSpeed } from "../lib/plainWords";
import ConfidenceText from "./ConfidenceText";
import Dropdown from "./Dropdown";
import TraceFingerprint from "./TraceFingerprint";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 档案卡片网格：每张卡 = 一次真实运行。
 *  问题一行 + 着色回答摘录两行 + 人话徽章 + 迷你 trace 指纹；点卡进对话页。 */
export default function ArchiveCards({
  records,
  onOpenCard,
}: {
  records: ExperimentRecord[];
  onOpenCard: (rec: ExperimentRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const modelIds = useMemo(
    () => [...new Set(records.map((r) => r.modelId))],
    [records],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (modelFilter && r.modelId !== modelFilter) return false;
      if (!q) return true;
      return (
        r.prompt.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      );
    });
  }, [records, query, modelFilter]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-obs-line bg-obs-2 px-4 py-1.5 text-[13px] text-obs-ink placeholder:text-obs-ink2/50 focus:outline-none"
          placeholder="搜索问题…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {modelIds.length > 1 && (
          <Dropdown
            ariaLabel="按模型筛选"
            tone="obs"
            align="right"
            triggerClassName="flex items-center gap-1.5 rounded-md border border-obs-line bg-obs-2 px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink focus:outline-none cursor-pointer"
            value={modelFilter}
            onChange={setModelFilter}
            options={[
              { value: "", label: "全部模型" },
              ...modelIds.map((id) => ({
                value: id,
                label: getModel(id)?.name ?? id,
              })),
            ]}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-[13px] text-obs-ink2">没有匹配的记录。</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {filtered.map((r) => {
            const steps = r.root.trace?.steps ?? [];
            const ex = answerExcerpt(steps, 80);
            const speed = plainSpeed(r.stats.avgTps);
            return (
              <button
                key={r.id}
                type="button"
                className="flex flex-col rounded-md border border-obs-line bg-obs-2 p-4 text-left transition-colors hover:border-measure-400/50"
                onClick={() => onOpenCard(r)}
              >
                <p className="flex items-baseline gap-1.5">
                  {r.starred && (
                    <span className="shrink-0 text-[11px] text-amber-300">★</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-obs-ink">
                    {r.prompt || r.name}
                  </span>
                </p>
                <p className="mt-2 line-clamp-2 min-h-[38px] text-[13px] leading-[1.7]">
                  {ex ? (
                    <ConfidenceText steps={steps} from={ex.from} to={ex.to} />
                  ) : (
                    <span className="text-obs-ink2">（无正式回答段）</span>
                  )}
                  <span className="text-obs-ink2">…</span>
                </p>
                <p className="mt-2 text-[11px] text-obs-ink2">
                  {getModel(r.modelId)?.name ?? r.modelId} · {fmtDate(r.createdAt)} ·{" "}
                  {r.stats.tokens} 个词{speed ? ` · ${speed}` : ""}
                </p>
                <div className="mt-2.5">
                  <TraceFingerprint
                    steps={steps}
                    forkSteps={r.root.children.map((c) => c.forkStep)}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
