/** 此刻卡（Sprint 5）：浮在概率柱区上方的玻璃卡，把当前步翻译成三行人话——
 *  确定度 / 候选关系 / 节奏。每行读数都来自真实 trace 字段（见 lib/momentCard）。 */

import { momentReadout } from "../lib/momentCard";
import type { TokenStep } from "../lib/trace";

export default function MomentCard({
  steps,
  index,
}: {
  steps: TokenStep[];
  index: number;
}) {
  const r = momentReadout(steps, index);
  if (!r) return null;
  return (
    <section className="rounded-md border-2 border-border bg-bg-float px-4 py-3 shadow-[var(--shadow-tooltip)] select-none">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-obs-ink">此刻</p>
        <span className="text-[11px] tabular-nums tracking-wide text-obs-ink2/70">
          step {index + 1}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed">
        <p className="flex items-center gap-2">
          <span className="w-[3.5em] shrink-0 text-obs-ink2/80">确定度</span>
          <span className="flex gap-0.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-2 w-3 rounded-[2px] ${
                  i < r.certainty.bars ? "bg-amber-300/90" : "bg-obs-ink2/20"
                }`}
              />
            ))}
          </span>
          <span className="text-obs-ink">
            {r.certainty.level}
            <span className="ml-1.5 tabular-nums text-obs-ink2">
              {r.certainty.pct}
            </span>
          </span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="w-[3.5em] shrink-0 text-obs-ink2/80">候选</span>
          <span className="text-obs-ink">
            {r.candidates.count} 个 · {r.candidates.relation}
          </span>
        </p>
        {r.pace && (
          <p className="flex items-baseline gap-2">
            <span className="w-[3.5em] shrink-0 text-obs-ink2/80">节奏</span>
            <span className="text-obs-ink">{r.pace.text}</span>
          </p>
        )}
      </div>
      <p className="mt-2 border-t border-obs-line/60 pt-1.5 text-[11px] text-obs-ink2/60">
        由真实概率、耗时换算 · 点选任一根柱子看完整档案
      </p>
    </section>
  );
}
