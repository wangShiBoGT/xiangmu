/** 思考字幕（Sprint 6）：底部电影字幕条，实时翻译「它此刻在做的事」。
 *  文案与元数据全部由 lib/thinkingCaption 按字段模板生成，无依据措辞不出现。 */

import { thinkingCaption } from "../lib/thinkingCaption";
import type { TokenStep } from "../lib/trace";

export default function ThinkingCaption({
  steps,
  index,
  temperature,
}: {
  steps: TokenStep[];
  index: number;
  temperature: number;
}) {
  const c = thinkingCaption(steps, index, temperature);
  if (!c) return null;
  return (
    <div className="pointer-events-none flex flex-col items-center gap-0.5 select-none">
      <p className="text-[11px] font-medium tracking-[0.22em] text-emerald-300/90">
        思考字幕 · LIVE
      </p>
      <p className="max-w-[min(560px,88vw)] rounded-md border border-obs-line bg-obs-2/85 px-4 py-1.5 text-center text-[13px] leading-relaxed text-obs-ink">
        {c.text}
      </p>
      <p className="font-mono text-[11px] tabular-nums tracking-wide text-obs-ink2/70">
        step {c.meta.step} · 熵 {c.meta.entropy.toFixed(2)} nats
        {c.meta.gap !== null
          ? ` · top-2 差距 ${(c.meta.gap * 100).toFixed(1)}%`
          : ""}
      </p>
    </div>
  );
}
