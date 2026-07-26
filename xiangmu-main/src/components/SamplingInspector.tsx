/** Sampling Inspector：标准、可核验的单步采样检查器。
 *  只展示 trace 中真实记录的字段，并写明统计口径：
 *  - 候选概率为全量 softmax 后的 P(vocab)（top-k 截断记录，总质量 = top-k mass）；
 *  - H(top-k, conditional) 为截断分布重新归一化后的条件熵，不冒充全词表熵；
 *  - steps[].entropy 才是记录时计算的全量 softmax 熵。
 *  没有记录 raw logits，就不显示 logit 列。 */

import { useState } from "react";
import type { TokenStep } from "../lib/trace";
import DeepMicroscope from "./DeepMicroscope";
import ProbabilityStrip from "./ProbabilityStrip";
import Provenance from "./Provenance";

function conditionalEntropy(step: TokenStep): { h: number; mass: number } {
  let mass = 0;
  for (const c of step.topk) mass += c.prob;
  if (mass <= 0) return { h: 0, mass: 0 };
  let h = 0;
  for (const c of step.topk) {
    const p = c.prob / mass;
    if (p > 0) h -= p * Math.log(p);
  }
  return { h, mass };
}

export default function SamplingInspector({
  step,
  stepIndex,
  total,
  params,
  seed,
  onInspect,
  onClose,
}: {
  step: TokenStep;
  /** 0-based 步序号 */
  stepIndex: number;
  total: number;
  params?: { temperature: number; topP: number } | null;
  seed?: number | null;
  /** 打开该步完整出生档案（可选） */
  onInspect?: () => void;
  onClose?: () => void;
}) {
  const [provOpen, setProvOpen] = useState(false);
  const { h, mass } = conditionalEntropy(step);
  const rank = step.topk.findIndex((c) => c.id === step.id);
  const maxProb = step.topk[0]?.prob ?? 1;
  return (
    <section className="rounded-md border border-obs-line bg-obs-2/95 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium tracking-[0.18em] text-obs-ink2/70 select-none">
          这一刻的选择 · <span className="uppercase">Sampling Inspector</span>
        </p>
        <span className="flex items-center gap-2">
          <p className="text-[11px] tabular-nums text-obs-ink2">
            step {stepIndex + 1} / {total}
          </p>
          {onClose && (
            <button
              aria-label="收起检查器"
              className="text-[13px] leading-none text-obs-ink2/60 transition-colors hover:text-obs-ink"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </span>
      </div>

      {/* selected：当前 token 大字居首，与 3D 视觉焦点同步 */}
      <p className="mt-2.5 text-[13px] leading-relaxed text-obs-ink">
        <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[16px] leading-snug text-indigo-100">
          {step.text.trim() || "␣"}
        </span>
        <span className="ml-2 tabular-nums text-obs-ink2">
          token_id {step.id}
          {rank >= 0 ? ` · rank ${rank + 1}` : ""}
        </span>
      </p>
      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-obs-ink2">
        P = {step.prob.toFixed(4)}
        {step.dt > 0 ? ` · decode ${step.dt.toFixed(1)} ms` : ""}
      </p>

      {/* sampling pipeline */}
      {params && (
        <p className="mt-2.5 break-all font-mono text-[11px] leading-relaxed text-obs-ink2/80">
          softmax → T {params.temperature} → top-p {params.topP}
          {seed !== null && seed !== undefined ? ` → RNG(seed ${seed})` : " → RNG"}
          {" → "}
          <span className="text-indigo-300">selected</span>
        </p>
      )}

      {/* candidate distribution：玻璃概率地层（横=概率，行=rank，可直接读数） */}
      <div className="mt-3 space-y-[6px]">
        {step.topk.map((c, i) => {
          const chosen = c.id === step.id;
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span
                className={`w-3.5 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                  chosen ? "text-indigo-300" : "text-obs-ink2/50"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`w-[64px] shrink-0 truncate font-mono text-[12px] ${
                  chosen ? "text-obs-ink" : "text-obs-ink2"
                }`}
              >
                {c.text.trim() || "␣"}
              </span>
              <ProbabilityStrip
                value={c.prob}
                max={maxProb}
                tone={chosen ? "measure" : "neutral"}
                showValue
              />
            </div>
          );
        })}
      </div>
      <p className="mt-2 border-t border-obs-line/60 pt-2 text-[11px] text-obs-ink2/60 select-none">
        来源 · 本机 trace · Top-{step.topk.length} 截断记录 · P 为 P(vocab)
      </p>

      {/* 读数卡（视觉稿定调）：候选质量 / 分布熵，大字可读 */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-obs-line/70 px-3 py-2.5">
          <p className="text-[11px] text-obs-ink2/70 select-none">候选质量</p>
          <p className="mt-0.5 font-mono text-[16px] leading-none tabular-nums text-obs-ink">
            {mass.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-obs-ink2/60 select-none">Top-K mass</p>
        </div>
        <div className="rounded-md border border-obs-line/70 px-3 py-2.5">
          <p className="text-[11px] text-obs-ink2/70 select-none">分布熵</p>
          <p className="mt-0.5 font-mono text-[16px] leading-none tabular-nums text-obs-ink">
            {step.entropy.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-obs-ink2/60 select-none">nats（全量 softmax）</p>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-obs-ink2/60 select-none">
        尾部未记录质量 {Math.max(0, 1 - mass).toFixed(3)}；截断分布条件熵 H(top-k) ={" "}
        {h.toFixed(2)} nats
      </p>

      {/* E5a 采样显微镜：仅当该步开启深度采集时存在 */}
      {step.deep && (
        <DeepMicroscope
          deep={step.deep}
          topP={params?.topP ?? 1}
          selectedId={step.id}
        />
      )}

      {/* 下一步可以看什么（视觉稿定调）：把下钻路径说成人话，不另造入口 */}
      <div className="mt-2.5 rounded-md border border-obs-line/70 bg-obs/50 px-3 py-2">
        <p className="text-[11px] font-medium text-obs-ink select-none">
          下一步可以看什么？
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-obs-ink2/80 select-none">
          打开该步原始记录看完整出生档案，或到整段回答中找候选更接近的另一处。
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        {onInspect ? (
          <button
            className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
            onClick={onInspect}
          >
            查看该步原始记录
          </button>
        ) : (
          <span />
        )}
        <button
          className="text-[11px] text-obs-ink2/60 transition-colors hover:text-obs-ink"
          onClick={() => setProvOpen((v) => !v)}
        >
          来源 {provOpen ? "▾" : "▸"}
        </button>
      </div>
      {provOpen && (
        <div className="mt-1.5">
          <Provenance
            info={{
              field: `steps[${stepIndex}].topk · params.temperature / topP · steps[${stepIndex}].dt`,
              method: "本机推理逐步记录：全量 softmax 后截取 top-k 候选与概率",
              level: "原始测量",
              boundary: "top-k 之外的长尾候选未记录（见 tail mass）；不代表模型意图或因果",
            }}
          />
        </div>
      )}
    </section>
  );
}
