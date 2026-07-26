import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { listExperiments, type ExperimentRecord } from "../lib/experiments";
import {
  computeFindings,
  loadSeenFindings,
  saveSeenFindings,
  type Finding,
} from "../lib/findings";
import { setTraceFocus } from "../lib/traceFocus";
import TraceFingerprint from "./TraceFingerprint";

// 比较视图含 three，懒加载：首次打开比较才下载
const CompareView = lazy(() => import("./CompareView"));

const KIND_LABEL: Record<Finding["kind"], string> = {
  divergence: "首次分叉",
  reproducible: "完全一致",
  distribution: "候选分布异常",
  rule: "规则事件",
  performance: "性能变化",
};

const KIND_COLOR: Record<Finding["kind"], string> = {
  divergence: "text-amber-300 border-amber-400/40",
  reproducible: "text-emerald-300 border-emerald-400/40",
  distribution: "text-rose-300 border-rose-400/40",
  rule: "text-sky-300 border-sky-400/40",
  performance: "text-violet-300 border-violet-400/40",
};

/** 置顶优先级：分叉 > 分布异常 > 规则 > 性能 > 完全一致 */
const KIND_RANK: Record<Finding["kind"], number> = {
  divergence: 0,
  distribution: 1,
  rule: 2,
  performance: 3,
  reproducible: 4,
};

/** Findings · Evidence Field：每条发现先给一块可交互的真实证据视图
 *  （run 指纹 / 双 run 叠加 + 标记步），再给一句可核验的结论与来源字段；
 *  点证据的任意步直接跳到对应 run/step。发现只来自你自己的存档。 */
export default function FindingsPage({
  onLoadRecord,
}: {
  /** 单条记录发现：载入实验台查看 */
  onLoadRecord: (rec: ExperimentRecord) => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pair, setPair] = useState<{
    runs: [ExperimentRecord, ExperimentRecord];
    step?: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void listExperiments().then((rs) => {
      if (alive) setRecords(rs);
    });
    return () => {
      alive = false;
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, ExperimentRecord>();
    for (const r of records ?? []) m.set(r.id, r);
    return m;
  }, [records]);

  const findings = useMemo(
    () => (records ? computeFindings(records) : []),
    [records],
  );

  // 进入本页即视为已读
  useEffect(() => {
    if (findings.length === 0) return;
    const seen = loadSeenFindings(localStorage);
    for (const f of findings) seen.add(f.key);
    saveSeenFindings(localStorage, seen);
  }, [findings]);

  const jump = (f: Finding, step?: number) => {
    const at = step ?? f.step;
    if (f.recIds.length === 2) {
      const a = byId.get(f.recIds[0]);
      const b = byId.get(f.recIds[1]);
      if (a && b) {
        setTraceFocus({
          runId: b.id,
          stepIndex: at ?? null,
          branchPath: [],
          comparisonRunId: a.id,
        });
        setPair({ runs: [a, b], step: at });
      }
    } else {
      const rec = byId.get(f.recIds[0]);
      if (rec) {
        setTraceFocus({ runId: rec.id, stepIndex: at ?? null, branchPath: [] });
        onLoadRecord(rec);
      }
    }
  };

  if (pair) {
    return (
      <Suspense fallback={<div className="flex-1 bg-obs" />}>
        <CompareView
          pair={pair.runs}
          initialStep={pair.step}
          onClose={() => setPair(null)}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-obs text-obs-ink">
      <div className="mx-auto w-full max-w-[880px] px-6 pb-16 pt-10">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/60 select-none">
          Findings · Evidence Field
        </p>
        <h2 className="text-[24px] font-semibold tracking-[-0.01em]">
          你的实验里可核验的现象
        </h2>
        <p className="mt-2 text-[13px] leading-[1.8] text-obs-ink2">
          只有四类证据化发现：首次分叉、候选分布异常、规则事件、性能变化。每条先给真实
          trace 的证据视图，再给结论与来源字段；比较只发生在模型·prompt·参数·后端
          完全一致的 run 之间。
        </p>

        {records === null ? (
          <p className="mt-10 text-[13px] text-obs-ink2">读取存档中…</p>
        ) : findings.length === 0 ? (
          <div className="mt-10 rounded-md border border-obs-line bg-obs-2 p-6 text-[13px] leading-[1.9] text-obs-ink2">
            还没有可报告的发现。到实验台完成两次以上记录（同一问题同参数重跑或换
            seed），这里会自动指出真实的分叉位置、分布异常与性能变化。
          </div>
        ) : (
          (() => {
            const sorted = [...findings].sort(
              (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind],
            );
            const head =
              sorted.find((f) => f.key === activeKey) ?? sorted[0];
            const rest = sorted.filter((f) => f.key !== head.key);
            const recA = byId.get(head.recIds[0]);
            const recB =
              head.recIds.length === 2 ? byId.get(head.recIds[1]) : undefined;
            const stepsA = recA?.root.trace?.steps ?? [];
            const stepsB = recB?.root.trace?.steps;
            return (
              <div className="mt-8">
                {/* 置顶：当前最值得看的一条发现，完整证据现场 */}
                <div className="rounded-md border border-obs-line bg-obs-2 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] ${KIND_COLOR[head.kind]}`}
                    >
                      {KIND_LABEL[head.kind]}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[16px] font-medium text-obs-ink">
                      {head.title}
                    </p>
                  </div>

                  {recA && stepsA.length > 0 && (
                    <div className="mt-3 cursor-pointer rounded-md border border-obs-line/60 bg-obs px-3 py-2">
                      <TraceFingerprint
                        steps={stepsA}
                        compareSteps={stepsB}
                        markStep={head.step}
                        onStepClick={(s) => jump(head, s)}
                      />
                      <p className="mt-1 text-[11px] text-obs-ink2/70 select-none">
                        {head.kind === "divergence" || head.kind === "reproducible"
                          ? "双路径叠加：紫 = 前一次 · 绿 = 后一次"
                          : head.kind === "performance"
                            ? "双 run 同步轴对齐：底部刻度 = 逐 token 实测耗时"
                            : head.kind === "rule"
                              ? "单条 trace · 黄线 = 规则命中步（离散事件，非连续信号）"
                              : "单条 trace · 黄线 = 异常峰所在步 · 竖条 = 熵"}
                        {" · 点任意位置跳到该步"}
                      </p>
                    </div>
                  )}

                  <p className="mt-2.5 text-[13px] leading-relaxed text-obs-ink2">
                    {head.detail}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-obs-ink2/70">
                    来源：{head.source}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-[12px] text-indigo-300 hover:text-indigo-200 transition-colors"
                    onClick={() => jump(head)}
                  >
                    {head.recIds.length === 2
                      ? "打开双 trace 对比 →"
                      : "在实验台定位该步 →"}
                  </button>
                </div>

                {/* 其余发现：紧凑证据索引，点一行就把它提到上方证据现场 */}
                {rest.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-md border border-obs-line">
                    {rest.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className="flex w-full items-center gap-2.5 border-b border-obs-line/60 bg-obs-2/50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-obs-2"
                        onClick={() => setActiveKey(f.key)}
                      >
                        <span
                          className={`inline-block shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${KIND_COLOR[f.kind]}`}
                        >
                          {KIND_LABEL[f.kind]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-obs-ink">
                          {f.title}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-obs-ink2/60">
                          {f.source}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
