/**
 * 演示 SessionStatsPanel 和 CostComparison 组件
 * 临时页面，用于展示和测试统计面板功能
 */

import { useState } from "react";
import SessionStatsPanel, { type SessionStats } from "./SessionStatsPanel";
import CostComparison from "./CostComparison";

export default function StatsDemo() {
  const [showCostOnly, setShowCostOnly] = useState(false);

  // 模拟统计数据
  const mockStats: SessionStats = {
    totalTokens: 1500,
    inputTokens: 234,
    outputTokens: 1266,
    totalDuration: 54.2,
    avgTokensPerSecond: 23.4,
    messageCount: 8,
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-obs p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-2 text-[24px] font-bold text-obs-ink">
          成本对比组件演示
        </h1>
        <p className="mb-6 text-[14px] text-obs-ink3">
          展示本地运行相比云端 API 节省的成本
        </p>

        {/* 切换按钮 */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowCostOnly(false)}
            className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors ${
              !showCostOnly
                ? "bg-brand-500 text-white"
                : "bg-obs-2 text-obs-ink3 hover:bg-obs-line/30"
            }`}
          >
            完整统计面板
          </button>
          <button
            onClick={() => setShowCostOnly(true)}
            className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors ${
              showCostOnly
                ? "bg-brand-500 text-white"
                : "bg-obs-2 text-obs-ink3 hover:bg-obs-line/30"
            }`}
          >
            仅成本对比
          </button>
        </div>

        {/* 展示区域 */}
        {showCostOnly ? (
          <div className="space-y-4">
            <CostComparison tokensGenerated={1266} showDetails={false} />
            <CostComparison tokensGenerated={1266} showDetails={true} />
          </div>
        ) : (
          <SessionStatsPanel
            stats={mockStats}
            showCostComparison={true}
          />
        )}

        {/* 说明文档 */}
        <div className="mt-8 rounded-xl border border-obs-line bg-obs-2 p-4">
          <h2 className="mb-2 text-[16px] font-semibold text-obs-ink">
            使用说明
          </h2>
          <ul className="space-y-2 text-[13px] text-obs-ink2">
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>SessionStatsPanel</strong>：完整的会话统计面板，包含
                token 使用、性能指标和成本对比
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>CostComparison</strong>：独立的成本对比组件，可单独使用
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                点击"查看更多模型对比"可展开详细的多模型成本对比
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                翠绿色主题强调"节省 100%"的价值主张
              </span>
            </li>
          </ul>
        </div>

        {/* 代码示例 */}
        <div className="mt-4 rounded-xl border border-obs-line bg-obs-3 p-4">
          <h2 className="mb-2 text-[16px] font-semibold text-obs-ink">
            代码示例
          </h2>
          <pre className="overflow-x-auto text-[12px] text-obs-ink2">
            <code>{`// 完整统计面板
<SessionStatsPanel
  stats={{
    totalTokens: 1500,
    inputTokens: 234,
    outputTokens: 1266,
    totalDuration: 54.2,
    avgTokensPerSecond: 23.4,
    messageCount: 8,
  }}
  showCostComparison={true}
/>

// 仅成本对比
<CostComparison
  tokensGenerated={1266}
  showDetails={false}
/>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
