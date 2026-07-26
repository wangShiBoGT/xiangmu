/** 思路地图（Sprint 7）：Replay 结束后的收束视图——横向站点发光线。
 *  分段与站名来自 lib/thoughtMap（真实 <think> 边界 + 熵拐点），
 *  底部 token 色条宽度与各站步数严格成比例；点站回放该段。
 *  trace 无思考段边界时整个组件缺席。 */

import { useMemo } from "react";
import { buildThoughtMap } from "../lib/thoughtMap";
import type { TokenStep } from "../lib/trace";

const PHASE_COLOR: Record<string, string> = {
  think: "bg-indigo-400/70",
  answer: "bg-emerald-400/70",
};

export default function ThoughtMap({
  steps,
  onReplaySegment,
}: {
  steps: TokenStep[];
  /** 点站回放：跳到该站起点 */
  onReplaySegment: (start: number) => void;
}) {
  const map = useMemo(() => buildThoughtMap(steps), [steps]);
  if (!map) return null;
  const total = steps.length;
  const maxEnt = Math.max(...map.stations.map((s) => s.meanEntropy));
  return (
    <section className="rounded-md border border-obs-line bg-obs-2/85 px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-[0.2em] text-emerald-300/90 select-none">
        思路地图 · 这次它是怎么想过来的
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-obs-ink select-none">
        {map.headline}
      </p>
      <div className="mt-3 flex items-stretch gap-1.5">
        {map.stations.map((s) => (
          <button
            key={s.start}
            className="group min-w-0 rounded-md border border-obs-line bg-obs/50 px-2.5 py-2 text-left transition-colors hover:border-obs-ink2/50"
            style={{ flexGrow: s.end - s.start + 1 }}
            title={`回放第 ${s.start + 1}–${s.end + 1} 步`}
            onClick={() => onReplaySegment(s.start)}
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  s.meanEntropy === maxEnt ? "bg-amber-300" : "bg-emerald-400/80"
                }`}
              />
              <span className="truncate text-[12px] text-obs-ink">
                {s.label}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-obs-ink2/80">
              「{s.excerpt}…」
            </span>
            <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-obs-ink2/60">
              第 {s.start + 1}–{s.end + 1} 步 · 均熵 {s.meanEntropy.toFixed(2)}
            </span>
          </button>
        ))}
      </div>
      {/* token 色条：宽度与站步数严格成比例，紫=思考段 绿=正文段 */}
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
        {map.stations.map((s) => (
          <span
            key={s.start}
            className={PHASE_COLOR[s.phase]}
            style={{ width: `${(((s.end - s.start + 1) / total) * 100).toFixed(2)}%` }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-obs-ink2/60 select-none">
        分段依据：真实 &lt;think&gt; 边界 + 熵拐点；站名锚定测量事实 · 点任一站回放该段
      </p>
    </section>
  );
}
