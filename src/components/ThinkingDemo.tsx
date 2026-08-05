import { IconThinking } from "./icons";

/**
 * 思考动画演示组件
 * 展示 AI 思考时的高级呼吸动画效果
 */
export default function ThinkingDemo() {
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-obs-line bg-obs-2 p-6 shadow-float backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-measure-500/10">
          <IconThinking className="h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-obs-ink">AI 正在思考</h3>
          <p className="text-xs text-obs-ink2">高级呼吸动画演示</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-obs-line/30 pt-4">
        <div className="flex items-center gap-3">
          <IconThinking className="h-5 w-5 text-emerald-400" />
          <span className="text-xs text-obs-ink2">分析问题中...</span>
        </div>
        <div className="flex items-center gap-3">
          <IconThinking className="h-5 w-5 text-measure-400" />
          <span className="text-xs text-obs-ink2">生成方案中...</span>
        </div>
        <div className="flex items-center gap-3">
          <IconThinking className="h-5 w-5 text-amber-400" />
          <span className="text-xs text-obs-ink2">优化结果中...</span>
        </div>
      </div>
    </div>
  );
}
