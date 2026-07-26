import { useState } from "react";
import type { DemoCloseStep, DemoStats } from "../lib/demoStats.generated";

/** 犹豫点证据切片（锚点 A3）：首屏与暂停帧共用。
 *  三根横条：前两名候选（几乎等长）+ 其余候选合计灰条——
 *  必须含灰条，不制造「二选一」错觉（P1 切片规则）。
 *  点击展开原始 top-k 与采样参数，右下提供原始数据入口（U3）。 */

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

function Bar({
  text,
  prob,
  accent,
  animate,
}: {
  text: string;
  prob: number;
  accent: boolean;
  animate: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr_64px] items-center gap-3">
      <span
        className={`truncate text-[13px] ${accent ? "text-obs-ink" : "text-obs-ink2"}`}
      >
        {text}
      </span>
      <span className="relative block h-[12px] overflow-hidden rounded-sm bg-white/[0.07]">
        <span
          className={`absolute inset-y-0 left-0 ${
            accent ? "bg-[#6D74E8]" : "bg-white/25"
          } ${animate ? "slice-bar-grow" : ""}`}
          style={{ width: `${Math.min(100, prob * 100)}%` }}
        />
      </span>
      <span className="text-right font-mono text-[12px] tabular-nums text-obs-ink2">
        {pct(prob)}
      </span>
    </div>
  );
}

export default function HesitationSlice({
  step,
  stats,
  animate = false,
  onViewRaw,
  onExpand,
}: {
  step: DemoCloseStep;
  /** 提供时展开区显示采样参数（seed/temperature/top-p） */
  stats?: Pick<DemoStats, "params" | "modelId" | "device">;
  /** 首屏唯一动效：两根等长条入场生长（600ms） */
  animate?: boolean;
  /** 原始数据入口（U3），由调用方决定去向 */
  onViewRaw?: () => void;
  /** 展开原始记录时回调（本机行为 trace 用） */
  onExpand?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="observe-dark w-full max-w-[520px] rounded-md border border-white/10 bg-[#101118] p-4">
      <p className="mb-3 flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        犹豫点 · 真实记录
        <span className="font-mono normal-case tracking-normal tabular-nums">
          第 {step.index + 1} 步
        </span>
      </p>
      <button
        type="button"
        className="block w-full space-y-2.5 text-left transition-opacity hover:opacity-90"
        onClick={() =>
          setOpen((o) => {
            if (!o) onExpand?.();
            return !o;
          })
        }
        aria-expanded={open}
      >
        <Bar text={step.a.text} prob={step.a.prob} accent animate={animate} />
        <Bar text={step.b.text} prob={step.b.prob} accent animate={animate} />
        <Bar
          text={`其余候选合计`}
          prob={step.restMass}
          accent={false}
          animate={false}
        />
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <p className="text-[11px] text-obs-ink2/80 select-none">
          前两名概率差 {pct(step.gap)} · 点击展开原始记录
        </p>
        {onViewRaw && (
          <button
            type="button"
            className="text-[11px] text-obs-ink2/60 underline decoration-dotted underline-offset-2 transition-colors hover:text-obs-ink"
            onClick={onViewRaw}
          >
            查看原始数据
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-md border border-obs-line bg-obs-2/95 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
            原始 Top-{step.topkCount} · P 为 P(vocab) · 全量 softmax 后截断记录
          </p>
          <div className="mt-1.5 space-y-0.5">
            {step.topk.map((t, i) => (
              <p
                key={i}
                className={`flex justify-between font-mono text-[11px] tabular-nums ${
                  i < 2 ? "text-obs-ink" : "text-obs-ink2/80"
                }`}
              >
                <span className="max-w-[70%] truncate">{t.text}</span>
                <span>{pct(t.prob)}</span>
              </p>
            ))}
            <p className="flex justify-between font-mono text-[11px] tabular-nums text-obs-ink2/60">
              <span>记录外尾部质量</span>
              <span>{pct(step.restMass - step.topk.slice(2).reduce((s, t) => s + t.prob, 0))}</span>
            </p>
          </div>
          {stats && (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-obs-ink2/70">
              seed {stats.params.seed} · T {stats.params.temperature} · top-p{" "}
              {stats.params.topP} · {stats.device}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
