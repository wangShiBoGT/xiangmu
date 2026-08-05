/** 没走的路（Sprint 8）：在最犹豫的几步长出幽灵岔口。
 *  静态层只展示 trace 中真实记录的落选候选与概率（不编「那条路会写出什么」）；
 *  动态层「试跑那个宇宙」仅在传入 onTryFork（有模型可续跑）时出现，
 *  点击用同一模型从该步强制改选后真实续跑——没有能力时按钮诚实缺席。 */

import { useMemo } from "react";
import { computeCloseSteps } from "../lib/closeSteps";
import type { TokenStep } from "../lib/trace";

const MAX_FORKS = 3;

export default function RoadsNotTaken({
  steps,
  onJump,
  onTryFork,
}: {
  steps: TokenStep[];
  /** 跳到该步查看 */
  onJump: (index: number) => void;
  /** 从该步强制改选并真实续跑（无模型时不传，按钮缺席） */
  onTryFork?: (index: number, candId: number, candText: string) => void;
}) {
  const forks = useMemo(
    () => computeCloseSteps(steps).slice(0, MAX_FORKS),
    [steps],
  );
  if (forks.length === 0) return null;
  const t = (s: string) => s.trim() || "␣";
  const ctx = (i: number) =>
    steps
      .slice(Math.max(0, i - 4), i)
      .map((s) => s.text)
      .join("");
  return (
    <section className="mt-6 rounded-md border border-obs-line bg-obs-2/85 px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-[0.2em] text-emerald-300/90 select-none">
        没走的路 · 差点变成另一个答案的岔口
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-obs-ink2 select-none">
        下面是本次记录里前两名概率最接近的 {forks.length} 步——虚线是真实落选的候选，
        没有人知道那条路会写出什么{onTryFork ? "，但可以让同一个模型真的走一遍" : ""}。
      </p>
      <ul className="mt-3 space-y-3">
        {forks.map((f) => (
          <li key={f.index} className="rounded-md border border-obs-line/70 bg-obs/40 px-3 py-2.5">
            <button
              className="flex w-full flex-wrap items-baseline gap-x-1.5 text-left font-mono text-[13px] leading-relaxed"
              title={`跳到第 ${f.index + 1} 步`}
              onClick={() => onJump(f.index)}
            >
              <span className="text-obs-ink2/70">…{ctx(f.index)}</span>
              <span className="rounded-md bg-emerald-500/20 px-1.5 text-emerald-100">
                {t(f.a)}
              </span>
              <span className="text-[11px] tabular-nums text-emerald-300/80">
                {(f.ap * 100).toFixed(1)}% · 走了这条
              </span>
            </button>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 pl-4 font-mono text-[13px]">
              <span aria-hidden className="text-obs-ink2/50">⌐</span>
              <span className="rounded-md border border-dashed border-measure-300/50 px-1.5 text-measure-200/80">
                {t(f.b)}
              </span>
              <span className="text-[11px] tabular-nums text-measure-300/70">
                {(f.bp * 100).toFixed(1)}% · 差 {(f.gap * 100).toFixed(2)}% 落选
              </span>
              {onTryFork && (
                <button
                  className="ml-2 rounded-md border border-obs-line bg-obs/70 px-2.5 py-0.5 text-[11px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                  onClick={() => {
                    const cand = steps[f.index]?.topk[1];
                    if (cand) onTryFork(f.index, cand.id, cand.text);
                  }}
                >
                  试跑那个宇宙 →（模拟续跑 · 非本次记录）
                </button>
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-obs-ink2/60 select-none">
        候选与概率来自 trace 真实记录（steps[].topk）；落选路径的后续文字未被记录，这里不虚构
      </p>
    </section>
  );
}
