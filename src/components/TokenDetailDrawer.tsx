/**
 * Token 详情抽屉
 * 从右侧滑入，显示单个 token 的完整信息
 * - 候选 token 列表（Top 10）
 * - 概率分布可视化
 * - 技术指标（entropy、logit 等）
 */

import { useEffect } from "react";
import { IconClose, IconZap } from "./icons";

export interface TokenCandidate {
  token: string;
  probability: number;
  logit?: number;
}

export interface TokenDetailProps {
  /** token 文本 */
  token: string;
  /** 在序列中的位置 */
  position: number;
  /** 生成延迟（毫秒） */
  latency: number;
  /** 候选 token 列表（按概率降序） */
  candidates: TokenCandidate[];
  /** Entropy 值 */
  entropy?: number;
  /** Temperature 参数 */
  temperature?: number;
  /** Top-P 参数 */
  topP?: number;
  /** 关闭回调 */
  onClose: () => void;
}

export default function TokenDetailDrawer({
  token,
  position,
  latency,
  candidates,
  entropy,
  temperature,
  topP,
  onClose,
}: TokenDetailProps) {
  // ESC 键关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-obs/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed inset-y-0 right-0 z-50 w-[420px] overflow-y-auto overscroll-contain border-l border-obs-line bg-obs shadow-2xl animate-in slide-in-from-right duration-300">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-obs-line bg-obs/95 backdrop-blur-md px-6 py-4">
          <div>
            <h3 className="text-[16px] font-semibold text-obs-ink">
              Token 详情
            </h3>
            <p className="text-[13px] text-obs-ink3">第 {position} 个 token</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-obs-ink3 transition-colors hover:bg-obs-line/30 hover:text-obs-ink"
            aria-label="关闭"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* 主 Token 展示 */}
        <div className="border-b border-obs-line bg-gradient-to-b from-brand-500/10 to-transparent px-6 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center rounded-2xl bg-obs-2 px-8 py-4 text-[32px] font-medium text-obs-ink shadow-lg">
              "{token}"
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[13px]">
              <IconZap className="h-3.5 w-3.5 text-success-500" />
              <span className="text-obs-ink3">生成用时</span>
              <span className="font-mono text-obs-ink">{latency}ms</span>
            </div>
          </div>
        </div>

        {/* 候选 Tokens */}
        <div className="px-6 py-4">
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-obs-ink3">
            候选 Token (Top {Math.min(candidates.length, 10)})
          </h4>
          <div className="space-y-2">
            {candidates.slice(0, 10).map((cand, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-obs-2 px-3 py-2.5 transition-colors hover:bg-obs-line/30"
              >
                {/* 排名徽章 */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                    i === 0
                      ? "bg-brand-500 text-white"
                      : i === 1
                        ? "bg-obs-ink2 text-obs"
                        : i === 2
                          ? "bg-caution-500/50 text-obs"
                          : "bg-obs-line text-obs-ink3"
                  }`}
                >
                  {i + 1}
                </div>

                {/* Token 文本 */}
                <div className="min-w-0 flex-1 font-mono text-[14px] text-obs-ink truncate">
                  "{cand.token}"
                </div>

                {/* 概率可视化 */}
                <div className="flex items-center gap-2">
                  {/* 概率条 */}
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-obs-line">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        i === 0
                          ? "bg-brand-500"
                          : i === 1
                            ? "bg-obs-ink2"
                            : i === 2
                              ? "bg-caution-500"
                              : "bg-obs-ink3"
                      }`}
                      style={{ width: `${cand.probability * 100}%` }}
                    />
                  </div>
                  {/* 概率数字 */}
                  <span className="w-12 text-right font-mono text-[12px] text-obs-ink3">
                    {(cand.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 技术指标 */}
        {(entropy !== undefined ||
          temperature !== undefined ||
          topP !== undefined) && (
          <div className="border-t border-obs-line px-6 py-4">
            <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-obs-ink3">
              技术指标
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {entropy !== undefined && (
                <MetricCard label="Entropy" value={entropy.toFixed(3)} />
              )}
              {candidates[0]?.logit !== undefined && (
                <MetricCard
                  label="Logit"
                  value={candidates[0].logit.toFixed(2)}
                />
              )}
              {temperature !== undefined && (
                <MetricCard
                  label="Temperature"
                  value={temperature.toFixed(1)}
                />
              )}
              {topP !== undefined && (
                <MetricCard label="Top-P" value={topP.toFixed(2)} />
              )}
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="border-t border-obs-line bg-obs-2/50 px-6 py-4">
          <p className="text-[12px] leading-relaxed text-obs-ink3">
            💡 概率越高，AI 越"确定"选择这个词。第一名就是实际生成的 token。
          </p>
        </div>
      </div>
    </>
  );
}

// 指标卡片组件
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-obs-line bg-obs-2 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-obs-ink3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[16px] font-semibold text-obs-ink">
        {value}
      </div>
    </div>
  );
}
