import { useEffect, useState } from "react";
import type { TokenStep } from "../lib/trace";
import ProbabilityStrip from "./ProbabilityStrip";
import Provenance from "./Provenance";
import SamplingInspector from "./SamplingInspector";

/** 细线曲线：基准网格 + 1.5px 线 + 末值点（无渐变填充，设计系统禁令）。
 *  全部点位来自真实推理记录，无插值美化。 */
function AreaChart({
  values,
  color,
  height = 56,
  formatMax,
}: {
  values: number[];
  color: string;
  height?: number;
  formatMax?: (v: number) => string;
}) {
  const w = 320;
  if (values.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border border-dashed border-obs-line/60 text-[11px] text-obs-ink2/50 select-none"
      >
        等待数据
      </div>
    );
  }
  const max = Math.max(...values, 1e-6);
  const px = (i: number) => (i / (values.length - 1)) * w;
  const py = (v: number) => height - (v / max) * (height - 10) - 4;
  const pts = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const lastX = px(values.length - 1);
  const lastY = py(values[values.length - 1]);
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={w}
            y1={height * f}
            y2={height * f}
            stroke="currentColor"
            className="text-obs-line"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      </svg>
      <span className="pointer-events-none absolute right-0 top-0 text-[11px] tabular-nums text-obs-ink2/60 select-none">
        {formatMax ? formatMax(max) : max.toFixed(1)}
      </span>
    </div>
  );
}



/** 规划阶段右栏侧卡（ACDL 规划页 P1）：正文 token 未到时不摆空壳 Inspector，
 *  改为 Planner 侧卡——规划模型、实时读秒、已流出字数、交接预告，全部真实读数 */
export interface PlanSide {
  planner: string;
  executor: string;
  status: "running" | "done" | "empty" | "failed";
  startedAt: number;
  /** 已流出的计划字符数（真实输出流长度） */
  chars: number;
}

function PlannerCard({ plan }: { plan: PlanSide }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (plan.status !== "running") return;
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, [plan.status]);
  return (
    <section className="rounded-md border border-obs-line bg-obs-2 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        Planner · 规划阶段
      </p>
      <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
        <span className="text-obs-ink2">规划模型</span>
        <span className="truncate text-obs-ink">{plan.planner}</span>
        <span className="text-obs-ink2">已思考</span>
        <span className="tabular-nums text-obs-ink">
          {(Math.max(0, now - plan.startedAt) / 1000).toFixed(1)} 秒
        </span>
        <span className="text-obs-ink2">已流出</span>
        <span className="tabular-nums text-obs-ink">{plan.chars} 字</span>
        <span className="text-obs-ink2">下一步</span>
        <span className="text-obs-ink">交给 {plan.executor} 作答</span>
      </div>
      <p className="mt-2.5 border-t border-obs-line/60 pt-2 text-[11px] leading-relaxed text-obs-ink2/70">
        计划原文正在主舞台逐字流出；首个正文 token 到达后，这里切回采样检查器
      </p>
    </section>
  );
}

/** Observe 右侧实时面板，主次随阶段重排：
 *  生成中——候选榜是主角（置顶实时刷新）；生成后——候选榜是末步冻结帧，
 *  折叠为单行，曲线与运行参数上位。全部数据来自真实推理记录。 */
export default function LivePanel({
  steps,
  running,
  selected,
  planSide,
}: {
  steps: TokenStep[];
  running: boolean;
  /** 正文选中的 token 步序：Inspector 随选择联动下钻（Figma/DevTools 语法） */
  selected?: number | null;
  /** 规划子运行进行中且正文未到：右栏改为 Planner 侧卡（真实读数） */
  planSide?: PlanSide | null;
}) {
  const [candsOpen, setCandsOpen] = useState(false);
  const selStep =
    selected !== null && selected !== undefined && selected >= 0 && selected < steps.length
      ? steps[selected]
      : null;
  const last = selStep ?? steps.at(-1) ?? null;
  const windowStart = Math.max(0, steps.length - 120);
  const window = steps.slice(windowStart);
  const tpsSeries = window.filter((s) => s.dt > 0).map((s) => 1000 / s.dt);
  const entropySeries = window.map((s) => s.entropy);
  const avgTps =
    tpsSeries.length > 0
      ? tpsSeries.reduce((a, b) => a + b, 0) / tpsSeries.length
      : null;
  const maxProb = last?.topk[0]?.prob ?? 1;
  const showCands = running || candsOpen || selStep !== null;
  // 候选分布最分散的一步（全序列熵最大，描述统计）
  let peakIdx = -1;
  for (let i = 0, best = -Infinity; i < steps.length; i++) {
    if (steps[i].entropy > best) {
      best = steps[i].entropy;
      peakIdx = i;
    }
  }

  const candidatesSection = (
    <section className="rounded-md border border-obs-line bg-obs-2 p-4">
        <div className="flex items-baseline justify-between">
          {running ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              Sampling
            </p>
          ) : selStep !== null ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              Inspector · 第 {(selected ?? 0) + 1} 步
            </p>
          ) : (
            <button
              type="button"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 transition-colors hover:text-obs-ink select-none"
              onClick={() => setCandsOpen((v) => !v)}
            >
              最后一步的候选 {candsOpen ? "▾" : "▸"}
            </button>
          )}
          <p className="font-mono text-[11px] tabular-nums text-obs-ink2">
            {running
              ? `第 ${steps.length + 1} 词`
              : last
                ? `${steps.length} tokens`
                : ""}
          </p>
        </div>
        {showCands && (
        <div className="mt-3 space-y-[7px]">
          {(last?.topk ?? []).map((c, rank) => {
            const chosen = c.id === last?.id;
            return (
              <div key={c.id} className="flex items-center gap-2">
                <span
                  className={`w-4 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                    chosen ? "text-indigo-300" : "text-obs-ink2/50"
                  }`}
                >
                  {rank + 1}
                </span>
                <span
                  className={`w-[72px] shrink-0 truncate font-mono text-[12px] ${
                    chosen ? "text-obs-ink" : "text-obs-ink2"
                  }`}
                >
                  {c.text.trim() || "␣"}
                </span>
                <ProbabilityStrip
                  value={c.prob}
                  max={maxProb}
                  tone={chosen ? "measure" : "neutral"}
                  showValue
                />
              </div>
            );
          })}
          {!last && (
            <p className="py-2 text-[12px] leading-relaxed text-obs-ink2/70">
              生成开始后，这里实时显示每个位置的候选词与真实概率
            </p>
          )}
        </div>
        )}
      </section>
  );

  const chartsSection = (
    <section className="rounded-md border border-obs-line bg-obs-2 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
            Throughput
          </p>
          {avgTps !== null && (
            <p className="text-[16px] font-medium tabular-nums text-obs-ink">
              {avgTps.toFixed(1)}
              <span className="ml-1 text-[11px] font-normal text-obs-ink2">
                tok/s
              </span>
            </p>
          )}
        </div>
        <div className="mt-2">
          <AreaChart
            values={tpsSeries}
            color="#818cf8"
            formatMax={(v) => `${v.toFixed(0)} tok/s`}
          />
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
            Entropy
          </p>
          {last && (
            <p className="text-[16px] font-medium tabular-nums text-obs-ink">
              {last.entropy.toFixed(2)}
              <span className="ml-1 text-[11px] font-normal text-obs-ink2">
                nats
              </span>
            </p>
          )}
        </div>
        <div className="mt-2">
          <AreaChart
            values={entropySeries}
            color="#a78bfa"
            formatMax={(v) => v.toFixed(1)}
          />
        </div>
        <div className="mt-3">
          <Provenance
            info={{
              field: "steps[].dt / steps[].entropy",
              method: "逐 token 本机实测耗时与全量 softmax 熵，窗口最近 120 步",
              level: "描述统计",
              boundary: "不代表模型的主观犹豫、真实意图或因果推理",
            }}
          />
        </div>
      </section>
  );

  return (
    <aside className="hidden w-[340px] shrink-0 space-y-3 overflow-y-auto p-4 lg:block">
      {running ? (
        <>
          {/* 生成中：单步采样检查器是主视觉，配一张随生成更新的人话摘要 */}
          {last ? (
            <>
              <SamplingInspector
                step={last}
                stepIndex={steps.length - 1}
                total={steps.length}
              />
              <section className="rounded-md border border-obs-line bg-obs-2 px-4 py-3">
                <p className="space-y-1 text-[13px] leading-relaxed text-obs-ink">
                  {peakIdx >= 0 && (
                    <span className="block">
                      第 {peakIdx + 1} 步候选分布最分散。
                    </span>
                  )}
                  <span className="block">已记录 {steps.length} 个 token。</span>
                  {avgTps !== null && (
                    <span className="block">
                      当前输出速率 {avgTps.toFixed(1)} tok/s。
                    </span>
                  )}
                </p>
              </section>
            </>
          ) : planSide ? (
            // 规划阶段：不摆空壳 Inspector，改为 Planner 侧卡（真实读数）
            <PlannerCard plan={planSide} />
          ) : null /* 无数据不渲染空壳（诚实缺席） */}
        </>
      ) : steps.length === 0 ? null : (
        <>
          {/* 分段耗时已归位到主舱流水线时间轴（remove-plan：同一读数只留一个位置） */}
          {chartsSection}
          {candidatesSection}
        </>
      )}
    </aside>
  );
}
