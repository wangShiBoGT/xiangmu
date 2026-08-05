/** 关键时刻 · Moments（Questions IA · P31 / ACDL Sprint 2+3）：左栏把生成翻译成
 *  读者自然会问的问题（为什么写这个？为什么没写那个？为什么这么慢？）。
 *  数据链 Trace → Moment Engine（lib/moments）→ Story Engine（lib/story）→ 本组件；
 *  点击跳转该步；展开先看概率形状（Pattern），再读一句人话（Story），
 *  证据口径最后（P27：Evidence→Pattern→Meaning→Explanation，禁倒序）。 */

import { useMemo, useState } from "react";
import { stepMoments, type StepMoment } from "../lib/moments";
import { storiesFrom } from "../lib/story";
import type { TokenStep } from "../lib/trace";
import ProbabilityStrip from "./ProbabilityStrip";

const DOT: Record<string, string> = {
  coinflip: "bg-measure-300",
  temp_override: "bg-measure-300",
  scattered: "bg-amber-300",
  slow: "bg-rose-300",
};

const t = (s: string) => s.trim() || "␣";

/** 读者层问题（P31）：入口是用户读正文时自然产生的疑问，点开即证据 */
function questionOf(m: StepMoment): string {
  switch (m.kind) {
    case "coinflip":
      return `为什么它写「${m.winner}」而不是「${m.loser}」？`;
    case "temp_override":
      return `为什么它没写第一名「${m.rank1}」？`;
    case "scattered":
      return `为什么这一步候选特别散？`;
    case "slow":
      return `为什么「${m.token}」这一步写得特别慢？`;
  }
}

/** Pattern 层：该步 top 候选的真实概率条（选中亮、落选暗），先看形状再读数 */
function CandidateBars({ step }: { step: TokenStep }) {
  const top = step.topk.slice(0, 4);
  const max = top[0]?.prob ?? 1;
  if (top.length === 0) return null;
  return (
    <div className="space-y-0.5" aria-label="候选概率形状">
      {top.map((c) => {
        const sel = c.id === step.id;
        return (
          <div key={c.id} className="flex items-center gap-1.5">
            <span
              className={`w-[4.5em] shrink-0 truncate text-[11px] ${
                sel ? "text-obs-ink" : "text-obs-ink2/70"
              }`}
            >
              「{t(c.text)}」
            </span>
            <ProbabilityStrip
              value={c.prob}
              max={max}
              tone={sel ? "measure" : "neutral"}
              showValue
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ActivityLog({
  steps,
  upto,
  current,
  temperature,
  onJump,
}: {
  steps: TokenStep[];
  /** 只显示已发生的时刻（index ≤ upto） */
  upto: number;
  current: number | null;
  temperature?: number;
  onJump: (index: number) => void;
}) {
  const moments = useMemo(
    () => stepMoments(steps, { temperature }),
    [steps, temperature],
  );
  const stories = useMemo(() => storiesFrom(moments), [moments]);
  const [open, setOpen] = useState<number | null>(null);
  const seen = moments
    .map((m, ref) => ({ moment: m, story: stories[ref] }))
    .filter((x) => x.moment.index <= upto);
  if (seen.length === 0) return null;
  return (
    <nav
      aria-label="关键时刻"
      className="rounded-md border-2 border-obs-line bg-obs-2 px-3 py-2.5 shadow-float"
    >
      <p className="text-[11px] font-medium tracking-[0.18em] text-obs-ink2/70 select-none">
        关键时刻 · 点开看证据
      </p>
      <ol className="mt-1.5 space-y-1">
        {seen.map(({ moment: e, story }) => {
          const key = `${e.kind}-${e.index}`;
          const expanded = open === e.index;
          const step = steps[e.index];
          return (
            <li key={key}>
              <button
                className={`flex w-full items-baseline gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-snug transition-colors hover:bg-obs/60 ${
                  current === e.index ? "text-obs-ink" : "text-obs-ink2"
                }`}
                aria-expanded={expanded}
                onClick={() => {
                  onJump(e.index);
                  setOpen((prev) => (prev === e.index ? null : e.index));
                }}
              >
                <span
                  aria-hidden
                  className={`mt-1 h-1.5 w-1.5 shrink-0 self-start rounded-full ${DOT[e.kind]}`}
                />
                <span className="min-w-0">
                  <span className="tabular-nums text-obs-ink2/70">
                    第 {e.index + 1} 步
                  </span>{" "}
                  {step ? questionOf(e) : story.text}
                </span>
              </button>
              {expanded && step && (
                <div className="ml-4 mt-0.5 space-y-1.5 rounded-md bg-obs/50 px-2 py-1.5 text-[11px] text-obs-ink2">
                  {/* 1. Pattern：先看概率形状（遮住数字也能看出差距大小） */}
                  <CandidateBars step={step} />
                  {/* 2. Story：一句人话（Story Engine 确定性模板 + 真实字段填空） */}
                  <p className="leading-relaxed text-obs-ink/90">{story.text}</p>
                  {/* 3. Explanation：证据口径，最后置底 */}
                  {story.meaning && (
                    <p className="text-obs-ink2/60">{story.meaning}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
