import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import TokenText, { type DisplayStep } from "./TokenText";
import BirthCard from "./BirthCard";
import EvidencedClaim from "./EvidencedClaim";
import HesitationSlice from "./HesitationSlice";
import LivePanel from "./LivePanel";
import HistoryDrawer from "./HistoryDrawer";
import ResearchTimeline from "./ResearchTimeline";
import RulesPanel from "./RulesPanel";
import ObservationSummary from "./ObservationSummary";
import AgentTimeline from "./AgentTimeline";
import RuntimeJourney from "./RuntimeJourney";
import SamplingChamber from "./SamplingChamber";
import SentenceRibbon from "./SentenceRibbon";
import SamplingInspector from "./SamplingInspector";
import MomentCard from "./MomentCard";
import WorkflowStrip from "./WorkflowStrip";
import DecisionCard from "./DecisionCard";
import DebugBar from "./DebugBar";
import type { WorkflowStage } from "../lib/workflowStages";
import ThinkingCaption from "./ThinkingCaption";
import ActivityLog from "./ActivityLog";
import Dropdown from "./Dropdown";
import TeamFlow, { TeamPanel } from "./TeamFlow";
import { buildLiveTeam, teamFromTrace } from "../lib/team";
import ThoughtMap from "./ThoughtMap";
import RoadsNotTaken from "./RoadsNotTaken";
import TraceScope from "./TraceScope";
import { loadDemoTrace, type DemoTrace } from "../lib/demoTrace";
import { buildDemoHash, type DemoSlice } from "../lib/demoLink";
import { classifyDualEnding, sharedPrefixView } from "../lib/dualEnding";
import { computeCloseSteps, formatGap } from "../lib/closeSteps";
import { DEMO_STATS } from "../lib/demoStats.generated";
import {
  CORE_RULES,
  evaluateRules,
  matchesByToken,
  validateRuleset,
  type Rule,
} from "../lib/rules";
import {
  computeStats,
  defaultName,
  getExperiment,
  saveExperiment,
  updateExperiment,
  type ExperimentRecord,
} from "../lib/experiments";
import {
  MAX_BRANCH_NODES,
  countNodes,
  exportReplay,
  type BranchNode,
  type GenerationTrace,
  type TokenStep,
  type TokenCandidate,
} from "../lib/trace";
import { compareTraces, type ReplayCompare } from "../lib/replayVerify";
import type { GenerationParams } from "../lib/chatStore";
import { getModel, MODELS } from "../lib/models";
import { webSearch, buildSearchPrompt } from "../lib/search";
import {
  RETRIEVAL_KEEP,
  buildRetrievalEvents,
  buildRetrievalFailEvents,
  buildPlanPrompt,
  buildExecutePrompt,
  buildPlanEvents,
  buildHandoffEvent,
  type RetrievalRecord,
} from "../lib/agentRun";
import type { AgentEvent } from "../lib/agentTrace";
import { hesitationBreakIndex } from "../lib/breakpoints";
import { stripThinking, finalizeUnclosedThinking } from "../lib/thinking";
import RetrievalCard from "./RetrievalCard";
import BirthScene from "./BirthScene";
import EvidenceField from "./EvidenceField";
import { directScenes } from "../lib/director";
import StoryPlayer from "./StoryPlayer";
import { buildShareCardData, exportShareCard } from "../lib/shareCard";
import { getTraceFocus } from "../lib/traceFocus";
import { logVisit } from "../lib/visitTrace";
import {
  IconList,
  IconClock,
  IconWaves,
  IconStop,
  IconGlobe,
  IconAperture,
} from "./icons";
import { PrimaryAction } from "./ds";
import { Term } from "./Term";
import ReplayControlPanel from "./ReplayControlPanel";
import { ReplayController } from "../lib/replayControls";

// Ocean 三维视图懒加载：three 只在第一次打开时下载
const OceanView = lazy(() => import("./OceanView"));
const CompareView = lazy(() => import("./CompareView"));
const InstrumentCluster = lazy(() => import("./InstrumentCluster"));

const EXAMPLE_PROMPT = "用一句话解释为什么天空是蓝色的";
// v2：core/slow-step 阈值校准（旧 v1 存档不迁移，避免带着失真规则）
const RULES_KEY = "observe-rules-v2";

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateRuleset(parsed) === null) return parsed as Rule[];
    }
  } catch {
    // 损坏则回退默认
  }
  return structuredClone(CORE_RULES);
}

/** 等待首 token 的三段叙事：<3s 呼吸点；≥3s 加一行诚实解释 + 预期建设；≥10s 加真实已等时长。
 *  无 spinner、无假进度——是在酝酿，不是在处理。
 *  预期建设（批次 2）：等待期展示示例 trace 里真实的最险一步，说明接下来会看到什么。 */
function BreathingWait() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-4 space-y-3">
      <span className="breath-dot inline-block" />
      <p className="text-[13px] text-obs-ink2 select-none">
        正在等待首个可记录输出…
      </p>
      {elapsed >= 3 && (
        <p className="text-[12px] text-obs-ink2/70 select-none">
          模型正在准备第一个词（首词需要先处理完整个提示，会慢一些）
        </p>
      )}
      {elapsed >= 5 && (
        <div className="max-w-md">
          <p className="mb-1.5 text-[11px] text-obs-ink2/70 select-none">
            接下来你会看到：每个词都像下面这样从候选中按概率选出（示例 trace
            第 {DEMO_STATS.tightest.index + 1} 步，真实数据）
          </p>
          <HesitationSlice step={DEMO_STATS.tightest} />
        </div>
      )}
      {elapsed >= 10 && (
        <p className="text-[11px] text-obs-ink2/50 tabular-nums select-none">
          已等待 {elapsed}s；耗时取决于模型规模与后端，这里不显示假进度
        </p>
      )}
    </div>
  );
}

/** 完成态实验摘要：记录了什么、哪一步最值得看、下一步可以做什么。
 *  三个主动作：回放 / 比较 / 实验时间线；全部数据来自真实 trace。 */
function CompleteSummary({
  steps,
  seed,
  saved,
  onReplay,
  onCompare,
  onTimeline,
  onJump,
  onDualRun,
  onVerifyReplay,
  canVerify,
  verifying,
  replayResult,
}: {
  steps: DisplayStep[];
  seed: number | null;
  saved: boolean;
  onReplay: () => void;
  onCompare: () => void;
  onTimeline: () => void;
  onJump: (index: number) => void;
  /** C3.1 一键双跑：用该步真实第二候选续跑（或直达已有分支的双结局卡） */
  onDualRun?: (index: number) => void;
  /** 同 seed 再跑一次以验证复现 */
  onVerifyReplay: () => void;
  /** 有 seed 才能验证复现 */
  canVerify: boolean;
  verifying: boolean;
  /** 上一次复现验证的逐 token 对比结果 */
  replayResult: ReplayCompare | null;
}) {
  const [show, setShow] = useState(false);
  // 结果文本先出现，摘要延迟浮出（克制：纯透明度过渡）
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 600);
    return () => clearTimeout(t);
  }, []);
  const seconds = steps.reduce((a, s) => a + s.dt, 0) / 1000;
  let peakIdx = -1;
  for (let i = 0, best = -Infinity; i < steps.length; i++) {
    if (steps[i].entropy > best) {
      best = steps[i].entropy;
      peakIdx = i;
    }
  }
  // 唯一主出口（批次 2 旅程收敛）：犹豫点陈述，可展开到产生它的原始概率
  const closeSteps = useMemo(() => computeCloseSteps(steps), [steps]);
  return (
    <div
      className={`mb-6 rounded-md border border-obs-line bg-obs-2 p-4 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        本次记录完成
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-obs-ink">
        {steps.length} 个 token
        {seconds > 0 ? ` · ${seconds.toFixed(1)} 秒` : ""}
        {seed !== null ? " · 同配置与 seed 下预期可复现" : ""}
      </p>
      {closeSteps.length > 0 ? (
        <div className="mt-2">
          <EvidencedClaim
            claim={
              <>
                这个回答有 {closeSteps.length} 个犹豫点（前两名候选概率差不足
                5%），最险在第 {closeSteps[0].index + 1} 步，差距
                {formatGap(closeSteps[0].gap)}
              </>
            }
            source="steps[].topk[0..1].prob（本次实测 trace）"
            onInspect={() => onJump(closeSteps[0].index)}
            inspectLabel="看最险的一个 →"
          >
            <div className="max-h-[26vh] overflow-y-auto">
              {closeSteps.slice(0, 8).map((s) => (
                <div key={s.index} className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1 text-left font-mono text-[11px] tabular-nums text-obs-ink2 transition-colors hover:bg-white/5 hover:text-obs-ink"
                    onClick={() => onJump(s.index)}
                  >
                    <span>第 {s.index + 1} 步</span>
                    <span className="min-w-0 flex-1 truncate text-center">
                      「{s.a}」{(s.ap * 100).toFixed(2)}% vs 「{s.b}」
                      {(s.bp * 100).toFixed(2)}%
                    </span>
                    <span>差 {(s.gap * 100).toFixed(2)}%</span>
                  </button>
                  {onDualRun && (steps[s.index]?.topk.length ?? 0) >= 2 && (
                    <button
                      type="button"
                      title="用该步真实第二候选续跑一条分支，直达双结局对比"
                      className="shrink-0 rounded-md border border-obs-line px-2 py-0.5 text-[11px] text-obs-ink2 transition-colors hover:border-measure-400/60 hover:text-obs-ink"
                      onClick={() => onDualRun(s.index)}
                    >
                      双跑
                    </button>
                  )}
                </div>
              ))}
              {closeSteps.length > 8 && (
                <p className="px-2 py-1 text-[11px] text-obs-ink2/60 select-none">
                  仅列差距最小的 8 个，其余 {closeSteps.length - 8} 个见完整
                  trace
                </p>
              )}
            </div>
          </EvidencedClaim>
        </div>
      ) : (
        peakIdx >= 0 && (
          <button
            type="button"
            className="mt-1 text-[13px] text-obs-ink2 underline decoration-dotted underline-offset-2 transition-colors hover:text-obs-ink"
            onClick={() => onJump(peakIdx)}
          >
            候选分布最分散的步骤：第 {peakIdx + 1} 步 →
          </button>
        )
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-measure-500 px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
          onClick={onReplay}
        >
          回放生成
        </button>
        <button
          className="rounded-md border border-obs-line px-3.5 py-1.5 text-[13px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
          onClick={onCompare}
        >
          比较一次运行
        </button>
        <button
          className="rounded-md border border-obs-line px-3.5 py-1.5 text-[13px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
          onClick={onTimeline}
        >
          {saved ? "已存入实验时间线 · 查看" : "实验时间线"}
        </button>
        {canVerify && (
          <button
            className="rounded-md border border-obs-line px-3.5 py-1.5 text-[13px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink disabled:opacity-50"
            onClick={onVerifyReplay}
            disabled={verifying}
          >
            {verifying ? "复现中…" : "验证复现（同 seed 再跑）"}
          </button>
        )}
      </div>
      {replayResult ? (
        <div className="mt-3">
          <ReplayResult result={replayResult} onJump={onJump} />
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-obs-ink2/60 select-none">
          复现需同一模型版本、参数与 seed；硬件与后端不同仍可能带来差异
        </p>
      )}
    </div>
  );
}

/** 复现验证结果：把两次真实 run 的逐 token 对比如实呈现（Evidence First）。
 *  一致就安静地确认；有差异就高亮，并说明差异的合理来源，不掩盖。 */
function ReplayResult({
  result,
  onJump,
}: {
  result: ReplayCompare;
  onJump: (index: number) => void;
}) {
  const r = result;
  return (
    <EvidencedClaim
      claim={
        r.identical ? (
          <>
            同一 seed 再跑一次，{r.total} 个 token 逐字一致——这次运行是可复现的
          </>
        ) : (
          <>
            同一 seed 再跑，{r.matched}/{r.total} 步一致
            {r.firstDiff !== null ? `，第 ${r.firstDiff + 1} 步起出现差异` : ""}
          </>
        )
      }
      source="两次真实 trace 的 steps[].id 逐 token 对齐"
      onInspect={r.firstDiff !== null ? () => onJump(r.firstDiff!) : undefined}
      inspectLabel="看第一处差异 →"
    >
      {r.identical ? (
        <p className="text-[12px] leading-relaxed text-obs-ink2">
          两次运行选中的每一个 token 完全相同（同后端 {r.deviceA}）。
          确定性来自固定的 seed 与采样参数，不是巧合。
        </p>
      ) : (
        <div>
          {!r.sameDevice && (
            <p className="mb-1.5 text-[11px] leading-relaxed text-amber-300/90">
              两次后端不同（{r.deviceA} vs {r.deviceB}）——浮点实现差异会导致分岔，属预期。
            </p>
          )}
          {r.lenA !== r.lenB && (
            <p className="mb-1.5 text-[11px] leading-relaxed text-obs-ink2">
              两次长度不同：{r.lenA} vs {r.lenB} 步。
            </p>
          )}
          <div className="max-h-[26vh] overflow-y-auto">
            {r.diffs.map((d) => (
              <button
                key={d.index}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left font-mono text-[11px] tabular-nums text-obs-ink2 transition-colors hover:bg-white/5 hover:text-obs-ink"
                onClick={() => onJump(d.index)}
              >
                <span>第 {d.index + 1} 步</span>
                <span className="min-w-0 flex-1 truncate text-center">
                  「{d.a.text.trim() || d.a.text}」{(d.a.prob * 100).toFixed(2)}% vs 「
                  {d.b.text.trim() || d.b.text}」{(d.b.prob * 100).toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </EvidencedClaim>
  );
}

function getNode(root: BranchNode, path: number[]): BranchNode {
  let node = root;
  for (const i of path) node = node.children[i];
  return node;
}

/** 组合某个分支的完整展示 token 序列：祖先前缀 + 强制改选词 + 本分支生成 */
function composeSteps(root: BranchNode, path: number[]): DisplayStep[] {
  let steps: DisplayStep[] = (root.trace?.steps ?? []) as DisplayStep[];
  let node = root;
  for (const i of path) {
    const child = node.children[i];
    const parentStep = steps[child.forkStep];
    const cand = parentStep?.topk.find((c) => c.id === child.forcedId);
    const forcedStep: DisplayStep = {
      id: child.forcedId,
      text: child.forcedText,
      prob: cand?.prob ?? 0,
      topk: parentStep?.topk ?? [],
      entropy: parentStep?.entropy ?? 0,
      dt: 0,
      forced: true,
    };
    // forcedId === -1 表示无改选的续跑（Debugger 的 Continue）：不插入强制步
    steps =
      child.forcedId === -1
        ? [
            ...steps.slice(0, child.forkStep),
            ...((child.trace?.steps ?? []) as DisplayStep[]),
          ]
        : [
            ...steps.slice(0, child.forkStep),
            forcedStep,
            ...((child.trace?.steps ?? []) as DisplayStep[]),
          ];
    node = child;
  }
  return steps;
}

function BranchTree({
  root,
  path,
  activePath,
  onSelect,
}: {
  root: BranchNode;
  path: number[];
  activePath: number[];
  onSelect: (path: number[]) => void;
}) {
  const node = getNode(root, path);
  const isActive =
    path.length === activePath.length &&
    path.every((v, i) => v === activePath[i]);
  return (
    <div style={{ marginLeft: path.length * 14 }}>
      <button
        type="button"
        className={`rounded-md px-2 py-0.5 text-[12px] transition-colors ${
          isActive
            ? "bg-obs-wash text-obs-ink"
            : "text-obs-ink2 hover:text-obs-ink"
        }`}
        onClick={() => onSelect(path)}
      >
        {path.length === 0
          ? "原始"
          : node.forcedId === -1
            ? `第 ${node.forkStep + 1} 词起续跑`
            : `第 ${node.forkStep + 1} 词改选「${node.forcedText.trim() || node.forcedText}」`}
      </button>
      {node.children.map((_, i) => (
        <BranchTree
          key={i}
          root={root}
          path={[...path, i]}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/** C3 双结局卡：查看分支时，把原路径与改选路径从分岔步起的两段真实续写并排，
 *  用确定性文本规则分类为三种结果并全部如实呈现（不挑蝴蝶效应案例）。 */
function DualEndingCard({
  root,
  activePath,
}: {
  root: BranchNode;
  activePath: number[];
}) {
  const view = useMemo(() => {
    const node = getNode(root, activePath);
    const parentSteps = composeSteps(root, activePath.slice(0, -1));
    const branchSteps = composeSteps(root, activePath);
    const forkStep = node.forkStep;
    // C3.2 共享前缀头：按 token id 逐位对齐求 first-divergence（纯函数）
    const shared = sharedPrefixView(parentSteps, branchSteps);
    const endA = parentSteps
      .slice(forkStep)
      .map((s) => s.text)
      .join("");
    const endB = branchSteps
      .slice(forkStep)
      .map((s) => s.text)
      .join("");
    const parentStep = parentSteps[forkStep];
    const forced = parentStep?.topk.find((c) => c.id === node.forcedId);
    return {
      forkStep,
      endA,
      endB,
      origText: parentStep?.text ?? "",
      origProb: parentStep?.prob ?? 0,
      forcedText: node.forcedText,
      forcedProb: forced?.prob ?? 0,
      shared,
      verdict: classifyDualEnding(endA, endB),
    };
  }, [root, activePath]);

  const { verdict, forkStep } = view;
  const claim =
    verdict.outcome === "different" ? (
      <>
        从第 {forkStep + 1} 步改选「{view.forcedText.trim() || view.forcedText}
        」后，两条结局走向不同
      </>
    ) : verdict.outcome === "converged" ? (
      <>
        改选后两条结局重新汇合（末尾 {verdict.commonSuffixLen}{" "}
        字相同）——用词会抖动，观点常常稳定
      </>
    ) : (
      <>改选后其中一条结局出现退化，如实展示</>
    );

  return (
    <div className="mb-6 rounded-md border border-obs-line bg-obs-2 p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
        双结局 · 第 {forkStep + 1} 步分岔
      </p>
      <EvidencedClaim
        claim={claim}
        source={`root/children[].trace.steps[].text（第 ${forkStep + 1} 步分岔的两段真实续写）`}
      >
        <div className="space-y-2 text-[12px] leading-relaxed">
          {/* C3.2 共享前缀头：两条真实路径逐 token 一致的前缀 + accent 高亮的分岔 token */}
          <div className="rounded-md border border-obs-line/70 bg-obs/60 p-2.5">
            <p className="mb-1 text-[11px] text-obs-ink2/70 select-none">
              共享前缀（两条路径逐 token id 一致，first-divergence 在第{" "}
              {(view.shared.divergeIndex === -1
                ? forkStep
                : view.shared.divergeIndex) + 1}{" "}
              步）
            </p>
            <p className="break-words font-mono text-[12px] leading-relaxed text-obs-ink2">
              {view.shared.prefixText.length > 80 ? "…" : ""}
              {view.shared.prefixText.slice(-80)}
              <span className="mx-0.5 rounded bg-measure-500/25 px-1 text-measure-200">
                {view.origText.trim() || view.origText}
              </span>
              /
              <span className="mx-0.5 rounded bg-measure-500/25 px-1 text-measure-200">
                {view.forcedText.trim() || view.forcedText}
              </span>
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-obs-ink2/80">
              原路径「{view.origText.trim() || view.origText}」
              {(view.origProb * 100).toFixed(2)}% · 改选「
              {view.forcedText.trim() || view.forcedText}」
              {(view.forcedProb * 100).toFixed(2)}%（同一步的真实候选概率）
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "原路径结局", text: view.endA },
              { label: "改选后结局", text: view.endB },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-md border border-obs-line/70 bg-obs/60 p-2.5"
              >
                <p className="mb-1 text-[11px] text-obs-ink2/70 select-none">
                  {c.label}
                </p>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-obs-ink">
                  {c.text || "（空）"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-obs-ink2/80">判定依据：{verdict.basis}</p>
        </div>
      </EvidencedClaim>
    </div>
  );
}

/** 第二幕 Observe：Interactive Token Replay（产品 Hero）。
 *  看：每个 token 的候选与概率实时可见；玩：点任意词回看出生档案、改选候选词真实重写后文。 */
/** 运行守卫（sessionStorage）：运行中页面意外重载（多为低配设备 WASM 内存不足）时，
 *  下次挂载能诚实告知并把问题恢复到输入框；正常完成/报错/手动停止都会清除 */
const RUN_GUARD_KEY = "obs-run-guard";

export default function ObservePage({
  worker,
  modelId,
  params,
  device,
  busy,
  autoDemo,
  onAutoDemoDone,
  onWantModel,
  externalLoad,
  onExternalLoadDone,
  demoSlice,
  onDemoSliceDone,
  externalPrompt,
  onExternalPromptDone,
}: {
  worker: Worker | null;
  modelId: string;
  params: GenerationParams;
  device: string | null;
  busy: boolean;
  /** 首屏零下载入口：进入后自动播放预录采样演示 */
  autoDemo?: boolean;
  onAutoDemoDone?: () => void;
  /** 回放模式下想亲手干预：回首屏选择加载自己的模型 */
  onWantModel?: () => void;
  /** 从发现/实验档案页载入的记录 */
  externalLoad?: ExperimentRecord | null;
  /** 载入完成后清除外部记录：避免下次进入显微镜时旧存档覆盖新任务 */
  onExternalLoadDone?: () => void;
  /** E2 演示切片链接：直达录制示例的指定步（/dual 且存在真实分支时直达双结局） */
  demoSlice?: DemoSlice | null;
  onDemoSliceDone?: () => void;
  /** 从 Workspace 携带的任务：到达后自动启动一次 Run */
  externalPrompt?: string | null;
  onExternalPromptDone?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [usedPrompt, setUsedPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [root, setRoot] = useState<BranchNode | null>(null);
  const [activePath, setActivePath] = useState<number[]>([]);
  const [liveSteps, setLiveSteps] = useState<TokenStep[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  // 导演系统：生成中命中大场面（birth/storm）时在标本台上演一次 Birth Scene，随后自行收场
  const [birthScene, setBirthScene] = useState<{
    index: number;
    storm: boolean;
  } | null>(null);
  const birthSceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directorCheckedRef = useRef(0);
  // 操作提示只对还没 hover/点击过 token 的用户显示，学会后永久淡出
  const [hintDone, setHintDone] = useState(
    () => localStorage.getItem("obs-token-hint-done") === "1",
  );
  const dismissHint = useCallback(() => {
    setHintDone((prev) => {
      if (!prev) localStorage.setItem("obs-token-hint-done", "1");
      return true;
    });
  }, []);
  // 专家热力模式：默认关闭，正文安静可读；打开后每词背景深浅 = 熵（记在本机）
  const [heat, setHeat] = useState(
    () => localStorage.getItem("obs-heat") === "1",
  );
  const toggleHeat = useCallback(() => {
    setHeat((prev) => {
      localStorage.setItem("obs-heat", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  const [seed, setSeed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // E5a 深度采集：默认关。开启后每步额外记录 top-256 采样前 logits（trace 体积放大约两个数量级）
  const [deepCapture, setDeepCapture] = useState(
    () => localStorage.getItem("obs-deep-capture") === "1",
  );
  const toggleDeepCapture = useCallback(() => {
    setDeepCapture((prev) => {
      localStorage.setItem("obs-deep-capture", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  // 复现验证：同 seed 再跑一次的逐 token 对比结果 + 进行中标志
  const [replayResult, setReplayResult] = useState<ReplayCompare | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [activeExpId, setActiveExpId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<
    [ExperimentRecord, ExperimentRecord] | null
  >(null);
  const [rules, setRules] = useState<Rule[]>(loadRules);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [oceanOpen, setOceanOpen] = useState(false);
  // Explain 层：选中的 Workflow 阶段（展开该段 Decision 卡）
  const [stageSel, setStageSel] = useState<WorkflowStage | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  // 预录采样演示（真实 .aitrace，懒加载）：首屏的「观看一次采样」
  const [demo, setDemo] = useState<DemoTrace | null>(null);
  const [demoPhase, setDemoPhase] = useState<
    "idle" | "loading" | "playing" | "paused" | "done"
  >("idle");
  const [demoIdx, setDemoIdx] = useState(-1);
  const [demoFocus, setDemoFocus] = useState<number | null>(null);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  // Replay 控制器：管理演示回放的播放/暂停/速度/书签
  const [replayController, setReplayController] = useState<ReplayController | null>(null);
  // Runtime Journey 开场序列：tokenize→prefill→decode 阶段号；null = 不在开场铺垫
  const [journeyStage, setJourneyStage] = useState<number | null>(null);
  // 先猜后验（Cognitive DNA 原则六）：犹豫点揭示前先请观众预测，可跳过、每场只一次
  const [predict, setPredict] = useState<{
    a: TokenCandidate;
    b: TokenCandidate;
    index: number;
    selectedId: number;
    selectedText: string;
  } | null>(null);
  // 观众的预测：候选 id；-1 = 跳过；null = 尚未作答（此时该犹豫点的 token 与概率仍隐藏）
  const [predictChoice, setPredictChoice] = useState<number | null>(null);
  // 本场是否已邀请过预测（防止续播回到犹豫点二次暂停）
  const predictedRef = useRef(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 演示中途停在犹豫点后的续播入口（持有 startDemo 里的节奏计划）
  const demoTickRef = useRef<((i: number) => void) | null>(null);
  // 运行代际：新一次 startDemo 作废旧 tick 链，防止并行双链（如 StrictMode 双效应）
  const demoRunIdRef = useRef(0);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(
    () => () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    },
    [],
  );

  const updateRules = useCallback((next: Rule[]) => {
    setRules(next);
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(next));
    } catch {
      // 存不下也不影响使用
    }
  }, []);
  // 存档需要 complete 时刻的运行上下文（state 闭包在 worker 回调里会过期）
  const runCtxRef = useRef<{
    prompt: string;
    seed: number | null;
    modelId: string;
    params: GenerationParams;
  } | null>(null);
  const activeExpIdRef = useRef<string | null>(null);
  activeExpIdRef.current = activeExpId;
  // 分岔重生成期间记录目标位置，complete 时挂树
  const pendingForkRef = useRef<{
    path: number[];
    forkStep: number;
    forcedId: number;
    forcedText: string;
  } | null>(null);
  // 复现验证进行中：持有原始 run 的 trace，complete 时与新 trace 逐 token 对比
  const pendingReplayRef = useRef<{ base: GenerationTrace } | null>(null);
  // Sprint 5/6：本次 Run 的前置真实子运行（检索/规划）产生的 agent 事件，complete 时挂进 trace
  const pendingAgentRef = useRef<{
    events: AgentEvent[];
    retrieval: RetrievalRecord | null;
  } | null>(null);
  // 规划子运行（src=observe-plan）的等待器：累积流式输出，complete 时交付计划原文
  const planWaitRef = useRef<{
    buf: string;
    resolve: (s: string) => void;
    reject: (e: Error) => void;
  } | null>(null);
  // Live-Debug 犹豫断点：开关持久化；每次 Run 开始时装弹，命中即真实中断并定位该步
  const [bpOn, setBpOn] = useState(
    () => localStorage.getItem("obs-bp-hesitation") === "1",
  );
  const toggleBp = useCallback(() => {
    setBpOn((prev) => {
      localStorage.setItem("obs-bp-hesitation", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  const bpArmedRef = useRef(false);
  const bpHitRef = useRef<number | null>(null);
  const bpCheckedRef = useRef(0);
  // Sprint 5/6 开关：联网检索 / Agent 规划接力（+ 可选规划模型），都持久化
  const [webOn, setWebOn] = useState(
    () => localStorage.getItem("obs-web-search") === "1",
  );
  const toggleWeb = useCallback(() => {
    setWebOn((prev) => {
      localStorage.setItem("obs-web-search", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  const [agentOn, setAgentOn] = useState(
    () => localStorage.getItem("obs-agent-plan") === "1",
  );
  const toggleAgent = useCallback(() => {
    setAgentOn((prev) => {
      localStorage.setItem("obs-agent-plan", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  // 规划模型：空字符串 = 同模型接力；选另一个模型 = 接力式双模型（先卸再载，交接如实记录）
  const [plannerId, setPlannerId] = useState(
    () => localStorage.getItem("obs-planner-model") ?? "",
  );
  const pickPlanner = useCallback((id: string) => {
    setPlannerId(id);
    localStorage.setItem("obs-planner-model", id);
  }, []);
  // 前置子运行阶段的人话状态（检索中/规划中），只在真实发生时显示
  const [prepNote, setPrepNote] = useState<string | null>(null);
  // Agent 规划舞台（Flow）：规划子运行真实发生时，计划 token 逐字流上主舞台
  const [planStage, setPlanStage] = useState<{
    planner: string;
    executor: string;
    text: string;
    status: "running" | "done" | "empty" | "failed";
    startedAt: number;
    durationMs: number | null;
    error: string | null;
  } | null>(null);
  // 一屏一问（P28）：运行中默认只留主叙事 + 细状态线；专业面板按需下潜
  const [proView, setProView] = useState(
    () => localStorage.getItem("obs-pro-view") === "1",
  );
  const toggleProView = useCallback(() => {
    setProView((prev) => {
      localStorage.setItem("obs-pro-view", prev ? "0" : "1");
      return !prev;
    });
  }, []);
  // 检索舞台（决策优先 v2 · S4）：检索真实完成后、首 token 到达前，
  // 在主舞台展示命中/弃用的真实文档（数据 = 本次 RetrievalRecord）
  const [prepRetrieval, setPrepRetrieval] = useState<RetrievalRecord | null>(
    null,
  );
  // AVP Team（S6）：检索子运行的实时状态（真实发起才有）
  const [webStage, setWebStage] = useState<{
    status: "running" | "done" | "failed";
    query: string;
    resultCount?: number;
    keptCount?: number;
    durationMs?: number;
    error?: string;
  } | null>(null);
  // Story Mode（Sprint A）：把当前路径的 trace 讲成纪录片（完成态入口）
  const [storyOn, setStoryOn] = useState(false);
  // 停止请求：准备阶段（检索/规划子运行）中按停止时，worker 中断只能结束当前子运行，
  // 还需要这个标志阻止流水线继续推进到主生成（否则「停止不生效」）
  const stopReqRef = useRef(false);
  // 意外重载恢复：运行中页面被重载（多为低配设备内存不足）时，下次挂载诚实告知并恢复问题
  const [recoveredPrompt, setRecoveredPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!worker) return;
    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      // 规划子运行（真实生成，不记主 trace）：累积流式输出，完成时交付计划原文
      if (msg.src === "observe-plan") {
        const w = planWaitRef.current;
        if (!w) return;
        if (msg.status === "update") {
          w.buf += msg.output;
          const buf = w.buf;
          setPlanStage((prev) =>
            prev && prev.status === "running" ? { ...prev, text: buf } : prev,
          );
        } else if (msg.status === "complete") {
          planWaitRef.current = null;
          w.resolve(w.buf);
        } else if (msg.status === "error") {
          planWaitRef.current = null;
          w.reject(new Error(msg.data));
        }
        return;
      }
      if (msg.src !== "observe") return;
      switch (msg.status) {
        case "trace-steps":
          setLiveSteps((prev) => [...prev, ...msg.steps]);
          break;
        case "complete": {
          const trace = msg.trace as GenerationTrace | undefined;
          const replay = pendingReplayRef.current;
          if (trace && replay) {
            setReplayResult(compareTraces(replay.base, trace));
            pendingReplayRef.current = null;
            setVerifying(false);
            setPhase("done");
            setLiveSteps([]);
            break;
          }
          const fork = pendingForkRef.current;
          if (trace && fork) {
            setRoot((prev) => {
              if (!prev) return prev;
              const clone = structuredClone(prev);
              const parent = getNode(clone, fork.path);
              parent.children.push({
                forkStep: fork.forkStep,
                forcedId: fork.forcedId,
                forcedText: fork.forcedText,
                trace,
                children: [],
              });
              setActivePath([...fork.path, parent.children.length - 1]);
              // 干预闭环：分支回来后自动定位首个实质差异步（即被改选的那一步）
              setTimeout(() => {
                setSelected(fork.forkStep);
                document
                  .querySelector(`[data-token-index="${fork.forkStep}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 350);
              // 分岔挂树后同步进存档（历史里保留完整分岔树）
              const expId = activeExpIdRef.current;
              if (expId) {
                void updateExperiment(expId, {
                  root: clone,
                  stats: computeStats(clone),
                }).then(() => setHistoryKey((k) => k + 1));
              }
              return clone;
            });
            pendingForkRef.current = null;
          } else if (trace) {
            // 前置子运行（检索/规划/交接）的事件挂进本次 trace：事件与证据都来自真实调用
            const pend = pendingAgentRef.current;
            if (pend) {
              if (pend.events.length > 0) trace.agent = pend.events;
              if (pend.retrieval)
                trace.extensions = {
                  ...(trace.extensions ?? {}),
                  retrieval: pend.retrieval,
                };
              pendingAgentRef.current = null;
            }
            const newRoot: BranchNode = {
              forkStep: 0,
              forcedId: -1,
              forcedText: "",
              trace,
              children: [],
            };
            setRoot(newRoot);
            setActivePath([]);
            // 自动存档：产品的「时间维度」
            const ctx = runCtxRef.current;
            if (ctx) {
              const rec: ExperimentRecord = {
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                name: defaultName(ctx.prompt),
                starred: false,
                source: "run",
                prompt: ctx.prompt,
                modelId: ctx.modelId,
                params: {
                  temperature: ctx.params.temperature,
                  topP: ctx.params.topP,
                },
                seed: ctx.seed,
                device: trace.device,
                root: newRoot,
                stats: computeStats(newRoot),
              };
              setActiveExpId(rec.id);
              void saveExperiment(rec).then(() => setHistoryKey((k) => k + 1));
            }
          }
          setPhase("done");
          setLiveSteps([]);
          sessionStorage.removeItem(RUN_GUARD_KEY);
          bpArmedRef.current = false;
          // Live-Debug 断点命中：中断已完成，自动定位到命中步供检查（检查后可 Continue 续跑）
          if (bpHitRef.current !== null) {
            const bpIdx = bpHitRef.current;
            bpHitRef.current = null;
            setTimeout(() => {
              setSelected(bpIdx);
              document
                .querySelector(`[data-token-index="${bpIdx}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 350);
          }
          break;
        }
        case "error":
          setError(msg.data);
          setPhase("done");
          pendingForkRef.current = null;
          pendingReplayRef.current = null;
          pendingAgentRef.current = null;
          bpArmedRef.current = false;
          bpHitRef.current = null;
          setVerifying(false);
          sessionStorage.removeItem(RUN_GUARD_KEY);
          break;
      }
    };
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker]);

  /** 启动一次 Run：可选前置真实子运行（联网检索 / Agent 规划接力），
   *  每个子运行都产生真实 agent 事件并在 complete 时挂进同一条 trace；
   *  子运行失败如实记录（ok:false + 错误原文）并降级为直接作答，不隐藏、不虚构。 */
  const runWith = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || phase === "running" || busy || !worker) return;
    setUsedPrompt(text);
    setActiveExpId(null);
    setRoot(null);
    setActivePath([]);
    setLiveSteps([]);
    setSelected(null);
    setError(null);
    setReplayResult(null);
    setStoryOn(false);
    setPhase("running");
    stopReqRef.current = false;
    setRecoveredPrompt(null);
    // 运行守卫：若本次运行中页面被意外重载，下次挂载可诚实告知并恢复问题
    try {
      sessionStorage.setItem(
        RUN_GUARD_KEY,
        JSON.stringify({ prompt: text, at: Date.now() }),
      );
    } catch {
      /* 存储不可用时不阻断运行 */
    }
    bpHitRef.current = null;
    bpCheckedRef.current = 0;
    bpArmedRef.current = bpOn;
    logVisit("own_run_start");

    const events: AgentEvent[] = [];
    let retrieval: RetrievalRecord | null = null;
    let content = text;

    setPrepRetrieval(null);
    setPlanStage(null);
    setWebStage(null);
    if (webOn) {
      setPrepNote("正在联网检索…（真实搜索，调用与取舍都会记入 trace）");
      setWebStage({ status: "running", query: text });
      const t0 = performance.now();
      try {
        const results = await webSearch(text);
        const built = buildRetrievalEvents(
          text,
          results,
          performance.now() - t0,
        );
        events.push(...built.events);
        retrieval = built.record;
        setPrepRetrieval(built.record);
        setWebStage({
          status: "done",
          query: text,
          resultCount: results.length,
          keptCount: built.record.selected.length,
          durationMs: performance.now() - t0,
        });
        content = buildSearchPrompt(results.slice(0, RETRIEVAL_KEEP), text);
      } catch (e) {
        events.push(
          ...buildRetrievalFailEvents(
            text,
            e instanceof Error ? e.message : String(e),
            performance.now() - t0,
          ),
        );
        setWebStage({
          status: "failed",
          query: text,
          durationMs: performance.now() - t0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 停止在检索阶段生效：不再推进到规划/主生成
    if (stopReqRef.current) {
      setPrepNote(null);
      setWebStage(null);
      setPlanStage(null);
      setPhase("idle");
      sessionStorage.removeItem(RUN_GUARD_KEY);
      return;
    }

    if (agentOn) {
      const planner = plannerId || modelId;
      setPrepNote(null);
      const t1 = performance.now();
      setPlanStage({
        planner: getModel(planner)?.name ?? planner,
        executor: getModel(modelId)?.name ?? modelId,
        text: "",
        status: "running",
        startedAt: t1,
        durationMs: null,
        error: null,
      });
      try {
        const planRaw = await new Promise<string>((resolve, reject) => {
          planWaitRef.current = { buf: "", resolve, reject };
          worker.postMessage({
            type: "generate",
            data: {
              messages: [{ role: "user", content: buildPlanPrompt(text) }],
              params: { ...params, maxTokens: Math.min(params.maxTokens, 512) },
              modelId: planner,
              src: "observe-plan",
            },
          });
        });
        const planMs = performance.now() - t1;
        const plan = stripThinking(finalizeUnclosedThinking(planRaw)).trim();
        setPlanStage((prev) =>
          prev
            ? {
                ...prev,
                text: plan || prev.text,
                status: plan ? "done" : "empty",
                durationMs: planMs,
              }
            : prev,
        );
        if (plan) {
          events.push(...buildPlanEvents(text, plan, planMs, planner));
          if (planner !== modelId)
            events.push(buildHandoffEvent(planner, modelId));
          content = buildExecutePrompt(content, plan);
        } else {
          events.push({
            type: "tool_result",
            atStep: 0,
            tool: "plan",
            output:
              "规划子运行未产出计划文本（思考段未闭合或为空），本次按原问题直接作答",
            ok: false,
            durationMs: planMs,
            model: planner,
          });
        }
      } catch (e) {
        setPlanStage((prev) =>
          prev
            ? {
                ...prev,
                status: "failed",
                durationMs: performance.now() - t1,
                error: e instanceof Error ? e.message : String(e),
              }
            : prev,
        );
        events.push(
          { type: "tool_call", atStep: 0, tool: "plan", input: text, model: planner },
          {
            type: "tool_result",
            atStep: 0,
            tool: "plan",
            output: e instanceof Error ? e.message : String(e),
            ok: false,
            durationMs: performance.now() - t1,
            model: planner,
          },
        );
      }
    }

    // 停止在规划阶段生效：worker 中断只能结束规划子运行，
    // 这里阻止流水线继续推进到主生成（否则看起来「停不下来」）
    if (stopReqRef.current) {
      setPrepNote(null);
      setPlanStage(null);
      setWebStage(null);
      setPhase("idle");
      sessionStorage.removeItem(RUN_GUARD_KEY);
      return;
    }

    setPrepNote(null);
    pendingAgentRef.current =
      events.length > 0 ? { events, retrieval } : null;
    const s = Math.floor(Math.random() * 2 ** 31);
    setSeed(s);
    runCtxRef.current = { prompt: text, seed: s, modelId, params };
    worker.postMessage({
      type: "generate",
      data: {
        messages: [{ role: "user", content }],
        params,
        modelId,
        trace: true,
        src: "observe",
        seed: s,
        deep: deepCapture,
      },
    });
  }, [phase, busy, worker, params, modelId, deepCapture, bpOn, webOn, agentOn, plannerId]);

  const run = useCallback(() => void runWith(prompt), [runWith, prompt]);

  // Live-Debug 断点：生成中只扫描新到达的步，命中真实犹豫点即真实中断（与 Pause 同一机制）
  useEffect(() => {
    if (phase !== "running" || !bpArmedRef.current || bpHitRef.current !== null)
      return;
    const hit = hesitationBreakIndex(liveSteps, bpCheckedRef.current);
    bpCheckedRef.current = liveSteps.length;
    if (hit !== null) {
      bpHitRef.current = hit;
      bpArmedRef.current = false;
      worker?.postMessage({ type: "interrupt" });
    }
  }, [liveSteps, phase, worker]);

  // 意外重载恢复：上次运行中页面被重载（守卫未清除）时，诚实告知并把问题恢复到输入框
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RUN_GUARD_KEY);
      if (!raw) return;
      sessionStorage.removeItem(RUN_GUARD_KEY);
      const saved = JSON.parse(raw) as { prompt?: string };
      if (typeof saved.prompt === "string" && saved.prompt) {
        setPrompt((prev) => prev || saved.prompt!);
        setRecoveredPrompt(saved.prompt);
      }
    } catch {
      /* 损坏的守卫记录直接丢弃 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Workspace 的 [▶ Run]：携带任务到达后自动启动（模型未就绪时只填入提示词）
  useEffect(() => {
    if (!externalPrompt) return;
    setPrompt(externalPrompt);
    if (worker && !busy && phase !== "running") {
      void runWith(externalPrompt);
      onExternalPromptDone?.();
    }
  }, [externalPrompt, worker, busy, phase, runWith, onExternalPromptDone]);

  // 复现验证：用原始 run 的 prompt / 参数 / 同一个 seed 再跑一次，逐 token 对齐比较。
  // 不新建实验、不覆盖 root——只把第二次 trace 拿来与 root.trace 对比。
  const verifyReplay = useCallback(() => {
    const base = root?.trace;
    if (!base || !worker || phase === "running" || busy) return;
    const s = base.params.seed ?? seed;
    if (s === null || s === undefined) return;
    pendingReplayRef.current = { base };
    setReplayResult(null);
    setVerifying(true);
    setLiveSteps([]);
    setSelected(null);
    setError(null);
    setPhase("running");
    logVisit("replay_verify_start");
    worker.postMessage({
      type: "generate",
      data: {
        messages: [{ role: "user", content: usedPrompt }],
        params: {
          ...params,
          temperature: base.params.temperature,
          topP: base.params.topP,
        },
        modelId,
        trace: true,
        src: "observe",
        seed: s,
      },
    });
  }, [root, worker, phase, busy, seed, usedPrompt, params, modelId]);

  // Brief 生成方向：同一个提示词下拉出另一条可对比的真实 run（新 seed + 方向约束）
  const runDirection = useCallback(
    (suffix: string) => {
      const base = (usedPrompt || prompt).trim();
      if (!base) return;
      void runWith(`${base}\n\n（要求：${suffix}）`);
    },
    [runWith, usedPrompt, prompt],
  );

  // 干预分支实时视图：主路径 = 父 trace 全程，分支 = 强制候选 + 新生成的 token
  const forkView = useMemo(() => {
    if (phase !== "running" || !pendingForkRef.current || !root) return null;
    const fork = pendingForkRef.current;
    const parentSteps = composeSteps(root, fork.path);
    const parentStep = parentSteps[fork.forkStep];
    const cand = parentStep?.topk.find((c) => c.id === fork.forcedId);
    const branchSteps: TokenStep[] = [
      {
        id: fork.forcedId,
        text: fork.forcedText,
        prob: cand?.prob ?? 0,
        topk: parentStep?.topk ?? [],
        entropy: parentStep?.entropy ?? 0,
        dt: 0,
      },
      ...liveSteps,
    ];
    return { parentSteps, forkStep: fork.forkStep, branchSteps };
  }, [phase, root, liveSteps]);

  const displaySteps = useMemo(() => {
    if (phase === "running" && pendingForkRef.current && root) {
      const fork = pendingForkRef.current;
      const parentSteps = composeSteps(root, fork.path);
      const parentStep = parentSteps[fork.forkStep];
      const cand = parentStep?.topk.find((c) => c.id === fork.forcedId);
      return [
        ...parentSteps.slice(0, fork.forkStep),
        {
          id: fork.forcedId,
          text: fork.forcedText,
          prob: cand?.prob ?? 0,
          topk: parentStep?.topk ?? [],
          entropy: parentStep?.entropy ?? 0,
          dt: 0,
          forced: true,
        } as DisplayStep,
        ...(liveSteps as DisplayStep[]),
      ];
    }
    if (phase === "running") return liveSteps as DisplayStep[];
    if (root) return composeSteps(root, activePath);
    return [] as DisplayStep[];
  }, [phase, root, activePath, liveSteps]);

  // 导演系统排片（只在生成中参与渲染）：真实熵/top-2 差距分级，预算约束保证大场面稀缺
  const director = useMemo(
    () => (phase === "running" ? directScenes(liveSteps) : undefined),
    [phase, liveSteps],
  );

  // 扫描新到达的步：命中 birth / storm 起点就上演一次 Birth Scene（只在生成中）
  useEffect(() => {
    if (phase !== "running" || !director) {
      directorCheckedRef.current = 0;
      if (birthSceneTimer.current) clearTimeout(birthSceneTimer.current);
      setBirthScene(null);
      return;
    }
    for (let i = directorCheckedRef.current; i < director.length; i++) {
      const isStormStart =
        director[i] === "storm" && (i === 0 || director[i - 1] !== "storm");
      if (director[i] === "birth" || isStormStart) {
        setBirthScene({ index: i, storm: director[i] === "storm" });
        if (birthSceneTimer.current) clearTimeout(birthSceneTimer.current);
        birthSceneTimer.current = setTimeout(() => setBirthScene(null), 1400);
      }
    }
    directorCheckedRef.current = director.length;
  }, [phase, director]);

  const canFork =
    phase === "done" && root !== null && countNodes(root) < MAX_BRANCH_NODES;

  // 规则求值：生成中增量（随 liveSteps）、生成后全量，纯函数无 AI 参与
  const ruleMatches = useMemo(
    () => (displaySteps.length > 0 ? evaluateRules(displaySteps, rules) : []),
    [displaySteps, rules],
  );
  const annotations = useMemo(() => {
    // 生成中不显示标注，避免对不完整的句子进行误判
    if (phase === 'running') {
      return Array.from({ length: displaySteps.length }, () => []);
    }
    return matchesByToken(ruleMatches, displaySteps.length);
  }, [ruleMatches, displaySteps.length, phase]);

  const jumpToToken = useCallback((index: number) => {
    setSelected(index);
    document
      .querySelector(`[data-token-index="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const fork = useCallback(
    (displayIdx: number, candId: number, candText: string) => {
      if (!root?.trace || !worker || phase === "running" || busy) return;
      const steps = composeSteps(root, activePath);
      const prefixIds = [
        ...root.trace.promptIds,
        ...steps.slice(0, displayIdx).map((s) => s.id),
        candId,
      ];
      pendingForkRef.current = {
        path: activePath,
        forkStep: displayIdx,
        forcedId: candId,
        forcedText: candText,
      };
      const s = Math.floor(Math.random() * 2 ** 31);
      setSeed(s);
      setSelected(null);
      setLiveSteps([]);
      setError(null);
      setReplayResult(null);
      setPhase("running");
      worker.postMessage({
        type: "regenerate",
        data: { prefixIds, params, modelId, src: "observe", seed: s, deep: deepCapture },
      });
    },
    [root, worker, phase, busy, activePath, params, modelId, deepCapture],
  );

  /** C3.1 一键双跑：已有同步分支就直达双结局卡；没有则用该步真实的
   *  最高概率落选候选续跑（复用 fork，运行期复用现有 running 视图） */
  const dualRun = useCallback(
    (idx: number) => {
      if (!root) return;
      const node = getNode(root, activePath);
      const existing = node.children.findIndex((c) => c.forkStep === idx);
      if (existing >= 0) {
        setActivePath([...activePath, existing]);
        setSelected(null);
        return;
      }
      const steps = composeSteps(root, activePath);
      const st = steps[idx];
      if (!st || st.topk.length < 2) return;
      const alt = st.topk.find((c) => c.id !== st.id);
      if (!alt) return;
      fork(idx, alt.id, alt.text);
    },
    [root, activePath, fork],
  );

  /** 停止并保留已生成：主生成中 = 真实中断（已生成步全部保留）；
   *  准备阶段（检索/规划子运行）= 中断当前子运行并阻止流水线继续推进 */
  const interrupt = () => {
    stopReqRef.current = true;
    worker?.postMessage({ type: "interrupt" });
  };

  /** Debugger 的 Continue：从当前全部已生成 token 之后真实续跑（不强制改选）。
   *  新段作为分支挂树（forcedId=-1），永远区分于原始记录；续跑用新 seed 并如实记录。 */
  const continueRun = useCallback(() => {
    if (!root?.trace || !worker || phase === "running" || busy) return;
    const steps = composeSteps(root, activePath);
    if (steps.length === 0) return;
    const prefixIds = [...root.trace.promptIds, ...steps.map((s) => s.id)];
    pendingForkRef.current = {
      path: activePath,
      forkStep: steps.length,
      forcedId: -1,
      forcedText: "（续跑）",
    };
    const s = Math.floor(Math.random() * 2 ** 31);
    setSeed(s);
    setSelected(null);
    setLiveSteps([]);
    setError(null);
    setReplayResult(null);
    setPhase("running");
    worker.postMessage({
      type: "regenerate",
      data: { prefixIds, params, modelId, src: "observe", seed: s, deep: deepCapture },
    });
  }, [root, worker, phase, busy, activePath, params, modelId, deepCapture]);

  const download = () => {
    if (!root?.trace) return;
    const blob = new Blob(
      [exportReplay(root.trace, usedPrompt, rules, root.children)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "replay.aitrace";
    a.click();
    URL.revokeObjectURL(url);
  };

  const modelName = getModel(modelId)?.name ?? modelId;
  const selectedStep = selected !== null ? displaySteps[selected] : null;

  // AVP Team（S6）：真实子运行（检索/规划）发生时构建实时协作流；单纯生成不虚构团队
  const liveTeam = useMemo(() => {
    if (!webStage && !planStage) return null;
    return buildLiveTeam({
      research: webStage ?? undefined,
      plan: planStage
        ? {
            status: planStage.status,
            planner: planStage.planner,
            text: planStage.text,
            durationMs: planStage.durationMs,
            error: planStage.error,
          }
        : undefined,
      executor: {
        model: modelName,
        steps: displaySteps.length,
        phase:
          phase === "done"
            ? "done"
            : planStage?.status === "running" ||
                webStage?.status === "running"
              ? "waiting"
              : "running",
      },
    });
  }, [webStage, planStage, modelName, displaySteps.length, phase]);

  // 完成态回看（S6-9）：从 trace 的真实 agent 事件重建整场协作
  const doneTeam = useMemo(() => {
    const trace = root?.trace;
    if (phase !== "done" || !trace?.agent || trace.agent.length === 0)
      return null;
    return teamFromTrace(trace.agent, {
      executorModel: getModel(trace.modelId)?.name ?? trace.modelId,
      steps: trace.steps.length,
    });
  }, [phase, root]);

  // 分享卡：把当前分支的真实观察浓缩成一张 PNG（全部真实数据，无 AI 解读）
  const shareCard = useCallback(async () => {
    if (displaySteps.length === 0) return;
    const trace = root?.trace;
    const data = buildShareCardData(displaySteps, ruleMatches, {
      prompt: usedPrompt,
      modelName: getModel(trace?.modelId ?? modelId)?.name ?? trace?.modelId ?? modelId,
      device: trace?.device ?? device ?? "wasm",
      temperature: trace?.params.temperature ?? params.temperature,
      topP: trace?.params.topP ?? params.topP,
      seed: trace?.params.seed ?? seed,
    });
    try {
      const blob = await exportShareCard(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "observation-card.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [displaySteps, ruleMatches, usedPrompt, root, modelId, device, params, seed]);

  const loadExperiment = useCallback((rec: ExperimentRecord) => {
    if (pendingForkRef.current) return;
    // 随 Replay 导入的规则集：重现导出方看到的同一套标注
    if (rec.ruleset && validateRuleset(rec.ruleset) === null) {
      setRules(rec.ruleset);
    }
    setRoot(rec.root);
    setActivePath([]);
    setUsedPrompt(rec.prompt);
    setSeed(rec.seed);
    setSelected(null);
    setError(null);
    setLiveSteps([]);
    setPhase("done");
    setActiveExpId(rec.id);
  }, []);

  // 发现/实验档案页选中的记录：切回实验台时载入；若全局 TraceFocus
  // 锚定了该 run 的某一步，载入后直接定位到那一步
  useEffect(() => {
    if (!externalLoad) return;
    // 携带新任务到达时，新任务优先：不让旧存档把它顶成「完成态」
    if (externalPrompt) {
      onExternalLoadDone?.();
      return;
    }
    loadExperiment(externalLoad);
    onExternalLoadDone?.();
    const focus = getTraceFocus();
    if (focus?.runId === externalLoad.id && focus.stepIndex !== null) {
      const at = focus.stepIndex;
      setTimeout(() => jumpToToken(at), 300);
    }
  }, [externalLoad, externalPrompt, onExternalLoadDone, loadExperiment, jumpToToken]);

  // E2 演示切片链接：装载录制示例并直达指定步；/dual 且该步已有真实分支时直达双结局
  useEffect(() => {
    if (!demoSlice) return;
    let dead = false;
    void loadDemoTrace()
      .then((d) => {
        if (dead) return;
        setDemo(d);
        const steps = d.record.root.trace?.steps ?? [];
        const at = Math.min(demoSlice.step, Math.max(0, steps.length - 1));
        loadExperiment(d.record);
        setActiveExpId(null);
        if (demoSlice.dual) {
          const bi = d.record.root.children.findIndex(
            (c) => c.forkStep === at,
          );
          if (bi >= 0) setActivePath([bi]);
        }
        setTimeout(() => jumpToToken(at), 300);
        onDemoSliceDone?.();
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [demoSlice, loadExperiment, jumpToToken, onDemoSliceDone]);

  // 当前视图是否是内置录制示例（demo 链接只对它有效）
  const isDemoRecord = demo !== null && root === demo.record.root;
  const copyDemoLink = useCallback(() => {
    const step = selected ?? DEMO_STATS.tightest.index;
    const url = `${location.origin}${location.pathname}${buildDemoHash(step)}`;
    void navigator.clipboard.writeText(url);
  }, [selected]);

  const demoSteps = useMemo(
    () => demo?.record.root.trace?.steps ?? [],
    [demo],
  );

  // 开屏即有标本：进入实验台就预加载录制示例，休眠态可摸可拖
  useEffect(() => {
    if (demo || usedPrompt || phase !== "idle") return;
    let dead = false;
    void loadDemoTrace()
      .then((d) => {
        if (!dead) {
          setDemo(d);
          // 初始化 Replay 控制器
          const steps = d.record.root.trace?.steps ?? [];
          if (steps.length > 0) {
            const controller = new ReplayController(steps.length);
            setReplayController(controller);
          }
        }
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [demo, usedPrompt, phase]);
  /** 犹豫步统计（锚点 A6/A10）：从当前演示 trace 实时计算，不硬编码。
   *  口径：close = topk[0].prob − topk[1].prob < 0.05 且 topk[0].prob > 0.05，按差距升序 */
  const demoCloseSteps = useMemo(() => computeCloseSteps(demoSteps), [demoSteps]);
  const [showMoments, setShowMoments] = useState(false);

  /** 预录采样演示：首 token 点亮 → 播到 AI 最犹豫的一步主动停下，
   *  把选择权交给观众（看候选、再继续）→ 规则命中 → 收束。
   *  逐步节奏由真实 trace 的关键步驱动，全程无伪造数据。 */
  const startDemo = useCallback(async (opts?: { fastArrive?: boolean }) => {
    if (
      demoPhase === "loading" ||
      demoPhase === "playing" ||
      demoPhase === "paused"
    )
      return;
    const fastArrive = opts?.fastArrive === true;
    let d = demo;
    if (!d) {
      setDemoPhase("loading");
      try {
        d = await loadDemoTrace();
      } catch (e) {
        setDemoPhase("idle");
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      setDemo(d);
    }
    const steps = d.record.root.trace?.steps ?? [];
    const n = steps.length;
    if (n === 0) {
      setDemoPhase("idle");
      return;
    }
    let peak = 0;
    for (let i = 1; i < n; i++)
      if (steps[i].entropy > steps[peak].entropy) peak = i;
    // 犹豫点：前两候选概率最接近的一步——AI 真正的“硬币时刻”，演示在这里停下把选择权交给观众
    let pauseAt = -1;
    for (let i = 3, best = Infinity; i < n; i++) {
      const tk = steps[i].topk;
      if (tk.length >= 2 && tk[0].prob > 0.05) {
        const gap = tk[0].prob - tk[1].prob;
        if (gap < best) {
          best = gap;
          pauseAt = i;
        }
      }
    }
    const firstHit = evaluateRules(steps, rules)
      .map((m) => m.from)
      .filter((i) => i > 0 && i !== peak)
      .sort((a, b) => a - b)[0];
    // 章节停黏：在真实关键步主动停下等观众——留思考空间，由用户点继续，不一口气播完
    const stops = new Map<number, { note: string; focus?: boolean }>();
    if (!fastArrive && pauseAt !== 0)
      stops.set(0, {
        note: "第一个字出现了——它不是被想好的，而是从几十个候选里按概率选出来的",
        focus: true,
      });
    if (peak !== pauseAt && peak !== 0)
      stops.set(peak, {
        note: `第 ${peak + 1} 步：这里候选分布最分散（本次 trace 的最高熵步）`,
        focus: true,
      });
    if (firstHit !== undefined && !stops.has(firstHit) && firstHit !== pauseAt)
      stops.set(firstHit, { note: "规则命中：这一段触发了你设的标注条件" });
    const visited = new Set<number>();
    const runId = ++demoRunIdRef.current;
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    const fast = Math.max(14, 8000 / Math.max(1, n));
    // 首屏直达模式（A4）：犹豫点之前快进扫过（约 3 秒）、不停趴——“快”是铺垫，“停”才有重量
    const arriveFast = Math.max(8, 3000 / Math.max(1, pauseAt));
    setDemoPhase("playing");
    setDemoIdx(-1);
    setDemoNote(null);
    setPredict(null);
    setPredictChoice(null);
    predictedRef.current = false;
    const tick = (i: number) => {
      if (runId !== demoRunIdRef.current) return;
      if (i >= n) {
        setDemoNote(null);
        setDemoPhase("done");
        logVisit("demo_done");
        return;
      }
      if (i === pauseAt && !predictedRef.current) {
        // 停在犹豫点：先猜后验——揭示概率与该 token 之前，先请观众预测（可跳过）。
        // 此刻不 setDemoIdx(i)：犹豫点的字与概率暂不显示，避免"答案先于预测"。
        const [a, b] = steps[i].topk;
        predictedRef.current = true;
        setDemoPhase("paused");
        setDemoFocus(null);
        logVisit("demo_pause_reached");
        logVisit("predict_shown");
        setPredict({
          a,
          b,
          index: i,
          selectedId: steps[i].id,
          selectedText: steps[i].text,
        });
        setPredictChoice(null);
        setDemoNote(null);
        return;
      }
      const stop = stops.get(i);
      if (stop && !visited.has(i) && !(fastArrive && i < pauseAt)) {
        // 章节停黏：世界停在这一步，等观众看清、自己点继续
        visited.add(i);
        setDemoIdx(i);
        if (stop.focus) setDemoFocus(i);
        setDemoNote(stop.note);
        setDemoPhase("paused");
        logVisit("demo_pause_reached");
        return;
      }
      setDemoIdx(i);
      if (fastArrive && i < pauseAt) {
        setDemoNote(null);
        demoTimerRef.current = setTimeout(() => tick(i + 1), arriveFast);
        return;
      }
      setDemoNote(null);
      demoTimerRef.current = setTimeout(() => tick(i + 1), fast);
    };
    demoTickRef.current = tick;
    // Runtime Journey 开场（Sprint 2）：非快进模式且 trace 记录了 pipeline 时，先把
    // tokenize→prefill→decode 三段真实启动路走给观众看；无 pipeline 数据就诚实缺席。
    const pipeline = d.record.root.trace?.pipeline ?? null;
    if (!fastArrive && pipeline) {
      const advance = (s: number) => {
        if (runId !== demoRunIdRef.current) return;
        if (s > 2) {
          setJourneyStage(null);
          tick(0);
          return;
        }
        setJourneyStage(s);
        demoTimerRef.current = setTimeout(() => advance(s + 1), 1800);
      };
      demoTimerRef.current = setTimeout(() => advance(0), 300);
      return;
    }
    // 静止片刻：只有问题留在中央，再等第一个 token
    demoTimerRef.current = setTimeout(() => tick(0), fastArrive ? 200 : 500);
  }, [demo, demoPhase, rules]);

  /** 观众作答（或跳过）：揭示犹豫点的字与概率，交回验证。choiceId = 候选 id；-1 = 跳过。 */
  const answerPredict = useCallback(
    (choiceId: number) => {
      if (!predict) return;
      if (choiceId !== -1) logVisit("predict_answered");
      setPredictChoice(choiceId);
      // 作答后才揭示：显示该 token 并把镜头对准这一步的完整候选分布
      setDemoIdx(predict.index);
      setDemoFocus(predict.index);
    },
    [predict],
  );

  /** 犹豫点续播：观众看过候选后继续看 AI 写完 */
  const resumeDemo = useCallback(() => {
    if (demoPhase !== "paused") return;
    logVisit("demo_pause_resume");
    setDemoPhase("playing");
    setDemoFocus(null);
    setDemoNote(null);
    setPredict(null);
    setPredictChoice(null);
    demoTickRef.current?.(demoIdx + 1);
  }, [demoPhase, demoIdx]);

  /** Replay 传输控制：任意时刻暂停；逐步前后时全世界（句子带/3D/Inspector）同步 */
  const pauseDemo = useCallback(() => {
    if (demoPhase !== "playing") return;
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setJourneyStage(null);
    setDemoPhase("paused");
    setDemoNote(null);
  }, [demoPhase]);

  /** 跳过开场铺垫：直接从第一个 token 开始 */
  const skipJourney = useCallback(() => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setJourneyStage(null);
    demoTickRef.current?.(0);
  }, []);

  const stepDemoTo = useCallback(
    (i: number) => {
      const n = demoSteps.length;
      if (n === 0) return;
      const at = Math.max(0, Math.min(i, n - 1));
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      setJourneyStage(null);
      setDemoPhase("paused");
      setDemoNote(null);
      setPredict(null);
      setPredictChoice(null);
      setDemoIdx(at);
      setDemoFocus(at);
    },
    [demoSteps.length],
  );

  // 首屏零下载入口：进入实验台后自动开始播放预录采样
  useEffect(() => {
    if (!autoDemo) return;
    onAutoDemoDone?.();
    // 首屏「亲眼看这一刻」入口：快进直达犹豫点（≤10 秒兑现承诺）
    void startDemo({ fastArrive: true });
  }, [autoDemo, onAutoDemoDone, startDemo]);

  /** 演示结束落点二：回到安静的实验入口，聚焦提示词控制台 */
  const startMyExperiment = useCallback(() => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setJourneyStage(null);
    setDemoPhase("idle");
    setDemoIdx(-1);
    setDemoNote(null);
    setPredict(null);
    setPredictChoice(null);
    promptRef.current?.focus();
  }, []);

  const openCompare = useCallback(async () => {
    if (compareIds.length !== 2) return;
    const [ra, rb] = await Promise.all(compareIds.map((id) => getExperiment(id)));
    if (ra && rb) setComparePair([ra, rb]);
  }, [compareIds]);

  return (
    <div className="observe-dark flex flex-1 min-h-0 bg-obs text-obs-ink">
      {comparePair ? (
        <Suspense fallback={<div className="flex-1" />}>
          <CompareView pair={comparePair} onClose={() => setComparePair(null)} />
        </Suspense>
      ) : (
      <>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex flex-wrap justify-end gap-x-5 gap-y-1.5 px-5 pt-3">
          <button
            aria-label="本次记录范围"
            title="本次记录范围：将记录什么 / 不记录什么"
            className={`flex items-center gap-1.5 text-[11px] tracking-wide transition-colors ${
              scopeOpen ? "text-obs-ink" : "text-obs-ink2/70 hover:text-obs-ink"
            }`}
            onClick={() => setScopeOpen((v) => !v)}
          >
            记录范围
          </button>
          {scopeOpen && (
            <>
              <button
                aria-label="关闭记录范围"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setScopeOpen(false)}
              />
              <div className="absolute right-4 top-12 z-30 w-[min(360px,90vw)] shadow-float">
                <TraceScope device={device} />
              </div>
            </>
          )}
          <button
            aria-label="标注规则"
            title="标注规则"
            className={`flex items-center gap-1.5 text-[11px] tracking-wide transition-colors ${
              rulesOpen ? "text-obs-ink" : "text-obs-ink2/70 hover:text-obs-ink"
            }`}
            onClick={() => setRulesOpen(true)}
          >
            <IconList className="h-3 w-3" />
            标注规则
          </button>
          <button
            aria-label="深度采集"
            aria-pressed={deepCapture}
            title="每步额外记录 top-256 采样前 logits 快照，供采样显微镜做温度反事实重算；trace 体积随之放大约两个数量级，默认关闭"
            className={`flex items-center gap-1.5 text-[11px] tracking-wide transition-colors ${
              deepCapture ? "text-measure-300" : "text-obs-ink2/70 hover:text-obs-ink"
            }`}
            onClick={toggleDeepCapture}
          >
            深度采集{deepCapture ? " · 开" : ""}
          </button>
          <button
            aria-label="实验时间线"
            title="实验时间线"
            className={`flex items-center gap-1.5 text-[11px] tracking-wide transition-colors ${
              historyOpen ? "text-obs-ink" : "text-obs-ink2/70 hover:text-obs-ink"
            }`}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <IconClock className="h-3 w-3" />
            实验时间线
          </button>
        </div>
        <div className="@container flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative mx-auto max-w-[760px] px-6 py-8">
            {/* 背景证据流场：流线波幅逐段 = 本次运行真实熵（确定段平顺，犹豫段湍流） */}
            {displaySteps.length > 1 && (
              <EvidenceField
                steps={displaySteps as TokenStep[]}
                running={phase === "running"}
              />
            )}
            {/* 意外重载恢复：诚实告知上次运行未完成，问题已恢复到输入框（可一键重试） */}
            {recoveredPrompt && phase === "idle" && (
              <div className="mb-4 rounded-md border border-amber-400/30 bg-obs-2 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-obs-ink">
                  上次运行中页面被意外重载（多为浏览器内存不足），那次记录未能完成。
                  问题已恢复到下方输入框，可直接重试。
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="rounded-md border border-obs-line px-3.5 py-1 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                    onClick={() => void runWith(recoveredPrompt)}
                  >
                    用同一个问题重试
                  </button>
                  <button
                    className="rounded-md px-3 py-1 text-[12px] text-obs-ink2/70 transition-colors hover:text-obs-ink"
                    onClick={() => setRecoveredPrompt(null)}
                  >
                    知道了
                  </button>
                </div>
              </div>
            )}
            {!usedPrompt && phase === "idle" && (
              <div className="mt-2">
                {/* 生成标本台：单屏主角——满幅、占去首屏绝大部分视觉重量的观测装置 */}
                <div className="relative left-1/2 h-[min(68vh,720px)] min-h-[440px] w-[100cqw] -translate-x-1/2 px-6">
                  <Suspense fallback={<div className="h-full" />}>
                    <InstrumentCluster
                      mode={
                        demoPhase === "playing" || demoPhase === "paused"
                          ? "sampling"
                          : demoPhase === "done"
                            ? "settled"
                            : "dormant"
                      }
                      steps={demoSteps}
                      index={
                        demoPhase === "idle" || demoPhase === "loading"
                          ? demoSteps.length - 1
                          : Math.min(demoIdx, demoSteps.length - 1)
                      }
                      focus={demoPhase === "playing" ? null : demoFocus}
                      onFocus={(i) => {
                        if (demoPhase === "paused") logVisit("demo_pause_candidate");
                        setDemoFocus(i);
                      }}
                      fallback={
                        <SamplingChamber
                          mode={
                            demoPhase === "playing" || demoPhase === "paused"
                              ? "sampling"
                              : demoPhase === "done"
                                ? "settled"
                                : "idle"
                          }
                          steps={demoSteps}
                          index={
                            demoPhase === "idle" || demoPhase === "loading"
                              ? -1
                              : Math.min(demoIdx, demoSteps.length - 1)
                          }
                          prompt={demo ? demo.record.prompt : null}
                          runLabel={demo ? demo.label : null}
                          note={demoNote}
                          onStepSeek={(idx) => {
                            setDemoIdx(idx);
                            setDemoPhase("paused");
                          }}
                        />
                      }
                    />
                  </Suspense>
                  {/* 浮层：实验信息与样例标识（不遮挡交互） */}
                  <div className="pointer-events-none absolute left-6 top-0 flex max-w-[45cqw] items-center gap-1.5 truncate text-[11px] tabular-nums tracking-wide text-obs-ink2/85 select-none">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        demoPhase === "playing" || demoPhase === "paused"
                          ? "bg-measure-400"
                          : "bg-obs-ink2/40"
                      }`}
                    />
                    {demo
                      ? demoPhase === "idle" || demoPhase === "loading"
                        ? `录制示例 · 非实时 · 点击观看完整采样`
                        : demo.label
                      : `${modelName} · ${device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : "—"} · T${params.temperature} · seed 随运行记录`}
                  </div>
                  {demo && (
                    <p className="pointer-events-none absolute left-1/2 top-6 w-[min(520px,90%)] -translate-x-1/2 text-center text-[14px] leading-relaxed text-obs-ink/90 select-none">
                      {demo.record.prompt}
                    </p>
                  )}
                  {/* 语义层：正在被写出来的那句话——上面读语言，下面看概率空间 */}
                  {demo &&
                    demoIdx >= 0 &&
                    (demoPhase === "playing" ||
                      demoPhase === "paused" ||
                      demoPhase === "done") && (
                      <div className="absolute left-1/2 top-14 z-10 w-full -translate-x-1/2">
                        <SentenceRibbon
                          steps={demoSteps}
                          upto={demoIdx}
                          current={demoFocus ?? demoIdx}
                          onSelect={stepDemoTo}
                        />
                      </div>
                    )}
                  {demoNote && demoPhase === "playing" && (
                    <p className="pointer-events-none absolute bottom-52 left-1/2 -translate-x-1/2 rounded-md border border-obs-line bg-obs-2/90 px-3 py-1 text-[12px] text-obs-ink select-none">
                      {demoNote}
                    </p>
                  )}
                  {/* Focus Lens：选中某步时从右侧长出的局部采样检查器；未选中时显示此刻卡 */}
                  {demoFocus !== null && demoSteps[demoFocus] ? (
                    <div className="focus-lens-in absolute right-6 top-8 z-10 max-h-[380px] w-[min(310px,85cqw)] overflow-y-auto">
                      <SamplingInspector
                        step={demoSteps[demoFocus]}
                        stepIndex={demoFocus}
                        total={demoSteps.length}
                        params={demo?.record.root.trace?.params ?? null}
                        seed={demo?.record.root.trace?.params.seed ?? null}
                        onInspect={() => {
                          if (!demo) return;
                          const at = demoFocus;
                          loadExperiment(demo.record);
                          setActiveExpId(null);
                          setTimeout(() => jumpToToken(at), 300);
                        }}
                        onClose={() => setDemoFocus(null)}
                      />
                    </div>
                  ) : (
                    (demoPhase === "playing" ||
                      demoPhase === "paused" ||
                      demoPhase === "done") &&
                    demoIdx >= 0 &&
                    demoSteps.length > 0 && (
                      <div className="absolute right-6 top-8 z-10 w-[min(280px,80cqw)]">
                        <MomentCard
                          steps={demoSteps}
                          index={Math.min(demoIdx, demoSteps.length - 1)}
                        />
                      </div>
                    )
                  )}
                  {/* 决策日志：到当前步为止的人话决策事件，点击跳步 */}
                  {(demoPhase === "playing" ||
                    demoPhase === "paused" ||
                    demoPhase === "done") &&
                    demoIdx >= 0 && (
                      <div className="absolute left-6 top-24 z-10 hidden w-[min(220px,30cqw)] @3xl:block">
                        <ActivityLog
                          steps={demoSteps}
                          upto={Math.min(demoIdx, demoSteps.length - 1)}
                          current={demoFocus}
                          temperature={demo?.record.root.trace?.params.temperature}
                          onJump={stepDemoTo}
                        />
                      </div>
                    )}
                  {/* 思考字幕：实时翻译它此刻在做的事（暂停时底部引导卡已在说话，不叠加） */}
                  {(demoPhase === "playing" || demoPhase === "done") &&
                    demoIdx >= 0 &&
                    demoSteps.length > 0 && (
                      <div className="absolute bottom-52 left-1/2 z-10 -translate-x-1/2">
                        <ThinkingCaption
                          steps={demoSteps}
                          index={Math.min(demoIdx, demoSteps.length - 1)}
                          temperature={
                            demo?.record.root.trace?.params.temperature ?? 1
                          }
                        />
                      </div>
                    )}
                  {/* Replay 传输控制：播放/暂停/逐步，每一步全世界同步 */}
                  {/* 简化的演示回放控制 - 仅在 Replay 面板未激活时显示 */}
                  {!replayController &&
                    (demoPhase === "playing" ||
                      demoPhase === "paused" ||
                      demoPhase === "done") &&
                    demoSteps.length > 0 && (
                      <div className="absolute bottom-44 right-6 flex items-center gap-1 rounded-md border border-obs-line bg-obs-2/85 px-1.5 py-1">
                        <button
                          aria-label="上一步"
                          className="rounded-md px-2 py-0.5 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink disabled:opacity-30"
                          disabled={demoIdx <= 0}
                          onClick={() => stepDemoTo(demoIdx - 1)}
                        >
                          ◀
                        </button>
                        {demoPhase === "playing" ? (
                          <button
                            aria-label="暂停"
                            className="rounded-md px-2 py-0.5 text-[12px] text-obs-ink transition-colors hover:text-measure-300"
                            onClick={pauseDemo}
                          >
                            ❚❚
                          </button>
                        ) : (
                          <button
                            aria-label="继续播放"
                            className="rounded-md px-2 py-0.5 text-[12px] text-obs-ink transition-colors hover:text-measure-300 disabled:opacity-30"
                            disabled={demoIdx >= demoSteps.length - 1}
                            onClick={resumeDemo}
                          >
                            ▶
                          </button>
                        )}
                        <button
                          aria-label="下一步"
                          className="rounded-md px-2 py-0.5 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink disabled:opacity-30"
                          disabled={demoIdx >= demoSteps.length - 1}
                          onClick={() => stepDemoTo(demoIdx + 1)}
                        >
                          ▶▎
                        </button>
                        <span className="px-1 font-mono text-[11px] tabular-nums text-obs-ink2/70 select-none">
                          {Math.max(demoIdx + 1, 0)}/{demoSteps.length}
                        </span>
                      </div>
                    )}
                  {/* Replay 增强控制面板：集成到演示回放中 */}
                  {replayController &&
                    (demoPhase === "playing" ||
                      demoPhase === "paused" ||
                      demoPhase === "done") &&
                    demoSteps.length > 0 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(90%,1000px)]">
                        <ReplayControlPanel
                          controller={replayController}
                          onStepChange={(step) => {
                            setDemoIdx(step);
                            if (demoPhase === "playing") pauseDemo();
                          }}
                        />
                      </div>
                    )}
                  {/* 仪器底部动作栏 */}
                  <div className="absolute bottom-44 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
                    {(demoPhase === "idle" || demoPhase === "loading") && (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          className="rounded-md bg-measure-500 px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                          disabled={demoPhase === "loading"}
                          onClick={() => void startDemo()}
                        >
                          {demoPhase === "loading"
                            ? "正在装载录制示例…"
                            : "观看一次采样"}
                        </button>
                        <button
                          className="rounded-md border border-obs-line bg-obs/70 px-3.5 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                          onClick={() => {
                            setPrompt(EXAMPLE_PROMPT);
                            promptRef.current?.focus();
                          }}
                        >
                          试试：{EXAMPLE_PROMPT}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Runtime Journey 开场铺垫：真实 pipeline 实测的三段启动路 */}
                  {journeyStage !== null &&
                    demo?.record.root.trace?.pipeline &&
                    createPortal(
                      <RuntimeJourney
                        stage={journeyStage}
                        pipeline={demo.record.root.trace.pipeline}
                        promptTokens={
                          demo.record.root.trace.promptIds?.length ?? null
                        }
                        stepCount={demoSteps.length}
                        onSkip={skipJourney}
                      />,
                      document.body,
                    )}
                  {/* 犹豫点/章节停黏/收束态引导：用 portal 固定在视口底部，任何窗口尺寸都可见可点 */}
                  {demoPhase === "paused" &&
                    (predict !== null || demoNote !== null) &&
                    createPortal(
                    <div className="observe-dark fixed bottom-5 left-1/2 z-40 w-[min(560px,92vw)] -translate-x-1/2 rounded-md border border-obs-line bg-obs-2/95 px-4 py-3 shadow-float">
                      {predict === null && demoNote !== null ? (
                        // 章节停黏：世界停在真实关键步，由观众自己决定何时继续
                        <div>
                          <p className="text-center text-[13px] leading-relaxed text-obs-ink select-none">
                            {demoNote}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
                            <span className="text-[11px] text-obs-ink2/70 select-none">
                              可拖动镜头、点选任一根柱子细看
                            </span>
                            <button
                              className="demo-resume-pulse rounded-md bg-measure-500 px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
                              onClick={resumeDemo}
                            >
                              ▶ 继续
                            </button>
                          </div>
                        </div>
                      ) : predict && predictChoice === null ? (
                        // 先猜后验：揭示概率之前，请观众预测（可跳过）
                        <div>
                          <p className="text-center text-[13px] leading-relaxed text-obs-ink select-none">
                            停一下——它在这里几乎是掷硬币。揭晓之前，你猜它写下了哪个字？
                          </p>
                          {/* 真实前文填空：让观众知道自己在猜哪句话的下一个词 */}
                          <p className="mt-1.5 overflow-hidden whitespace-nowrap text-center font-mono text-[12px] text-obs-ink2 select-none">
                            ……
                            {demoSteps
                              .slice(Math.max(0, predict.index - 14), predict.index)
                              .map((s) => s.text)
                              .join("")
                              .trimStart()}
                            <span className="mx-0.5 rounded bg-measure-500/25 px-1.5 text-measure-200">＿＿</span>
                          </p>
                          <div className="mt-2.5 flex items-center justify-center gap-2.5">
                            <button
                              className="rounded-md border border-obs-line px-4 py-1.5 font-mono text-[13px] text-obs-ink transition-colors hover:border-measure-400 hover:bg-white/5"
                              onClick={() => answerPredict(predict.a.id)}
                            >
                              「{predict.a.text.trim() || predict.a.text}」
                            </button>
                            <span className="text-[11px] text-obs-ink2/60 select-none">
                              还是
                            </span>
                            <button
                              className="rounded-md border border-obs-line px-4 py-1.5 font-mono text-[13px] text-obs-ink transition-colors hover:border-measure-400 hover:bg-white/5"
                              onClick={() => answerPredict(predict.b.id)}
                            >
                              「{predict.b.text.trim() || predict.b.text}」
                            </button>
                          </div>
                          <div className="mt-2 text-center">
                            <button
                              className="text-[11px] text-obs-ink2/70 underline decoration-dotted underline-offset-2 transition-colors hover:text-obs-ink"
                              onClick={() => answerPredict(-1)}
                            >
                              直接看答案
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {predict && (
                            <p className="text-center text-[13px] leading-relaxed text-obs-ink select-none">
                              它差点走向另一个答案：「{predict.a.text.trim() || predict.a.text}」
                              {(predict.a.prob * 100).toFixed(2)}% vs 「
                              {predict.b.text.trim() || predict.b.text}」
                              {(predict.b.prob * 100).toFixed(2)}%
                            </p>
                          )}
                          {predict && predictChoice !== null && predictChoice !== -1 && (
                            <p className="mt-1 text-center text-[12px] font-medium select-none">
                              {predictChoice === predict.selectedId ? (
                                <span className="text-obs-ink">
                                  你猜中了——它确实写下「
                                  {predict.selectedText.trim() || predict.selectedText}」
                                </span>
                              ) : (
                                <span className="text-amber-300/90">
                                  这次它写的是「
                                  {predict.selectedText.trim() || predict.selectedText}
                                  」——只差一点，换个 seed 就可能是你猜的那个
                                </span>
                              )}
                            </p>
                          )}
                          {/* A5：机制第一次出场——概率抽签 → seed 硬币，闭合首屏谜题 */}
                          <p className="mt-1.5 text-center text-[12px] leading-relaxed text-obs-ink2 select-none">
                            AI 并不是先想好整句话——它每写一个字，都在从几十个候选里按概率抽签。
                            同一个 seed
                            {demo?.record.root.trace?.params.seed !== undefined
                              ? `（本次 ${demo.record.root.trace.params.seed}）`
                              : ""}
                            ，这枚硬币每次掷出同一面；换一个，就可能是另一个答案——这就是你每次得到不同回答的原因。
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
                            <span className="text-[12px] text-obs-ink2 select-none">
                              正文里每个字都可点，看看它差点选的字
                            </span>
                            <button
                              className="demo-resume-pulse rounded-md bg-measure-500 px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
                              onClick={resumeDemo}
                            >
                              ▶ 继续看它写完
                            </button>
                          </div>
                        </>
                      )}
                    </div>,
                    document.body,
                  )}
                  {demoPhase === "done" &&
                    createPortal(
                    <div className="observe-dark fixed bottom-5 left-1/2 z-40 w-[min(600px,92vw)] -translate-x-1/2 rounded-md border border-obs-line bg-obs-2/95 px-4 py-3 shadow-float">
                      {/* A6：真实统计版收束，全部数字实时算自当前 trace */}
                      <p className="text-center text-[12px] leading-relaxed text-obs-ink select-none">
                        这个回答共 {demoSteps.length} 步。其中 {demoCloseSteps.length} 步，前两名候选的概率差不足
                        5%——它有 {demoCloseSteps.length} 次差点变成另一个答案。
                        {demoCloseSteps.length > 0 && (
                          <>
                            最险的一步：第 {demoCloseSteps[0].index + 1} 步，差距
                            {formatGap(demoCloseSteps[0].gap)}。
                          </>
                        )}
                      </p>
                      {showMoments && (
                        <div className="mt-2 max-h-[30vh] overflow-y-auto rounded-md border border-obs-line bg-obs/60 p-1.5">
                          {demoCloseSteps.map((s) => (
                            <button
                              key={s.index}
                              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] tabular-nums text-obs-ink2 transition-colors hover:bg-white/5 hover:text-obs-ink"
                              onClick={() => {
                                if (!demo) return;
                                logVisit("done_moment_jump");
                                const at = s.index;
                                loadExperiment(demo.record);
                                setActiveExpId(null);
                                setTimeout(() => jumpToToken(at), 300);
                              }}
                            >
                              <span>第 {s.index + 1} 步</span>
                              <span className="min-w-0 flex-1 truncate text-center">
                                「{s.a}」{(s.ap * 100).toFixed(2)}% vs 「{s.b}」
                                {(s.bp * 100).toFixed(2)}%
                              </span>
                              <span>差 {(s.gap * 100).toFixed(2)}%</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <button
                          className="rounded-md bg-measure-500 px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-85"
                          onClick={() =>
                            setShowMoments((v) => {
                              if (!v) logVisit("done_moments_open");
                              return !v;
                            })
                          }
                        >
                          {showMoments
                            ? "收起列表"
                            : `回看这 ${demoCloseSteps.length} 个瞬间`}
                        </button>
                        {onWantModel ? (
                          <button
                            className="rounded-md border border-obs-line bg-obs/70 px-3.5 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                            onClick={onWantModel}
                          >
                            跑自己的问题，看它掷你的硬币 →
                          </button>
                        ) : (
                          <button
                            className="rounded-md border border-obs-line bg-obs/70 px-3.5 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                            onClick={startMyExperiment}
                          >
                            跑自己的问题，看它掷你的硬币
                          </button>
                        )}
                      </div>
                    </div>,
                    document.body,
                  )}
                </div>
                {/* 回放结束后的收束视图：思路地图 + 没走的路（演示 trace 无模型，试跑按钮缺席） */}
                {demoPhase === "done" && demoSteps.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <ThoughtMap steps={demoSteps} onReplaySegment={stepDemoTo} />
                    <RoadsNotTaken steps={demoSteps} onJump={stepDemoTo} />
                  </div>
                )}
                <ResearchTimeline
                  refreshKey={historyKey}
                  onLoad={loadExperiment}
                  onCompare={(a, b) => setComparePair([a, b])}
                />
              </div>
            )}

            {usedPrompt && phase !== "running" && (
              <div className="mb-7">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-obs-ink2/50 select-none">
                  Prompt
                </p>
                <p className="rounded-md border border-obs-line bg-obs-2 px-4 py-3 text-[14px] leading-relaxed text-obs-ink">
                  {usedPrompt}
                </p>
              </div>
            )}

            {root && phase === "done" && countNodes(root) > 1 && (
              <div className="mb-6 rounded-md border border-obs-line bg-obs-2 p-3.5">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
                  分岔树 · {countNodes(root)}/{MAX_BRANCH_NODES}
                </p>
                <BranchTree
                  root={root}
                  path={[]}
                  activePath={activePath}
                  onSelect={(p) => {
                    setActivePath(p);
                    setSelected(null);
                  }}
                />
              </div>
            )}

            {/* 运行中控制台（一张卡）：左=本次运行身份，右=全部控制，下=任务阶段。
                掌控感来源：能看懂现在在哪一步，能随时暂停/断点/收起，控制不散落 */}
            {phase === "running" && !forkView && proView && (
              <div className="mb-3 rounded-md border border-obs-line bg-obs-2/85 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] tabular-nums tracking-wide text-obs-ink2 select-none">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        displaySteps.length > 0
                          ? "bg-measure-400"
                          : "bg-obs-ink2/50"
                      }`}
                    />
                    {`Run · ${modelName} · ${device === "webgpu" ? "WebGPU" : "WASM"} · T${params.temperature}${seed !== null ? ` · seed ${seed}` : ""}`}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1.5">
                    <button
                      className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink transition-colors hover:bg-obs"
                      onClick={interrupt}
                      title="真实中断生成：已生成的步全部保留，可检查后续跑"
                    >
                      ⏸ 暂停
                    </button>
                    <button
                      className={`rounded-md border px-3 py-1 text-[12px] transition-colors ${
                        bpOn
                          ? "border-amber-400/60 text-amber-200"
                          : "border-obs-line text-obs-ink2 hover:bg-obs hover:text-obs-ink"
                      }`}
                      onClick={toggleBp}
                      title="Live-Debug 断点：命中犹豫点（top-2 差距 <5%）自动暂停并定位该步"
                    >
                      ◉ 断点{bpOn ? " · 犹豫点" : ""}
                    </button>
                    <button
                      className="rounded-md border border-obs-line px-3 py-1 text-[12px] text-obs-ink2 transition-colors hover:bg-obs hover:text-obs-ink"
                      onClick={toggleProView}
                      title="回到默认视图：只留正文与细状态线（一屏一问）"
                    >
                      收起专业面板
                    </button>
                  </span>
                </div>
                <div className="mt-2.5 border-t border-obs-line/60 pt-2.5">
                  <WorkflowStrip
                    compact
                    phase={phase}
                    steps={displaySteps as TokenStep[]}
                  />
                </div>
              </div>
            )}

            {/* 子运行阶段（规划/检索，尚无任何 token）：主舞台只留 TeamFlow，
                仪表盘等首个 token 出来再登场，不和协作流叠在一起 */}
            {phase === "running" &&
              proView &&
              !forkView &&
              displaySteps.length === 0 &&
              liveTeam && (
                <div className="mb-6 flex flex-col items-center gap-4 py-6">
                  {usedPrompt && (
                    <p className="w-[min(520px,90%)] text-center text-[14px] leading-relaxed text-obs-ink/90 select-none">
                      {usedPrompt}
                    </p>
                  )}
                  <TeamFlow team={liveTeam} planLive={planStage} />
                </div>
              )}

            {phase === "running" &&
              (proView || forkView) &&
              !(displaySteps.length === 0 && liveTeam && !forkView) && (
              <div className="mb-6">
                <div className="relative left-1/2 h-[min(62vh,640px)] min-h-[360px] w-[100cqw] -translate-x-1/2 px-6">
                  {forkView && (
                    <button
                      type="button"
                      className="absolute right-6 top-0 z-20 rounded-md border border-obs-line bg-obs-2/85 px-2.5 py-0.5 text-[11px] text-obs-ink2 transition-colors hover:text-obs-ink"
                      onClick={toggleProView}
                      title="回到默认视图：只留正文与细状态线（一屏一问）"
                    >
                      收起专业面板
                    </button>
                  )}
                  <Suspense fallback={<div className="h-full" />}>
                    <InstrumentCluster
                      mode={displaySteps.length === 0 ? "waiting" : "sampling"}
                      steps={(forkView ? forkView.parentSteps : displaySteps) as TokenStep[]}
                      index={
                        forkView
                          ? Math.min(
                              forkView.forkStep + forkView.branchSteps.length,
                              forkView.parentSteps.length - 1,
                            )
                          : displaySteps.length - 1
                      }
                      focus={null}
                      onFocus={() => {}}
                      branch={forkView ? { forkStep: forkView.forkStep, steps: forkView.branchSteps } : null}
                      fallback={
                        <SamplingChamber
                          mode={displaySteps.length === 0 ? "waiting" : "sampling"}
                          steps={displaySteps as TokenStep[]}
                          index={displaySteps.length - 1}
                          prompt={usedPrompt}
                          runLabel={null}
                        />
                      }
                    />
                  </Suspense>
                  {forkView && (
                    <div className="pointer-events-none absolute left-6 top-0 flex max-w-[45cqw] items-center gap-1.5 truncate text-[11px] tabular-nums tracking-wide text-obs-ink2/85 select-none">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          displaySteps.length > 0 ? "bg-measure-400" : "bg-obs-ink2/40"
                        }`}
                      />
                      {`Run · ${modelName} · ${device === "webgpu" ? "WebGPU" : "WASM"} · T${params.temperature}${seed !== null ? ` · seed ${seed}` : ""}`}
                    </div>
                  )}
                  {usedPrompt && (
                    <p className="pointer-events-none absolute left-1/2 top-6 w-[min(520px,90%)] -translate-x-1/2 text-center text-[14px] leading-relaxed text-obs-ink/90 select-none">
                      {usedPrompt}
                    </p>
                  )}
                  {displaySteps.length === 0 && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
                      {prepNote ? (
                        <div className="mt-4 space-y-2">
                          <span className="breath-dot inline-block" />
                          <p className="text-[13px] text-obs-ink2 select-none">
                            {prepNote}
                          </p>
                          {/* 检索舞台：它刚去找了这些资料（命中暗，弃用更暗），全部真实记录 */}
                          {prepRetrieval && prepRetrieval.results.length > 0 && (
                            <div className="mx-auto w-[min(440px,84vw)] space-y-1 pt-1 text-left">
                              {prepRetrieval.results.slice(0, 5).map((r, i) => {
                                const used = prepRetrieval.selected.includes(i);
                                return (
                                  <p
                                    key={i}
                                    className={`truncate rounded-md border px-2.5 py-1 text-[11px] ${
                                      used
                                        ? "border-obs-line bg-obs-line/20 text-obs-ink"
                                        : "border-dashed border-obs-line/60 text-obs-ink2/60"
                                    }`}
                                  >
                                    {used ? "已送入上下文 · " : "未采用 · "}
                                    {r.title}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <BreathingWait />
                          {/* 检索已完成、首 token 未到：舞台继续展示真实取舍 */}
                          {prepRetrieval && prepRetrieval.results.length > 0 && (
                            <div className="mx-auto mt-3 w-[min(440px,84vw)] space-y-1 text-left">
                              {prepRetrieval.results.slice(0, 5).map((r, i) => {
                                const used = prepRetrieval.selected.includes(i);
                                return (
                                  <p
                                    key={i}
                                    className={`truncate rounded-md border px-2.5 py-1 text-[11px] ${
                                      used
                                        ? "border-obs-line bg-obs-line/20 text-obs-ink"
                                        : "border-dashed border-obs-line/60 text-obs-ink2/60"
                                    }`}
                                  >
                                    {used ? "已送入上下文 · " : "未采用 · "}
                                    {r.title}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {/* 导演系统大场面：命中真实犹豫点时该步候选上演一次凝聚/飘散 */}
                  {birthScene && liveSteps[birthScene.index] && (
                    <BirthScene
                      step={liveSteps[birthScene.index]}
                      index={birthScene.index}
                      storm={birthScene.storm}
                    />
                  )}
                  {/* 实时人话翻译：思考字幕居中底部；单步详情由右栏 Sampling Inspector 承担，
                      舞台上不再叠浮动此刻卡（避免与曲线/右栏互相遮挡） */}
                  {displaySteps.length > 0 && !forkView && (
                    <div className="absolute bottom-44 left-1/2 z-10 -translate-x-1/2">
                      <ThinkingCaption
                        steps={displaySteps as TokenStep[]}
                        index={displaySteps.length - 1}
                        temperature={params.temperature}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 一屏一问（P28）默认视图：只留主叙事——问题、正文、当下翻译，
                外加一条细状态线；全部专业面板收进「专业视图」按需下潜 */}
            {phase === "running" && !proView && !forkView && (
              <div className="mb-4">
                {displaySteps.length === 0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 py-6 text-center">
                    {usedPrompt && (
                      <p className="w-[min(520px,90%)] text-center text-[14px] leading-relaxed text-obs-ink/90 select-none">
                        {usedPrompt}
                      </p>
                    )}
                    {liveTeam ? (
                      <TeamFlow team={liveTeam} planLive={planStage} />
                    ) : prepNote ? (
                      <div className="space-y-2">
                        <span className="breath-dot inline-block" />
                        <p className="text-[13px] text-obs-ink2 select-none">
                          {prepNote}
                        </p>
                      </div>
                    ) : (
                      <BreathingWait />
                    )}
                    {/* 检索舞台：它刚去找了这些资料（命中亮，弃用暗），全部真实记录 */}
                    {prepRetrieval && prepRetrieval.results.length > 0 && (
                      <div className="mx-auto w-[min(440px,84vw)] space-y-1 text-left">
                        {prepRetrieval.results.slice(0, 5).map((r, i) => {
                          const used = prepRetrieval.selected.includes(i);
                          return (
                            <p
                              key={i}
                              className={`truncate rounded-md border px-2.5 py-1 text-[11px] ${
                                used
                                  ? "border-obs-line bg-obs-line/20 text-obs-ink"
                                  : "border-dashed border-obs-line/60 text-obs-ink2/60"
                              }`}
                            >
                              {used ? "已送入上下文 · " : "未采用 · "}
                              {r.title}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-32">
                    {/* 导演系统大场面：命中真实犹豫点时该步候选凝聚/飘散 */}
                    {birthScene && liveSteps[birthScene.index] && (
                      <BirthScene
                        step={liveSteps[birthScene.index]}
                        index={birthScene.index}
                        storm={birthScene.storm}
                      />
                    )}
                    <div className="absolute bottom-44 left-1/2 z-10 -translate-x-1/2">
                      <ThinkingCaption
                        steps={displaySteps as TokenStep[]}
                        index={displaySteps.length - 1}
                        temperature={params.temperature}
                      />
                    </div>
                  </div>
                )}
                {/* Team 名册（AVP 铁律）：主生成开始后团队仍在场，完成者变灰不消失；
                    TeamFlow → TeamPanel 的收敛用一次短淡入过渡（reduced-motion 下直接切换） */}
                {liveTeam && displaySteps.length > 0 && (
                  <div className="team-fold-in mt-3 flex justify-center">
                    <TeamPanel team={liveTeam} />
                  </div>
                )}
                {/* 细状态线：阶段 + 步数 + 真实速度（均值来自最近 20 步 dt） */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-obs-ink2/80 select-none">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        displaySteps.length > 0
                          ? "bg-measure-400"
                          : "bg-obs-ink2/50"
                      }`}
                    />
                    {displaySteps.length === 0 ? "准备中" : "生成中"}
                  </span>
                  {displaySteps.length > 0 && (
                    <span>第 {displaySteps.length} 个词</span>
                  )}
                  {displaySteps.length > 1 && (
                    <span>
                      平均{" "}
                      {Math.round(
                        displaySteps
                          .slice(-20)
                          .reduce((a, s) => a + (s as TokenStep).dt, 0) /
                          Math.min(displaySteps.length, 20),
                      )}{" "}
                      ms/词
                    </span>
                  )}
                  <span className="text-obs-ink2/50">
                    {modelName} · T{params.temperature}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-obs-line px-2.5 py-0.5 text-[11px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                    onClick={toggleProView}
                    title="展开专业面板：3D 标本台 / Debug 条 / Workflow / 此刻卡"
                  >
                    专业视图
                  </button>
                </div>
              </div>
            )}

            {displaySteps.length > 0 && (
              <TokenText
                steps={displaySteps}
                selected={selected}
                running={phase === "running"}
                annotations={annotations}
                onSelect={setSelected}
                onInteract={dismissHint}
                heat={heat}
                director={director}
              />
            )}

            {error && (
              <div className="mt-4 rounded-md border border-red-400/30 bg-obs-2 px-4 py-3.5">
                <p className="text-[14px] leading-relaxed text-obs-ink">
                  这次生成没能完成。已生成的部分和历史记录都还在。
                </p>
                <p className="mt-1 break-all font-mono text-[12px] text-obs-ink2/80">
                  {error}
                </p>
                {usedPrompt && (
                  <button
                    className="mt-2.5 rounded-md border border-obs-line px-3.5 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
                    onClick={() => runWith(usedPrompt)}
                  >
                    用同一个问题重试
                  </button>
                )}
              </div>
            )}

            {root &&
              phase === "done" &&
              activePath.length > 0 &&
              getNode(root, activePath).forcedId !== -1 && (
                <DualEndingCard root={root} activePath={activePath} />
              )}

            {displaySteps.length > 0 && phase === "done" && root && (
              <CompleteSummary
                steps={displaySteps}
                seed={seed}
                saved={activeExpId !== null}
                onReplay={() => setOceanOpen(true)}
                onCompare={() => setHistoryOpen(true)}
                onTimeline={() => setHistoryOpen(true)}
                onJump={jumpToToken}
                onDualRun={canFork ? dualRun : undefined}
                onVerifyReplay={verifyReplay}
                canVerify={
                  activePath.length === 0 &&
                  (root?.trace?.params.seed ?? seed) !== null
                }
                verifying={verifying}
                replayResult={replayResult}
              />
            )}

            {displaySteps.length > 0 && phase === "done" && (
              <ObservationSummary
                steps={displaySteps}
                matches={ruleMatches}
                onJump={jumpToToken}
              />
            )}

            {/* Story Mode 入口与播放器：把本次 trace 讲成纪录片（章节/旁白全部实录） */}
            {displaySteps.length > 0 && phase === "done" && root && (
              storyOn && getNode(root, activePath).trace ? (
                <StoryPlayer
                  trace={getNode(root, activePath).trace!}
                  onStep={jumpToToken}
                  onClose={() => setStoryOn(false)}
                />
              ) : (
                <div className="mt-4">
                  <button
                    className="rounded-md border border-amber-400/50 bg-amber-500/10 px-3.5 py-1 text-[12px] text-amber-200 transition-colors hover:bg-amber-500/20"
                    onClick={() => setStoryOn(true)}
                    title="把本次记录按章节播成纪录片：启动/检索规划/思考/关键抉择/收束，旁白数字全部来自 trace 实录"
                  >
                    ▶ 讲成故事 · Story Mode
                  </button>
                </div>
              )
            )}

            {/* E4a Agent 时间线：只在 trace 携带 agent 事件时出现；
                Team 回看是读者层默认在场，逐事件时间线属专业层（Sprint 4 下潜） */}
            {phase === "done" &&
              root?.trace?.agent &&
              root.trace.agent.length > 0 && (
                <>
                  {/* AVP Team 回看（S6-9）：从真实 agent 事件重建整场协作流 */}
                  {doneTeam && (
                    <div className="mt-4">
                      <TeamFlow team={doneTeam} compact />
                    </div>
                  )}
                  {proView && (
                    <AgentTimeline
                      events={root.trace.agent}
                      steps={root.trace.steps}
                      onJump={jumpToToken}
                    />
                  )}
                </>
              )}

            {/* 收束视图（ACDL Sprint 4：专业层下潜）：思路地图 + 没走的路 */}
            {displaySteps.length > 0 && phase === "done" && proView && (
              <div className="mt-6 space-y-4">
                <ThoughtMap
                  steps={displaySteps as TokenStep[]}
                  onReplaySegment={jumpToToken}
                />
                <RoadsNotTaken
                  steps={displaySteps as TokenStep[]}
                  onJump={jumpToToken}
                  onTryFork={canFork ? fork : undefined}
                />
              </div>
            )}

            {/* 检索决策卡（Sprint 5）：只在 trace 携带真实检索记录且专业视图展开时出现 */}
            {phase === "done" &&
              proView &&
              root?.trace?.extensions?.retrieval !== undefined && (
                <RetrievalCard
                  record={
                    root.trace.extensions.retrieval as RetrievalRecord
                  }
                />
              )}

            {/* Workflow 阶段条 + Decision 卡（ACDL Sprint 4：专业层下潜，专业视图才展开） */}
            {displaySteps.length > 0 && phase === "done" && proView && (
              <div className="mt-4 space-y-4">
                <WorkflowStrip
                  phase={phase}
                  steps={displaySteps as TokenStep[]}
                  pipeline={root?.trace?.pipeline}
                  agent={root?.trace?.agent}
                  onSelectStage={(s) =>
                    setStageSel((prev) => (prev?.key === s.key ? null : s))
                  }
                  activeKey={stageSel?.key ?? null}
                />
                {stageSel && (
                  <DecisionCard
                    stage={stageSel}
                    steps={displaySteps as TokenStep[]}
                    onJump={jumpToToken}
                    onTryFork={canFork ? fork : undefined}
                    onClose={() => setStageSel(null)}
                  />
                )}
                {/* Debug 带永远在最底（layout-plan：调试台是最后一层） */}
                {root && (
                  <DebugBar
                    phase={phase}
                    stepCount={displaySteps.length}
                    selected={selected}
                    onPause={interrupt}
                    onStep={jumpToToken}
                    onContinue={canFork ? continueRun : undefined}
                    onNewSeed={
                      usedPrompt && worker
                        ? () => void runWith(usedPrompt)
                        : undefined
                    }
                    canRunAgain={canFork && !busy}
                    bpOn={bpOn}
                    onToggleBp={toggleBp}
                  />
                )}
              </div>
            )}

            {phase === "done" && root && (
              <div className="mt-7 flex items-center gap-4 border-t border-obs-line/60 pt-4 text-[12px] text-obs-ink2">
                <span
                  className={`select-none transition-opacity duration-300 ${
                    hintDone ? "opacity-0" : "opacity-100"
                  }`}
                >
                  hover 看细节 · 点击 token 原地展开候选 · 背景流动 = 逐步熵（实测）
                </span>
                <button
                  type="button"
                  title="展开/收起专业面板：Debug 条 / Workflow / 思路地图 / 没走的路 / Agent 时间线 / 曲线"
                  className={`ml-auto whitespace-nowrap border-b-2 px-0.5 pb-1 text-[12px] transition-colors ${
                    proView
                      ? "border-measure-400 text-obs-ink"
                      : "border-transparent text-obs-ink2 hover:text-obs-ink"
                  }`}
                  onClick={toggleProView}
                >
                  专业视图
                </button>
                <button
                  type="button"
                  title="每个词的背景深浅 = 该步候选分布的熵（描述统计）"
                  className={`whitespace-nowrap border-b-2 px-0.5 pb-1 text-[12px] transition-colors ${
                    heat
                      ? "border-measure-400 text-obs-ink"
                      : "border-transparent text-obs-ink2 hover:text-obs-ink"
                  }`}
                  onClick={toggleHeat}
                >
                  熵热力
                </button>
                {/* DS4：三维地形仅桌面提供——手机上 WebGL 性能与拖拽操作受限，不做不可用的入口 */}
                <button
                  title="在三维 Token 概率地形中漫游这次记录（每个节点均回链 trace 字段）"
                  className="hidden items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 pb-1 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink sm:flex"
                  onClick={() => setOceanOpen(true)}
                >
                  <IconWaves className="h-3.5 w-3.5" />
                  概率地形
                </button>
                <span className="text-[11px] text-obs-ink2/50 select-none sm:hidden">
                  三维概率地形请在桌面打开（触屏拖拽与性能受限）
                </span>
                <div className="relative">
                  <button
                    className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 pb-1 text-[12px] text-obs-ink2 transition-colors hover:text-obs-ink"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    更多 {moreOpen ? "▾" : "▸"}
                  </button>
                  {moreOpen && (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-44 rounded-md border border-obs-line bg-obs-2 p-1.5 shadow-float">
                      <button
                        className="block w-full rounded-md px-3 py-1.5 text-left text-[12px] text-obs-ink2 transition-colors hover:bg-obs-wash hover:text-obs-ink"
                        onClick={() => {
                          setMoreOpen(false);
                          download();
                        }}
                      >
                        导出 .aitrace
                      </button>
                      <button
                        title="把本次观察生成一张可分享的图片（全部真实数据）"
                        className="block w-full rounded-md px-3 py-1.5 text-left text-[12px] text-obs-ink2 transition-colors hover:bg-obs-wash hover:text-obs-ink"
                        onClick={() => {
                          setMoreOpen(false);
                          void shareCard();
                        }}
                      >
                        分享卡
                      </button>
                      {isDemoRecord && (
                        <button
                          title="录制示例随构建内置——对方打开链接无需下载模型即达同一步"
                          className="block w-full rounded-md px-3 py-1.5 text-left text-[12px] text-obs-ink2 transition-colors hover:bg-obs-wash hover:text-obs-ink"
                          onClick={() => {
                            setMoreOpen(false);
                            copyDemoLink();
                          }}
                        >
                          复制演示链接
                          {selected !== null ? `（第 ${selected + 1} 步）` : ""}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[760px] px-6 pb-6">
          {phase === "done" && root && (
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
              <span className="text-[11px] text-obs-ink2/50 select-none">对比再跑</span>
              {([
                ["更短", "用更短的篇幅回答"],
                ["更严谨", "用更严谨的措辞回答，标明不确定之处"],
                ["面向 8 岁儿童", "用 8 岁儿童能听懂的语言回答"],
              ] as const).map(([label, suffix]) => (
                <button
                  key={label}
                  type="button"
                  className="whitespace-nowrap text-[11px] text-obs-ink2 underline decoration-obs-line underline-offset-4 transition-colors hover:text-obs-ink hover:decoration-obs-ink2 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => runDirection(suffix)}
                  title="同一问题换条件再跑一次，真实记录存档后可在发现/档案里对比"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 记录台（composer）：一张完整的圆角卡片——上半输入，下半工具行。
           *  工具行左侧收纳实验条件（模型/后端/温度 + 联网检索/Agent 规划），右侧唯一主动作。 */}
          <div className="composer relative rounded-md border border-obs-line bg-obs-2 transition-colors focus-within:border-measure-300/40">
            {cfgOpen && (
              <div className="absolute bottom-full left-0 z-30 mb-2 grid w-[min(480px,92vw)] grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-obs-line bg-obs-2 px-3.5 py-2.5 text-[12px] shadow-float">
                <span className="text-obs-ink2">模型</span>
                <span className="text-obs-ink">{modelName}</span>
                <span className="text-obs-ink2">后端</span>
                <span className="text-obs-ink">{device === "webgpu" ? "WebGPU · GPU 加速" : device === "wasm" ? "WASM · CPU" : "—"}</span>
                <Term id="temperature">温度</Term>
                <span className="tabular-nums text-obs-ink">{params.temperature}</span>
                <Term id="topP">Top-P</Term>
                <span className="tabular-nums text-obs-ink">{params.topP}</span>
                <span className="text-obs-ink2">Seed</span>
                <span className="text-obs-ink">每次运行随机生成并记录，随 trace 导出可复现</span>
                <span className="text-obs-ink2">采样参数</span>
                <span className="text-obs-ink">在顶栏设置中调整，对 Observe 与 Create 共同生效</span>
              </div>
            )}
            <textarea
              ref={promptRef}
              className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[16px] leading-6 text-obs-ink placeholder:text-obs-ink2/60 focus:outline-none disabled:opacity-60"
              rows={2}
              placeholder={
                phase === "done"
                  ? "输入新问题，开始下一次观察（当前结果已自动存档，不会丢）"
                  : "装载实验提示词，例如：为什么天空是蓝色的？"
              }
              value={prompt}
              disabled={phase === "running" || busy}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  run();
                }
              }}
            />
            <div className="flex flex-nowrap items-center gap-2 px-3 pb-3 pt-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
                <button
                  type="button"
                  className={`flex shrink items-center gap-1.5 truncate whitespace-nowrap rounded-md px-2 py-1 text-[12px] transition-colors disabled:opacity-50 ${
                    cfgOpen
                      ? "bg-obs-line/50 text-obs-ink"
                      : "text-obs-ink2 hover:bg-obs-line/40 hover:text-obs-ink"
                  }`}
                  disabled={phase === "running"}
                  title="实验条件：模型 / 后端 / 采样参数 / seed"
                  onClick={() => setCfgOpen((v) => !v)}
                >
                  <span className="truncate font-mono tabular-nums">
                    {modelName} · {device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : "—"} · T{params.temperature}
                  </span>
                </button>
                <span className="mx-1 h-3.5 w-px shrink-0 bg-obs-line/70" />
                <button
                  type="button"
                  aria-pressed={webOn}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors disabled:opacity-50 ${
                    webOn
                      ? "text-measure-300"
                      : "text-obs-ink2 hover:bg-obs-line/40 hover:text-obs-ink"
                  }`}
                  disabled={phase === "running" || busy}
                  onClick={toggleWeb}
                  title="Run 前真实联网检索：调用、结果、选用与放弃全部记入 trace（RAG Observatory）"
                >
                  <IconGlobe className="h-3.5 w-3.5" />
                  联网检索{webOn && " · 开"}
                </button>
                <button
                  type="button"
                  aria-pressed={agentOn}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors disabled:opacity-50 ${
                    agentOn
                      ? "text-measure-300"
                      : "text-obs-ink2 hover:bg-obs-line/40 hover:text-obs-ink"
                  }`}
                  disabled={phase === "running" || busy}
                  onClick={toggleAgent}
                  title="Run 前先跑一次真实规划子运行，计划原文与耗时记入 trace；选另一模型则接力交棒（model_handoff）"
                >
                  <IconAperture className="h-3.5 w-3.5" />
                  Agent 规划{agentOn && " · 开"}
                </button>
                {agentOn && (
                  <Dropdown
                    ariaLabel="规划模型"
                    tone="obs"
                    menuWidthClassName="w-64"
                    triggerClassName="flex min-w-0 max-w-[170px] shrink cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-obs-ink2 transition-colors hover:bg-obs-line/40 hover:text-obs-ink focus:outline-none disabled:opacity-50"
                    value={plannerId}
                    disabled={phase === "running" || busy}
                    onChange={pickPlanner}
                    title="规划模型：默认同模型；选另一模型 = 接力式双模型（先卸再载，交接如实记录）"
                    options={[
                      { value: "", label: "规划：同执行模型", hint: "同一模型先产出计划再作答" },
                      ...MODELS.filter((m) => m.id !== modelId).map((m) => ({
                        value: m.id,
                        label: `规划：${m.name}`,
                        hint: "接力：跑完交棒给执行模型，需重新加载",
                      })),
                    ]}
                  />
                )}
              </div>
              {phase === "running" ? (
                <button
                  aria-label="停止并保留已生成"
                  title="停止并保留已生成：准备阶段（检索/规划）也会立即停下"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-obs-line bg-obs-2 text-obs-ink transition-colors hover:bg-obs hover:border-obs-ink2/50"
                  onClick={interrupt}
                >
                  <IconStop className="h-[18px] w-[18px]" />
                </button>
              ) : (
                <PrimaryAction
                  aria-label="开始记录"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md px-4 text-[13px]"
                  disabled={!prompt.trim() || busy}
                  onClick={run}
>
                  开始记录
                </PrimaryAction>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-center text-[12px] text-obs-ink2/70 select-none">
            {phase === "running" && (
              <span className="block mb-1 text-amber-200/80">
                运行中 · 输入已锁定；停止会保留已生成内容
              </span>
            )}
            <span className="block">所有概率与曲线来自真实推理，数据不出设备</span>
            {(webOn || agentOn) && (
              <span className="block mt-1 text-obs-ink2/50">
                子运行真实发生才记录；失败也如实入档（ok:false）
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 曲线/检查器右栏（P28 + Sprint 4）：运行中与完成态都只在专业视图展开；
          规划阶段右栏不摆空壳 Inspector，改为 Planner 侧卡（ACDL 规划页 P1） */}
      {(phase !== "idle" || usedPrompt !== "") && proView && (
        <LivePanel
          steps={phase === "running" ? liveSteps : (displaySteps as TokenStep[])}
          running={phase === "running"}
          selected={phase === "done" ? selected : null}
          planSide={
            phase === "running" &&
            liveSteps.length === 0 &&
            planStage?.status === "running"
              ? {
                  planner: planStage.planner,
                  executor: planStage.executor,
                  status: planStage.status,
                  startedAt: planStage.startedAt,
                  chars: planStage.text.length,
                }
              : null
          }
          device={device}
          modelName={modelName}
          params={params}
        />
      )}
      </>
      )}

      <HistoryDrawer
        open={historyOpen}
        refreshKey={historyKey}
        activeId={activeExpId}
        compareIds={compareIds}
        onClose={() => setHistoryOpen(false)}
        onLoad={loadExperiment}
        onToggleCompare={(id) =>
          setCompareIds((prev) =>
            prev.includes(id)
              ? prev.filter((x) => x !== id)
              : [...prev.slice(-1), id],
          )
        }
        onCompare={() => void openCompare()}
        onImported={loadExperiment}
      />

      {oceanOpen && (
        <Suspense
          fallback={
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0a0a]">
              <span className="text-[13px] text-obs-ink2">正在加载三维引擎…</span>
            </div>
          }
        >
          <OceanView
            steps={displaySteps as TokenStep[]}
            prompt={usedPrompt}
            modelName={modelName}
            device={root?.trace?.device ?? device}
            running={phase === "running"}
            team={doneTeam ?? liveTeam}
            branchCount={root ? countNodes(root) : 0}
            branchLabel={
              root && activePath.length > 0
                ? (() => {
                    const node = getNode(root, activePath);
                    return `第 ${node.forkStep + 1} 词改选「${node.forcedText.trim() || node.forcedText}」`;
                  })()
                : null
            }
            onPick={(i) => {
              setSelected(i);
              dismissHint();
            }}
            onClose={() => setOceanOpen(false)}
          />
        </Suspense>
      )}

      {rulesOpen && (
        <RulesPanel
          rules={rules}
          onChange={updateRules}
          onClose={() => setRulesOpen(false)}
        />
      )}

      {selectedStep && selected !== null && (
        <BirthCard
          step={selectedStep}
          index={selected}
          temperature={params.temperature}
          matches={annotations[selected]}
          canFork={canFork && !selectedStep.forced}
          onFork={(id, text) => fork(selected, id, text)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
