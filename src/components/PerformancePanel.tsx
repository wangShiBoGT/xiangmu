/** 性能状态面板：显示模型加载进度、运行状态、性能警告
 *
 *  状态分类：
 *  - loading: 模型加载中（显示进度条）
 *  - slow: CPU 模式运行慢（黄色警告）
 *  - fast: GPU 加速正常（绿色良好）
 *  - error: 加载失败或运行错误（红色错误）
 */

import { IconAlertTriangle, IconCheck, IconLoader, IconZap } from "./icons";
import { useEffect, useState } from "react";

export type PerformanceStatus = "loading" | "slow" | "fast" | "error" | "idle";

interface PerformanceInfo {
  status: PerformanceStatus;
  message?: string;
  progress?: number; // 0-100
  device?: "webgpu" | "wasm" | null;
  tokensPerSecond?: number;
}

export default function PerformancePanel({
  info,
  onDismiss,
}: {
  info: PerformanceInfo;
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 只在有重要信息时显示
    if (info.status !== "idle" && !dismissed) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [info.status, dismissed]);

  if (!visible || info.status === "idle") return null;

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    onDismiss?.();
  };

  // 根据状态选择样式
  const getStyles = () => {
    switch (info.status) {
      case "loading":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          icon: <IconLoader className="h-4 w-4 animate-spin" />,
        };
      case "slow":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
        };
      case "fast":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          icon: <IconZap className="h-4 w-4" />,
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          icon: <IconAlertTriangle className="h-4 w-4" />,
        };
      default:
        return {
          bg: "bg-obs-2",
          border: "border-obs-line",
          text: "text-obs-ink",
          icon: <IconCheck className="h-4 w-4" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`fixed right-6 top-20 z-50 w-[min(360px,calc(100vw-48px))] rounded-md border-2 ${styles.border} ${styles.bg} p-4 shadow-float backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${styles.text}`}>{styles.icon}</div>
        <div className="flex-1">
          <p className={`text-[13px] font-medium ${styles.text}`}>
            {info.status === "loading" && "模型加载中"}
            {info.status === "slow" && "性能提示"}
            {info.status === "fast" && "运行正常"}
            {info.status === "error" && "运行异常"}
          </p>
          {info.message && (
            <p className="mt-1 text-[12px] leading-relaxed text-obs-ink2">
              {info.message}
            </p>
          )}
          {info.status === "loading" && info.progress !== undefined && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-obs-line/30">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${info.progress}%` }}
                />
              </div>
              <p className="mt-1 text-right font-mono text-[11px] text-obs-ink2">
                {info.progress.toFixed(0)}%
              </p>
            </div>
          )}
          {info.tokensPerSecond !== undefined && (
            <p className="mt-1.5 font-mono text-[11px] text-obs-ink2">
              {info.tokensPerSecond.toFixed(1)} tokens/s
            </p>
          )}
          {info.device && (
            <p className="mt-1.5 text-[11px] text-obs-ink2">
              当前后端：{info.device === "webgpu" ? "WebGPU (GPU)" : "WASM (CPU)"}
            </p>
          )}
        </div>
        {info.status !== "loading" && (
          <button
            onClick={handleDismiss}
            className="text-obs-ink2 hover:text-obs-ink transition-colors"
            aria-label="关闭"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
