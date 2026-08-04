/** 语义层（Sentence Layer）：正在被写出来的那句话。
 *  3D 表达数据，这条带子表达语言——每个 token 逐词浮现、当前词高亮放大，
 *  让观众把「一根柱子」映射到「AI 刚写下的那个词」。全部文本来自真实 trace。
 *  双向 Trace：点击任意已揭示的词，3D 柱子与 Inspector 反向同步到那一步。 */

import { useEffect, useRef } from "react";
import { specialTokenLabel, type TokenStep } from "../lib/trace";

export default function SentenceRibbon({
  steps,
  upto,
  current,
  onSelect,
}: {
  steps: TokenStep[];
  /** 已到达的最新步（含），之后的 token 尚未揭示 */
  upto: number;
  /** 视觉焦点步（点选或最新） */
  current: number;
  /** 反向聚焦：点击词 → 跳到对应步 */
  onSelect?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>("[data-current]");
    if (target) {
      el.scrollTo({
        left: target.offsetLeft - el.clientWidth * 0.7,
        behavior: "smooth",
      });
    }
  }, [upto, current]);
  const n = Math.min(upto + 1, steps.length);
  if (n <= 0) return null;
  return (
    <div
      ref={ref}
      className="sentence-ribbon pointer-events-auto mx-auto max-w-[min(640px,88%)] overflow-x-auto whitespace-nowrap rounded-md border-2 border-border bg-bg-float px-3 py-1.5 text-center shadow-[var(--shadow-tooltip)] [scrollbar-width:none]"
    >
      {steps.slice(0, n).map((s, i) => {
        const sp = specialTokenLabel(s.text);
        const isCur = i === current;
        if (sp) {
          return (
            <span
              key={i}
              data-current={isCur || undefined}
              className={`mx-1 inline-block rounded border border-obs-line/60 px-1 align-middle text-[11px] tracking-wide ${
                isCur ? "text-obs-ink" : "text-obs-ink2/50"
              } ${onSelect ? "cursor-pointer" : ""}`}
              onClick={onSelect ? () => onSelect(i) : undefined}
            >
              {sp}
            </span>
          );
        }
        return (
          <span
            key={i}
            data-current={isCur || undefined}
            className={`${
              isCur
                ? "mx-0.5 inline-block rounded bg-indigo-500/25 px-1 text-[16px] font-medium text-indigo-100"
                : "text-[13px] text-obs-ink2/85"
            } ${onSelect ? "cursor-pointer hover:text-obs-ink" : ""}`}
            onClick={onSelect ? () => onSelect(i) : undefined}
          >
            {s.text}
          </span>
        );
      })}
      <span className="ml-1 inline-block h-[14px] w-[2px] bg-indigo-300/80 align-middle" />
    </div>
  );
}
