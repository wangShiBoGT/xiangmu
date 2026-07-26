import { useMemo } from "react";
import type { TokenStep } from "../lib/trace";
import { computeCloseSteps, formatGap } from "../lib/closeSteps";
import { EVIDENCE_LABEL, type WorkflowStage } from "../lib/workflowStages";
import ProbabilityStrip from "./ProbabilityStrip";

/** Decision 卡（Explain 层）：回答「这一段它为什么这样做」。
 *  三个区块全部来自真实记录：做了什么（阶段证据）、有哪些选择（该段最胶着一步的
 *  真实 top-k）、为什么放弃（只有概率差可查时如实给差值，reason 无记录就写未记录）。 */
export default function DecisionCard({
  stage,
  steps,
  onJump,
  onTryFork,
  onClose,
}: {
  stage: WorkflowStage;
  steps: TokenStep[];
  onJump: (index: number) => void;
  onTryFork?: (index: number, candId: number, candText: string) => void;
  onClose: () => void;
}) {
  const from = stage.fromStep ?? 0;
  const to = Math.min(stage.toStep ?? steps.length - 1, steps.length - 1);

  // 该段最关键的一步：优先最胶着（top-2 差最小），其次熵最高
  const keyIndex = useMemo(() => {
    const seg = steps.slice(from, to + 1);
    if (seg.length === 0) return null;
    const close = computeCloseSteps(seg);
    if (close.length > 0) return from + close[0].index;
    let best = 0;
    for (let i = 1; i < seg.length; i++)
      if (seg[i].entropy > seg[best].entropy) best = i;
    return from + best;
  }, [steps, from, to]);

  const key = keyIndex !== null ? steps[keyIndex] : null;
  const gap =
    key && key.topk.length >= 2 ? key.topk[0].prob - key.topk[1].prob : null;

  return (
    <div className="rounded-md border border-obs-line bg-obs-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
            Decision · 这一段发生了什么
          </p>
          <p className="mt-1 text-[14px] font-medium text-obs-ink">
            {stage.label}
            <span className="ml-2 rounded-md border border-obs-line px-2 py-px text-[11px] font-normal text-obs-ink2/70">
              {EVIDENCE_LABEL[stage.evidence]}
            </span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-obs-ink2">
            第 {from + 1}–{to + 1} 步{stage.detail ? ` · ${stage.detail}` : ""}
          </p>
        </div>
        <button
          aria-label="收起"
          className="rounded-md px-2 py-0.5 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {key && keyIndex !== null && (
        <div className="mt-3 rounded-md border border-obs-line/70 bg-obs/60 p-3">
          <p className="text-[12px] text-obs-ink2">
            该段最关键的一步（第 {keyIndex + 1} 步）——
            {gap !== null && gap < 0.05
              ? `前两名概率差${formatGap(gap)}，这是一次真实的胶着选择`
              : "该步候选分布如下"}
            ：
          </p>
          <ul className="mt-2 space-y-1">
            {key.topk.slice(0, 4).map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-2 font-mono text-[12px] tabular-nums"
              >
                <span
                  className={`w-24 truncate ${i === 0 ? "text-obs-ink" : "text-obs-ink2"}`}
                >
                  {JSON.stringify(c.text).slice(1, -1) || "␣"}
                </span>
                <ProbabilityStrip
                  value={c.prob}
                  tone={i === 0 ? "measure" : "neutral"}
                  showValue
                />
                {i === 0 && (
                  <span className="text-[11px] text-emerald-400/90">选中</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-obs-ink2/80">
            为什么放弃其余候选：无决策理由记录；可查的事实是采样在温度{" "}
            与 seed 固定下按上述概率抽中了第一名。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs"
              onClick={() => onJump(keyIndex)}
            >
              看这一步的 token 级证据 →
            </button>
            {onTryFork && key.topk.length >= 2 && (
              <button
                className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink2 transition-colors hover:bg-obs hover:text-obs-ink"
                onClick={() =>
                  onTryFork(keyIndex, key.topk[1].id, key.topk[1].text)
                }
              >
                改选第二名真实续跑（模拟续跑 · 非本次记录）→
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
