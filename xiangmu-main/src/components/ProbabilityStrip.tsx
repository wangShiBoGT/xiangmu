/** Probability Strip（VISUAL_PATTERN_LIBRARY #1）：概率的全站唯一画法。
 *  水平细条 + 右对齐等宽百分数：长度 ∝ 概率，选中/当前=measure，其余中性；
 *  caution/alert 仅用于高不确定与越界语义。任何页面出现第二种概率画法即为 bug。 */

export type StripTone = "measure" | "caution" | "alert" | "neutral";

const FILL: Record<StripTone, string> = {
  measure: "bg-indigo-400",
  caution: "bg-amber-400/80",
  alert: "bg-red-400/80",
  neutral: "bg-obs-ink2/30",
};

/** 统一读数格式（PRODUCT_IDENTITY 坚持 #4）：百分数保留 2 位小数 */
export function formatProb(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

export default function ProbabilityStrip({
  value,
  max = 1,
  tone = "neutral",
  showValue = false,
  className = "",
}: {
  /** 概率值 0..1 */
  value: number;
  /** 归一化上限（如同组候选的最大概率），条长 = value/max */
  max?: number;
  tone?: StripTone;
  /** 是否在条右侧显示等宽百分数 */
  showValue?: boolean;
  className?: string;
}) {
  const width = Math.max((value / Math.max(max, 1e-9)) * 100, 1.5);
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 ${className}`}>
      <span className="relative h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-obs-line/30">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ${FILL[tone]}`}
          style={{ width: `${width}%` }}
        />
      </span>
      {showValue && (
        <span
          className={`w-[58px] shrink-0 text-right font-mono text-[11px] tabular-nums ${
            tone === "measure" ? "text-obs-ink" : "text-obs-ink2/80"
          }`}
        >
          {formatProb(value)}
        </span>
      )}
    </span>
  );
}
