/** AI Nexus - AI 性能中枢面板
 *
 *  全面可视化 AI 运行状态：
 *  - 系统状态：CPU/内存/设备信息
 *  - 模型状态：加载进度/大小/量化格式
 *  - 运行性能：tokens/s、延迟、吞吐量
 *  - 智能提示：自动检测性能问题并展开警告
 */

import { useState, useEffect } from "react";
import { IconAlertTriangle, IconCheck, IconLoader, IconZap, IconCpu, IconActivity } from "./icons";

export type NexusStatus = "loading" | "slow" | "fast" | "error" | "idle";

interface SystemInfo {
  device?: "webgpu" | "wasm" | null;
  gpu?: string | null;
  memory?: number | null; // GB
  cores?: number | null;
}

interface ModelInfo {
  name?: string;
  size?: string; // "1.2 GB"
  quantization?: string; // "q4f16"
  progress?: number; // 0-100
}

interface PerformanceMetrics {
  tokensPerSecond?: number;
  avgLatency?: number; // ms
  peakMemory?: number; // GB
}

interface NexusInfo {
  status: NexusStatus;
  message?: string;
  system?: SystemInfo;
  model?: ModelInfo;
  performance?: PerformanceMetrics;
  autoExpand?: boolean; // 检测到严重问题时自动展开
}

export default function AINexus({
  info,
  onDismiss,
}: {
  info: NexusInfo;
  onDismiss?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 严重问题自动展开
    if (info.autoExpand && info.status !== "idle") {
      setCollapsed(false);
    }
  }, [info.autoExpand, info.status]);

  if (dismissed || info.status === "idle") return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  // 状态样式
  const getStatusStyle = () => {
    switch (info.status) {
      case "loading":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          icon: <IconLoader className="h-4 w-4 animate-spin" />,
          label: "加载中",
        };
      case "slow":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
          label: "性能受限",
        };
      case "fast":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          icon: <IconZap className="h-4 w-4" />,
          label: "运行良好",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
          label: "运行异常",
        };
      default:
        return {
          bg: "bg-obs-2",
          border: "border-obs-line",
          text: "text-obs-ink",
          icon: <IconCheck className="h-4 w-4" />,
          label: "就绪",
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className={`fixed right-6 top-20 z-50 w-[min(420px,calc(100vw-48px))] rounded-lg border-2 ${statusStyle.border} ${statusStyle.bg} shadow-float backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300`}
    >
      {/* 头部 - 始终可见 */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleToggle}
          className="flex flex-1 items-center gap-3 text-left transition-opacity hover:opacity-80"
        >
          <div className={`${statusStyle.text}`}>{statusStyle.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-[13px] font-semibold ${statusStyle.text}`}>
                AI Nexus
              </h3>
              <span className="text-[11px] font-medium text-obs-ink2">
                {statusStyle.label}
              </span>
            </div>
            {info.message && collapsed && (
              <p className="mt-0.5 text-[11px] text-obs-ink2 truncate">
                {info.message}
              </p>
            )}
          </div>
          <svg
            className={`h-4 w-4 text-obs-ink2 transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {info.status !== "loading" && (
          <button
            onClick={handleDismiss}
            className="ml-2 text-obs-ink2 hover:text-obs-ink transition-colors"
            aria-label="关闭"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 详细信息 - 可折叠 */}
      {!collapsed && (
        <div className="border-t border-obs-line/30 p-4 space-y-4">
          {/* 消息 */}
          {info.message && (
            <div className="rounded-md bg-obs-2/50 px-3 py-2">
              <p className="text-[12px] leading-relaxed text-obs-ink2">
                {info.message}
              </p>
            </div>
          )}

          {/* 系统信息 */}
          {info.system && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <IconCpu className="h-3.5 w-3.5 text-obs-ink2" />
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-obs-ink2">
                  系统状态
                </h4>
              </div>
              <div className="space-y-1.5">
                <MetricRow
                  label="设备"
                  value={
                    info.system.device === "webgpu"
                      ? "WebGPU (GPU 加速)"
                      : info.system.device === "wasm"
                        ? "WASM (CPU 模式)"
                        : "未知"
                  }
                  valueClass={
                    info.system.device === "webgpu"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }
                />
                {info.system.gpu && (
                  <MetricRow label="GPU" value={info.system.gpu} />
                )}
                {info.system.memory !== undefined && info.system.memory !== null && (
                  <MetricRow
                    label="内存"
                    value={`${info.system.memory} GB`}
                    valueClass="font-mono"
                  />
                )}
                {info.system.cores !== undefined && info.system.cores !== null && (
                  <MetricRow
                    label="CPU 核心"
                    value={`${info.system.cores} 核`}
                    valueClass="font-mono"
                  />
                )}
              </div>
            </div>
          )}

          {/* 模型信息 */}
          {info.model && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <IconActivity className="h-3.5 w-3.5 text-obs-ink2" />
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-obs-ink2">
                  模型状态
                </h4>
              </div>
              <div className="space-y-1.5">
                {info.model.name && (
                  <MetricRow label="模型" value={info.model.name} />
                )}
                {info.model.size && (
                  <MetricRow
                    label="大小"
                    value={info.model.size}
                    valueClass="font-mono"
                  />
                )}
                {info.model.quantization && (
                  <MetricRow
                    label="量化"
                    value={info.model.quantization.toUpperCase()}
                    valueClass="font-mono"
                  />
                )}
                {info.model.progress !== undefined && (
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-obs-ink2">加载进度</span>
                      <span className="font-mono text-obs-ink">
                        {info.model.progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-obs-line/30">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all duration-300"
                        style={{ width: `${info.model.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 性能指标 */}
          {info.performance && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <IconZap className="h-3.5 w-3.5 text-obs-ink2" />
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-obs-ink2">
                  运行性能
                </h4>
              </div>
              <div className="space-y-1.5">
                {info.performance.tokensPerSecond !== undefined && (
                  <MetricRow
                    label="生成速度"
                    value={`${info.performance.tokensPerSecond.toFixed(1)} tokens/s`}
                    valueClass="font-mono text-emerald-400"
                  />
                )}
                {info.performance.avgLatency !== undefined && (
                  <MetricRow
                    label="平均延迟"
                    value={`${info.performance.avgLatency.toFixed(0)} ms`}
                    valueClass="font-mono"
                  />
                )}
                {info.performance.peakMemory !== undefined && (
                  <MetricRow
                    label="峰值内存"
                    value={`${info.performance.peakMemory.toFixed(2)} GB`}
                    valueClass="font-mono"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 指标行组件
function MetricRow({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-obs-ink2">{label}</span>
      <span className={`text-obs-ink ${valueClass}`}>{value}</span>
    </div>
  );
}
