/**
 * 全局加载状态组件
 * 显示在屏幕顶部的进度条，用于模型加载、生成等操作
 */

import { useEffect, useState } from "react";

export interface LoadingBarProps {
  /** 是否显示 */
  visible: boolean;
  /** 进度百分比 (0-100) */
  progress?: number;
  /** 加载文本 */
  text?: string;
  /** 颜色主题 */
  variant?: "brand" | "success" | "caution";
}

export default function LoadingBar({
  visible,
  progress,
  text,
  variant = "brand",
}: LoadingBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      // 延迟卸载，等待动画完成
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted) return null;

  const colorClasses = {
    brand: "bg-brand-500",
    success: "bg-success-500",
    caution: "bg-caution-500",
  };

  const glowClasses = {
    brand: "shadow-[0_0_12px_rgba(79,124,228,0.6)]",
    success: "shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    caution: "shadow-[0_0_12px_rgba(207,156,74,0.6)]",
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 进度条 */}
      <div className="h-1 w-full bg-obs-line/20">
        <div
          className={`h-full transition-all duration-500 ease-out ${colorClasses[variant]} ${glowClasses[variant]}`}
          style={{
            width: progress !== undefined ? `${progress}%` : "30%",
            ...(progress === undefined && {
              animation: "loading-shimmer 1.5s ease-in-out infinite",
            }),
          }}
        />
      </div>

      {/* 加载文本（可选） */}
      {text && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-obs/95 backdrop-blur-md border-b border-obs-line px-4 py-2">
          <p className="text-center text-[13px] text-obs-ink2">{text}</p>
        </div>
      )}

      <style>{`
        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
