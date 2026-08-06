/** 排行榜提交（零密钥）：前端不持任何 GitHub token，只做三件事——
 *  从本机真实运行算出吞吐、生成 .aitrace 供用户附件上传、打开预填好的
 *  「新建 Discussion」页面让用户用自己的账号发布。
 *
 *  数据出设备必须是用户主动动作：trace 文件由用户自己下载再上传，
 *  本组件不上传任何字节。 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconClose, IconArrowUp, IconCheck } from "./icons";
import {
  DEVICE_TIER_LABEL,
  buildSubmissionUrl,
  sha256Hex,
  traceStats,
  type SubmissionInput,
} from "../lib/leaderboard";
import {
  importReplay,
  listExperiments,
  type ExperimentRecord,
} from "../lib/experiments";
import { exportReplay } from "../lib/trace";
import { loadMachineBench } from "../lib/benchStore";
import { probeCapabilities } from "../lib/capabilities";
import { browserLabel } from "../lib/scoreCard";
import { getModel } from "../lib/models";

/** 由一条实验记录导出的、可提交的真实测量 */
interface Prepared {
  input: SubmissionInput;
  /** 与 traceHash 严格对应的 .aitrace 文件内容 */
  traceJson: string;
  recordName: string;
}

/** 档位只做初值建议，最终由提交方自选并在帖子里标明「自选」 */
function suggestTier(tps: number): 1 | 2 | 3 {
  if (tps < 10) return 1;
  if (tps > 30) return 3;
  return 2;
}

export default function LeaderboardSubmitDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [records, setRecords] = useState<ExperimentRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [gpuName, setGpuName] = useState("");
  const [tier, setTier] = useState<1 | 2 | 3 | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [caps, setCaps] = useState<{
    gpuInfo: string | null;
    cores: number;
  } | null>(null);

  // 只列有 trace 的记录：没有逐 token 耗时就算不出吞吐，不估不编
  useEffect(() => {
    let dead = false;
    void listExperiments()
      .then((recs) => {
        if (dead) return;
        const usable = recs.filter(
          (r) => (r.root.trace?.steps.length ?? 0) > 0 && r.stats.avgTps !== null,
        );
        setRecords(usable);
        setSelectedId(usable[0]?.id ?? null);
      })
      .catch(() => {
        if (!dead) setRecords([]);
      })
      .finally(() => {
        if (!dead) setLoadingRecords(false);
      });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    void probeCapabilities().then((c) => {
      setCaps({ gpuInfo: c.gpuInfo, cores: c.cores });
      // GPU 名探测不到就留空让用户自己填，不编一个「未知 GPU」当数据
      if (c.gpuInfo) setGpuName((v) => v || c.gpuInfo!);
    });
  }, []);

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  );

  // 选中记录变化时重算建议档位；用户改过就不再覆盖
  useEffect(() => {
    setPrepared(null);
    setDownloaded(false);
    if (!selected?.stats.avgTps) return;
    setTier((v) => v ?? suggestTier(selected.stats.avgTps!));
  }, [selected]);

  const importFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const rec = importReplay(await file.text());
      if ((rec.root.trace?.steps.length ?? 0) === 0)
        throw new Error("这份文件没有逐 token 数据，算不出吞吐");
      setRecords((prev) => [rec, ...prev]);
      setSelectedId(rec.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const prepare = useCallback(async () => {
    setError(null);
    setDownloaded(false);
    if (!selected) {
      setError("请先选一次运行");
      return;
    }
    if (!nickname.trim()) {
      setError("请填昵称");
      return;
    }
    if (!deviceName.trim()) {
      setError("请填设备名（例如「ThinkBook 14 / R7 7840H」）");
      return;
    }
    if (!gpuName.trim()) {
      setError("请填 GPU 名——浏览器没报出来的话只能你自己填，不由程序猜");
      return;
    }
    const trace = selected.root.trace;
    if (!trace) {
      setError("这条记录没有 trace");
      return;
    }
    const stats = traceStats(trace.steps);
    if (!stats) {
      setError("这次运行没有有效耗时样本，无法计算吞吐");
      return;
    }
    const device: "webgpu" | "wasm" =
      trace.device === "webgpu" ? "webgpu" : "wasm";
    // Machine Score 只在同模型同后端下才附上，跨条件的分数不可比
    const bench = loadMachineBench();
    const machineScore =
      bench && bench.modelId === trace.modelId && bench.device === device
        ? { total: bench.score.total, grade: bench.score.grade }
        : null;
    const traceJson = exportReplay(
      trace,
      selected.prompt,
      selected.ruleset,
      selected.root.children,
    );
    try {
      const input: SubmissionInput = {
        nickname: nickname.trim(),
        deviceName: deviceName.trim(),
        deviceTier: tier ?? suggestTier(stats.tps),
        gpuName: gpuName.trim(),
        modelId: trace.modelId,
        modelName: getModel(trace.modelId)?.name ?? trace.modelId,
        device,
        tps: stats.tps,
        tokens: stats.tokens,
        timedTokens: stats.timedTokens,
        totalMs: stats.totalMs,
        temperature: trace.params.temperature,
        topP: trace.params.topP,
        seed: trace.params.seed ?? null,
        machineScore,
        traceHash: await sha256Hex(traceJson),
        browser: browserLabel(navigator.userAgent),
      };
      // 长度校验在这里就抛，不等用户点开链接才发现打不开
      buildSubmissionUrl(input);
      setPrepared({ input, traceJson, recordName: selected.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selected, nickname, deviceName, gpuName, tier]);

  const downloadTrace = useCallback(() => {
    if (!prepared) return;
    const blob = new Blob([prepared.traceJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prepared.input.traceHash.slice(0, 8)}.aitrace`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }, [prepared]);

  const openDiscussion = useCallback(() => {
    if (!prepared) return;
    try {
      window.open(buildSubmissionUrl(prepared.input), "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [prepared]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-obs-line bg-obs-1 p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-obs-ink2 transition-colors hover:text-obs-ink"
          aria-label="关闭"
        >
          <IconClose className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-obs-ink">提交性能成绩</h2>
        <p className="mt-2 text-[13px] leading-[1.7] text-obs-ink2">
          用你自己的 GitHub 账号发一条 Discussion。本站不持有任何 token，
          也不会替你上传任何字节——trace 文件由你自己下载、自己附上。
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-obs-ink">
              选一次运行 <span className="text-red-500">*</span>
            </label>
            {loadingRecords ? (
              <p className="mt-1 text-[13px] text-obs-ink2">读取实验档案中…</p>
            ) : records.length === 0 ? (
              <p className="mt-1 text-[13px] leading-[1.7] text-obs-ink2">
                档案里还没有带逐 token 耗时的运行。去显微镜跑一次，
                或在下面导入一份 .aitrace。
              </p>
            ) : (
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full rounded-md border border-obs-line bg-obs px-3 py-2 text-[13px] text-obs-ink focus:border-brand focus:outline-none"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.stats.tokens} tokens ·{" "}
                    {r.stats.avgTps?.toFixed(1)} tok/s
                  </option>
                ))}
              </select>
            )}
            <input
              type="file"
              accept=".aitrace,.json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
              }}
              className="mt-2 w-full text-xs text-obs-ink2 file:mr-3 file:rounded-md file:border-0 file:bg-obs-2 file:px-3 file:py-1.5 file:text-xs file:text-obs-ink hover:file:bg-obs-wash"
            />
          </div>

          {selected && (
            <div className="rounded-md border border-obs-line bg-obs px-3 py-2.5">
              <p className="font-mono text-[12px] tabular-nums text-obs-ink">
                {selected.stats.avgTps?.toFixed(1)} tok/s ·{" "}
                {selected.stats.tokens} tokens
              </p>
              <p className="mt-1 text-[12px] text-obs-ink2">
                {getModel(selected.modelId)?.name ?? selected.modelId} ·{" "}
                {selected.device === "webgpu" ? "WebGPU" : "CPU (WASM)"} · T
                {selected.params.temperature} · seed {selected.seed ?? "—"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-obs-ink">
                昵称 <span className="text-red-500">*</span>
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                className="mt-1 w-full rounded-md border border-obs-line bg-obs px-3 py-2 text-[13px] text-obs-ink placeholder:text-obs-ink2/50 focus:border-brand focus:outline-none"
                placeholder="展示用名字"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-obs-ink">
                设备名 <span className="text-red-500">*</span>
              </label>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                maxLength={60}
                className="mt-1 w-full rounded-md border border-obs-line bg-obs px-3 py-2 text-[13px] text-obs-ink placeholder:text-obs-ink2/50 focus:border-brand focus:outline-none"
                placeholder="机型 / CPU"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-obs-ink">
              GPU <span className="text-red-500">*</span>
            </label>
            <input
              value={gpuName}
              onChange={(e) => setGpuName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-md border border-obs-line bg-obs px-3 py-2 text-[13px] text-obs-ink placeholder:text-obs-ink2/50 focus:border-brand focus:outline-none"
              placeholder="例如 NVIDIA RTX 4060 Laptop"
            />
            <p className="mt-1 text-xs text-obs-ink2">
              {caps?.gpuInfo
                ? `浏览器报告：${caps.gpuInfo}（型号常被隐藏，可自行补全）`
                : "浏览器不提供 GPU 型号，需要你自己填——程序不猜"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-obs-ink">
              档位（自选）
            </label>
            <div className="mt-1.5 flex gap-2">
              {([1, 2, 3] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    tier === t
                      ? "bg-brand text-white"
                      : "bg-obs-2 text-obs-ink2 hover:bg-obs-wash hover:text-obs-ink"
                  }`}
                >
                  {DEVICE_TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-500">
              {error}
            </div>
          )}

          {prepared && (
            <div className="rounded-md border border-emerald-600/30 bg-emerald-500/[0.06] px-3 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                <IconCheck className="h-4 w-4" />
                已按本机实测生成提交内容
              </p>
              <p className="mt-1.5 font-mono text-[11px] leading-[1.6] text-obs-ink2">
                {prepared.input.tps.toFixed(1)} tok/s ·{" "}
                {prepared.input.tokens} tokens · SHA-256{" "}
                {prepared.input.traceHash.slice(0, 16)}…
              </p>
              <ol className="mt-2.5 space-y-1.5 text-[12px] leading-[1.6] text-obs-ink2">
                <li>1. 下载 .aitrace（文件指纹已写进帖子正文）</li>
                <li>2. 打开 GitHub 新建页面，正文已预填好</li>
                <li>3. 把刚下载的文件拖进帖子，点 Start discussion</li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadTrace}
                  className="rounded-full border border-obs-line px-4 py-1.5 text-xs font-medium text-obs-ink transition-colors hover:bg-obs"
                >
                  {downloaded ? "已下载 · 再下一次" : "1 · 下载 .aitrace"}
                </button>
                <button
                  type="button"
                  onClick={openDiscussion}
                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand/90"
                >
                  2 · 打开 GitHub 发布页
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-obs-line px-5 py-2 text-sm font-medium text-obs-ink transition-colors hover:bg-obs"
          >
            关闭
          </button>
          <button
            onClick={() => void prepare()}
            disabled={!selected}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconArrowUp className="h-4 w-4" />
            {prepared ? "重新生成" : "生成提交内容"}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-[1.6] text-obs-ink2/80">
          吞吐由你本机测得、数值自报。榜单只能证明「由 GitHub 账号发布」
          与「是否附了 trace」，不声称已复核数字真实性。
        </p>
      </div>
    </div>
  );
}
