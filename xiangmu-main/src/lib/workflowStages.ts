/** Workspace Activity 面板的证据分级阶段（P7/P9：无真实数据不展示）。
 *  三级证据，逐级降级：事件级（agent 事件原文）> 结构级（<think> 边界）> 运行级（pipeline 实测）。
 *  运行级阶段任何生成都真实存在，永远可用作兜底；标签全部走宪法词表，不拟人。 */
import type { TokenStep, PipelineTiming } from "./trace";
import type { AgentEvent } from "./agentTrace";

export type StageEvidence = "event" | "structure" | "runtime";

export type StageStatus = "done" | "active" | "pending";

export interface WorkflowStage {
  key: string;
  label: string;
  evidence: StageEvidence;
  status: StageStatus;
  /** 等宽元数据行：单位+口径齐全的实测读数；无则不显示 */
  detail?: string;
  /** 锚定的步区间（结构级/事件级）；点击可跳转回放 */
  fromStep?: number;
  toStep?: number;
  /** 该阶段真实耗时（ms，本机实测）；时间轴段宽由它驱动，无则不入轴 */
  durationMs?: number;
}

export const EVIDENCE_LABEL: Record<StageEvidence, string> = {
  event: "事件记录",
  structure: "结构边界",
  runtime: "运行实测",
};

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** 由真实运行状态构建阶段清单。phase=idle 且无步数时返回空数组（诚实缺席）。 */
export function buildWorkflowStages(input: {
  phase: "idle" | "running" | "done";
  steps: TokenStep[];
  pipeline?: PipelineTiming;
  agent?: AgentEvent[];
  /** 运行中的实时吞吐（tokens/s），来自 worker 实测 */
  tps?: number | null;
}): WorkflowStage[] {
  const { phase, steps, pipeline, agent, tps } = input;
  if (phase === "idle" && steps.length === 0) return [];
  const running = phase === "running";
  const stages: WorkflowStage[] = [];

  // 运行级兜底：tokenize → prefill → 逐 token 解码 → 完成
  stages.push({
    key: "tokenize",
    label: "输入分词",
    evidence: "runtime",
    status: "done",
    detail: pipeline ? `${fmtMs(pipeline.tokenizeMs)}` : undefined,
    durationMs: pipeline?.tokenizeMs,
  });
  stages.push({
    key: "prefill",
    label: "预填充（读入上下文）",
    evidence: "runtime",
    status: steps.length > 0 ? "done" : running ? "active" : "done",
    detail: pipeline ? `${fmtMs(pipeline.prefillMs)}` : undefined,
    durationMs: pipeline?.prefillMs,
  });

  // 结构级：真实 <think> 边界把解码切成思考段/作答段
  const sumDt = (from: number, to: number) => {
    let ms = 0;
    for (let i = from; i <= to && i < steps.length; i++) ms += Math.max(0, steps[i].dt);
    return ms > 0 ? ms : undefined;
  };
  const closeIdx = steps.findIndex((s) => s.text.includes("</think>"));
  if (closeIdx > 0) {
    const answerStarted = steps.length > closeIdx + 1;
    stages.push({
      key: "think",
      label: "思考段（<think> 区间）",
      evidence: "structure",
      status: "done",
      detail: `第 1–${closeIdx + 1} 步`,
      fromStep: 0,
      toStep: closeIdx,
      durationMs: sumDt(0, closeIdx),
    });
    stages.push({
      key: "answer",
      label: "作答段",
      evidence: "structure",
      status: running ? "active" : "done",
      detail: answerStarted
        ? `第 ${closeIdx + 2}–${steps.length} 步`
        : undefined,
      fromStep: closeIdx + 1,
      toStep: steps.length - 1,
      durationMs: sumDt(closeIdx + 1, steps.length - 1),
    });
  } else {
    stages.push({
      key: "decode",
      label: "逐 token 解码",
      evidence: "runtime",
      status: running ? "active" : steps.length > 0 ? "done" : "pending",
      detail:
        steps.length > 0
          ? `${steps.length} tokens${
              running && tps ? ` · ${tps.toFixed(1)} tokens/s` : ""
            }${!running && pipeline ? ` · ${fmtMs(pipeline.decodeMs)}` : ""}`
          : undefined,
      fromStep: steps.length > 0 ? 0 : undefined,
      toStep: steps.length > 0 ? steps.length - 1 : undefined,
      durationMs:
        pipeline?.decodeMs ??
        (steps.length > 0 ? sumDt(0, steps.length - 1) : undefined),
    });
  }

  // 事件级：agent 事件按 atStep 插入（原文标签，最高证据等级）
  for (const e of agent ?? []) {
    if (e.atStep >= steps.length) continue;
    const label =
      e.type === "tool_call"
        ? `调用工具 ${e.tool}`
        : e.type === "tool_result"
          ? `工具 ${e.tool} ${e.ok ? "返回" : "失败"}`
          : e.type === "model_handoff"
            ? `模型交接 → ${e.to}`
            : `决策点${e.note ? `：${e.note}` : ""}`;
    stages.push({
      key: `agent-${e.type}-${e.atStep}`,
      label,
      evidence: "event",
      status: "done",
      detail:
        e.type === "tool_result" ? `${fmtMs(e.durationMs)}` : `第 ${e.atStep + 1} 步`,
      fromStep: e.atStep,
      toStep: e.atStep,
    });
  }

  stages.push({
    key: "finish",
    label: "生成完成",
    evidence: "runtime",
    status: phase === "done" ? "done" : "pending",
    detail:
      phase === "done" && pipeline
        ? `全程 ${fmtMs(pipeline.tokenizeMs + pipeline.prefillMs + pipeline.decodeMs)}`
        : undefined,
  });

  // 事件级插入后按 fromStep 排序（无锚定的运行级保持既有顺序）
  return stages;
}
