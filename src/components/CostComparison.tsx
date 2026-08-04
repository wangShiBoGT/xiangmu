/**
 * 等效成本对比组件
 * 显示本地运行相比云端 API 节省的成本
 */

import { IconDollar, IconZap } from "./icons";

export interface CostComparisonProps {
  /** 生成的 token 数量 */
  tokensGenerated: number;
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

// 主流云端 LLM 定价（每 1M tokens）
const CLOUD_PRICING = {
  "GPT-4": {
    input: 30.0,  // $30/1M input tokens
    output: 60.0, // $60/1M output tokens
  },
  "GPT-4o": {
    input: 5.0,
    output: 15.0,
  },
  "Claude 3.5 Sonnet": {
    input: 3.0,
    output: 15.0,
  },
  "Gemini 1.5 Pro": {
    input: 3.5,
    output: 10.5,
  },
};

export default function CostComparison({
  tokensGenerated,
  showDetails = false,
}: CostComparisonProps) {
  if (tokensGenerated === 0) {
    return null;
  }

  // 计算等效成本（假设都是 output tokens）
  const calculateCost = (pricePerMillion: number) => {
    return (tokensGenerated / 1_000_000) * pricePerMillion;
  };

  const gpt4Cost = calculateCost(CLOUD_PRICING["GPT-4"].output);

  return (
    <div className="overflow-hidden rounded-xl border border-success-500/30 bg-success-500/5">
      {/* 头部 */}
      <div className="border-b border-success-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <IconDollar className="h-4 w-4 text-success-500" />
          <h3 className="text-[13px] font-semibold text-obs-ink">
            成本节省
          </h3>
        </div>
      </div>

      {/* 主要对比 */}
      <div className="px-4 py-4">
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-obs-ink3">
            本次生成 {tokensGenerated.toLocaleString()} tokens
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-[28px] font-bold text-success-500">
              $0.00
            </span>
            <span className="text-[14px] text-obs-ink3">本地运行</span>
          </div>
        </div>

        {/* 对比 GPT-4 */}
        <div className="rounded-lg bg-obs-2/50 px-3 py-2.5 text-center">
          <div className="text-[12px] text-obs-ink3">
            等效 GPT-4 成本
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="font-mono text-[16px] font-semibold text-obs-ink line-through">
              ${gpt4Cost.toFixed(4)}
            </span>
          </div>
        </div>

        {/* 节省提示 */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-success-500">
          <IconZap className="h-3.5 w-3.5" />
          <span className="font-medium">节省 100%</span>
        </div>
      </div>

      {/* 详细对比 */}
      {showDetails && (
        <div className="border-t border-success-500/20 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-obs-ink3 mb-2">
            其他模型对比
          </div>
          <div className="space-y-1.5">
            {Object.entries(CLOUD_PRICING)
              .filter(([name]) => name !== "GPT-4")
              .map(([name, pricing]) => {
                const cost = calculateCost(pricing.output);
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-obs-ink3">{name}</span>
                    <span className="font-mono text-obs-ink2">
                      ${cost.toFixed(4)}
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="mt-3 rounded-lg bg-brand-500/10 px-3 py-2 text-[11px] leading-relaxed text-brand-400">
            💡 定价基于 2026 年 8 月数据，仅供参考
          </div>
        </div>
      )}
    </div>
  );
}
