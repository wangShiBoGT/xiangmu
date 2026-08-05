import { useMemo, useState } from "react";
import type { ExperimentRecord } from "../lib/experiments";
import { getModel } from "../lib/models";
import { exportReplay } from "../lib/trace";
import { buildStoryChapters } from "../lib/storyChapters";
import {
  answerStart,
  CONFIDENCE_LEGEND,
  plainSpeed,
  thinkingStepCount,
} from "../lib/plainWords";
import ConfidenceText from "./ConfidenceText";
import TraceFingerprint from "./TraceFingerprint";

/** 档案对话页：点开一张档案卡片后先看到「一段对话」。
 *  上半部 = 问题气泡 + 着色回答气泡（思考段折叠）；
 *  中部 = 这次运行的故事章节（全部来自 trace 实录）；
 *  下半部 = 动作卡；专业视图（指纹/参数核验）默认折叠，不删除。 */
export default function RunStoryPage({
  rec,
  comparable,
  onBack,
  onOpen,
  onCompare,
  onStar,
  onDelete,
}: {
  rec: ExperimentRecord;
  /** 严格可比较的最近一条 run（无则不显示比较入口） */
  comparable: ExperimentRecord | null;
  onBack: () => void;
  /** 进入实验台回放该 run（可带起始步） */
  onOpen: (stepIndex: number | null) => void;
  onCompare: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  const [showThinking, setShowThinking] = useState(false);
  const [showPro, setShowPro] = useState(false);

  const trace = rec.root.trace;
  const steps = useMemo(() => trace?.steps ?? [], [trace]);
  const ansStart = useMemo(() => answerStart(steps), [steps]);
  const thinkCount = useMemo(() => thinkingStepCount(steps), [steps]);
  const chapters = useMemo(
    () => (trace ? buildStoryChapters(trace) : []),
    [trace],
  );
  const speed = plainSpeed(rec.stats.avgTps);

  const exportFile = () => {
    if (!trace) return;
    const blob = new Blob(
      [exportReplay(trace, rec.prompt, rec.ruleset, rec.root.children)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "trace"}.aitrace`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-obs text-obs-ink">
      <div className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-8">
        <button
          type="button"
          className="text-[13px] text-obs-ink2 transition-colors hover:text-obs-ink"
          onClick={onBack}
        >
          ← 全部档案
        </button>

        {/* 对话 */}
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-md rounded-tr-sm bg-measure-500/15 px-4 py-3 text-[14px] leading-[1.9] text-obs-ink">
              {rec.prompt}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-md rounded-tl-sm border border-obs-line bg-obs-2 px-4 py-3">
              {thinkCount > 0 && (
                <div className="mb-2">
                  <button
                    type="button"
                    className="text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
                    onClick={() => setShowThinking((v) => !v)}
                  >
                    它先想了 {thinkCount} 步 {showThinking ? "▾ 收起" : "▸ 展开"}
                  </button>
                  {showThinking && (
                    <p className="mt-2 border-l-2 border-obs-line pl-3 text-[13px] leading-[1.9] text-obs-ink2/80">
                      {steps
                        .slice(0, ansStart)
                        .map((s) => s.text)
                        .join("")
                        .replace(/<\/?think>/g, "")}
                    </p>
                  )}
                </div>
              )}
              {ansStart < steps.length ? (
                <p className="text-[14px] leading-[2]">
                  <ConfidenceText steps={steps} from={ansStart} />
                </p>
              ) : (
                <p className="text-[13px] text-obs-ink2">
                  这次运行没有正式回答段（思考未收束或记录不完整）。
                </p>
              )}
              <p className="mt-2.5 border-t border-obs-line pt-2 text-[11px] text-obs-ink2/70">
                {CONFIDENCE_LEGEND}
              </p>
            </div>
          </div>
        </div>

        {/* 人话徽章 */}
        <p className="mt-4 text-[12px] text-obs-ink2">
          {getModel(rec.modelId)?.name ?? rec.modelId} ·{" "}
          {new Date(rec.createdAt).toLocaleString()} · {rec.stats.tokens} 个词
          {speed ? ` · ${speed}` : ""}
          {rec.starred ? " · ★ 已星标" : ""}
        </p>

        {/* 故事章节 */}
        {chapters.length > 0 && (
          <section className="mt-8 rounded-md border border-obs-line bg-obs-2/60 p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
              这次运行的故事 · 全部来自实录
            </h3>
            <ol className="mt-3 space-y-2.5">
              {chapters.map((c) => (
                <li key={c.key} className="flex items-baseline gap-3">
                  <span className="shrink-0 text-[13px] font-medium text-amber-200/90">
                    {c.title}
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-[13px] leading-[1.8] text-obs-ink2 transition-colors hover:text-obs-ink"
                    onClick={() => onOpen(c.fromStep)}
                    title="进入实验台定位这一段"
                  >
                    {c.narration}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 动作卡 */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-md border border-measure-400/50 bg-measure-500/10 p-4 text-left transition-colors hover:bg-measure-500/20"
            onClick={() => onOpen(null)}
          >
            <p className="text-[14px] font-medium text-obs-ink">▶ 回放这次运行</p>
            <p className="mt-1 text-[12px] text-obs-ink2">
              进入实验台，逐词回放它的每一次选择，还能从任一步分岔重写。
            </p>
          </button>
          {comparable && (
            <button
              type="button"
              className="rounded-md border border-obs-line bg-obs-2 p-4 text-left transition-colors hover:border-obs-ink2/50"
              onClick={onCompare}
            >
              <p className="text-[14px] font-medium text-obs-ink">⇆ 与另一次对比</p>
              <p className="mt-1 text-[12px] text-obs-ink2">
                同一问题的两次运行并排同步回放，看它们从哪一步分道扬镳。
              </p>
            </button>
          )}
          <button
            type="button"
            className="rounded-md border border-obs-line bg-obs-2 p-4 text-left transition-colors hover:border-obs-ink2/50"
            onClick={exportFile}
          >
            <p className="text-[14px] font-medium text-obs-ink">⤓ 导出运行档案</p>
            <p className="mt-1 text-[12px] text-obs-ink2">
              .aitrace 文件，包含每一步的候选与概率，可在任何设备回放。
            </p>
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-md border border-obs-line bg-obs-2 p-4 text-left transition-colors hover:border-obs-ink2/50"
              onClick={onStar}
            >
              <p className="text-[14px] font-medium text-obs-ink">
                {rec.starred ? "☆ 取消星标" : "★ 星标"}
              </p>
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-obs-line bg-obs-2 p-4 text-left transition-colors hover:border-red-400/50"
              onClick={onDelete}
            >
              <p className="text-[14px] font-medium text-red-400/80">✕ 删除</p>
            </button>
          </div>
        </div>

        {/* 专业视图（默认折叠，不删除） */}
        <div className="mt-8">
          <button
            type="button"
            className="text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
            onClick={() => setShowPro((v) => !v)}
          >
            专业视图 · trace 指纹与参数核验 {showPro ? "▾" : "▸"}
          </button>
          {showPro && (
            <div className="mt-3 rounded-md border border-obs-line bg-obs-2/60 p-4">
              <TraceFingerprint
                steps={steps}
                forkSteps={rec.root.children.map((c) => c.forkStep)}
                onStepClick={(step) => onOpen(step)}
              />
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] text-obs-ink2 sm:grid-cols-3">
                <div className="flex justify-between gap-2">
                  <dt>后端</dt>
                  <dd className="text-obs-ink">{rec.device ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>采样</dt>
                  <dd className="text-obs-ink">
                    T {rec.params.temperature} · top-p {rec.params.topP}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt title="随机种子（同种子可复现）">seed</dt>
                  <dd className="text-obs-ink">{rec.seed ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>prompt tokens</dt>
                  <dd className="text-obs-ink">{trace?.promptIds.length ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>生成步数</dt>
                  <dd className="text-obs-ink">{rec.stats.tokens}</dd>
                </div>
                {trace?.pipeline && (
                  <div className="flex justify-between gap-2">
                    <dt>TTFT (prefill)</dt>
                    <dd className="text-obs-ink">
                      {trace.pipeline.prefillMs.toFixed(0)} ms
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
