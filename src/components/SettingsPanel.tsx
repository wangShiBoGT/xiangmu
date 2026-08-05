import type { GenerationParams } from "../lib/chatStore";
import { clamp } from "../lib/chatStore";

interface Props {
  params: GenerationParams;
  showThinking: boolean;
  onChange: (params: GenerationParams) => void;
  onToggleThinking: (show: boolean) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  params,
  showThinking,
  onChange,
  onToggleThinking,
  onClose,
}: Props) {
  return (
    <div
      className="absolute right-5 top-16 z-10 max-h-[calc(100vh-96px)] w-76 space-y-5 overflow-y-auto overscroll-contain rounded-md bg-surface p-5 shadow-float"
      role="dialog"
      aria-labelledby="settings-title"
    >
      <div className="flex items-center justify-between">
        <h2 id="settings-title" className="font-semibold text-ink text-[16px]">生成设置</h2>
        <button
          className="text-ink-3 hover:text-ink rounded-md px-1.5 transition-colors"
          aria-label="关闭设置"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <label className="block text-[13px] text-ink-2">
        <span className="flex justify-between mb-1">
          <span>最大生成 tokens</span>
          <span className="font-medium text-ink">{params.maxTokens}</span>
        </span>
        <input
          type="range"
          min={64}
          max={4096}
          step={64}
          className="w-full accent-accent"
          value={params.maxTokens}
          aria-label="最大生成 tokens"
          aria-valuemin={64}
          aria-valuemax={4096}
          aria-valuenow={params.maxTokens}
          onChange={(e) =>
            onChange({ ...params, maxTokens: clamp(+e.target.value, 16, 8192) })
          }
        />
      </label>

      <label className="block text-[13px] text-ink-2">
        <span className="flex justify-between mb-1">
          <span>温度（0 = 确定性输出）</span>
          <span className="font-medium text-ink">
            {params.temperature.toFixed(1)}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.1}
          className="w-full accent-accent"
          value={params.temperature}
          aria-label="温度参数"
          aria-valuemin={0}
          aria-valuemax={1.5}
          aria-valuenow={params.temperature}
          onChange={(e) =>
            onChange({ ...params, temperature: clamp(+e.target.value, 0, 2) })
          }
        />
      </label>

      <label className="block text-[13px] text-ink-2">
        <span className="flex justify-between mb-1">
          <span>Top-P</span>
          <span className="font-medium text-ink">
            {params.topP.toFixed(2)}
          </span>
        </span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          className="w-full accent-accent"
          value={params.topP}
          aria-label="Top-P 参数"
          aria-valuemin={0.1}
          aria-valuemax={1}
          aria-valuenow={params.topP}
          onChange={(e) =>
            onChange({ ...params, topP: clamp(+e.target.value, 0, 1) })
          }
        />
      </label>

      <label className="flex items-center gap-2 text-[13px] text-ink-2 select-none cursor-pointer">
        <input
          type="checkbox"
          className="accent-accent"
          checked={showThinking}
          aria-label="显示推理段"
          onChange={(e) => onToggleThinking(e.target.checked)}
        />
        显示推理段（&lt;think&gt; 输出）
      </label>

      <label className="flex items-center gap-2 text-[13px] text-ink-2 select-none cursor-pointer">
        <input
          type="checkbox"
          className="accent-accent"
          checked={params.chineseOnly}
          onChange={(e) => onChange({ ...params, chineseOnly: e.target.checked })}
        />
        中文思考与回答（以系统提示注入，会记录进 trace）
      </label>
    </div>
  );
}
