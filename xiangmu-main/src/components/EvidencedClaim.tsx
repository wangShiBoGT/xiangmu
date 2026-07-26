import { useEffect, useState, type ReactNode } from "react";

// DS3 粒度纪律哨兵：同屏挂载 >3 个时 dev 警告（不阻断渲染）
let mounted = 0;
let warned = false;

/** C2「陈述可展开」：Evidence First 的界面机制。
 *  陈述句带细虚线下划线 + ⌄，点击原位向下展开产生它的证据明细（非弹窗）。
 *  粒度纪律：每屏 ≤3 处，只用于统计/比较/机制类断言；
 *  source 必填 = 证据的原始字段路径，登记不了来源的句子不许用本组件包装。 */
export default function EvidencedClaim({
  claim,
  source,
  children,
  onInspect,
  inspectLabel = "在完整 trace 中查看 →",
}: {
  /** 被支撑的陈述句 */
  claim: ReactNode;
  /** 证据的原始字段路径，如 steps[67].topk[0..1].prob */
  source: string;
  /** 展开后的证据明细 */
  children: ReactNode;
  /** 可选：跳到完整 trace 的入口 */
  onInspect?: () => void;
  inspectLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    mounted++;
    if (import.meta.env.DEV && mounted > 3 && !warned) {
      warned = true;
      console.warn(
        `[DS3] 同屏出现 ${mounted} 处 EvidencedClaim——粒度纪律为每屏 ≤3 处（不阻断渲染）`,
      );
    }
    return () => {
      mounted--;
      if (mounted <= 3) warned = false;
    };
  }, []);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        className="text-left text-[13px] leading-relaxed text-obs-ink underline decoration-obs-ink2/50 decoration-dotted underline-offset-4 transition-colors hover:decoration-obs-ink"
        onClick={() => setOpen((v) => !v)}
      >
        {claim}
        <span
          aria-hidden
          className={`ml-1 inline-block text-[11px] text-obs-ink2 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ⌄
        </span>
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-obs-line bg-obs/60 p-2.5">
          {children}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-obs-line/60 pt-1.5">
            <span className="min-w-0 truncate font-mono text-[11px] text-obs-ink2/60 select-none">
              来源：{source}
            </span>
            {onInspect && (
              <button
                type="button"
                className="shrink-0 text-[11px] text-obs-ink2 transition-colors hover:text-obs-ink"
                onClick={onInspect}
              >
                {inspectLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
