import { useEffect, useMemo, useState } from "react";
import { listExperiments, type ExperimentRecord } from "../lib/experiments";
import {
  buildWorkflowStages,
  EVIDENCE_LABEL,
  type WorkflowStage,
} from "../lib/workflowStages";
import type { DeviceReport } from "../lib/device";
import { getModel } from "../lib/models";
import ProbabilityStrip from "./ProbabilityStrip";
import { loadDemoTrace, type DemoTrace } from "../lib/demoTrace";
import { buildStoryChapters } from "../lib/storyChapters";
import {
  answerExcerpt,
  CONFIDENCE_LEGEND,
  plainSpeed,
} from "../lib/plainWords";
import ConfidenceText from "./ConfidenceText";

/** 预置示例问题（点一下就跑，不让空输入框劈用户） */
const EXAMPLE_PROMPTS = [
  "用一句话解释为什么天空是蓝色的",
  "写一首关于秋天的五言绝句",
  "猫为什么喜欢晒太阳？",
];

/** AI Workspace · 控制台首页。
 *  硬判据：遮住输入框页面依然成立——没有输入也能看设备状态、历史存档、
 *  最近一次运行的阶段与性能。输入框只是启动一次 Run 的入口，不是主角。 */
export default function WorkspacePage({
  report,
  device,
  modelReady,
  modelId,
  onAsk,
  onOpenRecord,
  onGoArchive,
  onGoBenchmark,
  onGoDiscover,
  onWatchDemo,
  onGoJourney,
  onGoStatistics,
  onWantModel,
}: {
  report: DeviceReport | null;
  device: string | null;
  modelReady: boolean;
  modelId: string;
  /** 启动一次 Run：跳到显微镜层并自动开跑 */
  onAsk: (prompt: string) => void;
  /** 打开某次存档运行（进入显微镜层回放） */
  onOpenRecord: (rec: ExperimentRecord) => void;
  onGoArchive: () => void;
  onGoBenchmark: () => void;
  onGoDiscover: () => void;
  /** 看它思考一次：预录真实 trace 自动回放（零下载） */
  onWatchDemo: () => void;
  /** 理解层四幕旅程：看懂它怎么选词（演示模型真实数据） */
  onGoJourney: () => void;
  /** 本地统计面板 */
  onGoStatistics: () => void;
  /** 尚未加载模型时：回首屏选择模型 */
  onWantModel?: () => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null);
  const [input, setInput] = useState("");
  const [demo, setDemo] = useState<DemoTrace | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void listExperiments().then((rs) => {
      if (alive) setRecords(rs);
    });
    return () => {
      alive = false;
    };
  }, []);

  const latest = records?.[0] ?? null;
  const latestTrace = latest?.root.trace ?? null;

  // 没有任何存档时，hero 用预录的真实 trace（标注来源，不冒充用户自己的运行）
  useEffect(() => {
    if (records !== null && records.length === 0 && !demo) {
      void loadDemoTrace().then(setDemo).catch(() => {});
    }
  }, [records, demo]);

  const heroRec = latest ?? demo?.record ?? null;
  const heroSteps = useMemo(
    () => heroRec?.root.trace?.steps ?? [],
    [heroRec],
  );
  const heroEx = useMemo(() => answerExcerpt(heroSteps, 160), [heroSteps]);
  const pickedStep = picked !== null ? (heroSteps[picked] ?? null) : null;

  const storyLine = useMemo(() => {
    if (!latestTrace) return null;
    const ch = buildStoryChapters(latestTrace);
    if (ch.length === 0) return null;
    return ch.map((c) => c.title).join(" → ");
  }, [latestTrace]);

  const stages: WorkflowStage[] = useMemo(() => {
    if (!latestTrace) return [];
    return buildWorkflowStages({
      phase: "done",
      steps: latestTrace.steps,
      pipeline: latestTrace.pipeline,
      agent: latestTrace.agent,
    });
  }, [latestTrace]);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    if (!modelReady) {
      onWantModel?.();
      return;
    }
    onAsk(text);
  };

  const modelName = getModel(modelId)?.name ?? modelId;

  return (
    <div className="flex-1 overflow-y-auto bg-obs text-obs-ink">
      <div className="mx-auto max-w-[1040px] px-6 py-8">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/60 select-none">
          AI Workspace
        </p>
        <h2 className="text-[24px] font-semibold tracking-tight">
          AI 每写一个词，都在候选里选了一次
        </h2>
        <p className="mt-2 text-[13px] leading-[1.8] text-obs-ink2">
          每次选择都被如实录了下来，你可以回放它。下面这段回答的颜色就是证据——点任一个词，看它当时的候选。
        </p>

        {/* Hero：一段按真实把握度着色的回答 */}
        {heroRec && heroEx && (
          <div className="mt-5 rounded-md border border-obs-line bg-obs-2 p-5">
            <p className="text-[12px] text-obs-ink2">
              问：{heroRec.prompt}
              {!latest && demo && (
                <span className="ml-2 text-[11px] text-obs-ink2/70">{demo.label}</span>
              )}
            </p>
            <p className="mt-2 text-[16px] leading-[2]">
              <ConfidenceText
                steps={heroSteps}
                from={heroEx.from}
                to={heroEx.to}
                selected={picked}
                onTokenClick={(i) => setPicked(picked === i ? null : i)}
              />
              {heroEx.to < heroSteps.length - 1 && (
                <span className="text-obs-ink2">…</span>
              )}
            </p>
            {pickedStep && pickedStep.topk.length > 0 && (
              <div className="mt-3 rounded-md border border-obs-line bg-obs p-3">
                <p className="text-[11px] text-obs-ink2">
                  写到「{pickedStep.text.trim() || pickedStep.text}」时，它的候选（真实记录）：
                </p>
                <div className="mt-2 space-y-1">
                  {pickedStep.topk.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-[12px]">
                      <span
                        className={`w-16 shrink-0 truncate text-right font-mono ${
                          c.id === pickedStep.id ? "text-obs-ink" : "text-obs-ink2"
                        }`}
                      >
                        {c.text.replace(/\n/g, "⏎") || "␣"}
                      </span>
                      <ProbabilityStrip
                        value={c.prob}
                        tone={c.id === pickedStep.id ? "measure" : "neutral"}
                        showValue
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-obs-line pt-2.5">
              <p className="text-[11px] text-obs-ink2/70">{CONFIDENCE_LEGEND}</p>
              <span className="flex gap-2">
                <button
                  className="rounded-md border border-obs-line px-4 py-1.5 text-[12px] text-obs-ink transition-colors hover:bg-obs"
                  onClick={onGoJourney}
                >
                  看懂它怎么选词 · 四幕旅程
                </button>
                <button
                  className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
                  onClick={latest ? () => onOpenRecord(latest) : onWatchDemo}
                >
                  ▶ 看它思考一次（30 秒）
                </button>
              </span>
            </div>
          </div>
        )}

        {/* Ask AI：启动一次 Run 的入口 */}
        <div className="mt-6 flex items-center gap-2 rounded-md border border-obs-line bg-obs-2 p-2">
          <input
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] text-obs-ink placeholder:text-obs-ink2/50 focus:outline-none"
            placeholder={
              modelReady
                ? `给 ${modelName} 一个任务，观察它怎么完成…`
                : "先加载一个模型，再启动运行…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <button
            className="rounded-md bg-accent px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            disabled={modelReady && !input.trim()}
            onClick={modelReady ? submit : onWantModel}
          >
            {modelReady ? "▶ Run" : "加载模型"}
          </button>
        </div>

        {/* 示例问题 chips */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              className="whitespace-nowrap text-[12px] text-obs-ink2 underline decoration-obs-line underline-offset-4 transition-colors hover:text-obs-ink hover:decoration-obs-ink2"
              onClick={() => {
                if (modelReady) onAsk(p);
                else setInput(p);
              }}
            >
              {p}
            </button>
          ))}
          {!modelReady && (
            <span className="self-center text-[11px] text-obs-ink2/70">
              ← 想自己跑先加载一个模型；不想下载就点上面「看它思考一次」
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          {/* Current Run */}
          <section className="rounded-md border border-obs-line bg-obs-2 p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
              它刚才做了什么
            </h3>
            {latest ? (
              <div className="mt-3">
                <p className="truncate text-[16px] font-medium text-obs-ink">
                  {latest.name || latest.prompt}
                </p>
                {storyLine && (
                  <p className="mt-1.5 text-[12px] leading-[1.8] text-obs-ink2">
                    {storyLine}
                  </p>
                )}
                <p className="mt-1 font-mono text-[11px] tabular-nums text-obs-ink2">
                  {latest.stats.tokens} 个词 ·{" "}
                  {getModel(latest.modelId)?.name ?? latest.modelId} ·{" "}
                  {latest.device === "webgpu" ? "WebGPU" : "CPU"} · 随机种子{" "}
                  {latest.seed ?? "—"}
                  <span className="text-obs-ink2/60">（同种子可复现）</span>
                </p>
                <button
                  className="mt-3 rounded-md border border-obs-line px-4 py-1.5 text-[12px] text-obs-ink transition-colors hover:bg-obs"
                  onClick={() => onOpenRecord(latest)}
                >
                  回放这次运行 →
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-obs-ink2">
                还没有运行。点上面的示例问题，或先看一次演示（不用下载模型）。
              </p>
            )}
          </section>

          {/* Performance */}
          <section className="rounded-md border border-obs-line bg-obs-2 p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
              Performance
            </h3>
            <div className="mt-3 space-y-1.5 text-[13px]">
              <p className="flex items-center gap-2">
                <span className="text-obs-ink">
                  {device === "webgpu"
                    ? "WebGPU 就绪 · GPU 加速"
                    : device
                      ? "CPU (WASM) 模式"
                      : report?.webgpu
                        ? "WebGPU 可用 · 模型未加载"
                        : "WebGPU 不可用"}
                </span>
              </p>
              {report?.gpuInfo && (
                <p className="truncate font-mono text-[11px] text-obs-ink2">
                  {report.gpuInfo}
                </p>
              )}
              {(records ?? []).slice(0, 3).map((r) => (
                <p
                  key={r.id}
                  className="flex justify-between font-mono text-[11px] tabular-nums text-obs-ink2"
                >
                  <span className="truncate">{r.name || r.prompt}</span>
                  <span className="ml-3 shrink-0">
                    {plainSpeed(r.stats.avgTps) ?? "— 词/秒"}
                  </span>
                </p>
              ))}
            </div>
            <button
              className="mt-3 text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={onGoBenchmark}
            >
              查看成绩单 →
            </button>
            <button
              className="mt-3 ml-4 text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={onGoDiscover}
            >
              设备探测 →
            </button>
          </section>

          {/* Activity：最近一次运行的证据分级阶段 */}
          <section className="rounded-md border border-obs-line bg-obs-2 p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
              Activity · 上次运行的阶段
            </h3>
            {stages.length > 0 ? (
              <ol className="mt-3 space-y-1.5">
                {stages.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-baseline gap-2 text-[13px]"
                  >
                    <span
                      className={
                        s.status === "active"
                          ? "text-accent"
                          : s.status === "done"
                            ? "text-obs-ink"
                            : "text-obs-ink2/50"
                      }
                    >
                      {s.label}
                    </span>
                    {s.detail && (
                      <span className="font-mono text-[11px] tabular-nums text-obs-ink2">
                        {s.detail}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[11px] text-obs-ink2/60">
                      {EVIDENCE_LABEL[s.evidence]}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-[13px] text-obs-ink2">
                暂无运行。阶段清单由真实证据分级生成：事件记录 &gt; 结构边界 &gt;
                运行实测。
              </p>
            )}
          </section>

          {/* Trace 档案 */}
          <section className="rounded-md border border-obs-line bg-obs-2 p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-obs-ink2/60 select-none">
              运行档案 · Trace
            </h3>
            {records === null ? (
              <p className="mt-3 text-[13px] text-obs-ink2">读取存档中…</p>
            ) : records.length === 0 ? (
              <p className="mt-3 text-[13px] text-obs-ink2">
                还没有档案。每次运行都会自动保存，随时可回放。
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {records.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <button
                      className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-obs"
                      onClick={() => onOpenRecord(r)}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-obs-ink">
                        {r.name || r.prompt}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-obs-ink2">
                        {r.stats.tokens} tok ·{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="mt-3 text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={onGoArchive}
            >
              全部档案（{records?.length ?? 0}）→
            </button>
            <button
              className="mt-3 ml-4 text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={onGoStatistics}
            >
              📊 本地统计 →
            </button>
            <button
              className="mt-3 ml-4 text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={onWatchDemo}
            >
              ▶ 看一次演示（零下载）→
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
