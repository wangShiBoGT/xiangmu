import { AITRACE_SCOPE } from "../lib/trace";

/** Trace Scope：本次实验将记录什么 / 不记录什么。
 *  条目由 .aitrace 的字段定义（AITRACE_SCOPE）驱动，UI 与格式永远一致；
 *  device 传入后显示当前运行环境的真实能力，未加载时如实说明。 */
export default function TraceScope({ device }: { device?: string | null }) {
  return (
    <section className="rounded-md border border-obs-line bg-obs-2 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        Trace Scope · 本次实验将记录
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {AITRACE_SCOPE.recorded.map((f) => (
          <li key={f.key} className="flex items-start gap-2 text-[12px] text-obs-ink">
            <span className="mt-0.5 text-emerald-400/80">✓</span>
            <span>
              {f.label}
              <span className="ml-1.5 font-mono text-[11px] text-obs-ink2/60">{f.key}</span>
            </span>
          </li>
        ))}
        {AITRACE_SCOPE.optional.map((f) => (
          <li key={f.key} className="flex items-start gap-2 text-[12px] text-obs-ink2">
            <span className="mt-0.5 text-obs-ink2/60">◦</span>
            <span>
              {f.label}
              <span className="ml-1.5 text-[11px] text-obs-ink2/60">若后端支持</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/50 select-none">
        未记录 / 当前不可得
      </p>
      <ul className="mt-1.5 space-y-1">
        {AITRACE_SCOPE.notRecorded.map((label) => (
          <li key={label} className="flex items-start gap-2 text-[12px] text-obs-ink2/80">
            <span className="mt-0.5">—</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-obs-line/60 pt-2.5 text-[11px] text-obs-ink2/60 select-none">
        {device
          ? `当前后端：${device === "webgpu" ? "WebGPU · GPU 加速" : "WASM · CPU"}；候选分布为采样前全量 softmax 的 top-k 截断记录`
          : "模型尚未加载：以上字段将在运行时按实际能力记录；未提供的信号会明确标注「当前运行未提供此信号」"}
      </p>
    </section>
  );
}
