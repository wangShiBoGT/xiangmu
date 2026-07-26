import { useCallback, useEffect, useRef, useState } from "react";
import { IconClose, IconCheck } from "./icons";
import {
  probeCapabilities,
  type CapabilityReport,
} from "../lib/capabilities";
import { MODELS, formatSize, getModel } from "../lib/models";
import type { GenerationParams } from "../lib/chatStore";
import {
  computeMachineScore,
  type MachineScore,
} from "../lib/machineScore";
import { browserLabel, exportScoreCard } from "../lib/scoreCard";
import type { TokenStep } from "../lib/trace";
import {
  clearVisitTrace,
  setVisitTraceEnabled,
  visitFunnel,
  visitTraceEnabled,
} from "../lib/visitTrace";
import { decaySummary, latencyStats } from "../lib/latencyStats";
import { loadMachineBench, saveMachineBench } from "../lib/benchStore";
import ModelProfile from "./ModelProfile";
import OfficialBenchCard from "./OfficialBenchCard";

const BENCH_PROMPT = "请用两三句话介绍一下你自己。";
const BENCH_TOKENS = 48;
// 上下文衰减测试：生成足够长，才能看到 KV cache 增长带来的逐步变慢
const DECAY_PROMPT = "请详细介绍一下太阳系的八大行星，逐个说明它们的特点。";
const DECAY_TOKENS = 256;

interface BenchResult {
  tps: number;
  numTokens: number;
  seconds: number;
  /** 逐 token 真实耗时序列（ms），稳定性评分用 */
  dts: number[];
}

/** 逐 token 速度曲线（滚动均值）：数据全部来自本次实测 trace 的真实耗时 */
function DecayChart({ dts }: { dts: number[] }) {
  const W = 560;
  const H = 110;
  const win = 8;
  const speeds = dts.map((_, i) => {
    const s = dts.slice(Math.max(0, i - win + 1), i + 1);
    return 1000 / (s.reduce((a, b) => a + b, 0) / s.length);
  });
  const max = Math.max(...speeds);
  const min = Math.min(...speeds);
  const pts = speeds
    .map(
      (v, i) =>
        `${((i / Math.max(1, speeds.length - 1)) * W).toFixed(1)},${(
          H - 6 - ((v - min) / (max - min || 1)) * (H - 16)
        ).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label="逐 token 生成速度曲线"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-accent"
      />
      <text x="0" y="10" className="fill-ink-3 text-[11px]">
        {max.toFixed(1)} tok/s
      </text>
      <text x="0" y={H - 2} className="fill-ink-3 text-[11px]">
        {min.toFixed(1)} tok/s
      </text>
      <text x={W} y={H - 2} textAnchor="end" className="fill-ink-3 text-[11px]">
        第 {dts.length} 个 token →
      </text>
    </svg>
  );
}

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <IconCheck className="h-4 w-4 shrink-0 text-emerald-600" />
  ) : (
    <IconClose className="h-4 w-4 shrink-0 text-ink-3" />
  );
}

/** 第一幕 Discover：AI Capability Report。
 *  能力清单全部当场实测；速度基准用真实模型跑真实推理，其余模型只做标明的外推估算。 */
export default function DiscoverPage({
  worker,
  modelId,
  device,
  busy,
}: {
  worker: Worker | null;
  modelId: string;
  device: string | null;
  busy: boolean;
}) {
  const [caps, setCaps] = useState<CapabilityReport | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [liveTps, setLiveTps] = useState(0);
  const [result, setResult] = useState<BenchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(0);
  const lastRef = useRef<{ tps: number; numTokens: number }>({
    tps: 0,
    numTokens: 0,
  });
  const dtsRef = useRef<number[]>([]);
  // 上下文衰减测试（独立于速度基准）
  const [decayPhase, setDecayPhase] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [decayDts, setDecayDts] = useState<number[]>([]);
  const [decayError, setDecayError] = useState<string | null>(null);
  const decayDtsRef = useRef<number[]>([]);

  useEffect(() => {
    probeCapabilities().then(setCaps);
  }, []);

  useEffect(() => {
    if (!worker) return;
    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.src === "decay") {
        switch (msg.status) {
          case "trace-steps":
            for (const s of msg.steps as TokenStep[])
              decayDtsRef.current.push(s.dt);
            setDecayDts([...decayDtsRef.current]);
            break;
          case "complete":
            setDecayPhase("done");
            break;
          case "error":
            setDecayError(String(msg.data));
            setDecayPhase("error");
            break;
        }
        return;
      }
      if (msg.src !== "discover") return;
      switch (msg.status) {
        case "start":
          startRef.current = performance.now();
          break;
        case "update":
          lastRef.current = { tps: msg.tps, numTokens: msg.numTokens };
          setLiveTps(msg.tps);
          break;
        case "trace-steps":
          for (const s of msg.steps as TokenStep[]) dtsRef.current.push(s.dt);
          break;
        case "complete":
          setResult({
            tps: lastRef.current.tps,
            numTokens: lastRef.current.numTokens,
            seconds: (performance.now() - startRef.current) / 1000,
            dts: dtsRef.current,
          });
          setPhase("done");
          break;
        case "error":
          setError(String(msg.data));
          setPhase("error");
          break;
      }
    };
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker]);

  const runBench = () => {
    if (!worker || phase === "running" || busy) return;
    setPhase("running");
    setError(null);
    setResult(null);
    setLiveTps(0);
    lastRef.current = { tps: 0, numTokens: 0 };
    dtsRef.current = [];
    const params: GenerationParams = {
      temperature: 0,
      topP: 1,
      maxTokens: BENCH_TOKENS,
      // benchmark 条件必须固定可比，不注入任何系统提示
      chineseOnly: false,
    };
    worker.postMessage({
      type: "generate",
      data: {
        messages: [{ role: "user", content: BENCH_PROMPT }],
        params,
        modelId,
        // 开 trace 拿逐 token 真实耗时（稳定性评分用）
        trace: true,
        src: "discover",
      },
    });
  };

  const runDecay = () => {
    if (!worker || decayPhase === "running" || phase === "running" || busy)
      return;
    setDecayPhase("running");
    setDecayError(null);
    setDecayDts([]);
    decayDtsRef.current = [];
    const params: GenerationParams = {
      temperature: 0,
      topP: 1,
      maxTokens: DECAY_TOKENS,
      chineseOnly: false,
    };
    worker.postMessage({
      type: "generate",
      data: {
        messages: [{ role: "user", content: DECAY_PROMPT }],
        params,
        modelId,
        trace: true,
        src: "decay",
      },
    });
  };

  const current = getModel(modelId);
  const currentSize =
    device === "webgpu" ? current?.sizeWebgpu : current?.sizeWasm;

  const benchDevice: "webgpu" | "wasm" = device === "webgpu" ? "webgpu" : "wasm";
  const fp16 = caps?.items.find((i) => i.key === "fp16")?.supported ?? false;
  const score: MachineScore | null =
    phase === "done" && result
      ? computeMachineScore({
          tps: result.tps,
          dts: result.dts,
          device: benchDevice,
          fp16,
        })
      : null;

  // D6 成绩单页只读留存的真实测量摘要；这里是唯一写入点（实测发生处）
  useEffect(() => {
    if (!score || !result) return;
    const lat = latencyStats(result.dts);
    const prev = loadMachineBench();
    saveMachineBench({
      modelId,
      device: benchDevice,
      tps: result.tps,
      p50: lat?.p50 ?? null,
      p95: lat?.p95 ?? null,
      n: lat?.n ?? 0,
      score: { total: score.total, grade: score.grade, cv: score.cv },
      decay:
        prev && prev.modelId === modelId && prev.device === benchDevice
          ? prev.decay
          : null,
      at: Date.now(),
    });
  }, [score, result, modelId, benchDevice]);

  useEffect(() => {
    if (decayPhase !== "done" || decayDts.length < 32) return;
    const d = decaySummary(decayDts);
    const prev = loadMachineBench();
    if (!d || !prev || prev.modelId !== modelId || prev.device !== benchDevice)
      return;
    saveMachineBench({
      ...prev,
      decay: {
        headTps: d.samples[0].tps,
        tailTps: d.samples[3].tps,
        tokens: decayDts.length,
      },
    });
  }, [decayPhase, decayDts, modelId, benchDevice]);

  const downloadScoreCard = useCallback(async () => {
    if (!score || !result) return;
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    try {
      const blob = await exportScoreCard({
        score,
        tps: result.tps,
        modelName: current?.name ?? modelId,
        device: benchDevice,
        gpuInfo: caps?.gpuInfo ?? null,
        cores: caps?.cores ?? 0,
        memoryGB: caps?.memoryGB ?? null,
        numTokens: result.numTokens,
        browser: browserLabel(navigator.userAgent),
        dateText: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-machine-score.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [score, result, current, modelId, benchDevice, caps]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-6 pb-16 pt-10">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3 select-none">
          Device · 设备
        </p>
        <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">
          本机 AI 体检报告
        </h2>
        <p className="mt-2 text-[14px] leading-[1.8] text-ink-3">
          这台电脑跑 AI 的真实状态：能力、速度、稳定性、越写越慢的程度——每一项都是当场实测，探测不到就如实标注，不估不编。
        </p>

        <div className="mt-8 rounded-md border border-line bg-surface">
          <p className="border-b border-line px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
            Runtime Capabilities · 运行时能力
          </p>
          {caps ? (
            <ul>
              {caps.items.map((item, i) => (
                <li
                  key={item.key}
                  className={`flex items-start gap-3 px-5 py-3.5 ${
                    i > 0 ? "border-t border-line/60" : ""
                  }`}
                >
                  <span className="mt-0.5">
                    <CheckIcon ok={item.supported} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[14px] font-medium text-ink">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="truncate text-[12px] text-ink-3">
                          {item.detail}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.7] text-ink-3">
                      {item.meaning}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 text-[12px] font-medium ${
                      item.supported ? "text-emerald-600" : "text-ink-3"
                    }`}
                  >
                    {item.supported ? "支持" : "不支持"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[13px] text-ink-3">检测中…</p>
          )}
          {caps && (
            <p className="border-t border-line px-5 py-3 text-[12px] text-ink-3">
              逻辑核心 {caps.cores || "未知"} ·
              内存{" "}
              {caps.memoryGB !== null
                ? `${caps.memoryGB} GB（浏览器最高只报 8）`
                : "浏览器未提供"}
            </p>
          )}
        </div>

        <ModelProfile modelId={modelId} />

        <OfficialBenchCard modelId={modelId} />

        <div className="mt-6 rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
              Live Benchmark · 真实推理基准
              <span className="ml-2 rounded-md border border-emerald-600/40 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-emerald-700">
                本机实测
              </span>
            </p>
            <button
              className="rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white hover:opacity-85 transition-opacity disabled:opacity-40"
              disabled={phase === "running" || busy || !worker}
              onClick={runBench}
            >
              {phase === "running"
                ? "测试中…"
                : result
                  ? "重新测试"
                  : "开始测试"}
            </button>
          </div>
          <div className="px-5 py-4">
            {phase === "idle" && (
              <p className="text-[13px] leading-[1.8] text-ink-3">
                用当前模型（{current?.name ?? modelId}）真实生成{" "}
                {BENCH_TOKENS} 个 token，测出本机的实际推理速度。
              </p>
            )}
            {phase === "running" && (
              <div className="flex items-baseline gap-3">
                <span className="text-[24px] font-semibold tracking-tight text-ink tabular-nums">
                  {liveTps > 0 ? liveTps.toFixed(1) : "—"}
                </span>
                <span className="text-[13px] text-ink-3">
                  tok/s · 正在生成…
                </span>
              </div>
            )}
            {phase === "done" && result && (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[24px] font-semibold tracking-tight text-ink tabular-nums">
                    {result.tps.toFixed(1)}
                  </span>
                  <span className="text-[13px] text-ink-3">tok/s（实测）</span>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-3">
                  {current?.name ?? modelId} ·{" "}
                  {device === "webgpu" ? "GPU 加速" : "CPU 模式"} · 生成{" "}
                  {result.numTokens} tokens · 耗时 {result.seconds.toFixed(1)}{" "}
                  秒
                </p>
                {(() => {
                  const lat = latencyStats(result.dts);
                  return lat ? (
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-3">
                      逐 token 延迟 p50 {lat.p50.toFixed(0)} ms · p95{" "}
                      {lat.p95.toFixed(0)} ms（{lat.n} 个真实样本；不含首词，
                      首词另含提示预处理）
                    </p>
                  ) : null;
                })()}
              </div>
            )}
            {phase === "error" && (
              <p className="text-[13px] leading-[1.8] text-red-600">
                测试失败：{error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
              Context Decay · 越写越慢了吗
            </p>
            <button
              className="rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white hover:opacity-85 transition-opacity disabled:opacity-40"
              disabled={
                decayPhase === "running" || phase === "running" || busy || !worker
              }
              onClick={runDecay}
            >
              {decayPhase === "running"
                ? "测试中…"
                : decayPhase === "done"
                  ? "重新测试"
                  : "开始测试"}
            </button>
          </div>
          <div className="px-5 py-4">
            {decayPhase === "idle" && (
              <p className="text-[13px] leading-[1.8] text-ink-3">
                AI 每写一个字，都要回看前面所有内容（KV cache 随上下文增长），
                所以生成越长速度越慢。用当前模型真实生成 {DECAY_TOKENS} 个
                token，把每一步的真实耗时画成曲线，看本机的衰减幅度。
              </p>
            )}
            {decayPhase === "running" && (
              <p className="text-[13px] text-ink-3 tabular-nums">
                已生成 {decayDts.length} / {DECAY_TOKENS} tokens…
              </p>
            )}
            {decayPhase === "done" && decayDts.length >= 32 && (() => {
              const d = decaySummary(decayDts);
              if (!d) return null;
              const headTps = d.samples[0].tps;
              const tailTps = d.samples[3].tps;
              const drop = ((headTps - tailTps) / headTps) * 100;
              return (
                <div>
                  <p className="text-[14px] text-ink">
                    前段 {headTps.toFixed(1)} tok/s → 末段{" "}
                    {tailTps.toFixed(1)} tok/s（
                    {drop >= 1
                      ? `慢了 ${drop.toFixed(0)}%`
                      : "本次未观察到明显衰减"}
                    ）
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] tabular-nums text-ink-3">
                    {d.samples.map((s) => (
                      <span key={s.label}>
                        第 {s.label} 个 token：{s.tps.toFixed(1)} tok/s
                      </span>
                    ))}
                  </div>
                  <DecayChart dts={decayDts} />
                  <p className="mt-2 text-[12px] leading-[1.7] text-ink-3">
                    曲线为逐 token 真实耗时的滚动均值，四个采样点 =
                    四等分窗口内的平均吞吏（前/末段 = 首尾窗口）；
                    测试条件：{current?.name ?? modelId} ·{" "}
                    {benchDevice === "webgpu" ? "WebGPU" : "CPU (WASM)"} · T0。
                    这就是长对话越聊越慢的原因——不是错觉，是可测量的。
                  </p>
                </div>
              );
            })()}
            {decayPhase === "done" && decayDts.length < 32 && (
              <p className="text-[13px] leading-[1.8] text-ink-3">
                本次生成提前结束（{decayDts.length} tokens），样本不足以计算衰减，可重新测试。
              </p>
            )}
            {decayPhase === "error" && (
              <p className="text-[13px] leading-[1.8] text-red-600">
                测试失败：{decayError}
              </p>
            )}
          </div>
        </div>

        {score && result && (
          <div className="mt-6 rounded-md border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
                AI Machine Score · 单机跑分
              </p>
              <button
                className="rounded-md border border-line px-3.5 py-1.5 text-[12px] text-ink-3 hover:text-ink transition-colors"
                onClick={() => void downloadScoreCard()}
              >
                导出跑分卡
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[24px] font-bold tracking-tight text-ink tabular-nums">
                  {score.total}
                </span>
                <span className="text-[24px] font-semibold text-accent">
                  {score.grade}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {(
                  [
                    {
                      label: "速度",
                      v: score.parts.speed,
                      note: `${result.tps.toFixed(1)} tok/s 实测`,
                    },
                    {
                      label: "后端",
                      v: score.parts.backend,
                      note: benchDevice === "webgpu" ? "WebGPU" : "CPU (WASM)",
                    },
                    {
                      label: "稳定性",
                      v: score.parts.steady,
                      note:
                        score.cv !== null
                          ? `耗时变异系数 ${score.cv.toFixed(2)}`
                          : "样本不足，记中性分",
                    },
                  ] as const
                ).map((b) => (
                  <li key={b.label} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-[12px] text-ink-3">
                      {b.label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.round(b.v * 100)}%` }}
                      />
                    </span>
                    <span className="w-44 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-3">
                      {b.note}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-[1.7] text-ink-3">
                单机跑分，无榜单；分数只在同一测试条件（模型·后端）下可比。测试条件：
                {current?.name ?? modelId} · {benchDevice === "webgpu" ? "WebGPU" : "CPU (WASM)"} · 生成 {result.numTokens} tokens。
              </p>
            </div>
          </div>
        )}

        {phase === "done" && result && currentSize && (
          <div className="mt-6 rounded-md border border-line bg-surface">
            <p className="border-b border-line px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
              Model Projections · 各档模型速度
            </p>
            <ul>
              {MODELS.filter((m) => m.builtin).map((m, i) => {
                const size = device === "webgpu" ? m.sizeWebgpu : m.sizeWasm;
                const isCurrent = m.id === modelId;
                const est = (result.tps * currentSize) / size;
                return (
                  <li
                    key={m.id}
                    className={`flex items-baseline gap-3 px-5 py-3 ${
                      i > 0 ? "border-t border-line/60" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-[14px] text-ink">{m.name}</span>
                      <span className="ml-2 text-[12px] text-ink-3">
                        {m.params} · {formatSize(size)}
                      </span>
                    </span>
                    <span className="text-[14px] font-medium tabular-nums text-ink">
                      {isCurrent ? result.tps.toFixed(1) : `≈ ${est.toFixed(1)}`}
                    </span>
                    <span className="w-14 text-right text-[11px] text-ink-3">
                      {isCurrent ? "实测" : "估算"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-5 py-3 text-[12px] leading-[1.7] text-ink-3">
              估算 = 实测速度按权重体积线性外推，仅供参考；切换模型后可分别实测。
            </p>
          </div>
        )}

        <VisitFunnelCard />
      </div>
    </div>
  );
}

/** 本机首访漏斗（锚点 A8）：样本仅本机访客，数据只存 localStorage，永不上传 */
function VisitFunnelCard() {
  const [enabled, setEnabled] = useState(visitTraceEnabled());
  const [rows, setRows] = useState(visitFunnel());
  return (
    <div className="mt-6 rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
          本机首访漏斗 · 样本仅本机访客
        </p>
        <div className="flex items-center gap-3">
          <button
            className="text-[12px] text-ink-3 transition-colors hover:text-ink"
            onClick={() => {
              clearVisitTrace();
              setRows(visitFunnel());
            }}
          >
            清除记录
          </button>
          <button
            className="text-[12px] text-ink-3 transition-colors hover:text-ink"
            onClick={() => {
              setVisitTraceEnabled(!enabled);
              setEnabled(!enabled);
            }}
          >
            {enabled ? "关闭记录" : "开启记录"}
          </button>
        </div>
      </div>
      <ul>
        {rows.map((r, i) => (
          <li
            key={r.event}
            className={`flex items-center justify-between px-5 py-2.5 ${
              i > 0 ? "border-t border-line/60" : ""
            }`}
          >
            <span className="text-[13px] text-ink">{r.label}</span>
            <span
              className={`text-[12px] ${r.hit ? "text-emerald-600" : "text-ink-3"}`}
            >
              {r.hit ? "已发生" : "未发生"}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[12px] leading-[1.7] text-ink-3">
        记录只存在本浏览器 localStorage，永不上传；可随时关闭或清除。
      </p>
    </div>
  );
}
