/** Agent 时间线（E4a）：只在 trace 携带 agent 事件时出现——无数据即无入口。
 *  不新建播放器：事件锚定在既有 token 时间线上，跳转复用同一 jumpToToken。
 *  工具失败原样展示（失败也是数据）；决策点只有该步真的记录了 top-k 才可展开。 */

import { modelSegments, type AgentEvent } from "../lib/agentTrace";
import type { TokenStep } from "../lib/trace";
import ProbabilityStrip, { formatProb } from "./ProbabilityStrip";

/** 置信度条：只在 trace 真实记录了 confidence 时出现 */
function ConfidenceBar({ value }: { value: number }) {
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      <span className="inline-flex w-[52px]">
        <ProbabilityStrip
          value={value}
          tone={value >= 0.7 ? "measure" : value >= 0.4 ? "caution" : "alert"}
        />
      </span>
      <span className="font-mono text-[11px] tabular-nums text-obs-ink2/70">
        {formatProb(value)}
      </span>
    </span>
  );
}

const SEG_COLORS = [
  "bg-indigo-400/60",
  "bg-teal-400/60",
  "bg-amber-400/60",
  "bg-rose-400/60",
  "bg-sky-400/60",
];

export default function AgentTimeline({
  events,
  steps,
  onJump,
}: {
  events: AgentEvent[];
  steps: TokenStep[];
  onJump: (index: number) => void;
}) {
  if (events.length === 0) return null;
  const segments = modelSegments(events, steps.length);
  const segModels = [...new Set(segments.map((s) => s.model).filter(Boolean))];
  return (
    <section className="mt-4 rounded-md border border-obs-line bg-obs-2/70 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        Agent Timeline · 工具调用与决策点
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-obs-ink2/80">
        Agent 不是新物种：工具调用只是生成了一段特殊格式的
        token。每条事件都锚定在左侧同一条 token
        时间线上，点击跳到那一步；多模型串联时，模型徽标与交接边界标出每段 token
        由谁产出。
      </p>
      {/* Model Responsibility：每段 token 归属谁——交接不是瞬时事件，而是责任边界 */}
      {segments.length > 0 && (
        <div className="mt-2.5">
          <div className="flex h-[10px] w-full overflow-hidden rounded-full">
            {segments.map((s, i) => (
              <span
                key={i}
                title={`${s.model ?? "归属未记录"} · 第 ${s.fromStep + 1}–${s.toStep + 1} 步`}
                className={`${
                  s.model
                    ? SEG_COLORS[segModels.indexOf(s.model) % SEG_COLORS.length]
                    : "bg-obs-line/30"
                } cursor-pointer transition-opacity hover:opacity-80`}
                style={{
                  width: `${((s.toStep - s.fromStep + 1) / steps.length) * 100}%`,
                }}
                onClick={() => onJump(s.fromStep)}
              />
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {segments.map((s, i) => (
              <span
                key={i}
                className="font-mono text-[11px] tabular-nums text-obs-ink2/70"
              >
                <span
                  className={`mr-1 inline-block h-[7px] w-[7px] rounded-sm align-middle ${
                    s.model
                      ? SEG_COLORS[segModels.indexOf(s.model) % SEG_COLORS.length]
                      : "bg-obs-line/30"
                  }`}
                />
                {s.model ?? "归属未记录"} · {s.toStep - s.fromStep + 1} token
              </span>
            ))}
          </div>
        </div>
      )}
      {/* 旅程带（Sprint 4）：事件锚定在 token 轴上的真实位置——一眼看清这趟旅行
          在哪里调了工具、哪里失败、哪里做了决策；点击跳到那一步 */}
      <div className="mt-2.5">
        <svg
          viewBox={`0 0 ${steps.length} 12`}
          preserveAspectRatio="none"
          className="block h-[12px] w-full overflow-visible rounded-full bg-obs-wash/30"
        >
          {events.map((e, i) => (
            <rect
              key={i}
              x={e.atStep}
              y={0}
              width={Math.max(1, steps.length / 200)}
              height={12}
              rx={1}
              className="cursor-pointer"
              fill={
                e.type === "tool_call"
                  ? "#38bdf8"
                  : e.type === "tool_result"
                    ? e.ok
                      ? "#34d399"
                      : "#f87171"
                    : e.type === "decision_point"
                      ? "#fbbf24"
                      : "#818cf8"
              }
              opacity={0.85}
              onClick={() => onJump(e.atStep)}
            >
              <title>
                {`第 ${e.atStep + 1} 步 · ${
                  e.type === "tool_call"
                    ? `调用 ${e.tool}`
                    : e.type === "tool_result"
                      ? `${e.tool} ${e.ok ? "成功" : "失败"}`
                      : e.type === "decision_point"
                        ? "决策点"
                        : `交接 → ${e.to}`
                }`}
              </title>
            </rect>
          ))}
        </svg>
        <p className="mt-1 text-[11px] tabular-nums text-obs-ink2/50 select-none">
          旅程带 · 横轴 = token 序列 1–{steps.length} ·
          <span className="ml-1.5 text-sky-300/80">■ 调用</span>
          <span className="ml-1.5 text-emerald-300/80">■ 成功</span>
          <span className="ml-1.5 text-red-300/80">■ 失败</span>
          <span className="ml-1.5 text-amber-300/80">■ 决策</span>
          <span className="ml-1.5 text-indigo-300/80">■ 交接</span> · 点击定位
        </p>
      </div>
      <ul className="mt-2.5 space-y-2">
        {events.map((e, i) =>
          e.type === "model_handoff" ? (
            // 交接边界：从这一步起 token 由另一个模型产出
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-dashed border-indigo-400/40 bg-indigo-500/5 px-3 py-2"
            >
              <p className="flex-1 text-[12px] text-obs-ink">
                模型交接：
                {e.from && (
                  <span className="mx-1 rounded border border-obs-line/70 px-1.5 py-0.5 font-mono text-[11px] text-obs-ink2">
                    {e.from}
                  </span>
                )}
                {e.from ? "→" : "起始 →"}
                <span className="mx-1 rounded border border-indigo-400/50 bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[11px] text-indigo-200">
                  {e.to}
                </span>
                {e.note && (
                  <span className="ml-1 text-[11px] text-obs-ink2/70">
                    {e.note}
                  </span>
                )}
                {e.reason && (
                  <span className="block text-[11px] text-obs-ink2/80">
                    理由：{e.reason}
                  </span>
                )}
                {e.confidence !== undefined && (
                  <ConfidenceBar value={e.confidence} />
                )}
              </p>
              <button
                className="shrink-0 text-[11px] text-obs-ink2 underline underline-offset-2 transition-colors hover:text-obs-ink"
                onClick={() => onJump(e.atStep)}
              >
                第 {e.atStep + 1} 步 →
              </button>
            </li>
          ) : (
          <li
            key={i}
            className="rounded-md border border-obs-line bg-obs px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-obs-ink">
                {e.model && (
                  <span className="mr-1.5 rounded border border-obs-line/70 px-1.5 py-0.5 font-mono text-[11px] text-obs-ink2">
                    {e.model}
                  </span>
                )}
                {e.type === "tool_call" && (
                  <>
                    调用工具 <span className="font-mono">{e.tool}</span>
                  </>
                )}
                {e.type === "tool_result" && (
                  <>
                    <span className="font-mono">{e.tool}</span> 返回
                    <span
                      className={`ml-2 text-[11px] uppercase ${
                        e.ok ? "text-emerald-300/90" : "text-red-400"
                      }`}
                    >
                      {e.ok ? "成功" : "失败"}
                    </span>
                    <span className="ml-2 font-mono text-[11px] tabular-nums text-obs-ink2/70">
                      {e.durationMs.toFixed(0)} ms
                    </span>
                  </>
                )}
                {e.type === "decision_point" && (
                  <>决策点{e.note ? `：${e.note}` : ""}</>
                )}
                {e.confidence !== undefined && (
                  <ConfidenceBar value={e.confidence} />
                )}
              </p>
              <button
                className="shrink-0 text-[11px] text-obs-ink2 underline underline-offset-2 transition-colors hover:text-obs-ink"
                onClick={() => onJump(e.atStep)}
              >
                第 {e.atStep + 1} 步 →
              </button>
            </div>
            {e.reason && (
              <p className="mt-1 text-[11px] leading-relaxed text-obs-ink2/85">
                为什么：{e.reason}
              </p>
            )}
            {e.type === "tool_call" && (
              <pre className="mt-1.5 overflow-x-auto rounded-md bg-obs-2/80 p-2 font-mono text-[11px] leading-relaxed text-obs-ink2">
                {e.input}
              </pre>
            )}
            {e.type === "tool_result" && (
              <pre
                className={`mt-1.5 overflow-x-auto rounded-md bg-obs-2/80 p-2 font-mono text-[11px] leading-relaxed ${
                  e.ok ? "text-obs-ink2" : "text-red-400/90"
                }`}
              >
                {e.output}
              </pre>
            )}
            {e.type === "decision_point" && e.evidence && (
              <pre className="mt-1.5 overflow-x-auto rounded-md bg-obs-2/80 p-2 font-mono text-[11px] leading-relaxed text-obs-ink2">
                证据：{e.evidence}
              </pre>
            )}
            {e.type === "decision_point" && (
              <p className="mt-1 text-[11px] text-obs-ink2/70">
                {(steps[e.atStep]?.topk.length ?? 0) > 0
                  ? `该步记录了 top-${steps[e.atStep].topk.length} 候选分布，跳过去即可下钻`
                  : "该步未记录 top-k 候选——不估算、不展开"}
              </p>
            )}
          </li>
          ),
        )}
      </ul>
    </section>
  );
}
