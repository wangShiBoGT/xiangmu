/** AI Nexus - AI 性能中枢面板
 *
 *  全面可视化 AI 运行状态：
 *  - 系统状态：CPU/内存/设备信息
 *  - 模型状态：加载进度/大小/量化格式
 *  - 运行性能：tokens/s、延迟、吞吐量
 *  - 智能提示：自动检测性能问题并展开警告
 */

import { useState, useEffect } from "react";
import { IconCheck, IconLoader, IconAlertTriangle, IconZap, IconCpu, IconActivity, IconClose } from "./icons";

export type NexusStatus = "loading" | "slow" | "fast" | "error" | "idle";

interface SystemInfo {
  device?: "webgpu" | "wasm" | null;
  gpu?: string | null;
  memory?: number | null;
  cores?: number | null;
}

interface ModelInfo {
  name?: string;
  size?: string;
  quantization?: string;
  progress?: number;
}

interface PerformanceMetrics {
  tokensPerSecond?: number;
  avgLatency?: number;
  peakMemory?: number;
}

interface AINexusProps {
  info: {
    status: NexusStatus;
    message?: string;
    system?: SystemInfo;
    model?: ModelInfo;
    performance?: PerformanceMetrics;
    autoExpand?: boolean;
  };
  onDismiss: () => void;
}

export default function AINexus({ info, onDismiss }: AINexusProps) {
  const [collapsed, setCollapsed] = useState(true);

  // 自动展开逻辑
  useEffect(() => {
    if (info.autoExpand) {
      setCollapsed(false);
    }
  }, [info.autoExpand]);

  // 空闲状态不显示
  if (info.status === "idle") {
    return null;
  }

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleDismiss = () => {
    onDismiss();
  };

  // 状态样式
  const getStatusStyle = () => {
    switch (info.status) {
      case "loading":
        return {
          bg: "bg-measure-500/10",
          border: "border-measure-500/30",
          text: "text-measure-400",
          icon: <IconLoader className="h-4 w-4 animate-spin" />,
          label: "加载中",
          dotColor: "bg-measure-400",
          dotGlow: "shadow-[0_0_8px_rgba(79,124,228,0.6)]",
        };
      case "slow":
        return {
          bg: "bg-caution-500/10",
          border: "border-caution-500/30",
          text: "text-caution-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
          label: "性能受限",
          dotColor: "bg-caution-400",
          dotGlow: "",
        };
      case "fast":
        return {
          bg: "bg-success-500/10",
          border: "border-success-500/30",
          text: "text-success-500",
          icon: <IconZap className="h-4 w-4" />,
          label: "运行良好",
          dotColor: "bg-success-500",
          dotGlow: "",
        };
      case "error":
        return {
          bg: "bg-alert-500/10",
          border: "border-alert-500/30",
          text: "text-alert-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
          label: "运行异常",
          dotColor: "bg-alert-400",
          dotGlow: "",
        };
      default:
        return {
          bg: "bg-obs-2",
          border: "border-obs-line",
          text: "text-obs-ink",
          icon: <IconCheck className="h-4 w-4" />,
          label: "就绪",
          dotColor: "bg-obs-ink3",
          dotGlow: "",
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className={`fixed right-6 top-20 z-50 w-[380px] overflow-hidden rounded-xl border ${statusStyle.border} bg-obs/95 shadow-xl backdrop-blur-md transition-all duration-300 ${
        collapsed ? "h-[64px]" : "h-auto"
      }`}
    >
      {/* 头部 - 始终可见 */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-obs-line/20"
      >
        {/* 状态指示器 */}
        <div
          className={`h-3 w-3 rounded-full ${statusStyle.dotColor} ${
            info.status === "loading" ? `animate-pulse ${statusStyle.dotGlow}` : ""
          }`}
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-obs-ink">运行状态</h3>
          <p className="text-[12px] text-obs-ink3">{statusStyle.label}</p>
        </div>

        <IconChevronDown
          className={`h-4 w-4 text-obs-ink3 transition-transform duration-200 ${
            collapsed ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* 详细信息 - 可折叠 */}
      {!collapsed && (
        <div className="animate-in slide-in-from-top-2 duration-200 border-t border-obs-line/50">
          {/* 消息 */}
          {info.message && (
            <div className="border-b border-obs-line/50 px-4 py-3">
              <p className="text-[12px] leading-relaxed text-obs-ink2">
                {info.message}
              </p>
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* 系统信息 */}
            {info.system && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconCpu className="h-4 w-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    系统状态
                  </h4>
                </div>
                <div className="space-y-2">
                  <InfoRow
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
                        ? "text-measure-400 font-medium"
                        : "text-caution-400 font-medium"
                    }
                  />
                  {info.system.gpu && (
                    <InfoRow label="GPU" value={info.system.gpu} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {info.system.memory !== undefined && info.system.memory !== null && (
                      <MetricCard
                        label="内存"
                        value={`${info.system.memory}`}
                        unit="GB"
                      />
                    )}
                    {info.system.cores !== undefined && info.system.cores !== null && (
                      <MetricCard
                        label="CPU 核心"
                        value={`${info.system.cores}`}
                        unit="核"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 模型信息 */}
            {info.model && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconActivity className="h-4 w-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    模型状态
                  </h4>
                </div>
                <div className="space-y-2">
                  {info.model.name && (
                    <InfoRow label="模型" value={info.model.name} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {info.model.size && (
                      <MetricCard
                        label="大小"
                        value={info.model.size.replace(" GB", "")}
                        unit="GB"
                      />
                    )}
                    {info.model.quantization && (
                      <MetricCard
                        label="量化"
                        value={info.model.quantization.toUpperCase()}
                        unit=""
                      />
                    )}
                  </div>
                  {info.model.progress !== undefined && (
                    <div className="mt-3">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-obs-ink3">加载进度</span>
                        <span className="font-mono font-medium text-obs-ink">
                          {info.model.progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-obs-line/30">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-measure-500 transition-all duration-300"
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconZap className="h-4 w-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    运行性能
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {info.performance.tokensPerSecond !== undefined && (
                    <MetricCard
                      label="生成速度"
                      value={info.performance.tokensPerSecond.toFixed(1)}
                      unit="tok/s"
                      highlight={true}
                    />
                  )}
                  {info.performance.avgLatency !== undefined && (
                    <MetricCard
                      label="平均延迟"
                      value={info.performance.avgLatency.toFixed(0)}
                      unit="ms"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 信息行组件
function InfoRow({
  label,
  value,
  valueClass = "text-obs-ink",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-obs-line/10 px-3 py-2">
      <span className="text-xs text-obs-ink3">{label}</span>
      <span className={`text-xs ${valueClass}`}>{value}</span>
    </div>
  );
}

// 指标卡片组件
function MetricCard({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${
        highlight
          ? "border-measure-500/30 bg-measure-500/10"
          : "border-obs-line/30 bg-obs-line/10"
      } p-3`}
    >
      <div className="relative">
        <div className="text-[10px] font-medium uppercase tracking-wider text-obs-ink3">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`font-mono text-lg font-semibold ${
              highlight ? "text-measure-400" : "text-obs-ink"
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-obs-ink3">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
