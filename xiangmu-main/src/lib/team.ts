/** AVP · Agent Visual Protocol 数据层（S6-1/2/3/6，协议见 docs/architecture/AVP.md）。
 *  把真实发生的子运行（检索/规划/交接/主生成）构造成 Team 视图模型：
 *  Worker（角色优先、永不消失）· Artifact（统一交付物）· Handoff（必带 reason）· Mission（任务阶段）。
 *  一切由真实事件构造：没发生的 Worker 不出现，失败如实入档，缺失字段「未记录」不脑补。 */

import type { AgentEvent } from "./agentTrace";
import type { RetrievalRecord } from "./agentRun";

/** 角色白名单（AVP §2）：角色优先，模型其次；新增角色须入协议 */
export type WorkerRole =
  | "planner"
  | "researcher"
  | "executor"
  | "reviewer"
  | "tool"
  | "memory";

export const ROLE_LABEL: Record<WorkerRole, string> = {
  planner: "Planner · 规划",
  researcher: "Researcher · 检索",
  executor: "Executor · 执行",
  reviewer: "Reviewer · 审校",
  tool: "Tool · 工具",
  memory: "Memory · 记忆",
};

/** Worker 生命周期六态 + 失败（AVP §2）；不许只有 Running/Finished */
export type WorkerStatus =
  | "waiting"
  | "preparing"
  | "running"
  | "output"
  | "handing_off"
  | "finished"
  | "failed";

export const STATUS_LABEL: Record<WorkerStatus, string> = {
  waiting: "等待中",
  preparing: "准备中",
  running: "工作中",
  output: "产出中",
  handing_off: "交接中",
  finished: "已完成",
  failed: "失败",
};

export interface TeamWorker {
  id: string;
  role: WorkerRole;
  /** 承担者（模型名 / 浏览器 / 工具名）；未记录则 undefined，如实缺席 */
  model?: string;
  status: WorkerStatus;
  /** 一行真实读数（耗时/条数/步数），无则不显示 */
  detail?: string;
}

/** Artifact 统一交付物（AVP §4）：页面传递的不是模型，是 Artifact */
export type ArtifactType =
  | "plan"
  | "search_result"
  | "context"
  | "tool_result"
  | "memory"
  | "summary"
  | "answer";

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  plan: "PLAN · 行动计划",
  search_result: "SEARCH · 检索结果",
  context: "CONTEXT · 上下文",
  tool_result: "TOOL · 工具返回",
  memory: "MEMORY · 记忆",
  summary: "SUMMARY · 摘要",
  answer: "ANSWER · 回答",
};

export interface TeamArtifact {
  id: string;
  type: ArtifactType;
  /** 产出方 worker id */
  producer: string;
  /** 原文，不清洗不改写 */
  content: string;
  /** 真实耗时（有记录才有） */
  durationMs?: number;
  ok: boolean;
}

/** Handoff：每次控制权转移必须回答「为什么」（AVP §3） */
export interface TeamHandoff {
  from: string;
  to: string;
  /** 真实原因；外部 trace 缺失时由 UI 显示「交接原因未记录」 */
  reason?: string;
  /** 交付物 id；没有真实交付物就不画流 */
  artifactId?: string;
}

/** Mission Progress（AVP §5）：任务阶段替代 token 步数 */
export interface MissionStage {
  key: string;
  label: string;
  status: "done" | "active" | "pending" | "failed";
}

export interface TeamState {
  workers: TeamWorker[];
  artifacts: TeamArtifact[];
  handoffs: TeamHandoff[];
  mission: MissionStage[];
  /** 当前执行者 worker id；全部结束时 null */
  currentOwner: string | null;
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** 实时运行输入：全部来自本次 Run 真实发生的子运行状态 */
export interface LiveTeamInput {
  /** 检索子运行（webOn 且真实发起时才有） */
  research?: {
    status: "running" | "done" | "failed";
    query: string;
    resultCount?: number;
    keptCount?: number;
    durationMs?: number;
    error?: string;
  };
  /** 规划子运行（agentOn 且真实发起时才有） */
  plan?: {
    status: "running" | "done" | "empty" | "failed";
    planner: string;
    text: string;
    durationMs: number | null;
    error?: string | null;
  };
  /** 主生成（执行者）：永远存在 */
  executor: {
    model: string;
    /** 已产出 token 数 */
    steps: number;
    phase: "waiting" | "running" | "done";
    /** 平均耗时读数（真实统计，可选） */
    detail?: string;
  };
}

/** 由实时运行状态构建 Team（AVP §2 铁律：真实发生的 Worker 永不消失，只变状态） */
export function buildLiveTeam(input: LiveTeamInput): TeamState {
  const workers: TeamWorker[] = [];
  const artifacts: TeamArtifact[] = [];
  const handoffs: TeamHandoff[] = [];

  const r = input.research;
  if (r) {
    workers.push({
      id: "researcher",
      role: "researcher",
      model: "浏览器 · 联网检索",
      status:
        r.status === "running"
          ? "running"
          : r.status === "failed"
            ? "failed"
            : "finished",
      detail:
        r.status === "done" && r.resultCount !== undefined
          ? `${r.resultCount} 条结果${
              r.keptCount !== undefined ? ` · 选用 ${r.keptCount} 条` : ""
            }${r.durationMs !== undefined ? ` · ${fmtMs(r.durationMs)}` : ""}`
          : r.status === "failed"
            ? (r.error ?? "检索失败")
            : undefined,
    });
    if (r.status === "done") {
      artifacts.push({
        id: "a-search",
        type: "search_result",
        producer: "researcher",
        content: `查询：${r.query}\n${r.resultCount ?? 0} 条结果，选用前 ${
          r.keptCount ?? 0
        } 条进入上下文（其余因上下文预算未采用）`,
        durationMs: r.durationMs,
        ok: true,
      });
      handoffs.push({
        from: "researcher",
        to: input.plan ? "planner" : "executor",
        reason: "检索完成：结果进入上下文，需要继续作答",
        artifactId: "a-search",
      });
    } else if (r.status === "failed") {
      artifacts.push({
        id: "a-search",
        type: "search_result",
        producer: "researcher",
        content: r.error ?? "检索失败（错误原文未记录）",
        durationMs: r.durationMs,
        ok: false,
      });
      handoffs.push({
        from: "researcher",
        to: input.plan ? "planner" : "executor",
        reason: "检索失败：降级为直接作答（失败已如实入档）",
        artifactId: "a-search",
      });
    }
  }

  const p = input.plan;
  if (p) {
    workers.push({
      id: "planner",
      role: "planner",
      model: p.planner,
      status:
        p.status === "running"
          ? "running"
          : p.status === "failed"
            ? "failed"
            : "finished",
      detail:
        p.status === "running"
          ? "正在制定计划"
          : p.durationMs !== null
            ? fmtMs(p.durationMs)
            : undefined,
    });
    if (p.status === "done") {
      artifacts.push({
        id: "a-plan",
        type: "plan",
        producer: "planner",
        content: p.text,
        durationMs: p.durationMs ?? undefined,
        ok: true,
      });
      handoffs.push({
        from: "planner",
        to: "executor",
        reason: "计划完成：正式回答需要逐 token 生成（Need answer generation）",
        artifactId: "a-plan",
      });
    } else if (p.status === "empty") {
      artifacts.push({
        id: "a-plan",
        type: "plan",
        producer: "planner",
        content:
          "规划子运行未产出计划文本（思考段未闭合或为空），本次按原问题直接作答",
        durationMs: p.durationMs ?? undefined,
        ok: false,
      });
      handoffs.push({
        from: "planner",
        to: "executor",
        reason: "计划为空：降级为按原问题直接作答（如实记录）",
        artifactId: "a-plan",
      });
    } else if (p.status === "failed") {
      artifacts.push({
        id: "a-plan",
        type: "plan",
        producer: "planner",
        content: p.error ?? "规划子运行失败（错误原文未记录）",
        durationMs: p.durationMs ?? undefined,
        ok: false,
      });
      handoffs.push({
        from: "planner",
        to: "executor",
        reason: "规划失败：降级为按原问题直接作答（失败已如实入档）",
        artifactId: "a-plan",
      });
    }
  }

  const ex = input.executor;
  workers.push({
    id: "executor",
    role: "executor",
    model: ex.model,
    status:
      ex.phase === "done"
        ? "finished"
        : ex.phase === "running"
          ? ex.steps > 0
            ? "running"
            : "preparing"
          : "waiting",
    detail:
      ex.steps > 0
        ? `第 ${ex.steps} 个 token${ex.detail ? ` · ${ex.detail}` : ""}`
        : ex.phase === "waiting" && input.plan
          ? "等待计划 · 拿到后开始作答"
          : undefined,
  });
  if (ex.phase === "done" && ex.steps > 0) {
    artifacts.push({
      id: "a-answer",
      type: "answer",
      producer: "executor",
      content: `${ex.steps} 个 token（正文见主舞台）`,
      ok: true,
    });
  }

  // 当前执行者：第一个 running/preparing 的 worker；否则 null
  const current =
    workers.find((w) => w.status === "running" || w.status === "preparing")
      ?.id ?? null;

  return {
    workers,
    artifacts,
    handoffs,
    mission: buildMission(input),
    currentOwner: current,
  };
}

/** Mission Progress：阶段全部由真实子运行推导，没有的阶段不出现（诚实缺席） */
function buildMission(input: LiveTeamInput): MissionStage[] {
  const stages: MissionStage[] = [];
  const r = input.research;
  const p = input.plan;
  const ex = input.executor;
  if (r)
    stages.push({
      key: "search",
      label: "检索",
      status:
        r.status === "running"
          ? "active"
          : r.status === "failed"
            ? "failed"
            : "done",
    });
  if (p)
    stages.push({
      key: "plan",
      label: "规划",
      status:
        p.status === "running"
          ? "active"
          : p.status === "failed" || p.status === "empty"
            ? "failed"
            : "done",
    });
  stages.push({
    key: "write",
    label: "作答",
    status:
      ex.phase === "done"
        ? "done"
        : ex.phase === "running"
          ? "active"
          : "pending",
  });
  stages.push({
    key: "finish",
    label: "完成",
    status: ex.phase === "done" ? "done" : "pending",
  });
  return stages;
}

/** 从已完成 trace 的 agent 事件重建 Team（完成态/存档/回放用，S6-9）。
 *  只消费真实记录：plan 工具事件 → Planner+Artifact(plan)；web_search → Researcher+Artifact(search)；
 *  model_handoff → Handoff（reason 原文，缺失如实缺）；正文 → Executor+Artifact(answer)。 */
export function teamFromTrace(
  events: AgentEvent[],
  opts: { executorModel: string; steps: number },
): TeamState {
  const workers: TeamWorker[] = [];
  const artifacts: TeamArtifact[] = [];
  const handoffs: TeamHandoff[] = [];
  const mission: MissionStage[] = [];

  const searchResult = events.find(
    (e) => e.type === "tool_result" && e.tool === "web_search",
  );
  if (searchResult && searchResult.type === "tool_result") {
    workers.push({
      id: "researcher",
      role: "researcher",
      model: "浏览器 · 联网检索",
      status: searchResult.ok ? "finished" : "failed",
      detail: fmtMs(searchResult.durationMs),
    });
    artifacts.push({
      id: "a-search",
      type: "search_result",
      producer: "researcher",
      content: searchResult.output,
      durationMs: searchResult.durationMs,
      ok: searchResult.ok,
    });
    handoffs.push({
      from: "researcher",
      to: events.some((e) => e.type === "tool_result" && e.tool === "plan")
        ? "planner"
        : "executor",
      reason: searchResult.ok
        ? "检索完成：结果进入上下文，需要继续作答"
        : "检索失败：降级为直接作答（失败已如实入档）",
      artifactId: "a-search",
    });
    mission.push({
      key: "search",
      label: "检索",
      status: searchResult.ok ? "done" : "failed",
    });
  }

  const planResult = events.find(
    (e) => e.type === "tool_result" && e.tool === "plan",
  );
  if (planResult && planResult.type === "tool_result") {
    workers.push({
      id: "planner",
      role: "planner",
      model: planResult.model,
      status: planResult.ok ? "finished" : "failed",
      detail: fmtMs(planResult.durationMs),
    });
    artifacts.push({
      id: "a-plan",
      type: "plan",
      producer: "planner",
      content: planResult.output,
      durationMs: planResult.durationMs,
      ok: planResult.ok,
    });
    const handoffEvent = events.find((e) => e.type === "model_handoff");
    handoffs.push({
      from: "planner",
      to: "executor",
      reason:
        (handoffEvent?.type === "model_handoff"
          ? handoffEvent.reason
          : undefined) ??
        (planResult.ok
          ? "计划完成：正式回答需要逐 token 生成（Need answer generation）"
          : "规划未产出可用计划：降级为按原问题直接作答"),
      artifactId: "a-plan",
    });
    mission.push({
      key: "plan",
      label: "规划",
      status: planResult.ok ? "done" : "failed",
    });
  }

  workers.push({
    id: "executor",
    role: "executor",
    model: opts.executorModel,
    status: "finished",
    detail: `${opts.steps} tokens`,
  });
  if (opts.steps > 0)
    artifacts.push({
      id: "a-answer",
      type: "answer",
      producer: "executor",
      content: `${opts.steps} 个 token（正文见主舞台）`,
      ok: true,
    });
  mission.push({ key: "write", label: "作答", status: "done" });
  mission.push({ key: "finish", label: "完成", status: "done" });

  return { workers, artifacts, handoffs, mission, currentOwner: null };
}

/** 检索记录 → 简明摘要（Artifact Viewer 展开时用；原始记录仍在 RetrievalCard/trace） */
export function retrievalSummary(rec: RetrievalRecord): string {
  const kept = rec.selected.length;
  const lines = rec.results.map((r, i) => {
    const used = rec.selected.includes(i);
    return `${used ? "✔ 选用" : "✗ 未采用"} ${r.title}`;
  });
  return `查询：${rec.query}\n${rec.results.length} 条结果 · 选用 ${kept} 条：\n${lines.join("\n")}`;
}
