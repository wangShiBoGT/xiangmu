import { useMemo, useRef, useState } from "react";
import { decisionMoments } from "../lib/decisionPoints";
import type { RuleMatch, RuleOp } from "../lib/rules";
import type { TokenStep } from "../lib/trace";
import Provenance from "./Provenance";

interface RuleGroup {
  ruleId: string;
  label: string;
  severity: "info" | "warn";
  count: number;
  firsts: number[];
  basis: string;
}

const FIELD_CN: Record<string, string> = {
  entropy: "熵",
  prob: "选中概率",
  dt: "耗时(ms)",
  rank: "候选排位",
  topProb: "top-1 概率",
  dtMedianRatio: "耗时/中位数",
  repeats: "重复次数",
};

function basisOf(m: RuleMatch): string {
  if (m.values.length === 0) return "";
  return m.values
    .map((v) => `${FIELD_CN[v.field] ?? v.field} ${v.op as RuleOp} ${v.threshold}`)
    .join(" 且 ");
}

/** 观测记录（instrument readout）：一次生成的确定性观测结论。
 *  首行仪器读数（tokens/平均熵/事件类目数）；判读行 = 最高熵的那一步；
 *  事件表逐类列出：严重度、名称、命中数、触发条件，点击在正文逐个定位。
 *  全部来自真实 trace 与公开规则，无 AI 解读。 */
export default function ObservationSummary({
  steps,
  matches,
  onJump,
}: {
  steps: TokenStep[];
  matches: RuleMatch[];
  onJump: (index: number) => void;
}) {
  const cycleRef = useRef(new Map<string, number>());
  const [cursor, setCursor] = useState<Record<string, number>>({});

  const groups = useMemo(() => {
    const map = new Map<string, RuleGroup>();
    for (const m of matches) {
      const g = map.get(m.ruleId) ?? {
        ruleId: m.ruleId,
        label: m.label,
        severity: m.severity,
        count: 0,
        firsts: [],
        basis: basisOf(m),
      };
      g.count++;
      g.firsts.push(m.from);
      map.set(m.ruleId, g);
    }
    return [...map.values()].sort((a, b) =>
      a.severity === b.severity
        ? b.count - a.count
        : a.severity === "warn"
          ? -1
          : 1,
    );
  }, [matches]);

  const avgEntropy =
    steps.length > 0
      ? steps.reduce((a, s) => a + s.entropy, 0) / steps.length
      : 0;

  // 判读：候选分布最分散的一步 = 熵最高的一步（描述统计，无 AI 解读）
  const peak = useMemo(() => {
    let idx = -1;
    let best = -Infinity;
    steps.forEach((s, i) => {
      if (s.entropy > best) {
        best = s.entropy;
        idx = i;
      }
    });
    return idx >= 0 ? { index: idx, step: steps[idx] } : null;
  }, [steps]);

  // Decision Observatory（Sprint 3）：首字/最高熵/犹豫点统一成一排可跳转的决策时刻
  const moments = useMemo(() => decisionMoments(steps), [steps]);

  if (steps.length === 0) return null;

  return (
    <div className="mb-6 rounded-md border-2 border-obs-line bg-obs-2 shadow-float">
      {/* 仪器读数行 */}
      <div className="flex items-baseline justify-between border-b border-obs-line/60 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-obs-ink2/70 select-none">
          Observation Log
        </p>
        <p className="font-mono text-[11px] tabular-nums text-obs-ink2 select-none">
          {steps.length} tokens
          <span className="mx-2 text-obs-line">|</span>
          平均熵 {avgEntropy.toFixed(2)}
          <span className="mx-2 text-obs-line">|</span>
          {groups.length > 0 ? `${groups.length} 类事件` : "无事件"}
        </p>
      </div>

      {/* 决策时刻：这次生成里 AI 真正做了选择的几步，点击跳到那一步下钻 */}
      {moments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-obs-line/60 px-4 py-2.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
            决策时刻
          </span>
          {moments.map((m) => (
            <button
              key={`${m.kind}-${m.index}`}
              type="button"
              title={`第 ${m.index + 1} 步 · 点击定位`}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors hover:bg-obs-wash/50 ${
                m.kind === "hesitation"
                  ? "border-amber-400/40 text-amber-200/90"
                  : m.kind === "entropy_peak"
                    ? "border-indigo-400/40 text-indigo-200/90"
                    : "border-obs-line text-obs-ink2"
              }`}
              onClick={() => onJump(m.index)}
            >
              {m.label}
              <span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-70">
                #{m.index + 1} · {m.metric}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 判读行：最高熵时刻 */}
      {peak && (
        <button
          type="button"
          className="group block w-full px-4 py-3 text-left transition-colors hover:bg-obs-wash/40"
          onClick={() => onJump(peak.index)}
        >
          <span className="text-[13px] leading-relaxed text-obs-ink">
            候选分布最分散的一步：第 {peak.index + 1} 词
            「{peak.step.text.trim() || peak.step.text}」——
            已记录 {peak.step.topk.length} 个候选，最终以{" "}
            {(peak.step.prob * 100).toFixed(0)}% 概率选中。
          </span>
          <span className="ml-2 whitespace-nowrap text-[12px] text-obs-ink2 transition-colors group-hover:text-obs-ink">
            看那一刻 →
          </span>
        </button>
      )}

      {/* 命中分布条：token 轴上每条规则命中的真实位置，点击跳转 */}
      {matches.length > 0 && (
        <div className="border-t border-obs-line/60 px-4 py-2.5">
          <svg
            viewBox={`0 0 ${steps.length} 10`}
            preserveAspectRatio="none"
            className="block h-[10px] w-full overflow-visible rounded-full bg-obs-wash/30"
          >
            {matches.map((m, i) => (
              <rect
                key={i}
                x={m.from}
                y={0}
                width={Math.max(m.to - m.from + 1, steps.length / 200)}
                height={10}
                rx={1}
                className="cursor-pointer"
                fill={m.severity === "warn" ? "#fbbf24" : "#64748b"}
                opacity={0.75}
                onClick={() => onJump(m.from)}
              >
                <title>{`${m.label} · 第 ${m.from + 1}–${m.to + 1} 词 · ${m.ruleId}`}</title>
              </rect>
            ))}
          </svg>
          <p className="mt-1 text-[11px] tabular-nums text-obs-ink2/50 select-none">
            命中分布 · 横轴 = token 序列 1–{steps.length} · 点击色块定位
          </p>
        </div>
      )}

      {/* 事件表 */}
      {groups.length === 0 ? (
        <p className="border-t border-obs-line/60 px-4 py-2.5 text-[12px] text-obs-ink2/60 select-none">
          全程无规则命中——生成过程平稳
        </p>
      ) : (
        <div className="border-t border-obs-line/60">
          {groups.map((g) => {
            const at = cursor[g.ruleId];
            return (
              <button
                key={g.ruleId}
                type="button"
                title={`${g.ruleId} · 点击逐个定位`}
                className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-obs-wash/40"
                onClick={() => {
                  // 依次循环跳到该规则的每个命中处
                  const next =
                    ((cycleRef.current.get(g.ruleId) ?? -1) + 1) %
                    g.firsts.length;
                  cycleRef.current.set(g.ruleId, next);
                  setCursor((c) => ({ ...c, [g.ruleId]: next }));
                  onJump(g.firsts[next]);
                }}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    g.severity === "warn" ? "bg-amber-400" : "bg-obs-ink2"
                  }`}
                />
                <span className="w-24 shrink-0 text-[12px] text-obs-ink">
                  {g.label}
                </span>
                <span className="w-14 shrink-0 font-mono text-[12px] tabular-nums text-obs-ink2">
                  ×{g.count}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-obs-ink2/60">
                  {g.basis}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-obs-ink2/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {at !== undefined ? `${at + 1}/${g.count} · ` : ""}定位 →
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="border-t border-obs-line/60 px-4 py-2">
        <Provenance
          info={{
            field: "steps[].entropy / 标注规则命中记录",
            method: "逐 token 本机实测；规则为纯函数确定性触发",
            level: "描述统计",
            boundary: "仅代表记录范围内的分散程度，不代表模型的主观状态或因果推理",
          }}
        />
      </div>
    </div>
  );
}
