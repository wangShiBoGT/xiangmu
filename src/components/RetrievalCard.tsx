/** 检索决策卡（Sprint 5 · RAG Observatory）：只在 trace 携带真实检索记录时出现。
 *  沿用「没走的路」视觉语言：选中文档暖白、落选文档幽灵虚线 + 原因如实标注；
 *  一句人话先行：「它拿这句话去搜，N 篇候选里选了这 K 篇，因为…」。 */
import type { RetrievalRecord } from "../lib/agentRun";

export default function RetrievalCard({ record }: { record: RetrievalRecord }) {
  const { query, results, selected } = record;
  if (results.length === 0) return null;
  const picked = new Set(selected);
  return (
    <section className="mt-4 rounded-md border border-obs-line bg-obs-2/85 px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-[0.2em] text-measure-300/90 select-none">
        检索决策 · 它引用了什么，放弃了什么
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-obs-ink2 select-none">
        它拿「{query}」去搜，{results.length} 篇候选里选了 {selected.length}{" "}
        篇进入上下文——按返回顺序取前 K（无重排器，如实记录），其余因上下文预算未采用。
      </p>
      <ul className="mt-3 space-y-2">
        {results.map((r, i) =>
          picked.has(i) ? (
            <li
              key={i}
              className="rounded-md border border-obs-line bg-obs px-3 py-2"
            >
              <p className="flex items-baseline gap-2 text-[13px] text-obs-ink">
                <span className="rounded bg-emerald-500/20 px-1.5 text-[11px] text-emerald-200">
                  已引用
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline-offset-2 hover:underline"
                >
                  {r.title}
                </a>
              </p>
              {r.snippet && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-obs-ink2/85">
                  {r.snippet}
                </p>
              )}
            </li>
          ) : (
            <li
              key={i}
              className="rounded-md border border-dashed border-obs-line/60 bg-obs/30 px-3 py-2 opacity-70"
            >
              <p className="flex items-baseline gap-2 text-[13px] text-obs-ink2">
                <span className="rounded border border-dashed border-measure-300/50 px-1.5 text-[11px] text-measure-200/80">
                  未采用
                </span>
                <span className="truncate">{r.title}</span>
                <span className="shrink-0 text-[11px] text-obs-ink2/60">
                  上下文预算
                </span>
              </p>
            </li>
          ),
        )}
      </ul>
      <p className="mt-2 text-[11px] text-obs-ink2/60 select-none">
        候选与选用记录来自本次真实检索（trace.extensions.retrieval）；无各路得分是因为没有重排器——不估分、不虚构
      </p>
    </section>
  );
}
