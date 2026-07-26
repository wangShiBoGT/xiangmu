/** Agent 事件（锚点 E4a）：.aitrace 的加法式扩展，不改既有字段。
 *  Agent 不是新物种——工具调用只是「生成了一段特殊格式的 token」，
 *  事件用 atStep 锚定在同一条 token 时间线上，复用同一套回放仪器。
 *  工具失败原样保留（失败也是数据）。 */

export interface ToolCallEvent {
  type: "tool_call";
  /** 锚定的生成步序号（该步之后发起调用） */
  atStep: number;
  tool: string;
  /** 原始输入（模型产出的调用参数，不清洗） */
  input: string;
  /** 多模型串联 pipeline：产出该事件的模型标识（单模型 trace 可省略） */
  model?: string;
  /** 决策层：为什么发起这次调用（来自真实 trace，缺失就不显示、不估） */
  reason?: string;
  /** 决策时的置信度 ∈ [0,1]（由上游 runtime 如实记录，非本地估算） */
  confidence?: number;
}

export interface ToolResultEvent {
  type: "tool_result";
  atStep: number;
  tool: string;
  /** 原始输出或原始错误文本（失败不隐藏） */
  output: string;
  ok: boolean;
  durationMs: number;
  model?: string;
  reason?: string;
  confidence?: number;
}

export interface DecisionPointEvent {
  type: "decision_point";
  atStep: number;
  /** 可选说明；该步的候选分布展开走 steps[atStep].topk，无 top-k 就不展开、不估 */
  note?: string;
  model?: string;
  reason?: string;
  confidence?: number;
  /** 支撑该决策的证据原文（如检索结果摘要），原样保留不改写 */
  evidence?: string;
}

/** 模型交接（多模型串联 Agent）：从这一步起，后续 token 由另一个模型产出。
 *  交接本身也是同一条时间线上的事件，不另开一套回放。 */
export interface ModelHandoffEvent {
  type: "model_handoff";
  atStep: number;
  /** 交出方模型（pipeline 首段可省略） */
  from?: string;
  /** 接手方模型 */
  to: string;
  note?: string;
  reason?: string;
  confidence?: number;
}

export type AgentEvent =
  | ToolCallEvent
  | ToolResultEvent
  | DecisionPointEvent
  | ModelHandoffEvent;

/** 导入校验：整体不是数组返回 null；逐条过滤非法事件（安全降级，不让坏事件毁掉主链） */
export function sanitizeAgentEvents(
  input: unknown,
  stepCount: number,
): AgentEvent[] | null {
  if (!Array.isArray(input)) return null;
  const ok = (e: unknown): e is AgentEvent => {
    if (typeof e !== "object" || e === null) return false;
    const o = e as Record<string, unknown>;
    if (
      typeof o.atStep !== "number" ||
      !Number.isInteger(o.atStep) ||
      o.atStep < 0 ||
      o.atStep >= stepCount
    )
      return false;
    if (o.model !== undefined && typeof o.model !== "string") return false;
    if (o.reason !== undefined && typeof o.reason !== "string") return false;
    if (
      o.confidence !== undefined &&
      (typeof o.confidence !== "number" ||
        !Number.isFinite(o.confidence) ||
        o.confidence < 0 ||
        o.confidence > 1)
    )
      return false;
    switch (o.type) {
      case "tool_call":
        return typeof o.tool === "string" && typeof o.input === "string";
      case "tool_result":
        return (
          typeof o.tool === "string" &&
          typeof o.output === "string" &&
          typeof o.ok === "boolean" &&
          typeof o.durationMs === "number"
        );
      case "decision_point":
        return (
          (o.note === undefined || typeof o.note === "string") &&
          (o.evidence === undefined || typeof o.evidence === "string")
        );
      case "model_handoff":
        return (
          typeof o.to === "string" &&
          (o.from === undefined || typeof o.from === "string") &&
          (o.note === undefined || typeof o.note === "string")
        );
      default:
        return false;
    }
  };
  return input.filter(ok);
}

/** Model Responsibility：由 model_handoff 事件推出每段 token 的归属模型。
 *  交接不是瞬时事件而是责任边界——「前 80 个 token 是谁写的」一眼可见。
 *  首个 handoff 之前的 token 归属未记录（model 为 null，如实呈现不猜测）。 */
export interface ModelSegment {
  /** 归属模型；null = trace 未记录该段归属 */
  model: string | null;
  /** 起始步（含） */
  fromStep: number;
  /** 结束步（含） */
  toStep: number;
}

export function modelSegments(
  events: AgentEvent[],
  stepCount: number,
): ModelSegment[] {
  if (stepCount <= 0) return [];
  const handoffs = events
    .filter((e): e is ModelHandoffEvent => e.type === "model_handoff")
    .sort((a, b) => a.atStep - b.atStep);
  if (handoffs.length === 0) return [];
  const segs: ModelSegment[] = [];
  if (handoffs[0].atStep > 0)
    segs.push({ model: null, fromStep: 0, toStep: handoffs[0].atStep - 1 });
  for (let i = 0; i < handoffs.length; i++) {
    const from = handoffs[i].atStep;
    const to =
      i + 1 < handoffs.length ? handoffs[i + 1].atStep - 1 : stepCount - 1;
    if (to >= from) segs.push({ model: handoffs[i].to, fromStep: from, toStep: to });
  }
  return segs;
}

/** 按锚定步分组（时间线插播渲染用），组内保持原顺序 */
export function agentEventsByStep(
  events: AgentEvent[],
): Map<number, AgentEvent[]> {
  const m = new Map<number, AgentEvent[]>();
  for (const e of events) {
    const list = m.get(e.atStep) ?? [];
    list.push(e);
    m.set(e.atStep, list);
  }
  return m;
}
