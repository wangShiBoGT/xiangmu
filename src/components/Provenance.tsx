import { useState } from "react";

/** 指标溯源标注：任何展示的数值必须能回答——
 *  字段来源 / 采集方式 / 解释级别 / 边界（不能证明什么）。
 *  常驻一行短标签，点开显示完整四件事。 */

export type ProvenanceLevel = "原始测量" | "描述统计" | "规则标注";

export interface ProvenanceInfo {
  /** trace 字段来源，如 steps[i].topk */
  field: string;
  /** 如何记录、是否完整 */
  method: string;
  level: ProvenanceLevel;
  /** 该指标不能证明什么 */
  boundary: string;
}

export default function Provenance({ info }: { info: ProvenanceInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[11px] leading-relaxed text-obs-ink2/70">
      <button
        type="button"
        className="select-none underline decoration-dotted underline-offset-2 transition-colors hover:text-obs-ink2"
        onClick={() => setOpen((v) => !v)}
      >
        来源：本机 trace · {info.level}
      </button>
      {open && (
        <dl className="mt-1.5 space-y-0.5 rounded-md border border-obs-line/60 bg-obs-wash/40 px-2.5 py-2">
          <div className="flex gap-2">
            <dt className="shrink-0 text-obs-ink2/60">字段来源</dt>
            <dd className="font-mono">{info.field}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-obs-ink2/60">采集方式</dt>
            <dd>{info.method}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-obs-ink2/60">解释级别</dt>
            <dd>{info.level}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-obs-ink2/60">边界</dt>
            <dd>{info.boundary}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
