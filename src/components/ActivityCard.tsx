/**
 * AI 活动卡片组件
 * 参考 Devin、Claude 等 AI agent 的丰富交互模式
 * 展示思考过程、命令执行、文件操作等结构化活动
 */

import { useState } from "react";
import { IconChevronDown, IconThinking, IconCheck, IconLoader, IconFile, IconClock } from "./icons";

export type ActivityType = "thinking" | "command" | "file-read" | "file-write" | "result";

export interface ActivityCardProps {
  type: ActivityType;
  title: string;
  /** 活动持续时间（秒） */
  duration?: number;
  /** 是否正在进行中 */
  isRunning?: boolean;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 子内容 */
  children: React.ReactNode;
  /** 额外的元数据（如文件路径、命令名称等） */
  metadata?: string;
}

export default function ActivityCard({
  type,
  title,
  duration,
  isRunning = false,
  defaultExpanded = false,
  children,
  metadata,
}: ActivityCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || isRunning);

  // 根据活动类型获取样式和图标
  const getTypeStyle = () => {
    switch (type) {
      case "thinking":
        return {
          icon: isRunning ? (
            <IconThinking className="h-4 w-4 text-blue-400" />
          ) : (
            <IconCheck className="h-4 w-4 text-blue-400" />
          ),
          border: "border-blue-500/30",
          bg: "bg-blue-500/5",
          headerBg: "bg-blue-500/10",
          textColor: "text-blue-400",
        };
      case "command":
        return {
          icon: isRunning ? (
            <IconLoader className="h-4 w-4 animate-spin text-emerald-400" />
          ) : (
            <IconCheck className="h-4 w-4 text-emerald-400" />
          ),
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/5",
          headerBg: "bg-emerald-500/10",
          textColor: "text-emerald-400",
        };
      case "file-read":
      case "file-write":
        return {
          icon: isRunning ? (
            <IconLoader className="h-4 w-4 animate-spin text-purple-400" />
          ) : (
            <IconFile className="h-4 w-4 text-purple-400" />
          ),
          border: "border-purple-500/30",
          bg: "bg-purple-500/5",
          headerBg: "bg-purple-500/10",
          textColor: "text-purple-400",
        };
      case "result":
        return {
          icon: <IconCheck className="h-4 w-4 text-obs-ink2" />,
          border: "border-obs-line",
          bg: "bg-obs-2/50",
          headerBg: "bg-obs-2",
          textColor: "text-obs-ink2",
        };
      default:
        return {
          icon: <IconCheck className="h-4 w-4 text-obs-ink2" />,
          border: "border-obs-line",
          bg: "bg-obs-2/50",
          headerBg: "bg-obs-2",
          textColor: "text-obs-ink2",
        };
    }
  };

  const style = getTypeStyle();

  return (
    <div
      className={`group relative my-3 overflow-hidden rounded-lg border ${style.border} ${style.bg} transition-all duration-200`}
    >
      {/* 顶部进度条 - 仅在运行中显示 */}
      {isRunning && (
        <div className="absolute left-0 top-0 h-0.5 w-full overflow-hidden bg-obs-line/20">
          <div
            className={`h-full ${style.headerBg} animate-pulse`}
            style={{
              width: "100%",
              animation: "progress-shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* 头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors ${style.headerBg} hover:opacity-80`}
      >
        <div className="flex items-center gap-2.5">
          {style.icon}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-medium ${style.textColor}`}>
                {title}
              </span>
              {duration !== undefined && !isRunning && (
                <span className="flex items-center gap-1 text-[11px] text-obs-ink3">
                  <IconClock className="h-3 w-3" />
                  {duration}s
                </span>
              )}
              {isRunning && (
                <span className="text-[11px] text-obs-ink3 animate-pulse">
                  进行中...
                </span>
              )}
            </div>
            {metadata && (
              <span className="text-[11px] font-mono text-obs-ink3">
                {metadata}
              </span>
            )}
          </div>
        </div>
        <IconChevronDown
          className={`h-4 w-4 text-obs-ink3 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 内容区域 */}
      {expanded && (
        <div className="border-t border-obs-line/30 px-4 py-3 text-[13px] leading-relaxed text-obs-ink2">
          {children}
        </div>
      )}
    </div>
  );
}

// 进度条动画
const style = document.createElement("style");
style.textContent = `
  @keyframes progress-shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
if (typeof document !== "undefined") {
  document.head.appendChild(style);
}
