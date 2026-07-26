/** 采样显微镜（E5a）：只在该步记录了深度快照（采样前 top-256 logits）时出现。
 *  一切数值由快照纯函数重算，不触发任何推理；本运行时不暴露 attention，
 *  这里没有也不假装有注意力视图。 */

import { useState } from "react";
import {
  counterfactualProbs,
  topPBoundary,
  type DeepCapture,
} from "../lib/microscope";
import ProbabilityStrip from "./ProbabilityStrip";

const SHOW = 14;

export default function DeepMicroscope({
  deep,
  topP,
  selectedId,
}: {
  deep: DeepCapture;
  /** 该次运行记录的 top-p 参数（用于标出边界） */
  topP: number;
  selectedId: number;
}) {
  const [t, setT] = useState(deep.temperature > 0 ? deep.temperature : 1);
  const probs = counterfactualProbs(deep, t);
  const boundary = topPBoundary(probs.map((p) => p.p), topP);
  const covered = Math.max(0, 1 - deep.restMass);
  const maxP = probs[0]?.p ?? 1;
  return (
    <div className="mt-3 rounded-md border border-obs-line/70 bg-obs/50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        Sampling Microscope · 采样显微镜
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-obs-ink2/80 select-none">
        反事实重算：同一 logits，不同温度
      </p>
      <label className="mt-1.5 flex items-center gap-2 text-[11px] text-obs-ink2">
        T
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.05}
          value={t}
          aria-label="反事实温度"
          className="flex-1 accent-indigo-400"
          onChange={(e) => setT(Number(e.target.value))}
        />
        <span className="w-9 text-right font-mono tabular-nums text-obs-ink">
          {t.toFixed(2)}
        </span>
        {t !== deep.temperature && (
          <button
            className="text-[11px] text-obs-ink2/70 underline underline-offset-2 hover:text-obs-ink"
            onClick={() => setT(deep.temperature > 0 ? deep.temperature : 1)}
          >
            回到实测 T{deep.temperature}
          </button>
        )}
      </label>
      <div className="mt-2 space-y-[5px]">
        {probs.slice(0, SHOW).map((c, i) => {
          const chosen = c.id === selectedId;
          const atBoundary = boundary > 0 && i === boundary - 1;
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-[56px] shrink-0 truncate font-mono text-[11px] text-obs-ink2">
                {c.text !== undefined ? c.text.trim() || "␣" : `#${c.id}`}
              </span>
              <ProbabilityStrip
                value={c.p}
                max={maxP}
                tone={chosen ? "measure" : "neutral"}
                showValue
              />
              {atBoundary && (
                <span className="shrink-0 text-[11px] text-amber-300/90 select-none">
                  ← top-p {topP} 边界
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-obs-ink2/60 select-none">
        {boundary === -1 && `top-p ${topP} 边界在截断外。`}
        {boundary > SHOW && `top-p ${topP} 边界在第 ${boundary} 位（列表外）。`}
        截断内重算：top-{deep.entries.length} 快照，覆盖原始概率质量{" "}
        {(covered * 100).toFixed(1)}%，截断外 {deep.restCount} 个候选合计{" "}
        {(deep.restMass * 100).toFixed(2)}%。
      </p>
    </div>
  );
}
