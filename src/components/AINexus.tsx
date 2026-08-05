import { useState, useEffect, useRef } from "react";
import {
  IconActivity,
  IconChevronDown,
  IconCpu,
  IconZap,
} from "./icons";

export type NexusStatus = "idle" | "loading" | "fast" | "slow" | "error";

export interface NexusInfo {
  status: NexusStatus;
  message?: string;
  autoExpand?: boolean;
  system?: {
    device?: "webgpu" | "wasm" | "unknown" | null;
    gpu?: string | null;
    memory?: number | null;
    cores?: number | null;
  };
  model?: {
    name?: string;
    size?: string;
    quantization?: string;
    progress?: number;
  };
  performance?: {
    tokensPerSecond?: number;
    avgLatency?: number;
    peakMemory?: number;
  };
}

interface AINexusProps {
  info: NexusInfo;
  onDismiss?: () => void;
}

export default function AINexus({ info }: AINexusProps) {
  const [collapsed, setCollapsed] = useState(true);

  // 拖动相关状态
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('ainexus-position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - 380 - 24, y: 80 };
      }
    }
    return { x: window.innerWidth - 380 - 24, y: 80 };
  });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem('ainexus-position', JSON.stringify(position));
  }, [position]);

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem('ainexus-position', JSON.stringify(position));
  }, [position]);

  // 拖动逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在点击头部区域时开始拖动
    if ((e.target as HTMLElement).closest('.ainexus-drag-handle')) {
      e.preventDefault();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: position.x,
        startY: position.y,
      };
      setDragging(true);
    }
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // 边界检测：面板不能拖出视口
      const newX = Math.max(0, Math.min(window.innerWidth - 380, dragStartRef.current.startX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 64, dragStartRef.current.startY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, position.x, position.y]);

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

  // 状态样式
  const getStatusStyle = () => {
    switch (info.status) {
      case "loading":
        return {
          label: "加载中",
          dotColor: "bg-measure-400",
          dotGlow: "shadow-[0_0_8px_rgba(79,124,228,0.6)]",
        };
      case "slow":
        return {
          label: "性能受限",
          dotColor: "bg-caution-400",
          dotGlow: "",
        };
      case "fast":
        return {
          label: "运行良好",
          dotColor: "bg-success-500",
          dotGlow: "",
        };
      case "error":
        return {
          label: "运行异常",
          dotColor: "bg-alert-400",
          dotGlow: "",
        };
      default:
        return {
          label: "就绪",
          dotColor: "bg-obs-ink3",
          dotGlow: "",
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className={`fixed z-50 w-[380px] overflow-hidden rounded-xl border border-obs-line/30 bg-obs/95 shadow-xl backdrop-blur-md transition-all duration-300 ${
        collapsed ? "h-[64px]" : "h-auto"
      } ${dragging ? 'cursor-grabbing select-none' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 头部 - 始终可见，可拖动 */}
      <button
        onMouseDown={handleMouseDown}
        onClick={handleToggle}
        className="ainexus-drag-handle flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-obs-line/20 cursor-grab active:cursor-grabbing"
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconCpu className="h-4 w-4" />
                  <h4 className="text-[12px] font-semibold uppercase tracking-wider">
                    系统状态
                  </h4>
                </div>
                <div className="space-y-1.5 text-[13px]">
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
                        ? "text-success-500 font-medium"
                        : "text-caution-400 font-medium"
                    }
                  />
                  {info.system.gpu && info.system.gpu !== null && (
                    <InfoRow label="GPU" value={info.system.gpu} />
                  )}
                  {info.system.memory !== undefined && info.system.memory !== null && (
                    <InfoRow
                      label="内存"
                      value={`${info.system.memory} GB`}
                      valueClass="font-mono"
                    />
                  )}
                  {info.system.cores !== undefined && info.system.cores !== null && (
                    <InfoRow
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconActivity className="h-4 w-4" />
                  <h4 className="text-[12px] font-semibold uppercase tracking-wider">
                    模型状态
                  </h4>
                </div>
                <div className="space-y-1.5 text-[13px]">
                  {info.model.name && (
                    <InfoRow label="模型" value={info.model.name} />
                  )}
                  {info.model.size && (
                    <InfoRow
                      label="大小"
                      value={info.model.size}
                      valueClass="font-mono"
                    />
                  )}
                  {info.model.quantization && (
                    <InfoRow
                      label="量化"
                      value={info.model.quantization.toUpperCase()}
                      valueClass="font-mono"
                    />
                  )}
                  {info.model.progress !== undefined && (
                    <div className="mt-2">
                      <div className="mb-1.5 flex justify-between text-[12px]">
                        <span className="text-obs-ink3">加载进度</span>
                        <span className="font-mono text-obs-ink">
                          {info.model.progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-obs-line/30">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-300"
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-obs-ink2">
                  <IconZap className="h-4 w-4" />
                  <h4 className="text-[12px] font-semibold uppercase tracking-wider">
                    运行性能
                  </h4>
                </div>
                <div className="space-y-1.5 text-[13px]">
                  {info.performance.tokensPerSecond !== undefined && (
                    <InfoRow
                      label="生成速度"
                      value={`${info.performance.tokensPerSecond.toFixed(1)} tokens/s`}
                      valueClass="font-mono text-success-500"
                    />
                  )}
                  {info.performance.avgLatency !== undefined && (
                    <InfoRow
                      label="平均延迟"
                      value={`${info.performance.avgLatency.toFixed(0)} ms`}
                      valueClass="font-mono"
                    />
                  )}
                  {info.performance.peakMemory !== undefined && (
                    <InfoRow
                      label="峰值内存"
                      value={`${info.performance.peakMemory.toFixed(2)} GB`}
                      valueClass="font-mono"
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
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-obs-ink3">{label}</span>
      <span className={`text-obs-ink ${valueClass}`}>{value}</span>
    </div>
  );
}
