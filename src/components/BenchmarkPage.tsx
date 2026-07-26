import { useEffect, useMemo, useState } from "react";
import OfficialBenchCard from "./OfficialBenchCard";
import { loadMachineBench } from "../lib/benchStore";
import { benchComparableGroups, type BenchGroup } from "../lib/behaviorBench";
import { listExperiments } from "../lib/experiments";
import { CORE_RULES } from "../lib/rules";
import { getModel } from "../lib/models";

/** 绿色「本机实测」角标：与官方引用（琥珀）永远不同色不同表 */
function MeasuredBadge() {
  return (
    <span className="rounded-md border border-emerald-600/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      本机实测
    </span>
  );
}

function BehaviorGroupRow({ g }: { g: BenchGroup }) {
  return (
    <li className="border-t border-line/60 px-5 py-3">
      <p className="truncate text-[13px] text-ink">「{g.prompt}」</p>
      <p className="mt-0.5 text-[12px] text-ink-3">
        {getModel(g.modelId)?.name ?? g.modelId} · {g.device ?? "—"} ·{" "}
        {g.score.values.length} 次运行（seeds{" "}
        {g.score.seeds.map((s) => s ?? "—").join(" / ")}）
      </p>
      <p className="mt-1 font-mono text-[12px] tabular-nums text-emerald-700">
        规则命中率 中位 {g.score.median.toFixed(1)} · 区间{" "}
        {g.score.range[0].toFixed(1)}–{g.score.range[1].toFixed(1)} / 100 token
      </p>
    </li>
  );
}

/** 锚点 D6 · Benchmark 成绩单页：三种分数三个来源的纯组装页。
 *  官方引用（琥珀）/ 本机机器测量（绿）/ 行为基准（绿）永远分层分色，
 *  计算全部复用 officialBench / machineScore(benchStore) / behaviorBench，
 *  本页不做任何新测量、不产生任何新数字。 */
export default function BenchmarkPage({
  modelId,
  onGoDiscover,
  onGoObserve,
}: {
  modelId: string;
  onGoDiscover: () => void;
  onGoObserve: () => void;
}) {
  const machine = useMemo(() => loadMachineBench(), []);
  const [groups, setGroups] = useState<BenchGroup[] | null>(null);
  useEffect(() => {
    let dead = false;
    void listExperiments()
      .then((recs) => {
        if (!dead) setGroups(benchComparableGroups(recs, CORE_RULES));
      })
      .catch(() => {
        if (!dead) setGroups([]);
      });
    return () => {
      dead = true;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-6 pb-16 pt-10">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3 select-none">
          Benchmark · 成绩单
        </p>
        <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">
          三种分数三个来源，永远分开看
        </h2>
        <p className="mt-2 text-[14px] leading-[1.8] text-ink-3">
          官方引用是发布方公布的数字（琥珀色）；机器测量与行为基准是这台电脑
          真实跑出来的数字（绿色）。三层永远不混表、不混色、不互相换算。
        </p>

        {/* 任意滚动位置至少一个来源角标可见：三枚角标常驻吸顶 */}
        <div className="sticky top-0 z-10 -mx-2 mt-5 flex flex-wrap items-center gap-2 rounded-md bg-paper/90 px-2 py-2">
          <span className="rounded-md border border-amber-600/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            官方引用
          </span>
          <span className="rounded-md border border-emerald-600/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            机器测量 · 本机实测
          </span>
          <span className="rounded-md border border-emerald-600/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            行为基准 · 本机实测
          </span>
        </div>

        {/* 第一层：官方引用（琥珀），只复述发布方成绩 */}
        <OfficialBenchCard modelId={modelId} />

        {/* 第二层：机器测量（绿），读设备页留存的真实测量摘要 */}
        <div className="mt-6 rounded-md border border-emerald-600/30 bg-emerald-500/[0.04]">
          <div className="flex items-center justify-between border-b border-emerald-600/20 px-5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700/80 select-none">
              Machine Score · 机器测量
            </p>
            <MeasuredBadge />
          </div>
          <div className="px-5 py-4">
            {machine ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-[24px] font-semibold tracking-tight text-ink tabular-nums">
                    {machine.score.total}
                  </span>
                  <span className="text-[13px] text-ink-3">
                    Machine Score · {machine.score.grade} 级
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[12px] tabular-nums text-ink-3">
                  {machine.tps.toFixed(1)} tok/s
                  {machine.p50 !== null &&
                    machine.p95 !== null &&
                    ` · 延迟 p50 ${machine.p50.toFixed(0)} ms / p95 ${machine.p95.toFixed(0)} ms（${machine.n} 样本）`}
                </p>
                {machine.decay && (
                  <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-3">
                    采样衰减：前段 {machine.decay.headTps.toFixed(1)} → 末段{" "}
                    {machine.decay.tailTps.toFixed(1)} tok/s（
                    {machine.decay.tokens} tokens）
                  </p>
                )}
                <p className="mt-2 text-[12px] leading-[1.7] text-ink-3">
                  测量条件：{getModel(machine.modelId)?.name ?? machine.modelId}{" "}
                  · {machine.device === "webgpu" ? "WebGPU" : "CPU (WASM)"} ·{" "}
                  {new Date(machine.at).toLocaleString()}
                  实测。分数只在同一条件下可比。
                  {!machine.decay && "（采样衰减未测——去设备页跑 Context Decay）"}
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-md border border-line px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                  onClick={onGoDiscover}
                >
                  去设备页重新实测
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] leading-[1.8] text-ink-3">
                  这台电脑还没跑过测量——没有数字就是没有数字，不估不编。
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-md border border-line px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                  onClick={onGoDiscover}
                >
                  去设备页实测
                </button>
              </>
            )}
          </div>
        </div>

        {/* 第三层：行为基准（绿），统计来自实验档案的真实多 seed 分布 */}
        <div className="mt-6 rounded-md border border-emerald-600/30 bg-emerald-500/[0.04]">
          <div className="flex items-center justify-between border-b border-emerald-600/20 px-5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700/80 select-none">
              Behavior Bench · 行为基准
            </p>
            <MeasuredBadge />
          </div>
          {groups === null ? (
            <p className="px-5 py-4 text-[13px] text-ink-3">读取实验档案中…</p>
          ) : groups.length > 0 ? (
            <>
              <p className="px-5 pt-3.5 text-[12px] leading-[1.7] text-ink-3">
                同一组模型·prompt·参数·后端下的多 seed 重复运行，用统一 Core
                Rules 计算规则命中率。分数是分布不是单值。
              </p>
              <ul className="mt-2">
                {groups.map((g) => (
                  <BehaviorGroupRow key={g.key} g={g} />
                ))}
              </ul>
            </>
          ) : (
            <div className="px-5 py-4">
              <p className="text-[13px] leading-[1.8] text-ink-3">
                档案里还没有可比较组（需要同一模型·prompt·参数·后端下 ≥2 次
                有 trace 的运行）。
              </p>
              <button
                type="button"
                className="mt-3 rounded-md border border-line px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                onClick={onGoObserve}
              >
                去实验台跑多 seed 实验
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
