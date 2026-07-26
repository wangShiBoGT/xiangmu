import { officialBenchFor } from "../lib/officialBench";
import { getModel } from "../lib/models";

/** 官方能力引用层（锚点 D1）：与本机实测永远不同表、不同色（琥珀色引用样式），
 *  每个数字带来源角标；未逐条核实的模型如实显示"未录入"——宁缺毋假。 */
export default function OfficialBenchCard({ modelId }: { modelId: string }) {
  const entry = officialBenchFor(modelId);
  const model = getModel(modelId);
  return (
    <div className="mt-6 rounded-md border border-amber-600/30 bg-amber-500/[0.04]">
      <div className="flex items-center justify-between border-b border-amber-600/20 px-5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700/80 select-none">
          Official Benchmarks · 官方公开成绩
        </p>
        <span className="rounded-md border border-amber-600/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
          引用 · 非本机实测
        </span>
      </div>
      <div className="px-5 py-4">
        {entry ? (
          <>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {entry.scores.map((s) => (
                <li
                  key={`${s.benchmark}/${s.metric}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="text-ink">
                    {s.benchmark}
                    <span className="ml-1.5 text-[11px] text-ink-3">
                      {s.metric}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-amber-700">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-[1.7] text-ink-3">
              成绩属于上游原模型 {entry.upstream}
              （本地运行的是其量化镜像，量化可能影响成绩）；
              数字由发布方公布，非本产品实测。来源：
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-700 underline decoration-dotted underline-offset-2"
              >
                {entry.sourceLabel}
              </a>
              （{entry.verifiedAt} 逐条核实）。
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-[1.8] text-ink-3">
            尚未录入 {model?.name ?? modelId}{" "}
            的官方公开成绩——只录入逐条核实过来源的数字，宁缺毋假。
          </p>
        )}
      </div>
    </div>
  );
}
