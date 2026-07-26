import { useMemo } from "react";
import type { TokenStep, PipelineTiming } from "../lib/trace";
import type { AgentEvent } from "../lib/agentTrace";
import {
  buildWorkflowStages,
  EVIDENCE_LABEL,
  type WorkflowStage,
} from "../lib/workflowStages";

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** 流水线时间轴：段宽 ∝ 真实耗时（log 刻度），时间结构本身成为画面。
 *  有实测耗时的阶段进入轴体；事件级阶段（工具调用/交接/决策点）作为轴下刻度标记；
 *  点击带步区间的段/标记可展开该段决策。数据与旧阶段链同源（buildWorkflowStages）。 */
export default function WorkflowStrip({
  phase,
  steps,
  pipeline,
  agent,
  tps,
  onSelectStage,
  activeKey,
  compact,
}: {
  phase: "idle" | "running" | "done";
  steps: TokenStep[];
  pipeline?: PipelineTiming;
  agent?: AgentEvent[];
  tps?: number | null;
  onSelectStage?: (stage: WorkflowStage) => void;
  activeKey?: string | null;
  /** 紧凑模式：单行文字阶段列表（运行中控制台用），无轴体 */
  compact?: boolean;
}) {
  const stages = useMemo(
    () => buildWorkflowStages({ phase, steps, pipeline, agent, tps }),
    [phase, steps, pipeline, agent, tps],
  );
  if (stages.length === 0) return null;

  const segs = stages.filter((s) => (s.durationMs ?? 0) > 0);
  // finish 的全程读数已在丝印行右端展示，不再入刻度行（同一读数只留一个位置）
  const marks = stages.filter(
    (s) => !((s.durationMs ?? 0) > 0) && !(s.key === "finish" && s.status === "done"),
  );
  const totalMs = segs.reduce((a, s) => a + (s.durationMs ?? 0), 0);

  if (compact || segs.length === 0) {
    // 单行文字列表：无方块、无箭头，层级靠灰度（Linear 语法）
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {stages.map((s) => {
          const clickable = onSelectStage && s.fromStep !== undefined;
          return (
            <button
              key={s.key}
              disabled={!clickable}
              onClick={() => clickable && onSelectStage(s)}
              title={`证据：${EVIDENCE_LABEL[s.evidence]}`}
              className={`whitespace-nowrap text-[12px] transition-colors ${
                s.status === "active"
                  ? "text-obs-ink"
                  : s.status === "done"
                    ? "text-obs-ink2"
                    : "text-obs-ink2/40"
              } ${clickable ? "hover:text-obs-ink" : "cursor-default"}`}
            >
              {s.label}
              {s.detail && (
                <span className="ml-1.5 font-mono text-[11px] tabular-nums text-obs-ink2/70">
                  {s.detail}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // log 刻度：33ms 与 25.7s 同轴可读；min-width 保证最短段可点
  const grow = (ms: number) => Math.max(1, Math.log10(1 + ms));
  const shade: Record<string, string> = {
    tokenize: "bg-indigo-400/15",
    prefill: "bg-indigo-400/25",
    think: "bg-indigo-400/35",
    answer: "bg-indigo-400/50",
    decode: "bg-indigo-400/50",
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
          Pipeline · 运行实测
        </p>
        <p className="font-mono text-[12px] tabular-nums text-obs-ink2">
          {phase === "running" ? "测量中" : `全程 ${fmtMs(totalMs)}`}
        </p>
      </div>
      <div className="mt-2 flex h-6 w-full gap-px overflow-hidden rounded-md">
        {segs.map((s) => {
          const clickable = onSelectStage && s.fromStep !== undefined;
          return (
            <button
              key={s.key}
              disabled={!clickable}
              onClick={() => clickable && onSelectStage(s)}
              title={`${s.label} · ${fmtMs(s.durationMs ?? 0)} · 证据：${EVIDENCE_LABEL[s.evidence]}`}
              style={{ flexGrow: grow(s.durationMs ?? 0), flexBasis: 0 }}
              className={`min-w-[40px] transition-colors ${shade[s.key] ?? "bg-indigo-400/30"} ${
                activeKey === s.key ? "outline outline-1 -outline-offset-1 outline-indigo-400/70" : ""
              } ${clickable ? "hover:bg-indigo-400/60" : "cursor-default"} flex items-center justify-center`}
            >
              <span className="truncate px-1 font-mono text-[11px] tabular-nums text-obs-ink/90">
                {fmtMs(s.durationMs ?? 0)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex w-full gap-px">
        {segs.map((s) => (
          <span
            key={s.key}
            style={{ flexGrow: grow(s.durationMs ?? 0), flexBasis: 0 }}
            className="min-w-[40px] truncate px-0.5 text-[11px] text-obs-ink2/70 select-none"
          >
            {s.label}
          </span>
        ))}
      </div>
      {marks.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {marks.map((s) => {
            const clickable = onSelectStage && s.fromStep !== undefined;
            return (
              <button
                key={s.key}
                disabled={!clickable}
                onClick={() => clickable && onSelectStage(s)}
                title={`证据：${EVIDENCE_LABEL[s.evidence]}`}
                className={`whitespace-nowrap text-[11px] transition-colors ${
                  s.status === "pending" ? "text-obs-ink2/40" : "text-obs-ink2"
                } ${clickable ? "hover:text-obs-ink" : "cursor-default"} ${
                  activeKey === s.key ? "text-obs-ink" : ""
                }`}
              >
                <span className="mr-1 text-indigo-300/80">▲</span>
                {s.label}
                {s.detail && (
                  <span className="ml-1 font-mono tabular-nums text-obs-ink2/70">
                    {s.detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
