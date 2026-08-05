import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { alignTraces, divergenceNarration } from "../lib/compareReplay";
import { IconChevronLeft } from "./icons";
import {
  firstDivergence,
  paramsDiff,
  type ExperimentRecord,
} from "../lib/experiments";
import { entropyLevel, type TokenStep } from "../lib/trace";
import { getModel } from "../lib/models";
import Provenance from "./Provenance";
import DualTraceChannel from "./DualTraceChannel";
import SamplingInspector from "./SamplingInspector";

const COLORS = ["#10A0FF", "#00e676"];

/** 逐步耗时的累计和（ms）：把两次运行放到同一生成时间轴上 */
function cumTime(steps: TokenStep[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const s of steps) {
    acc += s.dt;
    out.push(acc);
  }
  return out;
}

function EntropyOverlay({
  series,
  markAt,
}: {
  series: number[][];
  markAt?: number;
}) {
  const w = 640;
  const h = 72;
  const maxLen = Math.max(...series.map((s) => s.length), 2);
  const maxV = Math.max(...series.flat(), 1e-6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      {markAt !== undefined && markAt >= 0 && (
        <line
          x1={(markAt / (maxLen - 1)) * w}
          x2={(markAt / (maxLen - 1)) * w}
          y1={0}
          y2={h}
          stroke="#ffa726"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.8"
        />
      )}
      {series.map((vals, si) =>
        vals.length >= 2 ? (
          <polyline
            key={si}
            points={vals
              .map(
                (v, i) =>
                  `${((i / (maxLen - 1)) * w).toFixed(1)},${(h - (v / maxV) * (h - 6) - 3).toFixed(1)}`,
              )
              .join(" ")}
            fill="none"
            stroke={COLORS[si]}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.9"
          />
        ) : null,
      )}
    </svg>
  );
}

function TokenColumn({
  rec,
  divergeAt,
  color,
  selected,
  onSelect,
}: {
  rec: ExperimentRecord;
  divergeAt: number;
  color: string;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const steps = rec.root.trace?.steps ?? [];
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <p className="truncate text-[13px] text-obs-ink">{rec.name}</p>
      </div>
      <p className="mb-2 text-[11px] text-obs-ink2/80">
        {getModel(rec.modelId)?.name ?? rec.modelId} · 温度 {rec.params.temperature} · Top-P{" "}
        {rec.params.topP} · 种子 {rec.seed ?? "—"} · {rec.stats.tokens} tok
        {rec.stats.avgTps !== null && ` · ${rec.stats.avgTps.toFixed(1)} tok/s`}
      </p>
      <div className="rounded-md border border-obs-line bg-obs-2 p-4 text-[14px] leading-[1.95] text-obs-ink">
        {steps.map((s: TokenStep, i: number) => (
          <span
            key={i}
            className={`cursor-pointer ${
              i === selected
                ? "rounded-sm ring-1 ring-measure-300"
                : i === divergeAt
                  ? "rounded-sm ring-1 ring-amber-400/70"
                  : ""
            }`}
            style={{
              backgroundColor: `rgba(129,140,248,${(entropyLevel(s.entropy) * 0.28).toFixed(3)})`,
            }}
            onClick={() => onSelect(i)}
          >
            {s.text}
          </span>
        ))}
        {steps.length === 0 && (
          <span className="text-obs-ink2/70">（无生成内容）</span>
        )}
      </div>
    </div>
  );
}

/** 对比视图：不是浮层而是独立一幕——占满标本区，顶部返回。
 *  参数差异 / 分歧点 / 熵曲线叠加 / 速度指标。 */
export default function CompareView({
  pair,
  onClose,
  initialStep,
}: {
  pair: [ExperimentRecord, ExperimentRecord];
  onClose: () => void;
  /** 初始选中步（如从发现页带入的分叉步） */
  initialStep?: number;
}) {
  const [a, b] = pair;
  const diffs = useMemo(() => paramsDiff(a, b), [a, b]);
  const divergeAt = useMemo(
    () => firstDivergence(a.root.trace?.steps ?? [], b.root.trace?.steps ?? []),
    [a, b],
  );
  const [selected, setSelected] = useState<number | null>(
    initialStep ?? (divergeAt >= 0 ? divergeAt : null),
  );
  const stepsA = useMemo(() => a.root.trace?.steps ?? [], [a]);
  const stepsB = useMemo(() => b.root.trace?.steps ?? [], [b]);

  // 同步回放（Sprint B）：两列沿同一拍轴同步走，到分歧步自动停点
  const align = useMemo(() => alignTraces(stepsA, stepsB), [stepsA, stepsB]);
  const narration = useMemo(
    () => divergenceNarration(stepsA, stepsB),
    [stepsA, stepsB],
  );
  const [playState, setPlayState] = useState<
    "idle" | "playing" | "diverge_stop" | "done"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => stopTimer, [stopTimer]);
  const playFrom = useCallback(
    (from: number) => {
      stopTimer();
      if (align.totalTicks === 0) return;
      let t = Math.max(0, Math.min(from, align.totalTicks - 1));
      setSelected(t);
      setPlayState("playing");
      timerRef.current = setInterval(() => {
        t += 1;
        if (t >= align.totalTicks) {
          stopTimer();
          setPlayState("done");
          return;
        }
        setSelected(t);
        // 分歧停点：到达首个分歧步自动停下，等用户看完双边 top-k 再继续
        if (t === align.divergeAt) {
          stopTimer();
          setPlayState("diverge_stop");
        }
      }, 130);
    },
    [align, stopTimer],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-obs text-obs-ink">
      <div className="flex shrink-0 items-center gap-3 border-b border-obs-line px-6 py-3.5">
        <button
          aria-label="返回观察"
          className="flex items-center gap-1.5 rounded-md border border-obs-line px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
          onClick={onClose}
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
          Experiment Diff · 实验对比
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] space-y-5 p-6">
          <section>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              参数差异
            </p>
            {diffs.length === 0 ? (
              <p className="text-[13px] text-obs-ink2">
                两条实验参数完全相同
                {divergeAt >= 0 && "（结果不同来自采样随机性）"}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {diffs.map((d) => (
                  <span
                    key={d.label}
                    className="rounded-md border border-obs-line bg-obs-2 px-3 py-1 text-[12px] text-obs-ink"
                  >
                    {d.label}：
                    <span style={{ color: COLORS[0] }}>{d.a}</span>
                    <span className="mx-1 text-obs-ink2">→</span>
                    <span style={{ color: COLORS[1] }}>{d.b}</span>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-[12px] text-obs-ink2">
              {divergeAt === -1
                ? "两条 token 序列完全一致"
                : `第 ${divergeAt + 1} 个 token 起分歧（黄框标出）`}
            </p>

            {/* 同步回放传输控制：共同前缀一对一同步，分歧步自动停点 */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {playState !== "playing" ? (
                <button
                  className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs-2 disabled:opacity-30"
                  disabled={align.totalTicks === 0}
                  onClick={() => playFrom(0)}
                >
                  ▶ 同步回放
                </button>
              ) : (
                <button
                  className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs-2"
                  onClick={() => {
                    stopTimer();
                    setPlayState("idle");
                  }}
                >
                  ⏸ 暂停
                </button>
              )}
              {playState === "diverge_stop" && (
                <button
                  className="rounded-md border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-[12px] text-amber-200 transition-colors hover:bg-amber-500/20"
                  onClick={() => playFrom((selected ?? 0) + 1)}
                >
                  继续 · 看分歧之后
                </button>
              )}
              {selected !== null && (
                <span className="font-mono text-[11px] tabular-nums text-obs-ink2/70 select-none">
                  拍 {selected + 1}/{align.totalTicks}
                  {selected >= stepsA.length && " · A 已结束"}
                  {selected >= stepsB.length && " · B 已结束"}
                </span>
              )}
              <span className="ml-auto text-[11px] text-obs-ink2/50 select-none">
                匀速回放；真实逐步耗时见下方累计耗时叠加
              </span>
            </div>
            {playState === "diverge_stop" && narration && (
              <p className="mt-2 rounded-md border border-amber-400/40 bg-amber-500/5 px-3 py-2 text-[13px] leading-relaxed text-amber-100/90">
                {narration}。下方已并列展开两边该步的已记录
                top-k：若两边候选分布相近，分歧来自采样抽签；若分布本身不同，分歧在更早的上下文已种下。
              </p>
            )}
          </section>

          <section>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              双 Trace 对比通道 · 从共同前缀到分叉（紫 = 前一次，绿 = 后一次）
            </p>
            <div className="overflow-hidden rounded-md border border-obs-line bg-obs-2">
              <DualTraceChannel
                stepsA={stepsA}
                stepsB={stepsB}
                divergeAt={divergeAt}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
          </section>

          {selected !== null && (stepsA[selected] || stepsB[selected]) && (
            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
                第 {selected + 1} 步 · A/B 候选分布并列（各自的已记录 Top-k）
              </p>
              <div className="flex flex-col gap-4 lg:flex-row">
                {[
                  { rec: a, steps: stepsA },
                  { rec: b, steps: stepsB },
                ].map(({ rec, steps }, si) =>
                  steps[selected] ? (
                    <div key={si} className="min-w-0 flex-1">
                      <SamplingInspector
                        step={steps[selected]}
                        stepIndex={selected}
                        total={steps.length}
                        params={rec.root.trace?.params ?? null}
                        seed={rec.root.trace?.params.seed ?? null}
                      />
                    </div>
                  ) : (
                    <div
                      key={si}
                      className="flex min-w-0 flex-1 items-center justify-center rounded-md border border-obs-line bg-obs-2 p-6 text-[13px] text-obs-ink2"
                    >
                      该 run 在第 {selected + 1} 步前已结束
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          <section>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              熵曲线叠加 · 分布分散度（同一 token 步轴，黄线 = 分叉位置）
            </p>
            <div className="rounded-md border border-obs-line bg-obs-2 p-4">
              <EntropyOverlay
                series={[
                  (a.root.trace?.steps ?? []).map((s) => s.entropy),
                  (b.root.trace?.steps ?? []).map((s) => s.entropy),
                ]}
                markAt={divergeAt}
              />
              <Provenance
                info={{
                  field: "steps[].entropy",
                  method: "两次运行的逐步候选分布熵，同一 token 步轴叠加",
                  level: "描述统计",
                  boundary: "仅代表记录范围内的分散程度，不代表模型的主观状态或因果推理",
                }}
              />
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              累计耗时叠加 · 生成时间轴
            </p>
            <div className="rounded-md border border-obs-line bg-obs-2 p-4">
              <EntropyOverlay
                series={[cumTime(a.root.trace?.steps ?? []), cumTime(b.root.trace?.steps ?? [])]}
                markAt={divergeAt}
              />
              <Provenance
                info={{
                  field: "steps[].dt",
                  method: "逐 token 本机实测耗时的累计和（ms）",
                  level: "原始测量",
                  boundary: "受硬件与后端影响，不同设备间不可直接比较",
                }}
              />
            </div>
          </section>

          <section className="flex gap-5">
            <TokenColumn
              rec={a}
              divergeAt={divergeAt}
              color={COLORS[0]}
              selected={selected}
              onSelect={setSelected}
            />
            <TokenColumn
              rec={b}
              divergeAt={divergeAt}
              color={COLORS[1]}
              selected={selected}
              onSelect={setSelected}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

