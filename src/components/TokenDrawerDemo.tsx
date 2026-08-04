/**
 * TokenDetailDrawer 演示页面
 * 测试和展示 Token 详情抽屉的所有功能
 */

import { useState } from "react";
import TokenDetailDrawer, { type TokenCandidate } from "./TokenDetailDrawer";

export default function TokenDrawerDemo() {
  const [isOpen, setIsOpen] = useState(false);

  // 模拟候选 token 数据
  const mockCandidates: TokenCandidate[] = [
    { token: "首先", probability: 0.87, logit: 4.2 },
    { token: "其次", probability: 0.10, logit: 2.1 },
    { token: "第一", probability: 0.02, logit: 1.5 },
    { token: "首要", probability: 0.01, logit: 0.8 },
    { token: "最初", probability: 0.003, logit: 0.3 },
    { token: "起初", probability: 0.002, logit: 0.1 },
    { token: "先", probability: 0.001, logit: -0.2 },
    { token: "开始", probability: 0.0008, logit: -0.5 },
    { token: "初", probability: 0.0005, logit: -0.8 },
    { token: "前", probability: 0.0002, logit: -1.2 },
  ];

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-obs p-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-2 text-[24px] font-bold text-obs-ink">
          TokenDetailDrawer 演示
        </h1>
        <p className="mb-6 text-[14px] text-obs-ink3">
          点击按钮打开侧边抽屉，查看 Token 详细信息
        </p>

        {/* 演示区域 */}
        <div className="rounded-xl border border-obs-line bg-obs-2 p-8">
          <div className="text-center">
            <button
              onClick={() => setIsOpen(true)}
              className="rounded-lg bg-brand-500 px-6 py-3 text-[15px] font-medium text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg active:scale-95"
            >
              打开 Token 详情抽屉
            </button>

            <div className="mt-6 text-[13px] text-obs-ink3">
              按 ESC 或点击遮罩层关闭抽屉
            </div>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="mt-8 rounded-xl border border-obs-line bg-obs-2 p-4">
          <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
            功能特性
          </h2>
          <ul className="space-y-2 text-[13px] text-obs-ink2">
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>主 Token 展示</strong>：32px 大字，圆角卡片，品牌色渐变背景
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>候选列表</strong>：Top 10 候选 token，按概率降序排列
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>排名徽章</strong>：金/银/铜色区分 Top 3，视觉层次清晰
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>概率可视化</strong>：进度条 + 百分比，直观显示选择倾向
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>技术指标</strong>：Entropy、Logit、Temperature、Top-P
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">•</span>
              <span>
                <strong>流畅动画</strong>：300ms 滑入，磨砂玻璃遮罩
              </span>
            </li>
          </ul>
        </div>

        {/* 设计细节 */}
        <div className="mt-4 rounded-xl border border-obs-line bg-obs-3 p-4">
          <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
            设计细节
          </h2>
          <div className="space-y-3 text-[13px] text-obs-ink2">
            <div>
              <div className="mb-1 font-semibold text-obs-ink">
                1. 排名颜色系统
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-brand-500" />
                  <span>第 1 名：品牌蓝</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-obs-ink2" />
                  <span>第 2 名：深灰</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-caution-500/50" />
                  <span>第 3 名：琥珀</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 font-semibold text-obs-ink">
                2. 概率条渐变
              </div>
              <div className="text-obs-ink3">
                根据排名使用不同颜色，与徽章颜色一致，形成视觉连贯性
              </div>
            </div>

            <div>
              <div className="mb-1 font-semibold text-obs-ink">
                3. 悬停反馈
              </div>
              <div className="text-obs-ink3">
                候选项悬停时背景变亮，增强交互感
              </div>
            </div>
          </div>
        </div>

        {/* 使用场景 */}
        <div className="mt-4 rounded-xl border border-success-500/30 bg-success-500/5 p-4">
          <h2 className="mb-3 text-[16px] font-semibold text-obs-ink">
            使用场景
          </h2>
          <ul className="space-y-2 text-[13px] text-obs-ink2">
            <li className="flex gap-2">
              <span className="text-success-500">→</span>
              <span>
                <strong>普通用户</strong>：点击生成的文字，查看"AI 为什么选这个词"
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-success-500">→</span>
              <span>
                <strong>专业用户</strong>：深入分析 token 选择，调试模型行为
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-success-500">→</span>
              <span>
                <strong>教学场景</strong>：向学生展示 AI 的决策过程
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
            <code>{`<TokenDetailDrawer
  token="首先"
  position={45}
  latency={23}
  candidates={[
    { token: "首先", probability: 0.87, logit: 4.2 },
    { token: "其次", probability: 0.10, logit: 2.1 },
    // ...
  ]}
  entropy={0.62}
  temperature={0.7}
  topP={0.9}
  onClose={() => setIsOpen(false)}
/>`}</code>
          </pre>
        </div>
      </div>

      {/* TokenDetailDrawer */}
      {isOpen && (
        <TokenDetailDrawer
          token="首先"
          position={45}
          latency={23}
          candidates={mockCandidates}
          entropy={0.62}
          temperature={0.7}
          topP={0.9}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
