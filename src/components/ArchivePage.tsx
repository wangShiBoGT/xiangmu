import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  compatKey,
  deleteExperiment,
  importReplay,
  listExperiments,
  saveExperiment,
  updateExperiment,
  type ExperimentRecord,
} from "../lib/experiments";
import { exportReplay } from "../lib/trace";
import { getModel } from "../lib/models";
import { setTraceFocus } from "../lib/traceFocus";
import { benchComparableGroups } from "../lib/behaviorBench";
import { CORE_RULES } from "../lib/rules";
import TraceFingerprint from "./TraceFingerprint";
import EvidencedClaim from "./EvidencedClaim";
import ArchiveCards from "./ArchiveCards";
import RunStoryPage from "./RunStoryPage";

// 比较视图含 three，懒加载：首次打开比较才下载
const CompareView = lazy(() => import("./CompareView"));

function collectForkSteps(rec: ExperimentRecord): number[] {
  return rec.root.children.map((c) => c.forkStep);
}

/** 同一实验家族（同模型·prompt·参数·后端）里最近两次 run 的首次分叉步；-1=完全一致，null=不足两条 */
function familyDivergence(runs: ExperimentRecord[]): number | -1 | null {
  if (runs.length < 2) return null;
  const a = runs[0].root.trace?.steps ?? [];
  const b = runs[1].root.trace?.steps ?? [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i].id !== b[i].id) return i;
  return a.length === b.length ? -1 : n;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Run Inspector：选中一条 run 时在图谱旁展开的核验面板 */
function RunInspector({
  rec,
  comparable,
  onOpen,
  onCompare,
  onStar,
  onDelete,
}: {
  rec: ExperimentRecord;
  /** 与该 run 严格可比较的最近一条 run（无则不显示比较入口） */
  comparable: ExperimentRecord | null;
  onOpen: () => void;
  onCompare: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  const trace = rec.root.trace;
  const steps = trace?.steps ?? [];
  const hasTopk = steps.some((s) => s.topk.length > 0);
  const completeness = [
    hasTopk ? `top-${Math.max(...steps.map((s) => s.topk.length), 0)} candidates` : null,
    steps.some((s) => s.entropy > 0) ? "entropy" : null,
    trace?.pipeline ? "pipeline timing" : null,
    rec.root.children.length > 0 ? "branch metadata" : null,
    rec.ruleset ? "ruleset" : null,
  ].filter((x): x is string => x !== null);

  const exportFile = () => {
    if (!trace) return;
    const blob = new Blob([exportReplay(trace, rec.prompt, rec.ruleset, rec.root.children)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "trace"}.aitrace`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="focus-lens-in w-full shrink-0 self-start rounded-md border border-obs-line bg-obs-2 p-4 md:w-[300px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        Run Inspector
      </p>
      <p className="mt-2 break-all text-[14px] font-medium text-obs-ink">{rec.name}</p>
      <dl className="mt-3 space-y-1.5 text-[12px] text-obs-ink2">
        <div className="flex justify-between gap-2">
          <dt>模型</dt>
          <dd className="text-right text-obs-ink">{getModel(rec.modelId)?.name ?? rec.modelId}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>后端</dt>
          <dd className="text-obs-ink">{rec.device ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>采样</dt>
          <dd className="text-obs-ink">
            T {rec.params.temperature} · top-p {rec.params.topP} · seed {rec.seed ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>prompt tokens</dt>
          <dd className="text-obs-ink">{trace?.promptIds.length ?? 0}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>生成</dt>
          <dd className="text-obs-ink">
            {rec.stats.tokens} steps
            {rec.stats.avgTps !== null && ` · ${rec.stats.avgTps.toFixed(1)} tok/s`}
          </dd>
        </div>
        {trace?.pipeline && (
          <div className="flex justify-between gap-2">
            <dt>TTFT (prefill)</dt>
            <dd className="text-obs-ink">{trace.pipeline.prefillMs.toFixed(0)} ms</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 border-t border-obs-line pt-2.5 text-[11px] leading-[1.7] text-obs-ink2/80">
        trace completeness：{completeness.join(" / ") || "无 trace 数据"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-measure-500/90 px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
          onClick={onOpen}
        >
          进入实验台
        </button>
        {comparable && (
          <button
            type="button"
            className="rounded-md border border-obs-line px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
            onClick={onCompare}
          >
            与最近可比较 run 对比
          </button>
        )}
        <button
          type="button"
          className="rounded-md border border-obs-line px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
          onClick={exportFile}
        >
          导出 .aitrace
        </button>
        <button
          type="button"
          className="rounded-md border border-obs-line px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
          onClick={onStar}
        >
          {rec.starred ? "取消星标" : "星标"}
        </button>
        <button
          type="button"
          className="rounded-md border border-obs-line px-3 py-1.5 text-[12px] text-red-400/80 transition-colors hover:text-red-400"
          onClick={onDelete}
        >
          删除
        </button>
      </div>
      {!comparable && (
        <p className="mt-2.5 text-[11px] leading-[1.7] text-obs-ink2/70">
          没有与本 run 模型·prompt·参数·后端完全一致的其他记录；不一致的 run
          可并列查看，但不提供数值比较。
        </p>
      )}
    </aside>
  );
}

/** 实验档案 · Trace Atlas：每行一条真实 run 的指纹（X=生成步），
 *  主线=选中概率、竖条=熵、底刻度=dt、▽=真实分岔。
 *  点行展开 Run Inspector；仅严格可比较的 run 之间出现「对比」。 */
export default function ArchivePage({
  onLoadRecord,
}: {
  onLoadRecord: (rec: ExperimentRecord) => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(new Set());
  const [pair, setPair] = useState<[ExperimentRecord, ExperimentRecord] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 对话式档案页（点卡片打开） */
  const [openCard, setOpenCard] = useState<string | null>(null);
  /** 专业视图（Trace Atlas + Behavior Bench）默认折叠 */
  const [showAtlas, setShowAtlas] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    void listExperiments().then(setRecords);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const importFile = async (file: File) => {
    setError(null);
    try {
      const rec = importReplay(await file.text());
      await saveExperiment(rec);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // 行为基准（D3 首期）：只在严格可比较组内、统一用 Core Rules 求值，分数是分布不是单值
  const benchGroups = useMemo(
    () => (records ? benchComparableGroups(records, CORE_RULES) : []),
    [records],
  );

  const sel = records?.find((r) => r.id === selected) ?? null;
  const comparable = useMemo(() => {
    if (!sel || !records) return null;
    return (
      records.find((r) => r.id !== sel.id && compatKey(r) === compatKey(sel)) ??
      null
    );
  }, [sel, records]);

  const cardRec = records?.find((r) => r.id === openCard) ?? null;
  const cardComparable =
    cardRec && records
      ? (records.find(
          (r) => r.id !== cardRec.id && compatKey(r) === compatKey(cardRec),
        ) ?? null)
      : null;

  if (pair) {
    return (
      <Suspense fallback={<div className="flex-1 bg-obs" />}>
        <CompareView pair={pair} onClose={() => setPair(null)} />
      </Suspense>
    );
  }

  if (cardRec) {
    return (
      <RunStoryPage
        rec={cardRec}
        comparable={cardComparable}
        onBack={() => setOpenCard(null)}
        onOpen={(stepIndex) => {
          setTraceFocus({ runId: cardRec.id, stepIndex, branchPath: [] });
          onLoadRecord(cardRec);
        }}
        onCompare={() => {
          if (cardComparable) {
            setTraceFocus({
              runId: cardRec.id,
              stepIndex: null,
              branchPath: [],
              comparisonRunId: cardComparable.id,
            });
            setPair([cardComparable, cardRec]);
          }
        }}
        onStar={() => {
          void updateExperiment(cardRec.id, { starred: !cardRec.starred }).then(
            refresh,
          );
        }}
        onDelete={() => {
          setOpenCard(null);
          void deleteExperiment(cardRec.id).then(refresh);
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-obs text-obs-ink">
      <div className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-10">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/60 select-none">
              Archive · 运行档案
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.01em]">
              每一次运行都是一段可回放的对话
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md border border-obs-line px-3.5 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
            onClick={() => fileRef.current?.click()}
          >
            导入 .aitrace
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.aitrace,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-2 text-[13px] leading-[1.8] text-obs-ink2">
          点任意一张卡片，打开那次运行的对话——问题、着色回答、故事章节、回放与对比
          都在里面。颜色 = 它写每个词时的真实把握度。
        </p>
        {error && (
          <p className="mt-3 text-[13px] text-red-400">导入失败：{error}</p>
        )}

        {records === null ? (
          <p className="mt-10 text-[13px] text-obs-ink2">读取存档中…</p>
        ) : records.length === 0 ? (
          <div className="mt-10 rounded-md border border-obs-line bg-obs-2 p-6 text-[13px] leading-[1.9] text-obs-ink2">
            还没有实验记录。到实验台完成一次记录，或导入一份 .aitrace
            文件，这里会出现可扫描、可比较的 trace 图谱。
          </div>
        ) : (
          <>
          <ArchiveCards records={records} onOpenCard={(r) => setOpenCard(r.id)} />

          <div className="mt-10 border-t border-obs-line pt-4">
            <button
              type="button"
              className="text-[12px] text-obs-ink2 underline decoration-dotted underline-offset-4 hover:text-obs-ink"
              onClick={() => setShowAtlas((v) => !v)}
            >
              专业视图 · Trace Atlas 图谱与 Behavior Bench {showAtlas ? "▾" : "▸"}
            </button>
          </div>
          {showAtlas && (
          <>
          <p className="mt-3 text-[12px] leading-[1.8] text-obs-ink2">
            每行是一条真实 run：横轴为生成步，主线=逐步选中概率，竖条=熵，底部刻度=逐
            token 耗时，▽=真实分岔。点任意行展开 Run Inspector；只有模型·prompt·参数·后端
            完全一致的 run 才提供数值比较。
          </p>
          {benchGroups.length > 0 && (
            <div className="mt-8 rounded-md border border-obs-line bg-obs-2/60 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
                Behavior Bench · 自己和自己比
              </p>
              <p className="mt-1.5 text-[12px] leading-[1.8] text-obs-ink2">
                同一组模型·prompt·参数·后端下的多 seed 重复运行，用统一 Core Rules
                计算规则命中率（每 100 token 命中数）。分数是分布不是单值——单 seed
                的单个数字不构成基准。
              </p>
              <div className="mt-3 space-y-3">
                {benchGroups.map((g) => (
                  <EvidencedClaim
                    key={g.key}
                    claim={
                      <>
                        「{g.prompt.slice(0, 24)}{g.prompt.length > 24 ? "…" : ""}」：
                        {g.score.values.length} 个 seed 的规则命中率中位数{" "}
                        {g.score.median.toFixed(1)}，极差{" "}
                        {g.score.range[0].toFixed(1)}–{g.score.range[1].toFixed(1)}
                      </>
                    }
                    source="存档内同可比较组 runs × evaluateRules(steps, CORE_RULES)"
                  >
                    <div className="space-y-1 font-mono text-[11px] text-obs-ink2">
                      {g.score.values.map((v, i) => (
                        <div key={g.recIds[i]} className="flex justify-between gap-3">
                          <span>seed {g.score.seeds[i] ?? "—"}</span>
                          <span className="text-obs-ink">{v.toFixed(1)} 命中 / 100 tok</span>
                        </div>
                      ))}
                      <p className="pt-1 text-[11px] text-obs-ink2/70">
                        {getModel(g.modelId)?.name ?? g.modelId} · {g.device ?? "—"} ·
                        指标：rule-hit-rate（确定性规则，无 AI 参与）
                      </p>
                    </div>
                  </EvidencedClaim>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-5 md:flex-row">
            <div className="min-w-0 flex-1 space-y-3">
              {(() => {
                // 先按实验家族（同模型·prompt·参数·后端）聚合，展开才看单条 run 波形
                const families = new Map<string, ExperimentRecord[]>();
                for (const r of records) {
                  const k = compatKey(r);
                  const list = families.get(k);
                  if (list) list.push(r);
                  else families.set(k, [r]);
                }
                return [...families.entries()].map(([key, runs]) => {
                  const open = openFamilies.has(key) || runs.length === 1;
                  const first = runs[0];
                  const div = familyDivergence(runs);
                  return (
                    <div key={key} className="rounded-md border border-obs-line bg-obs-2/40">
                      {runs.length > 1 && (
                        <button
                          type="button"
                          className="flex w-full items-baseline gap-2 px-4 py-2.5 text-left transition-colors hover:bg-obs-2/70"
                          onClick={() =>
                            setOpenFamilies((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                        >
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-obs-ink">
                            {first.prompt || first.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-obs-ink2/80">
                            {runs.length} runs · {getModel(first.modelId)?.name ?? first.modelId} · T{" "}
                            {first.params.temperature}
                            {div === -1 && " · 最近两次完全一致"}
                            {typeof div === "number" && div >= 0 && ` · 第 ${div + 1} 步分叉`}
                          </span>
                          <span className="shrink-0 text-[11px] text-obs-ink2/60">
                            {open ? "收起 ▴" : "展开 ▾"}
                          </span>
                        </button>
                      )}
                      {open && (
                        <div className={`space-y-2 ${runs.length > 1 ? "px-2 pb-2" : ""}`}>
                          {runs.map((r) => {
                            const steps = r.root.trace?.steps ?? [];
                            const isSel = r.id === selected;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                className={`block w-full rounded-md border px-4 py-2.5 text-left transition-colors ${
                                  isSel
                                    ? "border-measure-400/60 bg-obs-2"
                                    : "border-obs-line bg-obs-2/60 hover:border-obs-ink2/40"
                                }`}
                                onClick={() => setSelected(isSel ? null : r.id)}
                              >
                                <div className="flex items-baseline gap-2">
                                  {r.starred && (
                                    <span className="text-[11px] text-amber-300">★</span>
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-[13px] text-obs-ink">
                                    {r.name}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-obs-ink2/80">
                                    {getModel(r.modelId)?.name ?? r.modelId} · T {r.params.temperature} · seed{" "}
                                    {r.seed ?? "—"} · {r.stats.tokens} tok · {fmtDate(r.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  <TraceFingerprint
                                    steps={steps}
                                    forkSteps={collectForkSteps(r)}
                                    onStepClick={(step) => {
                                      setTraceFocus({ runId: r.id, stepIndex: step, branchPath: [] });
                                      onLoadRecord(r);
                                    }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {sel && (
              <RunInspector
                rec={sel}
                comparable={comparable}
                onOpen={() => {
                  setTraceFocus({ runId: sel.id, stepIndex: null, branchPath: [] });
                  onLoadRecord(sel);
                }}
                onCompare={() => {
                  if (comparable) {
                    setTraceFocus({
                      runId: sel.id,
                      stepIndex: null,
                      branchPath: [],
                      comparisonRunId: comparable.id,
                    });
                    setPair([comparable, sel]);
                  }
                }}
                onStar={() => {
                  void updateExperiment(sel.id, { starred: !sel.starred }).then(refresh);
                }}
                onDelete={() => {
                  setSelected(null);
                  void deleteExperiment(sel.id).then(refresh);
                }}
              />
            )}
          </div>
          </>
          )}
          </>
        )}
      </div>
    </div>
  );
}
