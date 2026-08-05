/**
 * 增强型输入框组件 - Devin 风格
 * 特性：
 * - 磨砂玻璃底栏（backdrop-blur）
 * - 发送按钮动画（scale + shadow）
 * - 自动调整高度（textarea auto-resize）
 * - 快捷键提示
 * - 加载状态反馈
 */

import { useEffect, useRef, useState } from "react";
import { IconArrowUp } from "./icons";

export interface EnhancedInputProps {
  /** 输入值 */
  value: string;
  /** 输入变化回调 */
  onChange: (value: string) => void;
  /** 发送回调 */
  onSend: () => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否正在生成 */
  isGenerating?: boolean;
  /** 生成速度提示（tokens/s） */
  tokensPerSecond?: number;
  /** 最小行数 */
  minRows?: number;
  /** 最大行数 */
  maxRows?: number;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
}

export default function EnhancedInput({
  value,
  onChange,
  onSend,
  placeholder = "输入消息...（Shift + Enter 换行）",
  disabled = false,
  isGenerating = false,
  tokensPerSecond,
  minRows = 1,
  maxRows = 8,
  autoFocus = false,
}: EnhancedInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(minRows);

  // 自动调整高度
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24; // 1.5rem = 24px
    const newRows = Math.min(
      Math.max(Math.ceil(scrollHeight / lineHeight), minRows),
      maxRows
    );
    setRows(newRows);
  }, [value, minRows, maxRows]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const canSend = value.trim() && !disabled;

  return (
    <div className="sticky bottom-0 border-t border-obs-line bg-obs/95 backdrop-blur-md">
      <div className="mx-auto max-w-3xl p-4">
        <div className="relative">
          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            className="w-full resize-none rounded-xl border border-obs-line bg-obs-2 px-4 py-3 pr-12 text-[15px] text-obs-ink placeholder:text-obs-ink3 transition-all focus:border-[#10A0FF] focus:outline-none focus:ring-2 focus:ring-[#10A0FF]/25 disabled:opacity-50"
            placeholder={placeholder}
            value={value}
            rows={rows}
            disabled={disabled}
            aria-label="消息输入框"
            aria-describedby={isGenerating ? "generation-status" : undefined}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* 发送按钮 */}
          <button
            className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#10A0FF]/50 focus:ring-offset-2 focus:ring-offset-obs ${
              canSend
                ? "bg-[#10A0FF] text-[#ffffff] hover:bg-[#0d8ae6] hover:shadow-lg hover:shadow-[#10A0FF]/25 active:scale-95"
                : "bg-obs-line text-obs-ink3 cursor-not-allowed opacity-50"
            }`}
            disabled={!canSend}
            onClick={onSend}
            aria-label="发送"
          >
            <IconArrowUp className="h-4 w-4" />
          </button>
        </div>

        {/* 底部提示 */}
        <div className="mt-2 flex items-center justify-between text-[13px]">
          {/* 左侧：快捷键提示 */}
          <div className="text-obs-ink3">
            <kbd className="rounded bg-obs-line px-1.5 py-0.5 font-mono text-[11px]">
              Enter
            </kbd>{" "}
            发送 ·{" "}
            <kbd className="rounded bg-obs-line px-1.5 py-0.5 font-mono text-[11px]">
              Shift + Enter
            </kbd>{" "}
            换行
          </div>

          {/* 右侧：生成状态 */}
          {isGenerating && tokensPerSecond !== undefined && (
            <div id="generation-status" className="flex items-center gap-2 text-obs-ink3" role="status" aria-live="polite">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[#10A0FF]" />
              <span>正在生成... {tokensPerSecond.toFixed(1)} tok/s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
