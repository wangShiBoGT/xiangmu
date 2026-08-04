/**
 * 会话统计面板
 * 显示当前对话的 token 使用量、耗时等统计信息
 * 可选展示"等效成本对比"
 */

import { useState } from "react";
import { IconChevronDown, IconMessageSquare, IconClock, IconZap } from "./icons";
import CostComparison from "./CostComparison";

export interface SessionStats {
  /** 总 token 数（输入+输出） */
  totalTokens: number;
  /** 输入 token 数 */
  inputTokens: number;
  /** 输出 token 数 */
  outputTokens: number;
  /** 总耗时（秒） */
  totalDuration: number;
  /** 平均生成速度 (tokens/s) */
  avgTokensPerSecond: number;
  /** 消息轮数 */
  messageCount: number;
}

interface SessionStatsProps {
  stats: SessionStats;
  /** 是否显示成本对比 */
  showCostComparison?: boolean;
}

export default function SessionStatsPanel({
  stats,
  showCostComparison = true,
}: SessionStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCostDetails, setShowCostDetails] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-obs-line bg-obs-2 shadow-md">
      {/* 头部 - 始终可见 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-obs-line/30"
      >
        <IconMessageSquare className="h-4 w-4 text-brand-400" />

        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-obs-ink">
            会话统计
          </h3>
          <p className="text-[12px] text-obs-ink3">
            {stats.totalTokens.toLocaleString()} tokens · {stats.messageCount} 轮对话
          </p>
        </div>

        <IconChevronDown
          className={`h-4 w-4 text-obs-ink3 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 详细统计 - 可折叠 */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 duration-200 border-t border-obs-line/50">
          {/* Token 使用 */}
          <div className="border-b border-obs-line/50 px-4 py-3">
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-obs-ink3">
              Token 使用
            </h4>
            <div className="space-y-2">
              <StatRow
                label="输入"
                value={stats.inputTokens.toLocaleString()}
                unit="tokens"
              />
              <StatRow
                label="输出"
                value={stats.outputTokens.toLocaleString()}
                unit="tokens"
                valueClass="text-brand-400"
              />
              <StatRow
                label="总计"
                value={stats.totalTokens.toLocaleString()}
                unit="tokens"
                valueClass="font-semibold"
              />
            </div>
          </div>

          {/* 性能指标 */}
          <div className="border-b border-obs-line/50 px-4 py-3">
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-obs-ink3">
              性能指标
            </h4>
            <div className="space-y-2">
              <StatRow
                icon={<IconZap className="h-3.5 w-3.5 text-success-500" />}
                label="平均速度"
                value={stats.avgTokensPerSecond.toFixed(1)}
                unit="tok/s"
                valueClass="text-success-500 font-mono"
              />
              <StatRow
                icon={<IconClock className="h-3.5 w-3.5 text-obs-ink3" />}
                label="总耗时"
                value={stats.totalDuration.toFixed(1)}
                unit="秒"
                valueClass="font-mono"
              />
              <StatRow
                icon={<IconMessageSquare className="h-3.5 w-3.5 text-obs-ink3" />}
                label="对话轮数"
                value={stats.messageCount.toString()}
                unit="轮"
              />
            </div>
          </div>

          {/* 成本对比 */}
          {showCostComparison && stats.outputTokens > 0 && (
            <div className="p-4">
              <CostComparison
                tokensGenerated={stats.outputTokens}
                showDetails={showCostDetails}
              />

              {/* 展开详情按钮 */}
              <button
                onClick={() => setShowCostDetails(!showCostDetails)}
                className="mt-2 w-full rounded-lg px-3 py-1.5 text-[12px] text-obs-ink3 transition-colors hover:bg-obs-line/30 hover:text-obs-ink"
              >
                {showCostDetails ? "收起详情" : "查看更多模型对比"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 统计行组件
function StatRow({
  icon,
  label,
  value,
  unit,
  valueClass = "",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-obs-ink3">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-obs-ink ${valueClass}`}>{value}</span>
        {unit && <span className="text-[11px] text-obs-ink3">{unit}</span>}
      </div>
    </div>
  );
}
