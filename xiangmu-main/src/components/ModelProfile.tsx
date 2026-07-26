import { useEffect, useState } from "react";
import { getModel, formatSize } from "../lib/models";
import { listExperiments, type ExperimentRecord } from "../lib/experiments";
import Provenance from "./Provenance";

interface ObservedStats {
  runs: number;
  tokens: number;
  avgTps: number | null;
  entropyMin: number;
  entropyMax: number;
}

function observedFor(records: ExperimentRecord[], modelId: string): ObservedStats | null {
  const mine = records.filter((r) => r.modelId === modelId);
  if (mine.length === 0) return null;
  let tokens = 0;
  let tpsSum = 0;
  let tpsN = 0;
  let entropyMin = Infinity;
  let entropyMax = -Infinity;
  for (const r of mine) {
    tokens += r.stats.tokens;
    if (r.stats.avgTps !== null) {
      tpsSum += r.stats.avgTps;
      tpsN++;
    }
    if (r.stats.avgEntropy < entropyMin) entropyMin = r.stats.avgEntropy;
    if (r.stats.avgEntropy > entropyMax) entropyMax = r.stats.avgEntropy;
  }
  return {
    runs: mine.length,
    tokens,
    avgTps: tpsN > 0 ? tpsSum / tpsN : null,
    entropyMin,
    entropyMax,
  };
}

/** Model Profile · 模型能力档案：上半部分来自模型注册表元数据（发布事实），
 *  下半部分来自本机真实实验存档的描述统计——没有记录就如实显示为空，不外推不编造。 */
export default function ModelProfile({ modelId }: { modelId: string }) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void listExperiments().then((rs) => {
      if (alive) setRecords(rs);
    });
    return () => {
      alive = false;
    };
  }, [modelId]);

  const model = getModel(modelId);
  if (!model) return null;
  const observed = records ? observedFor(records, modelId) : null;

  const meta: [string, string][] = [
    ["出品方", model.vendor],
    ["参数量", model.params],
    ["推理链输出", model.thinking ? "支持（<think> 协议）" : "不支持"],
    ["WebGPU 权重", `${formatSize(model.sizeWebgpu)}（q4f16）`],
    ["CPU/WASM 权重", model.wasmOk ? `${formatSize(model.sizeWasm)}（q4）` : "超出 32 位 WASM 堆上限，不可用"],
    ["分发方式", model.builtin ? "内置于本服务" : "在线下载并缓存"],
    ["推荐设备档位", `${model.minTier} / 3`],
  ];

  return (
    <div className="mt-6 rounded-md border border-line bg-surface">
      <p className="border-b border-line px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
        Model Profile · 模型能力档案
      </p>
      <div className="px-5 py-4">
        <p className="text-[16px] font-semibold text-ink">{model.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-3">{model.id}</p>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[13px]">
          {meta.map(([k, v]) => (
            <div key={k} className="contents">
              <span className="text-ink-3">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3 select-none">
          本机观测档案 · 来自你的实验记录
        </p>
        {observed ? (
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[13px]">
            <span className="text-ink-3">已存实验</span>
            <span className="tabular-nums text-ink">{observed.runs} 次 · 共 {observed.tokens} tokens</span>
            <span className="text-ink-3">实测速度</span>
            <span className="tabular-nums text-ink">
              {observed.avgTps !== null ? `平均 ${observed.avgTps.toFixed(1)} tok/s（本机）` : "未记录"}
            </span>
            <span className="text-ink-3">平均熵范围</span>
            <span className="tabular-nums text-ink">
              {observed.entropyMin.toFixed(2)} – {observed.entropyMax.toFixed(2)} nats
            </span>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink-3">
            此模型尚无本机实验记录——在 Observe 完成一次记录后，这里会出现真实观测统计。
          </p>
        )}
        <div className="mt-3">
          <Provenance
            info={{
              field: "模型注册表元数据 + 实验存档 stats",
              method: "上半部分为发布元数据；下半部分为本机已存实验的汇总统计",
              level: "描述统计",
              boundary: "不代表模型的通用能力评测结果，仅反映你本机的使用记录",
            }}
          />
        </div>
      </div>
    </div>
  );
}
