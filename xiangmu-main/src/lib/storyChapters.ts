/** Story Mode（Sprint A）：把一条真实 trace 自动切成纪录片章节。
 *  不新造算法（NRP）：章节边界与旁白数字全部复用既有真实口径——
 *  pipeline 实测 / agent 事件原文 / thoughtMap 站 / decisionPoints 时刻 / 完成统计。
 *  无对应字段的章节诚实缺席；旁白措辞白名单化，每个数字都可在 trace 定位。 */

import { decisionMoments } from "./decisionPoints";
import { buildThoughtMap } from "./thoughtMap";
import type { AgentEvent } from "./agentTrace";
import type { GenerationTrace } from "./trace";

export interface StoryChapter {
  key: string;
  /** 章节标题（白名单措辞） */
  title: string;
  /** 一句旁白：全部由真实数字/原文摘录填模板 */
  narration: string;
  /** token 步区间（含端点，0-based）；启动章无 token 对应时为 null */
  fromStep: number | null;
  toStep: number | null;
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function agentNarration(events: AgentEvent[]): string {
  const parts: string[] = [];
  const calls = events.filter((e) => e.type === "tool_call");
  const fails = events.filter((e) => e.type === "tool_result" && !e.ok);
  const handoffs = events.filter((e) => e.type === "model_handoff");
  if (calls.length > 0)
    parts.push(
      `调用了 ${calls.length} 次工具（${[...new Set(calls.map((c) => c.tool))].join("、")}）`,
    );
  if (fails.length > 0) parts.push(`其中 ${fails.length} 次失败（如实记录）`);
  for (const h of handoffs)
    parts.push(`模型交接 ${h.from ?? "起始"} → ${h.to}`);
  return parts.join("；");
}

/** 从一条 trace 生成章节序列；steps 为空返回 []。 */
export function buildStoryChapters(trace: GenerationTrace): StoryChapter[] {
  const steps = trace.steps;
  if (steps.length === 0) return [];
  const chapters: StoryChapter[] = [];
  const last = steps.length - 1;

  // 启动章：pipeline 实测，无字段缺席
  if (trace.pipeline) {
    const p = trace.pipeline;
    chapters.push({
      key: "launch",
      title: "启动",
      narration: `编码提示词 ${fmtMs(p.tokenizeMs)}，预填充 ${fmtMs(p.prefillMs)} 后落下第一个字，随后 ${fmtMs(p.decodeMs)} 逐字生成`,
      fromStep: null,
      toStep: null,
    });
  }

  // 检索/规划章：agent 事件原文，无事件缺席
  if (trace.agent && trace.agent.length > 0) {
    const n = agentNarration(trace.agent);
    if (n) {
      const at = Math.min(
        ...trace.agent.map((e) => e.atStep),
      );
      chapters.push({
        key: "agent",
        title: "检索与规划",
        narration: n,
        fromStep: Math.max(0, Math.min(at, last)),
        toStep: Math.max(0, Math.min(at, last)),
      });
    }
  }

  // 思考章：thoughtMap 站（无 </think> 边界缺席）
  const tm = buildThoughtMap(steps);
  if (tm) {
    for (const st of tm.stations.filter((s) => s.phase === "think")) {
      chapters.push({
        key: `think-${st.start}`,
        title: st.label,
        narration: `第 ${st.start + 1}–${st.end + 1} 步 · 平均熵 ${st.meanEntropy.toFixed(2)} ·「${st.excerpt}…」`,
        fromStep: st.start,
        toStep: st.end,
      });
    }
  }

  // 关键抉择章：decisionPoints（首字/最高熵/犹豫点）
  const moments = decisionMoments(steps).filter(
    (m) => !tm || m.index > tm.thinkEnd || m.kind === "first",
  );
  for (const m of moments) {
    chapters.push({
      key: `moment-${m.kind}-${m.index}`,
      title:
        m.kind === "first"
          ? "第一个字"
          : m.kind === "entropy_peak"
            ? "分布最散的一步"
            : "一次犹豫",
      narration: `第 ${m.index + 1} 步 ${m.label} · ${m.metric}`,
      fromStep: m.index,
      toStep: m.index,
    });
  }

  // 收束章：完成统计（全部实测）
  const totalMs = steps.reduce((a, s) => a + s.dt, 0);
  const tps = totalMs > 0 ? (steps.length / totalMs) * 1000 : null;
  chapters.push({
    key: "finish",
    title: "收束",
    narration: `共 ${steps.length} 个 token · 生成 ${fmtMs(totalMs)}${tps !== null ? ` · 平均 ${tps.toFixed(1)} tok/s` : ""}`,
    fromStep: tm ? tm.thinkEnd + 1 : 0,
    toStep: last,
  });

  // 按步区间排序（无锚点的启动章固定最前）
  const anchored = chapters.filter((c) => c.fromStep !== null);
  anchored.sort((a, b) => (a.fromStep ?? 0) - (b.fromStep ?? 0) || (a.toStep ?? 0) - (b.toStep ?? 0));
  return [...chapters.filter((c) => c.fromStep === null), ...anchored];
}
