/** AI Team 协作流（AVP · S6-2/3/4/5/6/7/8，协议见 docs/architecture/AVP.md）。
 *  主舞台是 Pipeline 不是 Card：Worker（角色优先、永不消失）沿纵向流水线排布，
 *  Artifact 卡沿连接线「流」向下一个 Worker（视觉语法 Flow），每次交接展示真实 reason。
 *  一切内容来自真实子运行：计划原文、检索取舍、实测耗时；失败变红不隐藏（P25）。 */

import { useEffect, useRef, useState } from "react";
import { splitThinking } from "../lib/thinking";
import {
  ROLE_LABEL,
  STATUS_LABEL,
  ARTIFACT_LABEL,
  type TeamState,
  type TeamWorker,
  type TeamArtifact,
  type MissionStage,
} from "../lib/team";

/** 规划子运行的实时流（运行中把计划 token 逐字流进 Planner 行） */
export interface PlanLive {
  text: string;
  status: "running" | "done" | "empty" | "failed";
  startedAt: number;
  durationMs: number | null;
  error?: string | null;
}

function fmtSec(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** 规划实时流：<think> 长文折叠成一行摘要（可展开），正文流式区自动滚动。
 *  折叠只改展示密度，不删一个字——展开即见推理全文（真实输出，不改写） */
function PlanLiveText({ text }: { text: string }) {
  const [thinkOpen, setThinkOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text, thinkOpen]);
  const parts = splitThinking(text);
  const thinking = parts.thinking?.trim() ?? "";
  return (
    <div
      ref={boxRef}
      className="max-h-[40vh] min-h-[64px] overflow-y-auto rounded-md border border-obs-line bg-obs/60 px-3 py-2"
    >
      {thinking && (
        <div className="mb-1">
          <button
            type="button"
            aria-expanded={thinkOpen}
            aria-label={thinkOpen ? "收起推理全文" : "展开推理全文"}
            className="rounded-md border border-dashed border-obs-line/70 px-2 py-0.5 text-[11px] text-obs-ink2/80 transition-colors hover:text-obs-ink"
            onClick={() => setThinkOpen((v) => !v)}
          >
            {parts.done ? "推理完成" : "推理中…"}（{thinking.length} 字）
            {thinkOpen ? " 收起 ▾" : " 展开 ▸"}
          </button>
          {thinkOpen && (
            <p className="mt-1 text-[11px] leading-relaxed whitespace-pre-wrap text-obs-ink2/75">
              {thinking}
            </p>
          )}
        </div>
      )}
      {(parts.answer || !thinking) && (
        <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-obs-ink/90">
          {parts.answer || text}
          <span className="ml-0.5 inline-block h-3 w-[2px] bg-measure-300 align-middle" />
        </p>
      )}
      {thinking && !parts.answer && (
        <p className="text-[11px] text-obs-ink2/60">
          推理结束后，计划正文会在这里逐字流出
        </p>
      )}
    </div>
  );
}

const STATUS_DOT: Record<TeamWorker["status"], string> = {
  waiting: "bg-obs-ink2/40",
  preparing: "bg-measure-300",
  running: "bg-measure-300",
  output: "bg-emerald-300",
  handing_off: "bg-amber-300",
  finished: "bg-emerald-400",
  failed: "bg-red-400",
};

/** Mission Progress（S6-6）：任务阶段替代 token 步数 */
function MissionRow({ mission }: { mission: MissionStage[] }) {
  if (mission.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
      aria-label="任务进度"
    >
      {mission.map((m, i) => (
        <span key={m.key} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[11px] text-obs-ink2/40">→</span>}
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] ${
              m.status === "done"
                ? "bg-emerald-500/15 text-emerald-200"
                : m.status === "active"
                  ? "bg-measure-500/20 text-measure-200"
                  : m.status === "failed"
                    ? "bg-red-500/15 text-red-200"
                    : "bg-obs-ink2/10 text-obs-ink2/60"
            }`}
          >
            {m.label}
            {m.status === "done" && " ✓"}
          </span>
        </span>
      ))}
    </div>
  );
}

/** TEAM 常驻名册（S6-5）：全部 Worker 一直在场，只以状态区分——完成变灰不消失 */
export function TeamPanel({ team }: { team: TeamState }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="AI 团队">
      <span className="text-[11px] font-medium tracking-[0.18em] text-obs-ink2/60 select-none">
        TEAM
      </span>
      {team.workers.map((w) => (
        <span
          key={w.id}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] ${
            team.currentOwner === w.id
              ? "border-measure-400/50 bg-measure-500/10 text-obs-ink"
              : "border-obs-line bg-obs-2/60 text-obs-ink2/70"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[w.status]}`} />
          {ROLE_LABEL[w.role].split(" ·")[0]}
          {w.model && <span className="text-obs-ink2/50">{w.model}</span>}
        </span>
      ))}
    </div>
  );
}

/** Artifact 统一卡片（S6-3）+ 点击展开全文（S6-8 Artifact Viewer） */
function ArtifactCard({
  artifact,
  handoff,
  flowing,
}: {
  artifact: TeamArtifact;
  /** 对应的交接；无交接（如最终回答）不显示原因行 */
  handoff?: { reason?: string };
  /** 正在交接：连接线上流动光点 */
  flowing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const preview =
    artifact.content.length > 120 && !open
      ? `${artifact.content.slice(0, 120)}…`
      : artifact.content;
  return (
    <div className="team-artifact-in relative ml-[9px] border-l border-dashed border-obs-line pb-1 pl-4">
      {flowing && <span className="team-flow-dot" aria-hidden />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full rounded-md border px-3 py-2 text-left transition-colors hover:border-measure-400/40 ${
          artifact.ok
            ? "border-obs-line bg-obs/60"
            : "border-red-400/30 bg-red-500/5"
        }`}
        title={open ? "收起" : "点击查看交付内容全文"}
      >
        <p className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[11px] font-medium tracking-[0.14em] ${
              artifact.ok ? "text-measure-300/90" : "text-red-300/90"
            }`}
          >
            {ARTIFACT_LABEL[artifact.type]}
            {!artifact.ok && " · 失败"}
          </span>
          {artifact.durationMs !== undefined && (
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-obs-ink2/60">
              {fmtSec(artifact.durationMs)}
            </span>
          )}
        </p>
        <p
          className={`mt-1 text-[11px] leading-relaxed whitespace-pre-wrap ${
            artifact.ok ? "text-obs-ink/85" : "text-red-200/85"
          } ${open ? "max-h-56 overflow-y-auto" : ""}`}
        >
          {preview}
        </p>
        {artifact.content.length > 120 && (
          <p className="mt-1 text-[11px] text-obs-ink2/50">
            {open ? "点击收起" : "点击展开全文"}
          </p>
        )}
      </button>
      {handoff &&
        (handoff.reason !== undefined ? (
          <p className="mt-1 pl-1 text-[11px] text-obs-ink2/70">
            <span className="text-amber-300/80">交接原因</span> · {handoff.reason}
          </p>
        ) : (
          <p className="mt-1 pl-1 text-[11px] text-obs-ink2/45">
            交接原因未记录（外部 trace 缺失，不猜测）
          </p>
        ))}
    </div>
  );
}

/** Worker 行（S6-1/2）：角色优先、模型其次，六态生命周期，一行真实读数 */
function WorkerRow({
  worker,
  current,
  children,
}: {
  worker: TeamWorker;
  current: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
          current
            ? "border-measure-400/50 bg-measure-500/10"
            : worker.status === "failed"
              ? "border-red-400/30 bg-obs-2/70"
              : "border-obs-line bg-obs-2/70"
        } ${worker.status === "finished" ? "opacity-75" : ""}`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[worker.status]}`}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-[12px] font-medium text-obs-ink">
            {ROLE_LABEL[worker.role]}
            {worker.model && (
              <span className="truncate text-[11px] font-normal text-obs-ink2/70">
                {worker.model}
              </span>
            )}
          </p>
          {worker.detail && (
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-obs-ink2/60">
              {worker.detail}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] ${
            worker.status === "failed"
              ? "bg-red-500/15 text-red-200"
              : worker.status === "finished"
                ? "bg-emerald-500/10 text-emerald-200/80"
                : current
                  ? "bg-measure-500/20 text-measure-200"
                  : "bg-obs-ink2/10 text-obs-ink2/60"
          }`}
        >
          {STATUS_LABEL[worker.status]}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Team 协作流主舞台（Pipeline，不是 Card） */
export default function TeamFlow({
  team,
  planLive,
  compact,
}: {
  team: TeamState;
  /** 规划子运行实时流：运行中在 Planner 行内逐字显示计划输出 */
  planLive?: PlanLive | null;
  /** 紧凑模式（完成态回看）：不显示 TEAM 名册标题区 */
  compact?: boolean;
}) {
  // 规划运行中读秒（真实时钟）
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (planLive?.status !== "running") return;
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, [planLive?.status]);

  return (
    <section
      aria-label="AI 团队协作流"
      className="mx-auto w-[min(720px,92vw)] rounded-md border-2 border-obs-line bg-obs-2 px-4 py-3 text-left shadow-float"
    >
      {!compact && (
        <div className="mb-2 flex flex-col gap-1.5">
          <TeamPanel team={team} />
          <MissionRow mission={team.mission} />
        </div>
      )}
      {compact && (
        <div className="mb-2">
          <MissionRow mission={team.mission} />
        </div>
      )}

      <div className="space-y-1">
        {team.workers.map((w) => {
          const produced = team.artifacts.filter((a) => a.producer === w.id);
          const isPlannerLive =
            w.id === "planner" && planLive?.status === "running";
          return (
            <WorkerRow key={w.id} worker={w} current={team.currentOwner === w.id}>
              {/* 规划运行中：真实输出流逐字上台 + 读秒 */}
              {isPlannerLive && planLive && (
                <div className="mt-1 ml-[9px] border-l border-dashed border-obs-line pl-4">
                  {planLive.text ? (
                    <PlanLiveText text={planLive.text} />
                  ) : (
                    <div className="rounded-md border border-obs-line bg-obs/60 px-3 py-2">
                      <p className="text-[11px] text-obs-ink2/60">
                        正在唤醒规划模型…（下方将逐字流出它写的计划原文）
                      </p>
                    </div>
                  )}
                  <p className="mt-1 pl-1 font-mono text-[11px] tabular-nums text-obs-ink2/50">
                    已思考 {fmtSec(Math.max(0, now - planLive.startedAt))} ·
                    计划逐字流出（真实生成）
                  </p>
                </div>
              )}
              {/* 产出的 Artifact 沿连接线流向下一个 Worker（S6-3/4） */}
              {produced.map((a) => {
                const handoff = team.handoffs.find(
                  (h) => h.artifactId === a.id,
                );
                const target = handoff
                  ? team.workers.find((x) => x.id === handoff.to)
                  : undefined;
                return (
                  <ArtifactCard
                    key={a.id}
                    artifact={a}
                    handoff={handoff}
                    flowing={
                      target !== undefined &&
                      (target.status === "running" ||
                        target.status === "preparing" ||
                        target.status === "waiting")
                    }
                  />
                );
              })}
            </WorkerRow>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-obs-ink2/45">
        团队成员、交付物与交接原因均来自本次真实子运行，全部记入 trace
      </p>
    </section>
  );
}
