/**
 * AI 活动卡片组件
 * 参考 Devin、Claude 等 AI agent 的丰富交互模式
 * 展示思考过程、命令执行、文件操作等结构化活动
 */

import { useState, useEffect, useRef } from "react";
import { IconChevronDown, IconThinking, IconCheck, IconLoader, IconFile } from "./icons";
import { prefersReducedMotion } from "../lib/reducedMotion";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  // 持久化折叠状态到 localStorage（按 title 作为 key）
  const storageKey = `activity-card-${type}-${title}`;
  useEffect(() => {
    if (!isRunning) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setExpanded(saved === "true");
      }
    }
  }, [storageKey, isRunning]);

  useEffect(() => {
    if (!isRunning) {
      localStorage.setItem(storageKey, String(expanded));
    }
  }, [expanded, isRunning, storageKey]);

  // 自动展开：生成中强制展开，结束后保持用户设置
  useEffect(() => {
    if (isRunning) setExpanded(true);
  }, [isRunning]);

  // 测量内容高度用于动画
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, expanded]);

  // 根据活动类型获取样式和图标
  const getTypeStyle = () => {
    switch (type) {
      case "thinking":
        return {
          icon: isRunning ? (
            <IconThinking className="h-5 w-5 animate-pulse text-brand-400" />
          ) : (
            <IconCheck className="h-5 w-5 text-success-500" />
          ),
          border: "border-brand-500/30",
          bg: "bg-brand-500/5",
          headerBg: "hover:bg-brand-500/10",
          textColor: "text-obs-ink",
          statusDot: isRunning ? "bg-brand-400 shadow-[0_0_8px_rgba(79,124,228,0.6)] animate-pulse" : "bg-success-500",
        };
      case "command":
        return {
          icon: isRunning ? (
            <IconLoader className="h-5 w-5 animate-spin text-success-500" />
          ) : (
            <IconCheck className="h-5 w-5 text-success-500" />
          ),
          border: "border-success-500/30",
          bg: "bg-success-500/5",
          headerBg: "hover:bg-success-500/10",
          textColor: "text-obs-ink",
          statusDot: isRunning ? "bg-success-500 animate-pulse" : "bg-success-500",
        };
      case "file-read":
      case "file-write":
        return {
          icon: isRunning ? (
            <IconLoader className="h-5 w-5 animate-spin text-measure-400" />
          ) : (
            <IconFile className="h-5 w-5 text-measure-400" />
          ),
          border: "border-measure-500/30",
          bg: "bg-measure-500/5",
          headerBg: "hover:bg-measure-500/10",
          textColor: "text-obs-ink",
          statusDot: isRunning ? "bg-measure-400 animate-pulse" : "bg-measure-400",
        };
      case "result":
        return {
          icon: <IconCheck className="h-5 w-5 text-obs-ink2" />,
          border: "border-obs-line",
          bg: "bg-obs-2/50",
          headerBg: "hover:bg-obs-line/20",
          textColor: "text-obs-ink",
          statusDot: "bg-obs-ink3",
        };
      default:
        return {
          icon: <IconCheck className="h-5 w-5 text-obs-ink2" />,
          border: "border-obs-line",
          bg: "bg-obs-2/50",
          headerBg: "hover:bg-obs-line/20",
          textColor: "text-obs-ink",
          statusDot: "bg-obs-ink3",
        };
    }
  };

  const style = getTypeStyle();

  return (
    <div
      className={`group relative mb-3 overflow-hidden rounded-xl border ${style.border} ${style.bg} shadow-md transition-all duration-200`}
      role="region"
      aria-labelledby={`activity-${type}-title`}
    >
      {/* 头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${style.headerBg}`}
        aria-expanded={expanded}
        aria-controls={`activity-${type}-content`}
        aria-label={`${expanded ? '收起' : '展开'}${title}`}
      >
        {/* 状态指示器 - 圆点 */}
        <div className={`h-3 w-3 rounded-full ${style.statusDot}`} aria-hidden="true" />

        {style.icon}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span id={`activity-${type}-title`} className={`text-[14px] font-semibold ${style.textColor}`}>
              {title}
            </span>
            {duration !== undefined && !isRunning && (
              <span className="rounded-full bg-obs-line/30 px-2 py-0.5 text-[11px] font-medium text-obs-ink3">
                {duration}s
              </span>
            )}
          </div>
          {metadata && (
            <div className="mt-0.5 text-[12px] font-mono text-obs-ink3 truncate">
              {metadata}
            </div>
          )}
        </div>

        <IconChevronDown
          className={`h-4 w-4 text-obs-ink3 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* 内容区域 */}
      <div
        id={`activity-${type}-content`}
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: expanded ? (contentHeight ? `${contentHeight}px` : "2000px") : "0px",
        }}
      >
        <div
          ref={contentRef}
          className={`border-t border-obs-line/50 px-4 py-3 ${
            expanded && !prefersReducedMotion() ? "animate-in slide-in-from-top-2 duration-200" : ""
          }`}
        >
          <div className="text-[14px] leading-relaxed text-obs-ink2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
