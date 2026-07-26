/** Trace 指纹行：一条 run 的紧凑真实签名（Trace Atlas / Evidence Field 共用）。
 *  X = 生成步（不是时间戳）；主线 = 逐步选中概率；
 *  底部竖条 = steps[i].entropy（越高越亮）；底缘刻度 = steps[i].dt 脉冲；
 *  ▽ = 真实分岔位置（BranchNode.forkStep）；黄线 = 外部指定的标记步。
 *  可传第二条 steps 叠加为对比（emerald），坐标轴共享。 */

import type { TokenStep } from "../lib/trace";

const W = 640;
const H = 56;

function probPath(steps: TokenStep[], maxLen: number): string {
  if (steps.length < 2) return "";
  return steps
    .map(
      (s, i) =>
        `${i === 0 ? "M" : "L"}${((i / (maxLen - 1)) * W).toFixed(1)},${(
          H - 14 - s.prob * (H - 24)
        ).toFixed(1)}`,
    )
    .join(" ");
}

export default function TraceFingerprint({
  steps,
  compareSteps,
  markStep,
  forkSteps = [],
  onStepClick,
}: {
  steps: TokenStep[];
  /** 可选第二条 run（emerald）：与主 run 同一步轴叠加 */
  compareSteps?: TokenStep[];
  /** 高亮标记步（0-based），如分叉步或熵峰 */
  markStep?: number;
  /** 真实分岔步列表（BranchNode.forkStep） */
  forkSteps?: number[];
  onStepClick?: (step: number) => void;
}) {
  const maxLen = Math.max(steps.length, compareSteps?.length ?? 0, 2);
  const maxH = Math.max(...steps.map((s) => s.entropy), 1e-6);
  const x = (i: number) => (i / (maxLen - 1)) * W;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      preserveAspectRatio="none"
      onClick={
        onStepClick
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.round(
                ((e.clientX - r.left) / r.width) * (maxLen - 1),
              );
              onStepClick(Math.max(0, Math.min(steps.length - 1, i)));
            }
          : undefined
      }
      role={onStepClick ? "button" : undefined}
    >
      {/* 熵竖条：已记录候选分布的分散度 */}
      {steps.map((s, i) => (
        <rect
          key={i}
          x={x(i) - 0.6}
          y={H - 12 - (s.entropy / maxH) * (H - 26)}
          width={1.2}
          height={(s.entropy / maxH) * (H - 26)}
          fill="#818cf8"
          opacity={0.16 + (s.entropy / maxH) * 0.3}
        />
      ))}
      {/* dt 脉冲刻度 */}
      {steps.map((s, i) =>
        s.dt > 0 ? (
          <rect
            key={`t${i}`}
            x={x(i) - 0.5}
            y={H - 6}
            width={1}
            height={Math.min(5, 1 + s.dt / 80)}
            fill="#64748b"
            opacity={0.7}
          />
        ) : null,
      )}
      {/* 分岔标记 */}
      {forkSteps.map((f, i) => (
        <path
          key={`f${i}`}
          d={`M${x(f) - 3.5},2 L${x(f) + 3.5},2 L${x(f)},8 Z`}
          fill="#fbbf24"
          opacity={0.9}
        />
      ))}
      {markStep !== undefined && markStep >= 0 && (
        <line
          x1={x(markStep)}
          x2={x(markStep)}
          y1={0}
          y2={H}
          stroke="#fbbf24"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.85}
        />
      )}
      {compareSteps && compareSteps.length >= 2 && (
        <path
          d={probPath(compareSteps, maxLen)}
          fill="none"
          stroke="#34d399"
          strokeWidth={1.4}
          opacity={0.9}
        />
      )}
      <path
        d={probPath(steps, maxLen)}
        fill="none"
        stroke="#818cf8"
        strokeWidth={1.4}
        opacity={0.95}
      />
    </svg>
  );
}
