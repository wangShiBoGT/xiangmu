import { Fragment } from "react";
import type { TokenStep } from "../lib/trace";
import { CONFIDENCE_CLASS, confidenceBucket } from "../lib/plainWords";

/** 按把握度着色的答案正文（亲和层统一视觉语言）。
 *  每个词的颜色只来自该步真实 prob；可选点击回调用于下钻该步候选。 */
export default function ConfidenceText({
  steps,
  from = 0,
  to,
  selected = null,
  onTokenClick,
  className = "",
}: {
  steps: TokenStep[];
  from?: number;
  to?: number;
  selected?: number | null;
  onTokenClick?: (index: number) => void;
  className?: string;
}) {
  const end = to ?? steps.length - 1;
  return (
    <span className={className}>
      {steps.slice(from, end + 1).map((s, i) => {
        const idx = from + i;
        const cls = CONFIDENCE_CLASS[confidenceBucket(s.prob)];
        const sel = selected === idx;
        const text = s.text.includes("\n") ? (
          s.text.split("\n").map((p, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {p}
            </Fragment>
          ))
        ) : (
          s.text
        );
        return onTokenClick ? (
          <button
            key={idx}
            type="button"
            className={`${cls} ${sel ? "rounded bg-obs-2 ring-1 ring-indigo-400/60" : "rounded hover:bg-obs-2/80"} cursor-pointer`}
            onClick={() => onTokenClick(idx)}
          >
            {text}
          </button>
        ) : (
          <span key={idx} className={cls}>
            {text}
          </span>
        );
      })}
    </span>
  );
}
