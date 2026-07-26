import { useEffect, useState } from "react";
import { IconClose } from "./icons";
import { explainStep } from "../lib/trace";
import ProbabilityStrip from "./ProbabilityStrip";
import Provenance from "./Provenance";
import type { RuleMatch } from "../lib/rules";
import type { DisplayStep } from "./TokenText";

/** 出生档案：一步生成已记录的候选分布、采样结果与运行条件。
 *  它是产品化的记录卡，不承担对模型心智的解释职责。
 *  点击落选候选词可从该分岔点改选、真实重写全部后文。 */
export default function BirthCard({
  step,
  index,
  temperature,
  canFork,
  matches,
  onFork,
  onClose,
}: {
  step: DisplayStep;
  index: number;
  temperature: number;
  /** 分岔树满 8 节点后禁止再分岔 */
  canFork: boolean;
  /** 命中该 token 的规则标注（规则 ID/阈值/实际值） */
  matches?: RuleMatch[];
  onFork: (candidateId: number, candidateText: string) => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [showHow, setShowHow] = useState(false);
  const maxProb = step.topk[0]?.prob ?? 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="ovl-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="birth-card"
      onClick={onClose}
    >
      <div
        className="ovl-pop flex max-h-[70vh] w-full max-w-md flex-col overflow-y-auto rounded-md bg-obs-2 border border-obs-line p-6 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              第 {index + 1} 个 token · 出生档案
            </p>
            <p className="mt-1 font-mono text-[16px] text-obs-ink">
              「{step.text}」
              <span className="ml-2 text-[13px] text-obs-ink2">
                {(step.prob * 100).toFixed(1)}% · 熵 {step.entropy.toFixed(2)}
              </span>
            </p>
          </div>
          <button
            aria-label="关闭出生卡"
            className="rounded-md px-2 py-1 text-obs-ink2 hover:text-obs-ink"
            onClick={onClose}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-obs-ink2">
          {explainStep(step, temperature)}
        </p>
        <div className="mt-2">
          <Provenance
            info={{
              field: `steps[${index}].topk / .prob / .entropy`,
              method: "采样前全量 softmax 分布的 top-k 截断记录，本机实测",
              level: "原始测量",
              boundary: "不代表模型的主观状态、意图或因果推理",
            }}
          />
        </div>

        {matches && matches.length > 0 && (
          <div className="mt-3 space-y-2">
            {matches.map((m, i) => (
              <div
                key={`${m.ruleId}-${i}`}
                className="rounded-md border border-obs-line bg-obs-wash/50 px-3 py-2"
              >
                <p className="text-[13px] text-obs-ink">
                  <span
                    className={
                      m.severity === "warn" ? "text-amber-300" : "text-obs-ink2"
                    }
                  >
                    {m.label}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-obs-ink2">
                    {m.ruleId}
                  </span>
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-obs-ink2">
                  {m.explain}
                </p>
                <p className="mt-1 font-mono text-[11px] text-obs-ink2/80">
                  {m.values
                    .map(
                      (v) =>
                        `${v.field} ${v.op} ${v.threshold}（实际 ${
                          Number.isInteger(v.actual)
                            ? v.actual
                            : v.actual.toFixed(v.actual < 0.1 ? 3 : 2)
                        }）`,
                    )
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          {step.topk.map((c) => {
            const isChosen = c.id === step.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={isChosen || !canFork}
                className={`group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
                  isChosen
                    ? "bg-obs-wash cursor-default"
                    : canFork
                      ? "hover:bg-obs-wash cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                }`}
                title={
                  isChosen
                    ? "本次被选中的词"
                    : canFork
                      ? `从这里改选「${c.text}」，重写后文`
                      : "分岔树已满（最多 8 个分支节点）"
                }
                onClick={() =>
                  !isChosen && canFork && setConfirm({ id: c.id, text: c.text })
                }
              >
                <span className="w-24 shrink-0 truncate font-mono text-[13px] text-obs-ink">
                  {c.text || "␣"}
                </span>
                <ProbabilityStrip
                  value={c.prob}
                  max={maxProb}
                  tone={isChosen ? "measure" : "neutral"}
                  showValue
                />
              </button>
            );
          })}
        </div>

        {confirm && (
          <div className="mt-4 flex items-center justify-between rounded-md bg-obs-wash px-3 py-2.5">
            <p className="text-[13px] text-obs-ink">
              从这里改选「{confirm.text}」，重写后文？
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-1 text-[13px] text-obs-ink2 hover:text-obs-ink"
                onClick={() => setConfirm(null)}
              >
                取消
              </button>
              <button
                className="rounded-md bg-indigo-500 px-3 py-1 text-[13px] text-white hover:opacity-85"
                data-testid="fork-confirm"
                onClick={() => {
                  onFork(confirm.id, confirm.text);
                  setConfirm(null);
                }}
              >
                重写
              </button>
            </div>
          </div>
        )}

        <button
          className="mt-4 text-[12px] text-obs-ink2 underline underline-offset-2 hover:text-obs-ink"
          onClick={() => setShowHow((v) => !v)}
        >
          这是怎么算的？
        </button>
        {showHow && (
          <p className="mt-2 text-[12px] leading-relaxed text-obs-ink2">
            概率 = 该步 logits 经过重复惩罚、温度、Top-P
            处理后做全量 softmax 得到的真实采样分布（softmax 之后、抽签之前）。
            熵 = 该分布的信息熵（nats），越大表示已记录候选分布越分散；它是描述统计，不代表模型的主观状态。改选候选词后，
            该位置之前的内容原样保留、强制换词，后文由模型真实重新推理生成。
          </p>
        )}
      </div>
    </div>
  );
}
